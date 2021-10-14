/* eslint-disable prefer-const */
import { Curve, Token, Bundle } from '../types/schema'
import { BigDecimal, Address, BigInt } from '@graphprotocol/graph-ts/index'
import { ZERO_BD, factoryContract, ADDRESS_ZERO, ONE_BD } from './helpers'
import { Pair } from '../types/Factory/Pair'

const NATIVE_ADDRESS = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c' // WBNB
const BUSD_NATIVE_PAIR = '0x58f876857a02d6762e0101bb5c46a8c1ed44dc16'

export function getNativePriceInUSD(): BigDecimal {
  let busdPair = Pair.bind(Address.fromString(BUSD_NATIVE_PAIR)) // usdc is token0
  if (busdPair !== null) {
    let getReservesResult = busdPair.getReserves()
    return getReservesResult.value1.div(getReservesResult.value0).toBigDecimal()
  }
  return ZERO_BD
}

// token where amounts should contribute to tracked volume and liquidity
let WHITELIST: string[] = [
  '0x5801d0e1c7d977d78e4890880b8e579eb4943276', // USDO
  '0xe9e7cea3dedca5984780bafc599bd69add087d56', // BUSD
  '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82' // Cake
]

// minimum liquidity required to count towards tracked volume for pairs with small # of Lps
let MINIMUM_USD_THRESHOLD_NEW_PAIRS = BigDecimal.fromString('100')

// minimum liquidity for price to get tracked
let MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString('0.1')

/**
 * Search through graph to find derived Eth per token.
 * @todo this assumes there is only 1 curve per 2 tokens combinations, so this implementation needs to be changed if the assumption breaks
 **/
export function findNativePerToken(token: Token): BigDecimal {
  if (token.id == NATIVE_ADDRESS) {
    return ONE_BD
  }
  // loop through whitelist and check if paired with any
  for (let i = 0; i < WHITELIST.length; ++i) {
    // check base/quote currency combination
    let curveAddressD1 = factoryContract.getCurve(Address.fromString(token.id), Address.fromString(WHITELIST[i]))
    let curveAddressD2 = factoryContract.getCurve(Address.fromString(WHITELIST[i]), Address.fromString(token.id))
    let curveAddress = curveAddressD1.toHexString() != ADDRESS_ZERO ? curveAddressD1 : curveAddressD2
    if (curveAddress.toHexString() != ADDRESS_ZERO) {
      let curve = Curve.load(curveAddress.toHexString())
      if (curve.token0 == token.id && curve.reserveNative.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        let token1 = Token.load(curve.token1)
        return curve.token1Price.times(token1.derivedNative as BigDecimal) // return token1 per our token * Native per token 1
      }
      if (curve.token1 == token.id && curve.reserveNative.gt(MINIMUM_LIQUIDITY_THRESHOLD_ETH)) {
        let token0 = Token.load(curve.token0)
        return curve.token0Price.times(token0.derivedNative as BigDecimal) // return token0 per our token * ETH per token 0
      }
    }
  }
  return ZERO_BD // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
  curve: Curve
): BigDecimal {
  let bundle = Bundle.load('1')
  let price0 = token0.derivedNative.times(bundle.nativePrice)
  let price1 = token1.derivedNative.times(bundle.nativePrice)

  // if less than 5 LPs, require high minimum reserve amount amount or return 0
  if (curve.liquidityProviderCount.lt(BigInt.fromI32(5))) {
    let reserve0USD = curve.reserve0.times(price0)
    let reserve1USD = curve.reserve1.times(price1)
    if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve0USD.plus(reserve1USD).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
      if (reserve0USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
    if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve1USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return ZERO_BD
      }
    }
  }

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0
      .times(price0)
      .plus(tokenAmount1.times(price1))
      .div(BigDecimal.fromString('2'))
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0)
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1)
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let bundle = Bundle.load('1')
  let price0 = token0.derivedNative.times(bundle.nativePrice)
  let price1 = token1.derivedNative.times(bundle.nativePrice)

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked volume is 0
  return ZERO_BD
}

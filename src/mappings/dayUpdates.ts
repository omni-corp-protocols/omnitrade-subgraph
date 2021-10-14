/* eslint-disable prefer-const */
import { BigDecimal, BigInt, EthereumEvent } from '@graphprotocol/graph-ts'
import {
  Bundle,
  Curve,
  CurveDayData,
  Token,
  CurveHourData,
  TokenDayData,
  OmnitradeDayData,
  CurveFactory
} from '../types/schema'
import { FACTORY_ADDRESS, ONE_BI, ZERO_BD, ZERO_BI } from './helpers'

export function updateOmnitradeDayData(event: EthereumEvent): OmnitradeDayData {
  let omnitrade = CurveFactory.load(FACTORY_ADDRESS)
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let omnitradeDayData = OmnitradeDayData.load(dayID.toString())
  if (omnitradeDayData === null) {
    omnitradeDayData = new OmnitradeDayData(dayID.toString())
    omnitradeDayData.date = dayStartTimestamp
    omnitradeDayData.dailyVolumeUSD = ZERO_BD
    omnitradeDayData.dailyVolumeNative = ZERO_BD
    omnitradeDayData.totalVolumeUSD = ZERO_BD
    omnitradeDayData.totalVolumeNative = ZERO_BD
    omnitradeDayData.dailyVolumeUntracked = ZERO_BD
  }

  omnitradeDayData.totalLiquidityUSD = omnitrade.totalLiquidityUSD
  omnitradeDayData.totalLiquidityNative = omnitrade.totalLiquidityNative
  omnitradeDayData.txCount = omnitrade.txCount
  omnitradeDayData.save()

  return omnitradeDayData as OmnitradeDayData
}

export function updateCurveDayData(event: EthereumEvent): CurveDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayCurveID = event.address
    .toHexString()
    .concat('-')
    .concat(BigInt.fromI32(dayID).toString())
  let curve = Curve.load(event.address.toHexString())
  let curveDayData = CurveDayData.load(dayCurveID)
  if (curveDayData === null) {
    curveDayData = new CurveDayData(dayCurveID)
    curveDayData.date = dayStartTimestamp
    curveDayData.token0 = curve.token0
    curveDayData.token1 = curve.token1
    curveDayData.curveAddress = event.address
    curveDayData.dailyVolumeToken0 = ZERO_BD
    curveDayData.dailyVolumeToken1 = ZERO_BD
    curveDayData.dailyVolumeUSD = ZERO_BD
    curveDayData.dailyTxns = ZERO_BI
  }

  curveDayData.totalSupply = curve.totalSupply
  curveDayData.reserve0 = curve.reserve0
  curveDayData.reserve1 = curve.reserve1
  curveDayData.reserveUSD = curve.reserveUSD
  curveDayData.dailyTxns = curveDayData.dailyTxns.plus(ONE_BI)
  curveDayData.save()

  return curveDayData as CurveDayData
}

export function updateCurveHourData(event: EthereumEvent): CurveHourData {
  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let hourCurveID = event.address
    .toHexString()
    .concat('-')
    .concat(BigInt.fromI32(hourIndex).toString())
  let curve = Curve.load(event.address.toHexString())
  let curveHourData = CurveHourData.load(hourCurveID)
  if (curveHourData === null) {
    curveHourData = new CurveHourData(hourCurveID)
    curveHourData.hourStartUnix = hourStartUnix
    curveHourData.curve = event.address.toHexString()
    curveHourData.hourlyVolumeToken0 = ZERO_BD
    curveHourData.hourlyVolumeToken1 = ZERO_BD
    curveHourData.hourlyVolumeUSD = ZERO_BD
    curveHourData.hourlyTxns = ZERO_BI
  }

  curveHourData.totalSupply = curve.totalSupply
  curveHourData.reserve0 = curve.reserve0
  curveHourData.reserve1 = curve.reserve1
  curveHourData.reserveUSD = curve.reserveUSD
  curveHourData.hourlyTxns = curveHourData.hourlyTxns.plus(ONE_BI)
  curveHourData.save()

  return curveHourData as CurveHourData
}

export function updateTokenDayData(token: Token, event: EthereumEvent): TokenDayData {
  let bundle = Bundle.load('1')
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let tokenDayID = token.id
    .toString()
    .concat('-')
    .concat(BigInt.fromI32(dayID).toString())

  let tokenDayData = TokenDayData.load(tokenDayID)
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID)
    tokenDayData.date = dayStartTimestamp
    tokenDayData.token = token.id
    tokenDayData.priceUSD = token.derivedNative.times(bundle.nativePrice)
    tokenDayData.dailyVolumeToken = ZERO_BD
    tokenDayData.dailyVolumeNative = ZERO_BD
    tokenDayData.dailyVolumeUSD = ZERO_BD
    tokenDayData.dailyTxns = ZERO_BI
    tokenDayData.totalLiquidityUSD = ZERO_BD
  }
  tokenDayData.priceUSD = token.derivedNative.times(bundle.nativePrice)
  tokenDayData.totalLiquidityToken = token.totalLiquidity
  tokenDayData.totalLiquidityNative = token.totalLiquidity.times(token.derivedNative as BigDecimal)
  tokenDayData.totalLiquidityUSD = tokenDayData.totalLiquidityNative.times(bundle.nativePrice)
  tokenDayData.dailyTxns = tokenDayData.dailyTxns.plus(ONE_BI)
  tokenDayData.save()

  return tokenDayData as TokenDayData
}

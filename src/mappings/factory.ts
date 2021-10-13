/* eslint-disable prefer-const */
import { BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { NewCurve } from '../types/Factory/Factory'
import { Bundle, Curve, CurveFactory, Token } from '../types/schema'
import { Curve as CurveTemplate } from '../types/templates'
import { Curve as CurveContract } from '../types/templates/Curve/Curve'
import {
  FACTORY_ADDRESS,
  fetchTokenDecimals,
  fetchTokenName,
  fetchTokenSymbol,
  fetchTokenTotalSupply,
  ONE_BI,
  ZERO_BD,
  ZERO_BI
} from './helpers'

export function handleNewCurve(event: NewCurve): void {
  // load factory (create if first exchange)
  let factory = CurveFactory.load(FACTORY_ADDRESS)
  if (factory === null) {
    factory = new CurveFactory(FACTORY_ADDRESS)
    factory.curveCount = 0
    factory.totalVolumeNative = ZERO_BD
    factory.totalLiquidityNative = ZERO_BD
    factory.totalVolumeUSD = ZERO_BD
    factory.untrackedVolumeUSD = ZERO_BD
    factory.totalLiquidityUSD = ZERO_BD
    factory.txCount = ZERO_BI

    // create new bundle
    let bundle = new Bundle('1')
    bundle.nativePrice = ZERO_BD
    bundle.save()
  }
  factory.curveCount = factory.curveCount + 1
  factory.save()

  let curveContract = CurveContract.bind(event.params.curve)
  let token0Address = curveContract.try_derivatives(ZERO_BI)
  let token1Address = curveContract.try_derivatives(ONE_BI)

  // create the tokens
  let token0 = Token.load(token0Address.value.toHexString())
  let token1 = Token.load(token1Address.value.toHexString())

  // fetch info if null
  if (token0 === null) {
    token0 = new Token(token0Address.value.toHexString())
    token0.symbol = fetchTokenSymbol(token0Address.value)
    token0.name = fetchTokenName(token0Address.value)
    token0.totalSupply = fetchTokenTotalSupply(token0Address.value)
    let decimals = fetchTokenDecimals(token0Address.value)

    // bail if we couldn't figure out the decimals
    if (decimals === null) {
      log.debug('mybug the decimal on token 0 was null', [])
      return
    }

    token0.decimals = decimals
    token0.derivedNative = ZERO_BD
    token0.tradeVolume = ZERO_BD
    token0.tradeVolumeUSD = ZERO_BD
    token0.untrackedVolumeUSD = ZERO_BD
    token0.totalLiquidity = ZERO_BD
    // token0.allPairs = []
    token0.txCount = ZERO_BI
  }

  // fetch info if null
  if (token1 === null) {
    token1 = new Token(token1Address.value.toHexString())
    token1.symbol = fetchTokenSymbol(token1Address.value)
    token1.name = fetchTokenName(token1Address.value)
    token1.totalSupply = fetchTokenTotalSupply(token1Address.value)
    let decimals = fetchTokenDecimals(token1Address.value)

    // bail if we couldn't figure out the decimals
    if (decimals === null) {
      return
    }
    token1.decimals = decimals
    token1.derivedNative = ZERO_BD
    token1.tradeVolume = ZERO_BD
    token1.tradeVolumeUSD = ZERO_BD
    token1.untrackedVolumeUSD = ZERO_BD
    token1.totalLiquidity = ZERO_BD
    // token1.allPairs = []
    token1.txCount = ZERO_BI
  }
  let curve = new Curve(event.params.curve.toHexString()) as Curve
  curve.token0 = token0.id
  curve.token1 = token1.id
  curve.liquidityProviderCount = ZERO_BI
  curve.createdAtTimestamp = event.block.timestamp
  curve.createdAtBlockNumber = event.block.number
  curve.txCount = ZERO_BI
  curve.reserve0 = ZERO_BD
  curve.reserve1 = ZERO_BD
  curve.trackedReserveNative = ZERO_BD
  curve.reserveNative = ZERO_BD
  curve.reserveUSD = ZERO_BD
  curve.totalSupply = ZERO_BD
  curve.volumeToken0 = ZERO_BD
  curve.volumeToken1 = ZERO_BD
  curve.volumeUSD = ZERO_BD
  curve.untrackedVolumeUSD = ZERO_BD
  curve.token0Price = ZERO_BD
  curve.token1Price = ZERO_BD

  // create the tracked contract based on the template
  CurveTemplate.create(event.params.curve)

  // save updated values
  token0.save()
  token1.save()
  curve.save()
  factory.save()
}

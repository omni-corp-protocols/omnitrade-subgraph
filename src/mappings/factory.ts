/* eslint-disable prefer-const */
import { BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { NewCurve } from '../types/Factory/Factory'
import { Curve, CurveFactory, Token } from '../types/schema'
import { Curve as CurveTemplate } from '../types/templates'
import { Curve as CurveContract } from '../types/templates/Curve/Curve'
import {
  FACTORY_ADDRESS,
  fetchTokenDecimals,
  fetchTokenName,
  fetchTokenSymbol,
  fetchTokenTotalSupply,
  ONE_BI,
  ZERO_BI
} from './helpers'

export function handleNewCurve(event: NewCurve): void {
  // load factory (create if first exchange)
  let factory = CurveFactory.load(FACTORY_ADDRESS)
  if (factory === null) {
    factory = new CurveFactory(FACTORY_ADDRESS)
    factory.curveCount = 0
  }
  factory.curveCount = factory.curveCount + 1
  factory.save()

  let curve = new Curve(event.params.curve.toHexString()) as Curve
  curve.numOfTransfers = BigInt.fromI32(0)

  // create the tracked contract based on the template
  CurveTemplate.create(event.params.curve)

  // save updated values
  curve.save()
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
  }
  token0.save()
  token1.save()
}

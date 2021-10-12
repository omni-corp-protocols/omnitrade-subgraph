/* eslint-disable prefer-const */
import { BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { NewCurve } from '../types/Factory/Factory'
import { Curve, CurveFactory } from '../types/schema'
import { Curve as CurveTemplate } from '../types/templates'

const FACTORY_ADDRESS = '0x00a738971f4aAb40eAB7ff7E6Ff6330007eE663D'
let ZERO_BD = BigDecimal.fromString('0')

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
}

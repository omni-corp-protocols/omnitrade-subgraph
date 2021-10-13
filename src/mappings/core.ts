/* eslint-disable prefer-const */
import { BigInt, log } from '@graphprotocol/graph-ts'
import { Curve } from '../types/schema'
import { Transfer } from '../types/templates/Curve/Curve'

export function handleTransfer(event: Transfer): void {
  // get curve and load contract
  let curve = Curve.load(event.address.toHexString())
  // curve.numOfTransfers = curve.numOfTransfers.plus(BigInt.fromI32(1))
  // curve.save()
}

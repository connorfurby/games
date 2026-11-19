import type { GameState } from '../state'
import { companyBoost, companyBoostExcept, ownerLever } from './company'
import { causePerk, goodwillDemand, officeLever, pressReach, segmentDemand, strikeMul, unionLever } from './town'
import { hedgeCrateMul } from './market'
import { rivalStakeDemandMul } from './rivalry'
import { primeCrateMul } from './treasury'
import { execPower, inventionLever, propertyDemand } from './more'

/**
 * Every way the company layer touches the store, in one place. Each later system adds its
 * factor here, so the Books page and the tests see one number per lever.
 */
export function corpDemandMul(s: GameState): number {
  if (!s.corp) return 1
  return (
    (1 + ownerLever(s, 'demand')) *
    companyBoost(s, 'demand') *
    rivalStakeDemandMul(s) *
    (1 +
      goodwillDemand(s) +
      causePerk(s, 'demand') +
      officeLever(s, 'demand') +
      unionLever(s, 'demand') +
      pressReach(s) +
      segmentDemand(s) +
      inventionLever(s, 'demand') +
      propertyDemand(s) +
      execPower(s, 'cmo')) *
    strikeMul(s)
  )
}

export function corpWageMul(s: GameState): number {
  if (!s.corp) return 1
  return (
    Math.max(
      0.4,
      1 + ownerLever(s, 'wages') + causePerk(s, 'wages') + officeLever(s, 'wages') + unionLever(s, 'wages') + inventionLever(s, 'wages') - execPower(s, 'coo'),
    ) *
    // Benefits keep the crew loyal: rival poaching stops costing you.
    (s.corp.town.union.benefits > 0 ? companyBoostExcept(s, 'wages', 'poaching') : companyBoost(s, 'wages'))
  )
}

/** Venture till speed from owners and board decisions. */
export function corpVentureMul(s: GameState): number {
  if (!s.corp) return 1
  return (1 + ownerLever(s, 'ventures') + causePerk(s, 'ventures') + officeLever(s, 'ventures') + inventionLever(s, 'ventures')) * companyBoost(s, 'ventures')
}

/** How much faster Heat cools (pension-fund owners). */
export function corpHeatCoolMul(s: GameState): number {
  if (!s.corp) return 1
  return Math.max(0.2, 1 + ownerLever(s, 'heatCool') + causePerk(s, 'heat') + officeLever(s, 'heat'))
}

export function corpCrateMul(s: GameState, cat?: string): number {
  if (!s.corp) return 1
  return (
    hedgeCrateMul(s) *
    primeCrateMul(s) *
    (1 + officeLever(s, 'crates') + inventionLever(s, 'crates') - execPower(s, 'coo')) *
    (cat === 'produce' ? 1 - causePerk(s, 'produceCut') : 1)
  )
}

/** Perishables last longer (inventions such as forever lettuce). */
export function corpLifeMul(s: GameState): number {
  if (!s.corp) return 1
  return 1 + inventionLever(s, 'spoil')
}

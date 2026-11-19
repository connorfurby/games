import type { GameState } from '../state'
import { companyBoost, ownerLever } from './company'
import { hedgeCrateMul } from './market'
import { rivalStakeDemandMul } from './rivalry'

/**
 * Every way the company layer touches the store, in one place. Each later system adds its
 * factor here, so the Books page and the tests see one number per lever.
 */
export function corpDemandMul(s: GameState): number {
  if (!s.corp) return 1
  return (1 + ownerLever(s, 'demand')) * companyBoost(s, 'demand') * rivalStakeDemandMul(s)
}

export function corpWageMul(s: GameState): number {
  if (!s.corp) return 1
  return Math.max(0.4, 1 + ownerLever(s, 'wages')) * companyBoost(s, 'wages')
}

/** Venture till speed from owners and board decisions. */
export function corpVentureMul(s: GameState): number {
  if (!s.corp) return 1
  return (1 + ownerLever(s, 'ventures')) * companyBoost(s, 'ventures')
}

/** How much faster Heat cools (pension-fund owners). */
export function corpHeatCoolMul(s: GameState): number {
  if (!s.corp) return 1
  return 1 + ownerLever(s, 'heatCool')
}

export function corpCrateMul(s: GameState): number {
  if (!s.corp) return 1
  return hedgeCrateMul(s)
}

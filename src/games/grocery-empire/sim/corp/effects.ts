import type { GameState } from '../state'
import { hedgeCrateMul } from './market'

/**
 * Every way the company layer touches the store, in one place. Each later system adds its
 * factor here, so the Books page and the tests see one number per lever.
 */
export function corpDemandMul(s: GameState): number {
  if (!s.corp) return 1
  return 1
}

export function corpWageMul(s: GameState): number {
  if (!s.corp) return 1
  return 1
}

export function corpCrateMul(s: GameState): number {
  if (!s.corp) return 1
  return hedgeCrateMul(s)
}

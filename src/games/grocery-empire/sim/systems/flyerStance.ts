import { DEPTH } from '../balance'
import type { GameState } from '../state'

/**
 * SAVE 32: the live flyer's band is the stance you hold against rivals while the week runs.
 * Read only the live window (until > time). Completed `flyerWeeks` (cold permit) is untouched.
 */
export type FlyerBand = 'soft' | 'mid' | 'deep'

export function flyerLiveBand(s: GameState): FlyerBand | null {
  const f = s.depth?.flyer
  if (!f || f.until <= s.time) return null
  return f.discount
}

/** Penny lock pressure multiplier on the lock chance (>= 1). Deep flyer pulls Penny in. */
export function pennyLockChanceMul(s: GameState): number {
  return flyerLiveBand(s) === 'deep' ? DEPTH.flyerDeepPennyLockChanceMul : 1
}

/** Penny lock gap multiplier (<= 1). Deep flyer shortens the quiet gap between locks. */
export function pennyLockGapMul(s: GameState): number {
  return flyerLiveBand(s) === 'deep' ? DEPTH.flyerDeepPennyLockGapMul : 1
}

/** FreshWay spoil pressure bump while a soft flyer is live (>= 1). */
export function freshWaySoftFlyerMul(s: GameState): number {
  return flyerLiveBand(s) === 'soft' ? DEPTH.flyerSoftFreshWaySpoilMul : 1
}

export const FLYER_STANCE_COPY = 'Deep pulls Penny · Soft feeds FreshWay spoil · Mid is calm.'

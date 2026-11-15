/**
 * Late-hub cash floors. Import-light on purpose: content files read these too.
 * Past Era 7 a fixed price turns to pocket change, so optional spends follow revenue.
 */
import { LATE, MARKETING, CELEBRITY_ENDCAP } from './balance'
import type { GameState } from './state'

/** Authored cost, never below `mul` × cashGateSec seconds of revenue. Only bites from Era 7. */
export function lateCashFloor(s: GameState, authored: number, mul = 1): number {
  if (s.era < 7) return authored
  const floor = Math.max(0, s.rates?.revenuePerSec ?? 0) * LATE.cashGateSec * mul
  return Math.max(authored, Math.ceil(floor))
}

export function postureFee(s: GameState): number {
  return lateCashFloor(s, MARKETING.switchFee, LATE.postureGateMul)
}

export function celebrityCashCost(s: GameState): number {
  return lateCashFloor(s, CELEBRITY_ENDCAP.cashCost, LATE.celebrityGateMul)
}

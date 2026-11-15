/**
 * Venture fork readers. A fork is locked at level 10 as side `a` or `b`; the
 * side ids live in content/ventures.ts. Sim code asks here instead of
 * comparing `policy` letters inline, so every fork has one named reader.
 */
import type { GameState } from './state'

export type ForkSide = 'a' | 'b'

/** The locked side for a venture, or null when it is closed or the fork is still open. */
export function forkSide(s: GameState, id: string): ForkSide | null {
  const vs = s.ventures?.[id]
  if (!vs || vs.level <= 0) return null
  return vs.policy === 'a' || vs.policy === 'b' ? vs.policy : null
}

export const FORK_SIDES = {
  dutyfreeTourist: ['dutyfree', 'a'],
  courierKeel: ['courier', 'a'],
  courierOwn: ['courier', 'b'],
  bondedSealed: ['bonded', 'a'],
  mealkitsHearty: ['mealkits', 'a'],
  mealkitsLean: ['mealkits', 'b'],
  mediaLoud: ['media', 'b'],
  ghostRush: ['ghost', 'b'],
  embassyCourtesy: ['embassy-gift', 'a'],
  treatyTable: ['treaty-caterer', 'a'],
  ivoCounter: ['ivo-diner', 'a'],
  kioskAlways: ['endless-kiosk', 'a'],
} as const satisfies Record<string, readonly [string, ForkSide]>

export type ForkKey = keyof typeof FORK_SIDES

/** True when that named fork side is the one locked in. */
export function hasFork(s: GameState, key: ForkKey): boolean {
  const [id, side] = FORK_SIDES[key]
  return forkSide(s, id) === side
}

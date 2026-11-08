import { REBRAND } from '../balance'
import { log } from '../helpers'
import { createInitialState, type GameState } from '../state'

/**
 * Rebrand — the 2.0 prestige loop. From Era 3 you can start a fresh store under a
 * new sign. You keep your Empire (rank, trait points, doctrines), your lessons and
 * your Goodwill; the store, chain, upgrades and cash start over. Goodwill is earned
 * from lifetime revenue this run (cube-root scaled) and permanently lifts basket
 * value and shoppers through the stat engine.
 */
export function goodwillFor(lifetimeRevenue: number): number {
  if (lifetimeRevenue <= 0) return 0
  return Math.floor(Math.cbrt(lifetimeRevenue / REBRAND.revenuePerGoodwillCube))
}

/** Goodwill you'd gain by rebranding now (beyond what this run already banked). */
export function pendingGoodwill(s: GameState): number {
  return Math.max(0, goodwillFor(s.lifetimeRevenue) - (s.rebrand?.bankedThisRun ?? 0))
}

export function canRebrand(s: GameState): string | null {
  if (s.era < REBRAND.minEra) return `Rebrand opens in Era ${REBRAND.minEra}.`
  if (pendingGoodwill(s) < 1) return 'Earn more revenue to gain Goodwill.'
  return null
}

export function rebrand(s: GameState, now = Date.now()): GameState {
  const gain = pendingGoodwill(s)
  const fresh = createInitialState((s.seed * 7919 + s.rebrand.count + 1) % 2147483647, now)
  // Keep the meta layer.
  fresh.empire = { ...s.empire, perks: { ...s.empire.perks } }
  fresh.rebrand = { goodwill: s.rebrand.goodwill + gain, count: s.rebrand.count + 1, bankedThisRun: 0 }
  fresh.prestigeCarry = { ...s.prestigeCarry, mutators: [...s.prestigeCarry.mutators] }
  fresh.tutorials = { done: { ...s.tutorials.done }, queue: [], active: null }
  fresh.seenLines = { ...s.seenLines }
  fresh.tipsSeen = { ...s.tipsSeen }
  fresh.introSeen = true
  fresh.museum = s.museum
  fresh.speed = s.speed
  fresh.cash = Math.round(fresh.cash * (1 + fresh.rebrand.goodwill * REBRAND.startCashPerGoodwill))
  log(
    fresh,
    `Rebrand #${fresh.rebrand.count}: a new sign over the same door. +${gain} Goodwill (${fresh.rebrand.goodwill} total).`,
    'era',
  )
  return fresh
}

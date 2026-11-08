import { CHAIN, EMPIRE, NETWORK, VALUE } from '../balance'
import { clamp } from '../helpers'
import type { GameState, StoreState } from '../state'
import { upgradeEffect } from '../../content/upgrades'
import { statMul } from './stats'

/**
 * 2.0 scale layer.
 *
 * The flagship is the store you actually run (shelf, unpack, checkout, price).
 * Everything else you own — chain stores, districts, lanes, franchises, barges —
 * is an engine that copies the flagship's sales. So the flagship stays the thing
 * you optimize, and the empire multiplies it.
 *
 *   income ≈ flagship sales × value ladder × network
 */

/** One chain store's engine weight (the flagship is the implicit 1.0). */
export function storeEngineWeight(s: GameState, st: StoreState, index: number): number {
  const n = Math.max(1, s.stores.length)
  const fair = 1 / n
  const level = Math.max(1, st.level)
  const levelW = NETWORK.storeBase + NETWORK.storePerLevel * (level - 1)
  const policy = CHAIN.policyRevenue[st.policy] ?? 1
  const attended = clamp(st.attentionShare / fair, 0, 1.5)
  const attMul = NETWORK.neglectFloor + (1 - NETWORK.neglectFloor) * Math.min(1, attended)
  const drift = 1 - NETWORK.driftCut * clamp(st.drift ?? 0, 0, 1)
  const noDepot = !s.depot && index >= NETWORK.storesBeforeDepot ? NETWORK.noDepotMul : 1
  return levelW * policy * attMul * drift * noDepot * statMul(s, 'store')
}

/** Store-equivalents beyond the flagship: chain stores + franchises. */
export function networkStores(s: GameState): number {
  let w = 0
  for (let i = 1; i < s.stores.length; i++) w += storeEngineWeight(s, s.stores[i]!, i)
  if (s.depot) w *= NETWORK.depotMul
  w *= 1 + upgradeEffect(s, 'store-runner') * 0.5
  const franchises = s.fleet?.franchises ?? 0
  w += franchises * NETWORK.perFranchise * (0.5 + 0.5 * clamp(s.brand, 0, 1))
  return w
}

/** Separate multiplicative layers, broken out for the UI. */
export function networkBreakdown(s: GameState) {
  const stores = 1 + networkStores(s)
  const districts = 1 + (s.politics?.acquisitions ?? 0) * NETWORK.perDistrict * statMul(s, 'district')
  const momentum =
    s.cold?.momentumOn && !s.cold.browned && (s.cold.freshness ?? 0) >= 1
      ? Math.max(1, s.cold.momentum)
      : 1
  const cold = momentum * ((s.cold?.plants ?? 0) > 0 ? statMul(s, 'cold') : 1)
  const lanesN = s.fleet?.lanes ?? 0
  const lanes = 1 + lanesN * (s.fuel > 0 ? NETWORK.perLane : NETWORK.perDryLane) * statMul(s, 'lane')
  const barges = 1 + (s.fleet?.barges ?? 0) * NETWORK.perBarge * statMul(s, 'barge')
  const autonomous = s.autonomous ? NETWORK.autonomousMul : 1
  const trees = statMul(s, 'network')
  const parts = { stores, districts, cold, lanes, barges, autonomous, trees }
  let total = 1
  for (const v of Object.values(parts)) total *= v
  return { parts, total }
}

/** Total store-equivalents, flagship included (≥ 1). */
export function networkMul(s: GameState): number {
  return networkBreakdown(s).total
}

/**
 * Value ladder: what a basket is worth. Premium stock costs more AND sells for more,
 * so profit scales while the price mini-game's best price stays put.
 */
export function valueBreakdown(s: GameState) {
  const front = s.builds?.storefront ?? 1
  const storefront = VALUE.storefront[Math.min(front, VALUE.storefront.length - 1)] ?? 1
  const era = VALUE.era[Math.min(Math.max(0, s.era), VALUE.era.length - 1)] ?? 1
  const trees = statMul(s, 'value')
  const parts = { storefront, era, trees }
  return { parts, total: storefront * era * trees }
}

export function valueMul(s: GameState): number {
  return valueBreakdown(s).total
}

/**
 * Book the network's share of this tick's flagship sales.
 * Returns the extra revenue booked (already added to cash).
 */
export function bookNetworkSales(s: GameState, sold: number, revenue: number): number {
  if (sold <= 0 || revenue <= 0) return 0
  const extra = networkMul(s) - 1
  if (extra <= 1e-9) return 0
  const netRev = revenue * extra * NETWORK.margin
  const netSold = sold * extra
  s.cash += netRev
  s.lifetimeRevenue += netRev
  s.baskets += netSold
  s.stats.networkRevenue = (s.stats.networkRevenue ?? 0) + netRev
  s.empire.xp += netSold * EMPIRE.xpPerUnitSold * NETWORK.xpShare * statMul(s, 'xp')
  s.acc.revWindow += netRev
  s.acc.soldWindow += netSold
  return netRev
}

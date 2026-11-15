import { CHAIN, DEPTH, EMPIRE, NETWORK, VALUE } from '../balance'
import { clamp } from '../helpers'
import type { GameState, StoreState } from '../state'
import { upgradeEffect } from '../../content/upgrades'
import { lateNetworkAdd } from './late'
import { boughtRivalStores } from './rivals'
import { statMul } from './stats'
import { policyMatchesTrait } from '../../content/depth'
import {
  charterNetworkMul,
  endlessNetworkMul,
  greenhouseNetworkMul,
  planetNetworkMul,
  relayNetworkMul,
  routeNetworkMul,
} from './horizon'
import { wetLaneWeight } from './fleet'

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

/** Units past `after` contribute at `soft` once the next network layer is online. */
export function oldLayerSoftCount(n: number, after: number, soft = NETWORK.oldLayer.weightSoft): number {
  if (n <= after) return n
  return after + (n - after) * soft
}

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
  let noDepot = !s.depot && index >= NETWORK.storesBeforeDepot ? NETWORK.noDepotMul : 1
  // Commissary softens the no-depot tax when the contract is on.
  if (noDepot < 1 && s.depth?.contracts?.commissary) {
    noDepot = Math.max(noDepot, DEPTH.commissaryNoDepotMul)
  }
  const trait = s.depth?.placeTraits?.[st.id]
  const match = policyMatchesTrait(st.policy, trait) ? 1.06 : 1
  return levelW * policy * attMul * drift * noDepot * match * statMul(s, 'store')
}

/** Store-equivalents beyond the flagship: chain stores + franchises. */
export function networkStores(s: GameState): number {
  let w = 0
  const plantsOnline = (s.cold?.plants ?? 0) > 0
  const softAfter = NETWORK.oldLayer.softAfter.stores
  for (let i = 1; i < s.stores.length; i++) {
    const ew = storeEngineWeight(s, s.stores[i]!, i)
    // Extra chain index (1-based among extras): soft-cap once cold plants exist.
    const extraIndex = i // store index; flagship is 0
    if (plantsOnline && extraIndex > softAfter) w += ew * NETWORK.oldLayer.weightSoft
    else w += ew
  }
  if (s.depot) w *= NETWORK.depotMul
  w *= 1 + upgradeEffect(s, 'store-runner') * 0.5
  const franchiseList = s.fleet?.franchiseList
  const franchises = franchiseList?.length
    ? franchiseList.filter((f) => !f.defected).length
    : (s.fleet?.franchises ?? 0)
  w += franchises * NETWORK.perFranchise * (0.5 + 0.5 * clamp(s.brand, 0, 1))
  w += boughtRivalStores(s)
  return w
}

/** Separate multiplicative layers, broken out for the UI. */
export function networkBreakdown(s: GameState) {
  const stores = 1 + networkStores(s) + lateNetworkAdd(s)
  const districts = 1 + (s.politics?.acquisitions ?? 0) * NETWORK.perDistrict * statMul(s, 'district')
  let momentum =
    s.cold?.momentumOn && !s.cold.browned && (s.cold.freshness ?? 0) >= 1
      ? Math.max(1, s.cold.momentum)
      : 1
  const lanesN = s.fleet?.lanes ?? 0
  // After lanes exist, cold momentum stops climbing hard.
  if (lanesN > 0) {
    momentum = oldLayerSoftCount(momentum, NETWORK.oldLayer.coldMomentumFloor)
  }
  const cold = momentum * ((s.cold?.plants ?? 0) > 0 ? statMul(s, 'cold') : 1)
  const bargesN = s.fleet?.barges ?? 0
  const planetsOnline = (s.horizon?.planets ?? []).some((p) => p.stocked)
  // After barges exist, lane weight soft-caps; after a stocked planet, barge weight soft-caps.
  const effLanes = bargesN > 0 ? oldLayerSoftCount(lanesN, NETWORK.oldLayer.softAfter.lanes) : lanesN
  const effBarges = planetsOnline
    ? oldLayerSoftCount(bargesN, NETWORK.oldLayer.softAfter.barges)
    : bargesN
  let lanes = 1
  if (effLanes > 0) {
    if (s.fuel <= 0) {
      lanes = 1 + effLanes * NETWORK.perDryLane * statMul(s, 'lane')
    } else {
      const { matched, dry } = wetLaneWeight(s)
      const total = matched + dry
      if (total > 0 && effLanes < lanesN) {
        const scale = effLanes / lanesN
        lanes =
          1 +
          (matched * scale * NETWORK.perLane + dry * scale * NETWORK.perDryLane) * statMul(s, 'lane')
      } else {
        lanes = 1 + (matched * NETWORK.perLane + dry * NETWORK.perDryLane) * statMul(s, 'lane')
      }
    }
  }
  const barges = 1 + effBarges * NETWORK.perBarge * statMul(s, 'barge')
  const autonomous = s.autonomous ? NETWORK.autonomousMul : 1
  const trees = statMul(s, 'network')
  const planets = planetNetworkMul(s)
  const routes = routeNetworkMul(s)
  const greenhouses = greenhouseNetworkMul(s)
  const relays = relayNetworkMul(s)
  const charter = charterNetworkMul(s)
  const endless = endlessNetworkMul(s)
  const parts = { stores, districts, cold, lanes, barges, autonomous, trees, planets, routes, greenhouses, relays, charter, endless }
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

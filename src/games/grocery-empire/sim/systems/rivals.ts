import { EMPIRE, RIVAL_CHAINS } from '../balance'
import { log } from '../helpers'
import type { GameState, RivalState } from '../state'
import { RIVALS, RIVAL_BY_ID, type RivalDef, type RivalId } from '../../content/rivals'
import { statCut, statMul } from './stats'

/**
 * Named rival chains. One opens per era from Era 2. An independent rival grows a
 * store every few minutes and every store shaves a little demand. Price wars knock
 * it back; buyouts fold its stores into your network for good.
 */

export function rivalOpen(s: GameState, def: RivalDef): boolean {
  return s.era >= def.era
}

function fresh(s: GameState, def: RivalDef): RivalState {
  return {
    stores: def.startStores,
    bought: false,
    boughtStores: 0,
    nextGrowAt: s.time + def.growSec,
    frozenUntil: 0,
    warReadyAt: 0,
    grown: 0,
    wars: 0,
  }
}

/** The rival's state, or null if its era has not arrived. */
export function rivalState(s: GameState, id: RivalId): RivalState | null {
  return s.rivals?.[id] ?? null
}

/** Independent rivals currently on the board. */
export function activeRivals(s: GameState): { def: RivalDef; st: RivalState }[] {
  const out: { def: RivalDef; st: RivalState }[] = []
  for (const def of RIVALS) {
    const st = s.rivals?.[def.id]
    if (st && !st.bought) out.push({ def, st })
  }
  return out
}

/** Demand multiplier from independent rivals (≤ 1). */
export function rivalDemandMul(s: GameState): number {
  let stores = 0
  for (const { st } of activeRivals(s)) stores += st.stores
  if (stores <= 0) return 1
  return 1 / (1 + stores * RIVAL_CHAINS.perStore * statCut(s, 'rivalCut'))
}

/** Store-equivalents added to the network by bought rivals. */
export function boughtRivalStores(s: GameState): number {
  let n = 0
  for (const def of RIVALS) {
    const st = s.rivals?.[def.id]
    if (st?.bought) n += st.boughtStores
  }
  return n * RIVAL_CHAINS.boughtStoreWeight * statMul(s, 'store')
}

export function buyoutCost(s: GameState, id: RivalId): number {
  const def = RIVAL_BY_ID[id]
  const st = s.rivals?.[id]
  const stores = st?.stores ?? def.startStores
  return Math.ceil(def.buyoutBase * (1 + stores * RIVAL_CHAINS.buyoutPerStore) * statCut(s, 'dealCut'))
}

export function priceWarCost(s: GameState, id: RivalId): number {
  return Math.ceil(buyoutCost(s, id) * RIVAL_CHAINS.warCostFrac)
}

export function canPriceWar(s: GameState, id: RivalId): string | null {
  const def = RIVAL_BY_ID[id]
  if (!def) return 'Unknown rival.'
  const st = s.rivals?.[id]
  if (!st) return `${def.name} opens in Era ${def.era}.`
  if (st.bought) return 'Already yours.'
  if (st.stores <= 1) return 'Down to their first store.'
  if (s.time < st.warReadyAt) return `Ready in ${Math.ceil(st.warReadyAt - s.time)}s.`
  const cost = priceWarCost(s, id)
  if (s.cash < cost) return `Need $${cost}.`
  return null
}

export function priceWar(s: GameState, id: RivalId) {
  const def = RIVAL_BY_ID[id]
  const st = s.rivals[id]!
  const cost = priceWarCost(s, id)
  s.cash -= cost
  const closed = Math.min(RIVAL_CHAINS.warStoresClosed, st.stores - 1)
  st.stores -= closed
  st.frozenUntil = s.time + RIVAL_CHAINS.warFreezeSec
  st.nextGrowAt = Math.max(st.nextGrowAt, st.frozenUntil)
  st.warReadyAt = s.time + RIVAL_CHAINS.warCooldownSec
  st.wars += 1
  log(s, `Price war with ${def.name}: ${closed} store${closed === 1 ? '' : 's'} closed (−$${cost}). ${def.flinch}`, 'good')
}

export function canBuyout(s: GameState, id: RivalId): string | null {
  const def = RIVAL_BY_ID[id]
  if (!def) return 'Unknown rival.'
  const st = s.rivals?.[id]
  if (!st) return `${def.name} opens in Era ${def.era}.`
  if (st.bought) return 'Already yours.'
  const cost = buyoutCost(s, id)
  if (s.cash < cost) return `Need $${cost}.`
  return null
}

export function buyout(s: GameState, id: RivalId) {
  const def = RIVAL_BY_ID[id]
  const st = s.rivals[id]!
  const cost = buyoutCost(s, id)
  s.cash -= cost
  st.bought = true
  st.boughtStores = st.stores
  // A buyout is worth a share of the current Empire level per store, so it matters in every era.
  const levelXp = EMPIRE.levelBase * Math.pow(EMPIRE.levelGrowth, Math.max(0, s.empire.level - 1))
  s.empire.xp += st.stores * levelXp * RIVAL_CHAINS.buyoutLevelShare * statMul(s, 'xp')
  s.stats.rivalsBought = (s.stats.rivalsBought ?? 0) + 1
  log(s, `Bought ${def.name} (−$${cost}). ${st.stores} stores join the network. ${def.farewell}`, 'good')
}

export function tickRivals(s: GameState) {
  if (!s.rivals) s.rivals = {}
  for (const def of RIVALS) {
    if (!rivalOpen(s, def)) continue
    let st = s.rivals[def.id]
    if (!st) {
      st = s.rivals[def.id] = fresh(s, def)
      log(s, `A rival opens: ${def.name}. ${def.tagline} See Team › Rivals.`, 'warn')
      continue
    }
    if (st.bought || st.stores >= def.maxStores) continue
    if (s.time < st.frozenUntil || s.time < st.nextGrowAt) continue
    st.stores += 1
    st.grown += 1
    st.nextGrowAt = s.time + def.growSec
    if (st.grown % RIVAL_CHAINS.tauntEvery === 1) {
      log(s, def.taunts[Math.floor(st.grown / RIVAL_CHAINS.tauntEvery) % def.taunts.length]!, 'warn')
    }
  }
}

/** Name of the biggest independent rival, for event copy. */
export function leadingRivalName(s: GameState): string | null {
  let best: { def: RivalDef; st: RivalState } | null = null
  for (const r of activeRivals(s)) if (!best || r.st.stores > best.st.stores) best = r
  return best?.def.name ?? null
}

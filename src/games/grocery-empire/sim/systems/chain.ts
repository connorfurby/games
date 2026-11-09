import { CHAIN, CHECKOUT, COMPUTE } from '../balance'
import { upgradeEffect } from '../../content/upgrades'
import { clamp, log } from '../helpers'
import type { GameState, StorePolicy, StoreState } from '../state'

export function ensureFlagshipStore(s: GameState) {
  if (s.stores.length > 0) return
  s.stores.push({
    id: `s${s.nextStoreId++}`,
    name: 'Flagship',
    level: 1,
    xp: 0,
    policy: 'standard',
    attentionShare: 1,
    drift: 0,
  })
  s.stats.storesOpened = Math.max(s.stats.storesOpened, 1)
}

export function findStore(s: GameState, id: string): StoreState | undefined {
  return s.stores.find((st) => st.id === id)
}

export function normalizeAttentionShares(s: GameState) {
  if (s.stores.length === 0) return
  const sum = s.stores.reduce((a, st) => a + Math.max(0, st.attentionShare), 0)
  if (sum <= 0) {
    const even = 1 / s.stores.length
    for (const st of s.stores) st.attentionShare = even
    return
  }
  if (sum > 1 + 1e-9) {
    for (const st of s.stores) st.attentionShare = st.attentionShare / sum
  }
}

/**
 * Even Attention upgrade: no store sinks below half its fair share. The shortfall is
 * taken from stores above their fair share (proportionally to how far above).
 */
export function applyEvenAttentionFloor(s: GameState) {
  const n = s.stores.length
  if (n < 2) return
  if ((s.upgrades['even-att'] ?? 0) < 1) return
  const fair = 1 / n
  // Attention Floor raises the floor from half → up to three-quarters fair share.
  const floorFrac = Math.min(0.75, CHECKOUT.neglectAttFrac + (s.upgrades['attention-floor'] ?? 0) * 0.08)
  const floor = fair * floorFrac
  let need = 0
  for (const st of s.stores) {
    if (st.attentionShare < floor) {
      need += floor - st.attentionShare
      st.attentionShare = floor
    }
  }
  if (need <= 0) return
  let surplus = 0
  for (const st of s.stores) if (st.attentionShare > fair) surplus += st.attentionShare - fair
  if (surplus <= 1e-9) return
  const take = Math.min(need, surplus)
  for (const st of s.stores) {
    if (st.attentionShare > fair) {
      st.attentionShare -= (take * (st.attentionShare - fair)) / surplus
    }
  }
}

/** Attention the chain consumes per second (charged against regen in tickOffice). */
export function chainAttentionDrainPerSec(s: GameState): number {
  if (s.era < 2 || s.stores.length === 0 || !s.compute.unlocked) return 0
  const allocated = s.stores.reduce((a, st) => a + st.attentionShare, 0)
  if (allocated <= 0) return 0
  const metroMul = s.expansions['metro-slot'] ? CHAIN.metroAttDrainMul : 1
  const softcap = !s.depot && s.stores.length >= 5 ? 1.5 : 1
  const raw =
    CHAIN.attentionDrainPerSec * allocated * Math.min(1.5, 0.6 + s.stores.length * 0.15) * metroMul * softcap
  // Stores slow the fill. They cannot outrun analysts, or Ideas never mint.
  const gen = s.compute.analysts * COMPUTE.attentionPerAnalyst * (s.memos['ledger-tape'] ? 1.1 : 1)
  if (gen <= 0) return raw
  return Math.min(raw, gen * 0.85)
}

/** Weighted chain demand multiplier from store count, policies, attention, depot. */
export function chainDemandMul(s: GameState): number {
  if (s.era < 2 || s.stores.length === 0) return 1
  const n = s.stores.length
  const fair = 1 / n
  let weighted = 0
  for (let i = 0; i < n; i++) {
    const st = s.stores[i]!
    const policy = CHAIN.policyDemand[st.policy] ?? 1
    const levelMul = 1 + (st.level - 1) * 0.04
    const neglect = Math.max(0, fair - st.attentionShare)
    const neglectMul = 1 - neglect * CHAIN.neglectSpoilMul
    const attMul = 0.75 + 0.25 * clamp(st.attentionShare / fair, 0, 1.5)
    // Flagship Memo / Flagship Habit: mild pull on the first door.
    const flag =
      i === 0
        ? 1 +
          ((s.memos['flagship-memo'] ?? 0) > 0 ? 0.03 : 0) +
          (s.empire.perks['flagship-habit'] ?? 0) * 0.02
        : 1
    weighted += policy * levelMul * neglectMul * attMul * flag
  }
  const avg = weighted / n
  const perStore = s.expansions['metro-slot']
    ? CHAIN.storeCountDemandEach + CHAIN.metroStoreDemandEach
    : CHAIN.storeCountDemandEach
  // Without a depot, stores beyond the 4th contribute half the usual per-store demand.
  let countBonus = 0
  for (let i = 1; i < n; i++) {
    const half = !s.depot && i >= 4
    countBonus += half ? perStore * 0.5 : perStore
  }
  // 2.0: extra stores no longer pour demand into the flagship — they run as engines
  // (see systems/network.ts). Keep a light 'foot traffic' echo.
  const countMul = 1 + countBonus * 0.15
  const depotMul = s.depot ? CHAIN.depotDemandMul : 1
  // Drift (0..1) softens demand when a store hasn't been walked.
  let driftPenalty = 0
  for (const st of s.stores) {
    const d = Math.max(0, Math.min(1, st.drift ?? 0))
    driftPenalty += d
  }
  const driftMul = 1 - Math.min(0.2, (driftPenalty / Math.max(1, n)) * 0.25)
  return avg * countMul * depotMul * driftMul
}

/** Blend of store policy revenue multipliers (attention-weighted). */
export function chainRevenueMul(s: GameState): number {
  if (s.era < 2 || s.stores.length === 0) return 1
  let w = 0
  let sum = 0
  const premiumBonus =
    (s.doctrines['premium-bodega'] ?? 0) > 0 ? CHAIN.policyRevenue.premium + 0.04 : CHAIN.policyRevenue.premium
  for (const st of s.stores) {
    const a = Math.max(0.05, st.attentionShare)
    const base =
      st.policy === 'premium' ? premiumBonus : (CHAIN.policyRevenue[st.policy] ?? 1)
    sum += a * base
    w += a
  }
  return w > 0 ? sum / w : 1
}

/**
 * Extra checkout lanes from chain stores.
 * Managed (≥ half fair Attention) add full lanes; neglected add a sliver.
 * Lane Boss upgrade strengthens managed lanes.
 */
export function chainCheckoutBonus(s: GameState): number {
  if (s.era < 2 || s.stores.length <= 1) return 0
  const fair = 1 / s.stores.length
  const laneBoss =
    1 +
    (s.upgrades['lane-boss'] ?? 0) * 0.08 +
    upgradeEffect(s, 'store-runner') +
    upgradeEffect(s, 'lane-rhythm')
  let bonus = 0
  // Flagship is index 0 — extras are stores beyond the first.
  for (let i = 1; i < s.stores.length; i++) {
    const st = s.stores[i]!
    const managed = st.attentionShare >= fair * CHECKOUT.neglectAttFrac
    bonus += managed
      ? CHECKOUT.perManagedStore * laneBoss
      : CHECKOUT.perNeglectedStore
  }
  return bonus
}

/** Extra shrink when stores are neglected — average of per-store terms (never falls with more stores). */
export function chainShrinkMul(s: GameState): number {
  if (s.era < 2 || s.stores.length === 0) return 1
  const fair = 1 / s.stores.length
  let sum = 0
  for (const st of s.stores) {
    const neglect = Math.max(0, fair - st.attentionShare)
    const drift = Math.max(0, st.drift ?? 0)
    const policy = CHAIN.policyShrink[st.policy] ?? 1
    sum += (1 + neglect * 0.45 + drift * 0.25) * policy
  }
  return Math.min(2.2, Math.max(0.85, sum / s.stores.length))
}

function levelStore(st: StoreState) {
  while (st.level < CHAIN.maxStoreLevel && st.xp >= CHAIN.xpPerLevel * st.level) {
    st.xp -= CHAIN.xpPerLevel * st.level
    st.level += 1
  }
}

/** Spend Attention on managed stores; award store XP from recent sales share. */
export function tickChain(s: GameState, dt: number, soldThisTick = 0) {
  if (s.era < 2) return
  ensureFlagshipStore(s)
  normalizeAttentionShares(s)
  if ((s.upgrades['even-att'] ?? 0) >= 1) applyEvenAttentionFloor(s)

  // Attention upkeep is charged inside tickOffice (see chainAttentionDrainPerSec) so a
  // full bar can still sit at cap and pay for cap-sized memos.

  if (soldThisTick > 0 && s.stores.length > 0) {
    const fair = 1 / s.stores.length
    for (const st of s.stores) {
      const share = Math.max(0.05, st.attentionShare || fair)
      st.xp += soldThisTick * share * CHAIN.xpPerSaleShare
      levelStore(st)
    }
  }

  // Drift rises when under-attended; Walk store resets it. Inspection gain must beat decay.
  if (s.stores.length > 0) {
    const fair = 1 / s.stores.length
    let neglect = 0
    for (const st of s.stores) {
      const under = Math.max(0, fair - st.attentionShare)
      neglect += under
      st.drift = Math.min(1, Math.max(0, (st.drift ?? 0) + under * 0.015 * dt + 0.002 * dt))
    }
    if (neglect > 0.1) {
      s.inspection.meter = Math.min(2, s.inspection.meter + neglect * 0.006 * dt)
    }
  }
}

export function canWalkStore(s: GameState, id: string, attCost = 40): string | null {
  const st = findStore(s, id)
  if (!st) return 'Store not found.'
  if (s.compute.attention < attCost) return `Need ${attCost} Attention.`
  return null
}

/** Spend Attention to walk a store and clear drift. */
export function walkStore(s: GameState, id: string, attCost = 40): string | null {
  const blocked = canWalkStore(s, id, attCost)
  if (blocked) return blocked
  const st = findStore(s, id)!
  s.compute.attention -= attCost
  st.drift = 0
  s.stats.walks = (s.stats.walks ?? 0) + 1
  log(s, `Walked ${st.name}. Drift cleared.`, 'good')
  return null
}

/** Attention cost to train this store once more. */
export function trainStoreCost(st: StoreState): number {
  return Math.ceil(CHAIN.trainAttBase * Math.pow(CHAIN.trainAttGrowth, Math.max(0, st.level - 1)))
}

export function canTrainStore(s: GameState, id: string, attCost?: number): string | null {
  const st = findStore(s, id)
  if (!st) return 'Store not found.'
  attCost = attCost ?? trainStoreCost(st)
  if (st.level >= CHAIN.maxStoreLevel) return 'Store already at max level.'
  if (s.compute.attention < attCost) return `Need ${attCost} Attention.`
  return null
}

/** Spend Attention to train a store (XP). */
export function trainStore(s: GameState, id: string, attCost?: number): string | null {
  const blocked = canTrainStore(s, id, attCost)
  if (blocked) return blocked
  const st = findStore(s, id)!
  attCost = attCost ?? trainStoreCost(st)
  s.compute.attention -= attCost
  st.xp += CHAIN.xpPerLevel * st.level * 0.55
  levelStore(st)
  s.stats.trains = (s.stats.trains ?? 0) + 1
  log(s, `Trained ${st.name} · Lv ${st.level}.`, 'good')
  return null
}

export function openStoreCost(s: GameState): number {
  const n = Math.max(0, s.stores.length)
  if (n <= 0) return 0
  let cost = CHAIN.openBaseCost * Math.pow(CHAIN.openGrowth, n - 1)
  if (s.expansions['corner-parcel']) cost *= CHAIN.cornerParcelCostMul
  if (s.board.expandDiscount > 0 && s.board.expandDiscount < 1) {
    cost *= s.board.expandDiscount
  }
  // Soft Opening / Second Key Desk / Many Doors perk (cycle-safe: no formulas import).
  const soft = (s.upgrades['soft-opening'] ?? 0) * 0.03
  const desk = upgradeEffect(s, 'second-key')
  const manyDoors = (s.empire.perks['many-doors'] ?? 0) * 0.04
  cost *= Math.max(0.55, 1 - soft - desk - manyDoors)
  if (s.memos['many-doors-memo']) cost *= 0.97
  return Math.ceil(cost)
}

export function setStorePolicy(s: GameState, id: string, policy: StorePolicy) {
  const st = findStore(s, id)
  if (!st) return
  st.policy = policy
  log(s, `${st.name} policy → ${policy}.`, 'info')
}

import { CHAIN } from '../balance'
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

/** Weighted chain demand multiplier from store count, policies, attention, depot. */
export function chainDemandMul(s: GameState): number {
  if (s.era < 2 || s.stores.length === 0) return 1
  const n = s.stores.length
  const fair = 1 / n
  let weighted = 0
  for (const st of s.stores) {
    const policy = CHAIN.policyDemand[st.policy] ?? 1
    const levelMul = 1 + (st.level - 1) * 0.04
    const neglect = Math.max(0, fair - st.attentionShare)
    const neglectMul = 1 - neglect * CHAIN.neglectSpoilMul
    const attMul = 0.75 + 0.25 * clamp(st.attentionShare / fair, 0, 1.5)
    weighted += policy * levelMul * neglectMul * attMul
  }
  const avg = weighted / n
  const countMul = 1 + (n - 1) * CHAIN.storeCountDemandEach
  const depotMul = s.depot ? CHAIN.depotDemandMul : 1
  return avg * countMul * depotMul
}

/** Blend of store policy revenue multipliers (attention-weighted). */
export function chainRevenueMul(s: GameState): number {
  if (s.era < 2 || s.stores.length === 0) return 1
  let w = 0
  let sum = 0
  for (const st of s.stores) {
    const a = Math.max(0.05, st.attentionShare)
    sum += a * (CHAIN.policyRevenue[st.policy] ?? 1)
    w += a
  }
  return w > 0 ? sum / w : 1
}

/** Extra shrink when stores are neglected. */
export function chainShrinkMul(s: GameState): number {
  if (s.era < 2 || s.stores.length === 0) return 1
  const fair = 1 / s.stores.length
  let mul = 1
  for (const st of s.stores) {
    const neglect = Math.max(0, fair - st.attentionShare)
    mul += neglect * 0.35
    mul *= CHAIN.policyShrink[st.policy] ?? 1
  }
  return Math.min(2.2, mul / Math.max(1, s.stores.length * 0.85))
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

  const allocated = s.stores.reduce((a, st) => a + st.attentionShare, 0)
  if (allocated > 0 && s.compute.unlocked) {
    const drain = CHAIN.attentionDrainPerSec * allocated * dt * Math.min(1.5, 0.6 + s.stores.length * 0.15)
    s.compute.attention = Math.max(0, s.compute.attention - drain)
  }

  if (soldThisTick > 0 && s.stores.length > 0) {
    const fair = 1 / s.stores.length
    for (const st of s.stores) {
      const share = Math.max(0.05, st.attentionShare || fair)
      st.xp += soldThisTick * share * CHAIN.xpPerSaleShare
      levelStore(st)
    }
  }

  // Neglected stores quietly raise inspection heat (never bricks).
  if (s.stores.length > 1) {
    const fair = 1 / s.stores.length
    let neglect = 0
    for (const st of s.stores) neglect += Math.max(0, fair - st.attentionShare)
    if (neglect > 0.15) {
      s.inspection.meter = Math.min(2, s.inspection.meter + neglect * 0.002 * dt)
    }
  }
}

export function openStoreCost(s: GameState): number {
  const n = Math.max(0, s.stores.length)
  if (n <= 0) return 0
  return Math.ceil(CHAIN.openBaseCost * Math.pow(CHAIN.openGrowth, n - 1))
}

export function setStorePolicy(s: GameState, id: string, policy: StorePolicy) {
  const st = findStore(s, id)
  if (!st) return
  st.policy = policy
  log(s, `${st.name} policy → ${policy}.`, 'info')
}

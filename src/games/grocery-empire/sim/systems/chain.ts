import { PLACE_TRAIT_IDS, STORE_TRAIT_BY_ID, policyMatchesTrait, isPlaceTraitId } from '../../content/depth'
import { CHAIN, CHECKOUT, COMPUTE, DEPTH, NETWORK } from '../balance'
import { upgradeEffect } from '../../content/upgrades'
import { clamp, log } from '../helpers'
import { chance, pick } from '../rng'
import { chainStaffedEnough } from '../staffDept'
import type { GameState, StorePolicy, StoreState } from '../state'

export function traitOfStore(s: GameState, storeId: string): string | null {
  const t = s.depth?.placeTraits?.[storeId]
  return t && isPlaceTraitId(t) ? t : null
}

export function matchedStoreCount(s: GameState): number {
  let n = 0
  for (const st of s.stores) {
    if (policyMatchesTrait(st.policy, traitOfStore(s, st.id) ?? undefined)) n += 1
  }
  return n
}

/** Alias used by cold-permit gates / docs. */
export const countMatchedStores = matchedStoreCount

/** Price ceiling for the printed flyer discount band vs bestPrice. */
export function flyerBandMaxMul(discount: 'soft' | 'mid' | 'deep'): number {
  if (discount === 'deep') return DEPTH.flyerBandDeepMax
  if (discount === 'mid') return DEPTH.flyerBandMidMax
  return DEPTH.flyerBandSoftMax
}

/**
 * Break the live flyer week if shelf price sits above the printed band.
 * `tip` should be bestPrice(s) — passed in to avoid formulas↔chain cycles.
 */
export function checkFlyerBandLock(s: GameState, tip: number) {
  if (!s.depth?.flyer) return
  const f = s.depth.flyer
  if (f.until <= s.time || f.bandHeld === false) return
  const max = tip * flyerBandMaxMul(f.discount)
  if (s.price > max + 1e-6) {
    f.bandHeld = false
    log(s, 'Flyer band broken — this week will not credit.', 'warn')
  }
}

/** Complete an active flyer week once its window ends; start cooldown. */
export function tickFlyerDesk(s: GameState) {
  if (!s.depth) return
  const f = s.depth.flyer
  if (!f || f.until <= 0 || s.time < f.until) return
  // Final band check uses current price vs a soft tip (wholesale index × 1.25).
  const tip =
    (Number.isFinite(s.wholesale.tipIndex) ? s.wholesale.tipIndex : s.wholesale.index) * 1.25
  checkFlyerBandLock(s, tip)
  const pad = Math.min(0.35, upgradeEffect(s, 'flyer-band-pad'))
  const cd = DEPTH.flyerCooldownSec * (1 - pad)
  f.cooldownUntil = s.time + cd
  f.until = 0
  s.depth.circular = null
  if (f.bandHeld !== false) {
    f.weeksCompleted += 1
    s.depth.flyerWeeks = Math.max(s.depth.flyerWeeks, f.weeksCompleted)
    log(s, `Flyer week ${s.depth.flyerWeeks} held the band. Cooldown ${Math.ceil(cd / 60)} min.`, 'info')
  } else {
    log(s, `Flyer week voided — prices broke the printed band. Cooldown ${Math.ceil(cd / 60)} min.`, 'warn')
  }
}

/** Neighborhood block events bias which trait is "hot" for a window (fixed gap). */
export function tickBlockEvents(s: GameState, _dt: number) {
  if (!s.depth || s.era < 2 || s.stores.length < 2) return
  const ev = s.depth.blockEvent
  const gapCut = Math.min(0.35, upgradeEffect(s, 'hot-trait-pad'))
  const gap = DEPTH.blockEventGapSec * (1 - gapCut)
  if (ev.kind && s.time >= ev.until) {
    ev.kind = null
    ev.traitBias = null
    ev.until = 0
    log(s, 'Block event cleared — traits settle.', 'info')
  }
  if (ev.kind && ev.until > s.time) return
  if (s.depth.blockEventAt > 0 && s.time - s.depth.blockEventAt < gap) return
  const kinds = ['parade', 'payday', 'rain'] as const
  const kind = pick(s, [...kinds])
  const trait = pick(s, [...PLACE_TRAIT_IDS])
  ev.kind = kind
  ev.traitBias = trait
  ev.until = s.time + DEPTH.blockEventDurationSec
  s.depth.blockEventAt = s.time
  const label = kind === 'parade' ? 'Parade week' : kind === 'payday' ? 'Payday rush' : 'Rain week'
  log(s, `${label}: ${STORE_TRAIT_BY_ID[trait].name} doors pull hardest.`, 'warn')
}

/** Credit a hot-trait walk when any store policy matches the live bias. */
export function maybeCreditHotTraitWalk(s: GameState) {
  if (!s.depth) return
  const ev = s.depth.blockEvent
  if (!ev.kind || !ev.traitBias || s.time >= ev.until) return
  for (const st of s.stores) {
    if (policyMatchesTrait(st.policy, ev.traitBias)) {
      s.depth.hotTraitWalks = (s.depth.hotTraitWalks ?? 0) + 1
      log(
        s,
        `Hot-trait walk ${s.depth.hotTraitWalks}/${DEPTH.hotTraitWalkNeed} — ${STORE_TRAIT_BY_ID[ev.traitBias as keyof typeof STORE_TRAIT_BY_ID]?.name ?? ev.traitBias}.`,
        'good',
      )
      // One walk per event window.
      ev.traitBias = null
      ev.kind = null
      ev.until = 0
      return
    }
  }
}

export function rollStoreTrait(s: GameState, storeId: string) {
  if (!s.depth) return
  if (s.depth.placeTraits[storeId]) return
  const id = pick(s, PLACE_TRAIT_IDS)
  s.depth.placeTraits[storeId] = id
  const def = STORE_TRAIT_BY_ID[id]
  log(s, `Neighborhood reads ${def.name.toLowerCase()}.`, 'info')
}

export function ensureFlagshipStore(s: GameState) {
  if (s.stores.length > 0) {
    for (const st of s.stores) rollStoreTrait(s, st.id)
    return
  }
  const id = `s${s.nextStoreId++}`
  s.stores.push({
    id,
    name: 'Flagship',
    level: 1,
    xp: 0,
    policy: 'standard',
    attentionShare: 1,
    drift: 0,
  })
  rollStoreTrait(s, id)
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
  const commissaryMul = s.depth?.contracts?.commissary ? DEPTH.commissaryAttDrainMul : 1
  const raw =
    CHAIN.attentionDrainPerSec *
    allocated *
    Math.min(1.5, 0.6 + s.stores.length * 0.15) *
    metroMul *
    softcap *
    commissaryMul
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
    const trait = traitOfStore(s, st.id)
    const traitDef = trait && isPlaceTraitId(trait) ? STORE_TRAIT_BY_ID[trait] : null
    const traitMul =
      traitDef && policyMatchesTrait(st.policy, trait) ? traitDef.matchDemandMul : 1
    const block = s.depth?.blockEvent
    const blockHot =
      block &&
      block.kind &&
      block.until > s.time &&
      block.traitBias &&
      policyMatchesTrait(st.policy, block.traitBias)
        ? DEPTH.blockEventDemandMul
        : 1
    weighted += policy * levelMul * neglectMul * attMul * flag * traitMul * blockHot
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
  tickFlyerDesk(s)
  tickBlockEvents(s, dt)

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
    const staffed = chainStaffedEnough(s)
    for (const st of s.stores) {
      const under = Math.max(0, fair - st.attentionShare)
      neglect += under
      const trait = traitOfStore(s, st.id)
      const match = policyMatchesTrait(st.policy, trait)
      const traitDef = trait && isPlaceTraitId(trait) ? STORE_TRAIT_BY_ID[trait] : null
      const mismatchMul = traitDef && !match ? traitDef.mismatchDriftMul : 1
      const unstaffedMul = staffed ? 1 : DEPTH.unstaffedDriftMul
      const chainPol = s.depth?.departments?.chain?.policy
      const patrolMul = chainPol === 'patrol' ? (DEPTH.chainPatrolDriftMul ?? 0.88) : 1
      st.drift = Math.min(
        1,
        Math.max(
          0,
          (st.drift ?? 0) + (under * 0.015 * dt + 0.002 * dt) * mismatchMul * unstaffedMul * patrolMul,
        ),
      )
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
  // Soft win-back: walking doors nudges a defected franchise.
  const defected = s.fleet?.franchiseList?.find((f) => f.defected)
  if (defected) {
    defected.loyalty = Math.min(1, defected.loyalty + 0.2)
    if (defected.loyalty >= 0.45) {
      defected.defected = false
      s.depth.defectionsHandled = (s.depth.defectionsHandled ?? 0) + 1
      log(s, `${defected.name} came back after the walk.`, 'good')
    }
  }
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
  // After cold plants exist, further chain doors get steeper.
  if ((s.cold?.plants ?? 0) > 0) {
    const extras = Math.max(0, n - 1 - NETWORK.oldLayer.softAfter.stores)
    if (extras > 0) cost *= Math.pow(NETWORK.oldLayer.costSteepen, extras)
  }
  return Math.ceil(cost)
}

export function setStorePolicy(s: GameState, id: string, policy: StorePolicy) {
  const st = findStore(s, id)
  if (!st) return
  st.policy = policy
  log(s, `${st.name} policy → ${policy}.`, 'info')
  maybeCreditHotTraitWalk(s)
}

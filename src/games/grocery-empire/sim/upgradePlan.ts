import {
  UPGRADES,
  childrenOf,
  forkBlockedBy,
  isUpgradeVisible,
  requirementsMet,
  upgradeCurveAt,
  upgradeSynergy,
  type TreeId,
  type UpgradeDef,
} from '../content/upgrades'
import { effectiveRank, masteryMul, type StatId } from '../content/upgrades/stats'
import { VENTURES, ventureIncome, ventureLevelCost } from '../content/ventures'
import { nextUpgradeCost, salesBottleneck, upgradeRankCap } from './formulas'
import type { GameState } from './state'

/** Ranks bought in one click. Another click continues the same order. */
export const UPGRADE_SWEEP_LIMIT = 100
export const VENTURE_SWEEP_LIMIT = 40

export type SweepBuy = { id: string; count: number }

const BASE_WEIGHT: Record<StatId, number> = {
  demand: 3,
  value: 2.4,
  margin: 2.2,
  unpack: 1.2,
  checkout: 1.2,
  shelf: 1.4,
  backroom: 0.9,
  network: 1.6,
  store: 1.8,
  district: 1.2,
  lane: 1,
  barge: 0.8,
  cold: 1.2,
  plantIncome: 1,
  harvest: 0.6,
  attention: 1.4,
  ideas: 1,
  xp: 0.4,
  wageCut: 1.3,
  spoilCut: 1,
  crateCut: 1.2,
  rivalCut: 0.7,
  dealCut: 0.5,
  planet: 1.4,
  freight: 1.2,
  seed: 1.1,
  signal: 1.1,
  seal: 1,
}

function statWeights(s: GameState): Record<StatId, number> {
  const w = { ...BASE_WEIGHT }
  const kind = salesBottleneck(s).kind
  if (kind === 'unpack') {
    w.unpack *= 3
    w.shelf *= 1.6
  } else if (kind === 'checkout') {
    w.checkout *= 3
  } else if (kind === 'shelf') {
    w.shelf *= 3
    w.unpack *= 1.4
  } else {
    w.demand *= 1.5
    w.value *= 1.25
    w.margin *= 1.25
    w.network *= 1.15
  }
  return w
}

function treeRankMap(s: GameState): Record<string, number> {
  const out: Record<string, number> = {}
  for (const def of UPGRADES) {
    const lvl = s.upgrades[def.id] ?? 0
    if (lvl > 0) out[def.tree] = (out[def.tree] ?? 0) + lvl
  }
  return out
}

/** How much the next rank is worth, before dividing by its price. */
function marginalValue(
  def: UpgradeDef,
  level: number,
  treeRank: number,
  s: GameState,
  w: Record<StatId, number>,
): number {
  const syn = upgradeSynergy(s, def)
  if (def.effects?.length) {
    const m0 = masteryMul(treeRank)
    const m1 = masteryMul(treeRank + 1)
    const delta = effectiveRank(level + 1) * m1 - effectiveRank(level) * m0
    let v = 0
    for (const e of def.effects) v += e.per * delta * (w[e.stat] ?? 1) * syn
    return v
  }
  const dCurve = Math.max(0.25, upgradeCurveAt(def, level + 1) - upgradeCurveAt(def, level))
  return dCurve * syn * 0.02
}

function unlockBonus(
  def: UpgradeDef,
  level: number,
  s: GameState,
  ranks: Record<string, number>,
  w: Record<StatId, number>,
): number {
  const next = level + 1
  let bonus = 0
  for (const child of childrenOf(def.id)) {
    if (child.fork && (s.upgrades[child.id] ?? 0) <= 0) continue
    const req = child.requires?.find((r) => r.id === def.id)
    if (!req || next < req.level || level >= req.level) continue
    const rest = child.requires!.every((r) => r.id === def.id || (s.upgrades[r.id] ?? 0) >= r.level)
    if (!rest || !isUpgradeVisible(s, child)) continue
    bonus += marginalValue(child, s.upgrades[child.id] ?? 0, ranks[child.tree] ?? 0, s, w) * 0.4
  }
  return bonus
}

function rankBuyable(s: GameState, def: UpgradeDef, tree: TreeId | 'all'): boolean {
  if (tree !== 'all' && def.tree !== tree) return false
  const lvl = s.upgrades[def.id] ?? 0
  if (def.fork && lvl <= 0) return false
  if (!isUpgradeVisible(s, def)) return false
  if (!requirementsMet(s, def)) return false
  if (forkBlockedBy(s, def)) return false
  if (lvl >= def.max || lvl >= upgradeRankCap(s, def.id)) return false
  return s.cash >= nextUpgradeCost(s, def.id)
}

function better(
  score: number,
  cost: number,
  id: string,
  best: { score: number; cost: number; id: string },
): boolean {
  if (score > best.score + 1e-12) return true
  if (Math.abs(score - best.score) > 1e-12) return false
  if (cost !== best.cost) return cost < best.cost
  return id < best.id
}

function pickUpgrade(s: GameState, tree: TreeId | 'all', ranks: Record<string, number>, w: Record<StatId, number>) {
  let best: { id: string; score: number; cost: number } | null = null
  for (const def of UPGRADES) {
    if (!rankBuyable(s, def, tree)) continue
    const lvl = s.upgrades[def.id] ?? 0
    const cost = nextUpgradeCost(s, def.id)
    const value = marginalValue(def, lvl, ranks[def.tree] ?? 0, s, w) + unlockBonus(def, lvl, s, ranks, w)
    const score = value / Math.max(1, cost)
    if (!best || better(score, cost, def.id, best)) best = { id: def.id, score, cost }
  }
  return best
}

function collapse(seq: string[]): SweepBuy[] {
  const out: SweepBuy[] = []
  for (const id of seq) {
    const last = out[out.length - 1]
    if (last && last.id === id) last.count += 1
    else out.push({ id, count: 1 })
  }
  return out
}

/** The rank Upgrade Best would buy first (same effect-per-cost sort), without cloning state. */
export function pickBestUpgrade(s: GameState, tree: TreeId | 'all' = 'all'): { id: string; cost: number } | null {
  const pick = pickUpgrade(s, tree, treeRankMap(s), statWeights(s))
  return pick ? { id: pick.id, cost: pick.cost } : null
}

/**
 * Greedy order: each next rank is the affordable one with the most effect per dollar.
 * Capstones you have not picked yet are left alone. Buying a prerequisite can come
 * ahead of a weaker rank when it opens a stronger node.
 */
export function planAffordableUpgrades(
  s: GameState,
  tree: TreeId | 'all' = 'all',
  limit = UPGRADE_SWEEP_LIMIT,
): SweepBuy[] {
  const draft = structuredClone(s)
  const ranks = treeRankMap(draft)
  const w = statWeights(draft)
  const seq: string[] = []
  for (let n = 0; n < limit; n++) {
    const pick = pickUpgrade(draft, tree, ranks, w)
    if (!pick) break
    const def = UPGRADES.find((u) => u.id === pick.id)
    draft.cash -= pick.cost
    draft.upgrades[pick.id] = (draft.upgrades[pick.id] ?? 0) + 1
    if (def) ranks[def.tree] = (ranks[def.tree] ?? 0) + 1
    seq.push(pick.id)
  }
  return collapse(seq)
}

export function hasAffordableUpgrade(s: GameState, tree: TreeId | 'all' = 'all'): boolean {
  for (const def of UPGRADES) {
    if (rankBuyable(s, def, tree)) return true
  }
  return false
}

export function planAffordableVentures(s: GameState, limit = VENTURE_SWEEP_LIMIT): SweepBuy[] {
  const levels: Record<string, number> = {}
  for (const def of VENTURES) {
    const lvl = s.ventures[def.id]?.level ?? 0
    if (lvl > 0) levels[def.id] = lvl
  }
  let cash = s.cash
  const seq: string[] = []
  for (let n = 0; n < limit; n++) {
    let best: { id: string; score: number; cost: number } | null = null
    for (const def of VENTURES) {
      const lvl = levels[def.id]
      if (!lvl || lvl >= def.maxLevel) continue
      const cost = ventureLevelCost(def, lvl)
      if (cash < cost) continue
      const gain = ventureIncome(def, lvl + 1) - ventureIncome(def, lvl)
      const score = gain / Math.max(1, cost)
      if (!best || better(score, cost, def.id, best)) best = { id: def.id, score, cost }
    }
    if (!best) break
    cash -= best.cost
    levels[best.id] = (levels[best.id] ?? 0) + 1
    seq.push(best.id)
  }
  return collapse(seq)
}

export function hasAffordableVenture(s: GameState): boolean {
  for (const def of VENTURES) {
    const lvl = s.ventures[def.id]?.level ?? 0
    if (lvl <= 0 || lvl >= def.maxLevel) continue
    if (s.cash >= ventureLevelCost(def, lvl)) return true
  }
  return false
}

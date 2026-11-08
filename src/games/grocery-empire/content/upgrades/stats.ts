import type { GameState } from '../../sim/state'

/**
 * 2.0 stat engine. Upgrades, Empire doctrines, rank rewards and projects all speak
 * the same language: "multiply stat X". One aggregator turns everything you own into
 * a multiplier per stat; formulas read `statMul(s, 'demand')` and never care where it
 * came from. That is what makes "everything does something" checkable.
 */
export const STAT_IDS = [
  'demand',
  'value',
  'margin',
  'unpack',
  'checkout',
  'shelf',
  'backroom',
  'network',
  'store',
  'district',
  'lane',
  'barge',
  'cold',
  'plantIncome',
  'harvest',
  'attention',
  'ideas',
  'xp',
  'wageCut',
  'spoilCut',
  'crateCut',
] as const
export type StatId = (typeof STAT_IDS)[number]

/** `cut` stats divide (never negative); `boost` stats multiply. */
export const STAT_INFO: Record<StatId, { label: string; kind: 'boost' | 'cut' }> = {
  demand: { label: 'shoppers', kind: 'boost' },
  value: { label: 'basket value', kind: 'boost' },
  margin: { label: 'register take', kind: 'boost' },
  unpack: { label: 'unpack speed', kind: 'boost' },
  checkout: { label: 'checkout speed', kind: 'boost' },
  shelf: { label: 'shelf space', kind: 'boost' },
  backroom: { label: 'backroom space', kind: 'boost' },
  network: { label: 'network income', kind: 'boost' },
  store: { label: 'chain store output', kind: 'boost' },
  district: { label: 'district strength', kind: 'boost' },
  lane: { label: 'lane strength', kind: 'boost' },
  barge: { label: 'barge strength', kind: 'boost' },
  cold: { label: 'cold-chain income', kind: 'boost' },
  plantIncome: { label: 'plant payouts', kind: 'boost' },
  harvest: { label: 'biomass harvest', kind: 'boost' },
  attention: { label: 'Attention', kind: 'boost' },
  ideas: { label: 'Ideas', kind: 'boost' },
  xp: { label: 'Empire XP', kind: 'boost' },
  wageCut: { label: 'wages', kind: 'cut' },
  spoilCut: { label: 'spoilage', kind: 'cut' },
  crateCut: { label: 'crate prices', kind: 'cut' },
}

export interface StatEffect {
  stat: StatId
  /** Added to the multiplier per effective rank: mul = 1 + per × rank. */
  per: number
}

/** Ranks at which a node's effect doubles (cumulative). */
export const MILESTONES = [10, 25] as const

export function milestoneMul(level: number): number {
  let m = 1
  for (const r of MILESTONES) if (level >= r) m *= 2
  return m
}

/** Effective ranks after milestone doubling. */
export function effectiveRank(level: number): number {
  return level * milestoneMul(level)
}

export function nextMilestone(level: number): number | null {
  for (const r of MILESTONES) if (level < r) return r
  return null
}

/** Every 50 ranks bought in a tree adds +10% to every effect in that tree. */
export const MASTERY = { ranksPerStep: 50, perStep: 0.1 }

export function masteryMul(treeRanks: number): number {
  return 1 + Math.floor(Math.max(0, treeRanks) / MASTERY.ranksPerStep) * MASTERY.perStep
}

/** One contribution to the stat table (a node, a perk, a reward, a project). */
export interface StatSource {
  effects: StatEffect[]
  /** Effective rank (milestones and mastery already applied). */
  rank: number
}

export type StatTable = Record<StatId, number>

export function emptyStats(): StatTable {
  return Object.fromEntries(STAT_IDS.map((k) => [k, 1])) as StatTable
}

/**
 * Combine sources. Bonuses to the SAME stat add up (1 + Σ per × rank); different
 * stats multiply each other in the formulas. That keeps 300 nodes from compounding
 * into nonsense while still making every rank count.
 */
export function foldStats(sources: StatSource[]): StatTable {
  const raw = Object.fromEntries(STAT_IDS.map((k) => [k, 0])) as StatTable
  for (const src of sources) {
    if (src.rank <= 0) continue
    for (const e of src.effects) raw[e.stat] += e.per * src.rank
  }
  const t = emptyStats()
  for (const k of STAT_IDS) t[k] = softCap(raw[k])
  return t
}

/** Soft cap: a +100% bonus is worth ×1.62, +1,000% ×5.4 — big stacks still grow, slower. */
export const STAT_SOFTCAP = 0.7

export function softCap(raw: number): number {
  return Math.pow(1 + Math.max(0, raw), STAT_SOFTCAP)
}

/** Human line for a node card: "+4% shoppers per rank". */
export function describeEffects(effects: StatEffect[]): string {
  return effects
    .map((e) => {
      const pct = Math.round(e.per * 1000) / 10
      const info = STAT_INFO[e.stat]
      return info.kind === 'cut' ? `−${pct}% ${info.label} per rank` : `+${pct}% ${info.label} per rank`
    })
    .join(' · ')
}

// The aggregator itself lives in sim/systems/stats.ts (it needs perks, rewards and projects).
export type { GameState }

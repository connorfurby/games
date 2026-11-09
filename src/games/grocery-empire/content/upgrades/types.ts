import type { GameState } from '../../sim/state'
import type { StatEffect } from './stats'

export const TREE_IDS = [
  'floor',
  'people',
  'supply',
  'brand',
  'automation',
  'capital',
  'lab',
  'fresh',
  'logistics',
  'space',
] as const
export type TreeId = (typeof TREE_IDS)[number]

export const TREES: Record<TreeId, { name: string; blurb: string; tint: 'accent' | 'success' | 'ink' }> = {
  floor: { name: 'Floor', blurb: 'Hands, shelves, and how much each shopper carries out.', tint: 'accent' },
  people: { name: 'People', blurb: 'Wages, morale, and how fast staff learn.', tint: 'success' },
  supply: { name: 'Supply', blurb: 'Cheaper crates, faster trucks, more room in back.', tint: 'ink' },
  brand: { name: 'Brand', blurb: 'Ads, loyalty, weather, and inspection goodwill.', tint: 'accent' },
  capital: { name: 'Capital', blurb: 'Interest, debt, and soft landings.', tint: 'ink' },
  automation: { name: 'Automation', blurb: 'Less clicking, same store.', tint: 'success' },
  lab: { name: 'Lab', blurb: 'Research that changes the rules: new stock, new tricks, bigger ideas.', tint: 'ink' },
  fresh: { name: 'Fresh', blurb: 'Cold chain, deli and bakery — freshness that compounds.', tint: 'success' },
  logistics: { name: 'Logistics', blurb: 'Districts, lanes and hubs that make the network hum.', tint: 'ink' },
  space: { name: 'Orbital', blurb: 'Barges, biomass and the long chart once the fleet is up.', tint: 'accent' },
}

export const BAND_IDS = [0, 1, 2, 3] as const
export type UpgradeBand = (typeof BAND_IDS)[number]
export type UpgradeScale = 'linear' | 'diminishing' | 'asymptotic' | 'breakpoint'

export const BAND_LABELS: Record<UpgradeBand, string> = {
  0: 'Counter',
  1: 'Aisle',
  2: 'Chain',
  3: 'Institution',
}

export interface UpgradeRequire {
  id: string
  level: number
}

export interface UpgradeDef {
  id: string
  tree: TreeId
  name: string
  /** Effect of one level, phrased for the next-level preview. */
  per: string
  blurb: string
  max: number
  base: number
  growth: number
  /** Layer on the tree board. Default 0 (Counter). */
  band?: UpgradeBand
  /** All must be met before the node is buyable. */
  requires?: UpgradeRequire[]
  /** Exclusive group — buying one locks siblings until Retraining. */
  fork?: string
  /** Layout slot within the band (0–4 columns, row down). */
  col?: number
  row?: number
  /** Magnitude curve. Default linear (raw ranks). */
  scale?: UpgradeScale
  /**
   * Curve ceiling / linear unit.
   * diminishing & asymptotic: magnitude approaches this.
   * linear: optional per-rank unit (raw level when omitted).
   * breakpoint: linear unit for the base ranks.
   */
  effectCap?: number
  /** Curve steepness. Defaults from UPGRADE_RANKS. */
  k?: number
  /** Ranks that flip a qualitative flag (breakpoint scale). */
  breakpoints?: number[]
  /** Empire perk that multiplies this node's magnitude (capped product). */
  synergy?: { perk: string; mul: number }
  /** 2.0 stat effects (milestones and tree mastery apply). */
  effects?: StatEffect[]
  /** Optional visibility gate. Hidden nodes never block a tree. */
  visible?: (s: GameState) => boolean
  /** Override band rank unlock for this node. */
  rankGate?: (s: GameState) => number
}

export const hasStaff = (s: GameState) => s.staff.length > 0
export const CATEGORY_COUNT = (s: GameState) => Object.values(s.categories).filter(Boolean).length

export function bandOf(def: UpgradeDef): UpgradeBand {
  return def.band ?? 0
}

export function scaleOf(def: UpgradeDef): UpgradeScale {
  return def.scale ?? 'linear'
}

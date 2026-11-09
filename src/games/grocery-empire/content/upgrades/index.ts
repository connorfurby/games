import { UPGRADE_RANKS } from '../../sim/balance'
import type { GameState } from '../../sim/state'
import { AUTOMATION_UPGRADES } from './automation'
import { BRAND_UPGRADES } from './brand'
import { CAPITAL_UPGRADES } from './capital'
import { FLOOR_UPGRADES } from './floor'
import { PEOPLE_UPGRADES } from './people'
import { SPACE_UPGRADES } from './space'
import { SUPPLY_UPGRADES } from './supply'
import { V2_UPGRADES } from './v2'
import {
  BAND_IDS,
  BAND_LABELS,
  TREE_IDS,
  TREES,
  bandOf,
  scaleOf,
  type TreeId,
  type UpgradeBand,
  type UpgradeDef,
  type UpgradeScale,
} from './types'

export {
  BAND_IDS,
  BAND_LABELS,
  TREE_IDS,
  TREES,
  bandOf,
  scaleOf,
  type TreeId,
  type UpgradeBand,
  type UpgradeDef,
  type UpgradeScale,
}
export type { UpgradeRequire } from './types'

export const UPGRADES: UpgradeDef[] = [
  ...FLOOR_UPGRADES,
  ...PEOPLE_UPGRADES,
  ...SUPPLY_UPGRADES,
  ...BRAND_UPGRADES,
  ...CAPITAL_UPGRADES,
  ...AUTOMATION_UPGRADES,
  ...SPACE_UPGRADES,
  ...V2_UPGRADES,
]

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
)

export const TEACHING_UPGRADES = new Set(['quick-hands', 'hold-unpack', 'price-iq'])

/** Geometric cost of a single rank (before layer toll). */
export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.ceil(def.base * Math.pow(def.growth, level))
}

/** Layer toll applies to the first purchase (level 0 → 1) of band > 0 nodes. */
export function upgradeCostWithToll(def: UpgradeDef, level: number): number {
  const raw = upgradeCost(def, level)
  if (level === 0 && bandOf(def) > 0) return Math.ceil(raw * UPGRADE_RANKS.layerToll)
  return raw
}

/** Raw curve magnitude at a given level (no synergy). */
export function upgradeCurveAt(def: UpgradeDef, level: number): number {
  if (level <= 0) return 0
  const scale = scaleOf(def)
  const k = def.k ?? (scale === 'asymptotic' ? UPGRADE_RANKS.asymptoteK : UPGRADE_RANKS.diminishK)
  const cap = def.effectCap
  switch (scale) {
    case 'diminishing': {
      const c = cap ?? 1
      return c * (1 - 1 / (1 + level * k))
    }
    case 'asymptotic': {
      const c = cap ?? 1
      return c * (1 - Math.exp(-k * level))
    }
    case 'breakpoint':
      return (cap ?? 1) * level
    case 'linear':
    default:
      return cap != null ? cap * level : level
  }
}

/** Synergy product for a node: each doctrine point multiplies by mul, capped. */
export function upgradeSynergy(s: GameState, def: UpgradeDef): number {
  if (!def.synergy) return 1
  const pts = s.empire.perks[def.synergy.perk] ?? 0
  if (pts <= 0) return 1
  return Math.min(UPGRADE_RANKS.synergyCap, Math.pow(def.synergy.mul, pts))
}

/**
 * The one way systems read an upgrade's strength: curve(level) × synergy.
 * Cycle-safe (no formulas import), so sim/systems can call it directly.
 */
export function upgradeEffect(s: GameState, id: string): number {
  const def = UPGRADE_BY_ID[id]
  if (!def) return 0
  const lvl = s.upgrades[id] ?? 0
  if (lvl <= 0) return 0
  return upgradeCurveAt(def, lvl) * upgradeSynergy(s, def)
}

/** True when a listed breakpoint rank has been reached. */
export function upgradeBreakpointHit(def: UpgradeDef, level: number, mark: number): boolean {
  if (scaleOf(def) !== 'breakpoint') return level >= mark
  return (def.breakpoints ?? []).includes(mark) ? level >= mark : level >= mark
}

export function upgradeHasBreakpoint(def: UpgradeDef, level: number): number | null {
  if (!def.breakpoints?.length) return null
  let hit: number | null = null
  for (const b of def.breakpoints) {
    if (level >= b) hit = b
  }
  return hit
}

export function nextBreakpoint(def: UpgradeDef, level: number): number | null {
  if (!def.breakpoints?.length) return null
  for (const b of def.breakpoints) {
    if (level < b) return b
  }
  return null
}

/** How many ranks Empire currently unlocks for this node (before def.max). */
export function bandRankUnlocked(s: GameState, def: UpgradeDef): number {
  if (def.rankGate) return def.rankGate(s)
  if (TEACHING_UPGRADES.has(def.id)) return def.max
  const band = bandOf(def)
  const lv = s.empire.level
  if (band === 0) {
    return UPGRADE_RANKS.baseUnlocked + Math.floor(lv / 2) * UPGRADE_RANKS.perTwoEmpireLevels
  }
  if (band === 1) {
    if (lv < UPGRADE_RANKS.bands[1].empireOpen) return 0
    return 4 + Math.max(0, lv - 4)
  }
  if (band === 2) {
    if (lv < UPGRADE_RANKS.bands[2].empireOpen) return 0
    return 1 + Math.floor((lv - 8) / 2)
  }
  // band 3
  if (lv < UPGRADE_RANKS.bands[3].empireOpen) return 0
  return 1 + Math.floor((lv - 16) / 3)
}

export function requirementsMet(s: GameState, def: UpgradeDef): boolean {
  if (!def.requires?.length) return true
  return def.requires.every((r) => (s.upgrades[r.id] ?? 0) >= r.level)
}

/** Sibling in the same fork that already has ranks. */
export function forkBlockedBy(s: GameState, def: UpgradeDef): UpgradeDef | null {
  if (!def.fork) return null
  for (const other of UPGRADES) {
    if (other.id === def.id) continue
    if (other.fork !== def.fork) continue
    if ((s.upgrades[other.id] ?? 0) > 0) return other
  }
  return null
}

export function isUpgradeVisible(s: GameState, def: UpgradeDef): boolean {
  if (!def.visible) return true
  try {
    return !!def.visible(s)
  } catch {
    return false
  }
}

/**
 * Shown as a silhouette when any parent is visible (or the node itself is),
 * even if requires / era gate are not fully open.
 */
export function isUpgradeSilhouette(s: GameState, def: UpgradeDef): boolean {
  if (isUpgradeVisible(s, def)) return true
  if (!def.requires?.length) return false
  return def.requires.some((r) => {
    const parent = UPGRADE_BY_ID[r.id]
    return parent ? isUpgradeVisible(s, parent) || (s.upgrades[r.id] ?? 0) > 0 : false
  })
}

export function childrenOf(id: string): UpgradeDef[] {
  return UPGRADES.filter((u) => u.requires?.some((r) => r.id === id))
}

export function empireLevelForNextBandRank(s: GameState, def: UpgradeDef): number | null {
  const unlocked = bandRankUnlocked(s, def)
  if (unlocked >= def.max) return null
  const band = bandOf(def)
  if (TEACHING_UPGRADES.has(def.id)) return null
  if (band === 0) return (Math.floor(s.empire.level / 2) + 1) * 2
  if (band === 1) {
    if (s.empire.level < 4) return 4
    return s.empire.level + 1
  }
  if (band === 2) {
    if (s.empire.level < 8) return 8
    // band opens with 1 rank at 8; one more every 2 levels
    return 8 + unlocked * 2
  }
  if (s.empire.level < 16) return 16
  return 16 + unlocked * 3
}

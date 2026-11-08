import { EMPIRE_REWARDS } from '../../content/empireRewards'
import { WING_BY_ID, type WingId } from '../../content/relics'
import { RELIC_DEMAND_PER } from '../balance'
import { PERKS } from '../../content/perks'
import { PROJECTS } from '../../content/projects'
import { UPGRADES } from '../../content/upgrades'
import {
  effectiveRank,
  foldStats,
  masteryMul,
  type StatId,
  type StatSource,
  type StatTable,
} from '../../content/upgrades/stats'
import { REBRAND } from '../balance'
import type { GameState } from '../state'

/**
 * The stat table for a state: every upgrade node, Empire doctrine, rank reward and
 * finished project folded into one multiplier per stat. Cached per state until
 * something you own changes.
 */
const cache = new WeakMap<GameState, { sig: string; table: StatTable }>()

function signature(s: GameState): string {
  let up = 0
  for (const v of Object.values(s.upgrades)) up = up * 31 + (v ?? 0)
  let pk = 0
  for (const v of Object.values(s.empire.perks)) pk = pk * 31 + (v ?? 0)
  const pj = Object.keys(s.projects?.done ?? {}).length
  return `${s.stats.upgradesBought}|${up}|${pk}|${s.empire.level}|${pj}|${s.compute.retrains}|${s.compute.perkRespecs}|${s.rebrand?.goodwill ?? 0}|${s.relics?.count ?? 0}|${s.relics?.wings?.length ?? 0}`
}

export function treeRanks(s: GameState): Record<string, number> {
  const out: Record<string, number> = {}
  for (const u of UPGRADES) {
    const lvl = s.upgrades[u.id] ?? 0
    if (lvl > 0) out[u.tree] = (out[u.tree] ?? 0) + lvl
  }
  return out
}

export function statSources(s: GameState): StatSource[] {
  const sources: StatSource[] = []
  const ranks = treeRanks(s)
  for (const u of UPGRADES) {
    if (!u.effects?.length) continue
    const lvl = s.upgrades[u.id] ?? 0
    if (lvl <= 0) continue
    sources.push({ effects: u.effects, rank: effectiveRank(lvl) * masteryMul(ranks[u.tree] ?? 0) })
  }
  for (const p of PERKS) {
    if (!p.effects?.length) continue
    const lvl = s.empire.perks[p.id] ?? 0
    if (lvl > 0) sources.push({ effects: p.effects, rank: lvl })
  }
  for (const r of EMPIRE_REWARDS) {
    if (s.empire.level >= r.level && r.effects?.length) sources.push({ effects: r.effects, rank: 1 })
  }
  const gw = s.rebrand?.goodwill ?? 0
  if (gw > 0) {
    sources.push({
      effects: [
        { stat: 'value', per: REBRAND.valuePerGoodwill },
        { stat: 'demand', per: REBRAND.demandPerGoodwill },
      ],
      rank: gw,
    })
  }
  // Relic Museum: each finished wing, plus a little per relic on the wall.
  for (const w of s.relics?.wings ?? []) {
    const def = WING_BY_ID[w as WingId]
    if (def) sources.push({ effects: [{ stat: def.bonus.stat, per: def.bonus.per }], rank: 1 })
  }
  if ((s.relics?.count ?? 0) > 0) {
    sources.push({ effects: [{ stat: 'demand', per: RELIC_DEMAND_PER }], rank: s.relics.count })
  }
  for (const pj of PROJECTS) {
    if (s.projects?.done?.[pj.id]) sources.push({ effects: pj.effects, rank: 1 })
  }
  return sources
}

export function statTable(s: GameState): StatTable {
  const sig = signature(s)
  const hit = cache.get(s)
  if (hit && hit.sig === sig) return hit.table
  const table = foldStats(statSources(s))
  cache.set(s, { sig, table })
  return table
}

/** Multiplier for a boost stat (≥ 1). */
export function statMul(s: GameState, stat: StatId): number {
  return statTable(s)[stat] ?? 1
}

/** Divisor for a cut stat: costs × statCut(s, 'crateCut'). Always in (0, 1]. */
export function statCut(s: GameState, stat: StatId): number {
  return 1 / Math.max(1, statTable(s)[stat] ?? 1)
}

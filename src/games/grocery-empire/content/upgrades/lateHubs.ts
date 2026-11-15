import type { GameState } from '../../sim/state'
import { describeEffects, type StatEffect, type StatId } from './stats'
import type { TreeId, UpgradeBand, UpgradeDef } from './types'
import { BAND_MUL, ERA_BASE, eraEffectScale } from './v2'

/**
 * Late hubs (Era 7–12) inside the ten original trees. Worlds do not get their own
 * screen for these: they are the floor, people, supply, brand, automation, capital,
 * lab, fresh, logistics and orbital trees growing a late row.
 *
 * `LateVerb` nodes are read with `upgradeEffect` in `sim/systems/lateHubs.ts`.
 * `LateStat` nodes multiply a stat (the stat engine reads them).
 */

const GROWTH = 1.34
const STAT_MAX = 12
/** Late rows sit below the 2.0 rows (10+) in each tree. */
const ROW0 = 20

function bandForEra(era: number): UpgradeBand {
  if (era <= 7) return 0
  if (era === 8) return 1
  if (era === 9) return 2
  return 3
}

function price(era: number, band: UpgradeBand, i: number): number {
  const base = ERA_BASE[Math.min(era, ERA_BASE.length - 1)] ?? ERA_BASE[ERA_BASE.length - 1]!
  return Math.round(base * BAND_MUL[band] * (1 + (i % 4) * 0.35))
}

type LateVerb = [
  tree: TreeId,
  id: string,
  name: string,
  blurb: string,
  per: string,
  /** Effect per rank (the node's `effectCap` on a linear curve). */
  unit: number,
  max: number,
  era: number,
]

const VERBS: LateVerb[] = [
  ['floor', 'lh-endcap-orbit', 'Orbital Endcap', 'An endcap for the off-world bay. Imported goods catch the eye.', '+3% off-world sales per rank.', 0.03, 5, 7],
  ['people', 'lh-council-clerk', 'Council Clerk', 'A clerk keeps one more Council seat in good standing.', '+1 paying Council seat per rank.', 1, 4, 8],
  ['supply', 'lh-bonded-rack', 'Bonded Rack', 'Another rack in the cage for sealed crates.', '+2 bonded crate capacity per rank.', 2, 5, 8],
  ['supply', 'lh-bonded-ledger', 'Bonded Ledger', 'Filed circuits drop crates in the cage a little sooner.', '+5% bonded crate trickle per rank.', 0.05, 5, 8],
  ['supply', 'lh-vault-lock', 'Vault Lock', 'A second lock, a deeper shelf, a wider door.', '+6 seed vault capacity per rank.', 6, 5, 9],
  ['brand', 'lh-franchise-sign', 'Franchise Sign', 'The name goes up over an outpost door.', '+6% planet franchise layer per rank.', 0.06, 5, 7],
  ['automation', 'lh-queue-clerk', 'Queue Clerk', 'The build queue buys sooner and leaves less in reserve.', '−10% queue cash reserve per rank.', 0.1, 4, 7],
  ['capital', 'lh-bond-desk', 'Bond Desk', 'A desk that knows the coupon on every world.', '+8% instrument yield per rank.', 0.08, 5, 8],
  ['capital', 'lh-futures-book', 'Futures Book', 'Buy the next lot before the price moves.', '−4% instrument lot price per rank.', 0.04, 5, 9],
  ['lab', 'lh-survey-labs', 'Survey Labs', 'Instruments of your own, bolted to the survey desk.', '+0.004 survey per second per rank.', 0.004, 5, 7],
  ['fresh', 'lh-cryo-seal', 'Cryo Seal', 'A better gasket on the vault door.', '−10% seed decay per rank.', 0.1, 4, 9],
  ['logistics', 'lh-jump-tuning', 'Jump Tuning', 'The same fuel, a longer haul.', '+6% jump freight per rank.', 0.06, 5, 8],
  ['space', 'lh-orbital-mail', 'Orbital Mail', 'Barges carry the mail. The mail carries freight.', '+10% barge freight per rank.', 0.1, 5, 8],
]

type LateStat = [
  tree: TreeId,
  id: string,
  name: string,
  blurb: string,
  stat: StatId,
  per: number,
  era: number,
  max?: number,
]

const STATS: LateStat[] = [
  ['floor', 'lh-fl-orbital-facing', 'Orbital Facing', 'The planet shelf is faced and dusted every night.', 'shelf', 0.08, 7],
  ['floor', 'lh-fl-survey-glass', 'Survey Glass', 'A case by the door shows what the probes found.', 'planet', 0.1, 8],
  ['floor', 'lh-fl-season-window', 'Season Window', 'The window changes with the turn of the year.', 'value', 0.06, 9],

  ['people', 'lh-pp-offworld-hands', 'Off-World Hands', 'Crew trained on crates that came a long way.', 'unpack', 0.08, 7],
  ['people', 'lh-pp-agent-brief', 'Agent Brief', 'A one-page brief, read twice.', 'signal', 0.1, 10],
  ['people', 'lh-pp-embassy-hosts', 'Embassy Hosts', 'Tea, a seat, and a seal on the way out.', 'seal', 0.1, 11],

  ['supply', 'lh-su-planet-contracts', 'Planet Contracts', 'Worlds sign for a year at a time.', 'crateCut', 0.06, 7],
  ['supply', 'lh-su-convoy-terms', 'Convoy Terms', 'Standing terms on every circuit.', 'freight', 0.1, 8],
  ['supply', 'lh-su-seed-tithe', 'Seed Tithe', 'A tenth of the harvest goes in the vault.', 'seed', 0.1, 9],

  ['brand', 'lh-br-world-ads', 'World Ads', 'Billboards in the sky above eight worlds.', 'demand', 0.06, 7],
  ['brand', 'lh-br-embassy-crest', 'Embassy Crest', 'The crest on every can.', 'value', 0.06, 11],
  ['brand', 'lh-br-ivo-bill', 'Ivo’s Bill', 'The list, printed. The basket, finished.', 'network', 0.06, 12],

  ['automation', 'lh-au-relay-bots', 'Relay Bots', 'The mast keeps its own hours.', 'signal', 0.1, 10],
  ['automation', 'lh-au-auto-bayer', 'Auto-Bayer', 'Bays fill themselves at the standard.', 'freight', 0.08, 8],
  ['automation', 'lh-au-night-ledger', 'Night Ledger', 'The ledger balances while the store sleeps.', 'attention', 0.08, 9],

  ['capital', 'lh-ca-council-seal', 'Council Seal', 'A seal on every seat. Treasury remembers.', 'seal', 0.08, 11],
  ['capital', 'lh-ca-hedged-books', 'Hedged Books', 'Every position has a quiet opposite.', 'margin', 0.05, 9],
  ['capital', 'lh-ca-coupon-ladder', 'Coupon Ladder', 'A rung per season, paid in cans.', 'value', 0.05, 10],

  ['lab', 'lh-lb-trait-lab', 'Trait Lab', 'Crosses on paper before crosses in soil.', 'seed', 0.1, 9],
  ['lab', 'lh-lb-phrase-lab', 'Phrase Lab', 'Four marks, tested under glass.', 'signal', 0.1, 10],
  ['lab', 'lh-lb-clause-lab', 'Clause Lab', 'Charters, drafted and redrafted.', 'seal', 0.08, 11],
  ['lab', 'lh-lb-ivo-ink', 'Ivo’s Ink', 'The ink dries faster than the argument.', 'xp', 0.08, 12],

  ['fresh', 'lh-fr-cold-ledger', 'Cold Ledger', 'Every degree, written down and sold.', 'cold', 0.1, 8],
  ['fresh', 'lh-fr-ark-lamps', 'Ark Lamps', 'Low light for slow things.', 'spoilCut', 0.08, 9],
  ['fresh', 'lh-fr-greenhouse-chill', 'Greenhouse Chill', 'A cold plant under glass pays twice.', 'plantIncome', 0.08, 9],

  ['logistics', 'lh-lg-lane-charts', 'Lane Charts', 'Charts of lanes the ocean forgot.', 'lane', 0.08, 8],
  ['logistics', 'lh-lg-gantry-crews', 'Gantry Crews', 'Night crews on the convoy gantry.', 'freight', 0.1, 9],
  ['logistics', 'lh-lg-district-bus', 'District Bus', 'Districts share a bus, and a schedule.', 'district', 0.08, 10],

  ['space', 'lh-sp-barge-rigs', 'Barge Rigs', 'Better rigs for longer hauls.', 'barge', 0.08, 8],
  ['space', 'lh-sp-survey-sails', 'Survey Sails', 'Sails that catch what the probes drop.', 'planet', 0.1, 9],
  ['space', 'lh-sp-harvest-relays', 'Harvest Relays', 'Relay buoys on the biomass lanes.', 'harvest', 0.08, 10],
  ['space', 'lh-sp-star-lobby', 'Star Lobby', 'The lobby is in orbit. So is the vote.', 'network', 0.06, 12],
]

function verbNode(row: LateVerb, index: number): UpgradeDef {
  const [tree, id, name, blurb, per, unit, max, era] = row
  const band = bandForEra(era)
  return {
    id,
    tree,
    name,
    per,
    blurb,
    max,
    base: price(era, band, index),
    growth: GROWTH,
    band,
    col: index % 5,
    row: ROW0 + Math.floor(index / 5),
    scale: 'linear',
    effectCap: unit,
    visible: (s: GameState) => s.era >= era,
  }
}

function statNode(row: LateStat, index: number): UpgradeDef {
  const [tree, id, name, blurb, stat, per, era, max] = row
  const band = bandForEra(era)
  const effects: StatEffect[] = [{ stat, per: Math.round(per * eraEffectScale(era) * 10000) / 10000 }]
  return {
    id,
    tree,
    name,
    per: describeEffects(effects),
    blurb,
    max: max ?? STAT_MAX,
    base: price(era, band, index),
    growth: GROWTH,
    band,
    col: index % 5,
    row: ROW0 + Math.floor(index / 5),
    effects,
    visible: (s: GameState) => s.era >= era,
  }
}

/** Index nodes per tree so each tree's late row lays out from column 0. */
function byTree<T extends [TreeId, ...unknown[]]>(rows: T[], start: Partial<Record<TreeId, number>>): [T, number][] {
  const seen: Partial<Record<TreeId, number>> = { ...start }
  return rows.map((r) => {
    const i = seen[r[0]] ?? 0
    seen[r[0]] = i + 1
    return [r, i]
  })
}

const verbIndex = byTree(VERBS, {})
const verbCount: Partial<Record<TreeId, number>> = {}
for (const [r] of verbIndex) verbCount[r[0]] = (verbCount[r[0]] ?? 0) + 1

export const LATE_HUB_UPGRADES: UpgradeDef[] = [
  ...verbIndex.map(([r, i]) => verbNode(r, i)),
  ...byTree(STATS, verbCount).map(([r, i]) => statNode(r, i)),
]

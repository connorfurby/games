import { HORIZON, LATE } from '../../sim/balance'
import type { GameState } from '../../sim/state'
import { describeEffects, type StatEffect, type StatId } from './stats'
import type { TreeId, UpgradeBand, UpgradeDef, UpgradeRequire } from './types'
import { BAND_MUL, ERA_BASE, eraEffectScale } from './v2'

/**
 * Rows 4–6 of the four Horizon trees (pantry, exchange, cultivar, signal) and the
 * deep orbital rows (21+) of the classic space tree.
 *
 * Verb nodes are read with `upgradeEffect` (horizon.ts, lateHubs.ts, late.ts, fleet.ts);
 * their per-rank strengths live in `HORIZON` / `LATE` in sim/balance.ts and feed the
 * linear curve unit here. Stat nodes multiply a stat through
 * the stat engine. Every node hangs off a parent through `requires`.
 */

const GROWTH = 1.36
const STAT_MAX = 12

function bandForEra(era: number): UpgradeBand {
  if (era <= 7) return 0
  if (era === 8) return 1
  if (era === 9) return 2
  return 3
}

function price(era: number, band: UpgradeBand, i: number): number {
  const base = ERA_BASE[Math.min(era, ERA_BASE.length - 1)] ?? ERA_BASE[ERA_BASE.length - 1]!
  // Deep rows sit above the first four rows, so price them a touch higher.
  return Math.round(base * BAND_MUL[band] * 1.6 * (1 + (i % 4) * 0.35))
}

interface Slot {
  row: number
  col: number
  era: number
  requires: UpgradeRequire[]
}

type VerbSpec = Slot & {
  kind: 'verb'
  id: string
  name: string
  blurb: string
  per: string
  unit: number
  max: number
}

type StatSpec = Slot & {
  kind: 'stat'
  id: string
  name: string
  blurb: string
  stat: StatId
  stepPer: number
  max?: number
}

type Spec = VerbSpec | StatSpec

const req = (id: string, level: number): UpgradeRequire => ({ id, level })

function build(tree: TreeId, specs: Spec[]): UpgradeDef[] {
  return specs.map((spec, i) => {
    const band = bandForEra(spec.era)
    const common = {
      id: spec.id,
      tree,
      name: spec.name,
      blurb: spec.blurb,
      growth: GROWTH,
      band,
      col: spec.col,
      row: spec.row,
      requires: spec.requires,
      visible: (s: GameState) => s.era >= spec.era,
    }
    if (spec.kind === 'verb') {
      return {
        ...common,
        per: spec.per,
        max: spec.max,
        base: price(spec.era, band, i),
        scale: 'linear',
        effectCap: spec.unit,
      } satisfies UpgradeDef
    }
    const effects: StatEffect[] = [
      { stat: spec.stat, per: Math.round(spec.stepPer * eraEffectScale(spec.era) * 10000) / 10000 },
    ]
    return {
      ...common,
      per: describeEffects(effects),
      max: spec.max ?? STAT_MAX,
      base: price(spec.era, band, i),
      effects,
    } satisfies UpgradeDef
  })
}

const verb = (
  row: number,
  col: number,
  era: number,
  requires: UpgradeRequire[],
  id: string,
  name: string,
  blurb: string,
  per: string,
  unit: number,
  max: number,
): VerbSpec => ({ kind: 'verb', row, col, era, requires, id, name, blurb, per, unit, max })

const stat = (
  row: number,
  col: number,
  era: number,
  requires: UpgradeRequire[],
  id: string,
  name: string,
  blurb: string,
  statId: StatId,
  stepPer: number,
  max?: number,
): StatSpec => ({ kind: 'stat', row, col, era, requires, id, name, blurb, stat: statId, stepPer, max })

// ── Pantry ──────────────────────────────────────────────────────────────────
const PANTRY_DEEP: Spec[] = [
  // Row 4
  verb(4, 0, 7, [req('pan-survey', 3)], 'pan-wide-pin', 'Wide Pin', 'A wider pin on the map, a fuller survey note each hour.', '+10% survey trickle per rank.', HORIZON.widePinSurveyPerRank, 5),
  verb(4, 1, 7, [req('local-chalk', 2)], 'pan-fine-chalk', 'Fine Chalk', 'The chalk gets finer. A local price reads a little louder.', '+1% on a planet with a local price, per rank.', HORIZON.fineChalkPerRank, 5),
  verb(4, 2, 7, [req('pan-probe', 3)], 'pan-probe-credit', 'Probe Credit', 'The yard extends credit on the next probe.', '−3% probe cost per rank.', HORIZON.probeCreditPerRank, 5),
  stat(4, 3, 8, [req('pan-cluster', 3)], 'pan-atlas', 'Pantry Atlas', 'The cluster, drawn to scale.', 'network', 0.1),
  stat(4, 4, 8, [req('pan-pin', 3)], 'pan-lamp', 'Window Lamp', 'The flagship window stays lit for the long shift.', 'demand', 0.08),
  // Row 5
  stat(5, 0, 8, [req('pan-wide-pin', 2)], 'pan-ledger-two', 'Second Ledger', 'A second page for every world on the shelf.', 'planet', 0.14),
  stat(5, 1, 9, [req('pan-fine-chalk', 2)], 'pan-fair-tag', 'Fair Tag', 'A price tag the shopper believes.', 'value', 0.08),
  stat(5, 2, 9, [req('pan-probe-credit', 2)], 'pan-idea-box', 'Idea Box', 'Surveyors drop a note on the way out.', 'ideas', 0.08),
  stat(5, 3, 9, [req('pan-atlas', 2)], 'pan-deep-shelf', 'Deep Shelf', 'The back shelf of the atlas, reachable at last.', 'shelf', 0.08),
  // Row 6
  stat(6, 2, 10, [req('pan-capstone', 3), req('pan-ledger-two', 3), req('pan-fair-tag', 3)], 'pan-atlas-capstone', 'Atlas Capstone', 'Every world on the shelf, named twice.', 'planet', 0.24, 6),
]

// ── Exchange ────────────────────────────────────────────────────────────────
const EXCHANGE_DEEP: Spec[] = [
  verb(4, 0, 8, [req('ex-arc', 3)], 'ex-bay-liner', 'Bay Liner', 'A liner in every bay. The route earns a little more.', '+4% route layer per rank.', HORIZON.bayLinerPerRank, 5),
  verb(4, 1, 8, [req('standing-circuit', 1), req('ex-stop', 2)], 'ex-pin-file', 'Pin File', 'The pinned route is refiled faster.', '−4% deputy wait per rank.', HORIZON.pinFileCutPerRank, 5),
  verb(4, 2, 8, [req('ex-freight', 3)], 'ex-freight-clerk', 'Freight Clerk', 'A clerk who counts crates twice and files once.', '+6% freight trickle per rank.', HORIZON.freightClerkPerRank, 5),
  stat(4, 3, 8, [req('ex-lane', 3)], 'ex-open-water', 'Open Water', 'The old lanes get a deeper channel.', 'lane', 0.08),
  stat(4, 4, 9, [req('ex-truce', 3)], 'ex-long-truce', 'Long Truce', 'Keel stays on his side of the dock.', 'rivalCut', 0.1),
  stat(5, 0, 9, [req('ex-bay-liner', 2)], 'ex-seal-two', 'Second Seal', 'A second seal, and no second look.', 'freight', 0.14),
  stat(5, 1, 9, [req('ex-pin-file', 2)], 'ex-night-desk', 'Night Desk', 'The desk runs a second shift at half the wage.', 'wageCut', 0.08),
  stat(5, 2, 9, [req('ex-freight-clerk', 2)], 'ex-clean-run', 'Clean Run', 'Fewer detours, a slightly better till.', 'margin', 0.06),
  stat(5, 3, 10, [req('ex-open-water', 2)], 'ex-barge-slot', 'Barge Slot', 'A barge slot on the long board.', 'barge', 0.08),
  stat(6, 2, 10, [req('ex-capstone', 3), req('ex-seal-two', 3), req('ex-clean-run', 3)], 'ex-floor-capstone', 'Floor Capstone', 'The floor, the dock, and the long board.', 'freight', 0.24, 6),
]

// ── Cultivar ────────────────────────────────────────────────────────────────
const CULTIVAR_DEEP: Spec[] = [
  verb(4, 0, 9, [req('season-bell', 1), req('cu-bell', 2)], 'cu-long-bell', 'Long Bell', 'A longer rope on the bell. The forecast rings earlier.', '+15s forecast lead per rank.', HORIZON.longBellSecPerRank, 4),
  verb(4, 1, 9, [req('cu-bed', 3)], 'cu-bed-hand', 'Bed Hand', 'A second pair of hands in the beds.', '+8% seed trickle per rank.', HORIZON.bedHandSeedPerRank, 5),
  verb(4, 2, 9, [req('intense-bed', 1), req('cu-sweet', 2)], 'cu-cross-sheet', 'Cross Sheet', 'A page of crosses that worked. Intense traits count for more.', '+20% intense trait bonus per rank.', HORIZON.crossSheetPerRank, 3),
  stat(4, 3, 9, [req('cu-pretty', 3)], 'cu-bright-bed', 'Bright Bed', 'A bright bed pulls a bigger crowd.', 'demand', 0.08),
  stat(4, 4, 10, [req('cu-sturdy', 3)], 'cu-cold-frame', 'Cold Frame', 'Frost stays outside the frame.', 'spoilCut', 0.1),
  stat(5, 0, 10, [req('cu-long-bell', 2)], 'cu-yearbook', 'Yearbook', 'The year, written down for next year.', 'ideas', 0.08),
  stat(5, 1, 10, [req('cu-bed-hand', 2)], 'cu-bumper', 'Bumper Crop', 'A bumper year, bagged and counted.', 'seed', 0.14),
  stat(5, 2, 10, [req('cu-cross-sheet', 2)], 'cu-heirloom', 'Heirloom Basket', 'The heirloom goes in the basket.', 'value', 0.08),
  stat(5, 3, 10, [req('cu-lasting', 3)], 'cu-glasshouse', 'Glasshouse Rack', 'A rack that keeps a whole season fresh.', 'shelf', 0.08),
  stat(6, 2, 11, [req('cu-capstone', 3), req('cu-bumper', 3), req('cu-heirloom', 3)], 'cu-year-capstone', 'Year Capstone', 'Two full years, finished.', 'seed', 0.24, 6),
]

// ── Signal ──────────────────────────────────────────────────────────────────
const SIGNAL_DEEP: Spec[] = [
  verb(4, 0, 10, [req('sg-reel', 3)], 'sg-quick-reel', 'Quick Reel', 'The reel turns faster. The next phrase arrives sooner.', '−4% phrase wait per rank.', HORIZON.quickReelCutPerRank, 5),
  verb(4, 1, 10, [req('handler-desk', 1), req('sg-agent', 2)], 'sg-brisk-desk', 'Brisk Desk', 'Handlers answer the bell before the second ring.', '−5% agent wait per rank.', HORIZON.briskDeskCutPerRank, 5),
  verb(4, 2, 10, [req('sg-relay', 3)], 'sg-mast-tune', 'Mast Tune', 'A tuner on the mast. The relay carries a little more.', '+6% relay signal per rank.', HORIZON.mastTunePerRank, 5),
  stat(4, 3, 11, [req('sg-habit', 3)], 'sg-habit-two', 'Second Habit', 'Habits that settle faster.', 'signal', 0.12),
  stat(4, 4, 11, [req('sg-night', 3)], 'sg-dark-band', 'Dark Band', 'A quiet band for the late shoppers.', 'demand', 0.08),
  stat(5, 0, 11, [req('sg-quick-reel', 2)], 'sg-deep-reel', 'Deep Reel', 'The reel keeps a deeper spool.', 'signal', 0.14),
  stat(5, 1, 11, [req('sg-brisk-desk', 2)], 'sg-desk-pay', 'Desk Pay Scale', 'A fair scale for the desk. Nobody leaves early.', 'wageCut', 0.08),
  stat(5, 2, 12, [req('sg-mast-tune', 2)], 'sg-clear-line', 'Clear Line', 'The seal on the line, kept clean.', 'seal', 0.08),
  stat(5, 3, 12, [req('sg-handler', 3)], 'sg-listener-ink', 'Listener’s Ink', 'The listener signs the margin.', 'ideas', 0.08),
  stat(6, 2, 12, [req('sg-capstone', 3), req('sg-deep-reel', 3), req('sg-clear-line', 3)], 'sg-wire-capstone', 'Wire Capstone', 'The wire, the reel and the line, finished.', 'signal', 0.24, 6),
]

// ── Orbital (classic space tree, deep rows) ─────────────────────────────────
const SPACE_DEEP: Spec[] = [
  verb(21, 0, 8, [req('lh-orbital-mail', 1)], 'sp-jump-skid', 'Jump Skid', 'A skid under the jump cradle. The same lane burns a little longer.', '+1 fuel burned per jump, per rank.', LATE.jumpSkidBurnPerRank, 5),
  verb(21, 1, 8, [req('lh-orbital-mail', 2)], 'sp-barge-hold', 'Barge Hold', 'A second hold in every barge, just for crates.', '+8% barge freight per rank.', LATE.bargeHoldPerRank, 5),
  verb(21, 2, 8, [req('lh-sp-barge-rigs', 2)], 'sp-hull-yard', 'Hull Yard', 'A yard that keeps the fleet harvesting between wars.', '+4% biomass harvest per barge, per rank.', LATE.hullYardHarvestPerRank, 5),
  verb(22, 0, 9, [req('lh-sp-survey-sails', 2)], 'sp-franchise-deed', 'Franchise Deed', 'The deed hangs on the wall of every outpost.', '+5% planet franchise layer per rank.', LATE.franchiseDeedPerRank, 5),
  stat(22, 1, 8, [req('sp-jump-skid', 2)], 'sp-lane-ledger', 'Lane Ledger', 'Every jump, entered in the lane book.', 'lane', 0.08),
  stat(22, 2, 9, [req('sp-barge-hold', 2)], 'sp-barge-crew', 'Barge Crew', 'A crew that knows the hold by heart.', 'barge', 0.08),
  stat(23, 0, 10, [req('sp-franchise-deed', 2)], 'sp-outpost-lease', 'Outpost Lease', 'Long leases, steady shelves.', 'planet', 0.1),
  stat(23, 1, 12, [req('lh-sp-star-lobby', 1), req('sp-hull-yard', 2), req('sp-outpost-lease', 2)], 'sp-far-chart', 'Far Chart', 'The long chart, extended past the last lane.', 'network', 0.1, 6),
]

export const DEEP_UPGRADES: UpgradeDef[] = [
  ...build('pantry', PANTRY_DEEP),
  ...build('exchange', EXCHANGE_DEEP),
  ...build('cultivar', CULTIVAR_DEEP),
  ...build('signal', SIGNAL_DEEP),
  ...build('space', SPACE_DEEP),
]

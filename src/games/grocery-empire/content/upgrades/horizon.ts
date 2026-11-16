import type { GameState } from '../../sim/state'
import { BAND_MUL, ERA_BASE, eraEffectScale } from './v2'
import { describeEffects, type StatEffect, type StatId } from './stats'
import type { UpgradeBand, UpgradeDef, TreeId } from './types'

/**
 * Eras 7–12. Verb nodes are read with upgradeEffect. Stat nodes are the
 * fourteen-per-tree ladder (pantry, exchange, cultivar, signal).
 *
 * Growth and max follow Era 0–6 band feel; per-rank values are authored high
 * enough that eraEffectScale still leaves a readable bump.
 */

const GROWTH = 1.34
const STAT_MAX = 12

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

function verb(
  tree: TreeId,
  id: string,
  name: string,
  blurb: string,
  per: string,
  max: number,
  era: number,
  i: number,
  extra?: Partial<UpgradeDef>,
): UpgradeDef {
  const band = bandForEra(era)
  return {
    id,
    tree,
    name,
    per,
    blurb,
    max,
    base: price(era, band, i),
    growth: GROWTH,
    band,
    col: i % 5,
    row: Math.floor(i / 5),
    visible: (s: GameState) => s.era >= era,
    ...extra,
  }
}

type StatRow = [id: string, name: string, blurb: string, stat: StatId, per: number, era: number, max?: number]

function stats(tree: TreeId, rows: StatRow[], start: number): UpgradeDef[] {
  return rows.map(([id, name, blurb, stat, per, era, max], i) => {
    const band = bandForEra(era)
    const scale = eraEffectScale(era)
    const effects: StatEffect[] = [{ stat, per: Math.round(per * scale * 10000) / 10000 }]
    const index = start + i
    const def: UpgradeDef = {
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
      row: Math.floor(index / 5),
      effects,
      visible: (s: GameState) => s.era >= era,
    }
    return def
  })
}

const PANTRY_VERBS: UpgradeDef[] = [
  verb('pantry', 'survey-desk', 'Survey Desk', 'The survey trickle shows on the desk, even before the office memo.', 'Reveals the survey trickle.', 1, 7, 0),
  verb('pantry', 'probe-clerk', 'Probe Clerk', 'A deputy surveyor waits thirty seconds instead of forty-five.', 'Deputy probe cooldown 45s → 30s.', 1, 7, 1),
  verb('pantry', 'local-chalk', 'Local Chalk', 'A planet with its own price earns a little more per rank.', '+2% on a planet with a local price, per rank.', 5, 7, 2),
  verb(
    'pantry',
    'climate-serve-pad',
    'Climate Neighbor Pad',
    'A card by the climate slot. The next neighbor arrives sooner.',
    '−8% climate neighbor cooldown',
    5,
    7,
    3,
    { scale: 'linear', effectCap: 0.08 },
  ),
  verb(
    'pantry',
    'guest-patience',
    'Guest Patience',
    'A chair by the door. The climate guest sits, and their ban on your best facing bites less.',
    'Softens the guest ban’s pull cut by 15% of itself.',
    3,
    7,
    4,
    { scale: 'linear', effectCap: 0.15 },
  ),
]

const PANTRY_STATS: StatRow[] = [
  ['pan-survey', 'Planet Ledger', 'Thickens the planet network layer.', 'planet', 0.12, 7],
  ['pan-shelf', 'World Shelf', 'Another facing on a world you already stock.', 'planet', 0.14, 7],
  ['pan-tags', 'Wanted Tags', 'The tags the planet asked for, written larger.', 'planet', 0.12, 7],
  ['pan-pin', 'Map Pin', 'A pin brings a few more shoppers to the flagship.', 'demand', 0.08, 7],
  ['pan-chalk', 'Chalk Price', 'Local prices written where the aisle can see them.', 'planet', 0.12, 7],
  ['pan-cluster', 'Named Cluster', 'A named cluster pulls a little harder.', 'planet', 0.14, 7],
  ['pan-night', 'Quiet Night', 'Night tags on a quiet world.', 'demand', 0.08, 7],
  ['pan-ash', 'Ash Credit', 'Ash Dock keeps a line of credit.', 'planet', 0.12, 7],
  ['pan-price', 'World Margin', 'The same can, a slightly better till.', 'margin', 0.08, 7],
  ['pan-probe', 'Probe Yard', 'Probes come home with a fuller note.', 'planet', 0.14, 7],
  ['pan-map', 'System Map', 'The network learns the new dots.', 'network', 0.1, 7],
  ['pan-quiet', 'Quiet Mercy', 'Less spoil on the long haul home.', 'spoilCut', 0.08, 7],
  ['pan-bazaar', 'Bazaar Permit', 'Lantern Bazaar sends a few more shoppers.', 'demand', 0.1, 7],
  ['pan-capstone', 'Pantry Capstone', 'The shelf of worlds, finished.', 'planet', 0.2, 8, 6],
]

const EXCHANGE_VERBS: UpgradeDef[] = [
  verb('exchange', 'standing-circuit', 'Standing Circuit', 'Pins one convoy so a deputy can file it again.', 'Unlocks the standing-route pin.', 1, 8, 0),
  verb('exchange', 'bay-walls', 'Bay Walls', 'The largest bay holds one more crate per rank.', '+1 crate on the largest bay, per rank.', 4, 8, 1),
  verb(
    'exchange',
    'settlement-pad',
    'Stop Settlement Pad',
    'A stamp at the middle stop. Settlement ETAs shrink a little.',
    '−8% stop settlement ETA',
    5,
    8,
    2,
    { scale: 'linear', effectCap: 0.08 },
  ),
]

const EXCHANGE_STATS: StatRow[] = [
  ['ex-freight', 'Freight Desk', 'Raises freight trickle and the route network layer.', 'freight', 0.14, 8],
  ['ex-bay', 'Bay Charter', 'The bays stay legal and a little fuller.', 'freight', 0.12, 8],
  ['ex-keel', 'Keel Notice', 'Keel’s cut gets smaller.', 'rivalCut', 0.1, 8],
  ['ex-stop', 'Middle Stop', 'The stop in the middle earns its keep.', 'freight', 0.12, 8],
  ['ex-arc', 'Route Arc', 'The network feels the new lanes.', 'network', 0.1, 8],
  ['ex-wage', 'Broker’s Pencil', 'Wages on the exchange floor ease off.', 'wageCut', 0.08, 8],
  ['ex-ice', 'Ice Manifest', 'Cold freight still counts as freight.', 'freight', 0.12, 8],
  ['ex-manifest', 'Clean Manifest', 'A cleaner manifest, a better margin.', 'margin', 0.08, 8],
  ['ex-truce', 'Truce Week', 'A week where Keel does not grow.', 'rivalCut', 0.12, 8],
  ['ex-dock', 'Ash Dock', 'The dock takes another crate.', 'freight', 0.14, 8],
  ['ex-lane', 'Old Lanes', 'The ocean lanes still get a little help.', 'lane', 0.08, 8],
  ['ex-seal', 'Bonded Seal', 'Sealed freight moves.', 'freight', 0.12, 8],
  ['ex-broker', 'Broker’s Desk', 'The broker’s own cut of the route.', 'freight', 0.14, 8],
  ['ex-capstone', 'Exchange Capstone', 'The floor, finished.', 'freight', 0.2, 9, 6],
]

const CULTIVAR_VERBS: UpgradeDef[] = [
  verb('cultivar', 'season-bell', 'Season Bell', 'The forecast arrives two minutes before the turn, not one.', 'Forecast lead 60s → 120s.', 1, 9, 0, {
    synergy: { perk: 'hz-season', mul: 1.25 },
  }),
  verb('cultivar', 'intense-bed', 'Intense Bed', 'An intense trait counts for more of the season’s want.', 'Intense traits count as 1 + 0.1 × ranks.', 3, 9, 1),
  verb(
    'cultivar',
    'yield-haul-pad',
    'Yield Haul Pad',
    'A chalk mark on the harvest bin. The haul arms shorter.',
    '−8% yield haul ETA',
    5,
    9,
    2,
    { scale: 'linear', effectCap: 0.08 },
  ),
  verb(
    'cultivar',
    'bed-lock-pad',
    'Bed Lock Pad',
    'A latch with a spring in it. Once the season is mostly done, the beds open to a clever cross again.',
    'The bed lock lifts for the last 10% of the season.',
    3,
    9,
    3,
    { scale: 'linear', effectCap: 0.1 },
  ),
]

const CULTIVAR_STATS: StatRow[] = [
  ['cu-seed', 'Seed Ledger', 'Raises seed trickle and the greenhouse network layer.', 'seed', 0.14, 9],
  ['cu-thaw', 'Thaw Watch', 'The first season pays a little more.', 'seed', 0.12, 9],
  ['cu-sun', 'High Sun', 'Shoppers come for the bright season.', 'demand', 0.08, 9],
  ['cu-harvest', 'Harvest Bin', 'The bin at the end of the year.', 'seed', 0.14, 9],
  ['cu-dark', 'Long Dark Lamp', 'Less spoil when the season is dark.', 'spoilCut', 0.08, 9],
  ['cu-bed', 'Extra Bed', 'Another bed, the same seed.', 'seed', 0.12, 9],
  ['cu-sweet', 'Sweet Cross', 'Sweet traits raise the basket.', 'value', 0.08, 9],
  ['cu-sturdy', 'Sturdy Cross', 'Sturdy traits keep longer.', 'spoilCut', 0.1, 9],
  ['cu-pretty', 'Pretty Cross', 'Pretty traits draw a crowd.', 'demand', 0.08, 9],
  ['cu-lasting', 'Lasting Cross', 'Lasting traits stay on the shelf.', 'shelf', 0.08, 9],
  ['cu-bell', 'Bell Rope', 'The bell and the seed, together.', 'seed', 0.12, 9],
  ['cu-glass', 'Glass Season', 'Glass Orchard’s year, counted in seed.', 'seed', 0.14, 9],
  ['cu-almanac', 'Almanac Margin', 'The almanac leaves a few ideas behind.', 'ideas', 0.08, 9],
  ['cu-capstone', 'Cultivar Capstone', 'A full year, finished.', 'seed', 0.2, 10, 6],
]

const SIGNAL_VERBS: UpgradeDef[] = [
  verb('signal', 'phrasebook', 'Phrasebook', 'One more symbol is known. Standard then scores the whole phrase when the charter is not locking it.', 'Reveals one extra symbol on the standard phrase.', 1, 10, 0),
  verb('signal', 'handler-desk', 'Handler Desk', 'The desk can keep one more agent, still under the cap.', '+1 agent allowed, cap unchanged.', 1, 10, 1),
  verb('signal', 'fair-copy', 'Fair Copy', 'When the charter is Standard, filing the standard scores 0.85.', 'Standard file scores 0.85 instead of 0.80.', 1, 11, 2),
  verb(
    'signal',
    'habit-watch-pad',
    'Habit Watch Pad',
    'A timer beside the phrase reel. Watches finish a little sooner.',
    '−8% habit watch ETA',
    5,
    10,
    3,
    { scale: 'linear', effectCap: 0.08 },
  ),
  verb(
    'signal',
    'clause-seat-pad',
    'Clause Seat Pad',
    'A blotter under the seal. Seating and the gap after shrink.',
    '−8% clause seating ETA and gap',
    5,
    11,
    4,
    { scale: 'linear', effectCap: 0.08 },
  ),
  verb(
    'signal',
    'accept-rehearsal-pad',
    'Accept Rehearsal Pad',
    'A practice blotter on the Last Aisle desk. The desk gap shortens and fewer rehearsals scratch a line.',
    '−8% accept rehearsal desk gap and scratch risk',
    5,
    12,
    5,
    { scale: 'linear', effectCap: 0.08 },
  ),
  verb(
    'signal',
    'clause-amend-pad',
    'Clause Amend Pad',
    'A second margin on the minutes. The clerk can strike one more grudge before the docket closes.',
    '+1 Minutes Clerk amend per docket.',
    2,
    11,
    6,
    { scale: 'linear', effectCap: 1 },
  ),
  verb(
    'signal',
    'endless-edit-pad',
    'Endless Edit Pad',
    'An eraser on a string. The standing order mutates a line less often.',
    '+1 world between list mutations.',
    3,
    12,
    7,
    { scale: 'linear', effectCap: 1, visible: (s: GameState) => s.era >= 12 && !!s.horizon?.endless },
  ),
  verb(
    'signal',
    'mutation-clear-pad',
    'Mutation Clear Pad',
    'When the Board’s pressure is lifted, the line it scarred comes back a little better.',
    'Clearing Ration pressure restores 4% to a mutated line.',
    3,
    12,
    8,
    { scale: 'linear', effectCap: 0.04, visible: (s: GameState) => s.era >= 12 && !!s.horizon?.endless },
  ),
]

const SIGNAL_STATS: StatRow[] = [
  ['sg-relay', 'Relay Mast', 'Raises signal trickle and the relay network layer.', 'signal', 0.14, 10],
  ['sg-reel', 'Phrase Reel', 'The reel keeps another mark.', 'signal', 0.12, 10],
  ['sg-agent', 'Agent Papers', 'Agents tug the network.', 'network', 0.1, 10],
  ['sg-wage', 'Night Wage', 'The wire shift costs less.', 'wageCut', 0.1, 10],
  ['sg-phrase', 'Fair Phrase', 'A cleaner phrase, more signal.', 'signal', 0.14, 10],
  ['sg-habit', 'Habit Card', 'Habits settle into the signal.', 'signal', 0.12, 11],
  ['sg-night', 'Night Frequency', 'The night band brings shoppers.', 'demand', 0.08, 11],
  ['sg-key', 'Listener’s Key', 'The listener leaves ideas.', 'ideas', 0.08, 11],
  ['sg-bell', 'Signal Bell', 'Attention ticks up with the mast.', 'attention', 0.08, 11],
  ['sg-handler', 'Handler Badge', 'A handler on the stat sheet.', 'signal', 0.14, 11],
  ['sg-desk', 'Desk XP', 'The desk learns.', 'xp', 0.08, 11],
  ['sg-static', 'Static Budget', 'Static still carries a phrase.', 'signal', 0.12, 11],
  ['sg-ivo', 'Ivo’s Corner', 'The list is on the desk. The basket is worth more.', 'value', 0.1, 12],
  ['sg-capstone', 'Signal Capstone', 'The wire, finished.', 'signal', 0.2, 12, 6],
]

function withIvoGate(nodes: UpgradeDef[]): UpgradeDef[] {
  return nodes.map((node) =>
    node.id === 'sg-ivo'
      ? { ...node, visible: (s: GameState) => s.era >= 12 && s.horizon?.list != null }
      : node,
  )
}

export const HORIZON_UPGRADES: UpgradeDef[] = [
  ...PANTRY_VERBS,
  ...stats('pantry', PANTRY_STATS, PANTRY_VERBS.length),
  ...EXCHANGE_VERBS,
  ...stats('exchange', EXCHANGE_STATS, EXCHANGE_VERBS.length),
  ...CULTIVAR_VERBS,
  ...stats('cultivar', CULTIVAR_STATS, CULTIVAR_VERBS.length),
  ...SIGNAL_VERBS,
  ...withIvoGate(stats('signal', SIGNAL_STATS, SIGNAL_VERBS.length)),
]

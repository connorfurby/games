/**
 * Era 2 — Chain and capital content tables (memos, doctrines, expansions, venture gates).
 * Memos here are merged into MEMOS via memos.ts re-export / append.
 */

import { CELEBRITY_ENDCAP } from '../sim/balance'
import { celebrityCashCost } from '../sim/lateCost'
import { log, unlockMenu, queueTutorial } from '../sim/helpers'
import type { GameState } from '../sim/state'
import type { MemoCost, MemoDef } from './memos'

const c = (cash = 0, attention = 0, ideas = 0) => (): MemoCost => ({ cash, attention, ideas })
const had = (s: GameState, id: string) => (s.memos[id] ?? 0) > 0

export interface DoctrineDef {
  id: string
  name: string
  blurb: string
  /** Ordinal unlock — buy in sequence for full tournament payoff. */
  order: number
  /** Late doctrines stay hidden until this era (Worlds, 7+). */
  era?: number
}

export const DOCTRINES: DoctrineDef[] = [
  { id: 'throughput', name: 'Throughput First', blurb: 'Empty shelves beat fat margins.', order: 0 },
  { id: 'edlp', name: 'Everyday Low', blurb: 'Steady price, steady traffic.', order: 1 },
  { id: 'hi-lo', name: 'High-Low Pulse', blurb: 'Promo waves then recover.', order: 2 },
  { id: 'loss-leader', name: 'Loss Leader', blurb: 'Traffic bait, basket attach.', order: 3 },
  { id: 'premium-bodega', name: 'Premium Bodega', blurb: 'Fewer trips, richer tickets.', order: 4 },
  { id: 'route-density', name: 'Route Density', blurb: 'Depot legs before vanity stores.', order: 5 },
  { id: 'float-discipline', name: 'Float Discipline', blurb: 'Equity is expansion fuel.', order: 6 },
  { id: 'read-bank', name: 'Bank the Read', blurb: 'Tournaments bank Read for the next fight.', order: 7 },
  // Late doctrines (Era 7+). Each is read by sim/systems/late.ts.
  { id: 'survey-ledger', name: 'Survey Ledger', blurb: 'Every survey trickle is written twice. +25% survey.', order: 8, era: 7 },
  { id: 'freight-docket', name: 'Freight Docket', blurb: 'The bonded cage fills faster. +25% bonded crates.', order: 9, era: 8 },
  { id: 'seed-bank', name: 'Seed Bank', blurb: 'The vault takes a quarter more seed.', order: 10, era: 9 },
  { id: 'signal-discipline', name: 'Signal Discipline', blurb: 'The mast listens harder. +20% signal.', order: 11, era: 10 },
  { id: 'quorum-rules', name: 'Quorum Rules', blurb: 'Council seats pay a quarter more.', order: 12, era: 11 },
  { id: 'standing-order', name: 'Standing Order', blurb: 'Jump hauls carry 20% more freight.', order: 13, era: 12 },
]

/** Doctrines the player can see and buy at this era (late ones open with Worlds). */
export function doctrinesAtEra(era: number): DoctrineDef[] {
  return DOCTRINES.filter((d) => (d.era ?? 0) <= era)
}

export const DOCTRINE_BY_ID: Record<string, DoctrineDef> = Object.fromEntries(
  DOCTRINES.map((d) => [d.id, d]),
)

export interface ExpansionDef {
  id: string
  name: string
  blurb: string
  cost: number
  era: number
  requires?: (s: GameState) => boolean
}

export const ERA2_EXPANSIONS: ExpansionDef[] = [
  {
    id: 'parking',
    name: 'Parking Strip',
    blurb: '+10% demand · +1 staff seat · higher rent.',
    cost: 6000,
    era: 2,
    requires: (s) => s.era >= 2 && !!s.expansions['side-yard'],
  },
  {
    id: 'corner-parcel',
    name: 'Corner Parcel',
    blurb: 'Next store −15% cost · opens one level higher.',
    cost: 14_000,
    era: 2,
    requires: (s) => s.era >= 2 && s.stores.length >= 1,
  },
  {
    id: 'metro-slot',
    name: 'Metro Slot',
    blurb: '+0.08 demand per extra store · −10% Attention drain. Needs depot + incorporate.',
    cost: 45_000,
    era: 2,
    requires: (s) => s.era >= 2 && s.depot && s.incorporated,
  },
]

export const ERA2_EXPANSION_BY_ID: Record<string, ExpansionDef> = Object.fromEntries(
  ERA2_EXPANSIONS.map((e) => [e.id, e]),
)

/** Venture availability stubs that open in Era 2. */
export function cateringAvailable(s: GameState) {
  return s.era >= 2 && (!!s.memos['catering-license'] || s.stores.length >= 2)
}

export function ghostKitchenAvailable(s: GameState) {
  return s.era >= 2 && s.depot
}

export function commodityDeskAvailable(s: GameState) {
  return s.era >= 2 && s.invest.unlocked && s.invest.engineLevel >= 1
}

export const ERA2_MEMOS: MemoDef[] = [
  {
    id: 'chain-charter',
    name: 'Chain Charter',
    voice: 'One register was a store. Two deeds make a chain.',
    effect: 'Opens chain tools on Land and your second store.',
    era: 2,
    cost: c(2000, 800),
    visible: (s) => s.era >= 2,
    run: (s) => {
      unlockMenu(s, 'land')
      queueTutorial(s, 'e2-second-store')
    },
    done: 'Charter stamped. You may open another storefront.',
  },
  {
    id: 'policy-binder',
    name: 'Policy Binder',
    voice: 'Local, Standard, or Premium — pick one voice per store.',
    effect: 'Unlocks store policies. Stores you never visit slowly lose shoppers.',
    era: 2,
    cost: c(1500, 600),
    visible: (s) => s.era >= 2 && s.stores.length >= 1,
    run: (s) => queueTutorial(s, 'e2-policies'),
    done: 'Policies filed. Attention split decides who keeps them.',
  },
  {
    id: 'depot-permit',
    name: 'Depot Permit',
    voice: 'A shed between stores. Routes beat vanity footprints.',
    effect: 'Lets you build the Depot, which opens catering and the ghost kitchen.',
    era: 2,
    cost: c(8000, 2000),
    visible: (s) => s.era >= 2 && s.stores.length >= 2,
    run: (s) => {
      unlockMenu(s, 'land')
      queueTutorial(s, 'e2-depot')
    },
    done: 'Depot permit approved. Build it before store five.',
  },
  {
    id: 'articles-of-inc',
    name: 'Articles of Incorporation',
    voice: 'Equity is not flavor. It is how you fund the next deed.',
    effect: 'Unlocks Incorporate and the board calendar.',
    era: 2,
    cost: c(5000, 1500, 40),
    visible: (s) => s.era >= 2 && s.lifetimeRevenue >= 25_000,
    run: (s) => queueTutorial(s, 'e2-incorporate'),
    done: 'Counsel left a folder. Incorporate when cash is the bottleneck.',
  },
  {
    id: 'trading-desk',
    name: 'Trading Desk',
    voice: 'A book that ticks every few seconds. Fat left tails on High.',
    effect: 'Unlocks the investment book beside the passbook.',
    era: 2,
    cost: c(4000, 1200, 30),
    visible: (s) => s.era >= 2 && (s.passbook.balance >= 200 || (s.memos['passbook'] ?? 0) > 0),
    run: (s) => {
      s.invest.unlocked = true
      unlockMenu(s, 'invest')
      queueTutorial(s, 'e2-invest')
    },
    done: 'Trading desk live. Start Low risk; Mid after engine L2.',
  },
  {
    id: 'doctrine-room',
    name: 'Strategy Room',
    voice: 'Eight binders. Attention in, Read out.',
    effect: 'Opens Strategy: tournaments and strategies.',
    era: 2,
    cost: c(3000, 2500, 50),
    visible: (s) => s.era >= 2 && s.compute.ideasUnlocked,
    run: (s) => {
      unlockMenu(s, 'strategy')
      queueTutorial(s, 'e2-tournament')
    },
    done: 'Strategy room open. Buy strategies in order and save your Read.',
  },
  {
    id: 'catering-license',
    name: 'Catering License',
    voice: 'Contract trays. Lump cash on a timer.',
    effect: 'Opens the Catering venture.',
    era: 2,
    cost: c(4500, 900),
    visible: (s) => s.era >= 2 && (s.stores.length >= 2 || had(s, 'chain-charter')),
    run: (s) => {
      unlockMenu(s, 'ventures')
      queueTutorial(s, 'e2-ventures')
    },
    done: 'Catering license posted. Contracts will fill the till.',
  },
  {
    id: 'ghost-kitchen',
    name: 'Ghost Kitchen Hookup',
    voice: 'Delivery-only menu riding the depot.',
    effect: 'Opens Ghost Kitchen when the depot is built.',
    era: 2,
    cost: c(12_000, 1800, 60),
    visible: (s) => s.era >= 2 && s.depot,
    blocked: (s) => (s.depot ? null : 'Build the depot first.'),
    run: (s) => unlockMenu(s, 'ventures'),
    done: 'Ghost kitchen line live off the depot.',
  },
  {
    id: 'board-calendar',
    name: 'Board Calendar',
    voice: 'Expand, dividend, shelf-life R&D, or cut hours — pick something.',
    effect: 'Board meetings begin; ignoring them drains Reputation slowly.',
    era: 2,
    cost: c(2000, 700),
    visible: (s) => s.incorporated,
    run: (s) => {
      s.board.nextMeetingAt = s.time + 60
      queueTutorial(s, 'e2-board')
    },
    done: 'Next board meeting scheduled.',
  },
  {
    id: 'autonomous-brief',
    name: 'Autonomous Brief',
    voice: 'When Read, depot, and spent Reputation line up, release the floor.',
    effect: 'Lets you hand over the chain, which ends Era 2.',
    era: 2,
    cost: c(20_000, 5000, 120),
    visible: (s) => s.era >= 2 && s.depot && s.read >= 20,
    run: (s) => queueTutorial(s, 'e2-autonomous'),
    done: 'Brief filed. Release when the numbers say go.',
  },
  {
    id: 'celebrity-endcap',
    name: 'Celebrity Endcap',
    voice: 'A local micro-celebrity stands by the cans for two minutes of fame.',
    effect: `+25% demand for ${CELEBRITY_ENDCAP.durationSec}s. Small Brand risk when cameras leave.`,
    era: 2,
    cost: (s) => ({ cash: celebrityCashCost(s), ideas: CELEBRITY_ENDCAP.ideasCost }),
    visible: (s) => s.era >= 2 && s.compute.ideasUnlocked,
    blocked: (s) =>
      s.time < (s.campaigns?.celebrityUntil ?? 0) ? 'Celebrity still on the endcap.' : null,
    run: (s) => {
      if (!s.campaigns) s.campaigns = { celebrityUntil: 0 }
      s.campaigns.celebrityUntil = s.time + CELEBRITY_ENDCAP.durationSec
      log(s, 'Celebrity endcap live. Demand spikes while the cameras roll.', 'memo')
    },
    repeatable: true,
    done: 'Cameras roll. The endcap pulls hard.',
  },
]

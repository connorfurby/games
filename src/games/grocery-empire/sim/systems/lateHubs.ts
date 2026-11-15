/**
 * Late hubs, Money + Empire side (Era 7–12): Council seats, Invest instruments,
 * annex seats from Empire rewards, late doctrines, outposts, and the readers for
 * the `lh-*` upgrade nodes. `late.ts` calls the hooks at the bottom of its file.
 *
 * This module must not import `late.ts` (it is imported by it).
 */
import { TRACK_BY_ID } from '../../content/builds'
import { empireUnlocked } from '../../content/empireRewards'
import { INSTRUMENT_BY_ID, INSTRUMENTS, type InstrumentDef } from '../../content/instruments'
import { upgradeEffect } from '../../content/upgrades'
import { HORIZON, LATE } from '../balance'
import { clamp, log } from '../helpers'
import type { GameState } from '../state'
import { planetDef } from './horizon'
import { statMul } from './stats'

export function hasDoctrine(s: GameState, id: string): boolean {
  return (s.doctrines?.[id] ?? 0) > 0
}

function tierIndex(track: 'storefront' | 'civic', name: string): number {
  return TRACK_BY_ID[track]?.tiers.findIndex((t) => t.name === name) ?? -1
}

/** Local, import-free default so UI/commands can call us before `ensureLate` has run. */
function lateOf(s: GameState): GameState['late'] {
  if (!s.late) {
    s.late = {
      broadcasts: {},
      wireAdsUntil: 0,
      cryoImmuneUntil: 0,
      jumpFreightAcc: 0,
      planetFranchises: 0,
      futuresUntil: 0,
      futuresSku: null,
      scrutiny: 0,
      instruments: {},
      unpacked: 0,
    }
  }
  if (typeof s.late.scrutiny !== 'number') s.late.scrutiny = 0
  if (!s.late.instruments || typeof s.late.instruments !== 'object') s.late.instruments = {}
  if (typeof s.late.unpacked !== 'number') s.late.unpacked = 0
  return s.late
}

// ── Council seats ────────────────────────────────────────────────────────────

export function councilSeats(s: GameState): number {
  return s.politics?.acquisitions ?? 0
}

/** Seats that pay full. Annexes come from builds, Empire rewards, and Council Clerks. */
export function councilSeatCap(s: GameState): number {
  let cap = LATE.annexSeatsBase
  const front = s.builds?.storefront ?? 1
  const plaza = tierIndex('storefront', 'Probe Plaza')
  const atrium = tierIndex('storefront', 'Greenhouse Atrium')
  if (plaza >= 0 && front >= plaza) cap += LATE.annexSeatsPerPlaza
  if (atrium >= 0 && front >= atrium) cap += LATE.annexSeatsPerPlaza
  const annex = tierIndex('civic', 'Embassy Annex')
  if (annex >= 0 && (s.builds?.civic ?? 0) >= annex) cap += LATE.annexSeatsPerPlaza
  const level = s.empire?.level ?? 0
  if (empireUnlocked(level, 'annex-seat')) cap += 2
  if (empireUnlocked(level, 'annex-seat-2')) cap += 2
  if (s.projects?.done?.['pj-council-annex']) cap += LATE.councilAnnexSeats
  cap += Math.floor(upgradeEffect(s, 'lh-council-clerk')) * LATE.councilSeatPerClerk
  return cap
}

export function councilPayingSeats(s: GameState): number {
  return Math.min(councilSeats(s), councilSeatCap(s))
}

/** Store-equivalents the Council adds to the network (Era 7+). */
export function councilSeatAdd(s: GameState): number {
  if (s.era < 7) return 0
  const seats = councilSeats(s)
  if (seats <= 0) return 0
  const paying = councilPayingSeats(s)
  const over = seats - paying
  let mul = 1
  if (empireUnlocked(s.empire?.level ?? 0, 'council-whip')) mul *= LATE.councilWhipMul
  if (hasDoctrine(s, 'quorum-rules')) mul *= LATE.doctrineSeatMul
  return (paying + over * LATE.councilOverCapPay) * LATE.councilSeatLayer * mul
}

/** 0..1. Every seat draws a little attention. */
export function councilScrutiny(s: GameState): number {
  if (s.era < 7) return 0
  return clamp(councilSeats(s) * LATE.councilScrutinyPerSeat, 0, 1)
}

/** Share of instrument yield lost to scrutiny. */
export function scrutinyDrag(s: GameState): number {
  const sc = s.late?.scrutiny ?? councilScrutiny(s)
  if (sc <= LATE.scrutinyDragAt) return 0
  return ((sc - LATE.scrutinyDragAt) / (1 - LATE.scrutinyDragAt)) * LATE.scrutinyDragMax
}

// ── Invest instruments ───────────────────────────────────────────────────────

export function instrumentLots(s: GameState, id: string): number {
  return s.late?.instruments?.[id] ?? 0
}

export function instrumentLotCap(s: GameState): number {
  return LATE.instrumentMaxLots + (empireUnlocked(s.empire?.level ?? 0, 'instrument-lot') ? 1 : 0)
}

export function instrumentCost(s: GameState, id: string): number {
  const def = INSTRUMENT_BY_ID[id]
  if (!def) return Number.POSITIVE_INFINITY
  const lots = instrumentLots(s, id)
  const floor = Math.max(0, s.rates?.revenuePerSec ?? 0) * LATE.instrumentGateSec
  const cut = clamp(upgradeEffect(s, 'lh-futures-book'), 0, 0.5)
  return Math.ceil(Math.max(def.base, floor) * Math.pow(LATE.instrumentGrowth, lots) * (1 - cut))
}

/** Currency per second one instrument pays right now. */
export function instrumentYieldPerSec(s: GameState, id: string): number {
  const def = INSTRUMENT_BY_ID[id]
  if (!def || s.era < def.era) return 0
  const lots = instrumentLots(s, id)
  if (lots <= 0) return 0
  return lots * def.yieldPerLot * (1 + upgradeEffect(s, 'lh-bond-desk')) * (1 - scrutinyDrag(s))
}

export function canBuyInstrument(s: GameState, id: string): string | null {
  const def = INSTRUMENT_BY_ID[id]
  if (!def) return 'Unknown instrument.'
  if (s.era < def.era) return `${def.name} opens in Era ${def.era}.`
  if (instrumentLots(s, id) >= instrumentLotCap(s)) return 'Every lot is held.'
  const cost = instrumentCost(s, id)
  if (s.cash < cost) return 'Not enough cash for the next lot.'
  return null
}

export function buyInstrument(s: GameState, id: string): string | null {
  const why = canBuyInstrument(s, id)
  if (why) return why
  const def = INSTRUMENT_BY_ID[id]!
  const late = lateOf(s)
  s.cash -= instrumentCost(s, id)
  late.instruments[id] = (late.instruments[id] ?? 0) + 1
  log(s, `${def.name}: lot ${late.instruments[id]} filed.`, 'good')
  return null
}

function bumpCurrency(s: GameState, def: InstrumentDef, amount: number): void {
  if (!(amount > 0)) return
  const h = s.horizon
  switch (def.currency) {
    case 'survey':
      h.survey = Math.min(HORIZON.surveyCap, h.survey + amount)
      break
    case 'freight':
      h.freight = Math.min(HORIZON.freightCap, h.freight + amount)
      break
    case 'seed':
      h.seed = Math.min(HORIZON.seedCap, h.seed + amount)
      break
    case 'signal':
      h.signal = Math.min(HORIZON.signalCap, h.signal + amount)
      break
  }
}

// ── Outposts (Land, read-only) ───────────────────────────────────────────────

export interface Outpost {
  id: string
  name: string
  score: number
  franchised: boolean
}

/** One row per stocked world. The first `planetFranchises` are franchised. */
export function outposts(s: GameState): Outpost[] {
  if (s.era < 7) return []
  const franchises = s.late?.planetFranchises ?? 0
  return (s.horizon?.planets ?? [])
    .filter((p) => p.stocked)
    .map((p, i) => ({
      id: p.id,
      name: planetDef(p.id)?.name ?? p.id,
      score: p.score,
      franchised: i < franchises,
    }))
}

// ── Empire rewards 105–160 and Projects: feature readers ─────────────────────

/** Empire 115: the last bay holds one more crate. */
export function empireBaySlots(s: GameState): number {
  return empireUnlocked(s.empire?.level ?? 0, 'bay-slot') ? LATE.empireBaySlots : 0
}

/** Empire 120 and Raise the Wire Hall each add a chair (and cap room) on the agent desk. */
export function agentSeatBonus(s: GameState): number {
  let n = 0
  if (empireUnlocked(s.empire?.level ?? 0, 'agent-seat')) n += LATE.empireAgentSeats
  if (s.projects?.done?.['pj-wire-hall']) n += LATE.wireHallAgentSeats
  return n
}

/** Empire 105: the standard phrase file scores this much higher. 0 until the reward. */
export function phraseClueBonus(s: GameState): number {
  return empireUnlocked(s.empire?.level ?? 0, 'phrase-clue') ? LATE.phraseClueBonus : 0
}

/** File the Manifest: freight that survives a Rebrand along with the standing route. */
export function manifestCrumb(s: GameState): number {
  return s.projects?.done?.['pj-manifest'] && s.horizon?.standingRoute ? LATE.manifestCrumbFreight : 0
}

// ── lh-* upgrade readers (every node is read through upgradeEffect) ──────────

export function bondedCapBonus(s: GameState): number {
  return Math.floor(upgradeEffect(s, 'lh-bonded-rack'))
}

export function bondedRateMul(s: GameState): number {
  return (1 + upgradeEffect(s, 'lh-bonded-ledger')) * (hasDoctrine(s, 'freight-docket') ? LATE.doctrineBondedMul : 1)
}

export function vaultCapMul(s: GameState): number {
  return hasDoctrine(s, 'seed-bank') ? LATE.doctrineVaultMul : 1
}

export function vaultCapBonus(s: GameState): number {
  return Math.floor(upgradeEffect(s, 'lh-vault-lock'))
}

export function vaultDecayMul(s: GameState): number {
  return Math.max(0.2, 1 - upgradeEffect(s, 'lh-cryo-seal'))
}

export function jumpFreightMul(s: GameState): number {
  return (1 + upgradeEffect(s, 'lh-jump-tuning')) * (hasDoctrine(s, 'standing-order') ? LATE.doctrineJumpMul : 1)
}

/** Fuel a jump burns. Empire's Freight reward lifts the cap from 10 to 15. */
export function jumpBurnCap(s: GameState): number {
  const base = empireUnlocked(s.empire?.level ?? 0, 'jump-surge') ? 15 : 10
  return base + Math.floor(upgradeEffect(s, 'sp-jump-skid'))
}

export function endcapMul(s: GameState): number {
  return 1 + upgradeEffect(s, 'lh-endcap-orbit')
}

export function franchiseLayerMul(s: GameState): number {
  return 1 + upgradeEffect(s, 'lh-franchise-sign') + upgradeEffect(s, 'sp-franchise-deed')
}

export function queueFloorMul(s: GameState): number {
  return Math.max(0.2, 1 - upgradeEffect(s, 'lh-queue-clerk'))
}

/** Barges haul a little freight from Era 8 (read by tickFleet). */
export function bargeFreightPerSec(s: GameState): number {
  if (s.era < 8 || (s.fleet?.barges ?? 0) <= 0) return 0
  return Math.sqrt(s.fleet.barges) * LATE.bargeFreightPerSec * (1 + upgradeEffect(s, 'lh-orbital-mail') + upgradeEffect(s, 'sp-barge-hold'))
}

// ── Tick ─────────────────────────────────────────────────────────────────────

export function tickLateHubs(s: GameState, dt: number): void {
  if (s.era < 7 || !(dt > 0)) return
  const late = lateOf(s)
  const h = s.horizon

  late.scrutiny = councilScrutiny(s)

  for (const def of INSTRUMENTS) {
    if (s.era < def.era) continue
    bumpCurrency(s, def, instrumentYieldPerSec(s, def.id) * dt)
  }

  // Survey: Survey Ledger doctrine and Survey Labs stack on the base trickle.
  if (h.continued || s.memos['survey-office'] > 0) {
    let extra = upgradeEffect(s, 'lh-survey-labs')
    if (hasDoctrine(s, 'survey-ledger')) extra += HORIZON.surveyPerSec * (LATE.doctrineSurveyMul - 1)
    if (extra > 0) h.survey = Math.min(HORIZON.surveyCap, h.survey + extra * dt)
  }

  // Signal Discipline lifts the mast.
  if (h.relays > 0 && hasDoctrine(s, 'signal-discipline')) {
    const extra = h.relays * HORIZON.signalPerRelay * statMul(s, 'signal') * (LATE.doctrineSignalMul - 1)
    h.signal = Math.min(HORIZON.signalCap, h.signal + extra * dt)
  }

  // Council seats mint a little seal once the charter is in view.
  if (s.era >= 10) {
    const seal = councilPayingSeats(s) * LATE.councilSealPerSeat * statMul(s, 'seal')
    if (seal > 0) h.seal = Math.min(HORIZON.sealCap, h.seal + seal * dt)
  }
}

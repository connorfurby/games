/**
 * Era 7–12 expansion verbs (climate neighbor, stop settlement, yield haul, clause seating,
 * Accept rehearsal) and the habit-watch tick. Split out of horizon.ts; re-exported there.
 *
 * `maybeOpenEras` stays in horizon.ts (era gates read the puzzle filing state). The import is
 * only used at call time, so the horizon.ts <-> horizonVerbs.ts cycle is safe.
 */

import { CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { FACING_BY_ID } from '../../content/depth'
import {
  CLAUSE_BY_ID,
  PLANET_BY_ID,
  climateGuestFor,
  type ClimateGuestDef,
  type AgentHabit,
  type PlanetClimate,
  type StopPersonality,
} from '../../content/horizon'
import { upgradeEffect } from '../../content/upgrades'
import { DEPTH, HORIZON } from '../balance'
import { log, sumQty, takeUnits } from '../helpers'
import { chance } from '../rng'
import type { GameState } from '../state'
import {
  ensureHorizon,
  ensurePractice,
  hearingSessionOpen,
  markStandardFile,
  nextHearingClause,
  openHearingSession,
} from './horizonCore'
import { maybeOpenEras, refreshListScore } from './horizon'

function planetClimateOf(planetId: string): PlanetClimate | null {
  return PLANET_BY_ID[planetId]?.climate ?? null
}

function stockedClimates(s: GameState): PlanetClimate[] {
  const h = ensureHorizon(s)
  const out: PlanetClimate[] = []
  for (const p of h.planets) {
    if (!p.stocked) continue
    const c = planetClimateOf(p.id)
    if (c && !out.includes(c)) out.push(c)
  }
  return out
}

/** The guest bans the flagship's strongest-pull featured facing (first category wins a tie). */
export function guestBanTarget(s: GameState): { tag: string; cat: CategoryId } | null {
  const facings = s.depth?.facings ?? {}
  let best: { tag: string; cat: CategoryId } | null = null
  let bestPull = -Infinity
  for (const cat of CATEGORY_IDS) {
    if (!s.categories[cat]) continue
    const id = facings[cat]
    const def = id ? FACING_BY_ID[id] : null
    if (!def || !(def.pullMul > bestPull)) continue
    best = { tag: def.id, cat }
    bestPull = def.pullMul
  }
  return best
}

/** The live ban, or null once the shift day has turned (or the facing was swapped off). */
export function activeFacingBan(s: GameState): { tag: string; cat: CategoryId; until: number } | null {
  const ban = s.depth?.climateFacingBan
  if (!ban || ban.until <= s.time) return null
  return s.depth?.facings?.[ban.cat] === ban.tag ? ban : null
}

/** The named guest at the door: the visiting climate's regular for this serve (null before Era 7 / no world stocked). */
export function currentClimateGuest(s: GameState): ClimateGuestDef | null {
  if (s.era < 7) return null
  const h = ensureHorizon(s)
  const climates = stockedClimates(s)
  const want = h.climateGuest ?? climates[0]
  if (!want) return null
  return climateGuestFor(want, s.era, h.climateServed ?? 0)
}

export function canServeClimateNeighbor(s: GameState): string | null {
  if (s.era < 7) return 'Climate neighbors open after Continue.'
  const h = ensureHorizon(s)
  if (h.nextClimateAt > s.time) return `Next climate neighbor in ${Math.ceil(h.nextClimateAt - s.time)}s.`
  const climates = stockedClimates(s)
  if (climates.length === 0) return 'Stock a world first.'
  const want = h.climateGuest ?? climates[0]
  if (!climates.includes(want)) return `Stock a ${want} world for the visiting climate.`
  if (sumQty(s.shelf) < 1) return 'Put something on the shelf for the guest.'
  return null
}

export function serveClimateNeighbor(s: GameState): string | null {
  const why = canServeClimateNeighbor(s)
  if (why) return why
  const h = s.horizon
  const climates = stockedClimates(s)
  const want = h.climateGuest ?? climates[0]
  const guest = currentClimateGuest(s)
  // Pull a few units off the flagship shelf so the visit is visible.
  takeUnits(s.shelf, Math.min(3, sumQty(s.shelf)), true)
  if (guest) log(s, guest.served, 'info')
  const ban = guestBanTarget(s)
  if (ban && s.depth) {
    const day = DEPTH.shiftDaySec
    s.depth.climateFacingBan = { ...ban, until: (Math.floor(s.time / day) + 1) * day }
    log(
      s,
      `${guest?.name ?? `The ${want} guest`} won't stand for ${FACING_BY_ID[ban.tag]?.name ?? ban.tag} — pull cut until the shift turns.`,
      'warn',
    )
  }
  h.climateServed = (h.climateServed ?? 0) + 1
  const cd =
    HORIZON.climateServeCooldownSec * (1 - Math.min(0.35, upgradeEffect(s, 'climate-serve-pad')))
  h.nextClimateAt = s.time + cd
  h.climateGuest = climates[(h.climateServed + 1) % Math.max(1, climates.length)] ?? want ?? null
  log(s, `Climate neighbor served ${h.climateServed}/${HORIZON.climateServeNeed}.`, 'good')
  maybeOpenEras(s)
  return null
}

/**
 * The circuit + personality the next settleStop locks in. Falls back to the first credited,
 * unsettled circuit when the pending row was cleared (or the save predates SAVE 34).
 */
export function pendingSettlement(s: GameState): { index: number; kind: StopPersonality } | null {
  const h = ensureHorizon(s)
  if (h.settlementUntil <= 0) return null
  const pend = h.pendingStop
  if (pend && h.circuits[pend.index]?.origin) return pend
  const index = h.circuits.findIndex((c) => !!c.origin && c.gateCredited && !c.settledKind && !!c.stopKind)
  const kind = index >= 0 ? h.circuits[index]!.stopKind : null
  return kind ? { index, kind } : null
}

/** How many standing circuits carry a settled tax of this kind. */
export function settledCount(s: GameState, kind: StopPersonality): number {
  return ensureHorizon(s).circuits.filter((c) => !!c.origin && c.settledKind === kind).length
}

/** Tariff: freight trickle multiplier. */
export function stopTariffMul(s: GameState): number {
  return Math.max(HORIZON.stopTariffFloor, 1 - HORIZON.stopTariffCut * settledCount(s, 'tariff'))
}

/** Delay: settlement ETA multiplier. */
export function stopDelayMul(s: GameState): number {
  return 1 + Math.min(HORIZON.stopDelayCap, HORIZON.stopDelayPerCircuit * settledCount(s, 'delay'))
}

/** One line of copy: the tax this personality costs while its circuit stands. */
export function stopTaxLine(kind: StopPersonality): string {
  if (kind === 'spoil') return `Spoil · this circuit's route weight −${Math.round(HORIZON.stopSpoilCut * 100)}%`
  if (kind === 'tariff') return `Tariff · freight trickle −${Math.round(HORIZON.stopTariffCut * 100)}%`
  return `Delay · next settlement ETA +${Math.round(HORIZON.stopDelayPerCircuit * 100)}%`
}

export function canSettleStop(s: GameState): string | null {
  if (s.era < 8) return 'Stop settlements open in Era 8.'
  const h = ensureHorizon(s)
  if (h.settlementUntil <= 0) return 'No settlement pending.'
  if (s.time < h.settlementUntil) return `Settlement ETA ${Math.ceil(h.settlementUntil - s.time)}s.`
  return null
}

export function settleStop(s: GameState): string | null {
  const why = canSettleStop(s)
  if (why) return why
  const h = s.horizon
  const pending = pendingSettlement(s)
  if (pending) {
    const circuit = h.circuits[pending.index]
    if (circuit) circuit.settledKind = pending.kind
  }
  h.pendingStop = null
  h.settlements = (h.settlements ?? 0) + 1
  h.settlementUntil = 0
  log(
    s,
    pending
      ? `Stop settled ${h.settlements}/${HORIZON.settlementNeed} — ${pending.kind} tax while the circuit stands.`
      : `Stop settled ${h.settlements}/${HORIZON.settlementNeed}.`,
    'good',
  )
  maybeOpenEras(s)
  return null
}

export function canHaulYield(s: GameState): string | null {
  if (s.era < 9) return 'Yield hauls open in Era 9.'
  const h = ensureHorizon(s)
  if (h.haulUntil <= 0) return 'No haul armed — finish a season chore first.'
  if (s.time < h.haulUntil) return `Haul ETA ${Math.ceil(h.haulUntil - s.time)}s.`
  return null
}

export function haulYield(s: GameState): string | null {
  const why = canHaulYield(s)
  if (why) return why
  const h = s.horizon
  h.haulsDone = (h.haulsDone ?? 0) + 1
  h.haulUntil = 0
  log(s, `Harvest brought in (${h.haulsDone}/${HORIZON.yieldHaulNeed}).`, 'good')
  maybeOpenEras(s)
  return null
}

export function canSeatClause(s: GameState): string | null {
  if (s.era < 11) return 'Clause seating opens in Era 11.'
  const h = ensureHorizon(s)
  if (h.seatingUntil <= 0) return 'No clause awaiting seating.'
  if (s.time < h.seatingUntil) return `Seating seal ETA ${Math.ceil(h.seatingUntil - s.time)}s.`
  if (h.seatingGapUntil > s.time) return `Seating gap ${Math.ceil(h.seatingGapUntil - s.time)}s.`
  return null
}

/** The clause the next seatClause seats (the pending keep, or the newest kept clause not yet seated). */
export function pendingSeatClause(s: GameState): string | null {
  const h = ensureHorizon(s)
  if (h.seatingUntil <= 0) return null
  if (h.seatingClause && h.clauses.includes(h.seatingClause)) return h.seatingClause
  for (let i = h.clauses.length - 1; i >= 0; i--) {
    const id = h.clauses[i]!
    if (!h.seatedClauses.includes(id)) return id
  }
  return null
}

export function seatClause(s: GameState): string | null {
  const why = canSeatClause(s)
  if (why) return why
  const h = s.horizon
  const clause = pendingSeatClause(s)
  h.seatingsDone = (h.seatingsDone ?? 0) + 1
  h.seatingUntil = 0
  h.seatingClause = null
  if (clause && !h.seatedClauses.includes(clause)) h.seatedClauses.push(clause)
  const gap =
    HORIZON.clauseSeatingGapSec * (1 - Math.min(0.35, upgradeEffect(s, 'clause-seat-pad')))
  h.seatingGapUntil = s.time + gap
  const name = clause ? (CLAUSE_BY_ID[clause]?.name ?? clause) : 'Clause'
  log(s, `${name} made final (${h.seatingsDone}/${HORIZON.clauseSeatingNeed}).`, 'good')
  // Concord asks about what you seat.
  if (hearingSessionOpen(s)) {
    const target = nextHearingClause(s)
    if (target) openHearingSession(s, target)
  }
  maybeOpenEras(s)
  return null
}

/** Chance a rehearsal at or above the Accept mean still misses and scratches a line. */
export function rehearsalMissChance(s: GameState): number {
  const h = ensureHorizon(s)
  if (h.listScore + 1e-9 < HORIZON.listAcceptScore) return 1
  const cut = Math.min(HORIZON.rehearsalMissPadCap, upgradeEffect(s, 'accept-rehearsal-pad'))
  return Math.max(0, HORIZON.rehearsalMissChance - cut)
}

export function canRehearseAccept(s: GameState): string | null {
  if (s.era < 12) return 'Accept rehearsal opens in Era 12.'
  const h = ensureHorizon(s)
  const practice = ensurePractice(s)
  if (practice.list.left > 0) return 'Finish list practice first.'
  if (!h.list?.length) return 'The list is blank.'
  if (h.acceptRehearsal && h.acceptRehearsalUntil <= s.time) return 'Rehearsal already complete.'
  if (h.acceptRehearsal && h.acceptRehearsalUntil > s.time) {
    return `Rehearsal cooling (${Math.ceil(h.acceptRehearsalUntil - s.time)}s).`
  }
  if (!h.acceptRehearsal && h.acceptRehearsalUntil > s.time) {
    return `Rehearsal retry in ${Math.ceil(h.acceptRehearsalUntil - s.time)}s.`
  }
  return null
}

/**
 * Practice the Accept. Below the 0.85 mean it always misses; at or above it misses on the RNG.
 * A miss scratches the weakest filled line and leaves a retry gap. A hit starts the desk gap.
 */
export function rehearseAccept(s: GameState): string | null {
  const why = canRehearseAccept(s)
  if (why) return why
  const h = s.horizon
  const list = h.list ?? []
  const short = h.listScore + 1e-9 < HORIZON.listAcceptScore
  const miss = short || chance(s, rehearsalMissChance(s))
  if (miss) {
    let idx = -1
    for (let i = 0; i < list.length; i++) {
      const line = list[i]!
      if (!line.filled) continue
      if (idx < 0 || line.score < list[idx]!.score) idx = i
    }
    if (idx >= 0) {
      const line = list[idx]!
      line.filled = ''
      line.score = 0
      refreshListScore(s)
    }
    h.rehearsalScratch = idx
    h.acceptRehearsal = false
    h.acceptRehearsalUntil = s.time + HORIZON.rehearsalRetrySec
    log(
      s,
      idx >= 0
        ? `Rehearsal missed${short ? ' — the list was short of 0.85' : ''}. Line ${idx + 1} scratched; refill it.`
        : 'Rehearsal missed. Nothing on the list to scratch.',
      'warn',
    )
    return null
  }
  h.rehearsalScratch = -1
  h.acceptRehearsal = true
  const gap =
    HORIZON.acceptRehearsalSec * (1 - Math.min(0.35, upgradeEffect(s, 'accept-rehearsal-pad')))
  h.acceptRehearsalUntil = s.time + gap
  log(s, 'Practice run done. Take a moment before you Accept.', 'good')
  return null
}

/** The agent holding the posted habit (null while nobody matched or the post is stale). */
export function postedAgentId(s: GameState): number | null {
  const post = ensureHorizon(s).postedHabit
  if (!post || post.agentId == null) return null
  return s.horizon.watchUntil > 0 ? post.agentId : null
}

/** Post the phrase habit for this watch and lock the first agent already on it. */
export function postHabitWatch(s: GameState, habit: AgentHabit, until: number) {
  const h = ensureHorizon(s)
  const agent = h.agents.find((a) => a.habit === habit)
  h.postedHabit = { habit, until, agentId: agent?.id ?? null }
  log(
    s,
    agent
      ? `${agent.name} posted on ${habit} until the watch resolves.`
      : `Watch posted for ${habit}. Put an agent on it before the watch ends.`,
    'info',
  )
}

/** Finish habit watches when ETA elapses — only if the posted agent still holds the phrase habit. */
export function tickHorizonVerbs(s: GameState) {
  const h = ensureHorizon(s)
  if (h.watchUntil > 0 && s.time >= h.watchUntil) {
    h.watchUntil = 0
    const post = h.postedHabit
    h.postedHabit = null
    const need = post?.habit ?? h.phrase?.habit
    const holder = post?.agentId != null ? h.agents.find((a) => a.id === post.agentId) : null
    const matched = !need || (holder ? holder.habit === need : h.agents.some((a) => a.habit === need))
    if (matched) {
      h.watchedPhrases = (h.watchedPhrases ?? 0) + 1
      markStandardFile(s)
      log(s, `Habit watch done ${h.watchedPhrases}/${HORIZON.habitWatchNeed}.`, 'good')
      maybeOpenEras(s)
    } else {
      // Missed watch: nudge a world's local price and do not credit the gate.
      const world = h.planets.find((p) => p.id === h.phrase?.planetId) ?? h.planets[0]
      if (world) {
        world.localPrice = Math.max(0.5, (world.localPrice ?? 1) * 0.94)
      }
      log(s, 'Habit watch failed — agent habit did not match the phrase.', 'warn')
    }
  }
}

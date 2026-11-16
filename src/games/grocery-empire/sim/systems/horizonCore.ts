/**
 * Shared horizon ensure/credit helpers. Imported by horizon.ts, horizonVerbs.ts and
 * horizonTick.ts so none of them need to reach back into the puzzle filing file for state repair.
 */

import { emptyHearing, emptyPractice, type PracticeLayer } from '../../content/depth'
import { CLAUSE_BY_ID, SEASON_CHORES, emptyHorizon, type HorizonState, type SeasonChore } from '../../content/horizon'
import { HORIZON } from '../balance'
import { clamp, log, queueDialogue } from '../helpers'
import type { GameState } from '../state'

export const SEED_CAP = HORIZON.seedCap

export function say(s: GameState, ...ids: string[]) {
  for (const id of ids) if (id) queueDialogue(s, id)
}

export function finite(n: number, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

export function markDeptStaffed(s: GameState, dept: string) {
  if (!s.depth) return
  if (!s.depth.deptEverStaffed) s.depth.deptEverStaffed = {}
  s.depth.deptEverStaffed[dept] = true
}

export function ensureHorizon(s: GameState): HorizonState {
  if (!s.horizon) s.horizon = emptyHorizon()
  const h = s.horizon
  if (!Array.isArray(h.planets)) h.planets = []
  if (!Array.isArray(h.circuits)) h.circuits = []
  if (!Array.isArray(h.plots)) h.plots = []
  if (!Array.isArray(h.agents)) h.agents = []
  if (!Array.isArray(h.agentLog)) h.agentLog = []
  if (!Array.isArray(h.clauses)) h.clauses = []
  if (!Array.isArray(h.phraseScores)) h.phraseScores = []
  if (!Array.isArray(h.seenHeadlines)) h.seenHeadlines = []
  if (!Array.isArray(h.aids)) h.aids = []
  if (!h.keel) h.keel = { convoys: 0, frozenUntil: 0, bought: false }
  if (!h.deputy || typeof h.deputy !== 'object') h.deputy = {}
  if (!h.deputyAt || typeof h.deputyAt !== 'object') h.deputyAt = {}
  if (!h.agentAt || typeof h.agentAt !== 'object') h.agentAt = {}
  if (typeof h.greenhouses !== 'number') h.greenhouses = 0
  if (typeof h.relays !== 'number') h.relays = 0
  if (typeof h.clauseToggles !== 'number') h.clauseToggles = 0
  if (typeof h.buildQueue === 'undefined') h.buildQueue = null
  if (typeof h.nextPhraseAt !== 'number') h.nextPhraseAt = 0
  if (typeof h.nextHeadlineAt !== 'number') h.nextHeadlineAt = 0
  if (typeof h.nextKeelAt !== 'number') h.nextKeelAt = 0
  if (typeof h.weakYears !== 'number') h.weakYears = 0
  if (typeof h.seasonHandSaves !== 'number') h.seasonHandSaves = 0
  if (typeof h.namedBest !== 'number') h.namedBest = 0
  if (typeof h.perfectPhrases !== 'number') h.perfectPhrases = 0
  if (typeof h.phraseHabitMatch !== 'boolean') h.phraseHabitMatch = false
  if (typeof h.listMutations !== 'number') h.listMutations = 0
  if (typeof h.minutesAmends !== 'number') h.minutesAmends = 0
  if (typeof h.hearingClause === 'undefined') h.hearingClause = null
  if (typeof h.seasonChore === 'undefined') h.seasonChore = null
  if (typeof h.climateServed !== 'number') h.climateServed = 0
  if (typeof h.nextClimateAt !== 'number') h.nextClimateAt = 0
  if (typeof h.climateGuest === 'undefined') h.climateGuest = null
  if (typeof h.settlements !== 'number') h.settlements = 0
  if (typeof h.settlementUntil !== 'number') h.settlementUntil = 0
  if (typeof h.pendingStop === 'undefined') h.pendingStop = null
  if (typeof h.bedLockedChore === 'undefined') h.bedLockedChore = null
  if (typeof h.haulsDone !== 'number') h.haulsDone = 0
  if (typeof h.haulUntil !== 'number') h.haulUntil = 0
  if (typeof h.watchedPhrases !== 'number') h.watchedPhrases = 0
  if (typeof h.watchUntil !== 'number') h.watchUntil = 0
  if (typeof h.seatingsDone !== 'number') h.seatingsDone = 0
  if (typeof h.seatingUntil !== 'number') h.seatingUntil = 0
  if (typeof h.seatingGapUntil !== 'number') h.seatingGapUntil = 0
  if (typeof h.postedHabit === 'undefined') h.postedHabit = null
  if (typeof h.seatingClause === 'undefined') h.seatingClause = null
  if (!Array.isArray(h.seatedClauses)) h.seatedClauses = []
  if (!Array.isArray(h.heardClauses)) h.heardClauses = []
  if (!Array.isArray(h.amendedClauses)) h.amendedClauses = []
  if (typeof h.rehearsalScratch !== 'number') h.rehearsalScratch = -1
  if (typeof h.acceptRehearsal !== 'boolean') h.acceptRehearsal = false
  if (typeof h.acceptRehearsalUntil !== 'number') h.acceptRehearsalUntil = 0
  h.survey = clamp(finite(h.survey), 0, HORIZON.surveyCap)
  h.freight = clamp(finite(h.freight), 0, HORIZON.freightCap)
  h.signal = clamp(finite(h.signal), 0, HORIZON.signalCap)
  h.seal = clamp(finite(h.seal), 0, HORIZON.sealCap)
  h.seed = clamp(finite(h.seed), 0, SEED_CAP)
  return h
}

export function ensurePractice(s: GameState) {
  if (!s.depth) return emptyPractice()
  if (!s.depth.practice) s.depth.practice = emptyPractice()
  for (const layer of ['planogram', 'convoy', 'cross', 'phrase', 'list'] as const) {
    const row = s.depth.practice[layer]
    if (!row || typeof row.left !== 'number' || typeof row.credited !== 'number') {
      s.depth.practice[layer] = { left: HORIZON.practicePerLayer, credited: 0 }
    } else {
      row.left = Math.max(0, Math.floor(row.left))
      row.credited = Math.max(0, Math.floor(row.credited))
    }
  }
  return s.depth.practice
}

export function ensureHearing(s: GameState) {
  if (!s.depth) return emptyHearing(3)
  if (!s.depth.hearing) {
    const needed: 2 | 3 =
      s.depth.hearingAnswered ? 2 : hearingNeededFor(s)
    s.depth.hearing = emptyHearing(needed)
    if (s.depth.hearingAnswered) {
      s.depth.hearing.answered = s.depth.hearing.needed
    }
    if (s.horizon?.hearingClause) {
      s.depth.hearing.pendingClause = s.horizon.hearingClause
      s.depth.hearing.sessions = Math.max(1, s.depth.hearing.sessions)
    }
  }
  const h = s.depth.hearing
  h.sessions = Math.max(0, Math.floor(h.sessions))
  h.answered = Math.max(0, Math.floor(h.answered))
  h.needed = h.needed === 2 ? 2 : 3
  if (h.pendingClause != null && typeof h.pendingClause !== 'string') h.pendingClause = null
  s.depth.hearingAnswered = h.answered >= h.needed
  return h
}

function hearingNeededFor(s: GameState): 2 | 3 {
  const span = HORIZON.hearingNeededMax - HORIZON.hearingNeededMin
  const pick = HORIZON.hearingNeededMin + (Math.abs(s.seed | 0) % (span + 1))
  return pick <= 2 ? 2 : 3
}

/**
 * First practicePerLayer filings per layer do not credit era gates.
 * Returns true when this filing increments the credited counter.
 */
export function creditPracticeFiling(s: GameState, layer: PracticeLayer): boolean {
  const bucket = ensurePractice(s)[layer]
  if (bucket.left > 0) {
    bucket.left -= 1
    log(s, `Practice ${layer} filed — ${bucket.left} practice left.`, 'info')
    return false
  }
  bucket.credited += 1
  return true
}

export function markStandardFile(s: GameState) {
  if (s.depth) s.depth.lastStandardFileAt = s.time
}

export function expectedSeasonChore(s: GameState): SeasonChore {
  const season = ensureHorizon(s).season
  return SEASON_CHORES[season % SEASON_CHORES.length] ?? 'water'
}

/**
 * The clause Concord's next hearing asks about: the first seated clause not yet heard.
 * Pre-SAVE-35 saves seated without a record, so they fall back to a kept clause.
 */
export function nextHearingClause(s: GameState): string | null {
  const h = ensureHorizon(s)
  const seated = h.seatedClauses.find((id) => !h.heardClauses.includes(id))
  if (seated) return seated
  if ((h.seatingsDone ?? 0) > h.seatedClauses.length) {
    return h.clauses.find((id) => !h.heardClauses.includes(id) && !h.seatedClauses.includes(id)) ?? null
  }
  return null
}

/** Concord files a hearing on `clause`. Caller checks the docket is open and nothing is pending. */
export function openHearingSession(s: GameState, clause: string) {
  const docket = ensureHearing(s)
  const h = ensureHorizon(s)
  docket.sessions += 1
  docket.pendingClause = clause
  h.hearingClause = clause
  h.minutesAmends = 0
  if (!h.heardClauses.includes(clause)) h.heardClauses.push(clause)
  if (s.depth) s.depth.hearingAnswered = false
  log(
    s,
    `Concord put ${CLAUSE_BY_ID[clause]?.name ?? clause} to hearing ${docket.sessions}/${docket.needed}. Answer before you sign.`,
    'warn',
  )
}

/** Docket still wants a session and none is on the table. */
export function hearingSessionOpen(s: GameState): boolean {
  const docket = ensureHearing(s)
  if (s.rivals?.concord?.bought) return false
  return docket.answered < docket.needed && !docket.pendingClause && !ensureHorizon(s).hearingClause
}

export function hearingDocketClear(s: GameState): boolean {
  const h = ensureHearing(s)
  // Buying out Concord folds the remaining docket.
  if (s.rivals?.concord?.bought && h.answered < h.needed && !h.pendingClause) {
    h.answered = h.needed
    s.depth!.hearingAnswered = true
  }
  return h.answered >= h.needed && !h.pendingClause
}

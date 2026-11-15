import { REGULAR_BY_ID, pickNextRegular, type ShiftSlot } from '../../content/depth'
import { DEPTH } from '../balance'
import { log, round2, sumQty } from '../helpers'
import type { GameState } from '../state'

function clampStars(n: number) {
  return Math.max(DEPTH.starsMin, Math.min(DEPTH.starsMax, round2(n)))
}

/** Star Board freezes for the duration of ration week. */
export function starsFrozen(s: GameState): boolean {
  const until = s.depth?.rationWeekUntil ?? 0
  return s.era >= 6 && until > 0 && s.time < until
}

export function currentShiftSlot(s: GameState): ShiftSlot {
  const daySec = DEPTH.shiftDaySec
  const phase = ((s.time % daySec) + daySec) % daySec / daySec
  if (phase < 1 / 3) return 'open'
  if (phase < 2 / 3) return 'mid'
  return 'close'
}

export function shiftStaffIds(s: GameState, slot: ShiftSlot): number[] {
  const sh = s.depth?.shifts
  if (!sh) return []
  return sh[slot] ?? []
}

export function openShiftCovered(s: GameState): boolean {
  return (s.depth?.shifts?.open?.length ?? 0) > 0
}

/** Unstaffed Open while the store is in the Open third of the day. */
export function openUnstaffedNow(s: GameState): boolean {
  return currentShiftSlot(s) === 'open' && !openShiftCovered(s) && (s.depth?.open !== false)
}

export function regularWantsMet(s: GameState, regularId: string): boolean {
  const def = REGULAR_BY_ID[regularId]
  if (!def) return false
  for (const cat of def.wants) {
    if (!s.categories[cat]) return false
    if (sumQty(s.shelf, cat) <= 0) return false
  }
  if (def.facingId) {
    let facingOk = false
    for (const cat of def.wants) {
      if (s.depth?.facings?.[cat] === def.facingId) facingOk = true
    }
    if (!facingOk) return false
  }
  return true
}

function clearActive(s: GameState) {
  s.depth.regulars.activeId = null
  s.depth.regulars.arrivesAt = 0
  s.depth.regulars.patienceUntil = 0
  s.depth.regulars.layaway = false
}

export function resolveRegular(s: GameState, satisfied: boolean) {
  if (!s.depth) return
  const id = s.depth.regulars.activeId
  if (!id) return
  const def = REGULAR_BY_ID[id]
  const wasLayaway = !!s.depth.regulars.layaway
  s.depth.regulars.seen[id] = (s.depth.regulars.seen[id] ?? 0) + 1
  if (satisfied) {
    s.depth.regularSatisfied += 1
    if (wasLayaway) {
      s.depth.layawaySlips = (s.depth.layawaySlips ?? 0) + 1
      log(s, `${def?.name ?? 'A regular'} claimed their layaway slip.`, 'good')
    } else {
      log(s, `${def?.name ?? 'A regular'} left happy.`, 'good')
    }
    if (!starsFrozen(s)) s.depth.stars = clampStars(s.depth.stars + DEPTH.starServeBump)
  } else if (sumQty(s.shelf) <= 0) {
    // Bare shelf: no-show, no star hit — restock is the real cost.
    log(s, `${def?.name ?? 'A regular'} walked past an empty shelf.`, 'info')
  } else {
    if (!starsFrozen(s)) s.depth.stars = clampStars(s.depth.stars - DEPTH.starMissHit)
    s.depth.regularMissUntil = s.time + DEPTH.regularMissDemandSec
    log(s, `${def?.name ?? 'A regular'} left disappointed.`, 'warn')
  }
  clearActive(s)
  // Layaway visits use the longer gap so slips cannot skim beside auto traffic.
  const gap = wasLayaway ? DEPTH.layawayVisitGapSec : DEPTH.regularVisitGapSec
  s.depth.regulars.arrivesAt = s.time + gap
}

/** Manual or auto serve when shelf + facing match. */
export function tryServeRegular(s: GameState): boolean {
  if (!s.depth?.regulars?.activeId) return false
  if (!regularWantsMet(s, s.depth.regulars.activeId)) return false
  resolveRegular(s, true)
  return true
}

export function tickRegulars(s: GameState, dt: number) {
  if (!s.depth) return
  const r = s.depth.regulars
  // Drift stars back toward the start band when the door is open and stocked.
  // Ration week freezes the Star Board (no regen / lock display).
  if (
    !starsFrozen(s) &&
    s.depth.open !== false &&
    sumQty(s.shelf) > 0 &&
    s.depth.stars < DEPTH.starsStart
  ) {
    s.depth.stars = clampStars(s.depth.stars + DEPTH.starRegenPerSec * dt)
  }
  if (starsFrozen(s) && s.depth.starsFrozenAt != null) {
    s.depth.stars = s.depth.starsFrozenAt
  }
  // First visit schedule
  if (r.arrivesAt <= 0 && !r.activeId) {
    r.arrivesAt = s.time + DEPTH.regularVisitGapSec * 0.5
  }
  if (r.activeId) {
    // Layaway visits never auto-serve — player/bot must push serveRegular.
    if (!r.layaway && tryServeRegular(s)) return
    if (s.time >= r.patienceUntil) {
      resolveRegular(s, false)
    }
    return
  }
  if (s.time < r.arrivesAt) return
  // Don't spawn onto a bare shelf — wait for stock.
  if (sumQty(s.shelf) <= 0) {
    r.arrivesAt = s.time + Math.min(30, DEPTH.regularVisitGapSec * 0.25)
    return
  }
  const def = pickNextRegular(s.seed, s.time, s.categories, r.seen)
  r.activeId = def.id
  r.arrivesAt = s.time
  r.patienceUntil = s.time + DEPTH.regularPatienceSec
  // Deterministic layaway cadence: every visit after the first is a slip.
  const visits = Object.values(r.seen).reduce((n, v) => n + v, 0)
  r.layaway = visits >= 1
}

function midHasOrbit(s: GameState): boolean {
  const mid = s.depth?.shifts?.mid ?? []
  return mid.some((id) => {
    const m = s.staff.find((x) => x.id === id)
    return m != null && (m.role === 'pilot' || m.role === 'steward' || m.role === 'hullTech')
  })
}

export function tickShifts(s: GameState) {
  if (!s.depth) return
  const sh = s.depth.shifts
  if (sh.daysCoveredMidOrbit == null) sh.daysCoveredMidOrbit = 0
  const day = Math.floor(s.time / DEPTH.shiftDaySec)
  if (day > sh.lastRolloverDay) {
    // Count days where Open had someone assigned.
    if (day > 0 && sh.open.length > 0) {
      sh.daysCoveredOpen += day - sh.lastRolloverDay
    }
    if (day > 0 && midHasOrbit(s)) {
      sh.daysCoveredMidOrbit += day - sh.lastRolloverDay
      s.depth.orbitMidOnce = true
    }
    const boardIds = [...sh.open, ...sh.mid, ...sh.close]
    if (
      boardIds.some((id) => {
        const m = s.staff.find((x) => x.id === id)
        return m?.role === 'surveyor' || m?.role === 'planogramClerk'
      })
    ) {
      s.depth.surveyShiftOnce = true
    }
    sh.lastRolloverDay = day
  }
  // Drop fired staff from boards
  const alive = new Set(s.staff.map((m) => m.id))
  for (const slot of DEPTH.shiftSlots) {
    sh[slot] = sh[slot].filter((id) => alive.has(id))
  }
  // Safety prune: never let paid invoices accumulate across ticks.
  if (s.depth.invoices.length > DEPTH.invoiceUnpaidCap * 2) {
    s.depth.invoices = s.depth.invoices.filter((i) => !i.paid)
  }
}

export function applyStarHit(s: GameState, amount: number) {
  if (!s.depth) return
  if (starsFrozen(s)) return
  s.depth.stars = clampStars(s.depth.stars - amount)
}

export function resetFlagshipPracticeForEra(s: GameState) {
  if (!s.depth?.flagship) return
  s.depth.flagship.practiceLeft = DEPTH.flagshipPracticePerEra
  s.depth.flagship.credited = false
}

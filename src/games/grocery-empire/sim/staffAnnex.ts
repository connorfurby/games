/**
 * Worlds annex staffing. Floor roles use STAFF_SEATS; the seven annex roles
 * (surveyor … diplomat) sit in their own seat pool. Kept import-light so the
 * horizon system, formulas and UI can all read it without a cycle.
 */
import { ROLES, isDeptRole, isHorizonRole, type RoleId } from '../content/staff'
import { LATE } from './balance'
import type { GameState } from './state'

/** Seats in the annex: a base room plus a bonus per storefront tier past the Hub (Probe Plaza, Atrium, Last Aisle). */
export function annexSeatCap(s: GameState): number {
  const front = Math.max(0, Math.floor(s.builds?.storefront ?? 1))
  return LATE.annexSeatsBase + Math.max(0, front - 7) * LATE.annexSeatsPerPlaza
}

export function annexHeadcount(s: GameState): number {
  let n = 0
  for (const m of s.staff) if (isHorizonRole(m.role)) n++
  return n
}

export function floorHeadcount(s: GameState): number {
  let n = 0
  for (const m of s.staff) if (!isHorizonRole(m.role) && !isDeptRole(m.role)) n++
  return n
}

/** Why an annex hire is blocked, or null. */
export function annexSeatBlock(s: GameState): string | null {
  const cap = annexSeatCap(s)
  if (annexHeadcount(s) >= cap) {
    return `Annex seats full (${cap}). Build Probe Plaza or the Atrium for more.`
  }
  return null
}

/** Sum of staff levels for one role. A level-5 taster counts five. */
export function roleLevels(s: GameState, role: RoleId): number {
  let n = 0
  for (const m of s.staff) if (m.role === role) n += Math.max(1, m.level)
  return n
}

/** Added to a plot's match score when tasters are on the clock. */
export function tasterMatchBonus(s: GameState): number {
  return LATE.tasterMatchPerLevel * roleLevels(s, 'taster')
}

/** Share cut from a clause toggle's seal cost by diplomats. */
export function diplomatSealCut(s: GameState): number {
  return Math.min(LATE.diplomatSealCutCap, LATE.diplomatSealCutPerLevel * roleLevels(s, 'diplomat'))
}

/** Multiplier on embassy seal income from diplomats. */
export function diplomatEmbassyMul(s: GameState): number {
  return 1 + LATE.diplomatEmbassySealPerLevel * roleLevels(s, 'diplomat')
}

/** Passive pace multiplier for a role's trickle (survey, freight, seed, signal). */
export function annexPaceMul(s: GameState, role: RoleId): number {
  return 1 + LATE.horizonPacePerLevel * roleLevels(s, role)
}

/** Deputy cooldown multiplier for one member (≤ 1). Levels shorten the wait, never past the floor. */
export function deputyCooldownMul(level: number): number {
  return Math.max(LATE.horizonPaceFloor, 1 / (1 + LATE.horizonPacePerLevel * Math.max(1, level)))
}

/** Agent wait multiplier (≤ 1): handlers keep the desk brisk. */
export function handlerWaitMul(s: GameState): number {
  return Math.max(LATE.horizonPaceFloor, 1 / annexPaceMul(s, 'handler'))
}

/**
 * Annex staff that are doing something right now, by staff id. Deputies light up for the
 * length of their cooldown after they act; tasters while beds are planted; handlers while an
 * agent is on the desk; diplomats while an embassy is open.
 */
export function annexWorkingIds(s: GameState): number[] {
  const h = s.horizon
  if (!h) return []
  const out: number[] = []
  for (const m of s.staff) {
    if (!isHorizonRole(m.role)) continue
    let on = false
    switch (m.role) {
      case 'surveyor':
      case 'broker':
      case 'grower':
      case 'translator':
        on = !!(h.deputy?.[m.id] || m.deputy) && s.time < (h.deputyAt?.[m.id] ?? 0)
        break
      case 'taster':
        on = !!h.taster && (h.plots ?? []).some((p) => p.child.length > 0)
        break
      case 'handler':
        on = (h.agents?.length ?? 0) > 0
        break
      case 'diplomat':
        on = (h.embassies ?? 0) > 0
        break
    }
    if (on) out.push(m.id)
  }
  return out
}

export interface AnnexRecommendation {
  role: RoleId
  /** One sentence for the callout. */
  why: string
}

/**
 * The annex hire that would clear the Worlds bottleneck, or null. First match wins, in the
 * order the desks open. Skips roles that are not open yet or that you already staff.
 */
export function annexRecommendation(s: GameState): AnnexRecommendation | null {
  const h = s.horizon
  if (!h || s.era < 7) return null
  const has = (role: RoleId) => s.staff.some((m) => m.role === role)
  const open = (role: RoleId) => !ROLES[role].era || s.era >= ROLES[role].era
  const stocked = (h.planets ?? []).filter((p) => p.stocked).length
  const planted = (h.plots ?? []).some((p) => p.child.length > 0)
  const picks: [RoleId, boolean, string][] = [
    ['surveyor', stocked < 8, 'Worlds are waiting on probes. A surveyor’s deputy launches them for you.'],
    ['planogramClerk', stocked >= 1 && stocked < 6, 'A Planogram Clerk proposes a 0.85 shelf for the fast gate.'],
    ['broker', (h.circuits ?? []).length > 0 || !!h.standingRoute, 'A standing route needs refiling. A broker’s deputy keeps the circuit.'],
    ['stevedore', (h.circuits ?? []).length > 0, 'A Stevedore makes a 0.85 packing stick.'],
    ['grower', (h.plots ?? []).length > 0, 'Empty beds waste the season. A grower’s deputy files the cross.'],
    ['seasonHand', (h.seasonsSeen ?? 0) >= 1, 'A Season Hand saves one missed chore per year.'],
    ['taster', planted, 'Planted beds score higher with a taster on the bench.'],
    ['translator', (h.relays ?? 0) > 0, 'Phrases on the wire go stale. A translator’s deputy files the standard.'],
    ['nightOperator', (h.relays ?? 0) > 0, 'Night-only phrases need a Night Operator or a closed store.'],
    ['handler', (h.agents ?? []).length >= 1, 'The desk is capped. A handler raises how many agents it can keep.'],
    ['diplomat', (h.embassies ?? 0) > 0 || !!h.charter, 'Clause toggles cost seal. A diplomat cuts the price and speeds the table.'],
    ['minutesClerk', !!h.hearingClause, 'A Minutes Clerk can amend a heard clause’s grudge away.'],
    ['whip', (s.politics?.acquisitions ?? 0) >= 1, 'A Council Whip holds scrutiny while seats sit empty of diplomats.'],
  ]
  for (const [role, needed, why] of picks) {
    if (needed && open(role) && !has(role)) return { role, why }
  }
  return null
}

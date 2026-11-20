import { STAFF_TRAITS, type RoleId } from '../content/staff'
import { STAFF_POWER, UNPACK } from './balance'
import type { GameState } from './state'

/**
 * Crew strength, in one leaf module (no formulas import) so every system — the store,
 * the town, the company — can read it without import cycles.
 */

/** Roles a Shift Lead lifts. */
const FLOOR_ROLES = new Set<RoleId>(['clerk', 'stocker', 'cashier', 'security', 'receiver', 'night', 'shiftLead', 'greeter', 'buyer'])

export function crewCount(s: GameState, role: RoleId): number {
  let n = 0
  for (const m of s.staff) if (m.role === role) n++
  return n
}

/** +4% for each Shift Lead on the clock, the first three count. */
export function leadMul(s: GameState): number {
  return 1 + Math.min(STAFF_POWER.leadMax, crewCount(s, 'shiftLead')) * STAFF_POWER.leadBonus
}

/** Sum of members' strength: level, trait, and Shift Lead lift for floor roles. */
export function crewStrength(s: GameState, role: RoleId): number {
  let n = 0
  for (const m of s.staff) {
    if (m.role !== role) continue
    const trait = m.traitId && STAFF_TRAITS[m.traitId] ? STAFF_TRAITS[m.traitId].strengthMul : 1
    n += (1 + UNPACK.levelBonus * (m.level - 1)) * trait
  }
  return FLOOR_ROLES.has(role) && n > 0 ? n * leadMul(s) : n
}

/** A saturating effect: the first hires matter most. 0 with nobody in the role. */
export function crewEffect(s: GameState, role: RoleId, k: { per: number; cap: number }): number {
  const st = crewStrength(s, role)
  if (st <= 0) return 0
  return k.cap * (1 - Math.exp((-k.per * st) / k.cap))
}

/** Soft strength cap (for roles that count bodies, e.g. receivers). */
export function softStrength(s: GameState, role: RoleId, cap: number): number {
  const st = crewStrength(s, role)
  return cap * (1 - Math.exp(-st / cap))
}

/**
 * Department staffing. Floor roles use STAFF_SEATS; annex uses staffAnnex;
 * dept roles sit in their own seat pools.
 */
import { DEPARTMENT_BY_ID } from '../content/depth'
import { isDeptRole, type RoleId } from '../content/staff'
import { DEPTH } from './balance'
import type { GameState } from './state'

export function deptSeatCap(s: GameState, deptId = 'fresh'): number {
  const def = DEPARTMENT_BY_ID[deptId]
  if (!def) return 0
  if (deptId === 'fresh') return DEPTH.freshSeats.lead + DEPTH.freshSeats.specialists
  if (deptId === 'chain') return Math.max(1, Math.ceil(Math.max(1, s.stores.length) / 2))
  return def.seatCap
}

export function deptHeadcount(s: GameState, deptId = 'fresh'): number {
  const def = DEPARTMENT_BY_ID[deptId]
  if (!def) return 0
  const roles = new Set<string>([def.leadRole, ...def.specialistRoles])
  let n = 0
  for (const m of s.staff) if (roles.has(m.role)) n++
  return n
}

export function deptSeatBlock(s: GameState, role: RoleId): string | null {
  if (!isDeptRole(role)) return null
  const dept = Object.values(DEPARTMENT_BY_ID).find(
    (d) => d.leadRole === role || d.specialistRoles.includes(role),
  )
  if (!dept) return null
  if (s.era < dept.era) return `${dept.name} opens in Era ${dept.era}.`
  const cap = deptSeatCap(s, dept.id)
  if (deptHeadcount(s, dept.id) >= cap) {
    return `${dept.name} seats full (${cap}).`
  }
  if (role === 'dairyClerk' && !s.categories.dairy) return 'Unlock dairy first.'
  if (role === 'butcher' && !s.categories.meat) return 'Unlock meat first.'
  if (role === 'coldDriver' && s.cold.plants < 1) return 'Build a cold plant first.'
  return null
}

/** Keep department runtime pointers in sync after hire / fire / promote. */
export function syncDeptRoster(s: GameState) {
  if (!s.depth) return
  for (const def of Object.values(DEPARTMENT_BY_ID)) {
    let slot = s.depth.departments[def.id]
    if (!slot) {
      slot = { leadId: null, specialistIds: [], policy: null }
      s.depth.departments[def.id] = slot
    }
    const lead = s.staff.find((m) => m.role === def.leadRole)
    slot.leadId = lead?.id ?? null
    slot.specialistIds = s.staff
      .filter((m) => (def.specialistRoles as readonly string[]).includes(m.role))
      .map((m) => m.id)
  }
}

/** True when Chain dept has enough managers for the store count. */
export function chainStaffedEnough(s: GameState): boolean {
  if (s.era < 2) return true
  const need = deptSeatCap(s, 'chain')
  return deptHeadcount(s, 'chain') >= Math.min(need, 1)
}

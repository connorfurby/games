import { HORIZON_ROLE_IDS, ROLES, type RoleId } from '../../content/staff'
import { MENUS, type MenuId } from '../../content/menus'
import type { GameState } from '../../sim/state'
import type { OutlookLine } from '../../sim/staffOutlook'
import { pct, rate } from '../format'

/** How the hire desk is grouped, top to bottom. */
export const CREW_GROUPS: { id: string; name: string; blurb: string; roles: RoleId[] }[] = [
  { id: 'floor', name: 'Floor', blurb: 'Hands in the aisles.', roles: ['clerk', 'stocker', 'cashier', 'security', 'receiver', 'night'] },
  { id: 'fresh', name: 'Fresh', blurb: 'Keeps perishables selling.', roles: ['produceLead', 'dairyClerk', 'butcher'] },
  {
    id: 'office',
    name: 'Office and town',
    blurb: 'Floor seats that work for the rest of the business.',
    roles: ['greeter', 'buyer', 'communityRep', 'trainer', 'bookkeeper', 'paralegal', 'hrManager', 'spokesperson', 'franchiseScout'],
  },
  {
    id: 'dept',
    name: 'Departments',
    blurb: 'Their own seats, one desk each.',
    roles: ['storeManager', 'plantOperator', 'coldDriver', 'lobbyistPerson', 'dispatcher', 'franchiseLiaison', 'purser', 'pilot', 'steward', 'hullTech'],
  },
  { id: 'annex', name: 'Worlds annex', blurb: 'Desks for the worlds; annex seats.', roles: [...HORIZON_ROLE_IDS] },
]

/** Why a role can't be hired yet (era, memo or a screen), or null when it can. */
export function roleLock(s: GameState, role: RoleId): string | null {
  const def = ROLES[role]
  if (role === 'shiftLead') return 'Promote a clerk.'
  if (def.era && s.era < def.era) return `Era ${def.era}`
  if (role === 'night' && !s.memos['night-latch']) return 'Night Latch memo'
  if (def.needsMenu && !s.menus[def.needsMenu as MenuId]) return `opens with ${MENUS[def.needsMenu as MenuId]?.name ?? def.needsMenu}`
  return null
}

/** One outlook line in plain words, e.g. "Checkout 1.25/s → 3.12/s" or "Spoilage −15%". */
export function lineText(l: OutlookLine): string {
  switch (l.kind) {
    case 'rate':
      return `${l.label} ${rate(l.before)} → ${rate(l.after)}`
    case 'pct': {
      if (Math.abs(l.before) < 1e-9) return `${l.label} +${pct(l.after)}`
      const d = l.after / l.before - 1
      return `${l.label} ${d >= 0 ? '+' : '−'}${pct(Math.abs(d))}`
    }
    case 'sec':
      return `${l.label} ${l.before.toFixed(1)}s → ${l.after.toFixed(1)}s`
    case 'level':
    case 'count':
      return `${l.label} ${Math.round(l.before)} → ${Math.round(l.after)}`
  }
}

/** Is this line a gain for the store? */
export function lineGood(l: OutlookLine): boolean {
  return l.up ? l.after > l.before : l.after < l.before
}

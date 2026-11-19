import type { MenuId } from '../../content/menus'
import { CO, CORP } from '../balance'
import type { GameState } from '../state'
import { corpOf, salesRate } from './core'
import { tickCompany } from './company'
import { tickRivalry } from './rivalry'
import { tickCourt } from './court'
import { tickTreasury } from './treasury'
import { tickTown } from './town'
import { tickMore } from './more'
import { tickMarket } from './market'
import { tickAmbitions } from './ambitions'

export function companyOpen(s: GameState): boolean {
  return s.era >= 2 || (s.era >= 1 && s.lifetimeRevenue >= CORP.openRevenue)
}

/**
 * When each company and town screen opens. Early eras get the friendly ones (giving,
 * customers, a first investor); the sharp tools (bonds, executives, franchises) come
 * once the store can carry them.
 */
export const CORP_OPENS: { id: MenuId; when: (s: GameState) => boolean; why: string }[] = [
  { id: 'foundation', when: (s) => s.era >= 1 && s.lifetimeRevenue >= CORP.openRevenue, why: `Era 1, after ${CORP.openRevenue} in sales` },
  { id: 'customers', when: (s) => s.era >= 1 && s.lifetimeRevenue >= CORP.openRevenue * 4, why: 'Era 1, a little later' },
  { id: 'boardroom', when: (s) => s.era >= 2 || (s.era >= 1 && s.lifetimeRevenue >= CO.offerRevenue), why: 'when investors start to notice (late Era 1)' },
  { id: 'market', when: (s) => s.era >= 2, why: 'Era 2' },
  { id: 'court', when: (s) => s.era >= 2 || (s.corp?.suits.length ?? 0) > 0, why: 'Era 2 (or your first lawsuit)' },
  { id: 'cityhall', when: (s) => s.era >= 3 || (s.era >= 2 && s.lifetimeRevenue >= CO.offerRevenue * 200), why: 'early Era 2' },
  { id: 'press', when: (s) => s.era >= 3 || (s.era >= 2 && s.lifetimeRevenue >= CO.offerRevenue * 1e4), why: 'mid Era 2, once the papers care' },
  { id: 'lab', when: (s) => s.era >= 3 || (s.era >= 2 && s.lifetimeRevenue >= CO.offerRevenue * 1e6), why: 'later in Era 2' },
  { id: 'union', when: (s) => !!s.corp?.town.union.formed, why: 'when your crew reaches eight' },
  { id: 'treasury', when: (s) => s.era >= 3 || (s.era >= 2 && s.lifetimeRevenue >= CO.offerRevenue * 1e7), why: 'late Era 2' },
  { id: 'execs', when: (s) => s.era >= 3, why: 'Era 3' },
  { id: 'property', when: (s) => s.era >= 4 || (s.era >= 3 && s.lifetimeRevenue >= CO.offerRevenue * 2e9), why: 'later in Era 3' },
  { id: 'franchise', when: (s) => s.era >= 4, why: 'Era 4' },
]

export function corpMenusOpen(s: GameState): MenuId[] {
  return CORP_OPENS.filter((o) => o.when(s)).map((o) => o.id)
}

/** The company layer ticks once per simulated second. */
export function tickCorp(s: GameState, dt: number) {
  const c = corpOf(s)
  c.econ = Math.max(c.econ, salesRate(s))
  c.acc += dt
  let steps = 0
  while (c.acc >= 1 && steps < 600) {
    c.acc -= 1
    c.clock += 1
    steps++
    if (s.era >= 1) tickMarket(s)
    tickCompany(s)
    tickRivalry(s)
    tickCourt(s)
    tickTreasury(s)
    tickTown(s)
    tickMore(s)
    tickAmbitions(s)
  }
  if (c.acc > 1) c.acc = 0
}

/** Decisions waiting in the Company hub (offers, votes, meetings…). Shown as a hub badge. */
export function companyAttention(s: GameState): { count: number; lines: string[] } {
  const c = s.corp
  const lines: string[] = []
  if (!c) return { count: 0, lines }
  if (c.co.offer && c.co.offer.until > s.time) lines.push('An investor is waiting')
  if (c.co.vote) lines.push('The board is voting')
  if (c.co.meeting) lines.push('Shareholders want a meeting')
  const suits = c.suits.filter((x) => !x.yours).length
  if (suits) lines.push(suits === 1 ? 'You are being sued' : `${suits} lawsuits waiting`)
  if (c.arrears > 0) lines.push('Creditors are taking a cut of sales')
  if (c.more.crisis && c.more.crisis.until > s.time) lines.push('A crisis needs an answer')
  return { count: lines.length, lines }
}

/** Decisions waiting in the Town hub. */
export function townAttention(s: GameState): { count: number; lines: string[] } {
  const lines: string[] = []
  const t = s.corp?.town
  if (!t) return { count: 0, lines }
  if (t.union.demand) lines.push('The union has a demand')
  if (t.union.strikeUntil > s.time) lines.push('Your crew is on strike')
  if (t.election && Object.keys(t.election.backed).length === 0) lines.push('An election is coming')
  return { count: lines.length, lines }
}

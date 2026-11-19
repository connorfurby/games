import { CORP } from '../balance'
import type { GameState } from '../state'
import { corpOf, salesRate } from './core'
import { tickCompany } from './company'
import { tickRivalry } from './rivalry'
import { tickCourt } from './court'
import { tickTreasury } from './treasury'
import { tickMarket } from './market'

export function companyOpen(s: GameState): boolean {
  return s.era >= 2 || (s.era >= 1 && s.lifetimeRevenue >= CORP.openRevenue)
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
  return { count: lines.length, lines }
}

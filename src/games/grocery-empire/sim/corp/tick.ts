import { CORP } from '../balance'
import type { GameState } from '../state'
import { corpOf, salesRate } from './core'
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
  }
  if (c.acc > 1) c.acc = 0
}

import { describe, expect, it } from 'vitest'
import { VISITORS } from '../content/visitors'
import { VISITOR } from './balance'
import { can, run } from './commands'
import { demandBreakdown } from './formulas'
import { createInitialState, type GameState } from './state'
import { tickVisitors } from './systems/visitors'

function ready(era = 3): GameState {
  const s = createInitialState(11)
  s.era = era
  s.introSeen = true
  s.lifetimeRevenue = 1e6
  s.cash = 1e6
  s.rates.revenuePerSec = 10
  return s
}

describe('visitors at the door', () => {
  it('every era from 1 to 12 has at least two visitors', () => {
    for (let e = 1; e <= 12; e++) {
      const n = VISITORS.filter((v) => e >= v.era && (v.lastEra == null || e <= v.lastEra)).length
      expect(n, `era ${e}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('a visitor turns up, waits, and leaves if ignored', () => {
    const s = ready()
    s.time = VISITOR.firstAfterSec + 1
    tickVisitors(s)
    expect(s.visitors.current).not.toBeNull()
    s.time += VISITOR.waitSec + 1
    tickVisitors(s)
    expect(s.visitors.current).toBeNull()
    expect(s.visitors.nextAt).toBeGreaterThan(s.time)
  })

  it('nobody knocks before the intro or the first sales', () => {
    const s = createInitialState(2)
    s.time = 10_000
    tickVisitors(s)
    expect(s.visitors.current).toBeNull()
  })

  it('answering applies the choice and clears the door', () => {
    const s = ready(3)
    s.visitors.current = { id: 'mayor', until: s.time + 60 }
    run(s, { type: 'answerVisitor', pick: 'a' })
    expect(s.visitors.current).toBeNull()
    expect(s.visitors.answered).toBe(1)
    expect(demandBreakdown(s).parts.visitors).toBeCloseTo(1.09)
  })

  it('a choice that costs needs the cash', () => {
    const s = ready(1)
    s.cash = 0
    s.visitors.current = { id: 'cart-man', until: s.time + 60 }
    expect(can(s, { type: 'answerVisitor', pick: 'a' }).ok).toBe(false)
    expect(can(s, { type: 'answerVisitor', pick: 'b' }).ok).toBe(true)
  })

  it('shady choices add heat; honest ones cool it', () => {
    const s = ready(2)
    s.visitors.current = { id: 'shady-supplier', until: s.time + 60 }
    run(s, { type: 'answerVisitor', pick: 'a' })
    expect(s.crime.heat).toBe(15)
    s.era = 3
    s.visitors.current = { id: 'mayor', until: s.time + 60 }
    run(s, { type: 'answerVisitor', pick: 'b' })
    expect(s.crime.heat).toBe(0)
  })
})

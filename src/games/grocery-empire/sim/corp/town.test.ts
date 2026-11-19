import { describe, expect, it } from 'vitest'
import { TOWN } from '../balance'
import { can, run } from '../commands'
import { demandBreakdown, wagesPerSec } from '../formulas'
import { createInitialState, type GameState } from '../state'
import { punish } from '../systems/crime'
import { corpOf } from './core'
import { tickCorp } from './tick'

function town(era = 3): GameState {
  const s = createInitialState(41)
  s.era = era
  s.lifetimeRevenue = 1e6
  s.cash = 1e12
  s.rates.revenuePerSec = 100
  tickCorp(s, 1)
  return s
}

describe('the town', () => {
  it('nothing in the town changes the store until you take part', () => {
    const s = town(6)
    s.staff = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, role: 'clerk', level: 1, name: 'A' }) as GameState['staff'][number])
    const d0 = demandBreakdown(s).parts.company
    for (let i = 0; i < 40; i++) tickCorp(s, 60)
    expect(corpOf(s).town.union.formed).toBe(true)
    expect(demandBreakdown(s).parts.company).toBeCloseTo(d0 ?? 1, 5)
  })

  it('donations level causes, build goodwill and unlock perks', () => {
    const s = town()
    for (let i = 0; i < 4; i++) run(s, { type: 'donate', cause: 'shelter', sec: 900 })
    const t = corpOf(s).town
    expect(t.causes.shelter).toBeGreaterThanOrEqual(TOWN.perkAt)
    expect(t.goodwill).toBeGreaterThan(0)
    expect(demandBreakdown(s).parts.company).toBeGreaterThan(1)
  })

  it('character witnesses soften a sentence', () => {
    const s = town()
    corpOf(s).town.goodwill = 100
    s.crime.heat = 70
    expect(punish(s, 'relabel')).toBe('fine')
    expect(corpOf(s).town.witnesses).toBe(1)
  })

  it('backing the winner earns favours; their platform becomes the rule', () => {
    const s = town()
    run(s, { type: 'openCampaign' })
    const e = corpOf(s).town.election!
    run(s, { type: 'backCandidate', cand: 'osei', mins: 30 })
    e.sway.osei = 5
    s.time = e.dayAt + 1
    tickCorp(s, 1)
    const t = corpOf(s).town
    expect(t.officeHolders.mayor?.cand).toBe('osei')
    expect(t.favors).toBe(TOWN.favorsPerWin)
    expect(demandBreakdown(s).parts.company).toBeGreaterThan(1)
  })

  it('union: signing a raise costs wages and lifts service; two refusals strike', () => {
    const s = town()
    s.staff = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, role: 'clerk', level: 1, name: 'A' }) as GameState['staff'][number])
    const w0 = wagesPerSec(s)
    const u = corpOf(s).town.union
    u.formed = true
    u.demand = { id: 'pay', until: s.time + 100 }
    run(s, { type: 'answerUnion', accept: true })
    expect(wagesPerSec(s)).toBeGreaterThan(w0)
    u.demand = { id: 'benefits', until: s.time + 100 }
    run(s, { type: 'answerUnion', accept: false })
    u.demand = { id: 'benefits', until: s.time + 100 }
    run(s, { type: 'answerUnion', accept: false })
    expect(u.strikeUntil).toBeGreaterThan(s.time)
    expect(demandBreakdown(s).parts.company).toBeLessThan(0.6)
    run(s, { type: 'endStrike' })
    expect(u.strikeUntil).toBe(0)
  })

  it('the press: own an outlet, then spin', () => {
    const s = town()
    expect(can(s, { type: 'spin', kind: 'puff' }).ok).toBe(false)
    run(s, { type: 'buyOutlet', id: 'gazette' })
    run(s, { type: 'spin', kind: 'puff' })
    expect(corpOf(s).town.cred).toBeLessThan(100)
    expect(can(s, { type: 'spin', kind: 'puff' }).ok).toBe(false)
  })

  it('customers: courting a group moves its loyalty', () => {
    const s = town()
    run(s, { type: 'setFocus', id: 'students' })
    for (let i = 0; i < 10; i++) tickCorp(s, 60)
    expect(corpOf(s).town.loyalty.students).not.toBe(TOWN.loyaltyStart)
  })
})

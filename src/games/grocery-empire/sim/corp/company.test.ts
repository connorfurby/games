import { describe, expect, it } from 'vitest'
import { CO, CORP } from '../balance'
import { can, run } from '../commands'
import { demandBreakdown, wagesPerSec } from '../formulas'
import { createInitialState, type GameState } from '../state'
import { alleyVetoed, coOf, ownerLever, tally } from './company'
import { tickCorp } from './tick'

function co(era = 3): GameState {
  const s = createInitialState(9)
  s.era = era
  s.lifetimeRevenue = 1e6
  s.cash = 1e9
  s.rates.revenuePerSec = 100
  tickCorp(s, 1)
  return s
}

describe('your company', () => {
  it('investors make offers; selling hands them a slice and you the cash', () => {
    const s = co()
    tickCorp(s, 2)
    const o = coOf(s).offer
    expect(o).not.toBeNull()
    const cash = s.cash
    run(s, { type: 'answerOffer', accept: true })
    expect(s.cash).toBeGreaterThan(cash)
    expect(coOf(s).owners[o!.owner]).toBe(o!.shares)
    expect(coOf(s).you).toBe(CORP.sharesPerCompany - o!.shares)
  })

  it('you always keep a minimum slice', () => {
    const s = co()
    coOf(s).you = Math.ceil(CORP.sharesPerCompany * CO.minYou)
    coOf(s).offer = { owner: 'ivo', shares: 100, price: 1, until: s.time + 60 }
    expect(can(s, { type: 'answerOffer', accept: true }).ok).toBe(false)
  })

  it('owners change the store, scaled by their slice', () => {
    const s = co()
    s.staff = [{ id: 1, role: 'clerk', level: 1, name: 'A' } as GameState['staff'][number]]
    const w0 = wagesPerSec(s)
    coOf(s).owners.vulture = 200
    expect(ownerLever(s, 'wages')).toBeCloseTo(-0.18)
    expect(wagesPerSec(s)).toBeCloseTo(w0 * 0.82)
    coOf(s).owners.rosa = 100
    expect(demandBreakdown(s).parts.company).toBeCloseTo(1.04)
  })

  it('a pension fund with 10% closes the back alley', () => {
    const s = co()
    coOf(s).owners.pension = 100
    expect(alleyVetoed(s)).toBeTruthy()
    expect(can(s, { type: 'pullScheme', id: 'relabel' }).ok).toBe(false)
  })

  it('going public raises cash and starts quarters; a miss calls a meeting', () => {
    const s = co(3)
    const cash = s.cash
    run(s, { type: 'goPublic', pct: 0.25 })
    const c = coOf(s)
    expect(c.listed).toBe(true)
    expect(c.float).toBe(250)
    expect(s.cash).toBeGreaterThan(cash)
    // Sales fall away: the quarter is missed.
    s.rates.revenuePerSec = 10
    s.time = c.quarter.endsAt + 1
    tickCorp(s, 1)
    expect(c.meeting).not.toBeNull()
    expect(c.misses).toBe(1)
    run(s, { type: 'resolveMeeting', choice: 'apology' })
    expect(c.meeting).toBeNull()
  })

  it('beating a quarter builds a streak', () => {
    const s = co(3)
    run(s, { type: 'goPublic', pct: 0.1 })
    const c = coOf(s)
    s.rates.revenuePerSec = 1000
    s.time = c.quarter.endsAt + 1
    tickCorp(s, 1)
    expect(c.streak).toBe(1)
  })

  it('board votes: a majority owner decides; the grudge investor votes against you', () => {
    const s = co(3)
    const c = coOf(s)
    c.owners.grudge = 200
    c.you = 800
    c.vote = { id: 'raise', until: s.time + 60, lobbied: [] }
    const r = tally(s, true)
    expect(r.rows.find((x) => x.who === 'Grudge Capital')?.yes).toBe(false)
    expect(r.pass).toBe(true)
    run(s, { type: 'castVote', yes: true })
    expect(c.votesWon).toBe(1)
    expect(c.vote).toBeNull()
  })

  it('lobbying flips an owner', () => {
    const s = co(3)
    const c = coOf(s)
    c.you = 400
    c.owners.vulture = 600
    c.vote = { id: 'raise', until: s.time + 60, lobbied: [] }
    expect(tally(s, true).pass).toBe(false)
    run(s, { type: 'lobbyOwner', owner: 'vulture' })
    expect(tally(s, true).pass).toBe(true)
  })

  it('buybacks and going private pull shares home', () => {
    const s = co(3)
    run(s, { type: 'goPublic', pct: 0.4 })
    const c = coOf(s)
    const you = c.you
    run(s, { type: 'buyback' })
    expect(c.you).toBeGreaterThan(you)
    run(s, { type: 'goPrivate' })
    expect(c.listed).toBe(false)
    expect(c.float).toBe(0)
  })
})

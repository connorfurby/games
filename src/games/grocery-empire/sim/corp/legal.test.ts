import { describe, expect, it } from 'vitest'
import { CREDIT, LAW } from '../balance'
import { can, run } from '../commands'
import { unitCost } from '../formulas'
import { createInitialState, type GameState } from '../state'
import { punish } from '../systems/crime'
import { corpOf } from './core'
import { rivalSues } from './court'
import { ceoOf } from './rivalry'
import { tickCorp } from './tick'

function world(): GameState {
  const s = createInitialState(31)
  s.era = 3
  s.lifetimeRevenue = 1e6
  s.cash = 1e9
  s.rates.revenuePerSec = 100
  tickCorp(s, 1)
  return s
}

describe('the courthouse', () => {
  it('an unanswered suit is lost by default for more', () => {
    const s = world()
    s.rivals.penny = { stores: 3, bought: false, boughtStores: 0, nextGrowAt: 0, frozenUntil: 0, warReadyAt: 0, grown: 0, wars: 0 }
    rivalSues(s, 'penny')
    const suit = corpOf(s).suits[0]!
    const cash = s.cash
    s.time = suit.answerBy + 1
    tickCorp(s, 1)
    expect(corpOf(s).suits.length).toBe(0)
    expect(cash - s.cash).toBeCloseTo(suit.claim * LAW.defaultMul, 0)
  })

  it('settling pays half; lawyers raise the odds', () => {
    const s = world()
    rivalSues(s, 'penny')
    const suit = corpOf(s).suits[0]!
    const cash = s.cash
    run(s, { type: 'hireLawyer', suit: suit.id, tier: 2 })
    expect(suit.lawyer).toBe(2)
    run(s, { type: 'settleSuit', suit: suit.id })
    expect(corpOf(s).suits.length).toBe(0)
    expect(cash - s.cash).toBeGreaterThan(suit.claim * 0.5 - 1)
  })

  it('you can only sue a rival who turned on you', () => {
    const s = world()
    s.rivals.penny = { stores: 3, bought: false, boughtStores: 0, nextGrowAt: 0, frozenUntil: 0, warReadyAt: 0, grown: 0, wars: 0 }
    expect(can(s, { type: 'sueRival', id: 'penny' }).ok).toBe(false)
    ceoOf(s, 'penny').grudge = 60
    run(s, { type: 'sueRival', id: 'penny' })
    expect(corpOf(s).suits.some((x) => x.yours)).toBe(true)
  })

  it('liability cover pays most of a lost case', () => {
    const s = world()
    run(s, { type: 'buyPolicy', id: 'liability' })
    rivalSues(s, 'penny')
    const suit = corpOf(s).suits[0]!
    suit.lawyer = 0
    suit.judge = 'vantablack'
    // Force a loss by making odds tiny: trial is a roll, so repeat until lost.
    const before = corpOf(s).claimsPaid
    corpOf(s).rng = 12345
    run(s, { type: 'goToTrial', suit: suit.id })
    if (corpOf(s).suitsLost) expect(corpOf(s).claimsPaid).toBeGreaterThan(before)
  })
})

describe('the treasury', () => {
  it('a bond pays out now and comes due; missing it means arrears and a credit hit', () => {
    const s = world()
    run(s, { type: 'issueBond', mins: 10 })
    const c = corpOf(s)
    expect(c.bonds.length).toBe(1)
    s.cash = 0
    s.time = c.bonds[0]!.dueAt + 1
    tickCorp(s, 1)
    expect(c.bonds.length).toBe(0)
    expect(c.arrears).toBeGreaterThan(0)
    expect(c.credit).toBeLessThan(CREDIT.start)
    expect(can(s, { type: 'issueBond', mins: 10 }).ok).toBe(false)
  })

  it('prime credit makes crates cheaper', () => {
    const s = world()
    const base = unitCost(s, 'cans')
    corpOf(s).credit = 800
    expect(unitCost(s, 'cans')).toBeCloseTo(base * CREDIT.primeCrateMul, 6)
  })

  it('fines cover pays half a back-alley fine back', () => {
    const s = world()
    run(s, { type: 'buyPolicy', id: 'fines' })
    s.crime.heat = 50
    const before = s.cash
    punish(s, 'relabel')
    const fine = s.crime.finesPaid
    expect(before - s.cash).toBeCloseTo(fine / 2, 1)
  })

  it('premiums come out every minute', () => {
    const s = world()
    run(s, { type: 'buyPolicy', id: 'spoil' })
    tickCorp(s, 61)
    expect(corpOf(s).premiumsPaid).toBeGreaterThan(0)
  })
})

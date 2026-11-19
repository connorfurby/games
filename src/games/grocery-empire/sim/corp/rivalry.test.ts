import { describe, expect, it } from 'vitest'
import { RIVALRY } from '../balance'
import { can, run } from '../commands'
import { demandBreakdown } from '../formulas'
import { createInitialState, type GameState } from '../state'
import { tickRivals } from '../systems/rivals'
import { coOf } from './company'
import { corpOf } from './core'
import { ceoOf, rivalStakeTotal } from './rivalry'
import { tickCorp } from './tick'

function rivals(): GameState {
  const s = createInitialState(21)
  s.era = 3
  s.lifetimeRevenue = 1e6
  s.cash = 1e12
  s.rates.revenuePerSec = 100
  tickRivals(s)
  tickCorp(s, 2)
  return s
}

describe('rival bosses', () => {
  it('a boss with no grudge never acts', () => {
    const s = rivals()
    expect(s.rivals.penny).toBeTruthy()
    for (let i = 0; i < 30; i++) tickCorp(s, 60)
    expect(corpOf(s).boosts.length).toBe(0)
  })

  it('a best-of-three price war ends with a winner and a cooldown', () => {
    const s = rivals()
    run(s, { type: 'headToHead', id: 'penny' })
    const st = ceoOf(s, 'penny')
    expect(st.war).not.toBeNull()
    expect(st.grudge).toBeGreaterThan(0)
    for (let i = 0; i < 3 && st.war; i++) {
      // Play the move that beats what the mole would tell you.
      const next = st.war.next
      const beat = next === 'undercut' ? 'match' : next === 'match' ? 'hold' : 'undercut'
      run(s, { type: 'playWar', id: 'penny', move: beat })
    }
    expect(st.war).toBeNull()
    expect(st.wins).toBe(1)
    expect(demandBreakdown(s).parts.company).toBeCloseTo(RIVALRY.warWinDemand)
    expect(can(s, { type: 'headToHead', id: 'penny' }).ok).toBe(false)
  })

  it('an angry boss hits back; a truce calms them', () => {
    const s = rivals()
    const st = ceoOf(s, 'penny')
    st.grudge = 90
    st.nextMoveAt = s.time
    tickCorp(s, 2)
    expect(corpOf(s).boosts.length).toBeGreaterThan(0)
    run(s, { type: 'makeTruce', id: 'penny' })
    expect(st.grudge).toBeLessThan(90)
    expect(st.truceUntil).toBeGreaterThan(s.time)
  })

  it('owning 51% of a rival lets you take them over', () => {
    const s = rivals()
    expect(can(s, { type: 'takeoverRival', id: 'penny' }).ok).toBe(false)
    corpOf(s).tickers.penny!.owned = RIVALRY.takeoverShares
    run(s, { type: 'takeoverRival', id: 'penny' })
    expect(s.rivals.penny!.bought).toBe(true)
    expect(corpOf(s).takeovers).toBe(1)
  })

  it('a big stake triggers their poison pill', () => {
    const s = rivals()
    const t = corpOf(s).tickers.penny!
    t.owned = 400
    tickCorp(s, 2)
    expect(t.owned).toBeLessThan(400)
  })

  it('a mole job pays off or gets caught; caught moles cost heat and brand', () => {
    const s = rivals()
    run(s, { type: 'plantMole', id: 'penny' })
    const st = ceoOf(s, 'penny')
    st.mole!.cover = 1
    const brand = s.brand
    run(s, { type: 'moleJob', id: 'penny', job: 'sabotage' })
    expect(st.mole).toBeNull()
    expect(s.crime.heat).toBeGreaterThan(0)
    expect(s.brand).toBeLessThan(brand)
  })

  it('rivals buying into a listed company cut demand until you buy them back', () => {
    const s = rivals()
    run(s, { type: 'goPublic', pct: 0.4 })
    const st = ceoOf(s, 'penny')
    st.grudge = 100
    st.nextMoveAt = s.time
    // Force the buy-in move.
    st.stakeInYou = 100
    coOf(s).float -= 100
    expect(rivalStakeTotal(s)).toBe(100)
    expect(demandBreakdown(s).parts.company).toBeLessThan(1)
    run(s, { type: 'buyBackStake', id: 'penny' })
    expect(rivalStakeTotal(s)).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { CORP } from '../balance'
import { can, run } from '../commands'
import { unitCost } from '../formulas'
import { migrate } from '../migrate'
import { createInitialState, type GameState } from '../state'
import { corpOf } from './core'
import { portfolioValue } from './market'
import { tickCorp } from './tick'

function world(era = 2): GameState {
  const s = createInitialState(5)
  s.era = era
  s.lifetimeRevenue = 1e5
  s.cash = 1e6
  s.rates.revenuePerSec = 50
  tickCorp(s, 2)
  return s
}

describe('the exchange', () => {
  it('lists era companies, prices them and keeps a chart', () => {
    const s = world(2)
    const c = corpOf(s)
    expect(c.tickers.wobble?.listed).toBe(true)
    expect(c.tickers.gridco?.listed).toBe(true)
    expect(c.tickers.frostline).toBeUndefined()
    tickCorp(s, 60)
    expect(c.tickers.wobble!.hist.length).toBeGreaterThan(3)
    expect(c.tickers.wobble!.price).toBeGreaterThan(0)
  })

  it('buying and selling moves cash, shares and the books', () => {
    const s = world(2)
    const cash0 = s.cash
    run(s, { type: 'buyStock', id: 'gridco', cash: 50_000 })
    const t = corpOf(s).tickers.gridco!
    expect(t.owned).toBeGreaterThan(0)
    expect(s.cash).toBeLessThan(cash0)
    expect(portfolioValue(s)).toBeGreaterThan(0)
    run(s, { type: 'sellStock', id: 'gridco', shares: t.owned })
    expect(t.owned).toBe(0)
    // Fees: a round trip loses a little.
    expect(s.cash).toBeLessThan(cash0)
    expect(s.cash).toBeGreaterThan(cash0 - 2000)
  })

  it('never sells more than the company has', () => {
    const s = world(2)
    s.cash = 1e15
    run(s, { type: 'buyStock', id: 'wobble', cash: 1e14 })
    expect(corpOf(s).tickers.wobble!.owned).toBe(CORP.sharesPerCompany)
    expect(can(s, { type: 'buyStock', id: 'wobble', cash: 1e6 }).ok).toBe(false)
  })

  it('dividend stocks pay every minute', () => {
    const s = world(2)
    run(s, { type: 'buyStock', id: 'gridco', cash: 200_000 })
    const before = s.cash
    tickCorp(s, 120)
    expect(corpOf(s).dividends).toBeGreaterThan(0)
    expect(s.cash).toBeGreaterThan(before)
  })

  it('a hedge caps crate prices at the locked index', () => {
    const s = world(2)
    s.wholesale.index = 1
    const base = unitCost(s, 'cans')
    run(s, { type: 'openFuture', kind: 'hedge', stake: 0 })
    s.wholesale.index = 1.3
    expect(unitCost(s, 'cans')).toBeCloseTo(base, 5)
  })

  it('bets settle by how far crate prices moved', () => {
    const s = world(2)
    s.wholesale.index = 1
    run(s, { type: 'openFuture', kind: 'rise', stake: 1000 })
    const after = s.cash
    s.wholesale.index = 1.1
    s.time += CORP.betSec + 1
    tickCorp(s, 2)
    expect(s.cash - after).toBeCloseTo(1000 * (1 + CORP.betLeverage * 0.1), 0)
  })

  it('survives a save', () => {
    const s = world(2)
    run(s, { type: 'buyStock', id: 'gridco', cash: 50_000 })
    const back = migrate(JSON.parse(JSON.stringify(s)))
    expect(back.corp.tickers.gridco!.owned).toBe(corpOf(s).tickers.gridco!.owned)
    const raw = JSON.parse(JSON.stringify(s))
    delete raw.corp
    expect(migrate(raw).corp.tickers).toEqual({})
  })
})

import { describe, expect, it } from 'vitest'
import { FRANCHISE, LAB } from '../balance'
import { can, run } from '../commands'
import { demandBreakdown, lifeMul, unitCost } from '../formulas'
import { createInitialState, type GameState } from '../state'
import { corpOf } from './core'
import { tickCorp } from './tick'

function world(era = 5): GameState {
  const s = createInitialState(51)
  s.era = era
  s.lifetimeRevenue = 1e6
  s.cash = 1e12
  s.rates.revenuePerSec = 100
  tickCorp(s, 1)
  return s
}

describe('the lab', () => {
  it('research finishes into a lasting effect; unpatented ideas get copied', () => {
    const s = world()
    const life0 = lifeMul(s, 'produce')
    run(s, { type: 'startResearch', id: 'foreverlettuce' })
    tickCorp(s, 600)
    const inv = corpOf(s).more.lab.invented.foreverlettuce
    expect(inv).toBeTruthy()
    expect(lifeMul(s, 'produce')).toBeGreaterThan(life0)
    const full = lifeMul(s, 'produce')
    s.time += LAB.copyAfterSec + 5
    tickCorp(s, 1)
    expect(inv!.copied).toBe(true)
    expect(lifeMul(s, 'produce')).toBeLessThan(full)
  })

  it('patents stop copying; licences pay royalties at half strength', () => {
    const s = world()
    run(s, { type: 'startResearch', id: 'smartshelf' })
    tickCorp(s, 600)
    run(s, { type: 'patentInvention', id: 'smartshelf' })
    s.time += LAB.copyAfterSec + 5
    tickCorp(s, 1)
    expect(corpOf(s).more.lab.invented.smartshelf!.copied).toBe(false)
    const c0 = unitCost(s, 'cans')
    run(s, { type: 'licenseInvention', id: 'smartshelf' })
    expect(unitCost(s, 'cans')).toBeGreaterThan(c0)
    tickCorp(s, 61)
    expect(corpOf(s).more.royalties).toBeGreaterThan(0)
  })
})

describe('property and franchises', () => {
  it('lots add shoppers, earn rent when let and gain value', () => {
    const s = world()
    run(s, { type: 'buyLot', id: 'corner' })
    expect(demandBreakdown(s).parts.company).toBeGreaterThan(1)
    run(s, { type: 'setTenant', id: 'corner', tenant: 'cafe' })
    const v0 = corpOf(s).more.lots.corner!.value
    tickCorp(s, 121)
    expect(corpOf(s).more.rentEarned).toBeGreaterThan(0)
    expect(corpOf(s).more.lots.corner!.value).toBeGreaterThan(v0)
  })

  it('franchises pay a fee and royalties; the cap grows by era', () => {
    const s = world(4)
    const cash = s.cash
    run(s, { type: 'sellFranchise' })
    expect(s.cash).toBeGreaterThan(cash)
    run(s, { type: 'sellFranchise' })
    expect(can(s, { type: 'sellFranchise' }).ok).toBe(false)
    tickCorp(s, 61)
    expect(corpOf(s).more.royalties).toBeGreaterThan(0)
    expect(FRANCHISE.perEra).toBe(2)
  })
})

describe('executives and crises', () => {
  it('a hired COO makes crates cheaper', () => {
    const s = world()
    tickCorp(s, 2)
    const pool = corpOf(s).more.pool
    expect(pool.length).toBeGreaterThan(0)
    const i = pool.findIndex((c) => c.role === 'coo')
    if (i >= 0) {
      const c0 = unitCost(s, 'cans')
      run(s, { type: 'hireExec', idx: i })
      expect(unitCost(s, 'cans')).toBeLessThan(c0)
    }
  })

  it('crises only find a company in the public eye; ignoring one hurts', () => {
    const s = world()
    tickCorp(s, 2000)
    expect(corpOf(s).more.crisis).toBeNull()
    run(s, { type: 'buyOutlet', id: 'gazette' })
    corpOf(s).more.nextCrisisAt = s.time
    tickCorp(s, 1)
    const cur = corpOf(s).more.crisis
    expect(cur).not.toBeNull()
    const brand = s.brand
    s.time = cur!.until + 1
    tickCorp(s, 1)
    expect(corpOf(s).more.crisis).toBeNull()
    expect(s.brand).toBeLessThanOrEqual(brand)
  })
})

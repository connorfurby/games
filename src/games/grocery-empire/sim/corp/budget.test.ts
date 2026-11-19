import { describe, expect, it } from 'vitest'
import { CAUSES, OUTLETS } from '../../content/corp/town'
import { INVENTIONS, LOTS } from '../../content/corp/more'
import { TICKERS } from '../../content/corp/tickers'
import { CO, FRANCHISE, LAB, PROPERTY } from '../balance'
import { createInitialState, type GameState } from '../state'
import { corpOf } from './core'
import { corpCrateMul, corpDemandMul, corpVentureMul, corpWageMul, demandParts } from './effects'
import { tickCorp } from './tick'

/**
 * The company layer's budget. These bounds keep it a spice, not the meal: everything
 * maxed together may add a lot, but no single lever replaces running the store.
 */
function everything(): GameState {
  const s = createInitialState(77)
  s.era = 12
  s.lifetimeRevenue = 1e30
  s.cash = 1e40
  s.rates.revenuePerSec = 1000
  s.brand = 1
  tickCorp(s, 1)
  const c = corpOf(s)
  for (const x of CAUSES) c.town.causes[x.id] = 6
  c.town.goodwill = 1000
  c.town.outlets = OUTLETS.map((o) => o.id)
  c.town.union = { ...c.town.union, formed: true, pay: 3, benefits: 3, hours: 3 }
  c.town.segmentsOn = true
  c.town.focus = 'families'
  for (const k of ['students', 'families', 'seniors', 'foodies', 'nightowls', 'colonists', 'synthetics']) c.town.loyalty[k] = 100
  c.town.officeHolders = {
    mayor: { cand: 'osei', until: 1e9 },
    governor: { cand: 'liang', until: 1e9 },
    senator: { cand: 'brask', until: 1e9 },
    councillor: { cand: 'mox', until: 1e9 },
  }
  for (const x of INVENTIONS) c.more.lab.invented[x.id] = { at: 0, patented: true, licensed: false, copied: false }
  for (const x of LOTS) c.more.lots[x.id] = { value: 1, tenant: 'yours', boughtAt: 0, paid: 1 }
  for (const role of ['cfo', 'cmo', 'coo', 'counsel', 'research', 'hr']) c.more.execs[role] = { name: 'X', trait: 'loose', level: 5, hiredAt: 0 }
  c.co.owners = { rosa: 200, colony: 200, harlow: 100 }
  c.co.you = 500
  return s
}

describe('company budget', () => {
  it('everything maxed at once stays within bounds', () => {
    const s = everything()
    const d = corpDemandMul(s)
    const w = corpWageMul(s)
    const cr = corpCrateMul(s, 'produce')
    const v = corpVentureMul(s)
    console.log({ demand: d, wages: w, crates: cr, ventures: v, parts: demandParts(s) })
    expect(d).toBeLessThan(2.2)
    expect(d).toBeGreaterThan(1.3)
    expect(w).toBeGreaterThan(0.45)
    expect(cr).toBeGreaterThan(0.7)
    expect(v).toBeLessThan(2.5)
  })

  it('passive income stays a small share of sales', () => {
    // Stock dividends: best yield an hour.
    const bestDiv = Math.max(...TICKERS.map((t) => t.divPerMin)) * 60
    expect(bestDiv).toBeLessThan(0.07)
    // Young-stock growth an hour.
    const bestGrow = Math.max(...TICKERS.map((t) => t.growPerMin)) * 60
    expect(bestGrow).toBeLessThan(0.25)
    // Property: rent + appreciation an hour, at full brand.
    const bestRent = Math.max(...LOTS.map((l) => l.rentPerMin)) * 60 + PROPERTY.appreciatePerMin * 1.5 * 60
    expect(bestRent).toBeLessThan(0.15)
    // Franchises at the cap, perfect quality: share of sales.
    expect((FRANCHISE.maxTotal * FRANCHISE.royaltySec) / 60).toBeLessThan(0.3)
    // Licensing every invention: share of sales.
    expect(INVENTIONS.reduce((a, x) => a + x.royaltySec, 0) / 60).toBeLessThan(0.3)
    expect(LAB.licensedShare).toBe(0.5)
  })

  it('selling equity costs a slice of every future sale', () => {
    expect(CO.payoutShare).toBeGreaterThan(0.05)
  })
})

import { describe, expect, it } from 'vitest'
import { AMBITIONS } from '../../content/corp/ambitions'
import { COMPANY_MEMOS } from '../../content/corp/memos'
import { COMPANY_UPGRADES } from '../../content/upgrades/company'
import { isUpgradeVisible } from '../../content/upgrades'
import { createInitialState } from '../state'
import { nextUpgradeCost } from '../formulas'
import { corpOf } from './core'
import { CORP_OPENS, corpMenusOpen } from './tick'
import { currentAmbition, tickAmbitions } from './ambitions'
import { premiumPerMin } from './treasury'
import { migrate } from '../migrate'

function fresh(era = 2) {
  const s = createInitialState(7)
  s.era = era
  s.introSeen = true
  corpOf(s)
  return s
}

describe('company layer is part of the progression', () => {
  it('opens a few screens per era, not all at once', () => {
    const counts = [1, 2, 3, 4].map((era) => {
      const s = fresh(era)
      s.lifetimeRevenue = 1e12
      return corpMenusOpen(s).length
    })
    expect(counts[0]).toBeLessThan(counts[1]!)
    expect(counts[1]).toBeLessThan(counts[2]!)
    expect(counts[2]).toBeLessThan(counts[3]!)
    expect(CORP_OPENS.length).toBe(13)
  })

  it('company upgrades stay hidden until the system is used', () => {
    const s = fresh(4)
    for (const u of COMPANY_UPGRADES) expect(isUpgradeVisible(s, u)).toBe(false)
    corpOf(s).policies['fire'] = { bump: 0, since: 0 }
    expect(
      isUpgradeVisible(
        s,
        COMPANY_UPGRADES.find((u) => u.id === 'claims-adjuster')!,
      ),
    ).toBe(true)
  })

  it('company upgrade prices scale with the economy', () => {
    const s = fresh(3)
    corpOf(s).econ = 10
    const small = nextUpgradeCost(s, 'claims-adjuster')
    corpOf(s).econ = 1000
    expect(nextUpgradeCost(s, 'claims-adjuster')).toBeGreaterThan(small * 50)
  })

  it('an upgrade rank really changes its system', () => {
    const s = fresh(3)
    corpOf(s).econ = 50
    s.time = 100
    const before = premiumPerMin(s, 'fire')
    s.upgrades['claims-adjuster'] = 4
    if (before > 0) expect(premiumPerMin(s, 'fire')).toBeLessThan(before)
  })

  it('company memos stay hidden until the system is used', () => {
    const s = fresh(4)
    for (const m of COMPANY_MEMOS) expect(m.visible(s)).toBe(false)
  })

  it('ambitions pay once, in order, only on open screens', () => {
    const s = fresh(2)
    corpOf(s).econ = 10
    s.menus.foundation = true
    expect(currentAmbition(s, 'foundation')?.step).toBe(1)
    tickAmbitions(s)
    expect(Object.keys(corpOf(s).ambitions)).toHaveLength(0)
    corpOf(s).town.donated = 5
    const cash = s.cash
    tickAmbitions(s)
    expect(corpOf(s).ambitions['foundation-1']).toBeDefined()
    expect(s.cash).toBeGreaterThan(cash)
    tickAmbitions(s)
    expect(Object.keys(corpOf(s).ambitions)).toHaveLength(1)
    expect(currentAmbition(s, 'foundation')?.step).toBe(2)
    // A closed screen never pays.
    corpOf(s).more.execs = { cfo: { name: 'x', trait: 'steady', level: 1, hiredAt: 0 } }
    tickAmbitions(s)
    expect(corpOf(s).ambitions['execs-1']).toBeUndefined()
    expect(AMBITIONS.length).toBe(42)
  })

  it('old saves get empty ambitions', () => {
    const s = fresh(2)
    const raw = JSON.parse(JSON.stringify(s))
    delete raw.corp.ambitions
    delete raw.corp.ambitionCash
    raw.version = 44
    const m = migrate(raw)
    expect(m.corp?.ambitions).toEqual({})
    expect(m.corp?.ambitionCash).toBe(0)
  })
})

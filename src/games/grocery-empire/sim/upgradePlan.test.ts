import { describe, expect, it } from 'vitest'
import { UPGRADE_BY_ID } from '../content/upgrades'
import { can, run } from './commands'
import { createInitialState } from './state'
import { planAffordableUpgrades, planAffordableVentures } from './upgradePlan'

describe('affordable upgrade sweep', () => {
  it('spends a small purse on the single best rank', () => {
    const s = createInitialState(2)
    s.menus.upgrades = true
    s.cash = 50
    const plan = planAffordableUpgrades(s, 'all', 10)
    const ranks = plan.reduce((n, step) => n + step.count, 0)
    expect(ranks).toBe(1)
    expect(plan[0]?.id).toBe('br-flyers')
    expect(can(s, { type: 'buyUpgradeSweep', tree: 'all' }).ok).toBe(true)
    expect(run(s, { type: 'buyUpgradeSweep', tree: 'all' }).ok).toBe(true)
    expect(s.upgrades['br-flyers']).toBe(1)
    expect(s.cash).toBeLessThan(50)
    expect(s.cash).toBeGreaterThanOrEqual(0)
  })

  it('keeps a tree sweep inside that tree and replays cleanly', () => {
    const s = createInitialState(2)
    s.menus.upgrades = true
    s.empire.level = 8
    s.era = 1
    s.cash = 5_000
    const plan = planAffordableUpgrades(s, 'floor', 12)
    expect(plan.length).toBeGreaterThan(0)
    for (const step of plan) expect(UPGRADE_BY_ID[step.id]?.tree).toBe('floor')
    const draft = structuredClone(s)
    for (const step of plan) {
      expect(can(draft, { type: 'buyUpgrade', id: step.id, count: step.count }).ok).toBe(true)
      run(draft, { type: 'buyUpgrade', id: step.id, count: step.count })
    }
    expect(draft.cash).toBeGreaterThanOrEqual(0)
    expect(draft.cash).toBeLessThan(s.cash)
  })

  it('does not pick an unowned capstone', () => {
    const s = createInitialState(2)
    s.menus.upgrades = true
    s.empire.level = 30
    s.era = 5
    s.cash = 1e15
    const plan = planAffordableUpgrades(s, 'all', 40)
    for (const step of plan) {
      const def = UPGRADE_BY_ID[step.id]
      if (def?.fork) expect(s.upgrades[step.id] ?? 0).toBeGreaterThan(0)
    }
    expect(plan.some((step) => step.id === 'fl-flagship-cap-a')).toBe(false)
  })

  it('raises the venture with more income per dollar first', () => {
    const s = createInitialState(2)
    s.cash = 186
    s.ventures.coffee = { level: 1, stored: 0, lifetime: 0, carry: 0 }
    const plan = planAffordableVentures(s, 5)
    expect(plan[0]?.id).toBe('coffee')
    expect(plan.reduce((n, step) => n + step.count, 0)).toBe(2)
    expect(run(s, { type: 'levelVentureSweep' }).ok).toBe(true)
    expect(s.ventures.coffee?.level).toBe(3)
    expect(s.cash).toBeGreaterThanOrEqual(0)
  })
})

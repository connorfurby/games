import { describe, expect, it } from 'vitest'
import { createInitialState } from './state'
import { canRebrand, goodwillFor, pendingGoodwill, rebrand } from './systems/prestige'
import { statMul } from './systems/stats'
import { migrate } from './migrate'

describe('Rebrand prestige', () => {
  it('goodwill is the cube root of lifetime revenue in millions', () => {
    expect(goodwillFor(0)).toBe(0)
    expect(goodwillFor(1e6)).toBe(1)
    expect(goodwillFor(8e6)).toBe(2)
    expect(goodwillFor(1e9)).toBe(10)
  })

  it('is blocked before Era 3 and with no revenue', () => {
    const s = createInitialState(1)
    expect(canRebrand(s)).toMatch(/Era 3/)
    s.era = 3
    expect(canRebrand(s)).toMatch(/Goodwill/)
  })

  it('keeps Empire and Goodwill, resets the store, and Goodwill lifts value and demand', () => {
    const s = createInitialState(5)
    s.era = 4
    s.lifetimeRevenue = 2.7e7 // 3 Goodwill
    s.cash = 9e9
    s.empire.level = 33
    s.empire.perks['known-door'] = 3
    s.upgrades['quick-hands'] = 4
    expect(pendingGoodwill(s)).toBe(3)
    const next = rebrand(s, 0)
    expect(next.era).toBe(0)
    expect(next.cash).toBeLessThan(1000)
    expect(next.upgrades['quick-hands'] ?? 0).toBe(0)
    expect(next.empire.level).toBe(33)
    expect(next.empire.perks['known-door']).toBe(3)
    expect(next.rebrand).toEqual({ goodwill: 3, count: 1, bankedThisRun: 0 })
    expect(statMul(next, 'value')).toBeGreaterThan(1.05)
    expect(statMul(next, 'demand')).toBeGreaterThan(1.05)
  })

  it('migrates Goodwill and projects through a save round-trip', () => {
    const s = createInitialState(9)
    s.rebrand = { goodwill: 7, count: 2, bankedThisRun: 0 }
    s.projects = { done: { 'pj-dc': true }, active: [{ id: 'pj-app', endsAt: 99 }] }
    const m = migrate(JSON.parse(JSON.stringify(s)))
    expect(m.rebrand.goodwill).toBe(7)
    expect(m.projects.done['pj-dc']).toBe(true)
    expect(m.projects.active[0]!.id).toBe('pj-app')
  })
})

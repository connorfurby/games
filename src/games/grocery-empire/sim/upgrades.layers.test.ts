import { describe, expect, it } from 'vitest'
import { MEMO_BY_ID } from '../content/memos'
import { PERK_BY_ID } from '../content/perks'
import {
  UPGRADE_BY_ID,
  upgradeCurveAt,
  forkBlockedBy,
  requirementsMet,
} from '../content/upgrades'
import { can, run } from './commands'
import {
  upgradeMagnitude,
  upgradeRankCap,
} from './formulas'
import { createInitialState } from './state'

describe('layered upgrades', () => {
  it('empire 1 still caps early non-teaching nodes; teaching stays open', () => {
    const s = createInitialState(2)
    s.menus.upgrades = true
    s.empire.level = 1
    s.cash = 1e9
    expect(upgradeRankCap(s, 'curb-appeal')).toBe(2)
    expect(can(s, { type: 'buyUpgrade', id: 'curb-appeal', count: 1 }).ok).toBe(true)
    s.upgrades['curb-appeal'] = 2
    expect(can(s, { type: 'buyUpgrade', id: 'curb-appeal' }).ok).toBe(false)
    expect(can(s, { type: 'buyUpgrade', id: 'curb-appeal' }).reason).toMatch(/Empire/i)
    s.upgrades['quick-hands'] = 0
    expect(upgradeRankCap(s, 'quick-hands')).toBe(5)
    expect(can(s, { type: 'buyUpgrade', id: 'quick-hands' }).ok).toBe(true)
  })

  it('band 1 nodes stay locked until empire 4', () => {
    const s = createInitialState(2)
    s.menus.upgrades = true
    s.empire.level = 3
    s.cash = 1e9
    s.upgrades['basket-size'] = 3
    expect(upgradeRankCap(s, 'bag-well')).toBe(0)
    expect(can(s, { type: 'buyUpgrade', id: 'bag-well' }).ok).toBe(false)
    s.empire.level = 4
    expect(upgradeRankCap(s, 'bag-well')).toBeGreaterThan(0)
  })

  it('prereqs deny buy until met', () => {
    const s = createInitialState(2)
    s.menus.upgrades = true
    s.empire.level = 10
    s.cash = 1e9
    s.upgrades['basket-size'] = 1
    expect(requirementsMet(s, UPGRADE_BY_ID['bag-well']!)).toBe(false)
    expect(can(s, { type: 'buyUpgrade', id: 'bag-well' }).ok).toBe(false)
    s.upgrades['basket-size'] = 3
    expect(requirementsMet(s, UPGRADE_BY_ID['bag-well']!)).toBe(true)
    expect(can(s, { type: 'buyUpgrade', id: 'bag-well' }).ok).toBe(true)
  })

  it('fork lock blocks the sibling for the run', () => {
    const s = createInitialState(2)
    s.menus.upgrades = true
    s.empire.level = 40
    s.cash = 1e12
    s.upgrades['bag-well'] = 5
    s.upgrades['shelf-depth'] = 5
    s.upgrades['eye-level'] = 5
    s.upgrades['facing'] = 3
    expect(can(s, { type: 'buyUpgrade', id: 'wall-of-cans' }).ok).toBe(true)
    expect(run(s, { type: 'buyUpgrade', id: 'wall-of-cans', count: 1 }).ok).toBe(true)
    expect(forkBlockedBy(s, UPGRADE_BY_ID['one-perfect-aisle']!)?.id).toBe('wall-of-cans')
    expect(can(s, { type: 'buyUpgrade', id: 'one-perfect-aisle' }).ok).toBe(false)
    s.upgrades = {}
    s.upgradeSpend = 0
    expect(forkBlockedBy(s, UPGRADE_BY_ID['one-perfect-aisle']!)).toBeNull()
  })

  it('diminishing magnitude is monotonic and capped', () => {
    const def = UPGRADE_BY_ID['bag-well']!
    const a = upgradeCurveAt(def, 1)
    const b = upgradeCurveAt(def, 10)
    const c = upgradeCurveAt(def, 30)
    expect(a).toBeGreaterThan(0)
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(b)
    expect(c).toBeLessThanOrEqual((def.effectCap ?? 1) + 1e-9)
    const s = createInitialState(1)
    s.upgrades['bag-well'] = 10
    expect(upgradeMagnitude(s, 'bag-well')).toBeCloseTo(b, 5)
  })

  it('empire 1 demand and early quick-hands unchanged', () => {
    const s = createInitialState(1)
    expect(s.empire.level).toBe(1)
    s.upgrades['quick-hands'] = 2
    expect(upgradeMagnitude(s, 'quick-hands')).toBe(2)
  })
})

describe('empire doctrines', () => {
  it('respec refunds perk points', () => {
    const s = createInitialState(2)
    s.empire.points = 0
    s.empire.perks['known-door'] = 2
    s.empire.perks['slow-spoil'] = 1
    s.compute.ideasUnlocked = true
    s.compute.ideas = 100
    expect(can(s, { type: 'respecPerks' }).ok).toBe(true)
    expect(run(s, { type: 'respecPerks' }).ok).toBe(true)
    expect(s.empire.perks).toEqual({})
    expect(s.empire.points).toBe(3)
    expect(s.compute.perkRespecs).toBe(1)
  })

  it('exclusive doctrines block the sibling', () => {
    const s = createInitialState(3)
    s.era = 2
    s.empire.points = 10
    expect(can(s, { type: 'buyPerk', id: 'flagship-habit' }).ok).toBe(true)
    expect(run(s, { type: 'buyPerk', id: 'flagship-habit' }).ok).toBe(true)
    expect(can(s, { type: 'buyPerk', id: 'many-doors' }).ok).toBe(false)
    expect(PERK_BY_ID['many-doors']!.exclusive).toBe('chain-shape')
  })
})

describe('memo standing orders', () => {
  it('fork memo blocks its sibling', () => {
    const s = createInitialState(2)
    s.era = 1
    s.baskets = 500
    s.cash = 1e6
    s.compute.unlocked = true
    s.compute.attention = 1e6
    expect(can(s, { type: 'buyMemo', id: 'night-store' }).ok).toBe(true)
    expect(run(s, { type: 'buyMemo', id: 'night-store' }).ok).toBe(true)
    expect(can(s, { type: 'buyMemo', id: 'morning-rush' }).ok).toBe(false)
    expect(can(s, { type: 'buyMemo', id: 'morning-rush' }).reason).toMatch(/standing order/i)
  })

  it('standing-order rank increments up to max', () => {
    const s = createInitialState(2)
    s.era = 1
    s.menus.upgrades = true
    s.compute.unlocked = true
    s.compute.attention = 1e9
    const id = 'extra-facing-hour'
    expect(MEMO_BY_ID[id]?.max).toBe(10)
    expect(run(s, { type: 'buyMemo', id }).ok).toBe(true)
    expect(s.memos[id]).toBe(1)
    expect(run(s, { type: 'buyMemo', id }).ok).toBe(true)
    expect(s.memos[id]).toBe(2)
  })
})

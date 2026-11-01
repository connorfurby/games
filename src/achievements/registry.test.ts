import { describe, expect, it, beforeEach } from 'vitest'
import { createInitialState } from '@/games/grocery-empire/sim/state'
import { DEFAULT_META } from '@/shared/types'
import { applyAchievements, evaluateAchievements, ACHIEVEMENTS } from './registry'
import { resetAchievementToastsForTests } from './toastBus'

describe('achievements no-dupe', () => {
  beforeEach(() => {
    resetAchievementToastsForTests()
  })

  it('grants First Basket only once across repeated evaluations', () => {
    const s = createInitialState(1)
    s.stats.sold = 5
    s.baskets = 5
    let meta = { ...DEFAULT_META, achievements: {}, unlockedPacks: [...DEFAULT_META.unlockedPacks] }

    const first = evaluateAchievements(s, meta)
    expect(first.unlocked).toContain('first-basket')
    expect(first.meta.shelfTokens).toBe(DEFAULT_META.shelfTokens + 1)
    meta = first.meta

    const second = evaluateAchievements(s, meta)
    expect(second.unlocked).toEqual([])
    expect(second.meta).toBe(meta)
    expect(second.meta.shelfTokens).toBe(meta.shelfTokens)

    const third = applyAchievements(s, meta)
    expect(third).toBe(meta)
  })

  it('does not throw or double-grant on odd partial state', () => {
    const s = createInitialState(2)
    s.stats.sold = 1
    s.baskets = 1
    const meta = {
      ...DEFAULT_META,
      achievements: { 'first-basket': { unlockedAt: 1 } },
      unlockedPacks: [...DEFAULT_META.unlockedPacks],
    }
    const again = evaluateAchievements(s, meta)
    expect(again.unlocked).not.toContain('first-basket')
  })

  it('ships at least 80 unique achievement ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThanOrEqual(80)
  })

  it('keeps Era 0–1 basket/sold checks working', () => {
    const s = createInitialState(1)
    s.stats.sold = 1
    s.baskets = 100
    s.stats.unpackedManual = 10
    s.stats.ordersPlaced = 1
    s.stats.priceChanges = 1
    const meta = { ...DEFAULT_META, achievements: {}, unlockedPacks: [...DEFAULT_META.unlockedPacks] }
    const { unlocked } = evaluateAchievements(s, meta)
    expect(unlocked).toEqual(
      expect.arrayContaining(['first-basket', 'unpack-10', 'wholesale-1', 'price-tinker', 'baskets-100']),
    )
  })

  it('grants pity shelfToken when unlock count crosses a multiple of 10', () => {
    const s = createInitialState(1)
    s.stats.sold = 1
    s.baskets = 1
    const prior: Record<string, { unlockedAt: number }> = {}
    for (let i = 0; i < 9; i++) prior[`pad-${i}`] = { unlockedAt: 1 }
    const meta = {
      ...DEFAULT_META,
      shelfTokens: 0,
      achievements: prior,
      unlockedPacks: [...DEFAULT_META.unlockedPacks],
    }
    const before = Object.keys(meta.achievements).length
    const { meta: next, unlocked } = evaluateAchievements(s, meta)
    expect(unlocked.length).toBeGreaterThan(0)
    const base = unlocked.reduce(
      (n, id) => n + (ACHIEVEMENTS.find((a) => a.id === id)?.tokens ?? 0),
      0,
    )
    const after = Object.keys(next.achievements).length
    const pity = Math.floor(after / 10) - Math.floor(before / 10)
    expect(pity).toBeGreaterThanOrEqual(1)
    expect(next.shelfTokens).toBe(base + pity)
  })
})

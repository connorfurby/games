import { describe, expect, it } from 'vitest'
import { DEFAULT_META, type MetaSave } from '@/shared/types'
import { describeScope, normalizeScope, RESET_EVERYTHING, RESET_NOTHING, resetMeta } from './resetData'

const rich: MetaSave = {
  ...DEFAULT_META,
  shelfTokens: 42,
  unlockedPacks: [...DEFAULT_META.unlockedPacks, 'neon'],
  equippedPack: 'neon',
  unlockedOrnaments: ['price-tag', 'star'],
  equippedOrnaments: ['star'],
  achievements: { first: { unlockedAt: 1 } },
  lifetimeRank: 7,
  lifetimeXp: 900,
  groceryUniverses: 2,
  dailyStreak: 5,
  lastDailyStamp: '2026-11-15',
  settings: { ...DEFAULT_META.settings, reducedMotion: true },
}

describe('resetMeta', () => {
  it('leaves meta alone when only the run, slots or museum are chosen', () => {
    expect(resetMeta(rich, { ...RESET_NOTHING, run: true, slots: true, museum: true })).toBe(rich)
  })

  it('shop reset zeroes tokens and purchases but keeps achievements', () => {
    const next = resetMeta(rich, { ...RESET_NOTHING, shop: true })
    expect(next.shelfTokens).toBe(0)
    expect(next.unlockedPacks).toEqual(DEFAULT_META.unlockedPacks)
    expect(next.equippedPack).toBe(DEFAULT_META.equippedPack)
    expect(next.equippedOrnaments).toEqual(DEFAULT_META.equippedOrnaments)
    expect(next.achievements).toEqual(rich.achievements)
    expect(next.lifetimeRank).toBe(7)
  })

  it('achievement reset also resets the shop, so tokens cannot be earned twice', () => {
    expect(normalizeScope({ ...RESET_NOTHING, achievements: true }).shop).toBe(true)
    const next = resetMeta(rich, { ...RESET_NOTHING, achievements: true })
    expect(next.achievements).toEqual({})
    expect(next.shelfTokens).toBe(0)
    expect(next.lifetimeRank).toBe(DEFAULT_META.lifetimeRank)
    expect(next.groceryUniverses).toBe(0)
    expect(next.dailyStreak).toBe(0)
    expect(next.lastDailyStamp).toBeNull()
  })

  it('never touches settings', () => {
    expect(resetMeta(rich, RESET_EVERYTHING).settings).toEqual(rich.settings)
  })

  it('describes the scope in plain words', () => {
    expect(describeScope({ ...RESET_NOTHING, run: true })).toBe('run')
    expect(describeScope({ ...RESET_NOTHING, run: true, museum: true })).toBe('run and museum')
    expect(describeScope(RESET_EVERYTHING)).toBe('run, save slots, museum, shop and tokens and achievements')
    expect(describeScope(RESET_NOTHING)).toBe('nothing')
  })
})

import { describe, expect, it } from 'vitest'
import {
  compareProgress,
  decideSlot,
  isProgressFork,
  mergeMeta,
  scoreCampaign,
} from './progress'
import { DEFAULT_META, type MetaSave } from './types'

describe('scoreCampaign / compareProgress', () => {
  it('ranks grocery by lifetime revenue then play then baskets then era', () => {
    const a = scoreCampaign(
      { era: 2, lifetimeRevenue: 1000, baskets: 10, stats: { playSec: 100 } },
      'grocery',
    )
    const b = scoreCampaign(
      { era: 5, lifetimeRevenue: 900, baskets: 999, stats: { playSec: 9999 } },
      'grocery',
    )
    expect(compareProgress(a, b)).toBe(1)
  })

  it('treats fresh grocery as empty', () => {
    expect(scoreCampaign({ era: 0, lifetimeRevenue: 0, baskets: 0, stats: { playSec: 1 } }, 'grocery').empty).toBe(
      true,
    )
  })

  it('ranks signal by lifetime then time then era', () => {
    const a = scoreCampaign({ era: 1, lifetimeRevenue: 50, calls: 3, time: 400 }, 'signal')
    const b = scoreCampaign({ era: 3, lifetimeRevenue: 40, calls: 30, time: 900 }, 'signal')
    expect(compareProgress(a, b)).toBe(1)
  })
})

describe('isProgressFork', () => {
  it('is false when one side is empty', () => {
    const empty = scoreCampaign({ era: 0, lifetimeRevenue: 0, baskets: 0, stats: { playSec: 0 } }, 'grocery')
    const real = scoreCampaign(
      { era: 2, lifetimeRevenue: 500, baskets: 40, stats: { playSec: 600 } },
      'grocery',
    )
    expect(isProgressFork(empty, real)).toBe(false)
  })

  it('does not fork when one side clearly dominates on revenue', () => {
    const local = scoreCampaign(
      { era: 3, lifetimeRevenue: 1000, baskets: 50, stats: { playSec: 800 } },
      'grocery',
    )
    const cloud = scoreCampaign(
      { era: 4, lifetimeRevenue: 5000, baskets: 60, stats: { playSec: 200 } },
      'grocery',
    )
    expect(isProgressFork(local, cloud)).toBe(false)
  })

  it('forks when totals are close but clocks diverge', () => {
    const local = scoreCampaign(
      { era: 3, lifetimeRevenue: 1000, baskets: 50, stats: { playSec: 900 } },
      'grocery',
    )
    const cloud = scoreCampaign(
      { era: 3, lifetimeRevenue: 1050, baskets: 55, stats: { playSec: 200 } },
      'grocery',
    )
    expect(isProgressFork(local, cloud)).toBe(true)
  })
})

describe('mergeMeta', () => {
  it('unions unlocks and takes max tokens / streak', () => {
    const local: MetaSave = {
      ...DEFAULT_META,
      shelfTokens: 3,
      dailyStreak: 2,
      unlockedPacks: ['receipt-classic', 'a'],
      achievements: { 'first-basket': { unlockedAt: 1 } },
    }
    const cloud: MetaSave = {
      ...DEFAULT_META,
      shelfTokens: 5,
      dailyStreak: 1,
      unlockedPacks: ['receipt-classic', 'b'],
      achievements: { 'unpack-10': { unlockedAt: 2 } },
      equippedPack: 'b',
    }
    const m = mergeMeta(local, cloud, 'cloud')
    expect(m.shelfTokens).toBe(5)
    expect(m.dailyStreak).toBe(2)
    expect(m.unlockedPacks.sort()).toEqual(['a', 'b', 'receipt-classic'].sort())
    expect(m.achievements['first-basket']).toBeTruthy()
    expect(m.achievements['unpack-10']).toBeTruthy()
    expect(m.equippedPack).toBe('b')
  })
})

describe('decideSlot', () => {
  const deser = <T,>(raw: string) => JSON.parse(raw) as T

  it('picks cloud when local is missing', () => {
    const d = decideSlot('grocery-empire', null, '{"era":2,"lifetimeRevenue":10,"baskets":1}', deser)
    expect(d.winner).toBe('cloud')
    expect(d.needsChooser).toBe(false)
  })

  it('merges meta without a chooser', () => {
    const d = decideSlot('meta', JSON.stringify(DEFAULT_META), JSON.stringify(DEFAULT_META), deser)
    expect(d.winner).toBe('merged')
    expect(d.needsChooser).toBe(false)
  })

  it('prefers richer local grocery', () => {
    const local = JSON.stringify({ era: 3, lifetimeRevenue: 5000, baskets: 20, stats: { playSec: 300 } })
    const cloud = JSON.stringify({ era: 1, lifetimeRevenue: 10, baskets: 1, stats: { playSec: 10 } })
    const d = decideSlot('grocery-empire', local, cloud, deser)
    expect(d.winner).toBe('local')
    expect(d.needsChooser).toBe(false)
  })
})

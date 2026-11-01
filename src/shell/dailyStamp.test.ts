import { describe, expect, it } from 'vitest'
import { DEFAULT_META } from '@/shared/types'
import { applyDailyStamp, daysBetween, localDayKey } from './dailyStamp'

describe('dailyStamp', () => {
  it('localDayKey formats YYYY-MM-DD', () => {
    expect(localDayKey(new Date(2026, 2, 5, 15, 0, 0))).toBe('2026-03-05')
  })

  it('daysBetween counts calendar gaps', () => {
    expect(daysBetween('2026-03-01', '2026-03-02')).toBe(1)
    expect(daysBetween('2026-03-01', '2026-03-04')).toBe(3)
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0)
  })

  it('first stamp grants token and starts streak at 1', () => {
    const r = applyDailyStamp({ ...DEFAULT_META }, new Date(2026, 2, 5, 12, 0, 0))
    expect(r.stamped).toBe(true)
    expect(r.streak).toBe(1)
    expect(r.bonus).toBe(1)
    expect(r.meta.shelfTokens).toBe(DEFAULT_META.shelfTokens + 1)
    expect(r.meta.lastDailyStamp).toBe('2026-03-05')
    expect(r.line).toBe('Daily stamp · day 1')
  })

  it('same day is idempotent', () => {
    const base = {
      ...DEFAULT_META,
      lastDailyStamp: '2026-03-05',
      dailyStreak: 3,
      shelfTokens: 10,
    }
    const r = applyDailyStamp(base, new Date(2026, 2, 5, 23, 0, 0))
    expect(r.stamped).toBe(false)
    expect(r.meta).toBe(base)
    expect(r.meta.shelfTokens).toBe(10)
  })

  it('continues streak on consecutive day', () => {
    const base = {
      ...DEFAULT_META,
      lastDailyStamp: '2026-03-05',
      dailyStreak: 3,
      shelfTokens: 10,
    }
    const r = applyDailyStamp(base, new Date(2026, 2, 6, 8, 0, 0))
    expect(r.stamped).toBe(true)
    expect(r.streak).toBe(4)
    expect(r.meta.shelfTokens).toBe(11)
    expect(r.line).toBe('Daily stamp · day 4')
  })

  it('resets streak when gap > 1 day', () => {
    const base = {
      ...DEFAULT_META,
      lastDailyStamp: '2026-03-01',
      dailyStreak: 9,
      shelfTokens: 5,
    }
    const r = applyDailyStamp(base, new Date(2026, 2, 5, 8, 0, 0))
    expect(r.stamped).toBe(true)
    expect(r.streak).toBe(1)
    expect(r.meta.shelfTokens).toBe(6)
  })
})

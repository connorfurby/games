/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_META } from '@/shared/types'
import { __resetSaveStore, exportSave, loadGame, saveRaw } from '@/shared/save'
import {
  DAILY_CHALLENGE_ID,
  isDailyRunActive,
  loadDailyChallenge,
  maybeRecordDailyBest,
  prepareDailyChallengeStart,
  saveDailyChallenge,
  seedFromDayKey,
  todaysChallenge,
} from './dailyChallenge'
import { localDayKey } from './dailyStamp'

beforeEach(() => {
  __resetSaveStore()
  sessionStorage.clear()
})

afterEach(() => {
  __resetSaveStore()
  sessionStorage.clear()
})

describe('dailyChallenge', () => {
  it('seedFromDayKey is stable for a day', () => {
    expect(seedFromDayKey('2026-10-28')).toBe(seedFromDayKey('2026-10-28'))
    expect(seedFromDayKey('2026-10-28')).not.toBe(seedFromDayKey('2026-10-29'))
    expect(seedFromDayKey('2026-10-28')).toBeGreaterThan(0)
  })

  it('todaysChallenge matches localDayKey + seed', () => {
    const now = new Date(2026, 9, 28, 15, 0, 0)
    const t = todaysChallenge(now)
    expect(t.day).toBe(localDayKey(now))
    expect(t.seed).toBe(seedFromDayKey(t.day))
    expect(t.active).toBe(false)
  })

  it('prepareDailyChallengeStart marks active and pending', () => {
    saveRaw('grocery-empire', '{"baskets":9}')
    const r = prepareDailyChallengeStart({
      stashToSlot3: true,
      now: new Date(2026, 9, 28, 12, 0, 0),
    })
    expect(r.day).toBe('2026-10-28')
    expect(r.seed).toBe(seedFromDayKey('2026-10-28'))
    expect(exportSave('grocery-empire-slot-3')).toBe('{"baskets":9}')
    const primary = loadGame<{ baskets?: number; seed?: number; era?: number }>('grocery-empire')
    expect(primary?.baskets).toBe(0)
    expect(primary?.era).toBe(0)
    expect(primary?.seed).toBe(r.seed)
    const blob = loadDailyChallenge()
    expect(blob?.active).toBe(true)
    expect(blob?.day).toBe('2026-10-28')
    expect(sessionStorage.getItem('games.v1.daily-challenge.pending')).toBe('1')
    expect(exportSave(DAILY_CHALLENGE_ID)).toBeTruthy()
  })

  it('maybeRecordDailyBest updates MetaSave for active day', () => {
    const now = new Date(2026, 9, 28, 12, 0, 0)
    const seed = seedFromDayKey('2026-10-28')
    saveDailyChallenge({ day: '2026-10-28', seed, active: true })
    expect(isDailyRunActive(seed, now)).toBe(true)

    const once = maybeRecordDailyBest({ ...DEFAULT_META }, 40, seed, now)
    expect(once.dailyChallengeBest).toEqual({ day: '2026-10-28', seed, baskets: 40 })

    const same = maybeRecordDailyBest(once, 30, seed, now)
    expect(same).toBe(once)

    const better = maybeRecordDailyBest(once, 55, seed, now)
    expect(better.dailyChallengeBest?.baskets).toBe(55)
  })
})

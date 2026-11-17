import type { MetaSave } from '@/shared/types'

const DAY_MS = 86_400_000
const STAMP_TOKEN_BONUS = 1

/** Local calendar day as YYYY-MM-DD. */
export function localDayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDay(key: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  const parts = key.split('-').map(Number)
  const y = parts[0]
  const mo = parts[1]
  const d = parts[2]
  if (y == null || mo == null || d == null) return null
  return Date.UTC(y, mo - 1, d)
}

/** Whole calendar days from `from` to `to` (YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number | null {
  const a = parseDay(from)
  const b = parseDay(to)
  if (a == null || b == null) return null
  return Math.round((b - a) / DAY_MS)
}

export interface DailyStampResult {
  meta: MetaSave
  /** Quiet shelf line when a stamp was granted; null if already stamped today. */
  line: string | null
  stamped: boolean
  streak: number
  bonus: number
}

/**
 * If a new local day since last stamp: grant a small shelfTokens bonus and
 * update streak (continue if yesterday, else reset to 1). Idempotent same-day.
 */
export function applyDailyStamp(meta: MetaSave, now = new Date()): DailyStampResult {
  const today = localDayKey(now)
  const last = meta.lastDailyStamp ?? null
  const curStreak = typeof meta.dailyStreak === 'number' ? meta.dailyStreak : 0

  if (last === today) {
    return { meta, line: null, stamped: false, streak: curStreak, bonus: 0 }
  }

  let streak = 1
  if (last) {
    const gap = daysBetween(last, today)
    if (gap == null || gap < 0) {
      // Corrupt / clock skew — do not double-grant.
      return { meta, line: null, stamped: false, streak: curStreak, bonus: 0 }
    }
    if (gap === 0) {
      return { meta, line: null, stamped: false, streak: curStreak, bonus: 0 }
    }
    if (gap === 1) {
      streak = Math.max(1, curStreak) + 1
    }
  }

  const next: MetaSave = {
    ...meta,
    lastDailyStamp: today,
    dailyStreak: streak,
    shelfTokens: (meta.shelfTokens ?? 0) + STAMP_TOKEN_BONUS,
  }
  return {
    meta: next,
    line: `Daily stamp · day ${streak}`,
    stamped: true,
    streak,
    bonus: STAMP_TOKEN_BONUS,
  }
}

export interface WeekDay {
  /** YYYY-MM-DD */
  day: string
  /** One-letter weekday, Monday first. */
  letter: string
  stamped: boolean
  today: boolean
  future: boolean
}

/**
 * The current week (Monday to Sunday) with the days covered by the running streak marked.
 * A streak of N ending on `lastStamp` covers that day and the N-1 before it.
 */
export function streakWeek(lastStamp: string | null, streak: number, now = new Date()): WeekDay[] {
  const today = localDayKey(now)
  const mondayOffset = (now.getDay() + 6) % 7
  const out: WeekDay[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset + i)
    const day = localDayKey(d)
    const back = lastStamp ? daysBetween(day, lastStamp) : null
    const toToday = daysBetween(day, today) ?? 0
    out.push({
      day,
      letter: 'MTWTFSS'[i]!,
      stamped: back != null && back >= 0 && back < Math.max(0, streak),
      today: day === today,
      future: toToday < 0,
    })
  }
  return out
}

const THEME_A = ['Quiet', 'Rainy', 'Bright', 'Windy', 'Foggy', 'Busy', 'Lazy', 'Crisp']
const THEME_B = ['morning rush', 'delivery day', 'market day', 'payday', 'school run', 'late shift', 'street fair', 'stock take']

/** A name for today's seeded run, so the daily has an identity. Flavour only: it changes no rules. */
export function dailyTheme(seed: number): string {
  const a = THEME_A[Math.abs(seed) % THEME_A.length]!
  const b = THEME_B[Math.abs(Math.floor(seed / 8)) % THEME_B.length]!
  return `${a} ${b}`
}

import { clearGameSave, deserializeState, loadGame, saveGame } from '@/shared/save'
import type { MetaSave } from '@/shared/types'
import { localDayKey } from './dailyStamp'

export const DAILY_CHALLENGE_ID = 'daily-challenge'
const PENDING_KEY = 'games.v1.daily-challenge.pending'
const SLOT3_KEY = 'games.v1.grocery-empire-slot-3'
const PRIMARY_KEY = 'games.v1.grocery-empire'

export interface DailyChallengeBlob {
  day: string
  seed: number
  /** True while the primary grocery save is today's seeded run. */
  active: boolean
}

/** Deterministic seed from YYYY-MM-DD (local calendar). */
export function seedFromDayKey(day: string): number {
  let h = 2166136261
  for (let i = 0; i < day.length; i++) {
    h ^= day.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= 0x44594c59 // DYLY
  return (h >>> 0) % 2147483647 || 1
}

export function todaysChallenge(now = new Date()): DailyChallengeBlob {
  const day = localDayKey(now)
  return { day, seed: seedFromDayKey(day), active: false }
}

export function loadDailyChallenge(): DailyChallengeBlob | null {
  const raw = loadGame<DailyChallengeBlob>(DAILY_CHALLENGE_ID)
  if (!raw || typeof raw.day !== 'string' || typeof raw.seed !== 'number') return null
  return {
    day: raw.day,
    seed: Math.max(1, Math.floor(raw.seed)) || 1,
    active: Boolean(raw.active),
  }
}

export function saveDailyChallenge(blob: DailyChallengeBlob) {
  saveGame(DAILY_CHALLENGE_ID, blob)
}

export function deactivateDailyChallenge() {
  const cur = loadDailyChallenge()
  if (!cur?.active) return
  saveDailyChallenge({ ...cur, active: false })
}

/** True when primary grocery run is today's active daily challenge. */
export function isDailyRunActive(seed: number, now = new Date()): boolean {
  const cur = loadDailyChallenge()
  if (!cur?.active) return false
  const today = localDayKey(now)
  return cur.day === today && cur.seed === seed
}

export function markDailyPending() {
  try {
    sessionStorage.setItem(PENDING_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function consumeDailyPending(): boolean {
  try {
    if (sessionStorage.getItem(PENDING_KEY) !== '1') return false
    sessionStorage.removeItem(PENDING_KEY)
    return true
  } catch {
    return false
  }
}

/** Copy primary grocery save into slot 3 (localStorage only — no engine needed). */
export function stashPrimaryToSlot3(): boolean {
  try {
    const raw = localStorage.getItem(PRIMARY_KEY)
    if (!raw) return false
    localStorage.setItem(SLOT3_KEY, raw)
    return true
  } catch {
    return false
  }
}

export function hasPrimaryGrocerySave(): boolean {
  try {
    return !!localStorage.getItem(PRIMARY_KEY)
  } catch {
    return false
  }
}

/**
 * Prepare a fresh daily run: optionally stash current save to slot 3,
 * wipe primary, mark challenge active, and set a pending seed for Play boot.
 */
export function prepareDailyChallengeStart(opts: {
  stashToSlot3: boolean
  now?: Date
}): { day: string; seed: number } {
  const today = todaysChallenge(opts.now)
  if (opts.stashToSlot3) stashPrimaryToSlot3()
  clearGameSave('grocery-empire')
  saveDailyChallenge({ day: today.day, seed: today.seed, active: true })
  markDailyPending()
  return { day: today.day, seed: today.seed }
}

/** Update MetaSave local leaderboard if baskets beat today's best. */
export function maybeRecordDailyBest(
  meta: MetaSave,
  baskets: number,
  seed: number,
  now = new Date(),
): MetaSave {
  if (!isDailyRunActive(seed, now)) return meta
  const day = localDayKey(now)
  const floor = Math.max(0, Math.floor(baskets))
  const prev = meta.dailyChallengeBest
  if (prev && prev.day === day && prev.baskets >= floor) return meta
  return {
    ...meta,
    dailyChallengeBest: { day, seed, baskets: floor },
  }
}

/** Glance baskets from a raw grocery save blob (for shelf UI). */
export function glanceBasketsFromPrimary(): number | null {
  try {
    const raw = localStorage.getItem(PRIMARY_KEY)
    if (!raw) return null
    const parsed = deserializeState<{ baskets?: number }>(raw)
    return typeof parsed?.baskets === 'number' ? Math.floor(parsed.baskets) : null
  } catch {
    return null
  }
}

import type { SocialGameId } from '@/shared/database.types'
import { social } from './backend'

const INTERVAL_MS = 30_000
let timer: ReturnType<typeof setInterval> | null = null
let currentGame: SocialGameId | null = null
let userId: string | null = null
let lastBeatAt = 0

async function beat(force = false) {
  if (!userId) return
  if (typeof document !== 'undefined' && document.hidden && !force) return
  const now = Date.now()
  // Coalesce route-change double beats (startPresence + setPlayingGame).
  if (!force && now - lastBeatAt < 1500) return
  lastBeatAt = now
  try {
    await social().updateProfile(userId, { last_seen_at: new Date().toISOString(), playing_game: currentGame })
  } catch {
    /* presence is best-effort */
  }
}

function armTimer() {
  if (timer) clearInterval(timer)
  timer = setInterval(() => void beat(), INTERVAL_MS)
}

export function startPresence(uid: string, game: SocialGameId | null) {
  userId = uid
  currentGame = game
  void beat()
  armTimer()
}

export function setPlayingGame(game: SocialGameId | null) {
  if (currentGame === game) return
  currentGame = game
  void beat()
}

export function stopPresence() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  const uid = userId
  userId = null
  currentGame = null
  if (uid)
    void social()
      .updateProfile(uid, { playing_game: null, last_seen_at: new Date().toISOString() })
      .catch(() => {})
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && userId) void beat(true)
  })
}

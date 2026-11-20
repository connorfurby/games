import type { SocialGameId } from '@/shared/database.types'
import { social } from './backend'

const INTERVAL_MS = 30_000
let timer: ReturnType<typeof setInterval> | null = null
let currentGame: SocialGameId | null = null
let userId: string | null = null

async function beat() {
  if (!userId) return
  try {
    await social().updateProfile(userId, { last_seen_at: new Date().toISOString(), playing_game: currentGame })
  } catch {
    /* presence is best-effort */
  }
}

export function startPresence(uid: string, game: SocialGameId | null) {
  userId = uid
  currentGame = game
  void beat()
  if (timer) clearInterval(timer)
  timer = setInterval(() => void beat(), INTERVAL_MS)
}

export function setPlayingGame(game: SocialGameId | null) {
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

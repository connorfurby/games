import type { SocialGameId } from '@/shared/database.types'
import { getSupabase } from '@/shared/supabase'

const INTERVAL_MS = 30_000
let timer: ReturnType<typeof setInterval> | null = null
let currentGame: SocialGameId | null = null
let userId: string | null = null

async function beat() {
  const sb = getSupabase()
  if (!sb || !userId) return
  await sb
    .from('profiles')
    .update({
      last_seen_at: new Date().toISOString(),
      playing_game: currentGame,
    })
    .eq('id', userId)
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
  const sb = getSupabase()
  const uid = userId
  userId = null
  currentGame = null
  if (sb && uid) {
    void sb.from('profiles').update({ playing_game: null, last_seen_at: new Date().toISOString() }).eq('id', uid)
  }
}

export function presenceLabel(playing: string | null, lastSeen: string | null): string {
  if (playing === 'grocery-empire') return 'Playing Grocery Empire'
  if (playing === 'signal-decay') return 'Playing Signal Decay'
  if (!lastSeen) return 'Idle'
  const ago = Date.now() - new Date(lastSeen).getTime()
  if (ago < 2 * 60_000) return 'Online'
  if (ago < 60 * 60_000) return `Seen ${Math.floor(ago / 60_000)}m ago`
  if (ago < 48 * 60 * 60_000) return `Seen ${Math.floor(ago / 3600_000)}h ago`
  return 'Away'
}

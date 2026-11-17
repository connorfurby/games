import { sfx } from '@/shared/audio'
import { useSyncExternalStore } from 'react'

/**
 * Notices: everything a toast said, kept for this visit. A toast is gone in three seconds;
 * the Menu drawer's Notices tab is where you read the one you missed.
 */
export interface Notice {
  id: number
  text: string
  /** Wall-clock ms. */
  at: number
  kind: 'reward' | 'blocked' | 'info'
}

const MAX = 40
let list: Notice[] = []
let seq = 0
const subs = new Set<() => void>()

export function pushNotice(text: string, kind: Notice['kind'] = 'info', now = Date.now()) {
  const last = list[0]
  // The same line twice in a row within 5 s is one notice.
  if (last && last.text === text && now - last.at < 5000) return
  list = [{ id: ++seq, text, at: now, kind }, ...list].slice(0, MAX)
  sfx.notice()
  for (const s of subs) s()
}

export function clearNotices() {
  list = []
  for (const s of subs) s()
}

export function notices(): readonly Notice[] {
  return list
}

export function useNotices(): readonly Notice[] {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    notices,
    notices,
  )
}

/** "just now", "4 min ago", "2 h ago". */
export function noticeAge(at: number, now = Date.now()): string {
  const sec = Math.max(0, Math.round((now - at) / 1000))
  if (sec < 45) return 'just now'
  if (sec < 3600) return `${Math.max(1, Math.round(sec / 60))} min ago`
  return `${Math.round(sec / 3600)} h ago`
}

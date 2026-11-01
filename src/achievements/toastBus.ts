/** Simple pub/sub so achievements toast once, outside React setState updaters. */

type Listener = (message: string) => void

const listeners = new Set<Listener>()
const shownThisSession = new Set<string>()

export function onAchievementToast(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function emitAchievementToast(id: string, label: string) {
  if (shownThisSession.has(id)) return
  shownThisSession.add(id)
  for (const fn of listeners) fn(label)
}

export function resetAchievementToastsForTests() {
  shownThisSession.clear()
}

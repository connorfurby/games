/** Open the global profile sheet from any surface (shelf or in-play). */
const OPEN = 'games:open-profile'

export function openProfileSheet() {
  window.dispatchEvent(new CustomEvent(OPEN))
}

export function subscribeProfileOpen(handler: () => void) {
  const fn = () => handler()
  window.addEventListener(OPEN, fn)
  return () => window.removeEventListener(OPEN, fn)
}

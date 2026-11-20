/** After cloud hydrate writes memory, engines / museum / meta must re-read. */

export function wireCloudReload(handlers: {
  grocery: () => void
  signal: () => void
  meta?: () => void
  museum?: () => void
}) {
  const onReload = () => {
    try {
      handlers.museum?.()
    } catch (e) {
      console.error('museum cloud reload', e)
    }
    try {
      handlers.grocery()
    } catch (e) {
      console.error('grocery cloud reload', e)
    }
    try {
      handlers.signal()
    } catch (e) {
      console.error('signal cloud reload', e)
    }
    try {
      handlers.meta?.()
    } catch (e) {
      console.error('meta cloud reload', e)
    }
  }
  window.addEventListener('games:cloud-reloaded', onReload)
  return () => window.removeEventListener('games:cloud-reloaded', onReload)
}

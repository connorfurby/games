/** After cloud hydrate writes disk, engines must re-read without double offline. */

export function wireCloudReload(handlers: { grocery: () => void; signal: () => void; meta?: () => void }) {
  const onReload = () => {
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

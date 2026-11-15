import { useEffect, useRef, useSyncExternalStore } from 'react'

/** Join class names, skipping falsy parts. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

function subscribeReduced(cb: () => void) {
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => {
    mo.disconnect()
    mq.removeEventListener('change', cb)
  }
}

function readReduced() {
  return (
    document.documentElement.classList.contains('ge-reduced-motion') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * True when motion should be skipped. Follows the in-game toggle (html.ge-reduced-motion,
 * set from settings) and the OS preference, so kit parts work with or without GameProvider.
 * Pass `override` to force it (e.g. from `useGame().reducedMotion`).
 */
export function useReducedMotion(override?: boolean): boolean {
  const live = useSyncExternalStore(subscribeReduced, readReduced, () => false)
  return override ?? live
}

/** Subscribe to a CSS media query. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Phone layout (<= 720px): bottom sheets, single column. */
export function usePhone(): boolean {
  return useMediaQuery('(max-width: 720px)')
}

/** Call `onEscape` while `active`. */
export function useEscape(active: boolean, onEscape: () => void) {
  const ref = useRef(onEscape)
  useEffect(() => {
    ref.current = onEscape
  })
  useEffect(() => {
    if (!active) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        ref.current()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [active])
}

/**
 * Tiny module-level event bus between `spawnFx()` / `celebrate()` callers and <FxLayer />.
 * Nothing here touches React or the sim, so it is safe to call from anywhere.
 */

export type FxKind = 'gain' | 'cost' | 'info' | 'burst' | 'toast' | 'sweep'

export interface FxSpec {
  text?: string
  /** Viewport px. Defaults to the horizontal center, upper third of the screen. */
  x?: number
  y?: number
  kind?: FxKind
}

export interface FxItem extends FxSpec {
  id: number
  kind: FxKind
}

type Listener = (item: FxItem) => void

const listeners = new Set<Listener>()
let seq = 1

/** Max floating items alive at once (oldest dropped first). */
export const FX_POOL_MAX = 12

/** In-game toggle (html.ge-reduced-motion) or the OS preference. */
export function fxReducedMotion(): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return true
  if (document.documentElement.classList.contains('ge-reduced-motion')) return true
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Float some text / a particle burst on screen. No-op under reduced motion or with no layer mounted. */
export function spawnFx(spec: FxSpec = {}): void {
  if (listeners.size === 0 || fxReducedMotion()) return
  const item: FxItem = { ...spec, kind: spec.kind ?? 'info', id: seq++ }
  for (const l of listeners) l(item)
}

export function subscribeFx(l: Listener): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Center of an element in viewport px (for anchoring FX to a button or card). */
export function centerOf(el: Element | null | undefined): { x: number; y: number } | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

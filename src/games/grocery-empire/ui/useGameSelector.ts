import { useRef, useSyncExternalStore } from 'react'
import { engine } from '../sim/engine'
import type { GameState } from '../sim/state'

/** Shallow compare for plain objects / arrays returned from a selector. */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false
  }
  return true
}

/**
 * Subscribe to a slice of the sim without re-rendering on every pulse.
 *
 * The component only re-renders when `isEqual(prev, next)` is false (default `Object.is`),
 * so `useGameSelector((s) => s.cash)` repaints when cash changes, not on every 5 Hz bump.
 *
 * GameState is mutated in place: select primitives or build a fresh derived value
 * (pair it with `shallowEqual`). Never return a reference into state and expect a change
 * to be noticed.
 */
export function useGameSelector<T>(
  selector: (s: GameState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const selRef = useRef(selector)
  const eqRef = useRef(isEqual)
  selRef.current = selector
  eqRef.current = isEqual
  const cache = useRef<{ value: T } | null>(null)

  const getSnapshot = (): T => {
    const next = selRef.current(engine.getState())
    const c = cache.current
    if (c && eqRef.current(c.value, next)) return c.value
    cache.current = { value: next }
    return next
  }

  return useSyncExternalStore(engine.subscribe, getSnapshot, getSnapshot)
}

import { useRef } from 'react'

/**
 * Calm a value that flickers with live cash (suggestions, badges, "limit" readouts).
 * A new value is adopted only after it has held for `settleMs`, and whatever is shown
 * stays for at least `holdMs`. Same-key updates pass straight through so numbers stay fresh.
 */
export function useStable<T>(
  value: T,
  key: (v: T) => string = (v) => String(v),
  settleMs = 1500,
  holdMs = 4000,
): T {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const shown = useRef<{ v: T; k: string; since: number } | null>(null)
  const pending = useRef<{ k: string; since: number } | null>(null)
  const k = key(value)

  if (shown.current == null) {
    // The first value isn't "held": the next real change may land after the settle time.
    shown.current = { v: value, k, since: now - holdMs }
    return value
  }
  if (k === shown.current.k) {
    shown.current.v = value
    pending.current = null
    return value
  }
  if (pending.current?.k !== k) pending.current = { k, since: now }
  if (now - pending.current.since >= settleMs && now - shown.current.since >= holdMs) {
    shown.current = { v: value, k, since: now }
    pending.current = null
    return value
  }
  return shown.current.v
}

/** True at once; back to false only after it has stayed false for `offMs`. */
export function useSticky(flag: boolean, offMs = 2000): boolean {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const lastTrue = useRef<number | null>(null)
  if (flag) {
    lastTrue.current = now
    return true
  }
  return lastTrue.current != null && now - lastTrue.current < offMs
}

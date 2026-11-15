import { useEffect, useRef, useState } from 'react'

export type FlashDir = 'up' | 'down' | null

export interface FlashOptions {
  /** How long the flag stays set. Default 600ms. */
  ms?: number
  /** Ignore changes smaller than this ratio of the previous value (kills per-tick noise). Default 0.02. */
  minRatio?: number
  /** Ignore changes smaller than this absolute amount. Default 0. */
  minDelta?: number
}

/**
 * 'up' | 'down' for ~600ms after `value` jumps, else null.
 * Pair with `data-fx-flash={dir ?? undefined}` (fx.css colors it) or your own class.
 */
export function useFlash(value: number, opts: FlashOptions = {}): FlashDir {
  const { ms = 600, minRatio = 0.02, minDelta = 0 } = opts
  const prev = useRef(value)
  const timer = useRef<number | undefined>(undefined)
  const [dir, setDir] = useState<FlashDir>(null)

  useEffect(() => {
    const before = prev.current
    prev.current = value
    if (!Number.isFinite(value) || !Number.isFinite(before) || value === before) return
    const d = Math.abs(value - before)
    if (d < minDelta || d < minRatio * Math.abs(before)) return
    setDir(value > before ? 'up' : 'down')
    // Timer lives in a ref so a later, smaller change can't cancel the reset and leave it stuck.
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDir(null), ms)
  }, [value, ms, minRatio, minDelta])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return dir
}

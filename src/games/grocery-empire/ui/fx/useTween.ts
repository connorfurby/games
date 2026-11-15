import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../kit/hooks'

export interface TweenOptions {
  /** Tween length in ms. Default 450. */
  duration?: number
  /** Easing on 0..1. Default easeOutCubic. */
  ease?: (t: number) => number
  /** Force reduced motion (e.g. from `useGame().reducedMotion`). Default follows html class / OS. */
  reducedMotion?: boolean
  /** Jumps bigger than this ratio of the current value snap instead of rolling. Default: never snap. */
  snapRatio?: number
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Smoothly follow a number with requestAnimationFrame.
 *
 * Unlike the old RollingNumber it can never get stuck: every run ends by writing the exact
 * target (a rAF-independent timeout backs up throttled / hidden tabs), a new target restarts
 * from whatever is on screen, non-finite values snap, and reduced motion returns `value` as-is.
 */
export function useTween(value: number, opts: TweenOptions = {}): number {
  const { duration = 450, ease = easeOutCubic, snapRatio } = opts
  const reduced = useReducedMotion(opts.reducedMotion)
  const [shown, setShown] = useState(value)
  const shownRef = useRef(value)
  const easeRef = useRef(ease)
  easeRef.current = ease

  useEffect(() => {
    const finish = (v: number) => {
      shownRef.current = v
      setShown(v)
    }
    const from = shownRef.current
    const to = value
    const snap =
      reduced ||
      from === to ||
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      duration <= 0 ||
      (snapRatio != null && Math.abs(to - from) > snapRatio * Math.max(1, Math.abs(from))) ||
      (typeof document !== 'undefined' && document.hidden)
    if (snap) {
      if (from !== to) finish(to)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      if (p >= 1) {
        finish(to)
        return
      }
      const v = from + (to - from) * easeRef.current(p)
      shownRef.current = v
      setShown(v)
      raf = window.requestAnimationFrame(step)
    }
    raf = window.requestAnimationFrame(step)
    // Safety net: if rAF is throttled the number still lands on the truth.
    const guard = window.setTimeout(() => finish(to), duration + 120)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(guard)
    }
  }, [value, duration, reduced, snapRatio])

  // Reduced motion (or an exact match) always reports the real value, never a stale tween frame.
  return reduced ? value : shown
}

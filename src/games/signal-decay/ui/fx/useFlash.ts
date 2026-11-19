import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../kit/hooks'

export type FlashDir = 'up' | 'down' | null

/**
 * Returns 'up' / 'down' for `ms` after `value` changes, else null.
 * Apply as a class (e.g. `is-flash-up`) on the number that moved. Skipped under reduced motion.
 */
export function useFlash(value: number, ms = 600): FlashDir {
  const reduced = useReducedMotion()
  const prev = useRef(value)
  const [dir, setDir] = useState<FlashDir>(null)
  useEffect(() => {
    if (value === prev.current) return
    const next: FlashDir = value > prev.current ? 'up' : 'down'
    prev.current = value
    if (reduced) return
    setDir(next)
    const id = window.setTimeout(() => setDir(null), ms)
    return () => window.clearTimeout(id)
  }, [value, ms, reduced])
  return dir
}

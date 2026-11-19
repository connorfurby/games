import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../kit/hooks'

/** Eases toward `target` over `ms`. Snaps instantly under reduced motion or for tiny deltas. */
export function useTween(target: number, ms = 350): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(target)
  const cur = useRef(target)

  useEffect(() => {
    const from = cur.current
    if (reduced || Math.abs(target - from) < 1e-6 || ms <= 0) {
      cur.current = target
      setValue(target)
      return
    }
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - t, 3)
      cur.current = from + (target - from) * eased
      setValue(cur.current)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms, reduced])

  return value
}

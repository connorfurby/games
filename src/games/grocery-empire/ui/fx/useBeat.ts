import { useEffect, useState } from 'react'
import { useGame } from '../GameContext'

/**
 * True for `ms` after `value` changes (never on first paint). Always false under reduced motion,
 * so a beat is a pure garnish: the state it marks is already visible without it.
 */
export function useBeat(value: unknown, ms = 260): boolean {
  const { reducedMotion } = useGame()
  const [seen, setSeen] = useState(value)
  const [on, setOn] = useState(false)
  if (!Object.is(seen, value)) {
    setSeen(value)
    setOn(!reducedMotion)
  }
  useEffect(() => {
    if (!on) return
    const t = window.setTimeout(() => setOn(false), ms)
    return () => window.clearTimeout(t)
  }, [on, ms])
  return on && !reducedMotion
}

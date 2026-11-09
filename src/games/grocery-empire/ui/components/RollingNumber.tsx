import { useEffect, useRef, useState } from 'react'

/**
 * A number that rolls toward its target instead of jumping, with a brief green/red
 * flash on a big change. Falls back to a plain number with reduced motion.
 */
export function RollingNumber({
  value,
  format,
  reducedMotion = false,
  className = '',
}: {
  value: number
  format: (n: number) => string
  reducedMotion?: boolean
  className?: string
}) {
  const [shown, setShown] = useState(value)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const from = useRef(value)
  const raf = useRef<number | null>(null)
  const prev = useRef(value)

  useEffect(() => {
    if (reducedMotion || !Number.isFinite(value)) {
      setShown(value)
      prev.current = value
      return
    }
    const delta = value - prev.current
    // Only flash on a jump (a purchase or a payout), not on the steady trickle.
    if (Math.abs(delta) > Math.max(1, Math.abs(prev.current) * 0.02)) {
      setFlash(delta > 0 ? 'up' : 'down')
      const t = window.setTimeout(() => setFlash(null), 450)
      prev.current = value
      from.current = shown
      const start = performance.now()
      const dur = 380
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / dur)
        const e = 1 - Math.pow(1 - k, 3)
        setShown(from.current + (value - from.current) * e)
        if (k < 1) raf.current = requestAnimationFrame(step)
      }
      if (raf.current) cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(step)
      return () => window.clearTimeout(t)
    }
    prev.current = value
    if (raf.current == null) setShown(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reducedMotion])

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current)
  }, [])

  // When a roll finishes, settle on the true value.
  useEffect(() => {
    const t = window.setTimeout(() => {
      raf.current = null
      setShown(value)
    }, 420)
    return () => window.clearTimeout(t)
  }, [value])

  return <span className={`rn${flash ? ` rn--${flash}` : ''} ${className}`.trim()}>{format(shown)}</span>
}

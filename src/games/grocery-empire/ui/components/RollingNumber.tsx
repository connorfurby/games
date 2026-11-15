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
  const shownRef = useRef(value)
  const prev = useRef(value)
  const raf = useRef<number | null>(null)
  const flashTimer = useRef<number | null>(null)

  useEffect(() => {
    shownRef.current = shown
  }, [shown])

  useEffect(() => {
    if (reducedMotion || !Number.isFinite(value)) {
      if (raf.current != null) {
        cancelAnimationFrame(raf.current)
        raf.current = null
      }
      setShown(value)
      prev.current = value
      return
    }

    const delta = value - prev.current
    const jump = Math.abs(delta) > Math.max(1, Math.abs(prev.current) * 0.02)
    prev.current = value

    // Steady trickle: snap to the live value. Never block behind a leftover RAF.
    if (!jump) {
      if (raf.current == null) setShown(value)
      return
    }

    setFlash(delta > 0 ? 'up' : 'down')
    if (flashTimer.current != null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 450)

    const from = shownRef.current
    const start = performance.now()
    const dur = 380
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur)
      const e = 1 - Math.pow(1 - k, 3)
      const next = from + (value - from) * e
      shownRef.current = next
      setShown(next)
      if (k < 1) {
        raf.current = requestAnimationFrame(step)
      } else {
        raf.current = null
        shownRef.current = value
        setShown(value)
      }
    }
    if (raf.current != null) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(step)
  }, [value, reducedMotion])

  useEffect(
    () => () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
      if (flashTimer.current != null) window.clearTimeout(flashTimer.current)
    },
    [],
  )

  return <span className={`rn${flash ? ` rn--${flash}` : ''} ${className}`.trim()}>{format(shown)}</span>
}

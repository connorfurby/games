import { useEffect, useState, type ReactNode } from 'react'
import { useGame } from '../GameContext'

/** 240ms translate from backroom chip toward the shelf on unpack. */
export function CrateHop({
  active,
  children,
  className = '',
}: {
  active: boolean
  children?: ReactNode
  className?: string
}) {
  const { reducedMotion } = useGame()
  const [hop, setHop] = useState(false)
  useEffect(() => {
    if (!active || reducedMotion) {
      setHop(false)
      return
    }
    setHop(true)
    const t = window.setTimeout(() => setHop(false), 240)
    return () => window.clearTimeout(t)
  }, [active, reducedMotion])
  return (
    <span
      className={`fx-crate-hop${hop ? ' is-hop' : ''}${className ? ` ${className}` : ''}`.trim()}
      aria-hidden
    >
      {children}
    </span>
  )
}

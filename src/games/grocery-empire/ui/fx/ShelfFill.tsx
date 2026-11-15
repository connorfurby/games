import type { CSSProperties, ReactNode } from 'react'
import { useGame } from '../GameContext'

/** Width/scale of a shelf rect over --dur-base. Reduced motion snaps. */
export function ShelfFill({
  fill,
  className = '',
  style,
  children,
}: {
  fill: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  const { reducedMotion } = useGame()
  const pct = Math.max(0, Math.min(1, fill)) * 100
  return (
    <div
      className={`fx-shelf-fill${className ? ` ${className}` : ''}`}
      style={{
        ...style,
        ['--fx-fill' as string]: `${pct}%`,
        transition: reducedMotion ? 'none' : 'width var(--dur-base) var(--ease-out)',
        width: `${pct}%`,
      }}
    >
      {children}
    </div>
  )
}

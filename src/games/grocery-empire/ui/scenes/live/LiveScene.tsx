import type { ReactNode } from 'react'
import { useGame } from '../../GameContext'

/**
 * Shared 960×220 department stage. Animations only run under `is-live`,
 * pause when the sim is paused, and honor the in-game reduced-motion setting.
 */
export function LiveScene({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  const { state: s, reducedMotion } = useGame()
  const live = !reducedMotion && !s.paused
  return (
    <figure className={`ls${live ? ' is-live' : ''}${s.paused ? ' is-paused' : ''} ${className}`.trim()}>
      <svg className="ls-svg" viewBox="0 0 960 220" role="img" aria-label={label}>
        {children}
      </svg>
    </figure>
  )
}

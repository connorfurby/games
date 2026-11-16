import type { KeyboardEvent, ReactNode } from 'react'
import { useGame } from '../../GameContext'

/**
 * Tappable SVG region. Jumps to a menu and/or scrolls to a coach/suggest target.
 */
export function Hit({
  x,
  y,
  w,
  h,
  label,
  menu,
  coachId,
  onActivate,
  className = '',
  children,
}: {
  x: number
  y: number
  w: number
  h: number
  label: string
  menu?: string
  coachId?: string
  onActivate?: () => void
  /** Extra hook for cosmetic CSS (e.g. unpack FX). */
  className?: string
  children?: ReactNode
}) {
  const { setActiveMenu, focusSuggestion, suggestions, reducedMotion } = useGame()

  const activate = () => {
    if (menu) setActiveMenu(menu)
    if (coachId) {
      const match = suggestions.find((s) => s.target === coachId || s.id === coachId)
      if (match) focusSuggestion(match)
      else {
        window.requestAnimationFrame(() => {
          const el = document.querySelector(`[data-coach-id="${coachId}"], [data-suggest-id="${coachId}"]`)
          el?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
          el?.classList.add('ge-suggest-flash')
          window.setTimeout(() => el?.classList.remove('ge-suggest-flash'), 900)
        })
      }
    }
    onActivate?.()
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate()
    }
  }

  return (
    <g
      className={`rm-hit pf-press${className ? ` ${className}` : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={activate}
      onKeyDown={onKey}
    >
      <title>{label}</title>
      <rect className="rm-hit__ring" x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="6" />
      <rect x={x} y={y} width={w} height={h} fill="transparent" />
      {children}
    </g>
  )
}

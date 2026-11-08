import type { ReactNode } from 'react'
import { useIsSuggested } from '../GameContext'

/** Scroll target only — no badge chrome. Highlight is a soft ring when primary. */
export function SuggestMark({
  id,
  children,
  className = '',
}: {
  id: string
  children: ReactNode
  className?: string
  badge?: boolean
  badgeTitle?: string
}) {
  const suggested = useIsSuggested(id)
  return (
    <div
      data-suggest-id={id}
      className={`ge-suggest-mark${suggested ? ' is-suggested' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  )
}

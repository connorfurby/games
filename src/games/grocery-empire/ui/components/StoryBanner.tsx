import { useMemo } from 'react'
import type { GameState } from '../../sim/state'

/** Big bottom dialogue — latest story ledger line while early game still teaches. */
export function StoryBanner({ state }: { state: GameState }) {
  const line = useMemo(() => {
    const rows = state.ledger ?? []
    for (let i = rows.length - 1; i >= 0; i--) {
      const e = rows[i]
      if (e?.kind === 'story') return e
    }
    return null
  }, [state.ledger, state.nextLedgerId])

  const show = !state.introSeen || state.era < 2 || state.baskets < 120
  if (!show || !line) return null

  return (
    <div className="ge-story-banner" role="status" aria-live="polite">
      <span className="ge-story-banner__label">Story</span>
      <p className="ge-story-banner__text">{line.text}</p>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { speakerForEra } from '../../art/cast'
import type { GameState } from '../../sim/state'
import { SpeakerChrome } from './SpeakerChrome'

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

  const [pulse, setPulse] = useState(false)
  const [pinnedId, setPinnedId] = useState<number | null>(null)

  useEffect(() => {
    if (!line) return
    if (pinnedId === line.id) return
    setPinnedId(line.id)
    setPulse(true)
    const t = window.setTimeout(() => setPulse(false), 900)
    return () => window.clearTimeout(t)
  }, [line, pinnedId])

  const speaker = speakerForEra(state.era)

  return (
    <div
      className={`ge-story-banner${pulse ? ' is-pulse' : ''}`.trim()}
      role="status"
      aria-live="polite"
    >
      <SpeakerChrome speaker={speaker} size={32} className="ge-story-banner__speaker" />
      <div className="ge-story-banner__copy">
        <div className="ge-story-banner__head">
          <span className="ge-story-banner__label">Story</span>
          <span className="ge-story-banner__era">Era {state.era}</span>
        </div>
        <p className="ge-story-banner__text">
          {line?.text ?? 'The aisle keeps quiet until the next lesson lands.'}
        </p>
      </div>
    </div>
  )
}

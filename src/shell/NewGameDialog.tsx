import { useEffect, useId, useState } from 'react'
import { Button } from '@/games/grocery-empire/ui/kit'
import { applyReset } from './applyReset'
import { useMeta } from './MetaContext'
import { RESET_EVERYTHING, RESET_NOTHING } from './resetData'

type Choice = 'keep' | 'fresh'

/**
 * New game. A run and a collection are two different things, so the player picks:
 * start a new run and keep the Museum, awards and shop, or start with nothing at all.
 * No option is pre-selected: starting over is never an accident.
 */
export function NewGameDialog({
  open,
  onClose,
  onStarted,
  relics,
  awards,
  tokens,
}: {
  open: boolean
  onClose: () => void
  /** Runs after the reset; the caller navigates or closes its drawer. */
  onStarted: () => void
  relics: number
  awards: number
  tokens: number
}) {
  const { meta, replaceMeta } = useMeta()
  const [choice, setChoice] = useState<Choice | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    setChoice(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  if (!open) return null
  const start = () => {
    if (!choice) return
    applyReset(choice === 'fresh' ? RESET_EVERYTHING : { ...RESET_NOTHING, run: true }, meta, replaceMeta)
    onStarted()
  }
  const have = [
    relics > 0 ? `${relics} relic${relics === 1 ? '' : 's'}` : '',
    awards > 0 ? `${awards} award${awards === 1 ? '' : 's'}` : '',
    tokens > 0 ? `${tokens} token${tokens === 1 ? '' : 's'}` : '',
  ].filter(Boolean)

  return (
    <div className="app-modal" style={{ zIndex: 100 }} role="presentation" onClick={onClose}>
      <div className="ng" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h2 id={titleId} className="ng__title">
          Start a new game
        </h2>
        <p className="ng__lede">Your current run ends either way. Choose what happens to your collection.</p>
        <div className="ng__choices" role="radiogroup" aria-label="What to keep">
          <button
            type="button"
            role="radio"
            aria-checked={choice === 'keep'}
            className={`ng__choice${choice === 'keep' ? ' is-on' : ''}`}
            onClick={() => setChoice('keep')}
          >
            <strong>Keep my collection</strong>
            <span>
              A new run from the first counter. Your Museum, awards, tokens and shop purchases stay
              {have.length ? ` (${have.join(', ')})` : ''}.
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={choice === 'fresh'}
            className={`ng__choice ng__choice--danger${choice === 'fresh' ? ' is-on' : ''}`}
            onClick={() => setChoice('fresh')}
          >
            <strong>Start completely fresh</strong>
            <span>Everything goes: the run, the Museum, every award, your tokens and purchases, and the three save slots.</span>
          </button>
        </div>
        <div className="ng__acts">
          <Button onClick={onClose}>Cancel</Button>
          <Button tone={choice === 'fresh' ? 'danger' : 'free'} disabled={!choice} onClick={start}>
            {choice === 'fresh' ? 'Erase everything and start' : 'Start new game'}
          </Button>
        </div>
      </div>
    </div>
  )
}

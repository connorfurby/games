import { goalNeeds, nextGoal } from '../../content/goals'
import { useSticky } from '../useStable'
import { can } from '../../sim/commands'
import type { GameState } from '../../sim/state'
import type { Command } from '../../sim/commands'
import type { NumberFormat } from '@/shared/bn'
import { money, qty } from '../format'

/** Seconds until `need` cash at the current net rate, or null if not earning. */
function etaSec(s: GameState, need: number): number | null {
  const net = s.rates.revenuePerSec - s.rates.costPerSec
  if (need <= s.cash) return 0
  if (net <= 0.001) return null
  return (need - s.cash) / net
}

function eta(sec: number | null): string | null {
  if (sec == null) return null
  if (sec <= 0) return 'ready'
  if (sec < 60) return `about ${Math.ceil(sec)}s`
  if (sec < 3600) return `about ${Math.ceil(sec / 60)} min`
  return `about ${(sec / 3600).toFixed(1)} h`
}

/**
 * The campaign spine as one shelf tag: what to do next, how far along you are,
 * and a button that does it when it's affordable.
 */
export function NextGoal({
  state: s,
  numberFormat,
  dispatch,
}: {
  state: GameState
  numberFormat: NumberFormat
  dispatch: (cmd: Command) => void
}) {
  const g = nextGoal(s)
  const act0 = g?.action?.(s) ?? null
  // "Do it" lights at once, but only falls back to "Saving" after a couple of quiet seconds.
  const readyCalm = useSticky(!!act0 && can(s, act0).ok, 2500)
  if (!g) {
    return (
      <div className="g2-goal is-done" role="status">
        <span className="g2-goal__title">Every era is behind you.</span>
      </div>
    )
  }
  let progress = 0
  try {
    progress = Math.max(0, Math.min(1, g.progress(s)))
  } catch {
    progress = 0
  }
  const needs = goalNeeds(s, g)
  const act = act0
  const ready = readyCalm
  const t = needs.cash > 0 && !ready ? eta(etaSec(s, needs.cash)) : null
  const also: string[] = []
  if (needs.attention > 0) also.push(`${qty(needs.attention, numberFormat)} Attention`)
  if (needs.ideas > 0) also.push(`${qty(needs.ideas, numberFormat)} Ideas`)
  const price = needs.cash > 0 ? money(needs.cash, numberFormat) : also.length ? also.shift()! : 'Free'

  return (
    <div className={`g2-goal${ready ? ' is-ready' : ''}`} role="group" aria-label={`Next goal: ${g.title}`}>
      <div className="g2-goal__copy">
        <span className="g2-goal__title">{g.title}</span>
        <span className="g2-goal__hint">
          {g.hint}
          {also.length ? <span className="g2-goal__eta"> Also needs {also.join(' and ')}.</span> : null}
          {t ? <span className="g2-goal__eta"> Ready in {t}.</span> : null}
        </span>
      </div>
      <div className="g2-goal__meter" aria-hidden>
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      {act ? (
        <button
          type="button"
          className="g2-tag"
          disabled={!ready}
          onClick={() => dispatch(act)}
          title={ready ? 'Do it now' : (act ? can(s, act).reason : undefined) ?? 'Not yet'}
        >
          <span className="g2-tag__price">{price}</span>
          <span className="g2-tag__label">{ready ? 'Do it' : 'Saving'}</span>
        </button>
      ) : null}
    </div>
  )
}

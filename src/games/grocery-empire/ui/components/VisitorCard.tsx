import { VISITOR_BY_ID, type VisitorChoice } from '../../content/visitors'
import { VISITOR } from '../../sim/balance'
import { can } from '../../sim/commands'
import { choiceCost } from '../../sim/systems/visitors'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Button } from '../kit'
import './visitor.css'

/** Someone at the door: a corner card with two choices. Ignore it and they leave. */
export function VisitorCard({ reducedMotion }: { reducedMotion: boolean }) {
  const { state: s, dispatch, numberFormat } = useGame()
  const cur = s.visitors?.current
  const def = cur ? VISITOR_BY_ID[cur.id] : undefined
  if (!cur || !def || cur.until <= s.time) return null
  const left = Math.max(0, cur.until - s.time)

  const option = (pick: 'a' | 'b', c: VisitorChoice) => {
    const check = can(s, { type: 'answerVisitor', pick })
    const cost = choiceCost(s, c.effects)
    return (
      <div className="vz-opt">
        <Button
          tone={pick === 'a' ? 'primary' : 'ghost'}
          disabled={!check.ok}
          cost={cost > 0 ? money(cost, numberFormat) : undefined}
          onClick={() => dispatch({ type: 'answerVisitor', pick })}
          title={check.ok ? c.hint : check.reason}
        >
          {c.label}
        </Button>
        <span className="vz-opt__hint">{c.hint}</span>
      </div>
    )
  }

  return (
    <aside className="vz" role="status" aria-labelledby="vz-who">
      <div key={cur.id} className={`vz-card${reducedMotion ? '' : ' vz-card--in'}`}>
        <span className="vz-life" aria-hidden>
          <i style={{ transform: `scaleX(${Math.min(1, left / VISITOR.waitSec)})` }} />
        </span>
        <p className="vz-k">
          <span className="vz-door" aria-hidden>
            🚪
          </span>
          Someone at the door
        </p>
        <h2 id="vz-who" className="vz-who">
          {def.who}
        </h2>
        <p className="vz-says">{def.says}</p>
        <div className="vz-opts">
          {option('a', def.a)}
          {option('b', def.b)}
        </div>
      </div>
    </aside>
  )
}

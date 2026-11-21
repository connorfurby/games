import { CRISIS_BY_ID } from '../../content/corp/more'
import { CRISIS, CRISIS_KIND_LABEL } from '../../sim/balance'
import { can } from '../../sim/commands'
import { crisisCost, crisisOdds } from '../../sim/corp/more'
import { useGame } from '../GameContext'
import { clock, money } from '../format'
import { Button } from '../kit'
import './visitor.css'

/** A crisis: a red corner card with three answers and a clock. Ignore it and it gets worse. */
export function CrisisCard({ reducedMotion }: { reducedMotion: boolean }) {
  const { state: s, dispatch, numberFormat } = useGame()
  const cur = s.corp?.more.crisis
  const def = cur ? CRISIS_BY_ID[cur.id] : undefined
  if (!cur || !def || cur.until <= s.time) return null
  const left = cur.until - s.time
  return (
    <aside className="vz vz--crisis" role="alert" aria-labelledby="cz-title">
      <div key={cur.id} className={`vz-card${reducedMotion ? '' : ' vz-card--in'}`}>
        <span className="vz-life" aria-hidden>
          <i style={{ transform: `scaleX(${Math.min(1, left / CRISIS.waitSec)})` }} />
        </span>
        <p className="vz-k">
          Crisis · {CRISIS_KIND_LABEL[def.kind]} · {clock(left)} to respond
        </p>
        <h2 id="cz-title" className="vz-who">
          {def.title}
        </h2>
        <p className="vz-says">{def.body}</p>
        <div className="vz-opts">
          {def.options.map((o, i) => {
            const ok = can(s, { type: 'answerCrisis', pick: i }).ok
            const cost = crisisCost(s, o.costSec)
            return (
              <div key={o.label} className="vz-opt">
                <Button tone={i === 0 ? 'primary' : 'ghost'} disabled={!ok} cost={o.costSec > 0 ? money(cost, numberFormat) : undefined} onClick={() => dispatch({ type: 'answerCrisis', pick: i })}>
                  {o.label}
                </Button>
                <span className="vz-opt__hint">
                  {o.hint} · {Math.round(crisisOdds(s, o.odds) * 100)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

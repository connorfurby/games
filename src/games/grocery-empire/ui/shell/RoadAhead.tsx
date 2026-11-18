import { GOALS, nextGoal } from '../../content/goals'
import { ERA_STORY } from '../../content/lore'
import { useGame } from '../GameContext'

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/**
 * The road ahead: the goals left between you and the next era, in order, ending at the door.
 * The Next goal card shows one step; this shows the whole stretch so a long wait has a shape.
 */
export function RoadAhead() {
  const { state: s } = useGame()
  const cur = nextGoal(s)
  if (!cur) return null
  const start = GOALS.indexOf(cur)
  // Walk forward to the goal that opens the next era (inclusive), at most 8 steps.
  const road = []
  for (let i = start; i < GOALS.length && road.length < 8; i++) {
    const g = GOALS[i]!
    road.push(g)
    if (g.opensEra != null) break
  }
  const door = road[road.length - 1]?.opensEra
  const doneHere = GOALS.filter((g) => g.era === s.era && safe(() => g.done(s), false)).length

  return (
    <section className="ge-more-block ra" aria-label="Road ahead">
      <header className="ge-more-block__head">
        <h3>Road ahead</h3>
        <p>
          {door != null
            ? `${road.length} step${road.length === 1 ? '' : 's'} to ${ERA_STORY[door]?.title ?? `Era ${door}`}.`
            : 'The next few goals.'}{' '}
          {doneHere > 0 ? `${doneHere} done this era.` : ''}
        </p>
      </header>
      <ol className="ra-list">
        {road.map((g, i) => {
          const p = Math.max(0, Math.min(1, safe(() => g.progress(s), 0)))
          return (
            <li key={g.id} className={`${i === 0 ? 'is-now' : ''}${g.opensEra != null ? ' is-door' : ''}`}>
              <span className="ra-pin" aria-hidden>
                {g.opensEra != null ? '★' : i + 1}
              </span>
              <span className="ra-body">
                <strong>{g.title}</strong>
                {i === 0 ? <span className="ra-hint">{g.hint}</span> : null}
                {i === 0 && g.counts ? <span className="ra-hint ra-left">{safe(() => g.counts!(s), '')}</span> : null}
                {i === 0 && p > 0 ? (
                  <span className="ra-bar" aria-hidden>
                    <i style={{ width: `${p * 100}%` }} />
                  </span>
                ) : null}
                {g.opensEra != null ? (
                  <span className="ra-door">Opens {ERA_STORY[g.opensEra]?.title ?? `Era ${g.opensEra}`}</span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

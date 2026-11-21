import { GOALS, goalStatus, nextGoal, type GoalDef, type GoalPart } from '../../content/goals'
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
  // Walk forward to the goal that opens the next era (inclusive). No artificial 8-step cap —
  // every remaining requirement on the way to the door must stay visible.
  const road: GoalDef[] = []
  for (let i = start; i < GOALS.length; i++) {
    const g = GOALS[i]!
    road.push(g)
    if (g.opensEra != null) break
  }
  const door = road[road.length - 1]
  const doorEra = door?.opensEra
  const doneHere = GOALS.filter((g) => g.era === s.era && safe(() => g.done(s), false)).length
  // Door checklist always expands — even while you are still on an earlier step.
  const doorChecklist =
    door?.doorParts != null ? safe(() => door.doorParts!(s), [] as GoalPart[]) : ([] as GoalPart[])

  return (
    <section className="ge-more-block ra" aria-label="Road ahead">
      <header className="ge-more-block__head">
        <h3>Road ahead</h3>
        <p>
          {doorEra != null
            ? `${road.length} step${road.length === 1 ? '' : 's'} to ${ERA_STORY[doorEra]?.title ?? `Era ${doorEra}`}.`
            : 'The next few goals.'}{' '}
          {doneHere > 0 ? `${doneHere} done this era.` : ''}
        </p>
      </header>
      <ol className="ra-list">
        {road.map((g, i) => {
          const isNow = i === 0
          const isDoor = g.opensEra != null
          const p = Math.max(0, Math.min(1, safe(() => g.progress(s), 0)))
          const status = safe(() => goalStatus(s, g), '')
          const showDoorRows = isDoor && doorChecklist.length > 0
          return (
            <li key={g.id} className={`${isNow ? 'is-now' : ''}${isDoor ? ' is-door' : ''}`}>
              <span className="ra-pin" aria-hidden>
                {isDoor ? '★' : i + 1}
              </span>
              <span className="ra-body">
                <strong>{g.title}</strong>
                {isNow ? <span className="ra-hint">{g.hint}</span> : null}
                {!showDoorRows && status ? <span className="ra-hint ra-left">{status}</span> : null}
                {isNow && !showDoorRows && p > 0 && p < 1 ? (
                  <span className="ra-bar" aria-hidden>
                    <i style={{ width: `${p * 100}%` }} />
                  </span>
                ) : null}
                {showDoorRows ? (
                  <ul className="ra-parts" aria-label={`${g.title} checklist`}>
                    {doorChecklist.map((part) => (
                      <li key={part.label} className={part.done ? 'is-done' : ''}>
                        <span className="ra-parts__mark" aria-hidden>
                          {part.done ? '✓' : '·'}
                        </span>
                        <span className="ra-parts__label">{part.label}</span>
                        {part.detail ? <span className="ra-parts__detail">{part.detail}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {isDoor ? (
                  <span className="ra-door">Opens {ERA_STORY[g.opensEra!]?.title ?? `Era ${g.opensEra}`}</span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ol>
      {doorEra != null && ERA_STORY[doorEra] ? (
        <aside className="ra-next">
          <span className="ra-next__k">Next chapter</span>
          <strong>{ERA_STORY[doorEra].title}</strong>
          <em>“{ERA_STORY[doorEra].epigraph}”</em>
        </aside>
      ) : null}
    </section>
  )
}

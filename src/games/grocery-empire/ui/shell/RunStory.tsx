import { ERA_STORY } from '../../content/lore'
import { useGame } from '../GameContext'
import { clock, money, qty } from '../format'

/**
 * "Your run": the story of this run so far — a timeline of eras with how long each took,
 * the big numbers, and the last few minutes of sales. Read-only; it's for the player to enjoy.
 */
export function RunStory() {
  const { state: s, numberFormat } = useGame()
  const at = s.stats.eraAt ?? [0]
  const eras = Array.from({ length: s.era + 1 }, (_, e) => {
    const start = at[e]
    const end = e < s.era ? at[e + 1] : s.time
    const known = typeof start === 'number' && typeof end === 'number'
    return { e, title: ERA_STORY[e]?.title ?? `Era ${e}`, dur: known ? Math.max(0, end - start) : null, now: e === s.era }
  })
  const longest = Math.max(1, ...eras.map((r) => r.dur ?? 0))

  return (
    <section className="ge-more-block rs" aria-label="Run story">
      <header className="ge-more-block__head">
        <h3>Run story</h3>
        <p>{s.storeName ? `${s.storeName}: how` : 'How'} far this run has come, and how long each era took.</p>
      </header>
      <dl className="rs-big">
        <div>
          <dt>Baskets</dt>
          <dd>{qty(s.baskets)}</dd>
        </div>
        <div>
          <dt>Takings</dt>
          <dd>{money(s.lifetimeRevenue, numberFormat)}</dd>
        </div>
        <div>
          <dt>Most cash at once</dt>
          <dd>{money(s.stats.peakCash, numberFormat)}</dd>
        </div>
        <div>
          <dt>Stores</dt>
          <dd>{s.stores.length}</dd>
        </div>
      </dl>
      <ol className="rs-eras">
        {eras.map((r) => (
          <li key={r.e} className={r.now ? 'is-now' : ''}>
            <span className="rs-eras__n">{r.e}</span>
            <span className="rs-eras__t">{r.title}</span>
            <span className="rs-eras__bar" aria-hidden>
              <i style={{ width: `${r.dur == null ? 0 : Math.max(3, (r.dur / longest) * 100)}%` }} />
            </span>
            <span className="rs-eras__d">{r.dur == null ? '—' : r.now ? `${clock(r.dur)} so far` : clock(r.dur)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

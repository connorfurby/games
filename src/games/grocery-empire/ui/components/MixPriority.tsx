import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { restockTargets } from '../../sim/formulas'
import { useGame } from '../GameContext'
import { Btn } from './Btn'

/**
 * Restock priority (stored as s.mix).
 * Controls which aisles Unpack + Auto-order push onto the shelf —
 * not what shoppers buy. Shoppers keep their own tastes.
 */
export function MixPriority({
  coachId = 'floor-mix',
  compact = false,
}: {
  coachId?: string
  compact?: boolean
}) {
  const { state: s, dispatch } = useGame()
  const unlocked = CATEGORY_IDS.filter((c) => s.categories[c])
  if (unlocked.length < 2) return null

  const targets = restockTargets(s)
  const setAll = (fn: (c: CategoryId) => number) => {
    for (const c of unlocked) dispatch({ type: 'setMix', cat: c, weight: fn(c) })
  }

  return (
    <div className={`ge-mix-box${compact ? ' ge-mix-box--compact' : ''}`.trim()} data-coach-id={coachId}>
      <header className="ge-mix-box__head">
        <div>
          <h3>Restock priority</h3>
          <p>
            When Unpack pulls from the backroom, high-priority aisles go first — but only if that aisle
            already has crates waiting. Buy cans/household separately; this slider never orders them.
            Shopper tastes stay separate.
          </p>
        </div>
      </header>

      <ul className="ge-mix-box__list">
        {unlocked.map((c) => {
          const def = CATEGORIES[c]
          const pref = Math.round((s.mix[c] ?? 0.5) * 100)
          const share = Math.round((targets[c] ?? 0) * 100)
          const perish = def.life != null
          return (
            <li key={c} className="ge-mix-box__row">
              <div className="ge-mix-box__label">
                <strong>{def.name}</strong>
                <span>{perish ? 'Perishable' : 'Shelf-stable'}</span>
              </div>
              <input
                className="ge-range ge-mix-box__slider"
                type="range"
                min={0}
                max={100}
                step={5}
                value={pref}
                aria-label={`${def.name} restock priority`}
                onChange={(e) =>
                  dispatch({ type: 'setMix', cat: c, weight: Number(e.target.value) / 100 })
                }
              />
              <div className="ge-mix-box__share" title="Share of unpack / auto-order attention">
                <i style={{ width: `${share}%` }} />
                <em>{share}%</em>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="ge-mix-box__presets">
        <Btn tone="ghost" onClick={() => setAll(() => 0.5)}>
          Even
        </Btn>
        <Btn
          tone="ghost"
          onClick={() => setAll((c) => (CATEGORIES[c].life != null ? 0.85 : 0.35))}
        >
          Prefer fresh
        </Btn>
        <Btn
          tone="ghost"
          onClick={() => setAll((c) => (c === 'cans' ? 0.9 : 0.3))}
        >
          Prefer cans
        </Btn>
      </div>
    </div>
  )
}

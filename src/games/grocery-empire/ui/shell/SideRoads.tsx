import { AMBITION_MENUS } from '../../content/corp/ambitions'
import { MENUS, type MenuId } from '../../content/menus'
import { currentAmbition } from '../../sim/corp/ambitions'
import { CORP_OPENS } from '../../sim/corp/tick'
import { useGame } from '../GameContext'
import { Icon } from '../icons/Icon'

/**
 * Side roads: the ambitions closest to done on the company and town screens, and the
 * next of those screens to open. Optional, so it sits under the road, never in the HUD.
 */
export function SideRoads({ onOpen }: { onOpen?: (m: MenuId) => void }) {
  const { state: s, setActiveMenu } = useGame()
  const go = onOpen ?? setActiveMenu
  if (!s.corp) return null
  const open = AMBITION_MENUS.filter((m) => s.menus[m as MenuId])
    .map((m) => {
      const a = currentAmbition(s, m)
      if (!a) return null
      const [have, need] = a.progress(s)
      return { a, p: need > 0 ? Math.min(1, have / need) : 0 }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((x, y) => y.p - x.p)
    .slice(0, 3)
  const next = CORP_OPENS.find((o) => !s.menus[o.id])
  if (!open.length && !next) return null
  return (
    <section className="ge-more-block sr" aria-label="Side roads">
      <header className="ge-more-block__head">
        <h3>Side roads</h3>
        <p>Optional ambitions that pay a bonus the moment they’re met.</p>
      </header>
      {open.length ? (
        <ul className="sr-list">
          {open.map(({ a, p }) => (
            <li key={a.id}>
              <button type="button" className="sr-row" onClick={() => go(a.menu as MenuId)}>
                <Icon name={a.menu as MenuId} size={18} />
                <span className="sr-body">
                  <strong>{a.title}</strong>
                  <span>
                    {MENUS[a.menu as MenuId]?.name} · {a.hint}
                  </span>
                  <span className="sr-bar" aria-hidden>
                    <i style={{ width: `${p * 100}%` }} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {next ? (
        <p className="sr-next">
          <Icon name={next.id} size={16} tone="muted" /> Next to open: <strong>{MENUS[next.id]?.name}</strong> — {next.why}.
        </p>
      ) : null}
    </section>
  )
}

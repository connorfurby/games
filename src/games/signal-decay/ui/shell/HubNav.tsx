import { useGame } from '../GameContext'
import { HubIcon } from './HubIcon'
import { HUBS, type HubId } from './hubs'

/** Desktop: left rail. Phone: bottom bar. Same chrome language as GE hubs. */
export function HubNav({
  hub,
  onOpenHub,
  ready,
}: {
  hub: HubId
  onOpenHub: (id: HubId) => void
  /** Hubs with something actionable (dot). */
  ready?: ReadonlySet<string>
}) {
  const { state } = useGame()
  const showNetHint = state.era >= 2 && state.towers.length === 0

  return (
    <nav className="sd-hubs" aria-label="Departments">
      {HUBS.map((h, i) => {
        const active = hub === h.id
        const hit = ready?.has(h.id) || (h.id === 'network' && showNetHint && hub !== 'network')
        return (
          <button
            key={h.id}
            type="button"
            className={`sd-hub${active ? ' is-active' : ''}${hit ? ' is-suggest' : ''}`}
            onClick={() => onOpenHub(h.id)}
            title={`${h.purpose} (${i + 1})`}
            aria-current={active ? 'page' : undefined}
            data-coach-id={`hub-${h.id}`}
          >
            {active ? <span className="sd-hub__indicator" aria-hidden /> : null}
            <HubIcon name={h.icon} size={20} />
            <span className="sd-hub__name">{h.name}</span>
            {hit && !active ? <span className="sd-hub__dot" aria-label="Needs you" /> : null}
          </button>
        )
      })}
    </nav>
  )
}

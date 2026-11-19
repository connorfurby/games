import { HUB_BY_ID, subName, visibleSubs, type HubId, type HubSub } from './hubs'
import { useGame } from '../GameContext'

/** GE-shaped department head: title / section + subtab bar when the hub has more than one. */
export function HubHead({
  hub,
  sub,
  onSub,
  suggest,
}: {
  hub: HubId
  sub: HubSub
  onSub: (id: HubSub) => void
  suggest?: ReadonlySet<string>
}) {
  const { state } = useGame()
  const def = HUB_BY_ID[hub]
  const tabs = visibleSubs(hub, state.era)
  const dept = tabs.length > 1 ? subName(hub, sub) : undefined

  return (
    <header className="sd-hubhead">
      <div className="sd-hubhead__title">
        <h1>{def.name}</h1>
        {dept ? <p className="sd-hubhead__dept">{dept}</p> : null}
      </div>
      {tabs.length > 1 ? (
        <div className="sd-subtabs" role="tablist" aria-label={def.name}>
          {tabs.map((t) => {
            const active = sub === t.id
            const hit = suggest?.has(t.id)
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`sd-subtab${active ? ' is-active' : ''}${hit && !active ? ' is-suggest' : ''}`}
                title={t.purpose}
                onClick={() => onSub(t.id)}
              >
                {t.name}
                {hit && !active ? <span className="sd-subtab__dot" aria-hidden /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </header>
  )
}

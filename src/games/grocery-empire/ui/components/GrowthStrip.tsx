import type { MenuId } from '../../content/menus'
import { useGame } from '../GameContext'

export type GrowthMode = 'shell' | 'habits' | 'memory'

const STRIP: {
  id: GrowthMode
  menu: MenuId
  label: string
  job: string
  line: string
}[] = [
  {
    id: 'shell',
    menu: 'build',
    label: 'Build',
    job: 'Capacity',
    line: 'Spend cash once to change the building — shelf, cold, seats, trucks.',
  },
  {
    id: 'habits',
    menu: 'upgrades',
    label: 'Upgrades',
    job: 'Cash trees',
    line: 'Always-buy ranks with cash. Empire level opens the deeper ones.',
  },
  {
    id: 'memory',
    menu: 'empire',
    label: 'Empire',
    job: 'Run rank',
    line: 'Baskets raise your rank. Rank unlocks upgrade depth, invest caps, and demand — then spend trait points.',
  },
]

/**
 * Build · Upgrades · Empire — three different growth jobs.
 * Tabs jump departments so the triad is a map, not wallpaper.
 */
export function GrowthStrip({ mode }: { mode: GrowthMode }) {
  const { setActiveMenu, state } = useGame()
  const active = STRIP.find((x) => x.id === mode) ?? STRIP[0]!

  return (
    <div className="ge-dept-callout ge-growth-strip" data-growth-mode={mode}>
      <div className="ge-dept-callout__copy">
        <h3>
          {active.label}
          <span className="ge-growth-strip__job"> · {active.job}</span>
        </h3>
        <p>{active.line}</p>
      </div>
      <div className="ge-dept-tabs" role="tablist" aria-label="How the store grows">
        {STRIP.map((x) => {
          const unlocked = !!state.menus[x.menu]
          const on = x.id === mode
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={!unlocked && !on}
              title={
                unlocked
                  ? `Open ${x.label}`
                  : on
                    ? x.label
                    : `${x.label} unlocks later`
              }
              className={`ge-dept-tab${on ? ' is-on' : ''}`.trim()}
              onClick={() => {
                if (unlocked) setActiveMenu(x.menu)
              }}
            >
              {x.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

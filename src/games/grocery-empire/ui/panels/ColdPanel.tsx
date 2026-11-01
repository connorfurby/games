import type { Command } from '../../sim/commands'
import { can } from '../../sim/commands'
import { engine } from '../../sim/engine'
import { plantCost, tankCost } from '../../sim/systems/cold'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Line } from '../components/Line'
import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

/** Convenience one-click: plant + tank buffer, skip any step that isn't affordable. */
const BALANCED_COLD: Command[] = [
  { type: 'buyPlant' },
  { type: 'buyTank' },
  { type: 'buyTank' },
]

export function ColdPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const c = s.cold
  const freshPct = Math.min(200, Math.round(c.freshness * 100))
  const balancedAny = BALANCED_COLD.some((cmd) => engine.can(cmd).ok)

  return (
    <Panel title="Cold" purpose="Plants, tanks, freshness, and Momentum." lore="cold">
      <Section label="Convenience">
        <p className="ge-muted">
          One-click helper — not a new system. Buys a plant then tanks if you can afford them.
        </p>
        <Btn
          tone="ghost"
          disabled={!balancedAny}
          onClick={() => {
            for (const cmd of BALANCED_COLD) {
              if (engine.can(cmd).ok) engine.dispatch(cmd)
            }
          }}
        >
          Balanced Cold
        </Btn>
      </Section>

      <Section label="Line">
        <Line left="Freshness" right={`${freshPct}%`} />
        <Meter
          value={Math.min(1.5, c.freshness)}
          max={1.5}
          label={c.browned ? 'Brownout floor' : 'Supply / demand'}
        />
        <div data-coach-id="cold-momentum">
          <Line left="Momentum" right={c.momentumOn ? `×${c.momentum.toFixed(2)}` : 'Off'} />
        </div>
        <Line left="Surplus" right={c.surplus.toFixed(1)} muted />
        <Line
          left="Yield"
          right={`${Math.floor(c.yieldLeft).toLocaleString()} / ${Math.floor(c.yieldMax).toLocaleString()}`}
        />
        {c.quadratic ? <p className="ge-muted">Quadratic plants active — yield drains fast.</p> : null}
        {c.autoSheds > 0 ? <Line left="Auto-sheds" right={String(c.autoSheds)} muted /> : null}
      </Section>

      <Section label="Infrastructure">
        <Line left="Plants" right={String(c.plants)} />
        <Line left="Tanks" right={String(c.tanks)} />
        <div className="ge-chip-row">
          <Btn
            tone="primary"
            coachId="cold-buy-plant"
            disabled={!can(s, { type: 'buyPlant' }).ok}
            onClick={() => dispatch({ type: 'buyPlant' })}
          >
            Plant · {money(plantCost(s), numberFormat)}
          </Btn>
          <Btn
            tone="primary"
            disabled={!can(s, { type: 'buyTank' }).ok}
            onClick={() => dispatch({ type: 'buyTank' })}
          >
            Tank · {money(tankCost(s), numberFormat)}
          </Btn>
          <Btn
            tone="ghost"
            disabled={!can(s, { type: 'decommissionPlant' }).ok}
            onClick={() => dispatch({ type: 'decommissionPlant' })}
          >
            Decommission plant
          </Btn>
          <Btn
            tone="danger"
            disabled={c.plants < 1}
            onClick={() => {
              const n = c.plants
              if (n < 1) return
              if (
                !window.confirm(
                  `Decommission all ${n} plant${n === 1 ? '' : 's'}? Full refund each (newest first).`,
                )
              )
                return
              for (let i = 0; i < n; i++) dispatch({ type: 'decommissionPlant' })
            }}
          >
            Decommission all
          </Btn>
        </div>
      </Section>

      <HelpCard title="Cold is a promise">
        Plants and tanks buy time for perishables. Momentum compounds while freshness holds and
        auto-sheds when it slips — brownouts delay, they do not delete the save.
      </HelpCard>
    </Panel>
  )
}

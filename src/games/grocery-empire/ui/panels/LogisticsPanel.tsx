import { can } from '../../sim/commands'
import { useGame } from '../GameContext'
import { Btn } from '../components/Btn'
import { Line } from '../components/Line'
import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

export function LogisticsPanel() {
  const { state: s, dispatch } = useGame()
  const fuelCap = 100 + (s.memos['fuel-buffer'] ? 50 : 0)

  return (
    <Panel title="Logistics" purpose="Fuel, lanes, Control, and brand drift." lore="logistics">
      <Section label="Currencies">
        <Line left="Fuel" right={`${Math.floor(s.fuel)} / ${fuelCap}`} />
        <Meter value={s.fuel} max={fuelCap} label="Tank" />
        <Line left="Control" right={s.control.toFixed(1)} />
        <Line left="Brand" right={`${Math.round(s.brand * 100)}%`} />
        <Meter value={s.brand} max={1} label="Label integrity" />
      </Section>

      <Section label="Lanes">
        <Line left="Ocean lanes" right={String(s.fleet.lanes)} />
        <Line left="Franchises" right={String(s.fleet.franchises)} />
        <div className="ge-chip-row">
          <Btn
            tone="primary"
            coachId="logistics-lane"
            disabled={!can(s, { type: 'openLane' }).ok}
            onClick={() => dispatch({ type: 'openLane' })}
          >
            Open lane
          </Btn>
          <Btn
            tone="primary"
            disabled={!can(s, { type: 'buyFuel' }).ok}
            onClick={() => dispatch({ type: 'buyFuel' })}
          >
            Buy fuel
          </Btn>
          <Btn
            tone="ghost"
            disabled={!can(s, { type: 'openFranchise' }).ok}
            onClick={() => dispatch({ type: 'openFranchise' })}
          >
            Franchise
          </Btn>
        </div>
        <p className="ge-muted">Dry lanes idle. Brand regenerates. Never a brick.</p>
      </Section>
    </Panel>
  )
}

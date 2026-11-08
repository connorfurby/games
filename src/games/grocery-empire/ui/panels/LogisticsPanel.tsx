import { can } from '../../sim/commands'
import { useGame } from '../GameContext'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import { Icon } from '../icons/Icon'
import { LogisticsBand } from '../scenes/DepartmentBands'

export function LogisticsPanel() {
  const { state: s, dispatch } = useGame()
  const fuelCap = 100 + (s.memos['fuel-buffer'] ? 50 : 0)
  const lowFuel = s.fuel < fuelCap * 0.25
  const laneCheck = can(s, { type: 'openLane' })
  const fuelCheck = can(s, { type: 'buyFuel' })
  const franchiseCheck = can(s, { type: 'openFranchise' })

  return (
    <Panel
      title="Logistics"
      purpose="Burn fuel for lanes and Control."
      lore="logistics"
      scene={<LogisticsBand state={s} />}
    >
      <div className={`ge-dept-callout${lowFuel ? ' is-ready' : ''}`.trim()}>
        <div className="ge-dept-callout__copy">
          <h3>
            {lowFuel
              ? 'Fuel low'
              : `${s.fleet.lanes} ocean lane${s.fleet.lanes === 1 ? '' : 's'}`}
          </h3>
          <p>
            {lowFuel
              ? 'Dry lanes idle and brand stops regenerating — top up the tank.'
              : `${s.fleet.franchises} franchise${s.fleet.franchises === 1 ? '' : 's'} · wet lanes need fuel.`}
          </p>
        </div>
        {lowFuel ? (
          <Btn
            tone="primary"
            disabled={!fuelCheck.ok}
            title={!fuelCheck.ok ? fuelCheck.reason : undefined}
            onClick={() => dispatch({ type: 'buyFuel' })}
          >
            Buy fuel
          </Btn>
        ) : (
          <Btn
            tone="primary"
            coachId="logistics-lane"
            disabled={!laneCheck.ok}
            title={!laneCheck.ok ? laneCheck.reason : undefined}
            onClick={() => dispatch({ type: 'openLane' })}
          >
            <Icon name="lane" size={14} />
            Open lane
          </Btn>
        )}
      </div>

      <div className="ge-chip-row">
        {!lowFuel ? (
          <Btn
            tone="ghost"
            disabled={!fuelCheck.ok}
            title={!fuelCheck.ok ? fuelCheck.reason : undefined}
            onClick={() => dispatch({ type: 'buyFuel' })}
          >
            Buy fuel
          </Btn>
        ) : (
          <Btn
            tone="ghost"
            coachId="logistics-lane"
            disabled={!laneCheck.ok}
            title={!laneCheck.ok ? laneCheck.reason : undefined}
            onClick={() => dispatch({ type: 'openLane' })}
          >
            <Icon name="lane" size={14} />
            Open lane
          </Btn>
        )}
        <Btn
          tone="ghost"
          coachId="logistics-franchise"
          disabled={!franchiseCheck.ok}
          title={!franchiseCheck.ok ? franchiseCheck.reason : undefined}
          onClick={() => dispatch({ type: 'openFranchise' })}
        >
          Franchise
        </Btn>
      </div>

      <HelpCard title="Keep the lanes wet">
        Fuel first, then lanes. Franchises are optional reach — not required to finish the run.
      </HelpCard>
    </Panel>
  )
}

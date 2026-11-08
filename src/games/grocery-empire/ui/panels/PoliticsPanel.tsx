import { can } from '../../sim/commands'
import { acquireCost } from '../../sim/systems/politics'
import { useGame } from '../GameContext'
import { money, pct } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import { Icon } from '../icons/Icon'
import { PoliticsBand } from '../scenes/DepartmentBands'

export function PoliticsPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const p = s.politics
  const acq = acquireCost(s)
  const heat = p.monopolyRisk > 0.55
  const lobbyCheck = can(s, { type: 'hireLobby' })
  const acquireCheck = can(s, { type: 'acquireRegion' })
  const leaveCheck = can(s, { type: 'leaveRegion' })

  return (
    <Panel
      title="Politics"
      purpose="Spend political capital — lobby, buy, leave."
      lore="politics"
      scene={<PoliticsBand state={s} />}
    >
      <div className={`ge-dept-callout${heat ? ' is-ready' : ''}`.trim()}>
        <div className="ge-dept-callout__copy">
          <h3>Acquisition heat · {pct(p.monopolyRisk)}</h3>
          <p>
            {p.acquisitions} neighbor{p.acquisitions === 1 ? '' : 's'} bought
            {heat ? ' — pressure is up, fines stay capped.' : '. Heat is a gauge, not a gavel.'}
          </p>
        </div>
        <Btn
          tone="primary"
          disabled={!acquireCheck.ok}
          title={!acquireCheck.ok ? acquireCheck.reason : undefined}
          onClick={() => dispatch({ type: 'acquireRegion' })}
        >
          Acquire · {money(acq.cash, numberFormat)} + {acq.capital} PC
        </Btn>
      </div>

      <div className="ge-dept-split">
        <article className="ge-card">
          <header className="ge-empire-block__head">
            <h3>Lobby</h3>
            <p>Lobbyists mint political capital for cover and neighbors.</p>
          </header>
          <Btn
            tone="primary"
            coachId="politics-lobby"
            disabled={!lobbyCheck.ok}
            title={!lobbyCheck.ok ? lobbyCheck.reason : undefined}
            onClick={() => dispatch({ type: 'hireLobby' })}
          >
            <Icon name="lobby" size={14} />
            Hire lobbyist
          </Btn>
        </article>

        <article className="ge-card">
          <header className="ge-empire-block__head">
            <h3>Departure</h3>
            <p>
              Yield {s.cold.yieldLeft <= 0 ? 'empty' : 'still flowing'} ·{' '}
              {p.leftRegion ? 'already left' : 'still in region'}
            </p>
          </header>
          <Btn
            tone="primary"
            coachId="politics-leave"
            disabled={!leaveCheck.ok}
            title={!leaveCheck.ok ? leaveCheck.reason : undefined}
            onClick={() => dispatch({ type: 'leaveRegion' })}
          >
            Leave the Region
          </Btn>
        </article>
      </div>

      <HelpCard title="Pressure, not brick walls">
        Lobbyists mint capital. Acquisitions raise heat. Leaving the region is a hard choice —
        nothing here permanently deletes the save.
      </HelpCard>
    </Panel>
  )
}

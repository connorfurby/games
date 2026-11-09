import { POLITICS } from '../../sim/balance'
import { can } from '../../sim/commands'
import { acquireCost } from '../../sim/systems/politics'
import { useGame } from '../GameContext'
import { money, pct } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import { Icon } from '../icons/Icon'
import { PoliticsBand } from '../scenes/DepartmentBands'
import { DeptDiorama } from '../scenes/DeptDiorama'

export function PoliticsPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const p = s.politics
  const acq = acquireCost(s)
  const heat = p.monopolyRisk > 0.55
  const lobbyCheck = can(s, { type: 'hireLobby' })
  const leak = p.capital > 0 ? POLITICS.leakPerSec : 0
  const lobbyGain = POLITICS.lobbyGainPerSec * p.lobby
  const capitalNet = lobbyGain - leak
  const acquireCheck = can(s, { type: 'acquireRegion' })
  const leaveCheck = can(s, { type: 'leaveRegion' })

  return (
    <Panel
      title="Politics"
      purpose="Spend political capital — lobby, buy, leave."
      lore="politics"
      scene={
        <>
          <PoliticsBand state={s} />
          <DeptDiorama kind="politics" />
        </>
      }
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
            <h3>Lobby · {p.lobby}</h3>
            <p>
              {p.lobby === 0
                ? `No retainers. Capital leaks ${POLITICS.leakPerSec}/s while you hold any.`
                : `${capitalNet >= 0 ? '+' : ''}${capitalNet.toFixed(3)} PC/s · leak ${POLITICS.leakPerSec}/s, each lobbyist +${POLITICS.lobbyGainPerSec}/s.`}
            </p>
          </header>
          <Btn
            tone="primary"
            coachId="politics-lobby"
            disabled={!lobbyCheck.ok}
            title={!lobbyCheck.ok ? lobbyCheck.reason : `+${POLITICS.lobbyCapitalGain} PC now, then +${POLITICS.lobbyGainPerSec}/s`}
            onClick={() => dispatch({ type: 'hireLobby' })}
          >
            <Icon name="lobby" size={14} />
            Hire lobbyist · {money(POLITICS.lobbyCost, numberFormat)}
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

import { can } from '../../sim/commands'
import { acquireCost } from '../../sim/systems/politics'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { Line } from '../components/Line'
import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

export function PoliticsPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const p = s.politics
  const acq = acquireCost(s)

  return (
    <Panel title="Politics" purpose="Lobby, capital, acquisitions, leave region." lore="politics">
      <Section label="Wallet">
        <Line left="Political Capital" right={p.capital.toFixed(1)} />
        <Line left="Lobbyists" right={String(p.lobby)} />
        <Line left="Monopoly risk" right={`${Math.round(p.monopolyRisk * 100)}%`} />
        <Meter value={p.monopolyRisk} max={1} label="Acquisition heat" />
        <Btn
          tone="primary"
          coachId="politics-lobby"
          disabled={!can(s, { type: 'hireLobby' }).ok}
          onClick={() => dispatch({ type: 'hireLobby' })}
        >
          Hire lobbyist
        </Btn>
      </Section>

      <Section label="Acquisition">
        <Line left="Neighbors bought" right={String(p.acquisitions)} />
        <Btn
          tone="primary"
          disabled={!can(s, { type: 'acquireRegion' }).ok}
          onClick={() => dispatch({ type: 'acquireRegion' })}
        >
          Acquire · {money(acq.cash, numberFormat)} + {acq.capital} PC
        </Btn>
        <p className="ge-muted">Fines are capped. Monopoly never bricks the run.</p>
      </Section>

      <Section label="Departure">
        <Line left="Regional yield" right={s.cold.yieldLeft <= 0 ? 'Empty' : 'Still flowing'} />
        <Line left="Left region" right={p.leftRegion ? 'Yes — Era 4+' : 'No'} />
        <Btn
          tone="primary"
          disabled={!can(s, { type: 'leaveRegion' }).ok}
          onClick={() => dispatch({ type: 'leaveRegion' })}
        >
          Leave the Region
        </Btn>
      </Section>
    </Panel>
  )
}

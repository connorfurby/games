import { DOCTRINES } from '../../content/era2'
import { doctrineCost, tournamentReadPayout } from '../../sim/systems/capital'
import { CAPITAL } from '../../sim/balance'
import { useGame } from '../GameContext'
import { Btn } from '../components/Btn'
import { Line } from '../components/Line'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

export function StrategyPanel() {
  const { state: s, dispatch } = useGame()
  const owned = DOCTRINES.filter((d) => (s.doctrines[d.id] ?? 0) > 0).length
  const nextCost = doctrineCost(s, owned)
  const payout = tournamentReadPayout(s)

  return (
    <Panel title="Strategy" purpose="Doctrines, tournament, and Read." lore="strategy">
      <Section label="Read">
        <Line left="Read" right={String(Math.floor(s.read * 10) / 10)} />
        <Line left="Tournaments run" right={String(s.stats.tournamentsRun)} muted />
        <div className="ge-chip-row" data-coach-id="strategy-tournament">
          <Btn
            tone="primary"
            disabled={s.compute.attention < CAPITAL.tournamentAttention}
            onClick={() => dispatch({ type: 'runTournament' })}
          >
            Run tournament · {CAPITAL.tournamentAttention} Att → +{payout} Read
          </Btn>
        </div>
      </Section>

      <Section label="Doctrines">
        <p className="ge-muted">Buy in order. Each doctrine sweetens tournament Read.</p>
        {DOCTRINES.map((d) => {
          const have = (s.doctrines[d.id] ?? 0) > 0
          const locked = d.order > owned
          return (
            <div key={d.id} className="ge-hire">
              <div>
                <strong>{d.name}</strong>
                <p className="ge-muted">{d.blurb}</p>
              </div>
              <Btn
                tone="primary"
                coachId={`doctrine-${d.id}`}
                disabled={have || locked || s.read < nextCost}
                onClick={() => dispatch({ type: 'buyDoctrine', id: d.id })}
              >
                {have ? 'Owned' : locked ? 'Locked' : `${nextCost} Read`}
              </Btn>
            </div>
          )
        })}
      </Section>
    </Panel>
  )
}

import { DOCTRINES } from '../../content/era2'
import { doctrineCost, tournamentReadPayout } from '../../sim/systems/capital'
import { CAPITAL } from '../../sim/balance'
import { useGame } from '../GameContext'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Line } from '../components/Line'
import { Panel } from '../components/Panel'
import { Icon } from '../icons/Icon'

export function StrategyPanel() {
  const { state: s, dispatch } = useGame()
  const owned = DOCTRINES.filter((d) => (s.doctrines[d.id] ?? 0) > 0).length
  const nextCost = doctrineCost(s, owned)
  const payout = tournamentReadPayout(s)
  const canTourny = s.compute.attention >= CAPITAL.tournamentAttention
  const readBank = Math.floor(s.read * 10) / 10

  return (
    <Panel
      title="Strategy"
      purpose="Spend Attention → bank Read → buy doctrines."
      lore="strategy"
    >
      <div className="ge-dept-callout">
        <div className="ge-dept-callout__copy">
          <h3>Read bank · {readBank}</h3>
          <p>
            Strategy currency — earn with tournaments, spend on doctrines (later Autonomous / Fleet).
          </p>
        </div>
      </div>

      <ol className="ge-strategy-loop" aria-label="Strategy loop">
        <li>
          <strong>1 · Fill Attention</strong>
          <span>Analysts in Memos / Back office fill the bar.</span>
        </li>
        <li>
          <strong>2 · Run a tournament</strong>
          <span>
            Spend {CAPITAL.tournamentAttention} Att → bank ~{payout} Read
            {s.stats.tournamentsRun > 0 ? ` · ${s.stats.tournamentsRun} run` : ''}.
          </span>
        </li>
        <li>
          <strong>3 · Buy a doctrine</strong>
          <span>Next costs {nextCost} Read. Buy in order — each tweaks a real rule.</span>
        </li>
      </ol>

      <div className="ge-chip-row">
        <Btn
          tone={canTourny ? 'primary' : 'ghost'}
          coachId="strategy-tournament"
          disabled={!canTourny}
          title={
            !canTourny ? `Need ${CAPITAL.tournamentAttention} Attention in the back office` : undefined
          }
          onClick={() => dispatch({ type: 'runTournament' })}
        >
          Tournament · −{CAPITAL.tournamentAttention} Att · +{payout} Read
        </Btn>
        <Btn
          tone="ghost"
          onClick={() => {
            document.querySelector('.ge-memos-col')?.scrollIntoView({ block: 'nearest' })
          }}
        >
          Jump to Memos (Attention)
        </Btn>
      </div>

      {(s.upgrades['tourney-while-full'] ?? 0) >= 1 ? (
        <div className="ge-dept-callout">
          <div className="ge-dept-callout__copy">
            <h3>Tourney While Full</h3>
            <p>
              {s.compute.autoTourney === false
                ? 'Paused. The bar is yours.'
                : s.compute.ideasUnlocked && s.compute.ideasOn
                  ? 'Waiting. Ideas are on, so the full bar mints Ideas instead of being spent every tick.'
                  : 'On. Spends 120 Attention about every 45 seconds while the bar is full.'}
            </p>
          </div>
          <div className="ge-chip-row">
            <Btn
              tone="ghost"
              onClick={() => dispatch({ type: 'setAutoTourney', on: s.compute.autoTourney === false })}
            >
              {s.compute.autoTourney === false ? 'Resume auto-tournament' : 'Pause auto-tournament'}
            </Btn>
            {s.compute.ideasUnlocked ? (
              <Btn tone="ghost" onClick={() => dispatch({ type: 'toggleIdeas' })}>
                Ideas {s.compute.ideasOn ? 'on' : 'off'}
              </Btn>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="ge-empire-block">
        <header className="ge-empire-block__head">
          <h3>Doctrines</h3>
          <p>Spend Read. Owned doctrines also sweeten the next tournament payout.</p>
        </header>
        <div className="ge-card-grid">
          {DOCTRINES.filter((d) => d.order <= owned).map((d) => {
            const have = (s.doctrines[d.id] ?? 0) > 0
            const canBuy = !have && s.read >= nextCost
            return (
              <article
                key={d.id}
                className={`ge-card${have ? ' ge-card--owned' : ''}${canBuy ? ' is-ready' : ''}`.trim()}
              >
                <div className="ge-card__head">
                  <Icon name="doctrine" size={20} tone={have ? 'accent' : 'muted'} />
                  <strong>{d.name}</strong>
                </div>
                <p className="ge-card__blurb">{d.blurb}</p>
                <Btn
                  tone={canBuy ? 'primary' : 'ghost'}
                  coachId={`doctrine-${d.id}`}
                  disabled={have || s.read < nextCost}
                  title={!have && s.read < nextCost ? `Need ${nextCost} Read` : undefined}
                  onClick={() => dispatch({ type: 'buyDoctrine', id: d.id })}
                >
                  {have ? 'Owned' : `Spend ${nextCost} Read`}
                </Btn>
              </article>
            )
          })}
        </div>
        {DOCTRINES.length - owned - 1 > 0 ? (
          <p className="ge-muted">
            {DOCTRINES.length - owned - 1} doctrine
            {DOCTRINES.length - owned - 1 === 1 ? '' : 's'} locked until you buy the one above.
          </p>
        ) : null}
      </section>

      <section className="ge-empire-block">
        <header className="ge-empire-block__head">
          <h3>Where Read goes later</h3>
        </header>
        <Line left="Doctrines" right="Spend here first" muted />
        <Line left="Autonomous" right={`Bank ${CAPITAL.autonomousReadNeed} on Empire`} muted />
        <Line left="Fleet / Charter" right="Late eras spend the surplus" muted />
      </section>

      <HelpCard title="Read in one sentence">
        Attention is office fuel. Tournaments turn Attention into Read. Doctrines (and late gates)
        spend Read. Cash never buys Read.
      </HelpCard>
    </Panel>
  )
}

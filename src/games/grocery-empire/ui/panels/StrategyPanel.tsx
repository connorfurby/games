import { DOCTRINES, doctrinesAtEra } from '../../content/era2'
import { doctrineCost, tournamentReadPayout } from '../../sim/systems/capital'
import { CAPITAL } from '../../sim/balance'
import { useGame } from '../GameContext'
import { Line } from '../components/Line'
import { Icon } from '../icons/Icon'
import { Button, Card, Disclosure, ScreenHeader, Stat } from '../kit'

export function StrategyPanel() {
  const { state: s, dispatch, reducedMotion } = useGame()
  const owned = DOCTRINES.filter((d) => (s.doctrines[d.id] ?? 0) > 0).length
  const nextCost = doctrineCost(s, owned)
  const payout = tournamentReadPayout(s)
  const canTourny = s.compute.attention >= CAPITAL.tournamentAttention
  const readBank = Math.floor(s.read * 10) / 10
  const doctrineList = doctrinesAtEra(s.era).filter((d) => d.order <= owned)

  return (
    <section className="ge-panel">
      <ScreenHeader
        hub
        title="Strategy"
        purpose="Turn Attention into Read, then buy a doctrine."
        stats={<Stat size="sm" label="Read" value={readBank} title="Banked from tournaments. Cash never buys Read." />}
      />

      <Card
        state={canTourny ? 'affordable' : undefined}
        header={
          <>
            <strong>Tournament</strong>
            <span className="ge-muted"> Read bank · {readBank}</span>
          </>
        }
        footer={
          <div className="ge-chip-row">
            <Button
              tone={canTourny ? 'primary' : 'ghost'}
              coachId="strategy-tournament"
              disabled={!canTourny}
              title={
                !canTourny ? `Need ${CAPITAL.tournamentAttention} Attention in the back office` : undefined
              }
              onClick={() => dispatch({ type: 'runTournament' })}
            >
              Tournament · −{CAPITAL.tournamentAttention} Att · +{payout} Read
            </Button>
            <Button
              tone="ghost"
              onClick={() => {
                document.querySelector('.ge-memos-col')?.scrollIntoView({
                  block: 'nearest',
                  behavior: reducedMotion ? 'auto' : 'smooth',
                })
              }}
            >
              Jump to Memos (Attention)
            </Button>
          </div>
        }
      >
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
      </Card>

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
            <Button
              tone="ghost"
              onClick={() => dispatch({ type: 'setAutoTourney', on: s.compute.autoTourney === false })}
            >
              {s.compute.autoTourney === false ? 'Resume auto-tournament' : 'Pause auto-tournament'}
            </Button>
            {s.compute.ideasUnlocked ? (
              <Button tone="ghost" onClick={() => dispatch({ type: 'toggleIdeas' })}>
                Ideas {s.compute.ideasOn ? 'on' : 'off'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Disclosure title="Doctrines" count={doctrineList.length} defaultOpen={owned < 2}>
        <p className="ge-muted">Spend Read. Owned doctrines also sweeten the next tournament payout.</p>
        <div className="ge-card-grid">
          {doctrineList.map((d) => {
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
                <Button
                  tone={canBuy ? 'primary' : 'ghost'}
                  coachId={`doctrine-${d.id}`}
                  disabled={have || s.read < nextCost}
                  title={!have && s.read < nextCost ? `Need ${nextCost} Read` : undefined}
                  onClick={() => dispatch({ type: 'buyDoctrine', id: d.id })}
                >
                  {have ? 'Owned' : `Spend ${nextCost} Read`}
                </Button>
              </article>
            )
          })}
        </div>
        {doctrinesAtEra(s.era).length - owned - 1 > 0 ? (
          <p className="ge-muted">
            {doctrinesAtEra(s.era).length - owned - 1} doctrine
            {doctrinesAtEra(s.era).length - owned - 1 === 1 ? '' : 's'} locked until you buy the one above.
          </p>
        ) : null}
      </Disclosure>

      <section className="ge-empire-block">
        <header className="ge-empire-block__head">
          <h3>Where Read goes later</h3>
        </header>
        <Line left="Doctrines" right="Spend here first" muted />
        <Line left="Autonomous" right={`Bank ${CAPITAL.autonomousReadNeed} on Empire`} muted />
        <Line left="Fleet / Charter" right="Late eras spend the surplus" muted />
      </section>
    </section>
  )
}

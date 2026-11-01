import { CAPITAL } from '../../sim/balance'
import { demandBreakdown, rentPerSec, wagesPerSec } from '../../sim/formulas'
import { useGame } from '../GameContext'
import { money, qty, rate } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Line } from '../components/Line'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'
import { Sparkline } from '../components/Sparkline'

export function BooksPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const demand = demandBreakdown(s)
  const cashHist = s.history?.cash ?? []
  const soldHist = s.history?.sold ?? []
  const revHist = s.history?.revenue ?? []
  const meetingDue = s.incorporated && s.time >= s.board.nextMeetingAt - 5

  return (
    <Panel title="Books" purpose="Revenue, bills, debt, and arrears." lore="books">
      <Section label="Cashflow">
        <Line left="Cash" right={money(s.cash, numberFormat)} />
        <Line left="Lifetime revenue" right={money(s.lifetimeRevenue, numberFormat)} />
        <Line left="Revenue / s" right={rate(s.rates.revenuePerSec)} />
        <Line left="Cost / s" right={rate(s.rates.costPerSec)} muted />
        <Line left="Rent / s" right={rate(rentPerSec(s))} muted />
        <Line left="Wages / s" right={rate(wagesPerSec(s))} muted />
      </Section>

      <Section label="History">
        <div className="ge-spark-stack" data-coach-id="books-history">
          <Sparkline values={cashHist} label="Cash" width={220} height={40} />
          <Sparkline values={soldHist} label="Sold / sample" width={220} height={40} />
          <Sparkline values={revHist} label="Revenue / sample" width={220} height={40} />
        </div>
        <p className="ge-muted">
          {cashHist.length < 2
            ? 'Run a few minutes — sparklines appear once history samples land.'
            : `${cashHist.length} samples · cash / sold / revenue.`}
        </p>
      </Section>

      <Section label="Obligations">
        <Line left="Arrears" right={money(s.arrears, numberFormat)} />
        <Line left="Debt owed" right={money(s.debt?.owed ?? 0, numberFormat)} />
        <Line left="Sold (lifetime)" right={qty(s.stats?.sold ?? 0)} muted />
        <Line left="Spoiled" right={qty(s.stats?.spoiled ?? 0)} muted />
        <Line left="Shrink" right={qty(s.stats?.shrunk ?? 0)} muted />
      </Section>

      {s.era >= 2 ? (
        <Section label="Capital">
          <Line left="Incorporated" right={s.incorporated ? 'Yes' : 'No'} />
          <Line left="Equity" right={money(s.equity, numberFormat)} muted />
          <Line left="Read" right={String(Math.floor(s.read * 10) / 10)} muted />
          <Line left="Rep spent" right={String(s.repSpent)} muted />
          <div className="ge-chip-row">
            <Btn
              tone="primary"
              coachId="books-incorporate"
              disabled={
                s.incorporated ||
                s.cash < CAPITAL.incorporateCash ||
                s.compute.reputation < CAPITAL.incorporateRep
              }
              onClick={() => dispatch({ type: 'incorporate' })}
            >
              {s.incorporated
                ? 'Incorporated'
                : `Incorporate · $${CAPITAL.incorporateCash} + ${CAPITAL.incorporateRep} Rep`}
            </Btn>
            <Btn
              coachId="books-board"
              tone={meetingDue ? 'primary' : undefined}
              disabled={!s.incorporated}
              onClick={() => dispatch({ type: 'resolveBoard' })}
            >
              {!s.incorporated
                ? 'Board (after incorporate)'
                : meetingDue
                  ? 'Resolve board meeting'
                  : 'File board agenda'}
            </Btn>
          </div>
        </Section>
      ) : null}

      <Section label="Demand multipliers">
        {Object.entries(demand.parts).map(([k, v]) => (
          <Line key={k} left={k} right={`×${v.toFixed(2)}`} muted />
        ))}
        <Line left="Total" right={`×${demand.total.toFixed(2)}`} />
      </Section>

      <HelpCard title="The tape does not judge">
        Revenue in, rent and wages out. Arrears pile when cash is short — then pay down from sales. No
        bankruptcy wipe. Sparklines are the day remembering itself.
      </HelpCard>
    </Panel>
  )
}

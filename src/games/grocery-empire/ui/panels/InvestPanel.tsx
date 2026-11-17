import { MENUS } from '../../content/menus'
import { MEMOS } from '../../content/memos'
import { INVEST } from '../../sim/balance'
import { can } from '../../sim/commands'
import { passbookCap, passbookRate, passbookYieldingBalance, investBookCap, investYieldingBalance } from '../../sim/formulas'
import { INSTRUMENTS } from '../../content/instruments'
import { investEngineCost } from '../../sim/systems/capital'
import {
  instrumentCost,
  instrumentLotCap,
  instrumentLots,
  instrumentYieldPerSec,
  scrutinyDrag,
} from '../../sim/systems/lateHubs'
import type { GameState, InvestRisk } from '../../sim/state'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Button, Card, DataTable, Disclosure, Meter, Sheet } from '../kit'
import { StatusChip, type VerbTrayProps } from '../play'
import type { Column } from '../kit'
import { TickerScene } from '../scenes/live/TickerScene'
import { HubCallout, LateHubShell, Rows } from './LateHubShell'

const RISKS: InvestRisk[] = ['low', 'mid', 'high']

function duration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '—'
  if (sec < 60) return `${Math.ceil(sec)}s`
  if (sec < 3600) return `${Math.ceil(sec / 60)} min`
  if (sec < 48 * 3600) return `${(sec / 3600).toFixed(1)} hr`
  return `${(sec / 86400).toFixed(1)} days`
}

/** Cash a ready memo still wants (Att / Ideas / blocks already satisfied). */
function memoCashShortfall(s: GameState): { name: string; need: number } | null {
  let best: { name: string; need: number } | null = null
  for (const m of MEMOS) {
    if ((s.memos[m.id] ?? 0) > 0 && !m.repeatable) continue
    try {
      if (!m.visible(s) && !s.memoSeen?.[m.id]) continue
      if (m.blocked?.(s)) continue
      const c = m.cost(s)
      const cash = c.cash ?? 0
      if (cash <= s.cash) continue
      if ((c.attention ?? 0) > s.compute.attention) continue
      if ((c.ideas ?? 0) > s.compute.ideas) continue
      if (!best || cash < best.need) best = { name: m.name, need: cash }
    } catch {
      /* skip */
    }
  }
  return best
}

export function InvestPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const bal = s.passbook?.balance ?? 0
  const rate = passbookRate(s)
  const pbCap = passbookCap(s)
  const pbYield = passbookYieldingBalance(s)
  const book = s.invest
  const engineCost = investEngineCost(s)
  const bookCap = investBookCap(s)
  const bookYield = investYieldingBalance(s)

  // Projection: interest only accrues on the balance inside the cap.
  const perHour = pbYield * rate * 3600
  const capRoom = Math.max(0, pbCap - bal)
  const toCapSec =
    capRoom <= 0 ? 0 : bal > 0 && rate > 0 ? Math.log(pbCap / bal) / rate : Number.POSITIVE_INFINITY

  // Advisor: cash beyond a five-minute bill reserve is surplus.
  const reserve = Math.max(25, s.rates.costPerSec * 300)
  const surplus = Math.max(0, s.cash - reserve)
  const depositSuggest = Math.floor(Math.min(surplus, capRoom) * 100) / 100
  const outgrown = pbCap * rate < Math.max(0, s.rates.revenuePerSec) * 0.005
  const wantDeposit = !outgrown && capRoom > 1 && depositSuggest >= Math.max(10, capRoom * 0.05)
  const atCap = bal >= pbCap - 1
  const shortfall = atCap ? memoCashShortfall(s) : null
  const withdrawSuggest = shortfall
    ? Math.floor(Math.min(bal, shortfall.need - s.cash + 0.01) * 100) / 100
    : 0
  const wantWithdraw = !!shortfall && withdrawSuggest > 0 && shortfall.need - s.cash <= bal

  const deposit = (frac: number) => {
    const amt = Math.floor(s.cash * frac * 100) / 100
    if (amt > 0) dispatch({ type: 'depositPassbook', amount: amt })
  }
  const withdraw = (frac: number) => {
    const amt = Math.floor(bal * frac * 100) / 100
    if (amt > 0) dispatch({ type: 'withdrawPassbook', amount: amt })
  }
  const depositBook = (frac: number) => {
    const amt = Math.floor(s.cash * frac * 100) / 100
    if (amt > 0) dispatch({ type: 'depositInvest', amount: amt })
  }
  const withdrawBook = (frac: number) => {
    const amt = Math.floor(book.balance * frac * 100) / 100
    if (amt > 0) dispatch({ type: 'withdrawInvest', amount: amt })
  }

  const lotCap = instrumentLotCap(s)
  const held = INSTRUMENTS.map((inst) => ({
    inst,
    lots: instrumentLots(s, inst.id),
    perSec: instrumentYieldPerSec(s, inst.id),
  })).filter((r) => r.lots > 0)
  const totalLots = held.reduce((a, r) => a + r.lots, 0)
  const drag = scrutinyDrag(s)

  const positionCols: Column<(typeof held)[number]>[] = [
    { key: 'name', header: 'Position', render: (r) => r.inst.name },
    { key: 'lots', header: 'Lots', align: 'end', render: (r) => `${r.lots} / ${lotCap}` },
    {
      key: 'pays',
      header: 'Pays',
      align: 'end',
      render: (r) => `+${r.perSec.toFixed(3)} ${r.inst.currency}/s`,
    },
  ]

  const kpiChips = (
    <div className="lh-chips" data-coach-id="invest-kpis">
      <StatusChip tone="idle" title="Slow, safe interest inside the cap">
        Passbook {money(bal, numberFormat)}
      </StatusChip>
      <StatusChip tone="idle" title="Projected from the yielding balance">
        Interest {money(perHour, numberFormat)}/hr
      </StatusChip>
      {book.unlocked ? <StatusChip tone="idle">Risk book {money(book.balance, numberFormat)}</StatusChip> : null}
      {s.era >= 7 ? (
        <StatusChip tone="idle" title="Instrument lots across all positions">
          Lots held {totalLots}
        </StatusChip>
      ) : null}
    </div>
  )

  // Primary verb: the advisor's deposit / withdraw when it has one, otherwise open the passbook sheet.
  const depositCheck = can(s, { type: 'depositPassbook', amount: depositSuggest })
  const withdrawCheck = can(s, { type: 'withdrawPassbook', amount: withdrawSuggest })
  const tray: VerbTrayProps | undefined = wantDeposit
    ? {
        primary: {
          label: `Deposit ${money(depositSuggest, numberFormat)}`,
          tone: 'primary',
          size: 'lg',
          coachId: 'invest-deposit',
          disabled: !depositCheck.ok,
          onClick: () => dispatch({ type: 'depositPassbook', amount: depositSuggest }),
        },
        failReason: depositCheck.ok ? undefined : depositCheck.reason,
      }
    : wantWithdraw
      ? {
          primary: {
            label: `Withdraw ${money(withdrawSuggest, numberFormat)}`,
            tone: 'primary',
            size: 'lg',
            coachId: 'invest-withdraw',
            disabled: !withdrawCheck.ok,
            onClick: () => dispatch({ type: 'withdrawPassbook', amount: withdrawSuggest }),
          },
          failReason: withdrawCheck.ok ? undefined : withdrawCheck.reason,
          }
      : undefined

  return (
    <LateHubShell
        desks={
          <>
            <Sheet
        open
        onClose={() => {}}
        title="Passbook · deposit and withdraw"
        reducedMotion={reducedMotion}
      >
        <div className="lh-stack">
          <Meter
            tone={bal >= pbCap - 1 ? 'warn' : 'accent'}
            value={pbYield}
            max={pbCap}
            label="Yielding"
            eta={`${money(pbYield, numberFormat)} / ${money(pbCap, numberFormat)}`}
          />
          <Rows
            rows={[
              { label: 'Balance', value: money(bal, numberFormat) },
              { label: 'Rate', value: `${(rate * 3600 * 100).toFixed(2)}% / hr` },
              {
                label: 'Time to cap',
                value: capRoom <= 0 ? 'at cap' : bal <= 0 ? 'deposit first' : duration(toCapSec),
                title: 'Interest alone; deposits get you there faster',
              },
              { label: 'Earned', value: money(s.stats?.interestEarned ?? 0, numberFormat) },
            ]}
          />
          <div className="lh-actions">
            <Button size="sm" tone="primary" onClick={() => deposit(0.25)} disabled={s.cash < 1}>
              In 25%
            </Button>
            <Button size="sm" onClick={() => deposit(0.5)} disabled={s.cash < 1}>
              In 50%
            </Button>
            <Button size="sm" onClick={() => withdraw(0.25)} disabled={bal < 1}>
              Out 25%
            </Button>
            <Button size="sm" onClick={() => withdraw(1)} disabled={bal < 0.01}>
              Out all
            </Button>
          </div>
        </div>
      </Sheet>
          </>
        }
      title={MENUS.invest.name}
      purpose={MENUS.invest.purpose}
      scene={<TickerScene />}
      tray={tray}
    >
      {kpiChips}

      {wantDeposit || wantWithdraw ? (
        <HubCallout
          coachId="invest-advisor"
          tone="ready"
          title={wantDeposit ? 'Surplus is idle' : 'Passbook is full'}
        >
          {wantDeposit
            ? `Park ${money(depositSuggest, numberFormat)} and keep ${money(reserve, numberFormat)} for bills.`
            : `${shortfall?.name} needs ${money(withdrawSuggest, numberFormat)} from the passbook.`}
        </HubCallout>
      ) : null}
      <div className="lh-callout" data-coach-id="invest-passbook">
        <div className="lh-callout__copy">
          <h3>Passbook {money(bal, numberFormat)}</h3>
          <p>
            {(rate * 3600 * 100).toFixed(2)}%/hr · {money(perHour, numberFormat)}/hr · cap {money(pbCap, numberFormat)}
          </p>
        </div>
      </div>
      {outgrown ? (
        <p className="lh-note" role="note">
          <strong>Small change now.</strong> A full passbook earns about {money(pbCap * rate, numberFormat)}/s against{' '}
          {money(s.rates.revenuePerSec, numberFormat)}/s of sales. The cap grows with Empire rank; it matters again
          early in a Rebrand.
        </p>
      ) : null}

      <div className="lh-split">
        {book.unlocked ? (
          <Card
            state={book.circuitBreaker ? 'suggested' : undefined}
            header={
              <div className="lh-card-title">
                <strong>Risk book</strong>
                <span>Yield only inside the cap. Engine raises the cap and a little of the mean.</span>
              </div>
            }
          >
            <div className="lh-stack">
              <Meter
                tone={book.circuitBreaker ? 'danger' : book.balance >= bookCap - 1 ? 'warn' : 'accent'}
                value={bookYield}
                max={bookCap}
                label="Yielding"
                eta={`${money(bookYield, numberFormat)} / ${money(bookCap, numberFormat)}`}
              />
              <Rows
                coachId="invest-book"
                rows={[
                  { label: 'Book', value: money(book.balance, numberFormat) },
                  { label: 'Peak', value: money(book.peak, numberFormat) },
                  { label: 'Engine', value: `L${book.engineLevel}` },
                  { label: 'Breaker', value: book.circuitBreaker ? 'TRIPPED' : 'Clear' },
                ]}
              />
              {book.balance > bookCap + 1 ? (
                <p className="lh-note">
                  Yielding on {money(bookCap, numberFormat)} of {money(book.balance, numberFormat)}. Withdraw surplus to
                  buy throughput.
                </p>
              ) : null}
              <div className="lh-actions">
                {RISKS.map((r) => {
                  const check = can(s, { type: 'setInvestRisk', risk: r })
                  const gate = r === 'mid' ? INVEST.riskGate.mid : r === 'high' ? INVEST.riskGate.high : 0
                  const locked = gate > 0 && book.engineLevel < gate
                  return (
                    <Button
                      key={r}
                      size="sm"
                      tone={book.risk === r ? 'primary' : 'ghost'}
                      disabled={!check.ok}
                      title={
                        !check.ok
                          ? check.reason
                          : `Mid needs Engine L${INVEST.riskGate.mid}, High needs L${INVEST.riskGate.high}.`
                      }
                      onClick={() => dispatch({ type: 'setInvestRisk', risk: r })}
                    >
                      {r}
                      {locked ? ` · L${gate}` : ''}
                    </Button>
                  )
                })}
              </div>
              <div className="lh-actions">
                <Button
                  size="sm"
                  tone="primary"
                  data-suggest-id="invest-book-deposit"
                  onClick={() => depositBook(0.25)}
                  disabled={s.cash < 1}
                >
                  In 25%
                </Button>
                <Button size="sm" onClick={() => withdrawBook(0.25)} disabled={book.balance < 1}>
                  Out 25%
                </Button>
                <Button size="sm" onClick={() => withdrawBook(1)} disabled={book.balance < 0.01}>
                  Out all
                </Button>
                <Button
                  size="sm"
                  disabled={book.engineLevel >= INVEST.maxEngine || s.cash < engineCost}
                  title={
                    book.engineLevel >= INVEST.maxEngine
                      ? 'Engine maxed'
                      : s.cash < engineCost
                        ? `Need ${money(engineCost, numberFormat)}`
                        : `Engine maxes at L${INVEST.maxEngine}.`
                  }
                  onClick={() => dispatch({ type: 'buyInvestEngine' })}
                >
                  Engine · {money(engineCost, numberFormat)}
                </Button>
                {book.circuitBreaker ? (
                  <Button size="sm" tone="primary" onClick={() => dispatch({ type: 'resetCircuitBreaker' })}>
                    Reset breaker
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      {s.era >= 7 ? (
        <section className="lh-stack" data-coach-id="invest-instruments">
          <div className="lh-card-title">
            <strong>Instruments</strong>
            <span title="Each lot pays a Worlds currency every second.">{totalLots} lots held</span>
          </div>
          <div className="lh-grid">
            {INSTRUMENTS.map((inst) => {
              const lots = instrumentLots(s, inst.id)
              const open = s.era >= inst.era
              const check = can(s, { type: 'buyInstrument', id: inst.id })
              const cost = instrumentCost(s, inst.id)
              const yieldPerSec = instrumentYieldPerSec(s, inst.id)
              const state = !open ? 'locked' : lots >= lotCap ? 'maxed' : check.ok ? 'affordable' : undefined
              return (
                <Card
                  key={inst.id}
                  state={state}
                  header={<strong title={inst.blurb}>{inst.name}</strong>}
                  footer={
                    <Button
                      size="sm"
                      tone={check.ok ? 'primary' : 'ghost'}
                      disabled={!check.ok}
                      title={!check.ok ? check.reason : inst.blurb}
                      onClick={() => dispatch({ type: 'buyInstrument', id: inst.id })}
                    >
                      {!open ? `Era ${inst.era}` : lots >= lotCap ? 'Full' : `Buy · ${money(cost, numberFormat)}`}
                    </Button>
                  }
                >
                  <p className="lh-note">
                    {lots}/{lotCap}
                    {open ? ` · +${yieldPerSec.toFixed(3)} ${inst.currency}/s` : ''}
                  </p>
                </Card>
              )
            })}
          </div>

          <Disclosure title="Positions" count={held.length} defaultOpen={held.length > 0}>
            <DataTable
              columns={positionCols}
              rows={held}
              rowKey={(r) => r.inst.id}
              empty="No lots held yet. Buy one above."
              caption="Instrument positions"
            />
          </Disclosure>

          {drag > 0 ? (
            <p className="lh-note">
              Council scrutiny trims instrument yield by {Math.round(drag * 100)}%. Seat fewer delegates, or let the
              heat fade.
            </p>
          ) : null}
        </section>
      ) : null}

    </LateHubShell>
  )
}

import { MEMOS } from '../../content/memos'
import { INVEST } from '../../sim/balance'
import { can } from '../../sim/commands'
import { passbookCap, passbookRate, passbookYieldingBalance, investBookCap, investYieldingBalance } from '../../sim/formulas'
import { investEngineCost } from '../../sim/systems/capital'
import type { GameState, InvestRisk } from '../../sim/state'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import { InvestBand } from '../scenes/DepartmentBands'
import { DeptDiorama } from '../scenes/DeptDiorama'

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
  const { state: s, dispatch, numberFormat } = useGame()
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

  return (
    <Panel
      title="Invest"
      purpose="Park surplus cash inside a capped yield."
      lore="invest"
      scene={
        <>
          <InvestBand state={s} />
          <DeptDiorama kind="invest" />
        </>
      }
    >
      {outgrown ? (
        <p className="vt-small" role="note">
          <span className="vt-small__label">Small change now.</span> A full passbook earns about{' '}
          {money(pbCap * rate, numberFormat)}/s against {money(s.rates.revenuePerSec, numberFormat)}/s of sales. The
          cap grows with Empire rank; it matters again early in a Rebrand.
        </p>
      ) : null}
      {wantDeposit || wantWithdraw ? (
        <div className="ge-dept-callout" role="status" data-coach-id="invest-advisor">
          <div className="ge-dept-callout__copy">
            <h3>{wantDeposit ? 'Surplus is idle' : 'Passbook is full'}</h3>
            <p>
              {wantDeposit
                ? `${money(s.cash, numberFormat)} cash, ${money(capRoom, numberFormat)} of cap room. Parking ${money(depositSuggest, numberFormat)} keeps ${money(reserve, numberFormat)} for bills.`
                : `${shortfall?.name} wants ${money(shortfall?.need ?? 0, numberFormat)} and you have ${money(s.cash, numberFormat)}. The passbook is at its cap — pull ${money(withdrawSuggest, numberFormat)} out.`}
            </p>
          </div>
          {wantDeposit ? (
            <Btn
              tone="primary"
              onClick={() => dispatch({ type: 'depositPassbook', amount: depositSuggest })}
            >
              Deposit {money(depositSuggest, numberFormat)}
            </Btn>
          ) : (
            <Btn
              tone="primary"
              onClick={() => dispatch({ type: 'withdrawPassbook', amount: withdrawSuggest })}
            >
              Withdraw {money(withdrawSuggest, numberFormat)}
            </Btn>
          )}
        </div>
      ) : null}

      <div className="ge-dept-split">
        <article className="ge-card ge-card--owned">
          <header className="ge-empire-block__head">
            <h3>Passbook</h3>
            <p>Slow, safe interest — only the amount inside the Empire-scaled cap earns.</p>
          </header>
          <div className="ge-card__meta" data-coach-id="invest-passbook">
            <div className="ge-card__meta-row">
              <span>Balance</span>
              <strong>{money(bal, numberFormat)}</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Yielding</span>
              <strong>
                {money(pbYield, numberFormat)} / {money(pbCap, numberFormat)}
              </strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Rate</span>
              <strong>{(rate * 3600 * 100).toFixed(2)}% / hr</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Projected</span>
              <strong>{money(perHour, numberFormat)} / hr</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Time to cap</span>
              <strong title="Interest alone; deposits get you there faster">
                {capRoom <= 0 ? 'at cap' : bal <= 0 ? 'deposit first' : `${duration(toCapSec)} (interest only)`}
              </strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Earned</span>
              <strong>{money(s.stats?.interestEarned ?? 0, numberFormat)}</strong>
            </div>
          </div>
          {bal > pbCap + 1 ? (
            <p className="ge-muted">
              Surplus above the cap sits idle — withdraw it to spend on baskets.
            </p>
          ) : null}
          <div className="ge-chip-row">
            <Btn tone="primary" onClick={() => deposit(0.25)} disabled={s.cash < 1}>
              In 25%
            </Btn>
            <Btn onClick={() => deposit(0.5)} disabled={s.cash < 1}>
              In 50%
            </Btn>
            <Btn onClick={() => withdraw(0.25)} disabled={bal < 1}>
              Out 25%
            </Btn>
            <Btn onClick={() => withdraw(1)} disabled={bal < 0.01}>
              Out all
            </Btn>
          </div>
        </article>

        {book.unlocked ? (
          <article className={`ge-card${book.circuitBreaker ? ' is-ready' : ''}`.trim()}>
            <header className="ge-empire-block__head">
              <h3>Risk book</h3>
              <p>Yield only inside the cap. Engine raises the cap and a little of the mean.</p>
            </header>
            <div className="ge-card__meta" data-coach-id="invest-book">
              <div className="ge-card__meta-row">
                <span>Book</span>
                <strong>{money(book.balance, numberFormat)}</strong>
              </div>
              <div className="ge-card__meta-row">
                <span>Yielding</span>
                <strong>
                  {money(bookYield, numberFormat)} / {money(bookCap, numberFormat)}
                </strong>
              </div>
              <div className="ge-card__meta-row">
                <span>Peak</span>
                <strong>{money(book.peak, numberFormat)}</strong>
              </div>
              <div className="ge-card__meta-row">
                <span>Engine</span>
                <strong>L{book.engineLevel}</strong>
              </div>
              <div className="ge-card__meta-row">
                <span>Breaker</span>
                <strong>{book.circuitBreaker ? 'TRIPPED' : 'Clear'}</strong>
              </div>
            </div>
            {book.balance > bookCap + 1 ? (
              <p className="ge-muted">
                Yielding on {money(bookCap, numberFormat)} of {money(book.balance, numberFormat)}.
                Withdraw surplus to buy throughput.
              </p>
            ) : null}
            <div className="ge-chip-row">
              {RISKS.map((r) => {
                const check = can(s, { type: 'setInvestRisk', risk: r })
                const gate = r === 'mid' ? INVEST.riskGate.mid : r === 'high' ? INVEST.riskGate.high : 0
                const locked = gate > 0 && book.engineLevel < gate
                return (
                  <Btn
                    key={r}
                    tone={book.risk === r ? 'primary' : 'ghost'}
                    disabled={!check.ok}
                    title={!check.ok ? check.reason : undefined}
                    onClick={() => dispatch({ type: 'setInvestRisk', risk: r })}
                  >
                    {r}
                    {locked ? ` · L${gate}` : ''}
                  </Btn>
                )
              })}
            </div>
            <p className="ge-muted" style={{ fontSize: '0.72rem' }}>
              Mid needs Engine L{INVEST.riskGate.mid}, High needs L{INVEST.riskGate.high}. More gates
              arrive with the Era 2 slice.
            </p>
            <div className="ge-chip-row">
              <Btn
                tone="primary"
                data-suggest-id="invest-book-deposit"
                onClick={() => depositBook(0.25)}
                disabled={s.cash < 1}
              >
                In 25%
              </Btn>
              <Btn onClick={() => withdrawBook(0.25)} disabled={book.balance < 1}>
                Out 25%
              </Btn>
              <Btn onClick={() => withdrawBook(1)} disabled={book.balance < 0.01}>
                Out all
              </Btn>
              <Btn
                disabled={book.engineLevel >= 8 || s.cash < engineCost}
                title={
                  book.engineLevel >= 8
                    ? 'Engine maxed'
                    : s.cash < engineCost
                      ? `Need ${money(engineCost, numberFormat)}`
                      : undefined
                }
                onClick={() => dispatch({ type: 'buyInvestEngine' })}
              >
                Engine · {money(engineCost, numberFormat)}
              </Btn>
              {book.circuitBreaker ? (
                <Btn tone="primary" onClick={() => dispatch({ type: 'resetCircuitBreaker' })}>
                  Reset breaker
                </Btn>
              ) : null}
            </div>
          </article>
        ) : null}
      </div>

      <HelpCard title="Idle cash is a choice">
        Caps scale with Empire level. Surplus above the cap does not earn — withdraw it to hire,
        stock, or stamp memos. The book does not print a fortune.
      </HelpCard>
    </Panel>
  )
}

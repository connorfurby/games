import { passbookRate } from '../../sim/formulas'
import { investEngineCost } from '../../sim/systems/capital'
import type { InvestRisk } from '../../sim/state'
import { useGame } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { Line } from '../components/Line'
import { Panel } from '../components/Panel'
import { Section } from '../components/Section'

const RISKS: InvestRisk[] = ['low', 'mid', 'high']

export function InvestPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const bal = s.passbook?.balance ?? 0
  const rate = passbookRate(s)
  const book = s.invest
  const engineCost = investEngineCost(s)

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
    <Panel title="Invest" purpose="Park cash somewhere it grows." lore="invest">
      <Section label="Passbook">
        <Line left="Balance" right={money(bal, numberFormat)} />
        <Line left="Rate" right={`${(rate * 3600 * 100).toFixed(2)}% / hr`} muted />
        <Line left="Interest earned" right={money(s.stats?.interestEarned ?? 0, numberFormat)} muted />
        <div className="ge-chip-row" data-coach-id="invest-passbook">
          <Btn tone="primary" onClick={() => deposit(0.25)} disabled={s.cash < 1}>
            Deposit 25%
          </Btn>
          <Btn onClick={() => deposit(0.5)} disabled={s.cash < 1}>
            Deposit 50%
          </Btn>
          <Btn onClick={() => withdraw(0.25)} disabled={bal < 1}>
            Withdraw 25%
          </Btn>
          <Btn onClick={() => withdraw(1)} disabled={bal < 0.01}>
            Withdraw all
          </Btn>
        </div>
      </Section>

      {book.unlocked || s.era >= 2 ? (
        <Section label="Investment book">
          {!book.unlocked ? (
            <p className="ge-muted" data-coach-id="invest-book">
              Buy the Trading Desk memo to open the risk book.
            </p>
          ) : (
            <>
              <div data-coach-id="invest-book">
                <Line left="Book balance" right={money(book.balance, numberFormat)} />
                <Line left="Peak" right={money(book.peak, numberFormat)} muted />
                <Line left="Engine" right={`L${book.engineLevel}`} muted />
                <Line
                  left="Circuit breaker"
                  right={book.circuitBreaker ? 'TRIPPED' : 'Clear'}
                  muted
                />
              </div>
              <div className="ge-chip-row">
                {RISKS.map((r) => (
                  <Btn
                    key={r}
                    tone={book.risk === r ? 'primary' : undefined}
                    onClick={() => dispatch({ type: 'setInvestRisk', risk: r })}
                  >
                    {r}
                  </Btn>
                ))}
              </div>
              <div className="ge-chip-row">
                <Btn tone="primary" onClick={() => depositBook(0.25)} disabled={s.cash < 1}>
                  Deposit 25%
                </Btn>
                <Btn onClick={() => withdrawBook(0.25)} disabled={book.balance < 1}>
                  Withdraw 25%
                </Btn>
                <Btn onClick={() => withdrawBook(1)} disabled={book.balance < 0.01}>
                  Withdraw all
                </Btn>
                <Btn
                  disabled={book.engineLevel >= 8 || s.cash < engineCost}
                  onClick={() => dispatch({ type: 'buyInvestEngine' })}
                >
                  Engine · {money(engineCost, numberFormat)}
                </Btn>
                {book.circuitBreaker ? (
                  <Btn onClick={() => dispatch({ type: 'resetCircuitBreaker' })}>Reset breaker</Btn>
                ) : null}
              </div>
              <p className="ge-muted">
                Mid after engine L2. High only with calm debt. −40% from peak trips the breaker.
              </p>
            </>
          )}
        </Section>
      ) : (
        <p className="ge-muted">Later eras open a risk book. For now, the passbook is slow and safe.</p>
      )}
    </Panel>
  )
}

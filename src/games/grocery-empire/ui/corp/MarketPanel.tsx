import { useState } from 'react'
import { MENUS } from '../../content/menus'
import { TICKERS, type TickerDef } from '../../content/corp/tickers'
import { CORP } from '../../sim/balance'
import { can } from '../../sim/commands'
import {
  activeHedge,
  betPayout,
  dividendRate,
  hedgePremium,
  portfolioBasis,
  portfolioValue,
} from '../../sim/corp/market'
import { useGame } from '../GameContext'
import { clock, money } from '../format'
import { HubStage } from '../components/HubStage'
import { Button } from '../kit'
import { MarketScene } from './MarketScene'
import { changePct, pctLabel } from './pct'
import { Spark } from './Spark'
import './corp.css'

/** Cash presets for a buy, as a share of cash on hand. */
const BUY_SHARES = [0.1, 0.25, 0.5] as const

export function MarketPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const c = s.corp
  const [selected, setSelected] = useState<string | null>(null)
  const listed = TICKERS.filter((d) => c.tickers[d.id]?.listed)
  const pick = (selected && c.tickers[selected]?.listed ? selected : listed[0]?.id) ?? null
  const pickDef = TICKERS.find((d) => d.id === pick)
  const value = portfolioValue(s)
  const basis = portfolioBasis(s)
  const m = (n: number) => money(n, numberFormat)

  const buyCash = Math.floor(s.cash * 0.25 * 100) / 100
  const buy = pickDef ? can(s, { type: 'buyStock', id: pickDef.id, cash: buyCash }) : null
  const tray = pickDef
    ? {
        primary: {
          label: `Buy ${pickDef.sym} with a quarter of your cash`,
          tone: 'primary' as const,
          size: 'lg' as const,
          cost: m(buyCash),
          disabled: !buy?.ok,
          onClick: () => dispatch({ type: 'buyStock', id: pickDef.id, cash: buyCash }),
        },
        failReason: buy?.ok ? undefined : buy?.reason,
        hint: pickDef.blurb,
      }
    : undefined

  const row = (d: TickerDef) => {
    const t = c.tickers[d.id]!
    const ch = changePct(t.hist.slice(-30))
    const stake = t.owned / CORP.sharesPerCompany
    const gain = t.owned * t.price - t.basis
    return (
      <article key={d.id} className={`mk-row${d.id === pick ? ' is-sel' : ''}`} onClick={() => setSelected(d.id)}>
        <div className="mk-row__id">
          <span className="mk-sym">{d.sym}</span>
          <span className="mk-name">{d.name}</span>
          <span className={`mk-sector mk-sector--${d.sector.toLowerCase()}`}>{d.sector}</span>
        </div>
        <Spark data={t.hist.slice(-45)} className="mk-row__spark" />
        <div className="mk-row__px">
          <strong>{m(t.price)}</strong>
          <span className={ch >= 0 ? 'is-up' : 'is-down'}>{pctLabel(ch)}</span>
        </div>
        <div className="mk-row__own">
          {t.owned > 0 ? (
            <>
              <span>
                {t.owned} shares · {(stake * 100).toFixed(1)}% of the company
              </span>
              <span className={gain >= 0 ? 'is-up' : 'is-down'}>
                {gain >= 0 ? '+' : '−'}
                {m(Math.abs(gain))}
              </span>
            </>
          ) : (
            <span className="mk-muted">{d.divPerMin > 0 ? `Pays ${(d.divPerMin * 6000).toFixed(1)}% an hour` : 'No dividend'}</span>
          )}
        </div>
        <div className="mk-row__acts" onClick={(e) => e.stopPropagation()}>
          {BUY_SHARES.map((f) => {
            const cash = Math.floor(s.cash * f * 100) / 100
            const ok = can(s, { type: 'buyStock', id: d.id, cash }).ok
            return (
              <Button key={f} size="sm" tone="ghost" disabled={!ok} onClick={() => dispatch({ type: 'buyStock', id: d.id, cash })}>
                Buy {Math.round(f * 100)}%
              </Button>
            )
          })}
          {t.owned > 0 ? (
            <>
              <Button size="sm" tone="ghost" onClick={() => dispatch({ type: 'sellStock', id: d.id, shares: Math.max(1, Math.floor(t.owned / 2)) })}>
                Sell half
              </Button>
              <Button size="sm" tone="ghost" onClick={() => dispatch({ type: 'sellStock', id: d.id, shares: t.owned })}>
                Sell all
              </Button>
            </>
          ) : null}
        </div>
      </article>
    )
  }

  const hedge = activeHedge(s)
  const hedgeCheck = can(s, { type: 'openFuture', kind: 'hedge', stake: 0 })
  const stake = Math.floor(s.cash * 0.1 * 100) / 100
  const rise = can(s, { type: 'openFuture', kind: 'rise', stake })
  const fall = can(s, { type: 'openFuture', kind: 'fall', stake })
  const bets = c.futures.filter((f) => f.kind !== 'hedge' && f.expiresAt > s.time)
  const idx = s.wholesale?.index ?? 1

  return (
    <section className="ge-panel mk-panel">
      <HubStage
        purpose={MENUS.market.purpose}
        department={MENUS.market.name}
        scene={<MarketScene selected={pick} onPick={setSelected} />}
        tray={tray}
      >
        <div className="mk-strip">
          <div>
            <span>Your shares</span>
            <strong>{m(value)}</strong>
          </div>
          <div>
            <span>On paper</span>
            <strong className={value - basis >= 0 ? 'is-up' : 'is-down'}>
              {value - basis >= 0 ? '+' : '−'}
              {m(Math.abs(value - basis))}
            </strong>
          </div>
          <div>
            <span>Dividends</span>
            <strong>{m(dividendRate(s))}/min</strong>
          </div>
          <div>
            <span>Banked from trades</span>
            <strong className={c.tradeProfit >= 0 ? 'is-up' : 'is-down'}>
              {c.tradeProfit >= 0 ? '+' : '−'}
              {m(Math.abs(c.tradeProfit))}
            </strong>
          </div>
        </div>

        <h3 className="mk-h">Listed companies</h3>
        <p className="mk-note">Young companies grow fast for about an era after they list, then settle. Every trade costs half a percent.</p>
        <div className="mk-list">{listed.map(row)}</div>

        <h3 className="mk-h">Crate-price desk</h3>
        <div className="mk-futures">
          <div className="mk-fut__index">
            <span>Crate price now</span>
            <strong>{idx.toFixed(2)}</strong>
            <Spark data={(s.wholesale?.history ?? []).slice(-60)} w={140} h={34} />
          </div>
          <div className="mk-fut__card">
            <h4>Lock crate prices</h4>
            <p>For {CORP.hedgeSec / 60} minutes your crates never cost more than today.</p>
            {hedge ? (
              <p className="mk-live">
                Locked at {hedge.strike.toFixed(2)} · {clock(hedge.expiresAt - s.time)} left
              </p>
            ) : (
              <Button tone="primary" cost={m(hedgePremium(s))} disabled={!hedgeCheck.ok} onClick={() => dispatch({ type: 'openFuture', kind: 'hedge', stake: 0 })}>
                Lock prices
              </Button>
            )}
            {!hedge && !hedgeCheck.ok ? <p className="mk-muted">{hedgeCheck.reason}</p> : null}
          </div>
          <div className="mk-fut__card">
            <h4>Bet on the next {CORP.betSec / 60} minutes</h4>
            <p>Stake a tenth of your cash. Every 1% move pays {CORP.betLeverage}% of the stake, up to {CORP.betMaxPayout}×.</p>
            <div className="mk-fut__bets">
              <Button tone="ghost" cost={m(stake)} disabled={!rise.ok} onClick={() => dispatch({ type: 'openFuture', kind: 'rise', stake })}>
                ▲ Prices rise
              </Button>
              <Button tone="ghost" cost={m(stake)} disabled={!fall.ok} onClick={() => dispatch({ type: 'openFuture', kind: 'fall', stake })}>
                ▼ Prices fall
              </Button>
            </div>
            {bets.length ? (
              <ul className="mk-bets">
                {bets.map((f) => (
                  <li key={f.id}>
                    {f.kind === 'rise' ? '▲ Up' : '▼ Down'} from {f.strike.toFixed(2)} · {clock(f.expiresAt - s.time)} · pays {m(betPayout(s, f))} now
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {c.tape.length ? (
          <>
            <h3 className="mk-h">Market news</h3>
            <ol className="mk-news">
              {[...c.tape].reverse().map((n, i) => (
                <li key={`${n.t}-${i}`} className={n.up ? 'is-up' : 'is-down'}>
                  {n.up ? '▲' : '▼'} {n.text}
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </HubStage>
    </section>
  )
}

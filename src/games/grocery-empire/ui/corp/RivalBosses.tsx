import { CEOS, WAR_MOVES, type WarMove } from '../../content/corp/ceos'
import { RIVALS } from '../../content/rivals'
import { CORP, RIVALRY } from '../../sim/balance'
import { can } from '../../sim/commands'
import { sharesFor } from '../../sim/corp/market'
import { ceoPeek, moleCost, rivalActive, stakeBuybackCost, truceCost, warRoundCost } from '../../sim/corp/rivalry'
import { useGame } from '../GameContext'
import { clock, money } from '../format'
import { Button } from '../kit'
import { RivalPortrait } from '../panels/RivalsPanel'
import { HowItWorks } from './HowItWorks'
import './rivalBosses.css'

const TEMPER: Record<string, string> = { hot: 'Hot-headed', proud: 'Proud', cold: 'Ice-cold', sly: 'Sly' }
const MOVE_NAME: Record<WarMove, string> = { undercut: 'Undercut', match: 'Match', hold: 'Hold' }

/**
 * The people behind the rival chains: what they think of you, a best-of-three price war,
 * a mole on the inside, and a share takeover once you own most of them.
 */
export function RivalBosses() {
  const { state: s, dispatch, numberFormat, setActiveMenu } = useGame()
  const m = (n: number) => money(n, numberFormat)
  const live = RIVALS.filter((r) => rivalActive(s, r.id))
  if (!live.length || !s.corp) return null
  return (
    <section className="rb" aria-label="Rival bosses">
      <h3 className="rb-h">The bosses</h3>
      <p className="rb-note">Leave them alone and they leave you alone. Price wars, spies and buying their shares all build a grudge; past {RIVALRY.actAt}, they hit back.</p>
      <HowItWorks menu="rivals" />
      <div className="rb-grid">
        {live.map((def) => {
          const ceo = CEOS[def.id]
          const st = ceoPeek(s, def.id)
          const t = s.corp.tickers[def.id]
          const owned = t?.listed ? t.owned : 0
          const tenPct = t?.listed ? t.price * 100 * (1 + CORP.tradeFee) : 0
          const buy10 = t?.listed ? can(s, { type: 'buyStock', id: def.id, cash: Math.ceil(tenPct * 100) / 100 }) : null
          const take = can(s, { type: 'takeoverRival', id: def.id })
          const war = st.war
          const truce = can(s, { type: 'makeTruce', id: def.id })
          const angry = st.grudge >= RIVALRY.actAt && st.truceUntil <= s.time
          return (
            <article key={def.id} className={`rb-card${angry ? ' is-angry' : ''}`}>
              <header className="rb-head">
                <RivalPortrait def={def} size={56} />
                <div>
                  <h4>{def.founder}</h4>
                  <p className="rb-sub">
                    {def.name} · {TEMPER[ceo?.temper ?? 'cold']}
                  </p>
                </div>
              </header>
              <div className="rb-grudge" title={`Grudge ${Math.round(st.grudge)} of 100`}>
                <div className="rb-grudge__bar">
                  <i style={{ width: `${st.grudge}%` }} />
                  <b style={{ left: `${RIVALRY.actAt}%` }} />
                </div>
                <span>
                  {st.truceUntil > s.time
                    ? `At peace · ${clock(st.truceUntil - s.time)}`
                    : angry
                      ? 'Out for revenge'
                      : st.grudge > 5
                        ? 'Annoyed'
                        : 'Doesn’t think about you'}
                </span>
              </div>
              <p className="rb-line">{st.lastLine || (angry ? ceo?.angry : ceo?.calm)}</p>

              {/* Takeover */}
              <div className="rb-block">
                <div className="rb-row">
                  <span>Your stake</span>
                  <strong>{(owned / 10).toFixed(1)}%</strong>
                </div>
                <div className="rb-stake">
                  <i style={{ width: `${Math.min(100, (owned / RIVALRY.takeoverShares) * 100)}%` }} />
                </div>
                <div className="rb-acts">
                  {take.ok ? (
                    <Button tone="primary" onClick={() => dispatch({ type: 'takeoverRival', id: def.id })}>
                      Take over {def.name}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      tone="ghost"
                      cost={t?.listed ? m(tenPct) : undefined}
                      disabled={!buy10?.ok || !t?.listed || sharesFor(s, def.id, tenPct) < 1}
                      onClick={() => dispatch({ type: 'buyStock', id: def.id, cash: Math.ceil(tenPct * 100) / 100 })}
                    >
                      Buy 10% of {def.name}
                    </Button>
                  )}
                </div>
                {!take.ok ? <p className="rb-muted">Own {RIVALRY.takeoverShares / 10}% to take them over. Past {RIVALRY.pillAt / 10}% they issue new shares to fight you off.</p> : null}
              </div>

              {/* Price war */}
              <div className="rb-block">
                {war ? (
                  <>
                    <div className="rb-row">
                      <span>Price war · round {Math.min(3, war.round)}</span>
                      <strong>
                        You {war.you} – {war.them} {def.founder.split(' ')[0]}
                      </strong>
                    </div>
                    {st.mole ? <p className="rb-intel">Your mole says: they will {MOVE_NAME[war.next].toLowerCase()}.</p> : null}
                    <div className="rb-war">
                      {WAR_MOVES.map((mv) => {
                        const ok = can(s, { type: 'playWar', id: def.id, move: mv.id }).ok
                        const cost = warRoundCost(s, mv.id)
                        return (
                          <Button key={mv.id} size="sm" tone="ghost" disabled={!ok} cost={cost > 0 ? m(cost) : undefined} title={mv.hint} onClick={() => dispatch({ type: 'playWar', id: def.id, move: mv.id })}>
                            {mv.name}
                          </Button>
                        )
                      })}
                    </div>
                    {war.log.length ? (
                      <ol className="rb-log">
                        {war.log.map((l, i) => (
                          <li key={i} className={l.win === true ? 'is-up' : l.win === false ? 'is-down' : ''}>
                            {MOVE_NAME[l.you as WarMove]} vs {MOVE_NAME[l.them as WarMove]} · {l.win === true ? 'won' : l.win === false ? 'lost' : 'tie'}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </>
                ) : (
                  <div className="rb-acts">
                    <Button size="sm" tone="ghost" disabled={!can(s, { type: 'headToHead', id: def.id }).ok} onClick={() => dispatch({ type: 'headToHead', id: def.id })}>
                      {st.warReadyAt > s.time ? `Price war in ${clock(st.warReadyAt - s.time)}` : 'Start a price war'}
                    </Button>
                    {st.wins + st.losses > 0 ? (
                      <span className="rb-muted">
                        Won {st.wins} · lost {st.losses}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Mole */}
              <div className="rb-block">
                {st.mole ? (
                  <>
                    <div className="rb-row">
                      <span>Mole inside · cover</span>
                      <strong>{Math.max(0, Math.round(st.mole.cover))}%</strong>
                    </div>
                    <div className="rb-cover">
                      <i style={{ width: `${Math.max(0, st.mole.cover)}%` }} />
                    </div>
                    <div className="rb-acts">
                      <Button size="sm" tone="ghost" onClick={() => dispatch({ type: 'moleJob', id: def.id, job: 'steal' })}>
                        Steal recipes
                      </Button>
                      <Button size="sm" tone="ghost" onClick={() => dispatch({ type: 'moleJob', id: def.id, job: 'sabotage' })}>
                        Sabotage a launch
                      </Button>
                    </div>
                    <p className="rb-muted">Each job burns cover. Low cover, high odds of getting caught (Heat, brand, a furious boss).</p>
                  </>
                ) : (
                  <div className="rb-acts">
                    <Button size="sm" tone="ghost" cost={m(moleCost(s))} disabled={!can(s, { type: 'plantMole', id: def.id }).ok} onClick={() => dispatch({ type: 'plantMole', id: def.id })}>
                      Plant a mole
                    </Button>
                  </div>
                )}
              </div>

              <div className="rb-acts rb-foot">
                {s.corp.suits.some((x) => x.by === def.id) ? (
                  <Button size="sm" tone="ghost" onClick={() => setActiveMenu('court')}>
                    In court with them
                  </Button>
                ) : null}
                {t?.listed && s.menus.market ? (
                  <Button size="sm" tone="ghost" onClick={() => setActiveMenu('market')}>
                    {def.name} on the Exchange
                  </Button>
                ) : null}
                {st.grudge > 0 && st.truceUntil <= s.time ? (
                  <Button size="sm" tone="ghost" cost={m(truceCost(s))} disabled={!truce.ok} onClick={() => dispatch({ type: 'makeTruce', id: def.id })}>
                    Send a gift basket (truce)
                  </Button>
                ) : null}
                {st.stakeInYou > 0 ? (
                  <Button
                    size="sm"
                    tone="ghost"
                    cost={m(stakeBuybackCost(s, def.id))}
                    disabled={!can(s, { type: 'buyBackStake', id: def.id }).ok}
                    onClick={() => dispatch({ type: 'buyBackStake', id: def.id })}
                  >
                    Buy back their {(st.stakeInYou / 10).toFixed(1)}% of you
                  </Button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

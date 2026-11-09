import { useState } from 'react'
import { RIVALS, type RivalDef } from '../../content/rivals'
import { RIVAL_CHAINS } from '../../sim/balance'
import { can } from '../../sim/commands'
import type { RivalState } from '../../sim/state'
import { boughtRivalStores, buyoutCost, priceWarCost, rivalDemandMul } from '../../sim/systems/rivals'
import { statCut } from '../../sim/systems/stats'
import { ConfirmModal } from '../components/ConfirmModal'
import { useGame } from '../GameContext'
import { clock, money } from '../format'

/** A small bust drawn from the rival's colors. Each founder gets a different silhouette. */
export function RivalPortrait({ def, size = 72, muted = false }: { def: RivalDef; size?: number; muted?: boolean }) {
  const i = RIVALS.indexOf(def)
  const hair = [
    // Dot: a bun
    <g key="h">
      <circle cx="40" cy="20" r="7" fill={def.color} />
      <path d="M24 34 Q40 16 56 34 Q52 26 40 25 Q28 26 24 34 Z" fill={def.color} />
    </g>,
    // Ines: long hair
    <path key="h" d="M23 38 Q22 18 40 18 Q58 18 57 38 L58 52 L52 52 L52 34 Q40 26 28 34 L28 52 L22 52 Z" fill={def.color} />,
    // Conrad: swept side part
    <path key="h" d="M25 34 Q26 19 41 19 Q55 19 55 32 Q46 24 34 27 Q29 29 25 34 Z" fill={def.color} />,
    // Sera: visor
    <g key="h">
      <path d="M25 33 Q27 19 40 19 Q53 19 55 33 Z" fill={def.color} />
      <rect x="27" y="31" width="26" height="6" rx="3" fill={def.accent} opacity="0.85" />
    </g>,
  ][i % 4]
  return (
    <svg
      className={`rv-portrait${muted ? ' is-muted' : ''}`}
      viewBox="0 0 80 80"
      width={size}
      height={size}
      role="img"
      aria-label={muted ? 'Unknown rival' : `${def.founder}, ${def.title}`}
    >
      <circle cx="40" cy="40" r="39" fill={muted ? 'var(--g2-raised)' : def.color} opacity={muted ? 1 : 0.22} />
      <path d="M14 78 Q16 56 40 54 Q64 56 66 78 Z" fill={muted ? 'var(--g2-line)' : def.color} />
      <circle cx="40" cy="36" r="14" fill={muted ? 'var(--g2-line)' : def.accent} />
      {muted ? (
        <text x="40" y="41" textAnchor="middle" fontSize="14" fill="var(--ge-muted)">
          ?
        </text>
      ) : (
        hair
      )}
      {!muted ? (
        <g>
          <circle cx="62" cy="62" r="11" fill="var(--g2-bg, #111)" stroke={def.accent} strokeWidth="1.5" />
          <text x="62" y="66" textAnchor="middle" fontSize="9" fontWeight="700" fill={def.accent}>
            {def.initials}
          </text>
        </g>
      ) : null}
    </svg>
  )
}

function StoreRow({ stores, max, bought }: { stores: number; max: number; bought: boolean }) {
  return (
    <div className="rv-stores" aria-label={`${stores} of ${max} stores`}>
      {Array.from({ length: max }, (_, k) => (
        <span key={k} className={`rv-store${k < stores ? ' is-open' : ''}${bought && k < stores ? ' is-ours' : ''}`} />
      ))}
    </div>
  )
}

function statusLine(s: { time: number }, def: RivalDef, st: RivalState): string {
  if (st.bought) return `Yours. ${st.boughtStores} stores now copy your flagship's sales.`
  if (st.stores >= def.maxStores) return 'At full size. It will not open more stores.'
  if (s.time < st.frozenUntil) return `Licking its wounds: no new stores for ${clock(st.frozenUntil - s.time)}.`
  return `Next store opens in ${clock(Math.max(0, st.nextGrowAt - s.time))}.`
}

export function RivalsPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const [confirm, setConfirm] = useState<RivalDef | null>(null)
  const cut = 1 - rivalDemandMul(s)
  const owned = boughtRivalStores(s)
  const shown = RIVALS.filter((r) => r.era <= s.era + 1)

  return (
    <div className="rv">
      <section className="ge-panel rv-summary">
        <header className="ge-panel__head">
          <h2 className="ge-panel__title">Rivals</h2>
          <p className="ge-panel__purpose">Each rival store pulls shoppers away until you beat it back or buy it.</p>
        </header>
        <div className="rv-summary__nums">
          <div>
            <span className="rv-summary__label">Shoppers lost</span>
            <strong className={cut > 0.001 ? 'is-bad' : ''}>{cut > 0.001 ? `−${(cut * 100).toFixed(1)}%` : 'None'}</strong>
          </div>
          <div>
            <span className="rv-summary__label">From buyouts</span>
            <strong className={owned > 0 ? 'is-good' : ''}>
              {owned > 0 ? `+${owned.toFixed(2)} flagships` : 'Nothing yet'}
            </strong>
          </div>
          <div>
            <span className="rv-summary__label">Bought</span>
            <strong>
              {RIVALS.filter((r) => s.rivals[r.id]?.bought).length} of {RIVALS.length}
            </strong>
          </div>
        </div>
      </section>

      <div className="rv-grid">
        {shown.map((def) => {
          const st = s.rivals[def.id]
          if (!st) {
            return (
              <article key={def.id} className="ge-panel rv-card is-locked">
                <RivalPortrait def={def} muted />
                <div className="rv-card__body">
                  <h3 className="rv-card__name">Someone is watching</h3>
                  <p className="ge-muted">A new rival opens in Era {def.era}.</p>
                </div>
              </article>
            )
          }
          const war = can(s, { type: 'priceWar', id: def.id })
          const buy = can(s, { type: 'buyoutRival', id: def.id })
          const pull = 1 - 1 / (1 + st.stores * RIVAL_CHAINS.perStore * statCut(s, 'rivalCut'))
          return (
            <article key={def.id} className={`ge-panel rv-card${st.bought ? ' is-bought' : ''}`}>
              <RivalPortrait def={def} />
              <div className="rv-card__body">
                <header>
                  <h3 className="rv-card__name">{def.name}</h3>
                  <p className="rv-card__who">
                    {def.founder} · {def.title}
                  </p>
                </header>
                <p className="rv-card__tag">{def.tagline}</p>
                <StoreRow stores={st.bought ? st.boughtStores : st.stores} max={def.maxStores} bought={st.bought} />
                <p className="rv-card__status">
                  {statusLine(s, def, st)}
                  {!st.bought ? <span className="rv-card__pull"> Costs you {(pull * 100).toFixed(1)}% of shoppers.</span> : null}
                </p>
                {st.bought ? (
                  <p className="rv-card__quote">“{def.farewell.split('"')[1] ?? def.farewell}”</p>
                ) : (
                  <footer className="rv-card__actions">
                    <button
                      type="button"
                      className="g2-tag g2-tag--small rv-war"
                      disabled={!war.ok}
                      title={
                        war.ok
                          ? `Close ${RIVAL_CHAINS.warStoresClosed} of their stores and stop them opening more for ${clock(RIVAL_CHAINS.warFreezeSec)}.`
                          : war.reason
                      }
                      onClick={() => dispatch({ type: 'priceWar', id: def.id })}
                    >
                      <span className="g2-tag__price">{money(priceWarCost(s, def.id), numberFormat)}</span>
                      <span className="g2-tag__label">Price war</span>
                    </button>
                    <button
                      type="button"
                      className="g2-tag rv-buy"
                      disabled={!buy.ok}
                      title={buy.ok ? `Their ${st.stores} stores join your network for good.` : buy.reason}
                      onClick={() => setConfirm(def)}
                    >
                      <span className="g2-tag__price">{money(buyoutCost(s, def.id), numberFormat)}</span>
                      <span className="g2-tag__label">Buy them out</span>
                    </button>
                  </footer>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <ConfirmModal
        open={!!confirm}
        reducedMotion={reducedMotion}
        spec={
          confirm
            ? {
                title: `Buy ${confirm.name}?`,
                body: `${s.rivals[confirm.id]?.stores ?? 0} stores join your network and stop pulling shoppers.`,
                detail: `Costs ${money(buyoutCost(s, confirm.id), numberFormat)}. Fewer stores means a cheaper deal — a price war first can save money.`,
                confirmLabel: 'Buy',
                onConfirm: () => dispatch({ type: 'buyoutRival', id: confirm.id }),
              }
            : null
        }
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}

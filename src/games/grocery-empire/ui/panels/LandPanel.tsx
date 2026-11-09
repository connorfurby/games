import { useState } from 'react'
import { ERA2_EXPANSIONS } from '../../content/era2'
import { CHAIN } from '../../sim/balance'
import { can } from '../../sim/commands'
import {
  canTrainStore,
  canWalkStore,
  chainAttentionDrainPerSec,
  openStoreCost,
  trainStoreCost,
} from '../../sim/systems/chain'
import { networkStores, storeEngineWeight } from '../../sim/systems/network'
import type { StorePolicy } from '../../sim/state'
import { useGame, useIsSuggested } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import { LandBand } from '../scenes/DepartmentBands'
import { LandStreet } from '../land/LandStreet'

const EARLY = [
  {
    id: 'lot',
    name: 'The Lot',
    blurb: 'Opens Era 2 · +8% demand — you own the corner.',
    cost: 5000,
  },
  {
    id: 'side-yard',
    name: 'Side Yard',
    blurb: '+30 shelf · +40 backroom · +2 staff seats.',
    cost: 2500,
  },
]

const ERA2_BLURB: Record<string, string> = {
  parking: '+10% demand · +1 seat · higher rent.',
  'corner-parcel': 'Next store −15% cost · opens one level higher.',
  'metro-slot': '+0.08 demand per extra store · −10% Attention drain. Needs depot + incorporate.',
}

const POLICIES: { id: StorePolicy; label: string; tip: string }[] = [
  {
    id: 'local',
    label: 'Local',
    tip: 'More feet, smaller tickets — busy neighborhood door',
  },
  {
    id: 'standard',
    label: 'Standard',
    tip: 'Balanced traffic and ticket — default chain voice',
  },
  {
    id: 'premium',
    label: 'Premium',
    tip: 'Fewer shoppers, fatter tickets — quieter high-end door',
  },
]

function LandExpansionCard({
  id,
  name,
  blurb,
  cost,
  have,
  numberFormat,
  onBuy,
}: {
  id: string
  name: string
  blurb: string
  cost: number
  have: boolean
  numberFormat: Parameters<typeof money>[1]
  onBuy: () => void
}) {
  const { state: s } = useGame()
  const sid = id === 'side-yard' ? 'land-side-yard' : `expand-${id}`
  const suggested = useIsSuggested(sid)
  const canBuy = !have && s.cash >= cost
  return (
    <article
      data-suggest-id={sid}
      className={`ge-card${have ? ' ge-card--owned' : ''}${canBuy ? ' is-ready' : ''}${
        suggested ? ' is-suggested' : ''
      }`.trim()}
    >
      <div className="ge-card__head">
        <div>
          <strong>{name}</strong>
          <p className="ge-muted">{blurb}</p>
        </div>
      </div>
      <div className="ge-card__meta">
        <div className="ge-card__meta-row">
          <span>Status</span>
          <strong>{have ? 'Owned' : money(cost, numberFormat)}</strong>
        </div>
      </div>
      <Btn
        tone={canBuy ? 'primary' : 'ghost'}
        coachId={sid}
        disabled={have || s.cash < cost}
        onClick={onBuy}
      >
        {have ? 'Deed filed' : 'Buy'}
      </Btn>
    </article>
  )
}

/** Era 2+ chain roster: one compact row per store, bulk actions on top. */
function ChainRoster() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const [focus, setFocus] = useState<string | null>(null)
  const stores = s.stores ?? []
  const nextStoreCost = openStoreCost(s)
  const openBlock =
    stores.length >= CHAIN.maxStores
      ? 'Store cap reached.'
      : s.cash < nextStoreCost
        ? `Need ${money(nextStoreCost, numberFormat)}.`
        : null
  const depotCheck = can(s, { type: 'buildDepot' })
  const walkAll = can(s, { type: 'walkDrifting' })
  const even = can(s, { type: 'evenAttention' })
  const drifting = stores.filter((st) => (st.drift ?? 0) >= CHAIN.driftWarn).length
  const equiv = 1 + networkStores(s)
  const fair = 1 / Math.max(1, stores.length)

  return (
    <section className="ld-chain" aria-label="Chain">
      <LandStreet
        state={s}
        onPick={(id) => {
          setFocus(id)
          document.getElementById(`ld-${id}`)?.scrollIntoView({
            block: 'nearest',
            behavior: reducedMotion ? 'auto' : 'smooth',
          })
        }}
      />
      <div className="ld-chain__top">
        <dl className="ld-chain__nums">
          <div>
            <dt>Stores</dt>
            <dd>{stores.length}</dd>
          </div>
          <div title="How many flagships the chain is worth, counting levels, policy, Attention and drift.">
            <dt>Worth</dt>
            <dd>×{equiv.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Attention</dt>
            <dd>−{chainAttentionDrainPerSec(s).toFixed(2)}/s</dd>
          </div>
          <div className={drifting > 0 ? 'is-bad' : ''}>
            <dt>Drifting</dt>
            <dd>{drifting}</dd>
          </div>
        </dl>
        <div className="ld-chain__buy">
          <button
            type="button"
            className="g2-tag"
            data-coach-id="land-open-store"
            disabled={!!openBlock}
            title={openBlock ?? 'Open the next store'}
            onClick={() => dispatch({ type: 'openStore' })}
          >
            <span className="g2-tag__price">{money(nextStoreCost, numberFormat)}</span>
            <span className="g2-tag__label">Open store {stores.length + 1}</span>
          </button>
          {!s.depot ? (
            <button
              type="button"
              className="g2-tag g2-tag--small"
              data-coach-id="land-depot"
              disabled={!depotCheck.ok}
              title={depotCheck.ok ? 'Stores past the fourth run at full speed and the chain earns 20% more.' : depotCheck.reason}
              onClick={() => dispatch({ type: 'buildDepot' })}
            >
              <span className="g2-tag__price">{money(CHAIN.depotCash, numberFormat)}</span>
              <span className="g2-tag__label">Depot</span>
            </button>
          ) : (
            <span className="ld-chain__depot">Depot online</span>
          )}
        </div>
      </div>

      {stores.length >= 5 && !s.depot ? (
        <p className="ld-chain__warn" role="status">
          {stores.length} stores without a depot: stores past the fourth run at 60%. Build a depot.
        </p>
      ) : null}

      <div className="ld-chain__bulk">
        <button
          type="button"
          className="ge-btn ge-btn--ghost"
          disabled={!walkAll.ok}
          title={walkAll.ok ? 'Walk every drifting store, worst first, while Attention lasts.' : walkAll.reason}
          onClick={() => dispatch({ type: 'walkDrifting' })}
        >
          Walk all drifting{drifting > 0 ? ` (${drifting})` : ''}
        </button>
        <button
          type="button"
          className="ge-btn ge-btn--ghost"
          disabled={!even.ok}
          title={even.ok ? 'Give every store the same share of Attention.' : even.reason}
          onClick={() => dispatch({ type: 'evenAttention' })}
        >
          Even out Attention
        </button>
      </div>

      <ol className="ld-roster">
        {stores.map((st, i) => {
          const weight = i === 0 ? 1 : storeEngineWeight(s, st, i)
          const drift = st.drift ?? 0
          const walkBlock = canWalkStore(s, st.id)
          const trainBlock = canTrainStore(s, st.id)
          const driftTone = drift >= 0.7 ? 'is-bad' : drift >= CHAIN.driftWarn ? 'is-warn' : ''
          return (
            <li id={`ld-${st.id}`} key={st.id} className={`ld-row ${driftTone}${focus === st.id ? ' is-focus' : ''}`} data-coach-id={i === Math.min(1, stores.length - 1) ? 'land-policy' : undefined}>
              <div className="ld-row__who">
                <strong>{st.name}</strong>
                <span>
                  Lv {st.level}
                  {i === 0 ? ' · flagship' : ` · ×${weight.toFixed(2)}`}
                </span>
              </div>
              <div className="ld-row__drift" title="Drift rises when a store gets less than its fair share of Attention. Walking it clears drift.">
                <span className="ld-meter">
                  <span style={{ transform: `scaleX(${Math.min(1, drift)})` }} />
                </span>
                <span>{Math.round(drift * 100)}% drift</span>
              </div>
              <label className="ld-row__att" title={`Fair share is ${Math.round(fair * 100)}%.`}>
                <span>Attn {Math.round(st.attentionShare * 100)}%</span>
                <input
                  className="ge-range"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(st.attentionShare * 100)}
                  aria-label={`${st.name} Attention share`}
                  onChange={(e) =>
                    dispatch({ type: 'setAttentionShare', storeId: st.id, share: Number(e.target.value) / 100 })
                  }
                />
              </label>
              <div className="ld-seg" role="radiogroup" aria-label={`${st.name} policy`}>
                {POLICIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={st.policy === p.id}
                    className={st.policy === p.id ? 'is-on' : ''}
                    title={p.tip}
                    onClick={() => dispatch({ type: 'setPolicy', storeId: st.id, policy: p.id })}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="ld-row__act">
                <button
                  type="button"
                  className={`ge-btn ${drift >= CHAIN.driftWarn ? 'ge-btn--primary' : 'ge-btn--ghost'}`}
                  data-suggest-id={`walk-${st.id}`}
                  disabled={!!walkBlock}
                  title={walkBlock ?? 'Spend 40 Attention to clear drift.'}
                  onClick={() => dispatch({ type: 'walkStore', storeId: st.id })}
                >
                  Walk
                </button>
                <button
                  type="button"
                  className="ge-btn ge-btn--ghost"
                  disabled={!!trainBlock}
                  title={trainBlock ?? `Spend ${trainStoreCost(st)} Attention for store XP.`}
                  onClick={() => dispatch({ type: 'trainStore', storeId: st.id })}
                >
                  Train
                </button>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function LandPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const owned = s.expansions ?? {}

  return (
    <Panel
      title="Land"
      purpose="Open doors. Attention is the cost of every key."
      lore="land"
      scene={s.era >= 2 ? undefined : <LandBand state={s} />}
    >
      {s.era >= 2 ? <ChainRoster /> : null}

      <section className="ge-empire-block">
        <header className="ge-empire-block__head">
          <h3>Expansions</h3>
          <p>Deeds on the block. Buy once; they stick.</p>
        </header>
        <div className="ge-card-grid" data-coach-id="land-expansions">
          {EARLY.map((e) => (
            <LandExpansionCard
              key={e.id}
              id={e.id}
              name={e.name}
              blurb={e.blurb}
              cost={e.cost}
              have={!!owned[e.id]}
              numberFormat={numberFormat}
              onBuy={() => dispatch({ type: 'expandLot', id: e.id })}
            />
          ))}
          {s.era >= 2
            ? (() => {
                const ownedEra2 = ERA2_EXPANSIONS.filter((e) => !!owned[e.id])
                const nextEra2 = ERA2_EXPANSIONS.find((e) => {
                  if (owned[e.id]) return false
                  try {
                    return !e.requires || e.requires(s)
                  } catch {
                    return false
                  }
                })
                const ahead = ERA2_EXPANSIONS.length - ownedEra2.length - (nextEra2 ? 1 : 0)
                return (
                  <>
                    {ownedEra2.map((e) => (
                      <article key={e.id} className="ge-card ge-card--owned">
                        <div className="ge-card__head">
                          <div>
                            <strong>{e.name}</strong>
                            <p className="ge-muted">{ERA2_BLURB[e.id] ?? e.blurb}</p>
                          </div>
                        </div>
                        <div className="ge-card__meta">
                          <div className="ge-card__meta-row">
                            <span>Status</span>
                            <strong>Owned</strong>
                          </div>
                        </div>
                        <Btn tone="ghost" disabled>
                          Deed filed
                        </Btn>
                      </article>
                    ))}
                    {nextEra2
                      ? (() => {
                          const canBuy = s.cash >= nextEra2.cost
                          return (
                            <article
                              key={nextEra2.id}
                              className={`ge-card${canBuy ? ' is-ready' : ''}`.trim()}
                            >
                              <div className="ge-card__head">
                                <div>
                                  <strong>{nextEra2.name}</strong>
                                  <p className="ge-muted">
                                    {ERA2_BLURB[nextEra2.id] ?? nextEra2.blurb}
                                  </p>
                                </div>
                              </div>
                              <div className="ge-card__meta">
                                <div className="ge-card__meta-row">
                                  <span>Status</span>
                                  <strong>{money(nextEra2.cost, numberFormat)}</strong>
                                </div>
                              </div>
                              <Btn
                                tone={canBuy ? 'primary' : 'ghost'}
                                disabled={!canBuy}
                                title={!canBuy ? `Need ${money(nextEra2.cost, numberFormat)}` : undefined}
                                onClick={() => dispatch({ type: 'expandLot', id: nextEra2.id })}
                              >
                                Buy
                              </Btn>
                            </article>
                          )
                        })()
                      : null}
                    {ahead > 0 ? (
                      <p className="ge-muted" style={{ gridColumn: '1 / -1' }}>
                        {ahead} deed{ahead === 1 ? '' : 's'} after this.
                      </p>
                    ) : null}
                  </>
                )
              })()
            : null}
        </div>
      </section>

      <HelpCard title="Deeds before vanity">
        Each deed changes a formula — seats, demand, or store cost. Extra stores only add baskets when
        Attention keeps them managed; neglected doors barely help checkout.
      </HelpCard>
    </Panel>
  )
}

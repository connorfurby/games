import { ERA2_EXPANSIONS } from '../../content/era2'
import { CHAIN } from '../../sim/balance'
import { canTrainStore, canWalkStore, openStoreCost } from '../../sim/systems/chain'
import type { StorePolicy } from '../../sim/state'
import { useGame, useIsSuggested } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import { LandBand } from '../scenes/DepartmentBands'

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

export function LandPanel() {
  const { state: s, dispatch, numberFormat } = useGame()
  const owned = s.expansions ?? {}
  const stores = s.stores ?? []
  const nextStoreCost = openStoreCost(s)
  const canOpenStore = s.era >= 2 && stores.length < CHAIN.maxStores && s.cash >= nextStoreCost

  return (
    <Panel
      title="Land"
      purpose="Open doors. Attention is the cost of every key."
      lore="land"
      scene={<LandBand state={s} />}
    >
      {s.era >= 2 ? (
        <section className="ge-empire-block" style={{ marginTop: 0 }}>
          <header className="ge-empire-block__head">
            <h3>Chain</h3>
            <p>Open stores, build a depot, set each location’s voice.</p>
          </header>
          <div className="ge-dept-callout">
            <div className="ge-dept-callout__copy">
              <h3>
                {stores.length} store{stores.length === 1 ? '' : 's'}
                {s.depot ? ' · depot online' : ''}
              </h3>
              <p>
                Each new key costs cash and Attention drain — Walk drifting stores in the list below.
              </p>
            </div>
            <div className="ge-chip-row">
              <Btn
                tone={canOpenStore ? 'primary' : 'ghost'}
                coachId="land-open-store"
                disabled={!canOpenStore}
                title={
                  !canOpenStore
                    ? stores.length >= CHAIN.maxStores
                      ? 'Store cap reached'
                      : s.cash < nextStoreCost
                        ? `Need ${money(nextStoreCost, numberFormat)}`
                        : undefined
                    : undefined
                }
                onClick={() => dispatch({ type: 'openStore' })}
              >
                Open store · {money(nextStoreCost, numberFormat)}
              </Btn>
              <Btn
                coachId="land-depot"
                disabled={s.depot || s.cash < 18_000}
                title={
                  s.depot
                    ? 'Depot already online'
                    : s.cash < 18_000
                      ? 'Need $18,000.00'
                      : undefined
                }
                onClick={() => dispatch({ type: 'buildDepot' })}
              >
                {s.depot ? 'Depot online' : 'Depot · $18,000.00'}
              </Btn>
            </div>
          </div>

          {stores.length >= 5 && !s.depot ? (
            <p
              className="ge-muted ge-alert ge-alert--warn"
              role="status"
              style={{ fontSize: '0.78rem', color: 'var(--ge-warn, #e09f3e)' }}
            >
              ⚠ {stores.length} stores without a depot — Attention drain and logistics penalties climb.
              Build a depot.
            </p>
          ) : null}

          {stores.length > 0 ? (
            <div className="ge-card-grid">
              {stores.map((st) => (
                <article key={st.id} className="ge-card ge-card--owned" data-coach-id="land-policy">
                  <div className="ge-card__head">
                    <div>
                      <strong>{st.name}</strong>
                      <p className="ge-muted">
                        Lv {st.level} · XP {Math.floor(st.xp)}
                      </p>
                    </div>
                  </div>
                  <div className="ge-card__meta">
                    <div className="ge-card__meta-row">
                      <span>Attn</span>
                      <strong>{Math.round(st.attentionShare * 100)}%</strong>
                    </div>
                    <div className="ge-card__meta-row">
                      <span>Voice</span>
                      <strong>{st.policy}</strong>
                    </div>
                  </div>
                  <div className="ge-card__meta">
                    <div className="ge-card__meta-row">
                      <span>Drift</span>
                      <strong
                        title="Rises when under-attended. Walk the store to clear it."
                        style={{
                          color:
                            (st.drift ?? 0) >= 0.7
                              ? 'var(--ge-danger, #d9534f)'
                              : (st.drift ?? 0) >= 0.4
                                ? 'var(--ge-warn, #e09f3e)'
                                : undefined,
                        }}
                      >
                        {Math.round((st.drift ?? 0) * 100)}%
                      </strong>
                    </div>
                  </div>
                  <div className="ge-chip-row">
                    <Btn
                      data-suggest-id={`walk-${st.id}`}
                      tone={(st.drift ?? 0) >= 0.4 ? 'primary' : 'ghost'}
                      disabled={!!canWalkStore(s, st.id)}
                      title={canWalkStore(s, st.id) ?? 'Spend Attention to clear drift'}
                      onClick={() => dispatch({ type: 'walkStore', storeId: st.id })}
                    >
                      Walk store
                    </Btn>
                    <Btn
                      tone="ghost"
                      disabled={!!canTrainStore(s, st.id)}
                      title={canTrainStore(s, st.id) ?? 'Spend Attention to give this store XP'}
                      onClick={() => dispatch({ type: 'trainStore', storeId: st.id })}
                    >
                      Train store
                    </Btn>
                  </div>
                  <div className="ge-chip-row">
                    {POLICIES.map((p) => (
                      <Btn
                        key={p.id}
                        tone={st.policy === p.id ? 'primary' : 'ghost'}
                        title={p.tip}
                        onClick={() => dispatch({ type: 'setPolicy', storeId: st.id, policy: p.id })}
                      >
                        {p.label}
                      </Btn>
                    ))}
                  </div>
                  <p className="ge-muted">
                    {POLICIES.find((p) => p.id === st.policy)?.tip}
                  </p>
                  <label className="ge-muted" style={{ display: 'block' }}>
                    Attention share
                    <input
                      className="ge-range"
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(st.attentionShare * 100)}
                      onChange={(e) =>
                        dispatch({
                          type: 'setAttentionShare',
                          storeId: st.id,
                          share: Number(e.target.value) / 100,
                        })
                      }
                    />
                  </label>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

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

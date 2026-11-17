import { useState } from 'react'
import { MENUS } from '../../content/menus'
import { STORE_TRAIT_BY_ID, isPlaceTraitId, policyMatchesTrait } from '../../content/depth'
import { ERA2_EXPANSIONS } from '../../content/era2'
import { CHAIN, DEPTH } from '../../sim/balance'
import { can } from '../../sim/commands'
import { attentionPerSec } from '../../sim/formulas'
import {
  canTrainStore,
  canWalkStore,
  chainAttentionDrainPerSec,
  openStoreCost,
  hotTraitInfo,
  trainStoreCost,
  traitOfStore,
} from '../../sim/systems/chain'
import { outposts } from '../../sim/systems/lateHubs'
import { networkStores, storeEngineWeight } from '../../sim/systems/network'
import type { StorePolicy } from '../../sim/state'
import { useGame, useIsSuggested } from '../GameContext'
import { money } from '../format'
import { HubStage } from '../components/HubStage'
import { Button, EmptyState } from '../kit'
import { StatusChip, type VerbSecondary, type VerbTrayProps } from '../play'
import { OutpostStreetScene } from '../scenes/live/OutpostStreetScene'
import { EarlyLandStreet, LandStreet } from '../land/LandStreet'

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
          <span>{have ? 'Status' : 'Price'}</span>
          <strong className="ld-deed__value">{have ? '✓ Deed filed' : money(cost, numberFormat)}</strong>
        </div>
      </div>
      {have ? null : (
        <Button tone="primary" affordable={canBuy} coachId={sid} disabled={!canBuy} onClick={onBuy} cost={money(cost, numberFormat)}>
          Buy deed
        </Button>
      )}
    </article>
  )
}

function hotPolicyLabels(policies: string[]): string {
  return policies
    .map((p) => POLICIES.find((x) => x.id === p)?.label ?? p)
    .join(' or ')
}

/** Era 2+ chain roster: one compact row per store, bulk actions on top. */
function ChainRoster({
  focus,
  onFocus,
}: {
  focus: string | null
  onFocus: (id: string) => void
}) {
  const { state: s, dispatch } = useGame()
  const stores = s.stores ?? []
  const drifting = stores.filter((st) => (st.drift ?? 0) >= CHAIN.driftWarn).length
  const equiv = 1 + networkStores(s)
  const fair = 1 / Math.max(1, stores.length)
  const attGen = s.compute.unlocked ? attentionPerSec(s) : 0
  const attDrain = chainAttentionDrainPerSec(s)
  const attNet = attGen - attDrain

  const block = s.depth?.blockEvent
  const blockLive = !!(block?.kind && (block.until ?? 0) > s.time)
  const hot = hotTraitInfo(s)
  return (
    <section className="ld-chain" aria-label="Chain">
      {blockLive ? (
        <div className="ge-dept-callout" role="status">
          <div className="ge-dept-callout__copy">
            <h3>
              {block!.kind === 'parade' ? 'Parade week' : block!.kind === 'payday' ? 'Payday rush' : 'Rain week'}
            </h3>
            <p>
              {block!.traitBias && isPlaceTraitId(block!.traitBias)
                ? `${STORE_TRAIT_BY_ID[block!.traitBias].name} doors pull hardest. `
                : ''}
              {Math.ceil((block!.until - s.time) / 60)}m left.
              {hot ? ` Matching policy: ${hotPolicyLabels(hot.policies)} (${hot.matchedDoors}/${stores.length} doors match).` : ''}
            </p>
          </div>
        </div>
      ) : null}
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
          <div
            title={`Analysts +${attGen.toFixed(1)}/s, stores −${attDrain.toFixed(2)}/s. Ideas mint when the bar is full.`}
          >
            <dt>Attention</dt>
            <dd className={attNet < 0 ? 'is-bad' : ''}>
              {attNet >= 0 ? '+' : '−'}
              {Math.abs(attNet).toFixed(2)}/s
            </dd>
          </div>
          <div className={drifting > 0 ? 'is-bad' : ''}>
            <dt>Drifting</dt>
            <dd>{drifting}</dd>
          </div>
        </dl>
      </div>

      {stores.length >= 5 && !s.depot ? (
        <p className="ld-chain__warn" role="status">
          {stores.length} stores without a depot: stores past the fourth run at 60%. Build a depot.
        </p>
      ) : null}

      <ol className="ld-roster">
        {stores.map((st, i) => {
          const weight = i === 0 ? 1 : storeEngineWeight(s, st, i)
          const drift = st.drift ?? 0
          const walkBlock = canWalkStore(s, st.id)
          const trainBlock = canTrainStore(s, st.id)
          const driftTone = drift >= 0.7 ? 'is-bad' : drift >= CHAIN.driftWarn ? 'is-warn' : ''
          return (
            <li
              id={`ld-${st.id}`}
              key={st.id}
              className={`ld-row ${driftTone}${focus === st.id ? ' is-focus' : ''}`}
              data-coach-id={i === Math.min(1, stores.length - 1) ? 'land-policy' : undefined}
              onClick={() => onFocus(st.id)}
            >
              <div className="ld-row__who">
                <strong>{st.name}</strong>
                <span>
                  Lv {st.level}
                  {i === 0 ? ' · flagship' : ` · ×${weight.toFixed(2)}`}
                  {(() => {
                    const tid = traitOfStore(s, st.id)
                    if (!tid || !isPlaceTraitId(tid)) return ''
                    const match = policyMatchesTrait(st.policy, tid)
                    return ` · ${STORE_TRAIT_BY_ID[tid].name}${match ? ' ✓' : ''}`
                  })()}
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
                {walkBlock ? null : <Button
                  size="sm"
                  tone={drift >= CHAIN.driftWarn ? 'primary' : 'secondary'}
                  data-suggest-id={`walk-${st.id}`}
                  title="Spend 40 Attention to clear drift."
                  onClick={() => dispatch({ type: 'walkStore', storeId: st.id })}
                >
                  Walk the floor
                </Button>}
                {trainBlock ? null : <Button
                  size="sm"
                  tone="secondary"
                  title={`Spend ${trainStoreCost(st)} Attention for store XP.`}
                  onClick={() => dispatch({ type: 'trainStore', storeId: st.id })}
                >
                  Train staff
                </Button>}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** Era 7+: one read-only row per stocked world, with a charter button for the next unfranchised one. */
function OutpostRoster() {
  const { state: s, dispatch } = useGame()
  const rows = outposts(s)
  const charter = can(s, { type: 'openPlanetFranchise' })
  return (
    <section className="ge-empire-block" data-coach-id="land-outposts">
      <header className="ge-empire-block__head">
        <h3>Outposts</h3>
        {rows.length > 0 ? (
          <p>{`${rows.filter((r) => r.franchised).length} of ${rows.length} stocked worlds carry your name.`}</p>
        ) : null}
      </header>
      {rows.length === 0 ? (
        <EmptyState title="No stocked worlds yet" body="Stock a world and it shows up here." />
      ) : (
        <ol className="ld-roster">
          {rows.map((r) => (
            <li key={r.id} className="ld-row">
              <div className="ld-row__who">
                <strong>{r.name}</strong>
                <span>
                  Score {Math.round(r.score * 100)}% · {r.franchised ? 'franchised' : 'stocked'}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="ge-chip-row">
        {charter.ok ? (
          <Button tone="primary" title="Put the name over the next outpost door." onClick={() => dispatch({ type: 'openPlanetFranchise' })}>
            Charter an outpost
          </Button>
        ) : (
          <p className="ge-muted">Charter an outpost: {charter.reason}</p>
        )}
      </div>
    </section>
  )
}

export function LandPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const owned = s.expansions ?? {}
  const [focus, setFocus] = useState<string | null>(null)

  const pickStore = (id: string) => {
    setFocus(id)
    document.getElementById(`ld-${id}`)?.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  const stores = s.stores ?? []
  const chain = s.era >= 2
  const nextStoreCost = openStoreCost(s)
  const openBlock =
    stores.length >= CHAIN.maxStores
      ? 'Store cap reached.'
      : s.cash < nextStoreCost
        ? `Need ${money(nextStoreCost, numberFormat)}.`
        : null
  const depotCheck = can(s, { type: 'buildDepot' })
  const walkAll = can(s, { type: 'walkDrifting' })
  const evenCheck = can(s, { type: 'evenAttention' })
  const drifting = stores.filter((st) => (st.drift ?? 0) >= CHAIN.driftWarn).length

  const nextEra2 = ERA2_EXPANSIONS.find((e) => {
    if (owned[e.id]) return false
    try {
      return !e.requires || e.requires(s)
    } catch {
      return false
    }
  })
  const nextDeed =
    EARLY.find((e) => !owned[e.id]) ??
    (nextEra2 ? { id: nextEra2.id, name: nextEra2.name, cost: nextEra2.cost } : null)
  const deedCheck = nextDeed ? can(s, { type: 'expandLot', id: nextDeed.id }) : null

  // Primary: walk the drifting doors when it matters, else the next deed, else the next store.
  const primary: VerbTrayProps['primary'] & { reason?: string } =
    chain && drifting > 0 && walkAll.ok
      ? {
          label: `Walk all drifting (${drifting})`,
          tone: 'primary',
          size: 'lg',
          onClick: () => dispatch({ type: 'walkDrifting' }),
        }
      : nextDeed && deedCheck
        ? {
            label: `Buy ${nextDeed.name} · ${money(nextDeed.cost, numberFormat)}`,
            tone: 'primary',
            size: 'lg',
            disabled: !deedCheck.ok,
            reason: deedCheck.ok ? undefined : deedCheck.reason,
            onClick: () => dispatch({ type: 'expandLot', id: nextDeed.id }),
          }
        : chain
          ? {
              label: `Open store ${stores.length + 1} · ${money(nextStoreCost, numberFormat)}`,
              tone: 'primary',
              size: 'lg',
              disabled: !!openBlock,
              reason: openBlock ?? undefined,
              onClick: () => dispatch({ type: 'openStore' }),
            }
          : {
              label: 'All deeds filed',
              tone: 'ghost',
              size: 'lg',
              disabled: true,
              reason: 'Nothing left on the block.',
              onClick: () => undefined,
            }
  const { reason: primaryReason, ...primaryProps } = primary
  const primaryIsWalk = chain && drifting > 0 && walkAll.ok
  const primaryIsStore = !primaryIsWalk && !(nextDeed && deedCheck) && chain

  const secondaries: VerbSecondary[] = chain
    ? [
        ...(primaryIsStore
          ? []
          : [
              {
                key: 'store',
                label: `Open store ${stores.length + 1}`,
                fact: money(nextStoreCost, numberFormat),
                coachId: 'land-open-store',
                disabled: !!openBlock,
                title: openBlock ?? 'Open the next store',
                onClick: () => dispatch({ type: 'openStore' }),
              },
            ]),
        ...(primaryIsWalk
          ? []
          : [
              {
                key: 'walk',
                label: 'Walk all drifting',
                fact: drifting > 0 ? String(drifting) : undefined,
                disabled: !walkAll.ok,
                title: walkAll.ok ? 'Walk every drifting store, worst first, while Attention lasts.' : walkAll.reason,
                onClick: () => dispatch({ type: 'walkDrifting' }),
              },
            ]),
        ...(!s.depot
          ? [
              {
                key: 'depot',
                label: 'Depot',
                fact: money(CHAIN.depotCash, numberFormat),
                coachId: 'land-depot',
                disabled: !depotCheck.ok,
                title: depotCheck.ok
                  ? 'Stores past the fourth run at full speed and the chain earns 20% more.'
                  : depotCheck.reason,
                onClick: () => dispatch({ type: 'buildDepot' }),
              },
            ]
          : []),
        {
          key: 'even',
          label: 'Even out Attention',
          disabled: !evenCheck.ok,
          title: evenCheck.ok ? 'Give every store the same share of Attention.' : evenCheck.reason,
          onClick: () => dispatch({ type: 'evenAttention' }),
        },
      ]
    : []

  const filed = Object.values(owned).filter(Boolean).length
  const hotInfo = hotTraitInfo(s)

  return (
    <section className="ge-panel">
      <HubStage
        purpose={MENUS.land.purpose}
        department={MENUS.land.name}
        scene={
          s.era >= 7 ? (
            <OutpostStreetScene />
          ) : s.era >= 2 ? (
            <LandStreet state={s} onPick={pickStore} />
          ) : (
            <>
              <EarlyLandStreet state={s} />
              <EmptyState title="Side yard and lots unlock after the Corner Store era." />
            </>
          )
        }
        tray={{
          primary: primaryProps,
          failReason: primaryReason,
          secondaries,
        }}
      >
        <StatusChip tone="idle" title="Deeds filed">
          Filed {filed}
        </StatusChip>
        {s.era >= 2 && hotInfo ? (
          <StatusChip
            tone={hotInfo.matchedDoors > 0 ? 'ready' : 'warn'}
            title="A block event pulls one neighborhood trait. Set a door policy that matches it."
          >
            Hot trait · {hotInfo.traitName} · match {hotPolicyLabels(hotInfo.policies)} · {hotInfo.matchedDoors}/
            {s.stores.length} doors
          </StatusChip>
        ) : null}
        <section className="ge-empire-block" aria-label="Expansions">
          {(s.depth?.blockEvent?.kind && (s.depth.blockEvent.until ?? 0) > s.time) ||
          (s.depth?.hotTraitWalks ?? 0) < DEPTH.hotTraitWalkNeed ? (
            <p className="ge-muted" data-coach-id="land-hot-trait" style={{ marginBottom: '0.55rem' }}>
              {s.depth?.blockEvent?.kind && (s.depth.blockEvent.until ?? 0) > s.time
                ? `Hot trait live — match a door policy to ${
                    s.depth.blockEvent.traitBias
                      ? STORE_TRAIT_BY_ID[s.depth.blockEvent.traitBias as keyof typeof STORE_TRAIT_BY_ID]?.name ??
                        s.depth.blockEvent.traitBias
                      : 'the rush'
                  } (${hotInfo ? hotPolicyLabels(hotInfo.policies) : 'matching policy'}) before the window ends.`
                : `Hot-trait walks ${s.depth?.hotTraitWalks ?? 0}/${DEPTH.hotTraitWalkNeed} toward the cold permit.`}
            </p>
          ) : null}
          <header className="ge-empire-block__head">
            <h3>Expansions</h3>
            <p>Deeds on the block. Buy once; they stick.</p>
          </header>
          <div className="ge-card-grid" data-coach-id="land-expansions-primary">
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
          </div>
        </section>
      {s.era >= 2 ? <ChainRoster focus={focus} onFocus={pickStore} /> : null}
      {s.era >= 7 ? <OutpostRoster /> : null}

      {s.era >= 2 ? (
      <section className="ge-empire-block">
        <header className="ge-empire-block__head">
          <h3>Later deeds</h3>
          <p>Era-gated parcels and metro slots.</p>
        </header>
        <div className="ge-card-grid" data-coach-id="land-expansions">
          {(() => {
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
                            <strong className="ld-deed__value">✓ Deed filed</strong>
                          </div>
                        </div>
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
                                  <span>Price</span>
                                  <strong className="ld-deed__value">{money(nextEra2.cost, numberFormat)}</strong>
                                </div>
                              </div>
                              <Button
                                tone="primary"
                                affordable={canBuy}
                                disabled={!canBuy}
                                cost={money(nextEra2.cost, numberFormat)}
                                title={!canBuy ? `Need ${money(nextEra2.cost, numberFormat)}` : undefined}
                                onClick={() => dispatch({ type: 'expandLot', id: nextEra2.id })}
                              >
                                Buy deed
                              </Button>
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
              })()}
        </div>
      </section>
      ) : null}
      </HubStage>
    </section>
  )
}

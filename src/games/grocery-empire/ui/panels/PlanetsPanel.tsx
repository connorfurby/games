import { useState } from 'react'
import { scorePlanogram, type PlanetClimate } from '../../content/horizon'
import { upgradeEffect } from '../../content/upgrades'
import { can } from '../../sim/commands'
import { HORIZON, PRICE } from '../../sim/balance'
import { meanPlanetScore, planetDef, planetNetworkMul, probeCost, stockedCount } from '../../sim/systems/horizon'
import { useGame } from '../GameContext'
import { Button, ScreenHeader } from '../kit'
import { clock, money, qty } from '../format'
import { HubStage } from '../components/HubStage'
import { HorizonGoalStrip } from '../horizon/HorizonGoalStrip'
import { Planogram } from '../puzzles/Planogram'
import { PlanetShelf } from '../puzzles/PlanetShelf'
import { PuzzleFrame, gateTitle, pocket } from '../puzzles/PuzzleFrame'

function six(slots: readonly string[]): string[] {
  return [0, 1, 2, 3, 4, 5].map((i) => slots[i] ?? '')
}

const POLICIES = ['volume', 'margin', 'fresh'] as const
const CLIMATE_FILTERS: Array<PlanetClimate | 'all'> = [
  'all',
  'quiet',
  'heat',
  'orchard',
  'tide',
  'night',
  'ash',
  'ice',
  'market',
]

function policyLabel(id: (typeof POLICIES)[number]): string {
  const n = HORIZON.clusterMul[id]
  const name = id === 'volume' ? 'Volume' : id === 'margin' ? 'Margin' : 'Fresh'
  return `${name} ×${n.toFixed(2)}`
}

function etaCash(need: number, cash: number, rev: number): string | null {
  if (cash >= need) return 'affordable now'
  if (!(rev > 0)) return null
  return `about ${clock((need - cash) / rev)} at this rate`
}

export function PlanetsPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const h = s.horizon
  const revealed = h.planets.filter((p) => p.revealed)
  const [pick, setPick] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [climateFilter, setClimateFilter] = useState<PlanetClimate | 'all'>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'stocked' | 'empty'>('all')

  const filtered = revealed.filter((run) => {
    const def = planetDef(run.id)
    if (!def) return false
    if (climateFilter !== 'all' && def.climate !== climateFilter) return false
    if (stockFilter === 'stocked' && !run.stocked) return false
    if (stockFilter === 'empty' && run.stocked) return false
    return true
  })
  const run = filtered.find((p) => p.id === pick) ?? filtered[0] ?? revealed[0] ?? null
  const def = run ? planetDef(run.id) : null
  const slotKey = run ? `${run.id}|${run.slots.join(',')}` : ''
  const [draftKey, setDraftKey] = useState(slotKey)
  const [draft, setDraft] = useState<string[]>(() => six(run?.slots ?? []))
  const clusterKey = h.cluster ? `${h.cluster.name}\u0001${h.cluster.policy}` : ''
  const [clusterSeen, setClusterSeen] = useState(clusterKey)
  const [clusterName, setClusterName] = useState(h.cluster?.name ?? '')
  const [policy, setPolicy] = useState<(typeof POLICIES)[number]>(h.cluster?.policy ?? 'volume')
  if (draftKey !== slotKey) {
    const slots = slotKey.includes('|') ? (slotKey.split('|')[1] ?? '').split(',') : []
    setDraftKey(slotKey)
    setDraft(six(slots))
  }
  if (clusterSeen !== clusterKey && h.cluster) {
    setClusterSeen(clusterKey)
    setClusterName(h.cluster.name)
    setPolicy(h.cluster.policy)
  }

  const probe = can(s, { type: 'launchProbe' })
  const cost = probeCost(s)
  const stocked = stockedCount(s)
  const mean = meanPlanetScore(s)
  const layer = planetNetworkMul(s)
  const live = def ? scorePlanogram(def, draft) : 0
  const standardScore = def ? scorePlanogram(def, def.standardSlots) : 0
  const showPuzzle = Boolean(run && def && (!run.stocked || editing))
  const standard = run
    ? can(s, { type: 'fileStandardPlanogram', planetId: run.id })
    : { ok: false, reason: 'Launch a probe first.' }
  const commit = run
    ? can(s, { type: 'setPlanogram', planetId: run.id, slots: draft })
    : { ok: false, reason: 'Launch a probe first.' }
  const clusterCheck = can(s, { type: 'nameCluster', name: clusterName, policy })
  const follow = run
    ? can(s, { type: 'setPlanetPrice', planetId: run.id, price: null })
    : { ok: false, reason: 'Stock the world first.' }
  const shownPrice = run ? Math.min(PRICE.max, Math.max(PRICE.min, run.localPrice ?? s.price)) : s.price
  const wantCluster = stocked >= 4 && !h.cluster
  const filing = Boolean(run && def && !run.stocked)
  const surveyLive =
    (s.memos['survey-office'] ?? 0) > 0 || h.continued || upgradeEffect(s, 'survey-desk') > 0
  const probeEta = etaCash(cost, s.cash, s.rates.revenuePerSec)
  const retargetEta =
    h.survey >= HORIZON.clusterRetarget
      ? 'retarget ready'
      : surveyLive
        ? `retarget in ${clock((HORIZON.clusterRetarget - h.survey) / HORIZON.surveyPerSec)}`
        : 'survey idle'

  function place(sku: string) {
    setDraft((prev) => {
      const i = prev.findIndex((id) => !id)
      if (i < 0) return prev
      const next = prev.slice()
      next[i] = sku
      return next
    })
  }

  function choose(id: string) {
    setPick(id)
    const next = revealed.find((p) => p.id === id)
    setEditing(!next?.stocked)
  }

  const shelfSlots = showPuzzle ? draft : (run?.slots ?? [])

  let goalTitle = 'Launch a probe'
  let goalProgress: number | null = stocked / 8
  let goalLabel = `${stocked}/8 stocked`
  let goalPayoff = `Planet layer ${layer < 10 ? `×${layer.toFixed(2)}` : `×${qty(layer)}`} on flagship sales`
  let goalAction = (
    <Button
      tone={probe.ok ? 'primary' : 'ghost'}
      coachId="planets-launch"
      disabled={!probe.ok}
      title={gateTitle(probe, `Reveal the next world · ${money(cost, numberFormat)}`)}
      onClick={() => dispatch({ type: 'launchProbe' })}
    >
      Launch probe · {money(cost, numberFormat)}
    </Button>
  )
  let goalEta = probeEta
  let goalReady = probe.ok

  const climateCheck = can(s, { type: 'serveClimateNeighbor' })
  const climateNeed = HORIZON.climateServeNeed
  const climateDone = h.climateServed ?? 0
  if (climateDone < climateNeed && stocked > 0) {
    goalTitle = 'Serve climate neighbors'
    goalProgress = climateDone / climateNeed
    goalLabel = `${climateDone}/${climateNeed} served`
    goalPayoff = 'Climate neighbors open the exchange door with stocked worlds'
    goalEta =
      h.nextClimateAt > s.time ? `next in ${clock(h.nextClimateAt - s.time)}` : null
    goalReady = climateCheck.ok
    goalAction = (
      <Button
        tone={climateCheck.ok ? 'primary' : 'ghost'}
        coachId="planets-climate"
        disabled={!climateCheck.ok}
        title={gateTitle(climateCheck, 'Serve a stocked world’s climate neighbor.')}
        onClick={() => dispatch({ type: 'serveClimateNeighbor' })}
      >
        Serve climate · {climateDone}/{climateNeed}
      </Button>
    )
  } else if (filing && def && run) {
    goalTitle = `Stock ${def.name}`
    goalProgress = live
    goalLabel = `${Math.round(live * 6)}/6 tags · standard ${standardScore.toFixed(2)}`
    goalPayoff = `Filing adds this world to the planet layer (${goalPayoff})`
    goalEta = null
    goalReady = standard.ok || commit.ok
    goalAction = (
      <Button
        tone="primary"
        coachId="planets-standard"
        disabled={!standard.ok}
        title={gateTitle(standard, 'File the authored shelf and follow the flagship price.')}
        onClick={() => dispatch({ type: 'fileStandardPlanogram', planetId: run.id })}
      >
        File the standard · {standardScore.toFixed(2)}
      </Button>
    )
  } else if (wantCluster) {
    goalTitle = 'Name the cluster'
    goalProgress = 1
    goalLabel = '4 worlds ready'
    goalPayoff = 'Volume, margin, or fresh multiplies every stocked world'
    goalEta = null
    goalReady = clusterCheck.ok
    goalAction = (
      <Button
        tone={clusterCheck.ok ? 'primary' : 'ghost'}
        disabled={!clusterCheck.ok}
        title={gateTitle(clusterCheck, 'Name the cluster')}
        onClick={() => dispatch({ type: 'nameCluster', name: clusterName.trim(), policy })}
      >
        Name cluster
      </Button>
    )
  } else if (stocked > 0 && !filing) {
    goalTitle = 'Stock the system'
    goalLabel = `${stocked}/8 stocked · mean ${mean > 0 ? mean.toFixed(2) : '—'}`
    goalAction = (
      <Button
        tone={probe.ok ? 'ghost' : 'ghost'}
        coachId="planets-launch"
        disabled={!probe.ok}
        title={gateTitle(probe, `Reveal the next world · ${money(cost, numberFormat)}`)}
        onClick={() => dispatch({ type: 'launchProbe' })}
      >
        Launch probe · {money(cost, numberFormat)}
      </Button>
    )
  }

  return (
    <section className="ge-panel">
      <ScreenHeader
        hub
        title="Planets"
        purpose={
          <span title="Fast path is four shelves at 0.85. Slow path is six at 0.72. Standard is mediocre on purpose.">
            Stock the shelf a world is asking for.
          </span>
        }
      />
      <HubStage
        scene={
          run && def ? (
            <PlanetShelf
              name={def.name}
              climate={def.climate}
              slots={shelfSlots}
              score={run.stocked ? run.score : showPuzzle ? live : undefined}
              survey={h.survey}
              reducedMotion={reducedMotion}
              onCommit={
                filing && run
                  ? () => dispatch({ type: 'fileStandardPlanogram', planetId: run.id })
                  : undefined
              }
            />
          ) : (
            <p className="hz-note">Launch a probe to open the first shelf.</p>
          )
        }
        primary={
          <>
            <HorizonGoalStrip
              title={goalTitle}
              progress={goalProgress}
              progressLabel={goalLabel}
              payoff={goalPayoff}
              eta={goalEta}
              ready={goalReady}
              coachId="planets-goal"
              action={goalAction}
            />
            <p className="hz-pocket" data-coach-id="planets-survey" title={`Retarget costs ${HORIZON.clusterRetarget}${retargetEta ? ` · ${retargetEta}` : ''}`}>
              <span>Survey</span>
              <strong>{pocket(h.survey, numberFormat)}</strong>
              <span>{surveyLive ? `+${HORIZON.surveyPerSec.toFixed(2)}/s` : 'idle'}</span>
            </p>
          </>
        }
      >
      {showPuzzle && run && def ? (
        <PuzzleFrame
          title={def.name}
          purpose="Place six goods. A tag the world wants counts."
          score={live}
          hideStandard={filing}
          standardDisabled={!standard.ok}
          commitDisabled={!commit.ok}
          standardTitle={gateTitle(standard, 'File the authored shelf and follow the flagship price. Fast is 0.85; slow is 0.72.')}
          commitTitle={gateTitle(commit, 'Stock this shelf.')}
          standardCoach="planets-standard"
          commitCoach="planets-commit"
          onStandard={() => dispatch({ type: 'fileStandardPlanogram', planetId: run.id })}
          onCommit={() => {
            dispatch({ type: 'setPlanogram', planetId: run.id, slots: draft })
            setEditing(false)
          }}
        >
          <Planogram
            planet={def}
            slots={draft}
            onClear={(i) =>
              setDraft((prev) => {
                const next = prev.slice()
                next[i] = ''
                return next
              })
            }
            onPlace={place}
          />
        </PuzzleFrame>
      ) : null}
      {revealed.length > 0 ? (
        <div className="hz-world-list" data-coach-id="planets-worlds">
          <div className="hz-filters" role="group" aria-label="Filter worlds">
            <select
              aria-label="Climate"
              value={climateFilter}
              onChange={(e) => setClimateFilter(e.target.value as PlanetClimate | 'all')}
            >
              {CLIMATE_FILTERS.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All climates' : c}
                </option>
              ))}
            </select>
            <select
              aria-label="Stocked"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as 'all' | 'stocked' | 'empty')}
            >
              <option value="all">All worlds</option>
              <option value="stocked">Stocked</option>
              <option value="empty">Empty</option>
            </select>
          </div>
          <ul className="hz-world-picks">
            {(filtered.length ? filtered : revealed).map((row) => {
              const d = planetDef(row.id)
              if (!d) return null
              const on = run?.id === row.id
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`hz-world-pick${on ? ' is-on' : ''}${row.stocked ? ' is-stocked' : ''}`}
                    aria-pressed={on}
                    onClick={() => choose(row.id)}
                  >
                    <strong>{d.name}</strong>
                    <span>{d.climate}</span>
                    <em>{row.stocked ? row.score.toFixed(2) : 'empty'}</em>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {run && def && run.stocked ? (
        <article className="ge-card">
          <header className="ge-empire-block__head">
            <h3>Local price</h3>
            <p>
              {run.localPrice == null ? 'Following the flagship.' : `Local ${money(run.localPrice, numberFormat)}.`}{' '}
              Flagship {money(s.price, numberFormat)}.
            </p>
          </header>
          <label className="hz-field">
            <span>Shelf price</span>
            <input
              className="hz-range"
              type="range"
              min={PRICE.min}
              max={PRICE.max}
              step={PRICE.step}
              value={shownPrice}
              aria-label="Local price"
              onChange={(e) => {
                const price = Number(e.target.value)
                if (Number.isFinite(price)) dispatch({ type: 'setPlanetPrice', planetId: run.id, price })
              }}
            />
          </label>
          <div className="ge-chip-row">
            <Button
              tone="ghost"
              disabled={!follow.ok || run.localPrice == null}
              title={gateTitle(follow, 'Use the flagship price')}
              onClick={() => dispatch({ type: 'setPlanetPrice', planetId: run.id, price: null })}
            >
              Follow flagship
            </Button>
            <Button tone="ghost" onClick={() => setEditing(true)}>
              Edit shelf
            </Button>
          </div>
        </article>
      ) : null}

      {run?.stocked && stocked >= 4 ? (
        <article className="ge-card" data-coach-id="planets-cluster">
          <header className="ge-empire-block__head">
            <h3>Cluster</h3>
            <p>
              {h.cluster ? `${h.cluster.name} runs ${policyLabel(h.cluster.policy)}.` : 'Name the twelve-letter cluster.'} A
              new policy costs {HORIZON.clusterRetarget} survey.
            </p>
          </header>
          <label className="hz-field">
            <span>Name</span>
            <input
              type="text"
              maxLength={12}
              value={clusterName}
              aria-label="Cluster name"
              onChange={(e) => setClusterName(e.target.value)}
            />
          </label>
          <div className="hz-chips" role="radiogroup" aria-label="Cluster policy">
            {POLICIES.map((id) => (
              <button
                key={id}
                type="button"
                className={`hz-chip${policy === id ? ' is-on' : ''}`}
                aria-pressed={policy === id}
                onClick={() => setPolicy(id)}
              >
                {policyLabel(id)}
              </button>
            ))}
          </div>
          <div className="ge-chip-row">
            <Button
              tone={clusterCheck.ok ? 'primary' : 'ghost'}
              disabled={!clusterCheck.ok}
              title={gateTitle(clusterCheck, 'Name the cluster')}
              onClick={() => dispatch({ type: 'nameCluster', name: clusterName.trim(), policy })}
            >
              {h.cluster ? 'Retarget' : 'Name cluster'}
            </Button>
          </div>
        </article>
      ) : stocked < 4 ? (
        <p className="hz-note">
          Name the cluster once four worlds are stocked. {stocked} of 4.
        </p>
      ) : null}

      {h.endless ? (
        <p className="hz-note">
          Endless is open. {h.endlessPlanets} world{h.endlessPlanets === 1 ? '' : 's'} past the named eight.
        </p>
      ) : null}
      </HubStage>
    </section>
  )
}

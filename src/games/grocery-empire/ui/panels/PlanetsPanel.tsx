import { useState, type ReactNode } from 'react'
import { SKU_BY_ID, scorePlanogram, type PlanetClimate } from '../../content/horizon'
import { upgradeEffect } from '../../content/upgrades'
import { can } from '../../sim/commands'
import { climateBanPullMul } from '../../sim/formulas'
import { HORIZON, PRICE } from '../../sim/balance'
import { FACING_BY_ID } from '../../content/depth'
import {
  activeFacingBan,
  currentClimateGuest,
  guestBanTarget,
  meanPlanetScore,
  planetDef,
  planetNetworkMul,
  probeCost,
  stockedCount,
} from '../../sim/systems/horizon'
import { useGame } from '../GameContext'
import { Button, SegmentedControl, Select } from '../kit'
import { clock, money, qty } from '../format'
import { EndlessBanNote } from '../horizon/EndlessBanNote'
import { HorizonGoalStrip } from '../horizon/HorizonGoalStrip'
import { PlayFrame, StatusChip, type VerbSecondary } from '../play'
import { Planogram } from '../puzzles/Planogram'
import { PlanetShelf } from '../puzzles/PlanetShelf'
import { PuzzleFrame, gateTitle, pocket } from '../puzzles/PuzzleFrame'
import './waveC.css'

function six(slots: readonly string[]): string[] {
  return [0, 1, 2, 3, 4, 5].map((i) => slots[i] ?? '')
}

const POLICIES = ['volume', 'margin', 'fresh'] as const
const CLIMATES: PlanetClimate[] = ['quiet', 'heat', 'orchard', 'tide', 'night', 'ash', 'ice', 'market']

type StockFilter = 'all' | 'stocked' | 'empty'

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

/** The one primary verb the tray shows, plus the goal strip copy that explains it. */
interface Verb {
  label: ReactNode
  ready: boolean
  disabled: boolean
  title?: string
  coachId?: string
  fail?: string
  onClick: () => void
}

export function PlanetsPanel() {
  const { state: s, dispatch, numberFormat, reducedMotion } = useGame()
  const h = s.horizon
  const revealed = h.planets.filter((p) => p.revealed)
  const [pick, setPick] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [climateFilter, setClimateFilter] = useState<PlanetClimate | 'all'>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')

  const filtered = revealed.filter((row) => {
    const d = planetDef(row.id)
    if (!d) return false
    if (climateFilter !== 'all' && d.climate !== climateFilter) return false
    if (stockFilter === 'stocked' && !row.stocked) return false
    if (stockFilter === 'empty' && row.stocked) return false
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
  const filing = Boolean(run && def && !run.stocked)
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
  const climateCheck = can(s, { type: 'serveClimateNeighbor' })
  const facingBan = activeFacingBan(s)
  const nextBan = guestBanTarget(s)
  const banPct = Math.round((1 - climateBanPullMul(s)) * 100)
  const guest = climateCheck.ok || h.nextClimateAt > s.time || (h.climateServed ?? 0) < HORIZON.climateServeNeed ? currentClimateGuest(s) : null
  const banCost = nextBan
    ? `${guest?.name ?? 'The guest'} bans ${FACING_BY_ID[nextBan.tag]?.name ?? nextBan.tag} (−${banPct}% pull) until the shift turns.`
    : 'No featured facing for the guest to ban.'
  const shownPrice = run ? Math.min(PRICE.max, Math.max(PRICE.min, run.localPrice ?? s.price)) : s.price
  const wantCluster = stocked >= 4 && !h.cluster
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
  const placed = draft.filter((id) => id && SKU_BY_ID[id]).length
  const matchedSlots = def
    ? draft.filter((id) => (SKU_BY_ID[id]?.tags ?? []).some((t) => def.wanted.includes(t))).length
    : 0
  const matchedTags = def
    ? new Set(
        draft.flatMap((id) => {
          const tags = SKU_BY_ID[id]?.tags ?? []
          return tags.filter((t) => def.wanted.includes(t))
        }),
      )
    : new Set<string>()

  // ── Verbs: each one dispatches a command and carries its own fail reason. ──
  const launchVerb: Verb = {
    label: `Launch probe · ${money(cost, numberFormat)}`,
    ready: probe.ok,
    disabled: !probe.ok,
    title: gateTitle(probe, `Reveal the next world · ${money(cost, numberFormat)}`),
    coachId: 'planets-launch',
    fail: probe.reason,
    onClick: () => dispatch({ type: 'launchProbe' }),
  }
  const climateVerb: Verb = {
    label: `Serve climate · ${h.climateServed ?? 0}/${HORIZON.climateServeNeed}`,
    ready: climateCheck.ok,
    disabled: !climateCheck.ok,
    title: gateTitle(climateCheck, `Serve a stocked world’s climate neighbor. ${banCost}`),
    coachId: 'planets-climate',
    fail: climateCheck.reason,
    onClick: () => dispatch({ type: 'serveClimateNeighbor' }),
  }
  const clusterVerb: Verb = {
    label: h.cluster ? 'Retarget cluster' : 'Name cluster',
    ready: clusterCheck.ok,
    disabled: !clusterCheck.ok,
    title: gateTitle(clusterCheck, 'Name the cluster'),
    fail: clusterCheck.reason,
    onClick: () => dispatch({ type: 'nameCluster', name: clusterName.trim(), policy }),
  }
  const standardVerb: Verb | null =
    run && def
      ? {
          label: `Stock the standard shelf · scores ${standardScore.toFixed(2)}`,
          ready: standard.ok,
          disabled: !standard.ok,
          title: gateTitle(standard, 'File the authored shelf and follow the flagship price. Fast is 0.85; slow is 0.72.'),
          coachId: 'planets-standard',
          fail: standard.reason,
          onClick: () => dispatch({ type: 'fileStandardPlanogram', planetId: run.id }),
        }
      : null
  const commitVerb: Verb | null =
    run && def
      ? {
          label: `Commit shelf · ${live.toFixed(2)}`,
          ready: commit.ok,
          disabled: !commit.ok,
          title: gateTitle(commit, 'Stock this shelf.'),
          coachId: 'planets-commit',
          fail: commit.reason,
          onClick: () => {
            dispatch({ type: 'setPlanogram', planetId: run.id, slots: draft })
            setEditing(false)
          },
        }
      : null

  // Goal strip copy + the tray primary. The puzzle owns the tray while a shelf is open.
  let goalTitle = 'Launch a probe'
  let goalProgress: number | null = stocked / 8
  let goalLabel = `${stocked}/8 stocked`
  let goalPayoff = `Planet layer ${layer < 10 ? `×${layer.toFixed(2)}` : `×${qty(layer)}`} on flagship sales`
  let goalEta: string | null = probeEta
  let primary: Verb = launchVerb
  const secondaries: VerbSecondary[] = []

  const climateNeed = HORIZON.climateServeNeed
  const climateDone = h.climateServed ?? 0
  const climateOpen = climateDone < climateNeed && stocked > 0

  if (showPuzzle && run && def && standardVerb && commitVerb) {
    goalTitle = filing ? `Stock ${def.name}` : `Restock ${def.name}`
    goalProgress = live
    goalLabel = `${Math.round(live * 6)}/6 tags · standard ${standardScore.toFixed(2)}`
    goalPayoff = filing
      ? `Filing adds this world to the planet layer (${goalPayoff})`
      : 'Commit a new shelf to replace the filed one.'
    goalEta = null
    // Commit when the player built a shelf; otherwise the standard is the easy way out.
    primary = commit.ok ? commitVerb : standardVerb
    const other = commit.ok ? standardVerb : commitVerb
    secondaries.push({
      key: commit.ok ? 'standard' : 'commit',
      label: commit.ok ? 'Stock the standard shelf' : 'Stock this shelf',
      fact: commit.ok ? standardScore.toFixed(2) : `${placed}/6 placed`,
      disabled: other.disabled,
      coachId: commit.ok ? undefined : commitVerb.coachId,
      title: other.title,
      onClick: other.onClick,
    })
    if (!filing) {
      secondaries.push({ key: 'cancel', label: 'Keep filed shelf', onClick: () => setEditing(false) })
    }
    if (!commit.ok && !standard.ok) primary = { ...standardVerb, fail: standard.reason ?? commit.reason }
  } else if (climateOpen) {
    goalTitle = 'Serve climate neighbors'
    goalProgress = climateDone / climateNeed
    goalLabel = `${climateDone}/${climateNeed} served`
    goalPayoff = 'Climate neighbors open the exchange door with stocked worlds'
    goalEta = h.nextClimateAt > s.time ? `next in ${clock(h.nextClimateAt - s.time)}` : null
    primary = climateVerb
    secondaries.push({ key: 'probe', label: 'Launch probe', fact: money(cost, numberFormat), disabled: !probe.ok, coachId: 'planets-launch', title: launchVerb.title, onClick: launchVerb.onClick })
  } else if (wantCluster) {
    goalTitle = 'Name the cluster'
    goalProgress = 1
    goalLabel = '4 worlds ready'
    goalPayoff = 'Volume, margin, or fresh multiplies every stocked world'
    goalEta = null
    primary = clusterVerb
    secondaries.push({ key: 'probe', label: 'Launch probe', fact: money(cost, numberFormat), disabled: !probe.ok, coachId: 'planets-launch', title: launchVerb.title, onClick: launchVerb.onClick })
  } else if (stocked > 0) {
    goalTitle = 'Stock the system'
    goalLabel = `${stocked}/8 stocked · mean ${mean > 0 ? mean.toFixed(2) : '—'}`
    primary = launchVerb
  }

  if (!showPuzzle && run?.stocked) {
    secondaries.push({
      key: 'edit',
      label: 'Clever shelf',
      fact: run.score.toFixed(2),
      title: `Reopen the shelf. Stock your own, or use the standard (scores ${standardScore.toFixed(2)}).`,
      onClick: () => setEditing(true),
    })
  }
  const unstockedOther = revealed.find((p) => !p.stocked && p.id !== run?.id)
  if (!showPuzzle && unstockedOther) {
    secondaries.push({
      key: 'next-empty',
      label: 'Next empty world',
      fact: planetDef(unstockedOther.id)?.name,
      onClick: () => choose(unstockedOther.id),
    })
  }

  // Probes are a spend (tag yellow); filing / serving / naming are the free verb.
  const tone = primary === launchVerb ? 'primary' : 'free'

  const worldOptions = [
    { value: 'all' as const, label: 'All', badge: undefined },
    { value: 'empty' as const, label: 'Empty', badge: revealed.filter((p) => !p.stocked).length || undefined },
    { value: 'stocked' as const, label: 'Stocked', badge: undefined },
  ]
  const manyWorlds = revealed.length > 8

  const room = (
    <div className="wc-room">
      {run && def ? (
        <PlanetShelf
          name={def.name}
          climate={def.climate}
          slots={shelfSlots}
          score={run.stocked ? run.score : showPuzzle ? live : undefined}
          survey={h.survey}
          reducedMotion={reducedMotion}
          onCommit={filing ? () => dispatch({ type: 'fileStandardPlanogram', planetId: run.id }) : undefined}
        />
      ) : (
        <p className="hz-note">Launch a probe to open the first shelf.</p>
      )}
      <HorizonGoalStrip
        title={goalTitle}
        progress={goalProgress}
        progressLabel={goalLabel}
        payoff={goalPayoff}
        eta={goalEta}
        ready={primary.ready}
        coachId="planets-goal"
      />
      <p
        className="wc-survey"
        data-coach-id="planets-survey"
        title={`Retarget costs ${HORIZON.clusterRetarget}${retargetEta ? ` · ${retargetEta}` : ''}`}
      >
        <span>Survey</span>
        <strong>{pocket(h.survey, numberFormat)}</strong>
        <StatusChip tone={surveyLive ? 'ready' : 'idle'}>{surveyLive ? `+${HORIZON.surveyPerSec.toFixed(2)}/s` : 'idle'}</StatusChip>
      </p>
      {guest && s.era >= 7 && stocked > 0 ? (
        <p className="wc-survey" title={`${guest.wants} Serve them from a stocked ${h.climateGuest ?? 'visiting'} world.`}>
          <span>At the door</span>
          <strong>{guest.name}</strong>
          <StatusChip tone={climateCheck.ok ? 'ready' : 'idle'}>{guest.wants}</StatusChip>
        </p>
      ) : null}
      {facingBan ? (
        <p className="wc-survey" title="Swap that facing on the Floor to dodge the ban, or wait for the shift to turn.">
          <span>Guest ban</span>
          <strong>{FACING_BY_ID[facingBan.tag]?.name ?? facingBan.tag}</strong>
          <StatusChip tone="warn">
            −{banPct}% pull · {clock(facingBan.until - s.time)}
          </StatusChip>
        </p>
      ) : null}
    </div>
  )

  return (
    <section className="ge-panel">
      <PlayFrame
        className={showPuzzle ? 'wc-planets wc-planets--puzzle' : 'wc-planets'}
        department="Planets"
        purpose={
          <span title="Fast path is four shelves at 0.85. Slow path is six at 0.72. Standard is mediocre on purpose.">
            Stock the shelf a world is asking for.
          </span>
        }
        room={room}
        tray={{
          primary: {
            label: primary.label,
            tone,
            size: 'lg',
            coachId: primary.coachId,
            disabled: primary.disabled,
            title: primary.title,
            onClick: primary.onClick,
          },
          failReason: primary.fail,
          secondaries: secondaries.slice(0, 4),
        }}
      >
        {revealed.length > 0 ? (
          <div className="wc-worlds" data-coach-id="planets-worlds">
            {manyWorlds ? (
              <div className="wc-worlds__filters">
                <SegmentedControl
                  aria-label="Filter worlds"
                  value={stockFilter}
                  onChange={(v) => setStockFilter(v)}
                  options={worldOptions}
                />
                <Select
                  aria-label="Climate"
                  value={climateFilter}
                  onChange={(v) => setClimateFilter(v as PlanetClimate | 'all')}
                  options={[
                    { value: 'all', label: 'All climates' },
                    ...CLIMATES.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>
            ) : null}
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

        {run && def ? (
          <p className="wc-wants" aria-label="What this world wants">
            <span className="wc-wants__label">Wants</span>
            {def.wanted.map((tag) => (
              <em key={tag} className={`hz-want${showPuzzle && matchedTags.has(tag) ? ' is-hit' : ''}`}>
                {tag}
              </em>
            ))}
            <strong className="wc-wants__score">
              {showPuzzle ? `${matchedSlots} of 6 tags · ${live.toFixed(2)}` : run.stocked ? `score ${run.score.toFixed(2)}` : 'empty'}
            </strong>
          </p>
        ) : null}

        {showPuzzle && run && def ? (
          <PuzzleFrame
            title={def.name}
            purpose="Place six goods. A tag the world wants counts."
            score={live}
            hideStandard
            hideCommit
          >
            <Planogram
              planet={def}
              slots={draft}
              hideWants
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

        {!showPuzzle && run && def && run.stocked ? (
          <article className="ge-card wc-card">
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
            </div>
          </article>
        ) : null}

        {!showPuzzle && stocked >= 4 ? (
          <article className="ge-card wc-card" data-coach-id="planets-cluster">
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
            <SegmentedControl
              aria-label="Cluster policy"
              value={policy}
              onChange={setPolicy}
              options={POLICIES.map((id) => ({ value: id, label: policyLabel(id) }))}
            />
            {primary !== clusterVerb ? (
              <div className="ge-chip-row">
                <Button
                  tone={clusterCheck.ok ? 'primary' : 'ghost'}
                  disabled={!clusterCheck.ok}
                  title={gateTitle(clusterCheck, 'Name the cluster')}
                  onClick={clusterVerb.onClick}
                >
                  {h.cluster ? 'Retarget' : 'Name cluster'}
                </Button>
              </div>
            ) : null}
          </article>
        ) : !showPuzzle && stocked < 4 && stocked > 0 ? (
          <p className="hz-note">Name the cluster once four worlds are stocked. {stocked} of 4.</p>
        ) : null}

        {h.endless ? (
          <p className="hz-note">
            Endless is open. {h.endlessPlanets} world{h.endlessPlanets === 1 ? '' : 's'} past the named eight.
          </p>
        ) : null}
        <EndlessBanNote />
      </PlayFrame>
    </section>
  )
}

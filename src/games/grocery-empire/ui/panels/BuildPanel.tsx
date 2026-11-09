import { useEffect, useMemo, useState } from 'react'
import { BUILD_TRACKS, buildLevel, refundFrac, type BuildFilter } from '../../content/builds'
import { ENDCAP } from '../../sim/balance'
import type { Command } from '../../sim/commands'
import { engine } from '../../sim/engine'
import { upkeepPerSec } from '../../sim/formulas'
import type { GameState } from '../../sim/state'
import { useGame, useIsSuggested } from '../GameContext'
import { money } from '../format'
import { Btn } from '../components/Btn'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import type { ExtraIcon } from '../icons/Icon'
import { Icon } from '../icons/Icon'
import { BuildBand } from '../scenes/DepartmentBands'
import { DeptDiorama } from '../scenes/DeptDiorama'

/** Convenience one-click: early builds in order, skip any that aren't affordable. */
const STARTER_CORNER: Command[] = [
  { type: 'buyBuild', id: 'storefront' },
  { type: 'buyBuild', id: 'storage' },
  { type: 'buyEndcap' },
  { type: 'buyBuild', id: 'transit' },
  { type: 'buyBuild', id: 'civic' },
  { type: 'buyBuild', id: 'cold' },
]

const BUILD_ICON: Record<BuildFilter, ExtraIcon> = {
  storefront: 'build-storefront',
  storage: 'build-storage',
  cold: 'build-cold',
  production: 'build-production',
  transit: 'build-transit',
  civic: 'build-civic',
}

function runBestEffort(cmds: Command[]) {
  for (const cmd of cmds) {
    if (engine.can(cmd).ok) engine.dispatch(cmd)
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100
const perMin = (n: number, fmt: Parameters<typeof money>[1]) =>
  n > 0 ? `${money(n, fmt)}/min` : 'free'

/** Cold-track prerequisite lines tied to the dairy / meat memos. */
function coldPrereq(s: GameState, nextIndex: number): string | null {
  const has = (id: string) => (s.memos[id] ?? 0) > 0
  if (nextIndex === 1) {
    return `Reach-in Cooler Permit ${has('reach-in') ? '✓' : '✗'} → then the Dairy Case memo ${
      has('dairy-case') ? '✓' : '(needs this cooler)'
    }`
  }
  if (nextIndex === 2) {
    return `Reach-in Cooler ${(s.builds.cold ?? 0) >= 1 ? '✓' : '✗'} · Dairy Case ${
      has('dairy-case') ? '✓' : '✗'
    } → Butcher Block memo ${has('butcher-block') ? '✓' : '(needs this walk-in)'}`
  }
  return null
}

function BuildTrackCard({
  track,
  lvl,
  next,
  current,
  prereq,
  canBuy,
  lockedEra,
  numberFormat,
  onBuy,
  onSell,
}: {
  track: (typeof BUILD_TRACKS)[number]
  lvl: number
  next: (typeof BUILD_TRACKS)[number]['tiers'][number] | undefined
  current: (typeof BUILD_TRACKS)[number]['tiers'][number] | undefined
  prereq: string | null
  canBuy: boolean
  lockedEra: boolean
  numberFormat: Parameters<typeof money>[1]
  onBuy: () => void
  onSell: () => void
}) {
  const sid = `build-${track.id}`
  const suggested = useIsSuggested(sid)
  return (
    <article
      data-suggest-id={sid}
      className={`ge-card${lvl > 0 ? ' ge-card--owned' : ''}${canBuy ? ' is-ready' : ''}${
        suggested ? ' is-suggested' : ''
      }`.trim()}
    >
      <div className="ge-card__head">
        <Icon name={BUILD_ICON[track.id]} size={20} tone="accent" />
        <div>
          <strong>{track.name}</strong>
          <p className="ge-muted">{current?.name ?? 'Empty lot'}</p>
        </div>
      </div>
      <p className="ge-card__blurb">{track.blurb}</p>
      {current?.effect || (current && current.upkeepPerMin > 0) ? (
        <div className="ge-card__meta">
          {current.effect ? (
            <div className="ge-card__meta-row">
              <span>Now</span>
              <strong>{current.effect}</strong>
            </div>
          ) : null}
          <div className="ge-card__meta-row">
            <span>Upkeep now</span>
            <strong>{perMin(current.upkeepPerMin, numberFormat)}</strong>
          </div>
        </div>
      ) : null}

      {prereq && next ? <p className="ge-muted" style={{ margin: 0, fontSize: '0.72rem' }}>{prereq}</p> : null}

      {next && !lockedEra ? (
        <>
          <div className="ge-card__meta">
            <div className="ge-card__meta-row">
              <span>Next</span>
              <strong>{next.name}</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Effect</span>
              <strong>{next.effect || '—'}</strong>
            </div>
            <div className="ge-card__meta-row">
              <span>Next upkeep</span>
              <strong>
                {perMin(next.upkeepPerMin, numberFormat)}
                {current && next.upkeepPerMin > current.upkeepPerMin
                  ? ` (+${money(next.upkeepPerMin - current.upkeepPerMin, numberFormat)})`
                  : ''}
              </strong>
            </div>
          </div>
          <div className="ge-card__actions">
            <Btn
              tone={canBuy ? 'primary' : 'ghost'}
              coachId={track.id === 'storefront' ? 'menu-build' : sid}
              disabled={!canBuy}
              title={!canBuy && next ? `Need ${money(next.cost, numberFormat)}` : undefined}
              onClick={onBuy}
            >
              <Icon name={BUILD_ICON[track.id]} size={14} />
              Build · {money(next.cost, numberFormat)}
            </Btn>
            {lvl > 0 ? (
              <Btn tone="ghost" onClick={onSell}>
                Sell
              </Btn>
            ) : (
              <span />
            )}
          </div>
        </>
      ) : next && lockedEra ? (
        <>
          <p className="ge-muted">Next chapter (era {next.era}) · {next.name}</p>
          {lvl > 0 ? (
            <div className="ge-card__actions">
              <span />
              <Btn tone="ghost" onClick={onSell}>
                Sell
              </Btn>
            </div>
          ) : null}
        </>
      ) : lvl > 0 ? (
        <div className="ge-card__actions">
          <span />
          <Btn tone="ghost" onClick={onSell}>
            Sell
          </Btn>
        </div>
      ) : null}
    </article>
  )
}

export function BuildPanel() {
  const { state: s, tick, dispatch, numberFormat, suggestions, focusNonce, focusTarget, reducedMotion } =
    useGame()
  const [filter, setFilter] = useState<BuildFilter | 'all'>('all')
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)

  const visibleTracks = useMemo(
    () =>
      BUILD_TRACKS.filter((t) => {
        try {
          return t.visible(s)
        } catch {
          return false
        }
      }),
    [tick, s],
  )

  const tracks = visibleTracks.filter((t) => filter === 'all' || t.id === filter)

  const endcapCost = Math.ceil(ENDCAP.base * Math.pow(ENDCAP.growth, s.endcaps))
  const canEndcap = s.endcaps < ENDCAP.max && s.cash >= endcapCost
  const endcapRefund =
    s.endcaps > 0
      ? round2(Math.ceil(ENDCAP.base * Math.pow(ENDCAP.growth, s.endcaps - 1)) * ENDCAP.refund)
      : 0
  const upkeepMin = upkeepPerSec(s, BUILD_TRACKS) * 60
  const starterAny = STARTER_CORNER.some((cmd) => engine.can(cmd).ok)

  const readyByTrack = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const track of visibleTracks) {
      const lvl = buildLevel(s, track.id)
      const next = track.tiers[lvl + 1]
      map.set(track.id, !!next && s.cash >= next.cost && s.era >= next.era)
    }
    return map
  }, [tick, s, visibleTracks])

  useEffect(() => {
    if (!focusTarget?.startsWith('build-')) return
    const id = focusTarget.replace(/^build-/, '') as BuildFilter
    if (visibleTracks.some((t) => t.id === id)) setFilter(id)
  }, [focusNonce, focusTarget, visibleTracks])

  return (
    <Panel
      title="Build"
      purpose="Spend cash to grow capacity — shelf, cold, seats, trucks."
      lore="build"
      scene={
        <>
          <BuildBand state={s} />
          <DeptDiorama kind="build" />
        </>
      }
    >

      <div className="ge-dept-callout">
        <div className="ge-dept-callout__copy">
          <h3>Starter Corner</h3>
          <p>
            Buys affordable early tiers in order
            {upkeepMin > 0 ? ` · shell upkeep ${money(upkeepMin, numberFormat)}/min` : ''}.
          </p>
        </div>
        <Btn tone="primary" disabled={!starterAny} onClick={() => runBestEffort(STARTER_CORNER)}>
          Build starter pack
        </Btn>
      </div>

      <div className="ge-dept-toolbar">
        <div className="ge-dept-tabs" role="tablist" aria-label="Build tracks">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            className={`ge-dept-tab${filter === 'all' ? ' is-on' : ''}`.trim()}
            onClick={() => setFilter('all')}
          >
            All
            <em>{visibleTracks.length}</em>
          </button>
          {visibleTracks.map((t) => {
            const hot = readyByTrack.get(t.id)
            const suggest = suggestions[0]?.target === `build-${t.id}`
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={filter === t.id}
                className={`ge-dept-tab${filter === t.id ? ' is-on' : ''}${hot ? ' is-hot' : ''}${
                  suggest ? ' is-suggested' : ''
                }`.trim()}
                onClick={() => setFilter(t.id)}
              >
                <Icon name={BUILD_ICON[t.id]} size={13} />
                {t.name}
              </button>
            )
          })}
        </div>
      </div>

      {tracks.length === 0 ? <p className="ge-empty">No build tracks unlocked.</p> : null}

      <div className="ge-card-grid">
        {tracks.map((track) => {
          const lvl = buildLevel(s, track.id)
          const next = track.tiers[lvl + 1]
          const current = track.tiers[lvl]
          const canBuy = !!next && s.cash >= next.cost && s.era >= next.era
          const lockedEra = !!next && s.era < next.era
          return (
            <BuildTrackCard
              key={track.id}
              track={track}
              lvl={lvl}
              next={next}
              current={current}
              prereq={track.id === 'cold' ? coldPrereq(s, lvl + 1) : null}
              canBuy={canBuy}
              lockedEra={lockedEra}
              numberFormat={numberFormat}
              onBuy={() => dispatch({ type: 'buyBuild', id: track.id })}
              onSell={() => {
                const frac = refundFrac(s)
                const refund = round2((current?.cost ?? 0) * frac)
                setConfirm({
                  title: `Sell ${current?.name ?? track.name}?`,
                  body: `Refunds exactly ${money(refund, numberFormat)} (${Math.round(frac * 100)}% of ${money(
                    current?.cost ?? 0,
                    numberFormat,
                  )}). Effects from that tier drop immediately.`,
                  detail:
                    frac < 1
                      ? 'Refunds rise to 100% from Era 3.'
                      : undefined,
                  confirmLabel: `Sell · +${money(refund, numberFormat)}`,
                  tone: 'danger',
                  onConfirm: () => dispatch({ type: 'sellBuild', id: track.id }),
                })
              }}
            />
          )
        })}
      </div>

      <section className="ge-empire-block" style={{ marginTop: '1rem' }}>
        <header className="ge-empire-block__head">
          <h3>Endcaps</h3>
          <p>Facing space that pulls demand. Soft cap {ENDCAP.max}.</p>
        </header>
        <div className="ge-dept-callout">
          <div className="ge-dept-callout__copy">
            <h3>
              Owned <strong style={{ fontFamily: 'var(--ge-font-mono)' }}>{s.endcaps}</strong>
            </h3>
            <p>Each endcap is a small permanent demand bump.</p>
          </div>
          <div className="ge-chip-row">
            <Btn
              tone={canEndcap ? 'primary' : 'ghost'}
              disabled={!canEndcap}
              title={
                !canEndcap
                  ? s.endcaps >= ENDCAP.max
                    ? `Soft cap ${ENDCAP.max}`
                    : `Need ${money(endcapCost, numberFormat)}`
                  : undefined
              }
              onClick={() => dispatch({ type: 'buyEndcap' })}
            >
              Buy · {money(endcapCost, numberFormat)}
            </Btn>
            <Btn
              tone="ghost"
              disabled={s.endcaps <= 0}
              title={s.endcaps <= 0 ? 'No endcaps owned' : undefined}
              onClick={() =>
                setConfirm({
                  title: 'Sell one endcap?',
                  body: `Refunds exactly ${money(endcapRefund, numberFormat)}. Demand pull drops by one.`,
                  confirmLabel: `Sell · +${money(endcapRefund, numberFormat)}`,
                  tone: 'danger',
                  onConfirm: () => dispatch({ type: 'sellEndcap' }),
                })
              }
            >
              Sell one
            </Btn>
          </div>
        </div>
      </section>

      <HelpCard title="Build the shell first">
        Storefront sets shelf pull and staff seats. Storage, cold, and transit change capacity and
        spoil. Era-locked tiers wait for the next chapter — upkeep is the cost of a bigger shell. The
        Shell is every track you hold added together: it sets what the store can hold, keep fresh, and
        pull in, and it bills upkeep every minute.
      </HelpCard>

      <ConfirmModal
        open={!!confirm}
        spec={confirm}
        reducedMotion={reducedMotion}
        onClose={() => setConfirm(null)}
      />
    </Panel>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { BUILD_TRACKS, buildLevel, refundFrac, type BuildFilter } from '../../content/builds'
import { ENDCAP } from '../../sim/balance'
import type { Command } from '../../sim/commands'
import { engine } from '../../sim/engine'
import { upkeepPerSec } from '../../sim/formulas'
import type { GameState } from '../../sim/state'
import { useGame, useIsSuggested } from '../GameContext'
import { money } from '../format'
import type { ExtraIcon } from '../icons/Icon'
import { Icon } from '../icons/Icon'
import { BuildSiteScene } from '../scenes/live/BuildSiteScene'
import { Button, Card, EmptyState, Meter, SegmentedControl, useConfirm, type CardState } from '../kit'
import { PlayFrame } from '../play'
import './build.css'

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
  onQueue,
  queued,
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
  onQueue?: () => void
  queued?: boolean
}) {
  const sid = `build-${track.id}`
  const suggested = useIsSuggested(sid)
  const maxTier = Math.max(1, track.tiers.length - 1)
  const state: CardState | undefined = lockedEra
    ? 'locked'
    : !next
      ? 'maxed'
      : suggested
        ? 'suggested'
        : canBuy
          ? 'affordable'
          : undefined

  return (
    <Card
      data-suggest-id={sid}
      className="bd-card"
      state={state}
      header={
        <span className="bd-title">
          <Icon name={BUILD_ICON[track.id]} size={14} /> {track.name}
          <em>
            · {lvl}/{maxTier}
          </em>
        </span>
      }
      footer={
        <div className="bd-actions">
          {next ? (
            <Button
              tone="primary"
              size="sm"
              className="bd-buy"
              feedback
              affordable={canBuy}
              cost={money(next.cost, numberFormat)}
              disabled={lockedEra}
              title={lockedEra ? `Needs Era ${next.era}` : prereq ?? undefined}
              onClick={onBuy}
            >
              Build {next.name}
            </Button>
          ) : (
            <Button tone="ghost" size="sm" disabled>
              Maxed
            </Button>
          )}
          {onQueue && next && !queued ? (
            <Button tone="ghost" size="sm" onClick={onQueue}>
              Queue
            </Button>
          ) : null}
          {lvl > 0 ? (
            <Button tone="ghost" size="sm" onClick={onSell}>
              Sell
            </Button>
          ) : null}
        </div>
      }
    >
      <p className="bd-note">{track.blurb}</p>
      {prereq ? <p className="bd-note is-warn">{prereq}</p> : null}
      {queued ? <p className="bd-note">Queued</p> : null}
      <Meter value={lvl} max={maxTier} tone="accent" label="Tier" />
    </Card>
  )
}

export function BuildPanel() {
  const { state: s, tick, dispatch, numberFormat, suggestions, focusNonce, focusTarget } = useGame()
  const confirm = useConfirm()
  const [filter, setFilter] = useState<BuildFilter>('storefront')

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

  useEffect(() => {
    if (!focusTarget?.startsWith('build-')) return
    const id = focusTarget.replace(/^build-/, '') as BuildFilter
    if (visibleTracks.some((t) => t.id === id)) setFilter(id)
  }, [focusNonce, focusTarget, visibleTracks])

  useEffect(() => {
    if (!visibleTracks.some((t) => t.id === filter) && visibleTracks[0]) {
      setFilter(visibleTracks[0].id)
    }
  }, [visibleTracks, filter])

  const track = visibleTracks.find((t) => t.id === filter) ?? visibleTracks[0]
  const endcapCost = Math.ceil(ENDCAP.base * Math.pow(ENDCAP.growth, s.endcaps))
  const canEndcap = s.endcaps < ENDCAP.max && s.cash >= endcapCost
  const endcapRefund =
    s.endcaps > 0
      ? round2(Math.ceil(ENDCAP.base * Math.pow(ENDCAP.growth, s.endcaps - 1)) * ENDCAP.refund)
      : 0
  const upkeepMin = upkeepPerSec(s, BUILD_TRACKS) * 60
  const starterAny = STARTER_CORNER.some((cmd) => engine.can(cmd).ok)
  const queuedId = s.era >= 7 ? s.horizon.buildQueue : null
  const queuedTrack = queuedId ? BUILD_TRACKS.find((t) => t.id === queuedId) : undefined
  const queuedNext = queuedTrack ? queuedTrack.tiers[buildLevel(s, queuedTrack.id) + 1] : undefined

  const lvl = track ? buildLevel(s, track.id) : 0
  const next = track?.tiers[lvl + 1]
  const current = track?.tiers[lvl]
  const canBuy = !!next && s.cash >= next.cost && s.era >= next.era
  const lockedEra = !!next && s.era < next.era
  const prereq = track?.id === 'cold' ? coldPrereq(s, lvl + 1) : null

  return (
    <section className="ge-panel bd">
      <PlayFrame
        purpose="Raise the shell: storefront, storage, cold, and civic tracks."
        department="Build"
        room={<BuildSiteScene />}
        tray={{
          primary: next
            ? {
                label: `Build ${next.name}`,
                tone: 'primary',
                feedback: true,
                affordable: canBuy,
                cost: money(next.cost, numberFormat),
                disabled: lockedEra || !canBuy,
                title: lockedEra ? `Needs Era ${next.era}` : prereq ?? undefined,
                onClick: () => track && dispatch({ type: 'buyBuild', id: track.id }),
              }
            : starterAny
              ? {
                  label: 'Starter pack',
                  tone: 'primary',
                  onClick: () => runBestEffort(STARTER_CORNER),
                }
              : {
                  label: 'Track maxed',
                  tone: 'ghost',
                  disabled: true,
                },
          failReason: lockedEra ? `Needs Era ${next?.era}` : !canBuy && next ? 'Not enough cash' : undefined,
          secondaries: [
            {
              key: 'endcap',
              label: 'Endcap',
              fact: `${s.endcaps}/${ENDCAP.max}`,
              disabled: !canEndcap,
              onClick: () => dispatch({ type: 'buyEndcap' }),
            },
            ...(starterAny
              ? [{ key: 'starter', label: 'Starter pack', onClick: () => runBestEffort(STARTER_CORNER) }]
              : []),
            ...(upkeepMin > 0
              ? [{ key: 'upkeep', label: 'Upkeep', fact: `${money(upkeepMin, numberFormat)}/min`, disabled: true, onClick: () => {} }]
              : []),
          ],
        }}
      >
        {visibleTracks.length > 0 ? (
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as BuildFilter)}
            options={visibleTracks.map((t) => ({
              value: t.id,
              label: t.name,
              badge: suggestions[0]?.target === `build-${t.id}` ? 1 : undefined,
            }))}
          />
        ) : (
          <EmptyState title="No build tracks unlocked" />
        )}

        {s.era >= 7 && queuedTrack && queuedNext ? (
          <div className="bd-timeline" title="Queued until you can pay.">
            <Meter
              value={s.cash}
              max={Math.max(1, queuedNext.cost)}
              tone={s.cash >= queuedNext.cost ? 'success' : 'accent'}
              label={`Queue · ${queuedTrack.name}`}
              eta={money(queuedNext.cost, numberFormat)}
            />
            <Button tone="ghost" size="sm" onClick={() => dispatch({ type: 'cancelQueue' })}>
              Cancel
            </Button>
          </div>
        ) : null}

        {track ? (
          <BuildTrackCard
            track={track}
            lvl={lvl}
            next={next}
            current={current}
            prereq={prereq}
            canBuy={canBuy}
            lockedEra={lockedEra}
            numberFormat={numberFormat}
            onBuy={() => dispatch({ type: 'buyBuild', id: track.id })}
            onQueue={s.era >= 7 ? () => dispatch({ type: 'queueBuild', id: track.id }) : undefined}
            queued={s.horizon.buildQueue === track.id}
            onSell={() => {
              const frac = refundFrac(s)
              const refund = round2((current?.cost ?? 0) * frac)
              void confirm({
                title: `Sell ${current?.name ?? track.name}?`,
                body: `Refunds exactly ${money(refund, numberFormat)} (${Math.round(frac * 100)}% of ${money(
                  current?.cost ?? 0,
                  numberFormat,
                )}). Effects from that tier drop immediately.`,
                confirmLabel: `Sell · +${money(refund, numberFormat)}`,
                tone: 'danger',
              }).then((ok) => {
                if (ok) dispatch({ type: 'sellBuild', id: track.id })
              })
            }}
          />
        ) : null}

        <Card
          aria-label="Endcaps"
          header={<span className="bd-title">Endcaps · {s.endcaps}</span>}
          footer={
            <div className="bd-actions">
              <Button
                tone="primary"
                size="sm"
                feedback
                affordable={canEndcap}
                cost={money(endcapCost, numberFormat)}
                disabled={s.endcaps >= ENDCAP.max}
                onClick={() => dispatch({ type: 'buyEndcap' })}
              >
                Buy endcap
              </Button>
              <Button
                tone="ghost"
                size="sm"
                disabled={s.endcaps <= 0}
                onClick={() => {
                  void confirm({
                    title: 'Sell one endcap?',
                    body: `Refunds exactly ${money(endcapRefund, numberFormat)}. Demand pull drops by one.`,
                    confirmLabel: `Sell · +${money(endcapRefund, numberFormat)}`,
                    tone: 'danger',
                  }).then((ok) => {
                    if (ok) dispatch({ type: 'sellEndcap' })
                  })
                }}
              >
                Sell one
              </Button>
            </div>
          }
        >
          <Meter value={s.endcaps} max={ENDCAP.max} tone="accent" label="Owned" eta={`${s.endcaps} / ${ENDCAP.max}`} />
        </Card>
      </PlayFrame>
    </section>
  )
}

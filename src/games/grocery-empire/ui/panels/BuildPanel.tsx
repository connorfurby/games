import { useEffect, useMemo, useState } from 'react'
import {
  BUILD_TRACKS,
  buildLevel,
  ownedVariantsForTrack,
  pendingVariantChoice,
  refundFrac,
  type BuildFilter,
} from '../../content/builds'
import { ENDCAP } from '../../sim/balance'
import type { Command } from '../../sim/commands'
import { can } from '../../sim/commands'
import { engine } from '../../sim/engine'
import { backroomCap, upkeepPerSec } from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import type { GameState } from '../../sim/state'
import { useGame, useIsSuggested } from '../GameContext'
import { money } from '../format'
import type { ExtraIcon } from '../icons/Icon'
import { Icon } from '../icons/Icon'
import { BuildSiteScene } from '../scenes/live/BuildSiteScene'
import { Button, EmptyState, Meter, SegmentedControl, Sheet, useConfirm } from '../kit'
import { ActionRow, FailReason, PlayFrame, StatusChip } from '../play'
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

export function BuildPanel() {
  const {
    state: s,
    tick,
    dispatch,
    numberFormat,
    suggestions,
    focusNonce,
    focusTarget,
    reducedMotion,
    setActiveMenu,
  } = useGame()
  const confirm = useConfirm()
  const [filter, setFilter] = useState<BuildFilter>('storefront')
  const [upkeepSheet, setUpkeepSheet] = useState(false)

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
  const upkeepSec = upkeepPerSec(s, BUILD_TRACKS)
  const upkeepMin = upkeepSec * 60
  const cashRate = s.rates?.cashPerSec ?? 0
  const upkeepWarn = upkeepSec > 0 && cashRate + 1e-9 < upkeepSec
  const storageCap = backroomCap(s)
  const storageFull = storageCap > 0 && sumQty(s.backroom) >= storageCap * 0.95
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
  const pending = track ? pendingVariantChoice(s, track.id) : null
  const owned = track ? ownedVariantsForTrack(s, track.id) : []
  const hibernateCheck = track ? can(s, { type: 'hibernateBuild', track: track.id }) : { ok: false }
  const suggestId = track ? `build-${track.id}` : 'build-storefront'
  const suggested = useIsSuggested(suggestId)
  const facingReady = !!pending?.length
  const safePending = pending?.find((v) => v.safe) ?? pending?.[0]

  return (
    <section className="ge-panel bd">
      <PlayFrame
        purpose="Raise the shell — each track is a room; facings lock tradeoffs."
        department="Build"
        room={<BuildSiteScene focusTrack={filter} />}
        tray={{
          primary: facingReady && safePending && track
            ? {
                label: `Facing · ${safePending.name}`,
                tone: 'free',
                feedback: true,
                coachId: suggested ? `build-${track.id}` : undefined,
                title: safePending.blurb,
                onClick: () =>
                  dispatch({ type: 'setBuildVariant', track: track.id, variantId: safePending.id }),
              }
            : next
              ? {
                  label: `Build ${next.name}`,
                  tone: canBuy ? 'free' : 'primary',
                  feedback: true,
                  affordable: canBuy,
                  cost: money(next.cost, numberFormat),
                  disabled: lockedEra || !canBuy,
                  coachId: suggested ? `build-${track?.id}` : undefined,
                  title: lockedEra ? `Needs Era ${next.era}` : (prereq ?? undefined),
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
          failReason: facingReady ? (
            <FailReason>Pick a facing before the next raise — Safe or Bold.</FailReason>
          ) : lockedEra ? (
            `Needs Era ${next?.era}`
          ) : !canBuy && next ? (
            'Not enough cash'
          ) : upkeepWarn ? (
            'Upkeep exceeds cash/s — see sheet'
          ) : undefined,
          secondaries: [
            {
              key: 'queue',
              label: 'Queue',
              fact: queuedTrack ? queuedTrack.name : '—',
              disabled: s.era < 7 || !track || !next,
              onClick: () => track && dispatch({ type: 'queueBuild', id: track.id }),
            },
            {
              key: 'sell',
              label: 'Sell last',
              disabled: !track || lvl <= (track.id === 'storefront' || track.id === 'storage' ? 1 : 0),
              onClick: () => {
                if (!track || !current) return
                const frac = refundFrac(s)
                const refund = round2((current.cost ?? 0) * frac)
                void confirm({
                  title: `Sell ${current.name}?`,
                  body: `Refunds ${money(refund, numberFormat)}. Effects from that tier drop.`,
                  confirmLabel: `Sell · +${money(refund, numberFormat)}`,
                  tone: 'danger',
                }).then((ok) => {
                  if (ok) dispatch({ type: 'sellBuild', id: track.id })
                })
              },
            },
            {
              key: 'upkeep',
              label: 'Upkeep',
              fact: `${money(upkeepMin, numberFormat)}/min`,
              onClick: () => setUpkeepSheet(true),
            },
            ...(hibernateCheck.ok
              ? [
                  {
                    key: 'hibernate',
                    label: 'Hibernate',
                    fact: 'partial',
                    onClick: () => {
                      if (!track) return
                      void confirm({
                        title: `Hibernate ${current?.name}?`,
                        body: 'Partial refund. Its effects stop until you build the tier again.',
                        confirmLabel: 'Hibernate',
                        tone: 'danger',
                      }).then((ok) => {
                        if (ok) dispatch({ type: 'hibernateBuild', track: track.id })
                      })
                    },
                  },
                ]
              : []),
          ],
        }}
      >
        {upkeepWarn ? (
          <StatusChip tone="warn">
            <button type="button" className="pf-chip__link" onClick={() => setUpkeepSheet(true)}>
              Cash/s below upkeep — open Books or trim a tier
            </button>
          </StatusChip>
        ) : (
          <StatusChip tone="ready" title="Building upkeep">
            Upkeep {money(upkeepMin, numberFormat)}/min
          </StatusChip>
        )}
        {storageFull && filter === 'storage' && s.menus.suppliers ? (
          <StatusChip tone="warn" title="Backroom nearly full">
            <button type="button" className="pf-chip__link" onClick={() => setActiveMenu('suppliers')}>
              Storage full — open Suppliers
            </button>
          </StatusChip>
        ) : null}

        {visibleTracks.length > 0 ? (
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as BuildFilter)}
            options={visibleTracks.map((t) => ({
              value: t.id,
              label: t.name,
              badge: suggestions[0]?.target === `build-${t.id}` || pendingVariantChoice(s, t.id) ? 1 : undefined,
            }))}
          />
        ) : (
          <EmptyState title="No build tracks unlocked" />
        )}

        {track ? (
          <div className="p6-stack">
            <ActionRow
              icon={<Icon name={BUILD_ICON[track.id]} size={16} />}
              label={current?.name ?? track.name}
              fact={`${lvl}/${Math.max(1, track.tiers.length - 1)}`}
              trail={track.blurb}
              disabled
            />
            {prereq ? <p className="bd-note is-warn">{prereq}</p> : null}

            {facingReady && pending ? (
              <div className="bd-facing" aria-label="Facing choice">
                <p className="bd-facing__title">Facing · choose one</p>
                <div className="bd-facing__grid">
                  {pending.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`bd-facing__card${v.safe ? ' is-safe' : ' is-bold'}`}
                      onClick={() => dispatch({ type: 'setBuildVariant', track: track.id, variantId: v.id })}
                    >
                      <span className="bd-facing__name">{v.name}</span>
                      <span className="bd-facing__tag">{v.safe ? 'Safe' : 'Bold'}</span>
                      <span className="bd-facing__blurb">{v.blurb}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {owned.length ? (
              <div className="p6-stack" aria-label="Owned facings">
                {owned.map((v) => (
                  <ActionRow
                    key={v.id}
                    label={`Facing · ${v.name}`}
                    fact={v.safe ? 'Safe' : 'Bold'}
                    trail={v.blurb}
                    disabled
                  />
                ))}
              </div>
            ) : null}

            {s.era >= 7 && queuedTrack && queuedNext ? (
              <Meter
                value={s.cash}
                max={Math.max(1, queuedNext.cost)}
                tone={s.cash >= queuedNext.cost ? 'success' : 'accent'}
                label={`Queue · ${queuedTrack.name}`}
                eta={money(queuedNext.cost, numberFormat)}
              />
            ) : null}
            <ActionRow
              label={`Endcaps · ${s.endcaps}/${ENDCAP.max}`}
              fact={money(endcapCost, numberFormat)}
              trail={canEndcap ? 'Buy' : undefined}
              disabled={!canEndcap}
              onClick={() => dispatch({ type: 'buyEndcap' })}
            />
          </div>
        ) : null}
      </PlayFrame>

      <Sheet
        open={upkeepSheet}
        onClose={() => setUpkeepSheet(false)}
        title="Upkeep"
        reducedMotion={reducedMotion}
        footer={
          <Button tone="ghost" onClick={() => setUpkeepSheet(false)}>
            Done
          </Button>
        }
      >
        <p className="ge-muted">
          Buildings drain {money(upkeepMin, numberFormat)}/min
          {upkeepWarn ? ' — more than cash/s right now.' : '.'}
        </p>
        <div className="p6-stack">
          {BUILD_TRACKS.map((t) => {
            const lv = buildLevel(s, t.id)
            const u = t.tiers[lv]?.upkeepPerMin ?? 0
            if (u <= 0) return null
            return (
              <ActionRow
                key={t.id}
                label={t.name}
                fact={`${money(u, numberFormat)}/min`}
                trail={t.tiers[lv]?.name}
                disabled
              />
            )
          })}
        </div>
        <Button tone="ghost" onClick={() => { setUpkeepSheet(false); setActiveMenu('books') }}>
          Open Books
        </Button>
      </Sheet>
    </section>
  )
}

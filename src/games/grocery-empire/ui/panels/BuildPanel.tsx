import { MENUS } from '../../content/menus'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BUILD_TRACKS,
  buildLevel,
  ownedVariantsForTrack,
  pendingVariantChoice,
  refundFrac,
  type BuildFilter,
  type BuildTrack,
} from '../../content/builds'
import { ENDCAP } from '../../sim/balance'
import { can } from '../../sim/commands'
import { upkeepPerSec } from '../../sim/formulas'
import type { GameState } from '../../sim/state'
import { useGame } from '../GameContext'
import { money } from '../format'
import type { ExtraIcon } from '../icons/Icon'
import { Icon } from '../icons/Icon'
import { BuildStreetScene } from '../scenes/live/BuildStreetScene'
import { Button, useConfirm } from '../kit'
import { PlayFrame } from '../play'
import './build.css'

const BUILD_ICON: Record<BuildFilter, ExtraIcon> = {
  storefront: 'build-storefront',
  storage: 'build-storage',
  cold: 'build-cold',
  production: 'build-production',
  transit: 'build-transit',
  civic: 'build-civic',
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Cold-track prerequisites (the dairy / meat memos), in one plain line. */
function coldPrereq(s: GameState, nextIndex: number): string | null {
  const has = (id: string) => (s.memos[id] ?? 0) > 0
  if (nextIndex === 1 && !has('reach-in')) return 'Needs the Reach-in Cooler Permit memo.'
  if (nextIndex === 2 && !has('dairy-case')) return 'Needs the Dairy Case memo first.'
  return null
}

/**
 * Build: your lot as a picture (tap a building to jump to it) and one card per building.
 * Each card says what it is, what it does now, what the next level does and costs, and has
 * the one button that builds it. Selling and closing live behind "More" on each card.
 */
export function BuildPanel() {
  const { state: s, tick, dispatch, numberFormat, focusNonce, focusTarget } = useGame()
  const confirm = useConfirm()
  const [selected, setSelected] = useState<BuildFilter>('storefront')
  const cards = useRef<Partial<Record<BuildFilter, HTMLElement | null>>>({})

  const tracks = useMemo(
    () =>
      BUILD_TRACKS.filter((t) => {
        try {
          return t.visible(s)
        } catch {
          return false
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  )

  const pick = (id: BuildFilter) => {
    setSelected(id)
    cards.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  useEffect(() => {
    if (!focusTarget?.startsWith('build-')) return
    const id = focusTarget.replace(/^build-/, '') as BuildFilter
    if (tracks.some((t) => t.id === id)) pick(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce, focusTarget])

  const upkeepMin = upkeepPerSec(s, BUILD_TRACKS) * 60
  const earnMin = Math.max(0, (s.rates?.cashPerSec ?? 0) * 60)
  const upkeepWarn = upkeepMin > 0 && earnMin + 1e-9 < upkeepMin
  const endcapCost = Math.ceil(ENDCAP.base * Math.pow(ENDCAP.growth, s.endcaps))

  // The tray's one verb: a waiting style choice first, else the cheapest next level you can afford,
  // else the cheapest next level at all (shown with its price).
  const pendingTrack = tracks.find((t) => pendingVariantChoice(s, t.id)?.length)
  const nextOf = (t: BuildTrack) => t.tiers[buildLevel(s, t.id) + 1]
  const buildable = tracks
    .map((t) => ({ t, next: nextOf(t) }))
    .filter((x): x is { t: BuildTrack; next: NonNullable<ReturnType<typeof nextOf>> } => !!x.next && s.era >= x.next.era)
    .sort((a, b) => a.next.cost - b.next.cost)
  const best = buildable.find((x) => can(s, { type: 'buyBuild', id: x.t.id }).ok) ?? buildable[0]

  const tray = pendingTrack
    ? (() => {
        const opts = pendingVariantChoice(s, pendingTrack.id) ?? []
        const safe = opts.find((v) => v.safe) ?? opts[0]!
        return {
          primary: {
            label: `Pick a style for ${pendingTrack.name}`,
            tone: 'free' as const,
            onClick: () => pick(pendingTrack.id),
          },
          hint: `Or take ${safe.name}, the safe one, from its card.`,
        }
      })()
    : best
      ? {
          primary: {
            label: `Build ${best.next.name}`,
            tone: 'free' as const,
            feedback: true,
            cost: money(best.next.cost, numberFormat),
            affordable: can(s, { type: 'buyBuild', id: best.t.id }).ok,
            onClick: () => {
              setSelected(best.t.id)
              dispatch({ type: 'buyBuild', id: best.t.id })
            },
          },
          hint: `${best.t.name}: ${best.next.effect}`,
        }
      : null

  return (
    <section className="ge-panel bd">
      <PlayFrame
        purpose={MENUS.build.purpose}
        department="Build"
        room={<BuildStreetScene selected={selected} onPick={pick} />}
        tray={tray ?? undefined}
      >
        <div className={`bd-upkeep${upkeepWarn ? ' is-warn' : ''}`} title="What your buildings cost to keep open, against what the store earns.">
          <span className="bd-upkeep__k">Upkeep</span>
          <strong>{upkeepMin > 0 ? `${money(upkeepMin, numberFormat)}/min` : 'Nothing yet'}</strong>
          <span className="bd-upkeep__bar" aria-hidden>
            <i style={{ width: `${earnMin > 0 ? Math.min(100, (upkeepMin / earnMin) * 100) : upkeepMin > 0 ? 100 : 0}%` }} />
          </span>
          <span className="bd-upkeep__k">
            {upkeepWarn ? 'More than you earn' : `of ${money(earnMin, numberFormat)}/min earned`}
          </span>
        </div>

        <div className="bd-grid">
          {tracks.map((t) => (
            <BuildCard
              key={t.id}
              track={t}
              selected={selected === t.id}
              setRef={(el) => {
                cards.current[t.id] = el
              }}
              onSelect={() => setSelected(t.id)}
              onSell={() => {
                const cur = t.tiers[buildLevel(s, t.id)]
                if (!cur) return
                const refund = round2((cur.cost ?? 0) * refundFrac(s))
                void confirm({
                  title: `Sell ${cur.name}?`,
                  body: `Refunds ${money(refund, numberFormat)}. You lose what that level did.`,
                  confirmLabel: `Sell · +${money(refund, numberFormat)}`,
                  tone: 'danger',
                }).then((ok) => {
                  if (ok) dispatch({ type: 'sellBuild', id: t.id })
                })
              }}
              onClose={() => {
                const cur = t.tiers[buildLevel(s, t.id)]
                void confirm({
                  title: `Close ${cur?.name ?? t.name} for now?`,
                  body: 'You get part of the cost back. It stops working until you build that level again.',
                  confirmLabel: 'Close it',
                  tone: 'danger',
                }).then((ok) => {
                  if (ok) dispatch({ type: 'hibernateBuild', track: t.id })
                })
              }}
            />
          ))}

          <article className="bd-card bd-card--endcap">
            <header className="bd-card__head">
              <span className="bd-card__icon" aria-hidden>
                <Icon name="floor" size={18} />
              </span>
              <span className="bd-card__name">Endcaps</span>
              <Pips have={s.endcaps} of={ENDCAP.max} />
            </header>
            <p className="bd-card__now">Display shelves at the end of an aisle: more of what's on them sells.</p>
            {s.endcaps < ENDCAP.max ? (
              s.cash >= endcapCost ? (
                <Button tone="secondary" size="sm" cost={money(endcapCost, numberFormat)} onClick={() => dispatch({ type: 'buyEndcap' })}>
                  Add an endcap
                </Button>
              ) : (
                <p className="bd-card__need">Next endcap {money(endcapCost, numberFormat)}.</p>
              )
            ) : (
              <p className="bd-card__need">All endcaps placed.</p>
            )}
          </article>
        </div>
      </PlayFrame>
    </section>
  )
}

function Pips({ have, of }: { have: number; of: number }) {
  const n = Math.max(1, Math.min(12, of))
  return (
    <span className="bd-pips" aria-label={`${have} of ${of}`}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={i < have ? 'is-on' : ''} />
      ))}
    </span>
  )
}

function BuildCard({
  track: t,
  selected,
  setRef,
  onSelect,
  onSell,
  onClose,
}: {
  track: BuildTrack
  selected: boolean
  setRef: (el: HTMLElement | null) => void
  onSelect: () => void
  onSell: () => void
  onClose: () => void
}) {
  const { state: s, dispatch, numberFormat } = useGame()
  const lvl = buildLevel(s, t.id)
  const base = t.id === 'storefront' || t.id === 'storage' ? 1 : 0
  const cur = t.tiers[lvl]
  const next = t.tiers[lvl + 1]
  const buy = can(s, { type: 'buyBuild', id: t.id })
  const pending = pendingVariantChoice(s, t.id)
  const owned = ownedVariantsForTrack(s, t.id)
  const prereq = t.id === 'cold' ? coldPrereq(s, lvl + 1) : null
  const queued = s.era >= 7 && s.horizon?.buildQueue === t.id
  const canQueue = s.era >= 7 && !!next && !queued
  const canSell = lvl > base
  const canClose = can(s, { type: 'hibernateBuild', track: t.id }).ok
  const levels = t.tiers.length - 1
  const shown = lvl - (base === 1 ? 0 : 0)

  return (
    <article
      ref={setRef}
      className={`bd-card${selected ? ' is-sel' : ''}${pending?.length ? ' is-choice' : ''}`}
      onPointerDown={onSelect}
      data-coach-id={`build-${t.id}`}
    >
      <header className="bd-card__head">
        <span className="bd-card__icon" aria-hidden>
          <Icon name={BUILD_ICON[t.id]} size={18} />
        </span>
        <span className="bd-card__name">{t.name}</span>
        <Pips have={shown} of={levels} />
      </header>

      <div className="bd-card__now">
        <strong>{lvl > 0 && cur && cur.name !== 'None' && cur.name !== 'Empty' ? cur.name : 'Nothing built yet'}</strong>
        <span>{cur?.effect || t.blurb}</span>
        {(cur?.upkeepPerMin ?? 0) > 0 ? <em>Upkeep {money(cur!.upkeepPerMin, numberFormat)}/min</em> : null}
      </div>

      {pending?.length ? (
        <div className="bd-card__choice">
          <span className="bd-card__k">Pick a style</span>
          <div className="bd-card__opts">
            {pending.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`bd-opt${v.safe ? ' is-safe' : ' is-bold'}`}
                onClick={() => dispatch({ type: 'setBuildVariant', track: t.id, variantId: v.id })}
              >
                <strong>{v.name}</strong>
                <span className="bd-opt__tag">{v.safe ? 'Safe' : 'Bold'}</span>
                <span>{v.blurb}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {owned.length ? (
        <p className="bd-card__styles">
          Style: {owned.map((v) => v.name).join(' · ')}
        </p>
      ) : null}

      {next ? (
        <div className="bd-card__next">
          <span className="bd-card__k">Next</span>
          <strong>{next.name}</strong>
          <span>{next.effect}</span>
          {s.era < next.era ? (
            <p className="bd-card__need">Opens in a later era.</p>
          ) : prereq ? (
            <p className="bd-card__need">{prereq}</p>
          ) : buy.ok ? (
            <Button tone="primary" size="sm" feedback cost={money(next.cost, numberFormat)} onClick={() => dispatch({ type: 'buyBuild', id: t.id })}>
              Build {next.name}
            </Button>
          ) : (
            <p className="bd-card__need">
              {money(next.cost, numberFormat)}
              {next.upkeepPerMin > 0 ? ` · then ${money(next.upkeepPerMin, numberFormat)}/min upkeep` : ''}
            </p>
          )}
        </div>
      ) : (
        <p className="bd-card__need">Top level built.</p>
      )}

      {canQueue || queued || canSell || canClose ? (
        <details className="bd-card__more">
          <summary>More</summary>
          <div className="bd-card__more-acts">
            {queued ? (
              <span className="bd-card__need">Queued: builds itself when cash allows.</span>
            ) : canQueue ? (
              <Button tone="ghost" size="sm" onClick={() => dispatch({ type: 'queueBuild', id: t.id })}>
                Queue it
              </Button>
            ) : null}
            {canClose ? (
              <Button tone="ghost" size="sm" onClick={onClose}>
                Close for now
              </Button>
            ) : null}
            {canSell ? (
              <Button tone="danger" size="sm" onClick={onSell}>
                Sell top level
              </Button>
            ) : null}
          </div>
        </details>
      ) : null}
    </article>
  )
}

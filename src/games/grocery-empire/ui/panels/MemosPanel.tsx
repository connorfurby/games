import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { NumberFormat } from '@/shared/bn'
import { playMemoFx } from '@/shared/audio'
import { useMeta } from '@/shell/MetaContext'
import {
  FORK_IDS,
  FORK_IDS_OWNED,
  FORK_LABELS,
  FORK_PAIR,
  MEMO_BY_ID,
  MEMOS,
  STANDING_ORDER_MEMOS,
  type MemoDef,
} from '../../content/memos'
import { engine } from '../../sim/engine'
import { COMPUTE } from '../../sim/balance'
import { can } from '../../sim/commands'
import { attentionCap, attentionPerSec } from '../../sim/formulas'
import { SPINE_MEMOS } from '../../sim/suggestions'
import { officeRebalanceCost } from '../../sim/systems/office'
import { useGame, useIsSuggested } from '../GameContext'
import { money, qty } from '../format'
import { Btn } from '../components/Btn'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HelpCard } from '../components/HelpCard'
import { Meter } from '../components/Meter'
import { Section } from '../components/Section'
import { Icon } from '../icons/Icon'

function costLabel(def: MemoDef, s: Parameters<MemoDef['cost']>[0], fmt: NumberFormat) {
  let c: { cash?: number; attention?: number; ideas?: number } = {}
  try {
    c = def.cost(s)
  } catch {
    return '—'
  }
  const parts: string[] = []
  if (c.cash) parts.push(money(c.cash, fmt))
  if (c.attention) parts.push(`${qty(c.attention)} Att`)
  if (c.ideas) parts.push(`${qty(c.ideas)} Ide`)
  return parts.join(' · ') || 'Free'
}

function memoCosts(def: MemoDef, s: Parameters<MemoDef['cost']>[0]) {
  try {
    const c = def.cost(s)
    return {
      cash: c.cash ?? 0,
      attention: c.attention ?? 0,
      ideas: c.ideas ?? 0,
    }
  } catch {
    return { cash: 0, attention: 0, ideas: 0 }
  }
}

function canAfford(def: MemoDef, s: Parameters<MemoDef['cost']>[0]) {
  try {
    const c = memoCosts(def, s)
    if (c.cash > s.cash) return false
    if (c.attention > s.compute.attention) return false
    if (c.ideas > s.compute.ideas) return false
    if (def.blocked?.(s)) return false
    return true
  } catch {
    return false
  }
}

/** Attention cost fits current Archives cap (fillable without buying more Archives). */
function attWithinCap(def: MemoDef, s: Parameters<MemoDef['cost']>[0]) {
  return memoCosts(def, s).attention <= attentionCap(s) + 1e-9
}

function memoBlockReason(def: MemoDef, s: Parameters<MemoDef['cost']>[0]) {
  try {
    return def.blocked?.(s) ?? null
  } catch {
    return null
  }
}

/**
 * Sort key for “how cheap” — cash + Attention + Ideas.
 * Att/Ideas are scaled so a 1k Att memo ranks near a mid cash spend, not as free.
 */
function cheapScore(def: MemoDef, s: Parameters<MemoDef['cost']>[0]) {
  const c = memoCosts(def, s)
  return c.cash + c.attention * 0.05 + c.ideas * 2
}

const MEMO_INDEX = new Map(MEMOS.map((m, i) => [m.id, i]))

type GS = Parameters<MemoDef['cost']>[0]

const owned = (s: GS, id: string) => (s.memos[id] ?? 0) > 0

/**
 * Archives-first advice: another Analyst only fills Attention faster, so it overflows when
 * the cabinet is near full or a visible memo already costs more than the cap.
 */
function archivesFirstWarn(s: GS): string | null {
  if (!s.compute.unlocked) return null
  const cap = attentionCap(s)
  const att = s.compute.attention
  const perSec = attentionPerSec(s)
  const fill = cap > 0 ? att / cap : 1
  const secToCap = perSec > 0 ? Math.max(0, cap - att) / perSec : Number.POSITIVE_INFINITY
  if (fill >= 0.8 || secToCap < 45) {
    return `Att ${qty(att)} / ${qty(cap)} (${Math.round(fill * 100)}%) — a faster Analyst mostly overflows. Open an Archive first.`
  }
  for (const m of MEMOS) {
    if (owned(s, m.id) && !m.repeatable) continue
    if (!s.memoSeen?.[m.id]) {
      try {
        if (!m.visible(s)) continue
      } catch {
        continue
      }
    }
    const need = memoCosts(m, s).attention
    if (need > cap + 1e-9) {
      return `${m.name} needs ${qty(need)} Att but the cap is ${qty(cap)} — Archive first, Analysts second.`
    }
  }
  return null
}

/** Spine path: the memos that carry the story, in order. */
function SpinePath({ s, fmt }: { s: GS; fmt: NumberFormat }) {
  const steps = SPINE_MEMOS.map((id) => MEMO_BY_ID[id]).filter((m): m is MemoDef => !!m)
  if (steps.length === 0) return null
  const done = steps.filter((m) => owned(s, m.id)).length
  const next = steps.find((m) => !owned(s, m.id))
  return (
    <div className="ge-spine" data-coach-id="memo-spine">
      <div className="ge-spine__dots" role="list" aria-label="Spine memos">
        {steps.map((m) => {
          const got = owned(s, m.id)
          const isNext = next?.id === m.id
          return (
            <span
              key={m.id}
              role="listitem"
              title={`${m.name}${got ? ' · filed' : ''}`}
              style={{
                display: 'inline-block',
                width: 9,
                height: 9,
                borderRadius: '50%',
                marginRight: 3,
                background: got ? 'var(--ge-accent, #e09f3e)' : 'transparent',
                border: `1px solid var(--ge-accent, #e09f3e)`,
                opacity: got || isNext ? 1 : 0.4,
                outline: isNext ? '2px solid var(--ge-accent, #e09f3e)' : undefined,
                outlineOffset: 1,
              }}
            />
          )
        })}
      </div>
      <p className="ge-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.72rem' }}>
        Spine {done}/{steps.length}
        {next ? ` · next: ${next.name} (${costLabel(next, s, fmt)})` : ' · complete'}
      </p>
    </div>
  )
}

/** Produce → reach-in → dairy → walk-in → meat dependency strip. */
function ColdChainGraph({ s }: { s: GS }) {
  if (s.era < 1) return null
  const cold = s.builds.cold ?? 0
  const nodes = [
    { id: 'produce', label: 'Produce', done: !!s.categories.produce, how: 'Produce Crates memo' },
    { id: 'reach-in', label: 'Reach-in', done: cold >= 1, how: 'Cooler Permit memo, then Build → Cold' },
    { id: 'dairy', label: 'Dairy', done: !!s.categories.dairy, how: 'Dairy Case memo' },
    { id: 'walk-in', label: 'Walk-in', done: cold >= 2, how: 'Build → Cold tier 2' },
    { id: 'meat', label: 'Meat', done: !!s.categories.meat, how: 'Butcher Block memo (needs Att)' },
  ]
  const next = nodes.find((n) => !n.done)
  return (
    <p className="ge-muted ge-coldgraph" style={{ margin: '0.4rem 0', fontSize: '0.72rem' }}>
      {nodes.map((n, i) => (
        <span key={n.id}>
          {i > 0 ? ' → ' : ''}
          <span
            style={{
              fontWeight: n.done || n === next ? 700 : 400,
              opacity: n.done ? 1 : n === next ? 0.95 : 0.5,
              textDecoration: n.done ? 'none' : undefined,
            }}
          >
            {n.done ? '✓ ' : ''}
            {n.label}
          </span>
        </span>
      ))}
      {next ? ` · next: ${next.how}` : ' · cold chain complete'}
    </p>
  )
}

function FiledList({ s }: { s: GS }) {
  const filed = MEMOS.filter((m) => !m.repeatable && owned(s, m.id)).sort(
    (a, b) => (MEMO_INDEX.get(a.id) ?? 0) - (MEMO_INDEX.get(b.id) ?? 0),
  )
  if (filed.length === 0) return <p className="ge-empty">Nothing filed yet.</p>
  return (
    <ul className="ge-memo-list ge-memo-list--filed">
      {filed.map((m) => (
        <li key={m.id} className="ge-memo" data-memo-id={m.id}>
          <div className="ge-memo__top">
            <span className="ge-memo__icon" aria-hidden>
              <Icon name="memo" size={14} tone="accent" />
            </span>
            <strong>{m.name}</strong>
          </div>
          <span className="ge-memo__effect" title={m.effect}>
            {m.effect}
          </span>
          <p className="ge-muted" style={{ margin: '0.2rem 0 0', fontSize: '0.7rem' }}>
            {m.done}
          </p>
        </li>
      ))}
    </ul>
  )
}

function OfficeSuggestBtn({
  id,
  label,
  disabled,
  title,
  onClick,
}: {
  id: string
  label: string
  disabled: boolean
  title: string
  onClick: () => void
}) {
  const suggested = useIsSuggested(id)
  return (
    <span
      data-suggest-id={id}
      className={`ge-office__suggest-btn${suggested ? ' is-suggested' : ''}`.trim()}
    >
      <Btn coachId={id} disabled={disabled} title={title} onClick={onClick}>
        {label}
      </Btn>
    </span>
  )
}

function MemoRow({
  m,
  s,
  numberFormat,
  fresh,
  muted,
  reducedMotion,
  onBuy,
  onFav,
}: {
  m: MemoDef
  s: Parameters<MemoDef['cost']>[0]
  numberFormat: NumberFormat
  fresh: boolean
  muted: boolean
  reducedMotion: boolean
  onBuy: () => void
  onFav: () => void
}) {
  const sid = `memo-${m.id}`
  const suggested = useIsSuggested(sid)
  const check = engine.can({ type: 'buyMemo', id: m.id })
  const affordable = check.ok
  const costs = memoCosts(m, s)
  const attCap = attentionCap(s)
  let gate = memoBlockReason(m, s) ?? (!affordable ? check.reason ?? null : null)
  if (
    !affordable &&
    costs.attention > 0 &&
    (s.compute.attention < costs.attention || costs.attention > attCap)
  ) {
    gate = `Att cap ${qty(attCap)} · memo needs ${qty(costs.attention)}${
      s.compute.attention < costs.attention
        ? ` · have ${qty(s.compute.attention)}`
        : ' · buy Archives'
    }`
  }
  const fav = !!s.memoFavorites?.[m.id]
  const cost = costLabel(m, s, numberFormat)
  return (
    <li
      data-memo-id={m.id}
      data-suggest-id={sid}
      tabIndex={0}
      className={`ge-memo${affordable ? ' ge-memo--ready' : ''}${fresh ? ' ge-memo--fresh' : ''}${
        fav ? ' ge-memo--fav' : ''
      }${suggested ? ' is-suggested' : ''}`.trim()}
    >
      <div className="ge-memo__top">
        <span className="ge-memo__icon" aria-hidden>
          <Icon name="memo" size={14} tone="accent" />
        </span>
        <strong>{m.name}</strong>
        {fresh ? <span className="ge-memo__new">New</span> : null}
        <button
          type="button"
          className={`ge-memo__star${fav ? ' is-on' : ''}`.trim()}
          aria-label={fav ? 'Unfavorite' : 'Favorite'}
          onClick={onFav}
        >
          {fav ? '★' : '☆'}
        </button>
      </div>
      <p className="ge-memo__voice">{m.voice}</p>
      <span className="ge-memo__effect" title={m.effect}>
        {m.effect}
      </span>
      <Btn
        tone={affordable ? 'primary' : 'ghost'}
        coachId={sid}
        disabled={!affordable}
        title={gate ?? cost}
        onClick={(e) => {
          playMemoFx(muted)
          const row = (e.currentTarget as HTMLElement).closest('.ge-memo')
          if (row && !reducedMotion) {
            row.classList.add('ge-memo--stamped')
            window.setTimeout(() => row.classList.remove('ge-memo--stamped'), 480)
          }
          onBuy()
        }}
      >
        {affordable ? cost : gate ?? cost}
      </Btn>
    </li>
  )
}

function OfficeRebalance({ ask }: { ask: (spec: ConfirmSpec) => void }) {
  const { state: s, tick, dispatch, numberFormat } = useGame()
  const cost = useMemo(() => officeRebalanceCost(s), [tick, s])
  const toArchive = useMemo(() => can(s, { type: 'rebalanceOffice', toward: 'archive' }), [tick, s])
  const toAnalyst = useMemo(() => can(s, { type: 'rebalanceOffice', toward: 'analyst' }), [tick, s])
  const costLabel = money(cost, numberFormat)
  const step = qty(COMPUTE.capPerArchive)

  return (
    <div className="ge-office__rebalance">
      <span className="ge-office__rebalance-label">Rebalance · {costLabel}</span>
      <div className="ge-office__rebalance-row">
        <Btn
          tone="ghost"
          disabled={!toArchive.ok}
          title={toArchive.reason ?? `Pay cash · move 1 Analyst → Archive (cap +${step})`}
          onClick={() =>
            ask({
              title: 'Move Analyst → Archive',
              body: `Pay ${costLabel} to convert one Analyst into an Archive.`,
              detail: `Attention cap +${step}. Keep at least one Analyst.`,
              confirmLabel: `Pay ${costLabel}`,
              onConfirm: () => dispatch({ type: 'rebalanceOffice', toward: 'archive' }),
            })
          }
        >
          → Archive
        </Btn>
        <Btn
          tone="ghost"
          disabled={!toAnalyst.ok}
          title={toAnalyst.reason ?? `Pay cash · move 1 Archive → Analyst (cap −${step})`}
          onClick={() =>
            ask({
              title: 'Move Archive → Analyst',
              body: `Pay ${costLabel} to convert one Archive into an Analyst.`,
              detail: `Attention cap −${step}. Keep at least one Archive.`,
              confirmLabel: `Pay ${costLabel}`,
              onConfirm: () => dispatch({ type: 'rebalanceOffice', toward: 'analyst' }),
            })
          }
        >
          → Analyst
        </Btn>
      </div>
    </div>
  )
}

export function MemosPanel({ compact }: { compact?: boolean }) {
  const { state: s, tick, dispatch, numberFormat, reducedMotion } = useGame()
  const { meta } = useMeta()
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const [affordableOnly, setAffordableOnly] = useState(false)
  const [tab, setTab] = useState<'desk' | 'filed' | 'standing'>('desk')
  const sortReady = true
  const listRef = useRef<HTMLUListElement>(null)
  const scrollRef = useRef<HTMLElement | null>(null)
  const scrollTopRef = useRef(0)
  const knownIdsRef = useRef<Set<string>>(new Set())
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set())

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const rows = MEMOS.filter((m) => {
      if (m.standing) return false
      if (m.fork) return false
      const owned = s.memos[m.id] ?? 0
      if (owned > 0 && !m.repeatable) return false
      if (m.max != null && owned >= m.max) return false
      if (s.memoSeen?.[m.id]) return true
      try {
        return m.visible(s)
      } catch {
        return false
      }
    }).filter((m) => {
      if (affordableOnly && !canAfford(m, s)) return false
      if (!needle) return true
      return `${m.name} ${m.voice} ${m.effect}`.toLowerCase().includes(needle)
    })

    // Ready → Att in cap (unblocked) → blocked gate → Att over cap. Then blended cheap.
    return [...rows].sort((a, b) => {
      const fa = s.memoFavorites?.[a.id] ? 1 : 0
      const fb = s.memoFavorites?.[b.id] ? 1 : 0
      if (fa !== fb) return fb - fa
      const ra = canAfford(a, s) ? 1 : 0
      const rb = canAfford(b, s) ? 1 : 0
      if (ra !== rb) return rb - ra
      const ba = memoBlockReason(a, s) ? 0 : 1
      const bb = memoBlockReason(b, s) ? 0 : 1
      if (ba !== bb) return bb - ba
      const wa = attWithinCap(a, s) ? 1 : 0
      const wb = attWithinCap(b, s) ? 1 : 0
      if (wa !== wb) return wb - wa
      if (sortReady) {
        const ca = cheapScore(a, s)
        const cb = cheapScore(b, s)
        if (ca !== cb) return ca - cb
      }
      return (MEMO_INDEX.get(a.id) ?? 0) - (MEMO_INDEX.get(b.id) ?? 0)
    })
    // `tick` — GameState is mutated in place; `s` identity never changes.
  }, [tick, s, q, affordableOnly, sortReady])

  const readyCount = useMemo(
    () => visible.reduce((n, m) => n + (canAfford(m, s) ? 1 : 0), 0),
    [visible, tick, s],
  )

  // Track newly unlocked memos for a quiet flash — never auto-scroll.
  useLayoutEffect(() => {
    const next = new Set(visible.map((m) => m.id))
    const known = knownIdsRef.current
    if (known.size === 0) {
      knownIdsRef.current = next
      return
    }
    const arrived: string[] = []
    for (const id of next) {
      if (!known.has(id)) arrived.push(id)
    }
    knownIdsRef.current = next
    if (!arrived.length) return
    setFreshIds((prev) => {
      const merged = new Set(prev)
      for (const id of arrived) merged.add(id)
      return merged
    })
    const t = window.setTimeout(() => {
      setFreshIds((prev) => {
        const n = new Set(prev)
        for (const id of arrived) n.delete(id)
        return n
      })
    }, 2400)
    return () => window.clearTimeout(t)
  }, [visible])

  // Pin scroll position so new cards below can't yank the rail to the bottom.
  useLayoutEffect(() => {
    const el =
      (listRef.current?.closest('.ge-memos-col') as HTMLElement | null) ??
      (listRef.current?.parentElement as HTMLElement | null)
    if (!el) return
    scrollRef.current = el
    const onScroll = () => {
      scrollTopRef.current = el.scrollTop
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = scrollTopRef.current
  }, [visible])

  const filedCount = useMemo(
    () => MEMOS.reduce((n, m) => n + (!m.repeatable && owned(s, m.id) ? 1 : 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, s],
  )
  const archivesWarn = archivesFirstWarn(s)
  const scannerCheck = can(s, { type: 'pulseScanner' })
  const scannerWait = Math.max(0, Math.ceil(s.compute.scannerReadyAt - s.time))

  const jumpAffordable = () => {
    const first = visible.find((m) => canAfford(m, s))
    if (!first) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-memo-id="${first.id}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
    el.focus()
  }

  return (
    <div className={`ge-memos ${compact ? 'ge-memos--rail' : ''}`.trim()} data-coach-id="floor-memos">
      {!compact ? (
        <header className="ge-panel__head">
          <h2 className="ge-panel__title">
            <Icon name="memo" size={18} /> Memos
          </h2>
          <p className="ge-panel__purpose">Projects that open the next door.</p>
        </header>
      ) : (
        <div className="ge-memos__rail-head">
          <div className="ge-memos__rail-title-row">
            <div className="ge-memos__rail-title">
              <Icon name="memo" size={16} /> Memos
            </div>
            <span className="ge-memos__count" title="Affordable now">
              {readyCount}/{visible.length}
            </span>
          </div>
          <p className="ge-memos__rail-blurb">Voice first, cost second.</p>
        </div>
      )}

      {s.compute?.unlocked ? (
        <Section label="Back office">
          <div className="ge-office">
            <div className="ge-office__att" data-coach-id="compute-attention">
              <Meter
                value={s.compute.attention}
                max={Math.max(1, attentionCap(s))}
                label={`Att ${qty(s.compute.attention)} / ${qty(attentionCap(s))}`}
              />
            </div>

            <div className="ge-office__stats">
              <div>
                <span>Analysts</span>
                <strong>{s.compute.analysts}</strong>
              </div>
              <div>
                <span>Archives</span>
                <strong>{s.compute.archives}</strong>
              </div>
              {s.compute.ideasUnlocked ? (
                <div data-coach-id="compute-ideas">
                  <span>Ideas</span>
                  <strong>{qty(s.compute.ideas)}</strong>
                </div>
              ) : null}
              <div data-coach-id="compute-reputation">
                <span>Rep</span>
                <strong>{s.compute.reputation}</strong>
              </div>
            </div>

            <p className="ge-office__rep" title="Next Reputation +1 from baskets">
              Next +1 @ {qty(s.compute.nextRepAt)} baskets
              {s.baskets >= s.compute.nextRepAt
                ? ' · ready'
                : ` · ${qty(Math.max(0, s.compute.nextRepAt - s.baskets))} to go${
                    s.rates.soldPerSec > 1e-6
                      ? ` · ~${
                          (s.compute.nextRepAt - s.baskets) / s.rates.soldPerSec < 60
                            ? `${Math.ceil((s.compute.nextRepAt - s.baskets) / s.rates.soldPerSec)}s`
                            : `${Math.ceil((s.compute.nextRepAt - s.baskets) / s.rates.soldPerSec / 60)} min`
                        }`
                      : ''
                  }`}
            </p>

            <div className="ge-office__actions">
              <OfficeSuggestBtn
                id="hire-analyst"
                label="Analyst"
                disabled={s.compute.reputation < 1}
                title={
                  archivesWarn
                    ? `Archives first: ${archivesWarn}`
                    : 'Spend 1 Reputation — Attention fills faster (cap unchanged)'
                }
                onClick={() =>
                  setConfirm({
                    title: archivesWarn ? 'Archives first?' : 'Hire Analyst',
                    body: archivesWarn
                      ? `${archivesWarn} Hiring an Analyst now mostly wastes the Reputation.`
                      : 'Spend 1 Reputation to fill Attention faster.',
                    detail: `Cap stays ${qty(attentionCap(s))}.`,
                    confirmLabel: archivesWarn ? 'Hire anyway · 1 Rep' : 'Hire · 1 Rep',
                    onConfirm: () => dispatch({ type: 'buyAnalyst' }),
                  })
                }
              />
              <OfficeSuggestBtn
                id="buy-archive"
                label="Archive"
                disabled={s.compute.reputation < 1}
                title="Spend 1 Reputation — raise Attention cap by 1,000"
                onClick={() => {
                  const nextCap = attentionCap(s) + COMPUTE.capPerArchive
                  setConfirm({
                    title: 'Open Archive',
                    body: 'Spend 1 Reputation to raise the Attention ceiling.',
                    detail: `Cap becomes ${qty(nextCap)}.`,
                    confirmLabel: 'Open · 1 Rep',
                    onConfirm: () => dispatch({ type: 'buyArchive' }),
                  })
                }}
              />
              {s.compute.ideasUnlocked ? (
                <Btn
                  tone="ghost"
                  title={s.compute.ideasOn ? 'Ideas mint while Attention is full' : 'Ideas paused'}
                  onClick={() => dispatch({ type: 'toggleIdeas' })}
                >
                  Ideas {s.compute.ideasOn ? 'on' : 'off'}
                </Btn>
              ) : null}
              {s.compute.scanner ? (
                <Btn
                  tone="ghost"
                  disabled={!scannerCheck.ok}
                  title={scannerCheck.ok ? 'Pulse Attention (wobbles, 2–4s cooldown)' : scannerCheck.reason}
                  onClick={() => dispatch({ type: 'pulseScanner' })}
                >
                  {scannerCheck.ok ? 'Pulse' : scannerWait > 0 ? `Pulse · ${scannerWait}s` : 'Pulse'}
                </Btn>
              ) : null}
            </div>

            {archivesWarn ? (
              <p
                className="ge-muted ge-office__warn"
                role="status"
                style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: 'var(--ge-warn, #e09f3e)' }}
              >
                ⚠ Archives first — {archivesWarn}
              </p>
            ) : null}

            <OfficeRebalance ask={setConfirm} />
          </div>
        </Section>
      ) : null}

      <SpinePath s={s} fmt={numberFormat} />
      <ColdChainGraph s={s} />

      <div className="ge-fork-strip" aria-label="Standing-order forks">
        {FORK_IDS.map((fork) => {
          const pair = FORK_PAIR[fork]
          if (!pair) return null
          const [a, b] = pair
          const da = MEMO_BY_ID[a]
          const db = MEMO_BY_ID[b]
          if (!da || !db) return null
          let show = false
          try {
            show = !!s.memoSeen?.[a] || !!s.memoSeen?.[b] || da.visible(s) || db.visible(s)
          } catch {
            show = FORK_IDS_OWNED(s, fork)
          }
          if (!show) return null
          const ownedA = owned(s, a)
          const ownedB = owned(s, b)
          return (
            <div key={fork}>
              <p className="ge-muted" style={{ margin: '0 0 0.25rem', fontSize: '0.68rem' }}>
                {FORK_LABELS[fork] ?? fork} standing order
              </p>
              <div className="ge-fork-pair">
                {[da, db].map((m) => {
                  const got = owned(s, m.id)
                  const blocked = !got && (ownedA || ownedB)
                  const check = engine.can({ type: 'buyMemo', id: m.id })
                  return (
                    <div
                      key={m.id}
                      className={`ge-fork-choice${got ? ' is-filed' : ''}${
                        blocked ? ' is-blocked' : ''
                      }`.trim()}
                    >
                      <strong>{m.name}</strong>
                      <span>{m.effect}</span>
                      {got ? (
                        <em className="ge-muted" style={{ fontSize: '0.62rem' }}>
                          Filed
                        </em>
                      ) : blocked ? (
                        <em className="ge-muted" style={{ fontSize: '0.62rem' }}>
                          Other path filed
                        </em>
                      ) : (
                        <Btn
                          tone={check.ok ? 'primary' : 'ghost'}
                          disabled={!check.ok}
                          title={check.reason ?? costLabel(m, s, numberFormat)}
                          onClick={() => dispatch({ type: 'buyMemo', id: m.id })}
                        >
                          {check.ok ? costLabel(m, s, numberFormat) : check.reason ?? 'Locked'}
                        </Btn>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="ge-dept-tabs" role="tablist" aria-label="Memo desk">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'desk'}
          className={`ge-dept-tab${tab === 'desk' ? ' is-on' : ''}`.trim()}
          onClick={() => setTab('desk')}
        >
          Desk
          <em>{visible.length}</em>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'standing'}
          className={`ge-dept-tab${tab === 'standing' ? ' is-on' : ''}`.trim()}
          onClick={() => setTab('standing')}
        >
          Standing
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'filed'}
          className={`ge-dept-tab${tab === 'filed' ? ' is-on' : ''}`.trim()}
          onClick={() => setTab('filed')}
        >
          Filed
          <em>{filedCount}</em>
        </button>
      </div>

      {tab === 'filed' ? <FiledList s={s} /> : null}

      {tab === 'standing' ? (
        <div className="ge-standing-grid">
          {STANDING_ORDER_MEMOS.filter((m) => {
            try {
              return m.visible(s) || (s.memos[m.id] ?? 0) > 0
            } catch {
              return false
            }
          }).map((m) => {
            const lvl = s.memos[m.id] ?? 0
            const max = m.max ?? 10
            const check = engine.can({ type: 'buyMemo', id: m.id })
            return (
              <article
                key={m.id}
                className={`ge-standing-card${check.ok ? ' is-ready' : ''}`.trim()}
              >
                <div className="ge-perk-card__top">
                  <strong>{m.name}</strong>
                  <span className="ge-perk-card__lvl">
                    {lvl}/{max}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ge-muted)' }}>{m.effect}</p>
                <div className="ge-perk-card__pips" aria-hidden>
                  {Array.from({ length: max }, (_, i) => (
                    <i key={i} className={i < lvl ? 'is-on' : undefined} />
                  ))}
                </div>
                <Btn
                  tone={check.ok ? 'primary' : 'ghost'}
                  disabled={!check.ok}
                  title={check.reason ?? costLabel(m, s, numberFormat)}
                  onClick={() => dispatch({ type: 'buyMemo', id: m.id })}
                >
                  {lvl >= max ? 'Maxed' : costLabel(m, s, numberFormat)}
                </Btn>
              </article>
            )
          })}
        </div>
      ) : null}

      <div
        className="ge-filter-bar ge-memos__filters"
        style={tab === 'filed' || tab === 'standing' ? { display: 'none' } : undefined}
      >
        <input
          type="search"
          className="ge-filter-bar__input"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search memos"
        />
        <label className="ge-check">
          <input
            type="checkbox"
            checked={affordableOnly}
            onChange={(e) => setAffordableOnly(e.target.checked)}
          />
          Affordable
        </label>
        <Btn tone="ghost" onClick={jumpAffordable} disabled={readyCount === 0}>
          Jump
        </Btn>
      </div>

      {tab === 'desk' && visible.length === 0 ? <p className="ge-empty">No memos on the desk.</p> : null}

      <ul
        className="ge-memo-list"
        ref={listRef}
        style={tab === 'filed' || tab === 'standing' ? { display: 'none' } : undefined}
      >
        {visible.map((m) => (
          <MemoRow
            key={m.id}
            m={m}
            s={s}
            numberFormat={numberFormat}
            fresh={freshIds.has(m.id)}
            muted={meta.settings.muted}
            reducedMotion={reducedMotion}
            onBuy={() => dispatch({ type: 'buyMemo', id: m.id })}
            onFav={() => dispatch({ type: 'toggleFavoriteMemo', id: m.id })}
          />
        ))}
      </ul>

      {s.compute?.unlocked ? (
        <HelpCard title="Attention & Ideas">
          Analysts make Attention; Archives set the cap. Memos spend Attention, so raise the cap
          (Archives) before hiring more Analysts. When Attention is full, Analysts spill into Ideas,
          which pay for the heavier memos. Spend Reputation on an Archive first, an Analyst second.
        </HelpCard>
      ) : (
        <HelpCard title="Memos">
          Each memo is a project that opens the next door. Buy the ready ones — cash is the only cost
          until the back office opens. Star the ones you want to keep near the top.
        </HelpCard>
      )}

      <ConfirmModal
        open={!!confirm}
        spec={confirm}
        reducedMotion={reducedMotion}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}

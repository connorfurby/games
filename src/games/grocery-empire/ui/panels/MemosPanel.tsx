import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { hasAffordableMemo, memoSweepPreview, pickBestMemo } from '../../sim/memoPlan'
import { chainAttentionDrainPerSec } from '../../sim/systems/chain'
import { SPINE_MEMOS } from '../../sim/suggestions'
import { officeRebalanceCost } from '../../sim/systems/office'
import { useGame, useIsSuggested } from '../GameContext'
import { money, qty } from '../format'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { Button, Disclosure, EmptyState, Meter, SegmentedControl, useConfirm, Toggle } from '../kit'
import { Icon } from '../icons/Icon'
import { PlayFrame, StatusChip } from '../play'
import './waveC.css'

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
  if (parts.length === 0 && def.effect) return `Free · ${def.effect}`
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

function eraChipLabel(era: number) {
  return era >= 7 ? 'Horizon' : `Era ${era}`
}

type GS = Parameters<MemoDef['cost']>[0]

const owned = (s: GS, id: string) => (s.memos[id] ?? 0) > 0

function attentionNote(s: GS): string {
  const gen = attentionPerSec(s)
  const drain = chainAttentionDrainPerSec(s)
  const net = gen - drain
  const parts = [
    `${net >= 0 ? '+' : ''}${net.toFixed(2)}/s net`,
    `analysts +${gen.toFixed(1)}/s`,
  ]
  if (drain > 0) parts.push(`stores −${drain.toFixed(2)}/s`)
  if (s.compute.ideasUnlocked) {
    parts.push(s.compute.ideasOn ? 'a full bar makes Ideas' : 'Ideas paused')
  }
  if ((s.upgrades['tourney-while-full'] ?? 0) >= 1) {
    if (s.compute.autoTourney === false) parts.push('auto-tournament off')
    else if (s.compute.ideasUnlocked && s.compute.ideasOn) parts.push('auto-tournament waiting')
    else parts.push('auto-tournament every 45s while full')
  }
  return parts.join(' · ')
}

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
    return `The bar is ${Math.round(fill * 100)}% full. Another Analyst would overflow it. Open an Archive.`
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
      return `${m.name} needs ${qty(need)} Attention. This office holds ${qty(cap)}. Open an Archive first.`
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
      <div className="ge-spine__dots" role="list" aria-label="Story memos">
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
      <p className="ge-muted" style={{ margin: '0.25rem 0 0', fontSize: 'var(--t-xs)' }}>
        Story {done} of {steps.length}
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
    { id: 'meat', label: 'Meat', done: !!s.categories.meat, how: 'Butcher Block memo (needs Attention)' },
  ]
  const next = nodes.find((n) => !n.done)
  return (
    <p className="ge-muted ge-coldgraph" style={{ margin: '0.4rem 0', fontSize: 'var(--t-xs)' }}>
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
            <span className="ge-muted" style={{ fontSize: 'var(--t-2xs)' }}>
              {eraChipLabel(m.era)}
            </span>
          </div>
          <span className="ge-memo__effect" title={m.effect}>
            {m.effect}
          </span>
          <p className="ge-muted" style={{ margin: '0.2rem 0 0', fontSize: 'var(--t-2xs)' }}>
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
      <Button size="sm" tone="primary" coachId={id} disabled={disabled} title={title} onClick={onClick}>
        {label}
      </Button>
    </span>
  )
}

/** One line for why a memo is not buyable right now (null when it is). */
function memoGate(m: MemoDef, s: GS, check: { ok: boolean; reason?: string }): string | null {
  if (check.ok) return null
  const costs = memoCosts(m, s)
  const attCap = attentionCap(s)
  if (costs.attention > 0 && (s.compute.attention < costs.attention || costs.attention > attCap)) {
    return `Attention limit ${qty(attCap)} · memo needs ${qty(costs.attention)}${
      s.compute.attention < costs.attention ? ` · have ${qty(s.compute.attention)}` : ' · buy Archives'
    }`
  }
  return memoBlockReason(m, s) ?? check.reason ?? null
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
  const gate = memoGate(m, s, check)
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
        <span className="ge-muted" style={{ fontSize: 'var(--t-2xs)' }}>
          {eraChipLabel(m.era)}
        </span>
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
      <Button
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
      </Button>
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
      <span className="ge-office__rebalance-label">Swap a seat · {costLabel}</span>
      <p className="ge-office__job">Turn one into the other. You always keep at least one of each.</p>
      <div className="ge-office__rebalance-row">
        <Button
          tone="ghost"
          disabled={!toArchive.ok}
          title={toArchive.reason ?? `Pay ${costLabel}. One Analyst becomes an Archive. Cap +${step}.`}
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
          Analyst → Archive
        </Button>
        <Button
          tone="ghost"
          disabled={!toAnalyst.ok}
          title={toAnalyst.reason ?? `Pay ${costLabel}. One Archive becomes an Analyst. Cap −${step}.`}
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
          Archive → Analyst
        </Button>
      </div>
    </div>
  )
}

/** Memoized: re-renders from its own context reads, not from unrelated parent renders. */
export const MemosPanel = memo(MemosPanelInner)

function MemosPanelInner({ compact }: { compact?: boolean }) {
  const { state: s, tick, dispatch, numberFormat, reducedMotion, setActiveMenu } = useGame()
  const { meta } = useMeta()
  const kitConfirm = useConfirm()
  const [q, setQ] = useState('')
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const [readyOnly, setReadyOnly] = useState(false)
  const [tab, setTab] = useState<'desk' | 'filed' | 'standing'>('desk')
  const spineOwned = SPINE_MEMOS.filter((id) => (s.memos[id] ?? 0) > 0).length
  // Stay visible. Open when Reputation is waiting or the bar is nearly full; the header stays either way.
  const officeUnlocked = !!s.compute?.unlocked
  const [officeOpen, setOfficeOpen] = useState(() => {
    if (!officeUnlocked) return false
    const cap = Math.max(1, attentionCap(s))
    const fill = s.compute.attention / cap
    return spineOwned < 3 || (s.compute.reputation ?? 0) >= 1 || fill >= 0.8
  })
  const [seenOffice, setSeenOffice] = useState(officeUnlocked)
  if (officeUnlocked && !seenOffice) {
    setSeenOffice(true)
    setOfficeOpen(true)
  }
  const listRef = useRef<HTMLUListElement>(null)
  const scrollRef = useRef<HTMLElement | null>(null)
  const scrollTopRef = useRef(0)
  const knownIdsRef = useRef<Set<string>>(new Set())
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set())

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const rows = MEMOS.filter((m) => {
      if (m.standing || m.again) return false
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
      if (readyOnly && !canAfford(m, s)) return false
      if (!needle) return true
      return `${m.name} ${m.voice} ${m.effect}`.toLowerCase().includes(needle)
    })

    // Favorites → ready → unblocked → Att in cap → blended cheap → authored order.
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
      const ca = cheapScore(a, s)
      const cb = cheapScore(b, s)
      if (ca !== cb) return ca - cb
      return (MEMO_INDEX.get(a.id) ?? 0) - (MEMO_INDEX.get(b.id) ?? 0)
    })
    // `tick` — GameState is mutated in place; `s` identity never changes.
  }, [tick, s, q, readyOnly])

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

  const again = useMemo(() => {
    return MEMOS.filter((m) => m.again).filter((m) => {
      if (s.memoSeen?.[m.id]) return true
      try {
        return m.visible(s)
      } catch {
        return false
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, s])

  const filedCount = useMemo(
    () => MEMOS.reduce((n, m) => n + (!m.repeatable && owned(s, m.id) ? 1 : 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, s],
  )
  const archivesWarn = archivesFirstWarn(s)
  const scannerCheck = can(s, { type: 'pulseScanner' })
  const scannerWait = Math.max(0, Math.ceil(s.compute.scannerReadyAt - s.time))
  const attCap = attentionCap(s)

  const jumpAffordable = () => {
    setTab('desk')
    requestAnimationFrame(() => {
      const first = visible.find((m) => canAfford(m, s))
      if (!first) return
      const el = listRef.current?.querySelector<HTMLElement>(`[data-memo-id="${first.id}"]`)
      if (!el) return
      el.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
      el.focus()
    })
  }

  const openOffice = () => {
    setOfficeOpen(true)
    requestAnimationFrame(() => {
      document.querySelector('.wc-office')?.scrollIntoView({
        block: 'nearest',
        behavior: reducedMotion ? 'auto' : 'smooth',
      })
    })
  }

  const buyBestReady = hasAffordableMemo(s)
  // Same pick the sweep files first: effect weight per blended cost, then cheapest.
  const bestMemoId = buyBestReady ? pickBestMemo(s)?.id : undefined
  const bestMemo = bestMemoId ? MEMOS.find((m) => m.id === bestMemoId) : undefined
  const bestHint = bestMemo ? `Best: ${bestMemo.name} · ${bestMemo.effect}` : undefined
  const buyBest = async () => {
    const preview = memoSweepPreview(s)
    if (preview.count <= 0) return
    if (preview.count >= 8) {
      const parts: string[] = []
      if (preview.cash > 0) parts.push(money(preview.cash, numberFormat))
      if (preview.attention > 0) parts.push(`${qty(preview.attention)} Att`)
      if (preview.ideas > 0) parts.push(`${qty(preview.ideas)} Ide`)
      const ok = await kitConfirm({
        title: `Buy ${preview.count} memos?`,
        body: `Spend about ${parts.join(' · ') || 'nothing'} on the best-value desk memos.`,
        confirmLabel: 'Buy Best',
      })
      if (!ok) return
    }
    dispatch({ type: 'buyMemoSweep' })
  }

  // Why Buy Best is grey: the top desk row is the nearest memo, so name its gate.
  const nearest = visible.find((m) => !canAfford(m, s)) ?? visible[0]
  const deskGate = buyBestReady
    ? null
    : nearest
      ? `${nearest.name}: ${memoGate(nearest, s, engine.can({ type: 'buyMemo', id: nearest.id })) ?? 'not yet'}`
      : 'Nothing on the desk yet. Buy crates and clear goals.'
  const attGate = !!deskGate && /\bAtt\b/.test(deskGate) && !!s.compute?.unlocked
  // Read is banked by Strategy tournaments — a memo gated on Read points there.
  const readGate = !!deskGate && /\bRead\b/.test(deskGate) && !!s.menus.strategy

  const filterOn = readyOnly || q.trim().length > 0
  const showFilters = filterOn || visible.length > 6
  const anyStanding = FORK_IDS.some((fork) => {
    const pair = FORK_PAIR[fork]
    if (!pair) return false
    return pair.some((id) => {
      if (s.memoSeen?.[id]) return true
      try {
        return !!MEMO_BY_ID[id]?.visible(s)
      } catch {
        return false
      }
    })
  })
  const memoTabs: { value: 'desk' | 'standing' | 'filed'; label: string }[] = [
    { value: 'desk', label: `Desk ${visible.length}` },
    ...(anyStanding ? [{ value: 'standing' as const, label: 'Standing' }] : []),
    ...(filedCount > 0 ? [{ value: 'filed' as const, label: `Filed ${filedCount}` }] : []),
  ]

  const room = (
    <div className="wc-memo-room">
      {s.compute?.unlocked ? (
        <div data-coach-id="compute-attention">
          <Disclosure
            className={`wc-office${archivesWarn ? ' is-warn' : ''}`}
            title={
              <span className="ge-office__head">
                <span className="ge-office__name">Back office</span>
                <span className="ge-office__glance">
                  Attention {qty(s.compute.attention)} / {qty(attCap)} · Reputation {s.compute.reputation}
                  {archivesWarn ? ' · Archive first' : ''}
                </span>
              </span>
            }
            open={officeOpen}
            onOpenChange={setOfficeOpen}
          >
            <div className="ge-office">
              <p className="ge-office__dek">Analysts fill Attention. Archives raise the cap. Both cost 1 Reputation.</p>
              <Meter
                value={s.compute.attention}
                max={Math.max(1, attCap)}
                label={`Attention ${qty(s.compute.attention)} / ${qty(attCap)}`}
              />
              <p className="ge-office__job">{attentionNote(s)}</p>
              <div className="ge-office__stats">
                <div>
                  <span>Analysts</span>
                  <strong>{s.compute.analysts}</strong>
                  <em>fill the bar</em>
                </div>
                <div>
                  <span>Archives</span>
                  <strong>{s.compute.archives}</strong>
                  <em>cap {qty(attCap)}</em>
                </div>
                {s.compute.ideasUnlocked ? (
                  <div data-coach-id="compute-ideas">
                    <span>Ideas</span>
                    <strong>{qty(s.compute.ideas)}</strong>
                    <em>{s.compute.ideasOn ? 'minting' : 'paused'}</em>
                  </div>
                ) : null}
                <div data-coach-id="compute-reputation">
                  <span>Reputation</span>
                  <strong>{s.compute.reputation}</strong>
                  <em>to spend</em>
                </div>
              </div>

              <p className="ge-office__rep" title="Next Reputation +1 from baskets">
                Next Reputation at {qty(s.compute.nextRepAt)} baskets
                {s.baskets >= s.compute.nextRepAt
                  ? ' · ready'
                  : ` · ${qty(Math.max(0, s.compute.nextRepAt - s.baskets))} to go`}
              </p>

              <div className="ge-office__actions">
                <OfficeSuggestBtn
                  id="hire-analyst"
                  label="Hire Analyst"
                  disabled={s.compute.reputation < 1}
                  title={
                    archivesWarn
                      ? archivesWarn
                      : 'Spend 1 Reputation. Attention fills faster. The cap stays the same.'
                  }
                  onClick={() =>
                    setConfirm({
                      title: archivesWarn ? 'Archives first?' : 'Hire Analyst',
                      body: archivesWarn
                        ? `${archivesWarn} Hiring an Analyst now mostly wastes the Reputation.`
                        : 'Spend 1 Reputation to fill Attention faster.',
                      detail: `Cap stays ${qty(attCap)}.`,
                      confirmLabel: archivesWarn ? 'Hire anyway · 1 Reputation' : 'Hire · 1 Reputation',
                      onConfirm: () => dispatch({ type: 'buyAnalyst' }),
                    })
                  }
                />
                <OfficeSuggestBtn
                  id="buy-archive"
                  label="Open Archive"
                  disabled={s.compute.reputation < 1}
                  title="Spend 1 Reputation. Attention cap rises by 1,000."
                  onClick={() => {
                    const nextCap = attCap + COMPUTE.capPerArchive
                    setConfirm({
                      title: 'Open Archive',
                      body: 'Spend 1 Reputation to raise the Attention ceiling.',
                      detail: `Cap becomes ${qty(nextCap)}.`,
                      confirmLabel: 'Open · 1 Reputation',
                      onConfirm: () => dispatch({ type: 'buyArchive' }),
                    })
                  }}
                />
                {s.compute.ideasUnlocked ? (
                  <Button
                    tone="ghost"
                    title={
                      s.compute.ideasOn
                        ? 'Ideas mint while Attention is full. Auto-tournament waits.'
                        : 'Ideas paused. Tourney While Full can spend the bar.'
                    }
                    onClick={() => dispatch({ type: 'toggleIdeas' })}
                  >
                    Ideas {s.compute.ideasOn ? 'on' : 'off'}
                  </Button>
                ) : null}
                {s.compute.scanner ? (
                  <Button
                    tone="ghost"
                    disabled={!scannerCheck.ok}
                    title={scannerCheck.ok ? 'Pulse Attention. It wobbles, then waits 2–4s.' : scannerCheck.reason}
                    onClick={() => dispatch({ type: 'pulseScanner' })}
                  >
                    {scannerCheck.ok ? 'Pulse' : scannerWait > 0 ? `Pulse · ${scannerWait}s` : 'Pulse'}
                  </Button>
                ) : null}
              </div>

              {archivesWarn ? (
                <p className="ge-office__warn" role="status">
                  {archivesWarn}
                </p>
              ) : null}

              <OfficeRebalance ask={setConfirm} />
            </div>
          </Disclosure>
        </div>
      ) : null}
      <SpinePath s={s} fmt={numberFormat} />
      <ColdChainGraph s={s} />
    </div>
  )

  return (
    <div className={`ge-memos ${compact ? 'ge-memos--rail' : ''}`.trim()} data-coach-id="floor-memos">
      <PlayFrame
        className="wc-memos"
        department={
          <>
            <Icon name="memo" size={compact ? 14 : 16} /> Memos{' '}
            <StatusChip tone={readyCount > 0 ? 'ready' : 'idle'} title="Affordable now">
              {readyCount}/{visible.length}
            </StatusChip>
          </>
        }
        title="Memos"
        help={false}
        purpose="Memos open new parts of the store and move the story along."
        room={room}
        tray={{
          primary: {
            label: buyBestReady ? `Buy Best · ${readyCount} ready` : 'Buy Best',
            tone: 'primary',
            size: 'lg',
            coachId: 'memo-buy-best',
            disabled: !buyBestReady,
            title:
              'Buys the best-value affordable desk memos (effect per cost, then cheapest) until cash, Attention, or Ideas run out. Archive and Analyst buys stay manual.',
            onClick: () => void buyBest(),
          },
          hint: bestHint,
          failReason: deskGate ? (
            <>
              {deskGate}
              {attGate ? (
                <>
                  {' '}
                  <button type="button" className="pf-chip__link" onClick={openOffice}>
                    Open Back office
                  </button>
                </>
              ) : null}
              {readGate ? (
                <>
                  {' '}
                  <button type="button" className="pf-chip__link" onClick={() => setActiveMenu('strategy')}>
                    Open Strategy
                  </button>
                </>
              ) : null}
            </>
          ) : undefined,
          secondaries: [
            ...(visible.length > 4
              ? [
                  {
                    key: 'jump',
                    label: 'Jump to ready',
                    fact: readyCount > 0 ? `${readyCount} on desk` : 'none yet',
                    disabled: readyCount === 0,
                    onClick: jumpAffordable,
                  },
                ]
              : []),
            ...(s.compute?.unlocked
              ? [
                  {
                    key: 'office',
                    label: 'Back office',
                    title: 'Open the Attention desk: Analysts, Archives, Reputation',
                    onClick: openOffice,
                  },
                ]
              : []),
          ],
        }}
      >
        {memoTabs.length > 1 ? (
          <SegmentedControl aria-label="Memo desk" value={tab} onChange={setTab} options={memoTabs} />
        ) : null}

        {tab === 'filed' ? <FiledList s={s} /> : null}

        {tab === 'standing' ? (
          <>
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
                    <p className="ge-muted wc-fork-label">{FORK_LABELS[fork] ?? fork} standing order</p>
                    <div className="ge-fork-pair">
                      {[da, db].map((m) => {
                        const got = owned(s, m.id)
                        const blocked = !got && (ownedA || ownedB)
                        const check = engine.can({ type: 'buyMemo', id: m.id })
                        return (
                          <div
                            key={m.id}
                            className={`ge-fork-choice${got ? ' is-filed' : ''}${blocked ? ' is-blocked' : ''}`.trim()}
                          >
                            <strong>{m.name}</strong>
                            <span>{m.effect}</span>
                            {got ? (
                              <em className="ge-muted wc-fork-state">Filed</em>
                            ) : blocked ? (
                              <em className="ge-muted wc-fork-state">Other path filed</em>
                            ) : (
                              <Button
                                tone={check.ok ? 'primary' : 'ghost'}
                                disabled={!check.ok}
                                title={check.reason ?? costLabel(m, s, numberFormat)}
                                onClick={() => dispatch({ type: 'buyMemo', id: m.id })}
                              >
                                {check.ok ? costLabel(m, s, numberFormat) : check.reason ?? 'Locked'}
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {again.length > 0 ? (
              <ul className="ge-memo-list">
                {again.map((m) => (
                  <MemoRow
                    key={m.id}
                    m={m}
                    s={s}
                    numberFormat={numberFormat}
                    fresh={false}
                    muted={meta.settings.muted}
                    reducedMotion={reducedMotion}
                    onBuy={() => dispatch({ type: 'buyMemo', id: m.id })}
                    onFav={() => dispatch({ type: 'toggleFavoriteMemo', id: m.id })}
                  />
                ))}
              </ul>
            ) : null}

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
                  <article key={m.id} className={`ge-standing-card${check.ok ? ' is-ready' : ''}`.trim()}>
                    <div className="ge-perk-card__top">
                      <strong>{m.name}</strong>
                      <span className="ge-perk-card__lvl">
                        {lvl}/{max}
                      </span>
                    </div>
                    <p className="wc-standing-effect">{m.effect}</p>
                    <div className="ge-perk-card__pips" aria-hidden>
                      {Array.from({ length: max }, (_, i) => (
                        <i key={i} className={i < lvl ? 'is-on' : undefined} />
                      ))}
                    </div>
                    <Button
                      tone={check.ok ? 'primary' : 'ghost'}
                      disabled={!check.ok}
                      title={check.reason ?? costLabel(m, s, numberFormat)}
                      onClick={() => dispatch({ type: 'buyMemo', id: m.id })}
                    >
                      {lvl >= max ? 'Maxed' : costLabel(m, s, numberFormat)}
                    </Button>
                  </article>
                )
              })}
            </div>
          </>
        ) : null}

        {tab === 'desk' && showFilters ? (
          <div className="wc-filters" role="search">
            <input
              type="search"
              className="ge-filter-bar__input"
              placeholder="Search memos…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search memos"
            />
            <label className="pf-switch">
              <Toggle checked={readyOnly} onChange={setReadyOnly} aria-label="Ready only" />
              <span>Ready only</span>
            </label>
          </div>
        ) : null}

        {tab === 'desk' && visible.length === 0 ? (
          filterOn ? (
            <EmptyState title="Nothing matches" body="Clear the search or turn off Ready only." />
          ) : (
            <EmptyState title="No memos on the desk" body="Buy crates and clear goals — new projects land here." />
          )
        ) : null}

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
      </PlayFrame>

      <ConfirmModal
        open={!!confirm}
        spec={confirm}
        reducedMotion={reducedMotion}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Sheet } from '../kit/Sheet'
import { usePhone } from '../kit/hooks'
import './tree.css'

/** Keep discs tappable on a 390px phone (the disc itself is 64px). */
const MIN_ZOOM = 0.56
const MAX_ZOOM = 1.8
const COL = 128
const ROW = 132
const PER_ROW = 4
const R = 30

export type TreeNodeState = 'owned' | 'ready' | 'open' | 'unknown'

export interface TreeNode {
  id: string
  name: string
  tier: number
  requires: { id: string; level: number }[]
  lvl: number
  /** Ring fills at this rank. The label still shows the real rank past it. */
  ring: number
  state: TreeNodeState
  sub?: string
  coachId?: string
}

export interface TierInfo {
  label: string
  note?: string
}

interface Placed {
  n: TreeNode
  x: number
  y: number
}

function layout(nodes: TreeNode[], tierCount: number): { placed: Placed[]; width: number; height: number; tierY: number[] } {
  const byTier: TreeNode[][] = Array.from({ length: tierCount }, () => [])
  for (const n of nodes) byTier[Math.max(0, Math.min(tierCount - 1, n.tier))]!.push(n)
  const children = new Map<string, string[]>()
  for (const n of nodes) for (const r of n.requires) children.set(r.id, [...(children.get(r.id) ?? []), n.id])

  const xAt = (i: number, len: number) => {
    const row = Math.floor(i / PER_ROW)
    const inRow = Math.min(PER_ROW, len - row * PER_ROW)
    return (i % PER_ROW - (inRow - 1) / 2) * COL
  }
  const xOf = new Map<string, number>()
  const assign = () => {
    for (const list of byTier) list.forEach((n, i) => xOf.set(n.id, xAt(i, list.length)))
  }
  const sortTier = (t: number, bary: (n: TreeNode) => number | null) => {
    const list = byTier[t]!
    const keyed = list.map((n, i) => ({ n, k: bary(n) ?? (xOf.get(n.id) ?? i * COL) }))
    keyed.sort((a, b) => a.k - b.k)
    byTier[t] = keyed.map((x) => x.n)
  }
  const mean = (ids: string[]) => {
    const xs = ids.map((id) => xOf.get(id)).filter((v): v is number => v != null)
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  }
  assign()
  for (let pass = 0; pass < 3; pass++) {
    for (let t = 1; t < tierCount; t++) {
      sortTier(t, (n) => mean(n.requires.map((r) => r.id)))
      assign()
    }
    for (let t = tierCount - 2; t >= 0; t--) {
      sortTier(t, (n) => mean(children.get(n.id) ?? []))
      assign()
    }
  }

  const placed: Placed[] = []
  const tierY: number[] = []
  let y = 64
  let maxCols = 1
  for (let t = 0; t < tierCount; t++) {
    const list = byTier[t]!
    tierY.push(y - 40)
    if (list.length === 0) {
      y += 48
      continue
    }
    const rows = Math.ceil(list.length / PER_ROW)
    list.forEach((n, i) => {
      maxCols = Math.max(maxCols, Math.min(PER_ROW, list.length))
      placed.push({ n, x: xOf.get(n.id)!, y: y + Math.floor(i / PER_ROW) * (ROW - 16) })
    })
    y += rows * (ROW - 16) + 16
  }
  const width = Math.max(3, maxCols) * COL + 72
  for (const p of placed) p.x += width / 2
  return { placed, width, height: y + 8, tierY }
}

function Ring({ lvl, ring, state }: { lvl: number; ring: number; state: TreeNodeState }) {
  const c = 2 * Math.PI * (R - 3)
  const f = ring > 0 ? Math.min(1, lvl / ring) : 0
  return (
    <svg className="sd-skill__ring" viewBox="0 0 64 64" width={64} height={64} aria-hidden>
      <circle cx={32} cy={32} r={R - 3} className="sd-skill__track" />
      {f > 0 ? (
        <circle
          cx={32}
          cy={32}
          r={R - 3}
          className={`sd-skill__fill sd-skill__fill--${state}`}
          strokeDasharray={`${c * f} ${c}`}
          transform="rotate(-90 32 32)"
        />
      ) : null}
    </svg>
  )
}

/**
 * Pannable upgrade tree. Tiers run top to bottom. Prerequisite links light once a
 * rank is owned. Selecting a node opens `renderDetail` beside the board, or in a
 * sheet on a phone.
 */
export function SkillTree({
  nodes,
  tiers,
  selected,
  onSelect,
  renderDetail,
  reducedMotion = false,
  emptyText = 'Nothing on this tree yet.',
}: {
  nodes: TreeNode[]
  tiers: TierInfo[]
  selected: string | null
  onSelect: (id: string | null) => void
  renderDetail: (id: string) => ReactNode
  reducedMotion?: boolean
  emptyText?: string
}) {
  const phone = usePhone()
  const { placed, width, height, tierY } = useMemo(() => layout(nodes, tiers.length), [nodes, tiers.length])
  const pos = useMemo(() => new Map(placed.map((p) => [p.n.id, p])), [placed])
  const viewRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState<string | null>(null)
  const [flashEdges, setFlashEdges] = useState<Set<string>>(() => new Set())
  const prevLvl = useRef<Map<string, number>>(new Map())
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null)
  const selectedName = selected ? (pos.get(selected)?.n.name ?? 'Node') : ''

  useEffect(() => {
    const prev = prevLvl.current
    const bought: string[] = []
    for (const n of nodes) {
      const before = prev.get(n.id) ?? n.lvl
      if (n.lvl > before) bought.push(n.id)
      prev.set(n.id, n.lvl)
    }
    if (bought.length === 0 || reducedMotion) return
    const edges = new Set<string>()
    for (const id of bought) {
      const n = pos.get(id)?.n
      if (!n) continue
      for (const r of n.requires) edges.add(`${r.id}-${id}`)
    }
    if (edges.size === 0) return
    setFlashEdges(edges)
    const t = window.setTimeout(() => setFlashEdges(new Set()), 700)
    return () => window.clearTimeout(t)
  }, [nodes, pos, reducedMotion])

  const fit = () => {
    const el = viewRef.current
    if (!el) return
    const z = Math.max(MIN_ZOOM, Math.min(1, (el.clientWidth - 16) / width))
    setZoom(z)
    setPan({ x: (el.clientWidth - width * z) / 2, y: 0 })
  }
  useLayoutEffect(fit, [width, nodes.length])
  useEffect(() => {
    const el = viewRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let w = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (Math.abs(el.clientWidth - w) > 4) {
        w = el.clientWidth
        fit()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])

  useEffect(() => {
    const el = viewRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * (e.deltaY < 0 ? 1.1 : 0.9))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const lit = useMemo(() => {
    const focus = hover ?? selected
    const out = new Set<string>()
    if (!focus) return out
    const walk = (id: string) => {
      if (out.has(id)) return
      out.add(id)
      for (const r of pos.get(id)?.n.requires ?? []) walk(r.id)
    }
    walk(focus)
    return out
  }, [hover, selected, pos])

  if (nodes.length === 0) return <p className="sd-skill__empty">{emptyText}</p>

  const detail = selected ? renderDetail(selected) : null
  const showAside = !!selected && !phone

  return (
    <div className={`sd-skill${showAside ? ' has-detail' : ''}`}>
      <div
        ref={viewRef}
        className="sd-skill__view"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('.sd-skill__node')) return
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true
          setPan({ x: d.px + dx, y: d.py + dy })
        }}
        onPointerUp={() => {
          if (drag.current && !drag.current.moved && !phone) onSelect(null)
          drag.current = null
        }}
      >
        <div
          className={`sd-skill__canvas${reducedMotion ? '' : ' is-anim'}`}
          style={{ width, height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <svg className="sd-skill__links" width={width} height={height} aria-hidden>
            {tierY.map((y, t) => (
              <line key={t} x1={16} x2={width - 16} y1={y} y2={y} className="sd-skill__tierline" />
            ))}
            {placed.map((p) =>
              p.n.requires.map((r) => {
                const from = pos.get(r.id)
                if (!from) return null
                const met = from.n.lvl >= r.level
                const on = lit.has(p.n.id) && lit.has(r.id)
                const y1 = from.y + R
                const y2 = p.y - R
                const mid = (y1 + y2) / 2
                const edgeKey = `${r.id}-${p.n.id}`
                return (
                  <path
                    key={edgeKey}
                    d={`M${from.x} ${y1} C${from.x} ${mid} ${p.x} ${mid} ${p.x} ${y2}`}
                    className={`sd-skill__link${met ? ' is-met' : ''}${on ? ' is-lit' : ''}${flashEdges.has(edgeKey) ? ' is-buy' : ''}`}
                  />
                )
              }),
            )}
          </svg>
          {tiers.map((t, i) => (
            <div key={t.label} className="sd-skill__tier" style={{ top: tierY[i]! - 10 }}>
              <span>{t.label}</span>
              {t.note ? <small>{t.note}</small> : null}
            </div>
          ))}
          {placed.map(({ n, x, y }) => (
            <button
              key={n.id}
              type="button"
              data-upgrade-id={n.id}
              data-coach-id={n.coachId}
              className={`sd-skill__node sd-skill__node--${n.state}${selected === n.id ? ' is-sel' : ''}${lit.has(n.id) ? ' is-lit' : ''}`}
              style={{ left: x - 32, top: y - 32 }}
              onClick={() => onSelect(selected === n.id ? null : n.id)}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              aria-label={n.state === 'unknown' ? 'Unknown node' : `${n.name}, rank ${n.lvl}`}
              aria-pressed={selected === n.id}
            >
              <span className="sd-skill__disc">
                <Ring lvl={n.lvl} ring={n.ring} state={n.state} />
                <span className="sd-skill__mark">{n.state === 'unknown' ? '?' : n.name.slice(0, 1)}</span>
                <span className="sd-skill__rank">
                  {n.state === 'unknown' ? '' : n.lvl >= n.ring ? String(n.lvl) : `${n.lvl}/${n.ring}`}
                </span>
              </span>
              <span className="sd-skill__name">{n.state === 'unknown' ? '???' : n.name}</span>
              {n.sub && n.state !== 'unknown' ? <span className="sd-skill__sub">{n.sub}</span> : null}
            </button>
          ))}
        </div>
        <div className="sd-skill__zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.15))} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.15))} aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={fit} aria-label="Fit the tree">
            Fit
          </button>
        </div>
        <p className="sd-skill__help">Drag to pan. Tap a node to buy it.</p>
      </div>
      {showAside ? <aside className="sd-skill__detail">{detail}</aside> : null}
      {phone ? (
        <Sheet open={!!selected} onClose={() => onSelect(null)} title={selectedName}>
          {detail}
        </Sheet>
      ) : null}
    </div>
  )
}

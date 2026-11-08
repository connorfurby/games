import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { StatId } from '../../content/upgrades/stats'
import { StatGlyph } from './StatGlyph'
import './tree.css'

/**
 * An interactive skill tree: tiers run top to bottom, real prerequisites are drawn as
 * links (lit once met), nodes show a rank ring, and the board pans (drag) and zooms
 * (buttons or Ctrl/⌘ + wheel). Selecting a node opens `renderDetail` beside the board.
 */

export type TreeNodeState = 'max' | 'owned' | 'ready' | 'open' | 'locked' | 'unknown'

export interface TreeNode {
  id: string
  name: string
  tier: number
  requires: { id: string; level: number }[]
  /** Nodes sharing a fork are "choose one". */
  fork?: string
  lvl: number
  max: number
  state: TreeNodeState
  stat?: StatId
  /** Small label under the name (cost, points…). */
  sub?: string
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

const COL = 132
const ROW = 150
const PER_ROW = 7
const R = 30

function layout(nodes: TreeNode[], tiers: number): { placed: Placed[]; width: number; height: number; tierY: number[] } {
  const byTier: TreeNode[][] = Array.from({ length: tiers }, () => [])
  for (const n of nodes) byTier[Math.max(0, Math.min(tiers - 1, n.tier))]!.push(n)
  const children = new Map<string, string[]>()
  for (const n of nodes) for (const r of n.requires) children.set(r.id, [...(children.get(r.id) ?? []), n.id])

  // Index → x within a tier (rows of PER_ROW, centred).
  const xAt = (i: number, len: number) => {
    const r = Math.floor(i / PER_ROW)
    const inRow = Math.min(PER_ROW, len - r * PER_ROW)
    return (i % PER_ROW - (inRow - 1) / 2) * COL
  }
  const xOf = new Map<string, number>()
  const assign = () => {
    for (const list of byTier) list.forEach((n, i) => xOf.set(n.id, xAt(i, list.length)))
  }
  // Sort a tier by a barycentre, keeping fork groups together.
  const sortTier = (t: number, bary: (n: TreeNode) => number | null) => {
    const list = byTier[t]!
    const units: TreeNode[][] = []
    const seen = new Map<string, TreeNode[]>()
    for (const n of list) {
      if (n.fork) {
        const g = seen.get(n.fork)
        if (g) {
          g.push(n)
          continue
        }
        const ng = [n]
        seen.set(n.fork, ng)
        units.push(ng)
      } else units.push([n])
    }
    const keyed = units.map((u, i) => {
      const bs = u.map(bary).filter((v): v is number => v != null)
      return { u, k: bs.length ? bs.reduce((a, b) => a + b, 0) / bs.length : xOf.get(u[0]!.id) ?? i * COL }
    })
    keyed.sort((a, b) => a.k - b.k)
    byTier[t] = keyed.flatMap((x) => x.u)
  }
  assign()
  const mean = (ids: string[]) => {
    const xs = ids.map((id) => xOf.get(id)).filter((v): v is number => v != null)
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  }
  for (let pass = 0; pass < 4; pass++) {
    for (let t = 1; t < tiers; t++) {
      sortTier(t, (n) => mean(n.requires.map((r) => r.id)))
      assign()
    }
    for (let t = tiers - 2; t >= 0; t--) {
      sortTier(t, (n) => mean(children.get(n.id) ?? []))
      assign()
    }
  }

  const placed: Placed[] = []
  const tierY: number[] = []
  let y = 70
  let maxCols = 1
  for (let t = 0; t < tiers; t++) {
    const list = byTier[t]!
    tierY.push(y - 46)
    if (list.length === 0) {
      y += 60
      continue
    }
    const rows = Math.ceil(list.length / PER_ROW)
    list.forEach((n, i) => {
      maxCols = Math.max(maxCols, Math.min(PER_ROW, list.length))
      placed.push({ n, x: xOf.get(n.id)!, y: y + Math.floor(i / PER_ROW) * (ROW - 20) })
    })
    y += rows * (ROW - 20) + 20
  }
  const width = Math.max(4, maxCols) * COL + 80
  for (const p of placed) p.x += width / 2
  return { placed, width, height: y - 20, tierY }
}

function Ring({ lvl, max, state }: { lvl: number; max: number; state: TreeNodeState }) {
  const c = 2 * Math.PI * (R - 3)
  const f = max > 0 ? Math.min(1, lvl / max) : 0
  return (
    <svg className="st-ring" viewBox="0 0 64 64" width={64} height={64} aria-hidden>
      <circle cx={32} cy={32} r={R - 3} className="st-ring__track" />
      {f > 0 ? (
        <circle
          cx={32}
          cy={32}
          r={R - 3}
          className={`st-ring__fill st-ring__fill--${state}`}
          strokeDasharray={`${c * f} ${c}`}
          transform="rotate(-90 32 32)"
        />
      ) : null}
    </svg>
  )
}

export function SkillTree({
  nodes,
  tiers,
  tint = 'var(--g2-tag)',
  selected,
  onSelect,
  renderDetail,
  reducedMotion = false,
  emptyText = 'Nothing here yet.',
}: {
  nodes: TreeNode[]
  tiers: TierInfo[]
  tint?: string
  selected: string | null
  onSelect: (id: string | null) => void
  renderDetail: (id: string) => ReactNode
  reducedMotion?: boolean
  emptyText?: string
}) {
  const { placed, width, height, tierY } = useMemo(() => layout(nodes, tiers.length), [nodes, tiers.length])
  const pos = useMemo(() => new Map(placed.map((p) => [p.n.id, p])), [placed])
  const viewRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null)

  // Fit the tree's width on open / tree change.
  const fit = () => {
    const el = viewRef.current
    if (!el) return
    const z = Math.max(0.45, Math.min(1, (el.clientWidth - 16) / width))
    setZoom(z)
    setPan({ x: (el.clientWidth - width * z) / 2, y: 0 })
  }
  useLayoutEffect(fit, [width, nodes.length > 0])
  // Refit when the board itself resizes (detail panel opening, window resize).
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])
  useEffect(() => {
    const el = viewRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      setZoom((z) => Math.max(0.35, Math.min(1.8, z * (e.deltaY < 0 ? 1.1 : 0.9))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Highlight the path to (ancestors of) the hovered or selected node.
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

  const forkBoxes = useMemo(() => {
    const g = new Map<string, Placed[]>()
    for (const p of placed) if (p.n.fork) g.set(p.n.fork, [...(g.get(p.n.fork) ?? []), p])
    return [...g.values()].filter((l) => l.length > 1)
  }, [placed])

  if (nodes.length === 0) return <p className="st-empty">{emptyText}</p>

  return (
    <div className={`st${selected ? ' has-detail' : ''}`} style={{ '--st-tint': tint } as React.CSSProperties}>
      <div
        ref={viewRef}
        className="st-view"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('.st-node')) return
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
          if (drag.current && !drag.current.moved) onSelect(null)
          drag.current = null
        }}
      >
        <div
          className={`st-canvas${reducedMotion ? '' : ' is-anim'}`}
          style={{ width, height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <svg className="st-links" width={width} height={height} aria-hidden>
            {tierY.map((y, t) => (
              <g key={t}>
                <line x1={20} x2={width - 20} y1={y} y2={y} className="st-tierline" />
              </g>
            ))}
            {forkBoxes.map((l, i) => {
              const xs = l.map((p) => p.x)
              const y = l[0]!.y
              return (
                <g key={i}>
                  <rect x={Math.min(...xs) - 58} y={y - 44} width={Math.max(...xs) - Math.min(...xs) + 116} height={108} rx={18} className="st-fork" />
                  <text x={(Math.min(...xs) + Math.max(...xs)) / 2} y={y - 50} textAnchor="middle" className="st-fork__label">
                    CHOOSE ONE
                  </text>
                </g>
              )
            })}
            {placed.map((p) =>
              p.n.requires.map((r) => {
                const from = pos.get(r.id)
                if (!from) return null
                const met = from.n.lvl >= r.level
                const on = lit.has(p.n.id) && lit.has(r.id)
                const y1 = from.y + R
                const y2 = p.y - R
                const mid = (y1 + y2) / 2
                return (
                  <path
                    key={`${r.id}-${p.n.id}`}
                    d={`M${from.x} ${y1} C${from.x} ${mid} ${p.x} ${mid} ${p.x} ${y2}`}
                    className={`st-link${met ? ' is-met' : ''}${on ? ' is-lit' : ''}`}
                  />
                )
              }),
            )}
            {placed
              .filter((p) => p.n.requires.length === 0 && p.n.tier > 0)
              .map((p) => (
                <line key={`stub-${p.n.id}`} x1={p.x} x2={p.x} y1={tierY[p.n.tier]!} y2={p.y - R} className="st-stub" />
              ))}
          </svg>
          {tiers.map((t, i) => (
            <div key={i} className="st-tier" style={{ top: tierY[i]! - 11 }}>
              <span>{t.label}</span>
              {t.note ? <small>{t.note}</small> : null}
            </div>
          ))}
          {placed.map(({ n, x, y }) => (
            <button
              key={n.id}
              type="button"
              className={`st-node st-node--${n.state}${selected === n.id ? ' is-sel' : ''}${lit.has(n.id) ? ' is-lit' : ''}${n.fork ? ' is-fork' : ''}`}
              style={{ left: x - 32, top: y - 32 }}
              onClick={() => onSelect(selected === n.id ? null : n.id)}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              aria-label={`${n.state === 'unknown' ? 'Unknown node' : n.name}, rank ${n.lvl} of ${n.max}`}
              aria-pressed={selected === n.id}
            >
              <span className="st-node__disc">
                <Ring lvl={n.lvl} max={n.max} state={n.state} />
                <span className="st-node__icon">{n.state === 'unknown' ? '?' : <StatGlyph stat={n.stat} />}</span>
                <span className="st-node__rank">{n.state === 'unknown' ? '' : n.lvl >= n.max ? '★' : `${n.lvl}/${n.max}`}</span>
              </span>
              <span className="st-node__name">{n.state === 'unknown' ? '???' : n.name}</span>
              {n.sub ? <span className="st-node__sub">{n.sub}</span> : null}
            </button>
          ))}
        </div>
        <div className="st-zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setZoom((z) => Math.min(1.8, z * 1.15))} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.35, z / 1.15))} aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={fit} aria-label="Fit">
            ⤢
          </button>
        </div>
        <p className="st-help">Drag to pan · Ctrl/⌘ + wheel to zoom · tap a node</p>
      </div>
      {selected ? <aside className="st-detail">{renderDetail(selected)}</aside> : null}
    </div>
  )
}

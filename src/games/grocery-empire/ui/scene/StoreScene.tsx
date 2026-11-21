import { memo, useEffect, useRef, useState } from 'react'
import { CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { salesBottleneck, shelfCap, shelfPrice } from '../../sim/formulas'
import { money, qty } from '../format'
import { sumQty } from '../../sim/helpers'
import type { GameState } from '../../sim/state'
import { networkBreakdown } from '../../sim/systems/network'

/**
 * The living store. Everything here is read from the sim: the facade grows with the
 * storefront tier, window shelves show real stock, shoppers walk in at the real sales
 * rate, and the skyline / harbor / sky fill in as the empire spreads.
 */

const W = 1200
const H = 260
const GROUND = 214
/** Far stores stand on a horizon behind the street, so they read as distance. */
const HORIZON = 196
/** Era 4+: the street ends at the water. */
const HARBOR_X = 820

const CAT_COLOR: Record<CategoryId, string> = {
  cans: 'var(--sc-cans)',
  household: 'var(--sc-household)',
  produce: 'var(--sc-produce)',
  dairy: 'var(--sc-dairy)',
  meat: 'var(--sc-meat)',
  deli: 'var(--sc-meat)',
  bakery: 'var(--sc-cans)',
  frozen: 'var(--sc-dairy)',
  privateLabel: 'var(--sc-label)',
  import: 'var(--sc-label)',
  ration: 'var(--sc-cans)',
}

/** Facade geometry per storefront tier (1 = stall … 10 = Last Aisle). */
const FACADE = [
  { w: 150, h: 70, floors: 0, name: 'Stall' },
  { w: 150, h: 70, floors: 0, name: 'Stall' },
  { w: 230, h: 112, floors: 1, name: 'Corner Store' },
  { w: 300, h: 128, floors: 1, name: 'Standard Store' },
  { w: 380, h: 120, floors: 1, name: 'Supermarket' },
  { w: 440, h: 124, floors: 2, name: 'Hypermarket' },
  { w: 500, h: 128, floors: 2, name: 'Megastore' },
  { w: 540, h: 132, floors: 2, name: 'Autonomous Hub' },
  { w: 580, h: 148, floors: 3, name: 'Probe Plaza' },
  { w: 620, h: 162, floors: 3, name: 'Greenhouse Atrium' },
  { w: 660, h: 176, floors: 3, name: 'The Last Aisle' },
] as const

const SKY: { top: string; bottom: string }[] = [
  { top: '#3b2b4a', bottom: '#c97d55' }, // 0 dusk
  { top: '#2a2a4e', bottom: '#b46a4f' }, // 1
  { top: '#1d2442', bottom: '#6d4a5c' }, // 2 evening
  { top: '#131a33', bottom: '#3c3956' }, // 3 night city
  { top: '#0d1430', bottom: '#28365a' }, // 4 harbor night
  { top: '#070b1f', bottom: '#1b2147' }, // 5 orbit
  { top: '#04060f', bottom: '#151236' }, // 6 universal
  { top: '#120e2a', bottom: '#3a2418' }, // 7 survey
  { top: '#0c1c2e', bottom: '#1e4a55' }, // 8 dock
  { top: '#1a2430', bottom: '#3e4a32' }, // 9 season
  { top: '#140e28', bottom: '#3a2060' }, // 10 mast
  { top: '#1a140c', bottom: '#6a4a22' }, // 11 seal
  { top: '#0a0a12', bottom: '#2a2418' }, // 12 list
]

/** Daylight versions of each era's sky; the scene blends toward SKY at night. */
const DAY_SKY: { top: string; bottom: string }[] = [
  { top: '#5f8fc4', bottom: '#f3c98f' },
  { top: '#5a87bd', bottom: '#efc28c' },
  { top: '#4f79ad', bottom: '#e1b48d' },
  { top: '#3f6596', bottom: '#c99f8e' },
  { top: '#3a5f8f', bottom: '#9fb2c4' },
  { top: '#2a3f73', bottom: '#7b86b3' },
  { top: '#1b2452', bottom: '#5a5a9a' },
  { top: '#3a4e86', bottom: '#e7b48a' },
  { top: '#2f5f78', bottom: '#d7c4a4' },
  { top: '#4a6a48', bottom: '#e4c48a' },
  { top: '#3a3068', bottom: '#c9b4e0' },
  { top: '#6a5430', bottom: '#e6d2a4' },
  { top: '#2a2838', bottom: '#d9c7a2' },
]

const SEASON_TINT = ['#7d9a62', '#e0a15a', '#c46a3a', '#6a78b8'] as const

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a)
  const [r2, g2, b2] = hex(b)
  const f = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `rgb(${f(r1, r2)} ${f(g1, g2)} ${f(b1, b2)})`
}

/** One in-game day is one weather cycle. 0 = midnight, 0.5 = noon. */
const DAY_SEC = 180

export function dayPhase(s: GameState): number {
  return (((s.time ?? 0) / DAY_SEC) + 0.3) % 1
}

/** 0 at noon, 1 deep night. */
export function darkness(phase: number): number {
  const d = Math.cos(phase * Math.PI * 2) // 1 at midnight, -1 at noon
  return Math.max(0, Math.min(1, 0.5 + d * 0.75))
}

/** Deterministic pseudo-random in [0,1) from an integer — stable across renders. */
function rnd(i: number) {
  const x = Math.sin(i * 9301.17 + 49297.3) * 233280
  return x - Math.floor(x)
}

function Shopper({ i, lane, paused }: { i: number; lane: 'in' | 'out'; paused: boolean }) {
  const hue = Math.floor(rnd(i + 3) * 360)
  const dur = 7 + rnd(i) * 5
  const delay = -rnd(i + 11) * dur
  const y = GROUND - 2 + (lane === 'in' ? 0 : 8)
  return (
    <g
      className={`sc-shopper sc-shopper--${lane}`}
      style={{
        animationDuration: `${dur}s`,
        animationDelay: `${delay}s`,
        animationPlayState: paused ? 'paused' : 'running',
      }}
    >
      <g transform={`translate(0 ${y})`}>
        <rect x={-4} y={-17} width={8} height={12} rx={3} fill={`hsl(${hue} 45% 62%)`} />
        <circle cx={0} cy={-21} r={3.6} fill="#e9c9a4" />
        {lane === 'out' ? <rect x={3} y={-11} width={6} height={7} rx={1.5} fill="#e8dcc0" /> : null}
        <rect x={-3.5} y={-5} width={2.5} height={5} fill="#2b2b33" />
        <rect x={1} y={-5} width={2.5} height={5} fill="#2b2b33" />
      </g>
    </g>
  )
}

function Hills({ count }: { count: number }) {
  const n = Math.min(10, count)
  if (n <= 0) return null
  return (
    <g className="sc-hills">
      {Array.from({ length: n }, (_, i) => {
        const cx = 60 + (i / Math.max(1, n - 1)) * 1080
        const r = 70 + rnd(i + 200) * 50
        return <ellipse key={i} cx={cx} cy={GROUND + 10} rx={r * 1.8} ry={r * 0.55} fill="var(--sc-hill)" />
      })}
    </g>
  )
}

function Harbor({ lanes, paused, right = W }: { lanes: number; paused: boolean; right?: number }) {
  const n = Math.min(10, lanes)
  return (
    <g className="sc-harbor">
      <rect x={HARBOR_X} y={GROUND - 6} width={Math.max(0, right - HARBOR_X)} height={H - GROUND + 6} fill="var(--sc-water)" />
      {Array.from({ length: n }, (_, i) => (
        <g
          key={i}
          className="sc-ship"
          style={{
            animationDuration: `${28 + rnd(i + 300) * 22}s`,
            animationDelay: `${-rnd(i + 301) * 40}s`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          <g transform={`translate(0 ${GROUND + 6 + (i % 3) * 12})`}>
            <path d="M-26 0 L26 0 L18 9 L-20 9 Z" fill="var(--sc-hull)" />
            <rect x={-14} y={-9} width={10} height={9} fill="var(--sc-tag)" />
            <rect x={-2} y={-9} width={10} height={9} fill="var(--sc-produce)" />
            <rect x={10} y={-14} width={4} height={14} fill="var(--sc-hull)" />
          </g>
        </g>
      ))}
    </g>
  )
}

function Barges({ count, paused }: { count: number; paused: boolean }) {
  const n = Math.min(12, count)
  return (
    <g className="sc-barges">
      {Array.from({ length: n }, (_, i) => (
        <g
          key={i}
          className="sc-barge"
          style={{
            animationDuration: `${40 + rnd(i + 500) * 30}s`,
            animationDelay: `${-rnd(i + 501) * 60}s`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          <g transform={`translate(0 ${26 + rnd(i + 502) * 60})`}>
            <ellipse cx={0} cy={0} rx={18} ry={5} fill="var(--sc-barge)" />
            <ellipse cx={0} cy={-3} rx={8} ry={4} fill="var(--sc-window)" opacity={0.8} />
            <circle cx={-20} cy={0} r={2} fill="var(--sc-produce)" />
          </g>
        </g>
      ))}
    </g>
  )
}

function Stars({ era }: { era: number }) {
  if (era < 3) return null
  const n = era >= 5 ? 70 : 30
  return (
    <g className="sc-stars">
      {Array.from({ length: n }, (_, i) => (
        <circle
          key={i}
          cx={rnd(i + 900) * W}
          cy={rnd(i + 901) * 120}
          r={rnd(i + 902) > 0.9 ? 1.4 : 0.8}
          fill="#fff"
          opacity={0.3 + rnd(i + 903) * 0.6}
        />
      ))}
    </g>
  )
}

function Rain({ on }: { on: boolean }) {
  if (!on) return null
  return (
    <g className="sc-rain">
      {Array.from({ length: 40 }, (_, i) => (
        <line
          key={i}
          x1={rnd(i + 700) * W}
          y1={rnd(i + 701) * H}
          x2={rnd(i + 700) * W - 6}
          y2={rnd(i + 701) * H + 14}
          stroke="#9fb4c8"
          strokeWidth={1}
          opacity={0.35}
          style={{ animationDelay: `${-rnd(i + 702)}s` }}
        />
      ))}
    </g>
  )
}


function SunMoon({ phase, dark }: { phase: number; dark: number }) {
  // The sun rides the day arc; the moon rides the night one.
  const sunT = (phase - 0.25) * 2 // 0..1 across daytime (phase .25 → .75)
  const moonT = ((phase + 0.25) % 1) * 2 // 0..1 across night (phase .75 → .25)
  const arc = (t: number) => ({ x: 80 + t * (W - 160), y: 150 - Math.sin(t * Math.PI) * 120 })
  return (
    <g className="sc-sky-bodies">
      {sunT > -0.05 && sunT < 1.05 ? (
        <g opacity={1 - dark * 0.9}>
          <circle cx={arc(sunT).x} cy={arc(sunT).y} r={34} fill="#ffe7a8" opacity={0.18} />
          <circle cx={arc(sunT).x} cy={arc(sunT).y} r={16} fill="#ffe08a" />
        </g>
      ) : null}
      {moonT > -0.05 && moonT < 1.05 ? (
        <g opacity={dark}>
          <circle cx={arc(moonT).x} cy={arc(moonT).y} r={22} fill="#dfe6ff" opacity={0.12} />
          <circle cx={arc(moonT).x} cy={arc(moonT).y} r={11} fill="#eef1ff" />
          <circle cx={arc(moonT).x + 5} cy={arc(moonT).y - 3} r={9} fill="url(#sc-sky)" />
        </g>
      ) : null}
    </g>
  )
}

function Clouds({ count, grey, paused }: { count: number; grey: boolean; paused: boolean }) {
  return (
    <g className="sc-clouds">
      {Array.from({ length: count }, (_, i) => (
        <g
          key={i}
          className="sc-cloud"
          style={{
            animationDuration: `${90 + rnd(i + 1200) * 80}s`,
            animationDelay: `${-rnd(i + 1201) * 160}s`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          <g transform={`translate(0 ${24 + rnd(i + 1202) * 70}) scale(${0.7 + rnd(i + 1203) * 0.7})`} fill={grey ? '#7d8896' : '#f3efe6'} opacity={grey ? 0.55 : 0.22}>
            <ellipse cx={0} cy={0} rx={38} ry={11} />
            <ellipse cx={-14} cy={-7} rx={16} ry={11} />
            <ellipse cx={10} cy={-10} rx={20} ry={13} />
          </g>
        </g>
      ))}
    </g>
  )
}

function Snow({ on }: { on: boolean }) {
  if (!on) return null
  return (
    <g className="sc-snow">
      {Array.from({ length: 40 }, (_, i) => (
        <circle
          key={i}
          cx={rnd(i + 1300) * W}
          cy={-10}
          r={0.8 + rnd(i + 1301) * 1.6}
          fill="#f4f7ff"
          opacity={0.75}
          style={{ animationDuration: `${5 + rnd(i + 1302) * 6}s`, animationDelay: `${-rnd(i + 1303) * 10}s` }}
        />
      ))}
    </g>
  )
}

function HeatHaze({ on }: { on: boolean }) {
  if (!on) return null
  return (
    <g className="sc-heat">
      <rect x={0} y={GROUND - 40} width={W} height={60} fill="url(#sc-heat)" />
      {Array.from({ length: 6 }, (_, i) => (
        <path
          key={i}
          d={`M${i * 210} ${GROUND - 8} q25 -6 50 0 t50 0 t50 0 t50 0`}
          stroke="#ffd9a0"
          strokeWidth={1.2}
          fill="none"
          opacity={0.35}
          style={{ animationDelay: `${-i * 0.6}s` }}
        />
      ))}
    </g>
  )
}

const RIVAL_LOOK: Record<string, { color: string; initials: string }> = {
  penny: { color: '#c2563a', initials: 'PP' },
  freshway: { color: '#3f7d58', initials: 'FW' },
  megamart: { color: '#2f5d9e', initials: 'MM' },
  halo: { color: '#6b4fa8', initials: 'HP' },
}

/** The Relic Museum, once it opens: columns, pediment, a gem that glows at night. */
function MuseumShape() {
  return (
    <g className="sc-museum">
      <rect x={0} y={-8} width={96} height={8} fill="#cfc6b4" />
      <path d="M-4 -56 L48 -80 L100 -56 Z" fill="#e6dcc8" />
      <rect x={4} y={-56} width={88} height={6} fill="#d8cdb6" />
      {[10, 30, 50, 70].map((cx) => (
        <rect key={cx} x={cx} y={-50} width={10} height={42} fill="#efe6d4" />
      ))}
      <circle cx={48} cy={-66} r={5} fill="#ff6b8b" className="sc-museum-gem" />
    </g>
  )
}

/** When checkout is the limit, shoppers queue outside the door. */
function Queue({ n, doorX }: { n: number; doorX: number }) {
  if (n <= 0) return null
  return (
    <g className="sc-queue">
      {Array.from({ length: Math.min(9, n) }, (_, i) => {
        const hue = Math.floor(rnd(i + 1400) * 360)
        return (
          <g key={i} transform={`translate(${doorX - 18 - i * 12} ${GROUND - 2})`}>
            <g className="sc-queue-p" style={{ animationDelay: `${-i * 0.37}s` }}>
            <rect x={-4} y={-17} width={8} height={12} rx={3} fill={`hsl(${hue} 45% 62%)`} />
            <circle cx={0} cy={-21} r={3.6} fill="#e9c9a4" />
            <rect x={-3.5} y={-5} width={2.5} height={5} fill="#2b2b33" />
            <rect x={1} y={-5} width={2.5} height={5} fill="#2b2b33" />
            </g>
          </g>
        )
      })}
    </g>
  )
}


interface View {
  x0: number
  w: number
  /** Top of the visible slice and its height. The banner crops the sky and keeps the street. */
  y0: number
  h: number
}

/** The banner's slice: from just above the tallest facade to just under the kerb. */
const BAND = { y0: 84, h: 146 }

/** One tower on the far horizon (a chain store you own). */
function Tower({ i, x, tierLights }: { i: number; x: number; tierLights: number }) {
  const w = 34 + rnd(i + 40) * 18
  const h = 44 + rnd(i + 80) * (34 + tierLights * 8)
  const left = x - w / 2
  const rows = Math.max(2, Math.floor(h / 14))
  return (
    <g>
      <rect x={left} y={HORIZON - h} width={w} height={h} fill="var(--sc-building)" />
      <rect x={left + 3} y={HORIZON - h + 4} width={w - 6} height={5} rx={1} fill="var(--sc-tag)" opacity={0.85} />
      {Array.from({ length: rows - 1 }, (_, r) =>
        Array.from({ length: 3 }, (_, c) =>
          rnd(i * 31 + r * 7 + c) > 0.35 ? (
            <rect
              key={`${r}-${c}`}
              x={left + 5 + c * ((w - 10) / 3)}
              y={HORIZON - h + 14 + r * 13}
              width={(w - 10) / 3 - 4}
              height={7}
              fill="var(--sc-window)"
              opacity={0.55 + rnd(i + r + c) * 0.45}
            />
          ) : null,
        ),
      )}
    </g>
  )
}

function FarRival({ id, stores, bought, x }: { id: string; stores: number; bought: boolean; x: number }) {
  const look = RIVAL_LOOK[id] ?? { color: '#888', initials: '??' }
  const w = 56
  const h = 40 + Math.min(22, stores * 2)
  const color = bought ? 'var(--sc-tag)' : look.color
  return (
    <g transform={`translate(${x - w / 2} ${HORIZON - h})`}>
      <rect width={w} height={h} fill="var(--sc-building)" stroke={color} strokeWidth={1.5} />
      <rect x={4} y={4} width={w - 8} height={12} rx={2} fill={color} />
      <text x={w / 2} y={13.5} textAnchor="middle" className="sc-rival-text">
        {bought ? `${look.initials} ✓` : look.initials}
      </text>
      {Array.from({ length: 5 }, (_, k) => (
        <path key={k} d={`M${4 + k * 9.6} 19 h9.6 l-1 5 h-7.6z`} fill={k % 2 ? color : 'var(--sc-receipt)'} opacity={0.85} />
      ))}
      <rect x={6} y={28} width={w - 12} height={h - 30} fill="var(--sc-window)" opacity={0.3} />
    </g>
  )
}

function FarPlants({ n, x }: { n: number; x: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const px = x - 27 + i * 18
        return (
          <g key={i}>
            <rect x={px} y={HORIZON - 30} width={16} height={30} fill="var(--sc-plant)" />
            <rect x={px + 10} y={HORIZON - 42} width={4} height={14} fill="var(--sc-plant)" />
            <circle className="sc-steam" cx={px + 12} cy={HORIZON - 46} r={4} style={{ animationDelay: `${-i * 0.7}s` }} />
          </g>
        )
      })}
    </g>
  )
}

/**
 * Everything on the far horizon shares one row of slots, handed out outward from the
 * flagship: the museum first, then rivals, cold plants, and your chain's towers. Nothing
 * overlaps, and wider screens simply show more of the row.
 */
function Horizon({
  s,
  view,
  gapL,
  gapR,
  tier,
  museumOpen,
  rightLimit,
}: {
  s: GameState
  view: View
  gapL: number
  gapR: number
  tier: number
  museumOpen: boolean
  rightLimit: number
}) {
  type Item = { kind: 'museum' } | { kind: 'rival'; id: string; stores: number; bought: boolean } | { kind: 'plants'; n: number } | { kind: 'tower'; i: number }
  const items: Item[] = []
  if (museumOpen) items.push({ kind: 'museum' })
  for (const [id, r] of Object.entries(s.rivals ?? {})) items.push({ kind: 'rival', id, stores: r.bought ? r.boughtStores : r.stores, bought: r.bought })
  let plants = Math.min(12, s.cold?.plants ?? 0)
  while (plants > 0) {
    items.push({ kind: 'plants', n: Math.min(3, plants) })
    plants -= 3
  }
  const towers = Math.min(40, Math.max(0, s.stores.length - 1) + (s.fleet?.franchises ?? 0))
  for (let i = 0; i < towers; i++) items.push({ kind: 'tower', i })

  const step = 64
  const lo = view.x0 + 34
  const hi = Math.min(view.x0 + view.w - 34, rightLimit)
  let l = gapL - 36
  let r = gapR + 36
  const placed: { item: Item; x: number }[] = []
  for (const item of items) {
    const canL = l >= lo
    const canR = r <= hi
    if (!canL && !canR) break
    // Alternate sides, preferring whichever side has more room left.
    const goR = canR && (!canL || hi - r >= l - lo)
    if (goR) {
      placed.push({ item, x: r })
      r += step
    } else {
      placed.push({ item, x: l })
      l -= step
    }
  }
  return (
    <g className="sc-horizon">
      {placed.map(({ item, x }, k) =>
        item.kind === 'tower' ? (
          <Tower key={k} i={item.i} x={x} tierLights={tier} />
        ) : item.kind === 'rival' ? (
          <FarRival key={k} id={item.id} stores={item.stores} bought={item.bought} x={x} />
        ) : item.kind === 'plants' ? (
          <FarPlants key={k} n={item.n} x={x} />
        ) : (
          <g key={k} transform={`translate(${x - 35} ${HORIZON}) scale(0.72)`}>
            <MuseumShape />
          </g>
        ),
      )}
    </g>
  )
}

function Facade({ s, x, pennants = [] }: { s: GameState; x: number; pennants?: readonly number[] }) {
  const tier = Math.max(1, Math.min(FACADE.length - 1, s.builds.storefront ?? 1))
  const f = FACADE[tier]!
  const top = GROUND - f.h
  const cap = Math.max(1, shelfCap(s))
  const open = CATEGORY_IDS.filter((c) => s.categories[c])
  // Window shelves: three rows; blocks = share of shelf stock, colored by category.
  const winX = x + 18
  const winW = f.w * 0.55
  const winY = GROUND - 62
  const winH = 48
  const slots = Math.max(8, Math.floor(winW / 9))
  const blocks: { c: CategoryId; n: number }[] = []
  let total = 0
  for (const c of open) {
    const q = sumQty(s.shelf, c)
    total += q
    blocks.push({ c, n: q })
  }
  const fill = Math.min(1, total / cap)
  const filled = Math.round(fill * slots * 3)
  const seq: CategoryId[] = []
  for (const b of blocks) {
    const k = total > 0 ? Math.round((b.n / total) * filled) : 0
    for (let i = 0; i < k; i++) seq.push(b.c)
  }
  const doorX = x + f.w * 0.66
  const awning = ['var(--sc-tomato)', 'var(--sc-receipt)']
  const stripes = Math.max(6, Math.round(f.w / 22))
  const name = s.storeName || (s.stores[0]?.name ?? 'Grocery Empire')
  const signCut = tier <= 1 ? 20 : 74

  return (
    <g className="sc-facade">
      {/* upper floors */}
      {Array.from({ length: f.floors }, (_, i) => (
        <g key={i}>
          <rect x={x + 6} y={top - (i + 1) * 24} width={f.w - 12} height={24} fill="var(--sc-brick)" />
          {Array.from({ length: Math.floor((f.w - 12) / 40) }, (_, k) => (
            <rect
              key={k}
              x={x + 16 + k * 40}
              y={top - (i + 1) * 24 + 6}
              width={22}
              height={12}
              fill="var(--sc-window)"
              opacity={rnd(k + i * 13) > 0.3 ? 0.85 : 0.25}
            />
          ))}
        </g>
      ))}
      {/* body */}
      <rect x={x} y={top} width={f.w} height={f.h} fill="var(--sc-brick)" />
      {/* Completed museum wings fly as pennants along the roofline. */}
      {pennants.length > 0 ? (
        <g className="sc-bunting" aria-hidden>
          <path
            d={`M${x + 4} ${top - 3} Q${x + f.w / 2} ${top + 5} ${x + f.w - 4} ${top - 3}`}
            fill="none"
            stroke="#e8dcc4"
            strokeOpacity="0.6"
          />
          {pennants.map((hue, i) => {
            const n = pennants.length
            const px = x + 10 + ((f.w - 20) * (i + 0.5)) / n
            const sag = 10 * (1 - Math.pow((2 * (i + 0.5)) / n - 1, 2))
            const py = top - 3 + sag * 0.5
            return <path key={i} d={`M${px - 5} ${py} L${px + 5} ${py} L${px} ${py + 11} Z`} fill={`hsl(${hue} 70% 58%)`} />
          })}
        </g>
      ) : null}
      {/* sign */}
      <rect x={x + 10} y={top + 6} width={f.w - signCut} height={24} rx={3} fill="var(--sc-sign)" />
      <text
        x={x + 10 + (f.w - signCut) / 2}
        y={top + 23}
        textAnchor="middle"
        className="sc-sign-text"
        // A long name narrows to fit the board instead of spilling over the brick.
        textLength={name.length > 11 ? Math.max(40, f.w - signCut - 14) : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {name}
      </text>
      {/* awning */}
      <g>
        {Array.from({ length: stripes }, (_, i) => (
          <path
            key={i}
            d={`M${x - 6 + (i * (f.w + 12)) / stripes} ${top + 34} h${(f.w + 12) / stripes} l-2 16 h${-((f.w + 12) / stripes) + 4} z`}
            fill={awning[i % 2]}
          />
        ))}
      </g>
      {/* window with shelves */}
      <rect x={winX} y={winY - 6} width={winW} height={winH + 10} rx={2} fill="var(--sc-glass)" />
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <rect x={winX + 2} y={winY + row * 16 + 11} width={winW - 4} height={2} fill="var(--sc-shelf)" />
          {Array.from({ length: slots }, (_, i) => {
            const c = seq[row * slots + i]
            if (!c) return null
            return (
              <rect
                key={i}
                x={winX + 4 + i * ((winW - 8) / slots)}
                y={winY + row * 16}
                width={(winW - 8) / slots - 1.5}
                height={11}
                rx={1}
                fill={CAT_COLOR[c]}
              />
            )
          })}
        </g>
      ))}
      {total <= 0 && s.stats.sold > 0 ? (
        <g className="sc-soldout">
          <rect x={winX + winW / 2 - 40} y={winY + 10} width={80} height={20} rx={3} fill="var(--sc-tomato)" />
          <text x={winX + winW / 2} y={winY + 24} textAnchor="middle" className="sc-soldout-text">
            SOLD OUT
          </text>
        </g>
      ) : null}
      {/* neon open sign (on the stall it hangs in the window) */}
      <g className={s.paused ? 'sc-neon is-off' : 'sc-neon'} transform={tier <= 1 ? `translate(${-f.w + 62 + winW - 40} ${winY - top + 4})` : undefined}>
        <rect x={x + f.w - 56} y={top + 10} width={44} height={16} rx={8} fill="none" stroke="var(--sc-tomato)" strokeWidth={2} />
        <text x={x + f.w - 34} y={top + 21.5} textAnchor="middle" className="sc-neon-text">
          Open
        </text>
      </g>
      {/* door */}
      <rect x={doorX} y={GROUND - 54} width={30} height={54} fill="var(--sc-door)" />
      <rect x={doorX + 3} y={GROUND - 50} width={24} height={28} fill="var(--sc-window)" opacity={0.7} />
      {/* checkout lanes glow (cashiers) */}
      {Array.from({ length: Math.min(6, s.staff.filter((m) => m.role === 'cashier').length) }, (_, i) => (
        <rect
          key={i}
          x={doorX + 38 + i * 9}
          y={GROUND - 30}
          width={6}
          height={30}
          rx={1}
          fill="var(--sc-tag)"
          opacity={0.75}
        />
      ))}
      <text x={x + f.w / 2} y={GROUND + 18} textAnchor="middle" className="sc-tier">
        {f.name}
      </text>
    </g>
  )
}


/** What you've built shows up on the street. */
function Props({ s, x, w }: { s: GameState; x: number; w: number }) {
  const b = s.builds
  const storage = b.storage ?? 1
  const cold = b.cold ?? 0
  const prod = b.production ?? 0
  const transit = b.transit ?? 0
  const civic = b.civic ?? 0
  const endcaps = Math.min(5, s.endcaps ?? 0)
  const right = x + w
  return (
    <g className="sc-props">
      {/* stockroom / warehouse annex */}
      {storage >= 2 ? (
        <g>
          <rect x={x - 70 - (storage - 2) * 30} y={GROUND - 54 - (storage - 2) * 10} width={70 + (storage - 2) * 30} height={54 + (storage - 2) * 10} fill="#4a3530" />
          <rect x={x - 58 - (storage - 2) * 30} y={GROUND - 34} width={44} height={34} fill="#6b6e72" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={x - 58 - (storage - 2) * 30} y={GROUND - 32 + i * 8} width={44} height={1.5} fill="#55585c" />
          ))}
        </g>
      ) : null}
      {/* rooftop cold units */}
      {Array.from({ length: Math.min(4, cold) }, (_, i) => (
        <g key={i}>
          <rect x={x + 20 + i * 34} y={GROUND - (FACADE[Math.max(1, Math.min(FACADE.length - 1, b.storefront ?? 1))]!.h) - 18} width={26} height={18} fill="#8a949c" />
          <circle cx={x + 33 + i * 34} cy={GROUND - (FACADE[Math.max(1, Math.min(FACADE.length - 1, b.storefront ?? 1))]!.h) - 9} r={6} fill="#5d666e" />
        </g>
      ))}
      {/* garden plots */}
      {prod >= 1
        ? Array.from({ length: Math.min(4, prod + 1) }, (_, i) => (
            <g key={i}>
              <rect x={x - 150 + i * 30} y={GROUND - 10} width={24} height={10} fill="#6b4a2e" />
              {[0, 1, 2].map((k) => (
                <path key={k} d={`M${x - 145 + i * 30 + k * 7} ${GROUND - 10} q2 -9 4 0`} fill="var(--sc-produce)" />
              ))}
            </g>
          ))
        : null}
      {/* sidewalk endcap crates */}
      {Array.from({ length: endcaps }, (_, i) => (
        <g key={i}>
          <rect x={right + 6 + (i % 3) * 16} y={GROUND - 12 - Math.floor(i / 3) * 11} width={14} height={11} fill="#8a6a43" />
          <rect x={right + 7 + (i % 3) * 16} y={GROUND - 14 - Math.floor(i / 3) * 11} width={12} height={4} rx={2} fill={['var(--sc-produce)', 'var(--sc-tomato)', 'var(--sc-tag)'][i % 3]} />
        </g>
      ))}
      {/* transport */}
      {transit === 1 ? (
        <g transform={`translate(${right + 70} ${GROUND - 2})`}>
          <circle cx={0} cy={-6} r={6} fill="none" stroke="#c8ccd2" strokeWidth={2} />
          <circle cx={22} cy={-6} r={6} fill="none" stroke="#c8ccd2" strokeWidth={2} />
          <rect x={8} y={-20} width={16} height={10} fill="var(--sc-tag)" />
          <path d="M0 -6 L10 -16 L22 -6" stroke="#c8ccd2" strokeWidth={2} fill="none" />
        </g>
      ) : transit >= 2 ? (
        <g transform={`translate(${right + 70} ${GROUND})`}>
          <rect x={0} y={-30 - (transit >= 3 ? 8 : 0)} width={transit >= 3 ? 88 : 58} height={24 + (transit >= 3 ? 8 : 0)} rx={4} fill="#e9e3d6" />
          <rect x={transit >= 3 ? 62 : 38} y={-26 - (transit >= 3 ? 8 : 0)} width={16} height={10} fill="#1e2a2b" />
          <rect x={6} y={-24} width={transit >= 3 ? 50 : 26} height={6} fill="var(--sc-tomato)" />
          <circle cx={14} cy={-5} r={6} fill="#24282b" />
          <circle cx={transit >= 3 ? 72 : 46} cy={-5} r={6} fill="#24282b" />
        </g>
      ) : null}
      {/* parking & plaza */}
      {civic >= 1
        ? [0, 1, 2, 3].map((i) => (
            <rect key={i} x={right + 170 + i * 30} y={GROUND + 10} width={2} height={20} fill="rgba(239,233,220,0.35)" />
          ))
        : null}
      {civic >= 2 ? (
        <g>
          <rect x={x - 230} y={GROUND - 9} width={34} height={4} fill="#7a5b3c" />
          <rect x={x - 228} y={GROUND - 5} width={3} height={5} fill="#3a2d22" />
          <rect x={x - 202} y={GROUND - 5} width={3} height={5} fill="#3a2d22" />
          <rect x={x - 260} y={GROUND - 26} width={4} height={26} fill="#4a3628" />
          <circle cx={x - 258} cy={GROUND - 34} r={14} fill="#2f5a3a" />
        </g>
      ) : null}
    </g>
  )
}

function Lamps({ xs }: { xs: number[] }) {
  return (
    <g className="sc-lamps">
      {xs.map((lx) => (
        <g key={lx}>
          <ellipse cx={lx} cy={GROUND + 2} rx={46} ry={8} fill="url(#sc-lamp)" />
          <rect x={lx - 1.5} y={GROUND - 70} width={3} height={70} fill="#2b3236" />
          <rect x={lx - 9} y={GROUND - 74} width={18} height={5} rx={2} fill="#2b3236" />
          <circle cx={lx} cy={GROUND - 68} r={3.5} fill="#ffe2a0" />
          <path d={`M${lx - 6} ${GROUND - 66} L${lx - 40} ${GROUND} L${lx + 40} ${GROUND} L${lx + 6} ${GROUND - 66} Z`} fill="url(#sc-lamp)" opacity={0.5} />
        </g>
      ))}
    </g>
  )
}

/** Off-world crates by the door, tinted walkers, and a convoy shuttle from Era 8. */
function LateStreetBits({
  stocked,
  circuits,
  bay,
  doorX,
  paused,
  bonded,
  vaulted,
  ivo,
}: {
  stocked: number
  circuits: number
  bay: number
  doorX: number
  paused: boolean
  bonded: number
  vaulted: number
  ivo: boolean
}) {
  const tints = ['#6ea8c9', '#c45a3c', '#6a9a55', '#8d84c4', '#c6a15a', '#efe9dc']
  const aliens = Math.min(6, stocked)
  return (
    <g className="sc-late-street" aria-hidden>
      {Array.from({ length: Math.min(8, Math.max(bay, stocked)) }, (_, i) => (
        <rect
          key={`crate-${i}`}
          x={doorX - 70 + (i % 4) * 16}
          y={GROUND - 18 - Math.floor(i / 4) * 14}
          width="12"
          height="10"
          rx="1"
          fill={tints[i % tints.length]}
          opacity="0.9"
        />
      ))}
      {Array.from({ length: aliens }, (_, i) => (
        <g
          key={`alien-${i}`}
          className="sc-shopper sc-shopper--in"
          style={{
            ['--door' as string]: `${doorX}px`,
            animationDelay: `${i * 0.7}s`,
            animationPlayState: paused ? 'paused' : 'running',
            color: tints[i % tints.length],
          }}
          transform={`translate(${doorX - 120 - i * 28} ${GROUND - 8})`}
        >
          <ellipse cx="0" cy="8" rx="6" ry="2.5" fill="#000" opacity="0.3" />
          <path d="M-5 0 Q0 8 5 0 V-6 H-5 Z" fill="currentColor" />
          <circle cy="-10" r="4.5" fill="#e6c2a0" />
          <circle cx="-1.5" cy="-11" r="1.2" fill="currentColor" />
          <circle cx="1.5" cy="-11" r="1.2" fill="currentColor" />
        </g>
      ))}
      {circuits > 0 ? (
        <g transform={`translate(${doorX + 90} ${GROUND - 36})`}>
          <rect width="48" height="22" rx="3" fill="#8fb6e0" />
          <path d="M8 -4 L24 -14 L40 -4" fill="none" stroke="#efe9dc" strokeWidth="2" />
          <circle cx="12" cy="24" r="5" fill="#1a1612" />
          <circle cx="36" cy="24" r="5" fill="#1a1612" />
        </g>
      ) : null}
      {bonded > 0 ? (
        <g transform={`translate(${doorX - 150} ${GROUND - 48})`}>
          <rect width="54" height="36" rx="2" fill="#2a2620" stroke="#c6a15a" strokeWidth="1.5" />
          <path d="M6 8 H48 M6 16 H48 M6 24 H32" stroke="#c6a15a" strokeWidth="1.2" opacity="0.7" />
          <text x="27" y="46" textAnchor="middle" fontSize="9" fill="#c6a15a">
            {Math.min(99, Math.floor(bonded))} sealed
          </text>
        </g>
      ) : null}
      {vaulted > 0 ? (
        <g transform={`translate(${doorX + 160} ${GROUND - 52})`}>
          <rect width="44" height="40" rx="4" fill="#1a2830" stroke="#9fd4e4" strokeWidth="1.6" />
          <ellipse cx="22" cy="18" rx="12" ry="8" fill="#9fd4e4" opacity="0.35" />
          <text x="22" y="50" textAnchor="middle" fontSize="9" fill="#9fd4e4">
            vault
          </text>
        </g>
      ) : null}
      {ivo ? (
        <g
          className="sc-shopper sc-shopper--in"
          style={{
            ['--door' as string]: `${doorX}px`,
            animationPlayState: paused ? 'paused' : 'running',
            color: '#efe9dc',
          }}
          transform={`translate(${doorX + 40} ${GROUND - 8})`}
        >
          <title>Ivo</title>
          <ellipse cx="0" cy="8" rx="6" ry="2.5" fill="#000" opacity="0.3" />
          <path d="M-5 0 Q0 8 5 0 V-6 H-5 Z" fill="#4a5560" />
          <circle cy="-10" r="4.5" fill="#d4b896" />
          <rect x="-8" y="-22" width="16" height="6" rx="1" fill="#c6a15a" />
        </g>
      ) : null}
    </g>
  )
}

function HorizonMarks({
  era,
  x,
  w,
  h,
  season,
}: {
  era: number
  x: number
  w: number
  h: number
  season: number
}) {
  if (era < 7) return null
  const roof = GROUND - h
  const tint = SEASON_TINT[season] ?? SEASON_TINT[0]
  return (
    <g className="sc-horizon-marks" aria-hidden>
      <g transform={`translate(${x + w * 0.62} ${roof - 28})`}>
        <rect x={-2} y={0} width={4} height={22} fill="#d7d2c8" />
        <ellipse cx={14} cy={4} rx={22} ry={9} fill="#e7e1d4" stroke="#8a8174" strokeWidth={1.4} />
        <ellipse cx={14} cy={4} rx={8} ry={3} fill="#8a8174" opacity={0.35} />
      </g>
      {era >= 8 ? (
        <g transform={`translate(${HARBOR_X - 78} ${GROUND - 46})`}>
          <rect width={64} height={12} rx={1} fill="#6a543c" />
          <rect x={8} y={-32} width={5} height={32} fill="#3e342c" />
          <rect x={8} y={-36} width={36} height={5} fill="#3e342c" />
          <rect x={36} y={-28} width={3} height={16} fill="#c45a3c" />
        </g>
      ) : null}
      {era >= 9 ? <rect x={x - 8} y={roof - 16} width={w + 16} height={14} fill={tint} opacity={0.9} /> : null}
      {era >= 10 ? (
        <g transform={`translate(${x - 46} ${roof - 78})`}>
          <rect width={4} height={78} fill="#2a2624" />
          <rect x={4} y={0} width={18} height={3} fill="#2a2624" />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={16} cy={10 + i * 16} r={5} fill="#f2d48a" />
          ))}
        </g>
      ) : null}
      {era >= 11 ? (
        <g transform={`translate(${x + w + 28} ${roof + 28})`}>
          <circle r={16} fill="none" stroke="#c6a15a" strokeWidth={2.4} />
          <circle r={7} fill="#c6a15a" opacity={0.9} />
        </g>
      ) : null}
      {era >= 12 ? (
        <g transform={`translate(${x + 18} ${roof + 22})`}>
          <rect width={22} height={32} rx={2} fill="#f4efe4" stroke="#2a241c" strokeWidth={1.2} />
          <path d="M4 8 H18 M4 14 H18 M4 20 H12" stroke="#2a241c" strokeWidth={1.3} />
        </g>
      ) : null}
    </g>
  )
}

function SceneInner({
  s,
  museumOpen,
  view,
  reducedMotion = false,
  pennants = [],
}: {
  s: GameState
  museumOpen: boolean
  view: View
  reducedMotion?: boolean
  /** One hue per completed museum wing: bunting along the roofline. */
  pennants?: readonly number[]
}) {
  const era = Math.max(0, Math.min(SKY.length - 1, s.era))
  const phase = dayPhase(s)
  const dark = darkness(phase)
  const sky = {
    top: mix(DAY_SKY[era]!.top, SKY[era]!.top, dark),
    bottom: mix(DAY_SKY[era]!.bottom, SKY[era]!.bottom, dark),
  }
  if (s.era >= 9) {
    const tint = SEASON_TINT[s.horizon?.season ?? 0] ?? SEASON_TINT[0]
    sky.top = mix(sky.top, tint, 0.28)
    sky.bottom = mix(sky.bottom, tint, 0.16)
  }
  const net = networkBreakdown(s)
  const chainStores = Math.max(0, s.stores.length - 1) + (s.fleet?.franchises ?? 0)
  const sold = Math.max(0, s.rates.soldPerSec)
  const flagshipSold = sold / Math.max(1, net.total)
  const walkers = s.stats.sold <= 0 ? 0 : Math.max(1, Math.min(14, Math.round(1 + Math.log2(1 + flagshipSold * 3) * 3)))
  const paused = !!s.paused || reducedMotion
  const tier = Math.max(1, Math.min(FACADE.length - 1, s.builds.storefront ?? 1))
  const queueLen = salesBottleneck(s).kind === 'checkout' && s.stats.sold > 0 ? Math.round(3 + Math.log2(1 + flagshipSold) * 2) : 0
  // Keep the flagship centred so any screen shape (phone included) shows it.
  const facadeX = (era >= 4 ? 470 : 600) - FACADE[tier]!.w / 2

  return (
    <svg
      className="sc-svg"
      viewBox={`${view.x0} ${view.y0} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label={`${FACADE[tier]!.name}. ${chainStores} other stores. Selling ${sold.toFixed(1)} baskets a second.`}
    >
      <defs>
        <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="1" stopColor={sky.bottom} />
        </linearGradient>
        <linearGradient id="sc-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.bottom} stopOpacity="0" />
          <stop offset="1" stopColor={sky.bottom} stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="sc-lamp" cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-heat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb36b" stopOpacity="0" />
          <stop offset="1" stopColor="#ffb36b" stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id="sc-glow" cx="0.5" cy="1" r="0.6">
          <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={view.x0} width={view.w} height={H} fill="url(#sc-sky)" />
      <g opacity={era >= 5 ? Math.max(0.35, dark) : dark * 0.9}>
        <g transform={`translate(${view.x0} 0) scale(${view.w / W} 1)`}>
          <Stars era={Math.max(3, era)} />
        </g>
      </g>
      <SunMoon phase={phase} dark={dark} />
      <g transform={`translate(${view.x0} 0) scale(${view.w / W} 1)`}>
        <Clouds count={s.weather.now === 'rain' ? 7 : 4} grey={s.weather.now === 'rain'} paused={paused} />
      </g>
      <Barges count={s.fleet?.barges ?? 0} paused={paused} />
      <Hills count={s.politics?.acquisitions ?? 0} />
      <Horizon
        s={s}
        view={view}
        gapL={facadeX - 20}
        gapR={facadeX + FACADE[tier]!.w + 20}
        tier={tier}
        museumOpen={museumOpen}
        rightLimit={view.x0 + view.w}
      />
      <rect x={view.x0} y={HORIZON - 60} width={view.w} height={80} fill="url(#sc-haze)" />
      {(s.fleet?.lanes ?? 0) > 0 || era >= 4 ? <Harbor lanes={s.fleet?.lanes ?? 0} paused={paused} right={view.x0 + view.w} /> : null}
      {/* street */}
      <rect x={view.x0} y={GROUND} width={Math.max(0, (era >= 4 ? HARBOR_X : view.x0 + view.w) - view.x0)} height={H - GROUND} fill="var(--sc-street)" />
      <rect x={view.x0} y={GROUND} width={Math.max(0, (era >= 4 ? HARBOR_X : view.x0 + view.w) - view.x0)} height={4} fill="var(--sc-curb)" />
      <ellipse cx={facadeX + FACADE[tier]!.w * 0.6} cy={GROUND} rx={FACADE[tier]!.w * 0.8} ry={70} fill="url(#sc-glow)" />
      <g opacity={0.25 + dark * 0.75}>
        <Lamps xs={[facadeX - 110, facadeX + FACADE[tier]!.w + 140]} />
      </g>
      <Props s={s} x={facadeX} w={FACADE[tier]!.w} />
      <Facade s={s} x={facadeX} pennants={pennants} />
      <HorizonMarks
        era={s.era}
        x={facadeX}
        w={FACADE[tier]!.w}
        h={FACADE[tier]!.h}
        season={s.horizon?.season ?? 0}
      />
      <g className="sc-shoppers" style={{ ['--door' as string]: `${facadeX + FACADE[tier]!.w * 0.66 + 15}px` }}>
        {Array.from({ length: walkers }, (_, i) => (
          <Shopper key={`in-${i}`} i={i} lane="in" paused={paused} />
        ))}
        {Array.from({ length: Math.max(0, walkers - 1) }, (_, i) => (
          <Shopper key={`out-${i}`} i={i + 50} lane="out" paused={paused} />
        ))}
      </g>
      {s.era >= 7 ? (
        <LateStreetBits
          stocked={s.horizon?.planets?.filter((p) => p.stocked).length ?? 0}
          circuits={s.horizon?.circuits?.length ?? 0}
          bay={s.offworld?.bay?.length ?? 0}
          doorX={facadeX + FACADE[tier]!.w * 0.66}
          paused={paused}
          bonded={(s.builds.storage ?? 0) >= 6 ? (s.bonded?.crates ?? 0) : 0}
          vaulted={(s.builds.storage ?? 0) >= 7 ? (s.seedVault?.held ?? 0) : 0}
          ivo={(s.builds.civic ?? 0) >= 7 || s.era >= 12}
        />
      ) : null}
      <Queue n={queueLen} doorX={facadeX + FACADE[tier]!.w * 0.66} />
      <g transform={`translate(${view.x0} 0) scale(${view.w / W} 1)`}>
        <Rain on={s.weather.now === 'rain'} />
        <Snow on={s.weather.now === 'cold'} />
        <HeatHaze on={s.weather.now === 'heat'} />
      </g>
      {/* night falls over everything but the lights */}
      <rect x={view.x0} width={view.w} height={H} fill="#060914" opacity={dark * 0.28} pointerEvents="none" />
    </svg>
  )
}

/** Where the flagship sits, shared by the static and live layers. */
function layoutOf(s: GameState) {
  const era = Math.max(0, Math.min(SKY.length - 1, s.era))
  const tier = Math.max(1, Math.min(FACADE.length - 1, s.builds.storefront ?? 1))
  const f = FACADE[tier]!
  const x = (era >= 4 ? 470 : 600) - f.w / 2
  return { era, tier, f, x, top: GROUND - f.h, doorX: x + f.w * 0.66 + 15 }
}

/** Re-render at most when something visible changed (not every 100 ms tick). */
function sceneKey(s: GameState, museumOpen: boolean, reducedMotion: boolean) {
  const shelf = CATEGORY_IDS.map((c) => (s.categories[c] ? Math.round(sumQty(s.shelf, c) / 2) : -1)).join(',')
  return [
    s.era,
    s.builds.storefront,
    s.stores.length,
    s.stores[0]?.name,
    s.storeName,
    s.fleet?.franchises,
    s.fleet?.lanes,
    s.fleet?.barges,
    s.politics?.acquisitions,
    s.cold?.plants,
    s.weather.now,
    s.paused,
    reducedMotion ? 1 : 0,
    s.offworld?.bay?.length ?? 0,
    s.horizon?.planets?.filter((p) => p.stocked).length ?? 0,
    s.horizon?.circuits?.length ?? 0,
    Math.round(Math.log2(1 + Math.max(0, s.rates.soldPerSec)) * 4),
    s.staff.length,
    s.builds.storage,
    s.builds.cold,
    s.builds.production,
    s.builds.transit,
    s.builds.civic,
    s.endcaps,
    shelf,
    // ~48 steps a day keep the sun moving smoothly without repainting every tick.
    Math.floor(dayPhase(s) * 48),
    Object.entries(s.rivals ?? {})
      .map(([id, r]) => `${id}${r.stores}${r.bought ? 'b' : ''}`)
      .join(','),
    salesBottleneck(s).kind,
    museumOpen,
  ].join('|')
}

const Memo = memo(
  ({
    s,
    museumOpen,
    view,
    reducedMotion,
    pennants,
  }: {
    s: GameState
    k: string
    museumOpen: boolean
    view: View
    reducedMotion: boolean
    pennants: readonly number[]
  }) => <SceneInner s={s} museumOpen={museumOpen} view={view} reducedMotion={reducedMotion} pennants={pennants} />,
  (a, b) => a.k === b.k && a.pennants.join() === b.pennants.join() && a.view.w === b.view.w && a.view.x0 === b.view.x0 && a.view.h === b.view.h,
)

const NO_PENNANTS: readonly number[] = []

/** Visible slice of the 1200-wide world: wider containers see more sky and street. */
function useView(ref: React.RefObject<HTMLDivElement | null>, center: number, band: boolean): View {
  const span = band ? BAND.h : H
  const [w, setW] = useState(W)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      if (r.height <= 0) return
      // Phones frame the flagship tightly; wide screens see more of the street.
      const want = Math.max(band ? 360 : 620, Math.round(((r.width / r.height) * span) / 20) * 20)
      setW(want)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, band, span])
  const y0 = band ? BAND.y0 : 0
  return w >= W ? { x0: -(w - W) / 2, w, y0, h: span } : { x0: center - w / 2, w, y0, h: span }
}

interface Coin {
  id: number
  x: number
  text: string
}

/**
 * The live layer, repainted with the HUD: coins rise from the register with the real
 * takings, the delivery truck rolls in as its ETA runs down, spotlights sweep during a
 * celebrity endcap, and the marquee scrolls today's numbers.
 */
function SceneLive({ s, reducedMotion, view }: { s: GameState; reducedMotion: boolean; view: View }) {
  const L = layoutOf(s)
  const [coins, setCoins] = useState<Coin[]>([])
  const last = useRef(0)
  const nextId = useRef(1)
  const rev = Math.max(0, s.rates.revenuePerSec)

  // Own interval — do not re-arm on every shell paint / sim-second.
  const revBucket = Math.round(rev * 4) / 4
  useEffect(() => {
    if (reducedMotion || s.paused || revBucket <= 0) return
    const drops: number[] = []
    const fire = () => {
      const id = nextId.current++
      const x = L.doorX + (Math.random() - 0.5) * 40
      setCoins((c) => [...c.slice(-5), { id, x, text: `+${money(revBucket * 1.1)}` }])
      drops.push(
        window.setTimeout(() => {
          setCoins((c) => c.filter((k) => k.id !== id))
        }, 1700),
      )
    }
    const now = performance.now()
    if (now - last.current >= 1100) {
      last.current = now
      fire()
    }
    const t = window.setInterval(() => {
      last.current = performance.now()
      fire()
    }, 1100)
    return () => {
      window.clearInterval(t)
      for (const d of drops) window.clearTimeout(d)
    }
  }, [reducedMotion, s.paused, revBucket, L.doorX])

  // Truck: appears 30 s out and drives to the loading dock.
  // Order.eta is already remaining seconds (market ticks it down).
  const remaining = (s.orders ?? []).reduce<number | null>((m, o) => (m == null || o.eta < m ? o.eta : m), null)
  const dockX = L.x - 70
  const truckX = remaining != null && remaining <= 30 ? dockX - (Math.max(0, remaining) / 30) * (dockX + 140) : null

  const celeb = (s.campaigns?.celebrityUntil ?? 0) > s.time
  const price = shelfPrice(s, 'cans')
  const marquee = `CANS ${money(price)}  ·  ${s.rates.soldPerSec < 10 ? Math.max(0, s.rates.soldPerSec).toFixed(1) : qty(s.rates.soldPerSec)} BASKETS/S  ·  ${
    s.weather.now === 'fair' ? 'FAIR SKIES' : s.weather.now.toUpperCase()
  }  ·  ${s.stores.length > 1 ? `${s.stores.length} STORES` : 'OPEN DAILY'}  ·  `
  const showMarquee = L.tier >= 3

  return (
    <svg
      className="sc-live"
      viewBox={`${view.x0} ${view.y0} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden
    >
      <defs>
        <clipPath id="sc-marquee-clip">
          <rect x={L.x + 12} y={L.top + 52} width={L.f.w * 0.55} height={11} />
        </clipPath>
        <linearGradient id="sc-beam" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff6d0" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff6d0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {celeb && !reducedMotion ? (
        <g className="sc-spot">
          <path className="sc-beam sc-beam--a" d={`M${L.x + 20} ${GROUND} l-40 -220 l70 0 z`} fill="url(#sc-beam)" />
          <path className="sc-beam sc-beam--b" d={`M${L.x + L.f.w - 20} ${GROUND} l-30 -220 l70 0 z`} fill="url(#sc-beam)" />
          {[0, 1, 2].map((i) => (
            <circle key={i} className="sc-flash" cx={L.x + 30 + i * (L.f.w / 3)} cy={GROUND - 20} r={10} fill="#fff" style={{ animationDelay: `${i * 0.45}s` }} />
          ))}
        </g>
      ) : null}

      {showMarquee ? (
        <g clipPath="url(#sc-marquee-clip)">
          <rect x={L.x + 12} y={L.top + 52} width={L.f.w * 0.55} height={11} fill="#120d0a" />
          <text x={L.x + 12} y={L.top + 60.5} className={`sc-marquee${reducedMotion ? ' is-still' : ''}`}>
            {marquee.repeat(3)}
          </text>
        </g>
      ) : null}

      {truckX != null ? (
        <g transform={`translate(${truckX} ${GROUND})`} className="sc-truck">
          <rect x={0} y={-30} width={62} height={24} rx={3} fill="#e9e3d6" />
          <rect x={4} y={-25} width={36} height={7} fill="var(--sc-tomato)" />
          <path d="M62 -24 h14 l8 10 v8 h-22z" fill="#d7cfbf" />
          <rect x={66} y={-21} width={9} height={7} fill="#1e2a2b" />
          <circle cx={14} cy={-5} r={6} fill="#24282b" />
          <circle cx={70} cy={-5} r={6} fill="#24282b" />
          <circle cx={84} cy={-11} r={2} fill="#ffe08a" />
        </g>
      ) : null}

      {coins.map((c) => (
        <g key={c.id} className="sc-coin" style={{ ['--x' as string]: `${c.x}px` }}>
          <circle cx={c.x} cy={GROUND - 40} r={6} fill="#f2c14e" stroke="#9a7520" strokeWidth={1.2} />
          <text x={c.x + 10} y={GROUND - 36} className="sc-coin-text">
            {c.text}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function StoreScene({
  state,
  museumOpen = false,
  reducedMotion = false,
  band = false,
  pennants = NO_PENNANTS,
}: {
  state: GameState
  museumOpen?: boolean
  /** Hues of completed museum wings. */
  pennants?: readonly number[]
  reducedMotion?: boolean
  /** Short banner: crops the sky and keeps the street, so the store stays large. */
  band?: boolean
}) {
  const dark = darkness(dayPhase(state))
  const ref = useRef<HTMLDivElement>(null)
  const L = layoutOf(state)
  const view = useView(ref, L.x + L.f.w / 2 - 40, band)
  const live = !reducedMotion && !state.paused
  return (
    <div
      ref={ref}
      className={`sc-scene${band ? ' sc-scene--band' : ''}${dark > 0.55 ? ' is-night' : ''}${live ? ' is-live' : ''}${state.paused ? ' is-paused' : ''}`.trim()}
    >
      <Memo
        s={state}
        k={sceneKey(state, museumOpen, reducedMotion)}
        museumOpen={museumOpen}
        view={view}
        reducedMotion={reducedMotion}
        pennants={pennants}
      />
      <SceneLive s={state} reducedMotion={reducedMotion} view={view} />
    </div>
  )
}

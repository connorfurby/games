import { memo } from 'react'
import { CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { shelfCap } from '../../sim/formulas'
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
  privateLabel: 'var(--sc-label)',
}

/** Facade geometry per storefront tier (1 = stall … 7 = autonomous hub). */
const FACADE = [
  { w: 150, h: 70, floors: 0, name: 'Stall' },
  { w: 150, h: 70, floors: 0, name: 'Stall' },
  { w: 230, h: 112, floors: 1, name: 'Corner Store' },
  { w: 300, h: 128, floors: 1, name: 'Standard Store' },
  { w: 380, h: 120, floors: 1, name: 'Supermarket' },
  { w: 440, h: 124, floors: 2, name: 'Hypermarket' },
  { w: 500, h: 128, floors: 2, name: 'Megastore' },
  { w: 540, h: 132, floors: 2, name: 'Autonomous Hub' },
] as const

const SKY: { top: string; bottom: string }[] = [
  { top: '#3b2b4a', bottom: '#c97d55' }, // 0 dusk
  { top: '#2a2a4e', bottom: '#b46a4f' }, // 1
  { top: '#1d2442', bottom: '#6d4a5c' }, // 2 evening
  { top: '#131a33', bottom: '#3c3956' }, // 3 night city
  { top: '#0d1430', bottom: '#28365a' }, // 4 harbor night
  { top: '#070b1f', bottom: '#1b2147' }, // 5 orbit
  { top: '#04060f', bottom: '#151236' }, // 6 universal
]

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

/** Horizon slots, alternating left and right of the flagship, outward. */
function skylineSlots(n: number, gapL: number, gapR: number, x1: number): number[] {
  const out: number[] = []
  const step = 58
  let l = gapL - 40
  let r = gapR + 40
  for (let i = 0; i < n; i++) {
    const goRight = i % 2 === 0 ? r < x1 : l < 20
    if (goRight) {
      out.push(r)
      r += step
    } else {
      out.push(l)
      l -= step
    }
  }
  return out
}

function Skyline({
  count,
  gapL,
  gapR,
  x1,
  tierLights,
}: {
  count: number
  gapL: number
  gapR: number
  x1: number
  tierLights: number
}) {
  const n = Math.min(24, count)
  if (n <= 0) return null
  const slots = skylineSlots(n, gapL, gapR, x1)
  return (
    <g className="sc-skyline">
      {Array.from({ length: n }, (_, i) => {
        const w = 34 + rnd(i + 40) * 20
        const h = 46 + rnd(i + 80) * (40 + tierLights * 10)
        const x = slots[i]! - w / 2
        const rows = Math.max(2, Math.floor(h / 14))
        return (
          <g key={i}>
            <rect x={x} y={HORIZON - h} width={w} height={h} fill="var(--sc-building)" />
            <rect x={x + 3} y={HORIZON - h + 4} width={w - 6} height={5} rx={1} fill="var(--sc-tag)" opacity={0.85} />
            {Array.from({ length: rows - 1 }, (_, r) =>
              Array.from({ length: 3 }, (_, c) =>
                rnd(i * 31 + r * 7 + c) > 0.35 ? (
                  <rect
                    key={`${r}-${c}`}
                    x={x + 5 + c * ((w - 10) / 3)}
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
      })}
    </g>
  )
}

function Plants({ count, x }: { count: number; x: number }) {
  const n = Math.min(10, count)
  if (n <= 0) return null
  return (
    <g className="sc-plants">
      {Array.from({ length: n }, (_, i) => {
        const px = x + i * 30
        return (
          <g key={i}>
            <rect x={px} y={GROUND - 40} width={24} height={40} fill="var(--sc-plant)" />
            <rect x={px + 15} y={GROUND - 58} width={5} height={20} fill="var(--sc-plant)" />
            <circle className="sc-steam" cx={px + 17.5} cy={GROUND - 62} r={5} style={{ animationDelay: `${-i * 0.7}s` }} />
          </g>
        )
      })}
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

function Harbor({ lanes, paused }: { lanes: number; paused: boolean }) {
  const n = Math.min(10, lanes)
  return (
    <g className="sc-harbor">
      <rect x={HARBOR_X} y={GROUND - 6} width={W - HARBOR_X} height={H - GROUND + 6} fill="var(--sc-water)" />
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
      {Array.from({ length: 60 }, (_, i) => (
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

function Facade({ s, x }: { s: GameState; x: number }) {
  const tier = Math.max(1, Math.min(7, s.builds.storefront ?? 1))
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
  const name = s.stores[0]?.name ?? 'Grocery Empire'
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
      {/* sign */}
      <rect x={x + 10} y={top + 6} width={f.w - signCut} height={24} rx={3} fill="var(--sc-sign)" />
      <text x={x + 10 + (f.w - signCut) / 2} y={top + 23} textAnchor="middle" className="sc-sign-text">
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
          <rect x={x + 20 + i * 34} y={GROUND - (FACADE[Math.max(1, Math.min(7, b.storefront ?? 1))]!.h) - 18} width={26} height={18} fill="#8a949c" />
          <circle cx={x + 33 + i * 34} cy={GROUND - (FACADE[Math.max(1, Math.min(7, b.storefront ?? 1))]!.h) - 9} r={6} fill="#5d666e" />
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

function SceneInner({ s }: { s: GameState }) {
  const era = Math.max(0, Math.min(6, s.era))
  const sky = SKY[era]!
  const net = networkBreakdown(s)
  const chainStores = Math.max(0, s.stores.length - 1) + (s.fleet?.franchises ?? 0)
  const sold = Math.max(0, s.rates.soldPerSec)
  const flagshipSold = sold / Math.max(1, net.total)
  const walkers = s.stats.sold <= 0 ? 0 : Math.max(1, Math.min(14, Math.round(1 + Math.log2(1 + flagshipSold * 3) * 3)))
  const paused = !!s.paused
  const tier = Math.max(1, Math.min(7, s.builds.storefront ?? 1))
  // Keep the flagship centred so any screen shape (phone included) shows it.
  const facadeX = (era >= 4 ? 470 : 600) - FACADE[tier]!.w / 2

  return (
    <svg
      className="sc-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
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
        <radialGradient id="sc-glow" cx="0.5" cy="1" r="0.6">
          <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sc-sky)" />
      <Stars era={era} />
      <Barges count={s.fleet?.barges ?? 0} paused={paused} />
      <Hills count={s.politics?.acquisitions ?? 0} />
      <Skyline
        count={chainStores}
        gapL={facadeX - 20}
        gapR={facadeX + FACADE[tier]!.w + 20}
        x1={era >= 4 ? 1180 : 1180}
        tierLights={tier}
      />
      <rect x={0} y={HORIZON - 60} width={W} height={80} fill="url(#sc-haze)" />
      <Plants count={s.cold?.plants ?? 0} x={era >= 4 ? 40 : 880} />
      {(s.fleet?.lanes ?? 0) > 0 || era >= 4 ? <Harbor lanes={s.fleet?.lanes ?? 0} paused={paused} /> : null}
      {/* street */}
      <rect x={0} y={GROUND} width={era >= 4 ? HARBOR_X : W} height={H - GROUND} fill="var(--sc-street)" />
      <rect x={0} y={GROUND} width={era >= 4 ? HARBOR_X : W} height={4} fill="var(--sc-curb)" />
      <ellipse cx={facadeX + FACADE[tier]!.w * 0.6} cy={GROUND} rx={FACADE[tier]!.w * 0.8} ry={70} fill="url(#sc-glow)" />
      <Lamps xs={[facadeX - 110, facadeX + FACADE[tier]!.w + 140]} />
      <Props s={s} x={facadeX} w={FACADE[tier]!.w} />
      <Facade s={s} x={facadeX} />
      <g className="sc-shoppers" style={{ ['--door' as string]: `${facadeX + FACADE[tier]!.w * 0.66 + 15}px` }}>
        {Array.from({ length: walkers }, (_, i) => (
          <Shopper key={`in-${i}`} i={i} lane="in" paused={paused} />
        ))}
        {Array.from({ length: Math.max(0, walkers - 1) }, (_, i) => (
          <Shopper key={`out-${i}`} i={i + 50} lane="out" paused={paused} />
        ))}
      </g>
      <Rain on={s.weather.now === 'rain'} />
    </svg>
  )
}

/** Re-render at most when something visible changed (not every 100 ms tick). */
function sceneKey(s: GameState) {
  const shelf = CATEGORY_IDS.map((c) => (s.categories[c] ? Math.round(sumQty(s.shelf, c) / 2) : -1)).join(',')
  return [
    s.era,
    s.builds.storefront,
    s.stores.length,
    s.stores[0]?.name,
    s.fleet?.franchises,
    s.fleet?.lanes,
    s.fleet?.barges,
    s.politics?.acquisitions,
    s.cold?.plants,
    s.weather.now,
    s.paused,
    Math.round(Math.log2(1 + Math.max(0, s.rates.soldPerSec)) * 4),
    s.staff.length,
    s.builds.storage,
    s.builds.cold,
    s.builds.production,
    s.builds.transit,
    s.builds.civic,
    s.endcaps,
    shelf,
  ].join('|')
}

const Memo = memo(
  ({ s }: { s: GameState; k: string }) => <SceneInner s={s} />,
  (a, b) => a.k === b.k,
)

export function StoreScene({ state }: { state: GameState }) {
  return (
    <div className="sc-scene">
      <Memo s={state} k={sceneKey(state)} />
    </div>
  )
}


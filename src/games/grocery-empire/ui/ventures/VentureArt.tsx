import { memo, type ReactElement } from 'react'
import type { VentureSign } from './ventureLook'
import './ventureArt.css'

/**
 * Procedural venture storefronts. The building grows with each expansion tier
 * (cart → shop → two storeys → tower), its windows light up with level, and the
 * sign carries the venture's glyph. Unopened ventures are an empty lot "for lease".
 */

const SIGN: Record<VentureSign, ReactElement> = {
  cup: <path d="M6 9h10v5a5 5 0 0 1-10 0zM16 10h2a2 2 0 0 1 0 4h-2M8 5c0-1 1-1 1-2M11 5c0-1 1-1 1-2" />,
  box: <path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8" />,
  cloche: <path d="M4 16h16M6 16a6 6 0 0 1 12 0M12 9V7M10 7h4" />,
  ghost: <path d="M6 20V11a6 6 0 0 1 12 0v9l-2-2-2 2-2-2-2 2-2-2zM10 11h0M14 11h0" />,
  chip: <path d="M7 4h10l-1 3 1 3-1 3 1 3-1 3H8l-1-3 1-3-1-3 1-3zM10 10l4 3" />,
  chart: <path d="M4 19h16M5 16l4-5 3 3 6-8M15 6h3v3" />,
  flake: <path d="M12 3v18M4.5 7.5l15 9M4.5 16.5l15-9M10 4.5l2 2 2-2M10 19.5l2-2 2 2" />,
  camera: <path d="M4 8h3l2-2h6l2 2h3v10H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
  planet: <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM3 15c3-1 15-6 18-9M3 15c-1 2 3 2 6 1M21 6c1-2-2-2-4-1" />,
  column: <path d="M5 6h14M6 6l6-3 6 3M7 8v9M12 8v9M17 8v9M5 19h14" />,
}

export function SignGlyph({ sign, size = 18, color = 'currentColor' }: { sign: VentureSign; size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {SIGN[sign]}
    </svg>
  )
}

interface ArtProps {
  hue: number
  sign: VentureSign
  /** −1 = not opened. */
  tier: number
  level: number
  maxLevel: number
  /** 0–1 till fill, drives coin pops. */
  fill?: number
  motion?: boolean
  compact?: boolean
}

function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h} ${s}% ${l}% / ${a})`
}

/** Window grid that lights `lit` of `cols × rows` windows, bottom-up. */
function Windows({ x, y, cols, rows, w, h, gap, lit, hue }: { x: number; y: number; cols: number; rows: number; w: number; h: number; gap: number; lit: number; hue: number }) {
  const out: ReactElement[] = []
  const total = cols * rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = (rows - 1 - r) * cols + c
      const on = idx < Math.round(lit * total)
      out.push(
        <rect
          key={`${r}-${c}`}
          x={x + c * (w + gap)}
          y={y + r * (h + gap)}
          width={w}
          height={h}
          rx={1}
          fill={on ? hsl(45, 95, 70) : hsl(hue, 20, 18)}
          opacity={on ? 0.95 : 0.9}
          className={on ? 'va-win is-on' : 'va-win'}
        />,
      )
    }
  }
  return <g>{out}</g>
}

function Awning({ x, y, w, hue }: { x: number; y: number; w: number; hue: number }) {
  const n = Math.max(3, Math.round(w / 9))
  const sw = w / n
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <path
          key={i}
          d={`M${x + i * sw} ${y} h${sw} v7 a${sw / 2} ${sw / 2.4} 0 0 1 ${-sw} 0z`}
          fill={i % 2 ? '#f3ead8' : hsl(hue, 62, 48)}
        />
      ))}
    </g>
  )
}

function SignPlate({ cx, cy, r, hue, sign, glow }: { cx: number; cy: number; r: number; hue: number; sign: VentureSign; glow?: boolean }) {
  const s = (r * 2 * 0.62) / 24
  return (
    <g className={glow ? 'va-neon' : undefined}>
      <circle cx={cx} cy={cy} r={r} fill={hsl(hue, 40, 14)} stroke={hsl(hue, 80, glow ? 66 : 56)} strokeWidth={1.6} />
      <g transform={`translate(${cx - 12 * s} ${cy - 12 * s}) scale(${s})`} fill="none" stroke={hsl(hue, 90, glow ? 78 : 70)} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {SIGN[sign]}
      </g>
    </g>
  )
}

function Building({ hue, sign, tier, lit }: { hue: number; sign: VentureSign; tier: number; lit: number }) {
  const wall = hsl(hue, 22, 26)
  const wallD = hsl(hue, 24, 19)
  const trim = hsl(hue, 30, 36)
  if (tier === 0) {
    // Cart / kiosk on wheels.
    return (
      <g>
        <rect x={58} y={70} width={44} height={22} rx={3} fill={wall} />
        <rect x={58} y={70} width={44} height={4} fill={trim} />
        <rect x={62} y={76} width={36} height={10} rx={1.5} fill={hsl(45, 90, 65, 0.25 + lit * 0.6)} />
        <line x1={61} y1={52} x2={61} y2={70} stroke={trim} strokeWidth={2} />
        <line x1={99} y1={52} x2={99} y2={70} stroke={trim} strokeWidth={2} />
        <Awning x={54} y={48} w={52} hue={hue} />
        <circle cx={66} cy={95} r={4.5} fill="#151a1a" stroke={trim} strokeWidth={1.5} />
        <circle cx={94} cy={95} r={4.5} fill="#151a1a" stroke={trim} strokeWidth={1.5} />
        <SignPlate cx={80} cy={40} r={8} hue={hue} sign={sign} />
      </g>
    )
  }
  if (tier === 1) {
    return (
      <g>
        <rect x={40} y={46} width={80} height={52} fill={wall} />
        <rect x={38} y={42} width={84} height={6} fill={trim} />
        <rect x={44} y={66} width={30} height={32} fill={hsl(45, 90, 62, 0.2 + lit * 0.55)} stroke={trim} />
        <rect x={84} y={70} width={14} height={28} fill={wallD} stroke={trim} />
        <rect x={102} y={66} width={14} height={14} fill={hsl(45, 90, 62, 0.2 + lit * 0.55)} stroke={trim} />
        <Awning x={40} y={56} w={80} hue={hue} />
        <rect x={52} y={47} width={56} height={9} rx={2} fill={hsl(hue, 40, 12)} />
        <SignPlate cx={80} cy={34} r={8} hue={hue} sign={sign} />
      </g>
    )
  }
  if (tier === 2) {
    return (
      <g>
        <rect x={30} y={30} width={100} height={68} fill={wall} />
        <rect x={28} y={26} width={104} height={6} fill={trim} />
        <rect x={112} y={14} width={8} height={14} fill={wallD} />
        <Windows x={36} y={36} cols={6} rows={2} w={11} h={8} gap={5} lit={lit} hue={hue} />
        <rect x={30} y={62} width={100} height={3} fill={trim} />
        <Awning x={30} y={65} w={100} hue={hue} />
        <rect x={36} y={76} width={40} height={22} fill={hsl(45, 90, 62, 0.25 + lit * 0.5)} stroke={trim} />
        <rect x={84} y={76} width={16} height={22} fill={wallD} stroke={trim} />
        <rect x={106} y={76} width={18} height={14} fill={hsl(45, 90, 62, 0.25 + lit * 0.5)} stroke={trim} />
        <SignPlate cx={56} cy={20} r={9} hue={hue} sign={sign} glow />
      </g>
    )
  }
  // Tower.
  return (
    <g>
      <rect x={52} y={8} width={56} height={90} fill={wall} />
      <rect x={30} y={52} width={24} height={46} fill={wallD} />
      <rect x={106} y={44} width={26} height={54} fill={wallD} />
      <line x1={80} y1={8} x2={80} y2={-4} stroke={trim} strokeWidth={1.5} />
      <circle cx={80} cy={-5} r={1.8} fill={hsl(0, 90, 60)} className="va-beacon" />
      <Windows x={57} y={30} cols={4} rows={6} w={9} h={6} gap={4} lit={lit} hue={hue} />
      <Windows x={34} y={58} cols={2} rows={3} w={6} h={5} gap={4} lit={lit} hue={hue} />
      <Windows x={110} y={50} cols={2} rows={4} w={7} h={5} gap={4} lit={lit} hue={hue} />
      <rect x={52} y={86} width={56} height={12} fill={hsl(45, 90, 62, 0.3 + lit * 0.5)} />
      <SignPlate cx={80} cy={18} r={9} hue={hue} sign={sign} glow />
    </g>
  )
}

function ArtImpl({ hue, sign, tier, level, maxLevel, fill = 0, motion = true, compact = false }: ArtProps) {
  const lit = maxLevel > 0 ? Math.max(0, Math.min(1, level / maxLevel)) : 0
  const opened = tier >= 0
  const sky = opened ? `url(#va-sky-${hue})` : hsl(200, 10, 13)
  return (
    <svg
      className={`va${motion ? ' is-live' : ''}${compact ? ' is-compact' : ''}`}
      viewBox="0 -8 160 112"
      preserveAspectRatio="xMidYMax slice"
      style={compact ? undefined : { width: '100%', height: 96 }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`va-sky-${hue}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={hsl(hue, 45, 22)} />
          <stop offset="1" stopColor={hsl(hue, 30, 11)} />
        </linearGradient>
        <radialGradient id={`va-glow-${hue}`} cx="0.5" cy="0.9" r="0.6">
          <stop offset="0" stopColor={hsl(hue, 80, 55, 0.35)} />
          <stop offset="1" stopColor={hsl(hue, 80, 55, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={-8} width={160} height={112} fill={sky} />
      {opened ? <rect x={0} y={-8} width={160} height={112} fill={`url(#va-glow-${hue})`} /> : null}
      {/* far skyline */}
      <path d="M0 80h12v-14h10v8h14v-18h12v24h100v26H0z" fill={hsl(hue, 18, 9, 0.6)} />
      {/* ground */}
      <rect x={0} y={98} width={160} height={6} fill="#10140f" />
      <rect x={0} y={98} width={160} height={1} fill={hsl(hue, 30, 30, 0.6)} />
      {opened ? (
        <>
          <Building hue={hue} sign={sign} tier={Math.min(3, tier)} lit={lit} />
          {motion && sign === 'cup' ? (
            <g className="va-steam" stroke="#e9e3d4" strokeWidth={1.2} fill="none" opacity={0.6}>
              <path d="M78 30c-2-3 2-4 0-7" />
              <path d="M83 30c-2-3 2-4 0-7" />
            </g>
          ) : null}
          {motion && level > 0 ? (
            <g className="va-walkers">
              <circle className="va-walker" cx={0} cy={95} r={2.2} fill={hsl(hue + 40, 50, 70)} />
              <circle className="va-walker va-walker--2" cx={0} cy={95} r={2} fill="#e8dcc4" />
              {tier >= 2 ? <circle className="va-walker va-walker--3" cx={0} cy={95} r={2.1} fill={hsl(hue + 180, 40, 66)} /> : null}
            </g>
          ) : null}
          {motion && fill > 0.98 ? (
            <g className="va-coins">
              <circle cx={130} cy={70} r={3} fill="#f2c94c" stroke="#a87b16" strokeWidth={0.8} />
              <circle cx={138} cy={64} r={2.4} fill="#f2c94c" stroke="#a87b16" strokeWidth={0.8} />
            </g>
          ) : null}
        </>
      ) : (
        <g>
          <rect x={40} y={56} width={80} height={42} fill="none" stroke={hsl(hue, 30, 45, 0.7)} strokeDasharray="4 3" />
          <line x1={80} y1={60} x2={80} y2={98} stroke="#5d5440" strokeWidth={2} />
          <rect x={62} y={58} width={36} height={18} rx={2} fill="#efe6cf" stroke="#5d5440" />
          <text x={80} y={66} textAnchor="middle" fontSize={6.5} fontWeight={700} fill="#3a3324">FOR</text>
          <text x={80} y={73} textAnchor="middle" fontSize={6.5} fontWeight={700} fill="#3a3324">LEASE</text>
          {/* A faint preview of what this lot becomes: its sign, in its colour. */}
          <g opacity={0.8}>
            <circle cx={138} cy={74} r={12} fill={hsl(hue, 35, 18, 0.7)} stroke={hsl(hue, 55, 62)} strokeDasharray="3 2" />
            <svg x={128} y={64} width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={hsl(hue, 60, 74)} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              {SIGN[sign]}
            </svg>
          </g>
        </g>
      )}
    </svg>
  )
}

export const VentureArt = memo(ArtImpl)

/** Glass tip jar that fills with coins as the till stacks. */
export function TillJar({ fill, hue, full }: { fill: number; hue: number; full: boolean }) {
  const f = Math.max(0, Math.min(1, fill))
  const top = 44 - f * 32
  return (
    <svg className={`vj${full ? ' is-full' : ''}`} viewBox="0 0 40 50" width={34} height={42} aria-hidden>
      <defs>
        <clipPath id="vj-clip">
          <path d="M8 10h24v4c3 2 4 5 4 9v18a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V23c0-4 1-7 4-9z" />
        </clipPath>
      </defs>
      <g clipPath="url(#vj-clip)">
        <rect x={0} y={top} width={40} height={50} fill="#e0b13c" />
        {f > 0.05
          ? Array.from({ length: Math.ceil(f * 6) }, (_, i) => (
              <ellipse key={i} cx={10 + ((i * 7) % 20)} cy={44 - i * 5.2} rx={5} ry={1.7} fill="#f6d36a" stroke="#a87b16" strokeWidth={0.5} />
            ))
          : null}
      </g>
      <path d="M8 10h24v4c3 2 4 5 4 9v18a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V23c0-4 1-7 4-9z" fill={`hsla(${hue} 40% 80% / 0.08)`} stroke={`hsla(${hue} 30% 80% / 0.55)`} strokeWidth={1.4} />
      <rect x={7} y={6} width={26} height={5} rx={1.5} fill={`hsla(${hue} 25% 60% / 0.7)`} />
      <path d="M11 20v16" stroke="#fff" strokeOpacity={0.25} strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

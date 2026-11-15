import { useId } from 'react'

/** Tintable shopper / staff with a CSS walk cycle. */
export function Walker({
  x,
  y = 168,
  tint = '#c9a15a',
  delay = 0,
  scale = 1,
  label,
}: {
  x: number
  y?: number
  tint?: string
  delay?: number
  scale?: number
  label?: string
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* Inner group owns the CSS bob so it doesn't wipe the SVG translate. */}
      <g className="ls-walker" style={{ animationDelay: `${delay}s` }}>
        {label ? <title>{label}</title> : null}
        <ellipse cx="0" cy="14" rx="7" ry="3" fill="#000" opacity="0.28" />
        <path d="M-6 2 Q0 12 6 2 V-4 H-6 Z" fill={tint} />
        <circle cy="-10" r="5" fill="#e6c2a0" />
      </g>
    </g>
  )
}

/** Truck or shuttle; `progress` 0..1 drives x across the dock. */
export function Truck({
  progress,
  x0 = 40,
  x1 = 420,
  y = 150,
  tint = '#c9a15a',
  shuttle = false,
}: {
  progress: number
  x0?: number
  x1?: number
  y?: number
  tint?: string
  shuttle?: boolean
}) {
  const t = Math.max(0, Math.min(1, progress))
  const x = x0 + (x1 - x0) * t
  return (
    <g className="ls-truck" transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width={shuttle ? 54 : 72} height="28" rx="4" fill={tint} />
      <rect x={shuttle ? 36 : 50} y="6" width="18" height="16" fill="#efe9dc" opacity="0.85" />
      <circle cx="14" cy="30" r="6" fill="#1a1612" />
      <circle cx={shuttle ? 44 : 58} cy="30" r="6" fill="#1a1612" />
      {shuttle ? <path d="M8 -6 L27 -18 L46 -6" fill="none" stroke="#8fb6e0" strokeWidth="2" /> : null}
    </g>
  )
}

export function Conveyor({ x, y, w = 220, fill = 0.4 }: { x: number; y: number; w?: number; fill?: number }) {
  const n = Math.max(1, Math.min(8, Math.round(fill * 8)))
  return (
    <g className="ls-conveyor" transform={`translate(${x} ${y})`}>
      <rect width={w} height="14" rx="3" fill="#2a2420" />
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} className="ls-belt" x={8 + i * 26} y="2" width="18" height="10" fill="#6c5b47" style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </g>
  )
}

export function CrateStack({
  x,
  y,
  count,
  tint = '#6c5b47',
  cap = 12,
}: {
  x: number
  y: number
  count: number
  tint?: string
  cap?: number
}) {
  const n = Math.max(0, Math.min(cap, Math.floor(count)))
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: n }, (_, i) => (
        <rect
          key={i}
          x={(i % 4) * 22}
          y={-Math.floor(i / 4) * 16}
          width="18"
          height="14"
          rx="2"
          fill={tint}
          opacity={0.7 + (i % 3) * 0.1}
        />
      ))}
    </g>
  )
}

export function Steam({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return <circle className="ls-steam" cx={x} cy={y} r="6" style={{ animationDelay: `${delay}s` }} />
}

export function Frost({ x, y, w = 120, h = 60 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g className="ls-frost" transform={`translate(${x} ${y})`}>
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={i} className="ls-flake" cx={(i * 17) % w} cy={(i * 23) % h} r={1.2 + (i % 3) * 0.4} style={{ animationDelay: `${i * 0.35}s` }} />
      ))}
    </g>
  )
}

export function Blink({ x, y, on = true, color = '#7cc47f' }: { x: number; y: number; on?: boolean; color?: string }) {
  return <circle className={`ls-blink${on ? ' is-on' : ''}`} cx={x} cy={y} r="5" fill={color} />
}

export function Beam({ x, y, h = 80, color = '#c3aaf0' }: { x: number; y: number; h?: number; color?: string }) {
  return <path className="ls-beam" d={`M${x} ${y} V${y - h}`} stroke={color} strokeWidth="2" />
}

export function Crane({ x, y, swing = 0.3 }: { x: number; y: number; swing?: number }) {
  const tip = 40 + swing * 30
  return (
    <g className="ls-crane" transform={`translate(${x} ${y})`}>
      <rect x="-4" y="0" width="8" height="70" fill="#5a6570" />
      <path d={`M0 8 H${tip}`} stroke="#8a96a2" strokeWidth="4" />
      <path className="ls-hook" d={`M${tip} 8 V40`} stroke="#c9a15a" strokeWidth="2" />
      <rect className="ls-hook" x={tip - 8} y="40" width="16" height="12" fill="#6c5b47" />
    </g>
  )
}

export function TickerTape({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <g className="ls-ticker" transform={`translate(${x} ${y})`}>
      <rect width="280" height="18" rx="3" fill="#0c1014" />
      <text className="ls-ticker__text" x="8" y="13">
        {text} · {text}
      </text>
    </g>
  )
}

export function SkyBand({
  top = '#1a2430',
  bottom = '#3e4a32',
}: {
  top?: string
  bottom?: string
}) {
  const uid = useId().replace(/:/g, '')
  const skyId = `ls-sky-${uid}`
  return (
    <>
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="960" height="220" fill={`url(#${skyId})`} />
      <rect y="168" width="960" height="52" fill="#1a1612" />
      <rect y="160" width="960" height="10" fill="#2a2420" />
    </>
  )
}

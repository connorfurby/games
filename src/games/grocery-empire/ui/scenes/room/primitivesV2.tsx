import type { ReactNode } from 'react'

/** Dressed worker with optional nameplate. */
export function Person({
  x,
  y,
  tint = '#c9a15a',
  name,
  delay = 0,
  working = false,
  scale = 1,
}: {
  x: number
  y: number
  tint?: string
  name?: string
  delay?: number
  working?: boolean
  scale?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={`rm-person${working ? ' rm-pulse' : ''}`} style={{ animationDelay: `${delay}s` }}>
        {name ? <title>{name}</title> : null}
        <ellipse cx="0" cy="14" rx="8" ry="3.5" fill="#000" opacity="0.28" />
        <path d="M-7 2 Q0 14 7 2 V-5 H-7 Z" fill={tint} />
        <circle cy="-11" r="5.5" fill="#e6c2a0" />
        {working ? <circle className="rm-pulse" cx="10" cy="-8" r="2.5" fill="#ffd98c" opacity="0.75" /> : null}
        {name ? (
          <text className="rm-person__name" y="26" textAnchor="middle">
            {name.length > 8 ? `${name.slice(0, 7)}…` : name}
          </text>
        ) : null}
      </g>
    </g>
  )
}

export function Sign({
  x,
  y,
  text,
  small = false,
  anchor = 'start',
}: {
  x: number
  y: number
  text: string
  small?: boolean
  anchor?: 'start' | 'middle' | 'end'
}) {
  return (
    <text className={`rm-sign${small ? ' rm-sign--sm' : ''}`} x={x} y={y} textAnchor={anchor}>
      {text}
    </text>
  )
}

export function Badge({
  x,
  y,
  text,
  w = 44,
}: {
  x: number
  y: number
  text: string
  w?: number
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className="rm-badge" width={w} height="16" rx="4" stroke="#3a444e" />
      <text className="rm-badge__text" x={w / 2} y="12" textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

/** Shelf bay with fill fraction 0..1 and optional qty label. */
export function ShelfBay({
  x,
  y,
  w = 40,
  h = 78,
  fill = 0,
  tint = '#c9a15a',
  label,
  labelInside = false,
}: {
  x: number
  y: number
  w?: number
  h?: number
  fill?: number
  tint?: string
  label?: string
  /** Draw the aisle tag inside the bay so it never collides with people below. */
  labelInside?: boolean
}) {
  const f = Math.max(0, Math.min(1, fill))
  const fh = Math.max(2, h * f)
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx="3" fill="#3a322c" stroke="#5a4e44" />
      <rect x="3" y={h - fh - 3} width={w - 6} height={fh} rx="2" fill={tint} opacity="0.85" />
      {label ? (
        labelInside ? (
          <>
            <rect x="2" y={h - 16} width={w - 4} height="14" rx="2" fill="#0f0d0b" opacity="0.78" />
            <text className="rm-sign--sm" x={w / 2} y={h - 5} textAnchor="middle" fill="#efe9dc">
              {label}
            </text>
          </>
        ) : (
          <text className="rm-sign--sm" x={w / 2} y={h + 12} textAnchor="middle">
            {label}
          </text>
        )
      ) : null}
    </g>
  )
}

export function Register({
  x,
  y,
  queue = 0,
}: {
  x: number
  y: number
  queue?: number
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="56" height="32" rx="3" fill="#efe9dc" />
      <rect x="6" y="6" width="24" height="10" fill="#1e2a2b" />
      <rect x="34" y="6" width="14" height="20" rx="2" fill="#c9a15a" />
      {queue > 0 ? (
        <Badge x={8} y={-18} text={`Q${Math.min(99, queue)}`} w={28} />
      ) : null}
    </g>
  )
}

export function Crate({
  x,
  y,
  qty,
  tint = '#6c5b47',
}: {
  x: number
  y: number
  qty?: number
  tint?: string
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="28" height="22" rx="3" fill={tint} />
      <path d="M0 8 H28" stroke="#1a1612" strokeOpacity="0.25" />
      {qty != null ? (
        <text className="rm-badge__text" x="14" y="15" textAnchor="middle">
          {qty > 999 ? '999+' : qty}
        </text>
      ) : null}
    </g>
  )
}

/** Vertical gauge with value label. */
export function Gauge({
  x,
  y,
  h = 80,
  w = 28,
  fill = 0,
  color = '#8fb6e0',
  label,
  value,
}: {
  x: number
  y: number
  h?: number
  w?: number
  fill?: number
  color?: string
  label: string
  value: string
}) {
  const f = Math.max(0, Math.min(1, fill))
  const fh = f * (h - 4)
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx="4" fill="#0f1317" stroke="#3a444e" />
      <rect x="2" y={h - 2 - fh} width={w - 4} height={fh} rx="2" fill={color} opacity="0.9" />
      <text className="rm-sign--sm" x={w / 2} y={h + 12} textAnchor="middle">
        {label}
      </text>
      <text className="rm-badge__text" x={w / 2} y={h + 24} textAnchor="middle" fill="#efe9dc">
        {value}
      </text>
    </g>
  )
}

/**
 * Log-friendly bars: each bar has a minimum visible height and an amount label,
 * so a dominant series cannot erase the others.
 */
export function Chart({
  x,
  y,
  w = 260,
  h = 120,
  items,
}: {
  x: number
  y: number
  w?: number
  h?: number
  items: { label: string; value: number; display: string; color: string }[]
}) {
  const max = Math.max(1e-9, ...items.map((i) => i.value))
  const gap = 12
  const barW = Math.max(28, (w - 24 - gap * (items.length - 1)) / items.length)
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx="6" fill="#0f1317" stroke="#3a444e" />
      {items.map((it, i) => {
        const ratio = it.value <= 0 ? 0 : Math.max(0.08, Math.log10(1 + (it.value / max) * 9) / Math.log10(10))
        const bh = Math.max(it.value > 0 ? 10 : 4, Math.round(ratio * (h - 48)))
        const bx = 16 + i * (barW + gap)
        return (
          <g key={it.label} transform={`translate(${bx} 0)`}>
            <rect x="0" y={h - 28 - bh} width={barW} height={bh} rx="3" fill={it.color} opacity="0.9" />
            <text className="rm-badge__text" x={barW / 2} y={h - 32 - bh} textAnchor="middle">
              {it.display}
            </text>
            <text className="rm-sign--sm" x={barW / 2} y={h - 10} textAnchor="middle">
              {it.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

export function DeskProp({
  x,
  y,
  lit = false,
  glyph,
  label,
}: {
  x: number
  y: number
  lit?: boolean
  glyph?: ReactNode
  label?: string
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="64" height="12" rx="2" fill={lit ? '#4a3d32' : '#2d2621'} />
      <rect x="4" y="12" width="4" height="26" fill="#2a221c" />
      <rect x="56" y="12" width="4" height="26" fill="#2a221c" />
      <rect x="18" y="-24" width="28" height="20" rx="2" fill="#0d1115" stroke="#3a4048" />
      <rect
        x="21"
        y="-21"
        width="22"
        height="14"
        rx="1"
        fill={lit ? '#ffd98c' : '#1b232b'}
        opacity={lit ? 0.9 : 0.7}
      />
      {glyph ? <g transform="translate(32 -14)">{glyph}</g> : null}
      {lit ? <ellipse cx="32" cy="2" rx="38" ry="9" fill="#ffd98c" opacity="0.12" /> : null}
      {label ? (
        <text className="rm-sign--sm" x="32" y="52" textAnchor="middle">
          {label}
        </text>
      ) : null}
    </g>
  )
}

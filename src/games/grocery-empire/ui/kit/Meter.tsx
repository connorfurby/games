import type { ReactNode } from 'react'
import { cx } from './hooks'

export type MeterTone = 'accent' | 'success' | 'danger' | 'warn' | 'muted'

export interface MeterProps {
  value: number
  max?: number
  tone?: MeterTone
  variant?: 'linear' | 'ring'
  label?: ReactNode
  /** e.g. "2m 10s": shown right-aligned (linear) or in the centre (ring). */
  eta?: ReactNode
  /** Ring diameter in px. */
  size?: number
  className?: string
}

export function Meter({ value, max = 1, tone = 'accent', variant = 'linear', label, eta, size = 44, className }: MeterProps) {
  const pct = max <= 0 || !Number.isFinite(value) ? 0 : Math.max(0, Math.min(1, value / max))
  const aria = {
    role: 'meter' as const,
    'aria-valuenow': Math.round(pct * 100),
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-label': typeof label === 'string' ? label : undefined,
  }

  if (variant === 'ring') {
    const stroke = 5
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    return (
      <div className={cx('gk-meter gk-meter--ring', `gk-meter--${tone}`, className)} style={{ width: size, height: size }} {...aria}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
          <circle className="gk-meter__ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
          <circle
            className="gk-meter__ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <span className="gk-meter__center">{eta ?? label ?? `${Math.round(pct * 100)}%`}</span>
      </div>
    )
  }

  return (
    <div className={cx('gk-meter', `gk-meter--${tone}`, className)} {...aria}>
      {label != null || eta != null ? (
        <div className="gk-meter__row">
          {label != null ? <span className="gk-meter__label">{label}</span> : <span />}
          {eta != null ? <span className="gk-meter__eta">{eta}</span> : null}
        </div>
      ) : null}
      <div className="gk-meter__track">
        <div className="gk-meter__fill" style={{ transform: `scaleX(${pct})` }} />
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { cx } from './hooks'

/**
 * Label + big value, optional per-second rate. Pass `delta` (signed) to flash the value
 * green/red; change `flashKey` to re-trigger the flash for the same sign.
 */
export function Stat({
  label,
  value,
  rate,
  delta,
  flashKey,
  title,
  size = 'md',
  className,
}: {
  label: ReactNode
  value: ReactNode
  rate?: ReactNode
  delta?: number
  flashKey?: string | number
  /** Tooltip. Keep the explanation here, not in the layout. */
  title?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const flash = delta ? (delta > 0 ? 'up' : 'down') : undefined
  return (
    <div className={cx('gk-stat', `gk-stat--${size}`, className)} title={title}>
      <span className="gk-stat__label">{label}</span>
      <strong key={flashKey ?? delta ?? 'static'} className="gk-stat__value" data-flash={flash}>
        {value}
      </strong>
      {rate != null ? <span className="gk-stat__rate">{rate}</span> : null}
    </div>
  )
}

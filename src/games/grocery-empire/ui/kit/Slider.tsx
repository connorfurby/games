import type { CSSProperties, ReactNode } from 'react'
import { cx } from './hooks'

/** Range input with a filled track and optional value readout. */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  format,
  disabled,
  className,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  format?: (value: number) => ReactNode
  disabled?: boolean
  className?: string
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <label className={cx('gk-slider', className)}>
      {label ? <span className="gk-slider__label">{label}</span> : null}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ '--gk-fill': `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output className="gk-slider__value">{format ? format(value) : value}</output>
    </label>
  )
}

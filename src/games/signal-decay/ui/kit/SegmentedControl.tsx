import type { ReactNode } from 'react'
import { cx } from './hooks'

export interface Segment<T extends string | number> {
  value: T
  label: ReactNode
  disabled?: boolean
  title?: string
}

/** Single-choice pill row (radiogroup). Use for speed, format, view toggles. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: {
  options: Segment<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={cx('sd-seg', `sd-seg--${size}`, className)} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          title={o.title}
          className={cx('sd-seg__opt', value === o.value && 'is-on')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

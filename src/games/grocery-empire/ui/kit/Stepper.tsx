import type { ReactNode } from 'react'
import { Button } from './Button'
import { cx } from './hooks'

/** − value + control. Buttons repeat while held. */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  format,
  label,
  disabled,
  className,
}: {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  format?: (value: number) => ReactNode
  label?: string
  disabled?: boolean
  className?: string
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className={cx('gk-stepper', className)} role="group" aria-label={label}>
      <Button
        tone="ghost"
        size="sm"
        hold
        aria-label={`Decrease${label ? ` ${label}` : ''}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </Button>
      <output className="gk-stepper__value" aria-live="polite">
        {format ? format(value) : value}
      </output>
      <Button
        tone="ghost"
        size="sm"
        hold
        aria-label={`Increase${label ? ` ${label}` : ''}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </Button>
    </div>
  )
}

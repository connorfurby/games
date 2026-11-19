import { cx } from './hooks'

/** − value + control for small bounded integers. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  format,
  className,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label: string
  format?: (v: number) => string
  className?: string
}) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)))
  return (
    <div className={cx('sd-stepper', className)} role="group" aria-label={label}>
      <button
        type="button"
        className="sd-stepper__btn"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => set(value - step)}
      >
        −
      </button>
      <output className="sd-stepper__val" aria-live="polite">
        {format ? format(value) : value}
      </output>
      <button
        type="button"
        className="sd-stepper__btn"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => set(value + step)}
      >
        +
      </button>
    </div>
  )
}

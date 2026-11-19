import { cx } from './hooks'

export function Meter({
  value,
  warn,
  className,
  label,
}: {
  value: number
  warn?: boolean
  className?: string
  label?: string
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={cx('sd-meter', warn && 'sd-meter--warn', className)} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

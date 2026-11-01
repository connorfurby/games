export function Meter({
  value,
  max = 1,
  label,
  tone = 'accent',
}: {
  value: number
  max?: number
  label?: string
  tone?: 'accent' | 'success' | 'danger' | 'warn'
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max))
  return (
    <div className="ge-meter" role="meter" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      {label ? <div className="ge-meter__label">{label}</div> : null}
      <div className="ge-meter__track">
        <div className={`ge-meter__fill ge-meter__fill--${tone}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}

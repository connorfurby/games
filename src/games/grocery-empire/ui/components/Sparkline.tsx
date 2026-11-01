/** Tiny SVG sparkline from a number series. No deps. */
export function Sparkline({
  values,
  label,
  width = 160,
  height = 36,
  className = '',
}: {
  values: number[]
  label?: string
  width?: number
  height?: number
  className?: string
}) {
  if (values.length < 2) {
    return (
      <div className={`ge-sparkline ${className}`.trim()}>
        {label ? <span className="ge-sparkline__label">{label}</span> : null}
        <span className="ge-muted">No history yet</span>
      </div>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 2
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW
    const y = pad + innerH - ((v - min) / span) * innerH
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const d = `M ${pts.join(' L ')}`
  const last = values[values.length - 1]!
  const first = values[0]!
  const up = last >= first

  return (
    <div className={`ge-sparkline ${className}`.trim()}>
      {label ? <span className="ge-sparkline__label">{label}</span> : null}
      <svg
        className={`ge-sparkline__svg ${up ? 'is-up' : 'is-down'}`}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden
      >
        <path d={d} fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

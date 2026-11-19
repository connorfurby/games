/** A tiny price line. Green when the last point is above the first. */
export function Spark({
  data,
  w = 96,
  h = 28,
  className,
}: {
  data: number[]
  w?: number
  h?: number
  className?: string
}) {
  if (data.length < 2) return <svg className={className} width={w} height={h} aria-hidden />
  const lo = Math.min(...data)
  const hi = Math.max(...data)
  const span = hi - lo || hi || 1
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - lo) / span) * (h - 4)).toFixed(1)}`)
  const up = data[data.length - 1]! >= data[0]!
  return (
    <svg className={className} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts.join(' ')} fill="none" stroke={up ? '#5fd38a' : '#ff7a5c'} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}


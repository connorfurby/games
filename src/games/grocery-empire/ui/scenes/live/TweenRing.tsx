import { useTween } from '../../fx'
import { Sign } from '../room'

/** Empire XP ring stroke — tween frames stay on this circle alone. */
export function TweenXpRing({
  fill,
  reducedMotion,
  cx,
  cy,
  r,
  circumference,
}: {
  fill: number
  reducedMotion: boolean
  cx: number
  cy: number
  r: number
  circumference: number
}) {
  const tweened = useTween(fill, { duration: reducedMotion ? 0 : 520, reducedMotion })
  const ring = Math.max(0.02, tweened)
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke="#d9a441"
      strokeWidth="9"
      strokeDasharray={`${circumference * ring} ${circumference}`}
      transform={`rotate(-90 ${cx} ${cy})`}
      strokeLinecap="round"
    />
  )
}

/** Strategy Attention bar — tween frames stay on the fill + label. */
export function TweenAttMeter({ fill, reducedMotion }: { fill: number; reducedMotion: boolean }) {
  const att = useTween(fill, { duration: reducedMotion ? 0 : 480, reducedMotion })
  return (
    <>
      <rect x="16" y="28" width="24" height="100" rx="4" fill="#1e2836" />
      <rect
        x="16"
        y={28 + 100 * (1 - att)}
        width="24"
        height={100 * att}
        rx="4"
        fill={att >= 0.98 ? '#7cc47f' : '#5a8ab8'}
      />
      <Sign x={28} y={144} text={`${Math.round(att * 100)}%`} small anchor="middle" />
    </>
  )
}

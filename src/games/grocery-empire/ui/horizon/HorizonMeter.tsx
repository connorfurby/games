/** Currency meter: amount, cap fill, rate, ETA to next spend, one job sentence. */
export function HorizonMeter({
  coachId,
  name,
  amount,
  fill,
  rate,
  eta,
  job,
}: {
  coachId?: string
  name: string
  amount: string
  /** 0..1 against cap. */
  fill: number
  rate: string
  eta?: string | null
  job: string
}) {
  const clamped = Math.max(0, Math.min(1, fill))
  return (
    <section className="hz-meter" data-coach-id={coachId} aria-label={name}>
      <div className="hz-meter__head">
        <h3>{name}</h3>
        <strong>{amount}</strong>
      </div>
      <div
        className="hz-meter__bar"
        role="progressbar"
        aria-valuenow={Math.round(clamped * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i style={{ transform: `scaleX(${clamped})` }} />
      </div>
      <p className="hz-meter__meta">
        <span>{rate}</span>
        {eta ? <span>{eta}</span> : null}
      </p>
      <p className="hz-meter__job">{job}</p>
    </section>
  )
}

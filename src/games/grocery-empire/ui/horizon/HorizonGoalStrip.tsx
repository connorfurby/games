import type { ReactNode } from 'react'

/**
 * Compact Worlds goal row — one horizontal band on wide screens:
 * title · progress · payoff | action. Never a tall empty card.
 */
export function HorizonGoalStrip({
  title,
  progress,
  progressLabel,
  payoff,
  eta,
  action,
  ready = false,
  coachId,
}: {
  title: string
  progress: number | null
  progressLabel: string
  payoff: string
  eta?: string | null
  action?: ReactNode
  ready?: boolean
  coachId?: string
}) {
  const fill = progress == null ? null : Math.max(0, Math.min(1, progress))
  return (
    <section
      className={`hz-goal hz-goal--compact${ready ? ' is-ready' : ''}`}
      data-coach-id={coachId}
      aria-label={title}
    >
      <div className="hz-goal__main">
        <div className="hz-goal__head">
          <h3>{title}</h3>
          <span>{progressLabel}</span>
        </div>
        {fill != null ? (
          <div
            className="hz-goal__bar hz-goal__bar--slim"
            role="progressbar"
            aria-valuenow={Math.round(fill * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ transform: `scaleX(${fill})` }} />
          </div>
        ) : null}
        <p className="hz-goal__payoff">
          {payoff}
          {eta ? ` · ${eta}` : ''}
        </p>
      </div>
      {action ? <div className="hz-goal__action">{action}</div> : null}
    </section>
  )
}

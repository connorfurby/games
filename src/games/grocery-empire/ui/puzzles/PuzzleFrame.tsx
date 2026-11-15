import type { ReactNode } from 'react'
import type { NumberFormat } from '@/shared/bn'
import { qty } from '../format'
import { Btn } from '../components/Btn'

export function pocket(n: number, fmt: NumberFormat): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) < 100) return n.toFixed(1)
  return qty(n, fmt)
}

export function gateTitle(check: { ok: boolean; reason?: string }, okTitle?: string): string | undefined {
  return check.ok ? okTitle : check.reason
}

/**
 * Puzzle work shell. File the standard + Commit live here once — never also in a callout.
 * Sticky action row stays at the bottom of the phone scrollport.
 */
export function PuzzleFrame({
  title,
  purpose,
  score,
  wants,
  standardDisabled,
  commitDisabled,
  onStandard,
  onCommit,
  standardTitle,
  commitTitle,
  standardLabel = 'File the standard',
  commitLabel = 'Commit',
  standardCoach,
  commitCoach,
  hideCommit = false,
  hideStandard = false,
  children,
}: {
  title: string
  purpose: string
  score: number | null
  /** Always-visible wants / clues (not hover-only). */
  wants?: ReactNode
  standardDisabled?: boolean
  commitDisabled?: boolean
  onStandard?: () => void
  onCommit?: () => void
  standardTitle?: string
  commitTitle?: string
  standardLabel?: string
  commitLabel?: string
  standardCoach?: string
  commitCoach?: string
  hideCommit?: boolean
  /** When the primary verb lives on the goal strip instead. */
  hideStandard?: boolean
  children: ReactNode
}) {
  const shown = score == null || !Number.isFinite(score) ? '—' : score.toFixed(2)
  const note =
    !hideCommit && commitDisabled && commitTitle
      ? commitTitle
      : !hideStandard && standardDisabled && standardTitle
        ? standardTitle
        : null
  const showActions = !hideStandard || !hideCommit
  return (
    <section className="hz-puzzle" aria-label={title}>
      <header className="hz-puzzle__head">
        <div>
          <h3>{title}</h3>
          <p>{purpose}</p>
        </div>
        <p className="hz-score">
          <span>Score</span>
          <strong>{shown}</strong>
        </p>
      </header>
      {wants ? <div className="hz-puzzle__wants">{wants}</div> : null}
      <div className="hz-puzzle__body">{children}</div>
      {showActions ? (
        <div className="ge-sticky-actions">
          {note ? <p className="hz-note">{note}</p> : null}
          {hideStandard ? null : (
            <Btn
              tone="primary"
              coachId={standardCoach}
              disabled={standardDisabled}
              title={standardTitle}
              onClick={onStandard}
            >
              {standardLabel}
            </Btn>
          )}
          {hideCommit ? null : (
            <Btn
              tone={hideStandard ? 'primary' : 'ghost'}
              coachId={commitCoach}
              disabled={commitDisabled}
              title={commitTitle}
              onClick={onCommit}
            >
              {commitLabel}
            </Btn>
          )}
        </div>
      ) : null}
    </section>
  )
}

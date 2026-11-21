import { longNumber } from '@/shared/bn'
import { useFlash, useTween } from '../fx'
import { money, qty, shortFigure } from '../format'
import { useGameSelector } from '../useGameSelector'

/** Cash digits — subscribe to the engine so they ease at paint rate while the shell is ~1 Hz. */
export function CashFigure({ reducedMotion }: { reducedMotion: boolean }) {
  const value = useGameSelector((s) => s.cash)
  const shown = useTween(value, { duration: reducedMotion ? 0 : 420, reducedMotion, snapRatio: 0.35 })
  const flash = useFlash(value, { minRatio: 0.015, minDelta: 1 })
  const label = money(shown, 'named')
  return (
    <span className="g2-stat__value" data-fx-flash={flash ?? undefined} title={`$${longNumber(shown)}`}>
      <span className="g2-stat__full">{label}</span>
      <span className="g2-stat__short" aria-hidden="true">
        {shortFigure(label)}
      </span>
    </span>
  )
}

/** Baskets digits — same isolation as CashFigure. */
export function BasketsFigure({ reducedMotion }: { reducedMotion: boolean }) {
  const value = useGameSelector((s) => s.baskets)
  const shown = useTween(value, { duration: reducedMotion ? 0 : 380, reducedMotion, snapRatio: 0.4 })
  const flash = useFlash(value, { minRatio: 0.02, minDelta: 0.5 })
  const label = qty(shown, 'named')
  return (
    <span
      className="g2-stat__value g2-stat__value--small"
      data-fx-flash={flash ?? undefined}
      title={`${longNumber(shown)} baskets`}
    >
      <span className="g2-stat__full">{label}</span>
      <span className="g2-stat__short" aria-hidden="true">
        {shortFigure(label)}
      </span>
    </span>
  )
}

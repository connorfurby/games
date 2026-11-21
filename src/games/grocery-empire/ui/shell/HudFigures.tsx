import { longNumber } from '@/shared/bn'
import { useFlash, useTween } from '../fx'
import { money, qty, shortFigure } from '../format'

/** Cash digits only — tween frames stay here so the rest of the HUD does not rebuild. */
export function CashFigure({ value, reducedMotion }: { value: number; reducedMotion: boolean }) {
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

/** Baskets digits only — same isolation as CashFigure. */
export function BasketsFigure({ value, reducedMotion }: { value: number; reducedMotion: boolean }) {
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

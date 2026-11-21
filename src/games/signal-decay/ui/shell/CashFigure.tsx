import { useFlash, useTween } from '../fx'
import { money } from '../format'

/** Cash digits only — tween frames stay here so the rest of the HUD does not rebuild. */
export function CashFigure({ value, reducedMotion }: { value: number; reducedMotion: boolean }) {
  const shown = useTween(value, reducedMotion ? 0 : 420)
  const flash = useFlash(value)
  return (
    <span className="sd-stat__value" data-fx-flash={flash ?? undefined}>
      {money(shown)}
    </span>
  )
}

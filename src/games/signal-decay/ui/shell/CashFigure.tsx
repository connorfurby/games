import { useSyncExternalStore } from 'react'
import { getSignalEngine } from '../../sim/engine'
import { useFlash, useTween } from '../fx'
import { money } from '../format'

/** Cash digits — live engine subscribe so the shell can paint ~1 Hz. */
export function CashFigure({ reducedMotion }: { reducedMotion: boolean }) {
  const value = useSyncExternalStore(
    getSignalEngine().subscribe,
    () => getSignalEngine().getState().cash,
    () => getSignalEngine().getState().cash,
  )
  const shown = useTween(value, reducedMotion ? 0 : 420)
  const flash = useFlash(value)
  return (
    <span className="sd-stat__value" data-fx-flash={flash ?? undefined}>
      {money(shown)}
    </span>
  )
}

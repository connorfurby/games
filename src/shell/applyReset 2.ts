import { engine } from '@/games/grocery-empire/sim/engine'
import { PRIMARY_SAVE_ID, setActiveSaveId } from '@/games/grocery-empire/sim/saveKey'
import { museumStore } from '@/games/grocery-empire/ui/museum/store'
import { clearGameSave } from '@/shared/save'
import type { MetaSave } from '@/shared/types'
import { clearDailyPending, deactivateDailyChallenge } from './dailyChallenge'
import { normalizeScope, resetMeta, type ResetScope } from './resetData'

/**
 * Carry out a reset. One place for every "start over" button in the app, so they all
 * clear exactly what the player ticked and nothing else.
 *
 * What lives where:
 * - Run: cash, stock, staff, eras (`grocery-empire`).
 * - Save slots: three manual copies of a run.
 * - Collection: Museum (`grocery-museum`), awards and shop (site `meta`). These are kept
 *   across runs on purpose, and cleared only when the player asks.
 */
export function applyReset(raw: ResetScope, meta: MetaSave, replaceMeta: (next: MetaSave) => void) {
  const scope = normalizeScope(raw)
  if (scope.run) {
    deactivateDailyChallenge()
    clearDailyPending()
    setActiveSaveId(PRIMARY_SAVE_ID)
    // Wipe disk AND the live engine singleton (clearing the key alone is not enough).
    engine.newGame()
  }
  if (scope.slots) for (const slot of [1, 2, 3]) clearGameSave(`${PRIMARY_SAVE_ID}-slot-${slot}`)
  if (scope.museum) museumStore.reset()
  const next = resetMeta(meta, scope)
  if (next !== meta) replaceMeta(next)
}

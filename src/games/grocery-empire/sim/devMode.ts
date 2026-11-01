import { clearGameSave, loadGame } from '@/shared/save'
import { buildDevStage, unlockAllMenus } from './devStages'
import { engine } from './engine'
import { log } from './helpers'
import { migrate } from './migrate'
import {
  DEV_SAVE_ID,
  PRIMARY_SAVE_ID,
  getActiveSaveId,
  isDevSave,
  setActiveSaveId,
} from './saveKey'
import { createInitialState, type GameState } from './state'

/**
 * Enter the isolated DevMode sandbox.
 * Flushes the real campaign to PRIMARY_SAVE_ID first, then loads/creates DEV_SAVE_ID.
 * Meta / Shelf Tokens / achievements are not written while isDevSave().
 */
export function enterDevSandbox() {
  if (isDevSave()) {
    engine.reloadFromDisk()
    return
  }
  setActiveSaveId(PRIMARY_SAVE_ID)
  engine.save()

  setActiveSaveId(DEV_SAVE_ID)
  const raw = loadGame<unknown>(DEV_SAVE_ID)
  if (raw == null) {
    const s = createInitialState(90_001)
    s.introSeen = true
    log(s, 'DevMode sandbox — separate from your real campaign save.', 'story')
    log(s, 'Jump stages from More → DevMode. Wipe DevMode anytime.', 'story')
    engine.replaceState(s)
  } else {
    engine.replaceState(migrate(raw))
  }
}

/** Leave DevMode: flush sandbox, reload the real campaign into the engine. */
export function leaveDevSandbox() {
  if (!isDevSave()) return
  engine.save()
  setActiveSaveId(PRIMARY_SAVE_ID)
  engine.reloadFromDisk()
}

/** Ensure we are on the real campaign (Continue / New Game from shelf). */
export function ensurePrimarySandbox() {
  if (!isDevSave()) return
  leaveDevSandbox()
}

export function applyDevStage(id: string): boolean {
  if (!isDevSave()) return false
  const next = buildDevStage(id)
  if (!next) return false
  log(next, `DevMode stage loaded: ${id}`, 'story')
  engine.replaceState(next)
  return true
}

export function wipeDevSandbox() {
  if (!isDevSave()) return
  clearGameSave(DEV_SAVE_ID)
  const s = createInitialState(90_002)
  s.introSeen = true
  log(s, 'DevMode wiped. Real campaign untouched.', 'story')
  engine.replaceState(s)
}

export function devMutate(fn: (s: GameState) => void) {
  if (!isDevSave()) return
  const s = engine.getState()
  fn(s)
  engine.save()
  engine.notify()
}

export function devGrantCash(amount: number) {
  devMutate((s) => {
    s.cash += amount
    log(s, `DevMode +$${amount.toFixed(0)} cash.`, 'story')
  })
}

export function devGrantBaskets(amount: number) {
  devMutate((s) => {
    s.baskets += amount
    s.stats.sold += amount
    log(s, `DevMode +${amount} baskets.`, 'story')
  })
}

export function devUnlockAllMenus() {
  devMutate((s) => {
    unlockAllMenus(s)
    log(s, 'DevMode — all department menus unlocked.', 'story')
  })
}

export function devSkipIntroAndCoach() {
  devMutate((s) => {
    s.introSeen = true
    s.tutorials.active = null
    s.tutorials.queue = []
    log(s, 'DevMode — intro + coach cleared.', 'story')
  })
}

export function activeSaveLabel(): string {
  return isDevSave() ? 'DevMode sandbox' : 'Campaign save'
}

export function activeSaveKeyForUi(): string {
  return getActiveSaveId()
}

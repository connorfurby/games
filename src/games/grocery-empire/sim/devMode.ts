import { clearGameSave, loadGame } from '@/shared/save'
import { TUTORIALS } from '../content/tutorials'
import { buildDevStage, unlockAllMenus } from './devStages'
import { engine } from './engine'
import { log, skipOpeningDialogue } from './helpers'
import { migrate } from './migrate'
import {
  DEV_SAVE_ID,
  PRIMARY_SAVE_ID,
  getActiveSaveId,
  isDevSave,
  setActiveSaveId,
} from './saveKey'
import { createInitialState, type GameState } from './state'
import { applyOffline } from './tick'
import { attentionCap } from './formulas'

/** Fresh DevMode starts past coach spam so stage jumps are usable. */
function quietSandbox(s: GameState) {
  s.introSeen = true
  skipOpeningDialogue(s)
  s.dialogueQueue = []
  for (const t of TUTORIALS) s.tutorials.done[t.id] = true
  s.tutorials.queue = []
  s.tutorials.active = null
  s.offlineReceipt = null
  s.chapterQueue = []
}

/**
 * Enter the isolated DevMode sandbox.
 * Flushes the real campaign to PRIMARY_SAVE_ID first, then loads/creates DEV_SAVE_ID.
 * Meta / Shelf Tokens / achievements are not written while isDevSave().
 */
function loadOrCreateDevSandbox() {
  const raw = loadGame<unknown>(DEV_SAVE_ID)
  if (raw == null) {
    const s = createInitialState(90_001)
    quietSandbox(s)
    log(s, 'DevMode sandbox — separate from your real campaign save.', 'story')
    log(s, 'Jump stages from Menu › Dev (the grid button, top right). Wipe DevMode anytime.', 'story')
    engine.replaceState(s)
    return
  }
  engine.replaceState(migrate(raw))
}

export function enterDevSandbox() {
  if (isDevSave()) {
    loadOrCreateDevSandbox()
    return
  }
  setActiveSaveId(PRIMARY_SAVE_ID)
  engine.save()

  setActiveSaveId(DEV_SAVE_ID)
  loadOrCreateDevSandbox()
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
  quietSandbox(s)
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
    skipOpeningDialogue(s)
    s.dialogueQueue = []
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

/** Fast-forward the sandbox as if the tab were closed for `sec` seconds (offline rules). */
export function devSkipTime(sec: number) {
  devMutate((s) => {
    // Keeps the welcome-back receipt for skips of 10+ minutes, so DevMode previews it.
    const r = applyOffline(s, sec)
    if (sec < 600) s.offlineReceipt = null
    log(s, `DevMode skipped ${Math.round(sec / 60)} min: +$${Math.round(r.revenue)} revenue, ${Math.round(r.sold)} sold.`, 'story')
  })
}

/** Cash worth `minutes` of current income (at least $1k), so grants scale with the era. */
export function devGrantIncome(minutes: number) {
  devMutate((s) => {
    const amount = Math.max(1000, Math.max(0, s.rates.revenuePerSec) * 60 * minutes)
    s.cash += amount
    log(s, `DevMode +${minutes} min of income.`, 'story')
  })
}

export function devGrantAttention() {
  devMutate((s) => {
    s.compute.attention = attentionCap(s)
    log(s, 'DevMode — Attention filled.', 'story')
  })
}

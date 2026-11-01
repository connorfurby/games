import { clearGameSave, loadGame, saveGame } from '@/shared/save'
import { AUTOSAVE_MS, DT, TICK_HZ } from './balance'
import { can as canCmd, run as runCmd, tickAutoRestock, type Check, type Command } from './commands'
import { migrate } from './migrate'
import { getActiveSaveId } from './saveKey'
import { createInitialState, type GameState } from './state'
import { applyOffline, applyTick } from './tick'
import { applyUndo, canUndo as undoAvailable, pushUndo } from './undo'

type Listener = () => void

/**
 * React `useSyncExternalStore` compares snapshots with Object.is.
 * The sim mutates one GameState in place — returning that same reference
 * every tick makes React skip re-renders (UI looks frozen until reload).
 * Always bump a new wrapper object on notify.
 */
export type EngineSnapshot = { readonly v: number; readonly state: GameState }

export class GroceryEngine {
  private state: GameState
  private version = 0
  private snapshot: EngineSnapshot
  private listeners = new Set<Listener>()
  private timer: ReturnType<typeof setInterval> | null = null
  private autosaveAcc = 0
  private hiddenAt: number | null = null
  private running = false
  private softPauseMul = 1
  private onVis: (() => void) | null = null

  constructor(state?: GameState) {
    this.state = state ?? GroceryEngine.loadState()
    this.snapshot = { v: this.version, state: this.state }
  }

  static loadState(): GameState {
    let raw: unknown = null
    try {
      raw = loadGame<unknown>(getActiveSaveId())
    } catch {
      raw = null
    }
    const state = raw == null ? createInitialState() : migrate(raw)
    if (raw && typeof (raw as { lastSavedAt?: unknown }).lastSavedAt === 'number') {
      const elapsed = (Date.now() - (raw as { lastSavedAt: number }).lastSavedAt) / 1000
      if (elapsed > 2) {
        try {
          applyOffline(state, elapsed)
        } catch (e) {
          console.error('offline catch-up failed', e)
        }
      }
    }
    state.lastSavedAt = Date.now()
    return state
  }

  static loadOrNew(): GroceryEngine {
    return new GroceryEngine(GroceryEngine.loadState())
  }

  start() {
    if (this.running) return
    this.running = true
    this.hiddenAt = null
    // Never leave a stale soft-pause from a previous mount / Esc-hold.
    if (this.softPauseMul <= 0) this.softPauseMul = 1
    this.timer = setInterval(() => this.pulse(), 1000 / TICK_HZ)
    if (typeof document !== 'undefined') {
      this.onVis = () => this.onVisibility()
      document.addEventListener('visibilitychange', this.onVis)
    }
  }

  stop() {
    this.running = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.onVis && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVis)
      this.onVis = null
    }
    this.save()
  }

  /** Soft-pause while a Coach tour is up (UI passes 0.25). */
  setSoftPauseMul(mul: number) {
    this.softPauseMul = Math.max(0, Math.min(1, mul))
  }

  private onVisibility() {
    if (typeof document === 'undefined') return
    if (document.hidden) {
      this.hiddenAt = Date.now()
      this.save()
      return
    }
    if (this.hiddenAt != null) {
      const elapsed = (Date.now() - this.hiddenAt) / 1000
      this.hiddenAt = null
      if (elapsed >= 1) {
        applyOffline(this.state, elapsed)
        this.bump()
        this.save()
      }
    }
  }

  private pulse() {
    if (!this.running) return
    const dt = DT * Math.max(0, this.state.speed) * this.softPauseMul
    if (!this.state.paused && dt > 0) {
      applyTick(this.state, dt)
      tickAutoRestock(this.state)
    }
    this.autosaveAcc += 1000 / TICK_HZ
    if (this.autosaveAcc >= AUTOSAVE_MS) {
      this.autosaveAcc = 0
      this.save()
    }
    this.bump()
  }

  can = (cmd: Command): Check => canCmd(this.state, cmd)

  dispatch = (cmd: Command): Check => {
    const undoable = new Set([
      'buyAd',
      'buyBuild',
      'sellBuild',
      'buyUpgrade',
      'buyMemo',
      'hire',
      'buyEndcap',
      'openVenture',
      'levelVenture',
      'expandLot',
      'expandSideYard',
      'depositPassbook',
      'depositInvest',
      'incorporate',
      'openStore',
      'buildDepot',
      'buyPlant',
      'buyTank',
      'hireLobby',
      'openLane',
      'buyFuel',
      'launchBarge',
      'buyCharter',
      'buyDoctrine',
      'buyInvestEngine',
    ])
    if (undoable.has(cmd.type)) pushUndo(this.state, cmd.type)
    const check = runCmd(this.state, cmd)
    if (check.ok) this.bump()
    return check
  }

  /** True while a spendy action is still inside the 5s undo window. */
  canUndo(): boolean {
    return undoAvailable().ok
  }

  /** 5s undo window for last spendy action (plan QoL). */
  undo(): Check {
    const gate = undoAvailable()
    if (!gate.ok) return { ok: false, reason: 'Nothing to undo (5s window).' }
    if (!applyUndo(this.state)) return { ok: false, reason: 'Undo failed.' }
    this.bump()
    this.save()
    return { ok: true }
  }

  save() {
    this.state.lastSavedAt = Date.now()
    try {
      saveGame(getActiveSaveId(), this.state)
    } catch {
      /* ignore quota */
    }
  }

  reset(seed?: number) {
    this.state = createInitialState(seed)
    this.bump()
    this.save()
  }

  /** UI "New Game" — wipe the active save id (campaign or DevMode) and start fresh. */
  newGame(seed?: number) {
    clearGameSave(getActiveSaveId())
    this.reset(seed)
  }

  /** Replace live state from a deserialized save (after import / slot load). */
  replaceState(next: GameState) {
    this.state = next
    this.state.lastSavedAt = Date.now()
    this.bump()
    this.save()
  }

  /** Re-read the primary grocery save from localStorage into the live engine. */
  reloadFromDisk() {
    this.state = GroceryEngine.loadState()
    this.bump()
  }

  /** Copy current run into a named slot under the active save id. */
  saveToSlot(slot: 1 | 2 | 3): boolean {
    this.save()
    try {
      const id = getActiveSaveId()
      const raw = localStorage.getItem(`games.v1.${id}`)
      if (!raw) return false
      localStorage.setItem(`games.v1.${id}-slot-${slot}`, raw)
      return true
    } catch {
      return false
    }
  }

  /** Load a named slot into the live engine (writes active save). */
  loadFromSlot(slot: 1 | 2 | 3): boolean {
    try {
      const fromSlot = loadGame<unknown>(`${getActiveSaveId()}-slot-${slot}`)
      if (fromSlot == null) return false
      this.replaceState(migrate(fromSlot))
      return true
    } catch {
      return false
    }
  }

  /** True when a slot has a stored JSON blob for the active save id. */
  hasSlot(slot: 1 | 2 | 3): boolean {
    try {
      return !!localStorage.getItem(`games.v1.${getActiveSaveId()}-slot-${slot}`)
    } catch {
      return false
    }
  }

  /** Force React snapshot + listeners after in-place mutation (DevMode helpers). */
  notify() {
    this.bump()
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Live mutable state — for imperative reads after a re-render is scheduled. */
  getState = (): GameState => this.state

  /**
   * For useSyncExternalStore only. Identity changes on every bump so React
   * re-renders even though `state` is mutated in place.
   */
  getSnapshot = (): EngineSnapshot => this.snapshot

  getVersion = () => this.version

  /** Soft-pause multiplier currently applied to ticks (tests / debug). */
  getSoftPauseMul = () => this.softPauseMul

  private bump() {
    this.version += 1
    this.snapshot = { v: this.version, state: this.state }
    for (const l of this.listeners) l()
  }
}

/** Singleton for useSyncExternalStore + UI dispatch. */
export const engine = GroceryEngine.loadOrNew()

export function getGroceryEngine(): GroceryEngine {
  return engine
}

export function resetGroceryEngine(seed?: number): GroceryEngine {
  engine.stop()
  engine.reset(seed)
  return engine
}

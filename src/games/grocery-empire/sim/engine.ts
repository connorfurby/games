import {
  clearGameSave,
  clearSnapshots,
  exportSave,
  listSnapshots,
  loadGame,
  readSnapshot,
  saveGame,
  saveRaw,
  snapshotGame,
  type SnapshotInfo,
} from '@/shared/save'
import { AUTOSAVE_MS, DT, TICK_HZ } from './balance'
import { can as canCmd, run as runCmd, tickAutoRestock, type Check, type Command } from './commands'
import { migrate } from './migrate'
import { getActiveSaveId } from './saveKey'
import { createInitialState, type GameState } from './state'
import { applyOffline, applyTick, beginOffline, type OfflineRun } from './tick'
import { canCarry, canRebrand, rebrand as rebrandState, type RebrandCarry } from './systems/prestige'
import { applyUndo, canUndo as undoAvailable, clearUndo, pushUndo } from './undo'

type Listener = () => void

/** Away gaps at or above this many seconds catch up a slice per frame behind a loading screen. */
const ASYNC_CATCHUP_SEC = 60
/** Frame budget for one catch-up slice (ms). */
const SLICE_MS = 14

/** Set by loadState when the save was away long enough to catch up asynchronously. */
let bootPending: { elapsed: number; showReceipt: boolean } | null = null

export interface CatchUpInfo {
  /** 0..1 */
  progress: number
  /** Away seconds being simulated. */
  total: number
}

/** Sim pulses per UI repaint (10 Hz sim → 5 Hz paint). */
const PULSES_PER_PAINT = 2

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
  private pulses = 0
  private onVis: (() => void) | null = null
  private catchRun: OfflineRun | null = null
  private catchTimer: ReturnType<typeof setTimeout> | null = null
  private pendingOffline: { elapsed: number; showReceipt: boolean } | null = null

  constructor(state?: GameState) {
    this.state = state ?? GroceryEngine.loadState()
    // A long away gap found by loadState is caught up after start(), behind the loading screen.
    this.pendingOffline = bootPending
    bootPending = null
    this.snapshot = { v: this.version, state: this.state }
  }

  /** Non-null while away time is being caught up (the UI shows a loading screen). */
  catchUp(): CatchUpInfo | null {
    if (this.catchRun) return { progress: this.catchRun.progress(), total: this.catchRun.total }
    if (this.pendingOffline) return { progress: 0, total: this.pendingOffline.elapsed }
    return null
  }

  private cancelCatchUp() {
    if (this.catchTimer) clearTimeout(this.catchTimer)
    this.catchTimer = null
    this.catchRun = null
    this.pendingOffline = null
  }

  /** Start catching up `elapsed` seconds a slice at a time; live ticks wait until it's done. */
  private beginCatchUp(elapsed: number, showReceipt: boolean) {
    if (this.catchRun) return
    this.pendingOffline = null
    this.catchRun = beginOffline(this.state, elapsed, { showReceipt })
    let perSlice = 400
    const slice = () => {
      const run = this.catchRun
      if (!run) return
      const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
      let done = false
      try {
        done = run.step(perSlice)
      } catch (e) {
        console.error('offline catch-up failed', e)
        done = true
      }
      const ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0
      // Aim each slice at the frame budget so the loading screen stays smooth.
      if (ms > 0) perSlice = Math.max(50, Math.min(20000, Math.round(perSlice * (SLICE_MS / ms))))
      if (done) {
        run.finish()
        this.catchRun = null
        this.catchTimer = null
        this.state.lastSavedAt = Date.now()
        this.save()
        this.bump()
        return
      }
      this.bump()
      this.catchTimer = setTimeout(slice, 0)
    }
    this.bump()
    this.catchTimer = setTimeout(slice, 30)
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
      // Paused stays paused across a reload. Short refreshes catch up quietly;
      // the away-receipt only appears once the gap is long enough to matter.
      if (elapsed > 2 && !state.paused) {
        if (elapsed >= ASYNC_CATCHUP_SEC) {
          // Long away: the engine catches up a slice per frame behind a loading screen.
          bootPending = { elapsed, showReceipt: true }
        } else {
          try {
            applyOffline(state, elapsed, { showReceipt: elapsed >= 20 })
          } catch (e) {
            console.error('offline catch-up failed', e)
          }
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
    if (this.pendingOffline) this.beginCatchUp(this.pendingOffline.elapsed, this.pendingOffline.showReceipt)
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
      // Live ticks are frozen while hidden, so this catch-up is the only
      // progress. A short tab switch must not also pop the away receipt.
      if (elapsed >= ASYNC_CATCHUP_SEC && !this.state.paused) {
        this.beginCatchUp(elapsed, true)
      } else if (elapsed >= 0.25 && !this.state.paused) {
        applyOffline(this.state, elapsed, { showReceipt: elapsed >= 20 })
        this.bump()
        this.save()
      }
    }
  }

  private pulse() {
    if (!this.running) return
    // Background tabs throttle timers. Skip live ticks and catch up once on return
    // so cash, sales, and tours are not applied twice.
    if (typeof document !== 'undefined' && document.hidden) return
    if (this.catchRun || this.pendingOffline) return
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
    // The sim ticks at 10 Hz; the UI repaints at 5 Hz (dispatches still repaint at once).
    this.pulses += 1
    if (this.pulses % PULSES_PER_PAINT === 0) this.bump()
  }

  can = (cmd: Command): Check => canCmd(this.state, cmd)

  dispatch = (cmd: Command): Check => {
    const undoable = new Set([
      'buyAd',
      'buyBuild',
      'sellBuild',
      'setBuildVariant',
      'hibernateBuild',
      'buyUpgrade',
      'buyUpgradeSweep',
      'levelVentureSweep',
      'buyMemo',
      'buyMemoSweep',
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
    // Only snapshot when the command can succeed — otherwise Undo arms on a no-op
    // and spend buttons feel "frozen" (click → silent fail → Undo lights up).
    if (undoable.has(cmd.type)) {
      const gate = canCmd(this.state, cmd)
      if (!gate.ok) return gate
      pushUndo(this.state, cmd.type)
    }
    const check = runCmd(this.state, cmd)
    // Accept rebuilds the whole run like Rebrand — an older spend snapshot must not resurrect it.
    if (check.ok && cmd.type === 'acceptEnding') clearUndo()
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
    // Mid catch-up the state is part-way through the away time: keep the old save (and its
    // timestamp) so closing the tab now just catches up again next time.
    if (this.catchRun || this.pendingOffline) return
    this.state.lastSavedAt = Date.now()
    try {
      saveGame(getActiveSaveId(), this.state)
      // Rolling backup every ten minutes of play (cheap: one JSON copy, newest three kept).
      const s = this.state
      snapshotGame(getActiveSaveId(), s, `Era ${s.era} · ${Math.floor(s.baskets).toLocaleString()} baskets`)
    } catch {
      /* ignore quota */
    }
  }

  reset(seed?: number) {
    clearUndo()
    this.state = createInitialState(seed)
    this.state.lastSavedAt = Date.now()
    this.bump()
    this.save()
  }

  /**
   * UI "New Game" — wipe the active save id (campaign or DevMode) and start fresh.
   * Must update the in-memory singleton, not only the account cache — otherwise a later
   * autosave / Play remount rewrites the wiped slot with the old run.
   */
  newGame(seed?: number) {
    clearGameSave(getActiveSaveId())
    this.reset(seed)
  }

  /** Rebrand prestige: fresh store, keep Empire + Goodwill (+ one carried doctrine OR facing). Returns a reason if blocked. */
  rebrand(carry: RebrandCarry = null): string | null {
    const blocked = canRebrand(this.state) ?? canCarry(this.state, carry)
    if (blocked) return blocked
    clearUndo()
    // A Rebrand pays out for the run; a backup from before it would let that payout repeat.
    clearSnapshots(getActiveSaveId())
    this.replaceState(rebrandState(this.state, Date.now(), carry))
    return null
  }

  /** Replace live state from a deserialized save (after import / slot load). */
  replaceState(next: GameState) {
    this.cancelCatchUp()
    this.state = next
    this.state.lastSavedAt = Date.now()
    this.bump()
    this.save()
  }

  /** Re-read the active grocery save from the account cache into the live engine. */
  reloadFromDisk() {
    this.cancelCatchUp()
    this.state = GroceryEngine.loadState()
    const pending = bootPending
    bootPending = null
    if (pending && this.running) this.beginCatchUp(pending.elapsed, pending.showReceipt)
    else this.pendingOffline = pending
    this.bump()
  }

  /** Copy current run into a named slot under the active save id. */
  saveToSlot(slot: 1 | 2 | 3): boolean {
    this.save()
    try {
      const id = getActiveSaveId()
      const raw = exportSave(id)
      if (!raw) return false
      saveRaw(`${id}-slot-${slot}`, raw)
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

  /** Automatic backups for the active save, newest first. */
  backups(): SnapshotInfo[] {
    return listSnapshots(getActiveSaveId())
  }

  /** Restore automatic backup `i`. The current run is snapshotted first, so a restore can be undone. */
  restoreBackup(i: number): boolean {
    try {
      const id = getActiveSaveId()
      const data = readSnapshot<unknown>(id, i)
      if (data == null) return false
      const s = this.state
      snapshotGame(id, s, `Before restore · Era ${s.era} · ${Math.floor(s.baskets).toLocaleString()} baskets`, Date.now(), true)
      this.replaceState(migrate(data))
      return true
    } catch {
      return false
    }
  }

  /** True when a slot has a stored JSON blob for the active save id. */
  hasSlot(slot: 1 | 2 | 3): boolean {
    return !!exportSave(`${getActiveSaveId()}-slot-${slot}`)
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

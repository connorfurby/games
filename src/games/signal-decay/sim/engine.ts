import { clearGameSave, loadGame, saveGame } from '@/shared/save'
import { setCampaignGlance } from '@/shared/saveGlance'
import { AUTOSAVE_MS, DT, TICK_HZ } from './balance'
import { can as canCmd, run as runCmd, type Check, type Command } from './commands'
import { repair } from './invariants'
import { migrate } from './migrate'
import { openUnpaused } from './pause'
import { getActiveSaveId } from './saveKey'
import { createInitialState, type GameState } from './state'
import { applyOffline, applyTick } from './tick'

type Listener = () => void

const PULSES_PER_PAINT = 4

function noteSignalGlance(id: string, s: GameState) {
  if (id.includes('-dev')) return
  const calls = Math.max(0, Math.floor(Number(s.calls ?? 0)))
  setCampaignGlance('signal-decay', {
    era: Math.max(0, Math.floor(s.era ?? 0)),
    lifetimeRevenue: Math.max(0, Math.floor(Number(s.lifetimeRevenue ?? 0))),
    headline: calls,
    playSec: Math.max(0, Math.floor(Number(s.time ?? 0))),
    lastSavedAt: s.lastSavedAt ?? Date.now(),
    headlineLabel: `${calls.toLocaleString()} calls`,
  })
}

export type EngineSnapshot = { readonly v: number; readonly state: GameState }

export class SignalEngine {
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
  private undoJson: string | null = null
  private undoUntil = 0

  constructor(state?: GameState) {
    this.state = state ?? SignalEngine.loadState()
    this.snapshot = { v: this.version, state: this.state }
    noteSignalGlance(getActiveSaveId(), this.state)
  }

  static loadState(): GameState {
    let raw: unknown = null
    try {
      raw = loadGame<unknown>(getActiveSaveId())
    } catch {
      raw = null
    }
    const state = raw == null ? createInitialState() : migrate(raw)
    repair(state)
    if (raw && typeof (raw as { lastSavedAt?: unknown }).lastSavedAt === 'number') {
      const elapsed = (Date.now() - (raw as { lastSavedAt: number }).lastSavedAt) / 1000
      if (elapsed > 2 && !state.paused) {
        try {
          applyOffline(state, elapsed, { showReceipt: elapsed >= 20 })
        } catch (e) {
          console.error('offline catch-up failed', e)
        }
      }
    }
    // Open on air. A saved pause is easy to miss; a double reject stays parked.
    // The away gap above already treated a pause as frozen.
    openUnpaused(state)
    state.lastSavedAt = Date.now()
    return state
  }

  static loadOrNew(): SignalEngine {
    return new SignalEngine(SignalEngine.loadState())
  }

  start() {
    if (this.running) return
    this.running = true
    this.hiddenAt = null
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
      if (elapsed >= 0.25 && !this.state.paused) {
        applyOffline(this.state, elapsed, { showReceipt: elapsed >= 20 })
        this.bump()
        this.save()
      }
    }
  }

  private pulse() {
    if (!this.running) return
    if (typeof document !== 'undefined' && document.hidden) return
    const dt = DT * Math.max(0, this.state.speed) * this.softPauseMul
    if (!this.state.paused && dt > 0) {
      applyTick(this.state, dt)
      repair(this.state)
    }
    this.autosaveAcc += 1000 / TICK_HZ
    if (this.autosaveAcc >= AUTOSAVE_MS) {
      this.autosaveAcc = 0
      this.save()
    }
    this.pulses += 1
    if (this.pulses % PULSES_PER_PAINT === 0) this.bump()
  }

  can = (cmd: Command): Check => canCmd(this.state, cmd)

  dispatch = (cmd: Command): Check => {
    if (cmd.type === 'undo') {
      if (!this.undoJson || Date.now() > this.undoUntil) {
        return { ok: false, reason: 'Undo window closed.' }
      }
      try {
        const restored = JSON.parse(this.undoJson) as GameState
        this.state = restored
        this.undoJson = null
        this.undoUntil = 0
        repair(this.state)
        this.bump()
        return { ok: true }
      } catch {
        return { ok: false, reason: 'Undo failed.' }
      }
    }
    const spendy =
      cmd.type.startsWith('buy') ||
      cmd.type === 'hire' ||
      cmd.type === 'payInvoice' ||
      cmd.type === 'printPromo' ||
      cmd.type === 'buyoutRival' ||
      cmd.type === 'buyBestUpgrade'
    if (spendy) {
      this.undoJson = JSON.stringify(this.state)
      this.undoUntil = Date.now() + 5000
    }
    const check = runCmd(this.state, cmd)
    if (check.ok) {
      repair(this.state)
      this.bump()
    } else if (spendy) {
      this.undoJson = null
      this.undoUntil = 0
    }
    return check
  }

  canUndo = (): boolean => !!this.undoJson && Date.now() <= this.undoUntil

  /** Epoch ms when the current undo window ends; 0 if none. */
  undoDeadline = (): number => (this.undoJson && this.undoUntil > Date.now() ? this.undoUntil : 0)

  save() {
    this.state.lastSavedAt = Date.now()
    try {
      const id = getActiveSaveId()
      saveGame(id, this.state)
      noteSignalGlance(id, this.state)
    } catch {
      /* ignore */
    }
  }

  reset(seed?: number) {
    this.state = createInitialState(seed)
    this.state.lastSavedAt = Date.now()
    this.bump()
    this.save()
  }

  newGame(seed?: number) {
    clearGameSave(getActiveSaveId())
    this.reset(seed)
  }

  replaceState(next: GameState) {
    this.state = next
    repair(this.state)
    openUnpaused(this.state)
    this.state.lastSavedAt = Date.now()
    this.bump()
    this.save()
  }

  reloadFromDisk() {
    this.state = SignalEngine.loadState()
    noteSignalGlance(getActiveSaveId(), this.state)
    this.bump()
  }

  subscribe = (fn: Listener) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = (): EngineSnapshot => this.snapshot

  getState = (): GameState => this.state

  private bump() {
    this.version += 1
    this.snapshot = { v: this.version, state: this.state }
    if (typeof document !== 'undefined' && document.hidden) return
    this.listeners.forEach((l) => l())
  }
}

const g = globalThis as typeof globalThis & { __signalDecayEngine?: SignalEngine }

/** One live engine for the tab — survives Vite HMR dual-module copies. */
export function getSignalEngine(): SignalEngine {
  if (!g.__signalDecayEngine) g.__signalDecayEngine = SignalEngine.loadOrNew()
  return g.__signalDecayEngine
}

export const engine = {
  get current() {
    return getSignalEngine()
  },
}

let panelAction = 0
export function notePanelAction() {
  panelAction += 1
}

let panelCache: { key: string; snap: EngineSnapshot } | null = null

/** Shell paints ~1 Hz (+ commands). Cash figures can subscribe to getSnapshot for live digits. */
export function getPanelSnapshot(): EngineSnapshot {
  const eng = getSignalEngine()
  const snap = eng.getSnapshot()
  const key = `t:${Math.floor(snap.state.time)}:a:${panelAction}`
  if (panelCache?.key === key) return panelCache.snap
  const next: EngineSnapshot = { v: snap.v, state: snap.state }
  panelCache = { key, snap: next }
  return next
}

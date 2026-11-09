/**
 * DevMode test harness: a live autopilot (the campaign bot playing your sandbox),
 * turbo time, headless fast-forward with a recorded timeline, and value editors.
 * Everything is a no-op outside the dev sandbox.
 */
import { nextGoal } from '../content/goals'
import { UPGRADES } from '../content/upgrades'
import { RIVALS } from '../content/rivals'
import { campaignCommands } from './bots'
import { can, run } from './commands'
import { engine } from './engine'
import { log, setEra, unlockMenu } from './helpers'
import { repair } from './invariants'
import { isDevSave } from './saveKey'
import type { GameState } from './state'
import { applyTick } from './tick'

export interface DevLoopState {
  autopilot: boolean
  turbo: number
  /** Commands the autopilot ran this session. */
  actions: number
  lastAction: string
}

const loop: DevLoopState = { autopilot: false, turbo: 0, actions: 0, lastAction: '' }
let timer: number | null = null
const subs = new Set<() => void>()
let version = 0

function emit() {
  version++
  for (const f of subs) f()
}

export const devLoop = {
  get: () => loop,
  version: () => version,
  subscribe(f: () => void) {
    subs.add(f)
    return () => subs.delete(f)
  },
  setAutopilot(on: boolean) {
    loop.autopilot = on
    ensure()
    emit()
  },
  setTurbo(x: number) {
    loop.turbo = Math.max(0, x)
    ensure()
    emit()
  },
}

function botStep(s: GameState) {
  for (const cmd of campaignCommands(s, Math.floor(s.time))) {
    if (can(s, cmd).ok) {
      run(s, cmd)
      loop.actions++
      loop.lastAction = cmd.type
    }
  }
}

const PERIOD_MS = 250

function ensure() {
  const want = isDevSave() && (loop.autopilot || loop.turbo > 0)
  if (want && timer == null) timer = window.setInterval(step, PERIOD_MS)
  if (!want && timer != null) {
    window.clearInterval(timer)
    timer = null
  }
}

function step() {
  if (!isDevSave()) {
    loop.autopilot = false
    loop.turbo = 0
    ensure()
    emit()
    return
  }
  const s = engine.getState()
  // Extra sim seconds per real 250 ms on top of the engine's own clock.
  const extra = Math.round((loop.turbo * PERIOD_MS) / 1000)
  if (loop.autopilot) botStep(s)
  for (let i = 0; i < extra; i++) {
    applyTick(s, 1)
    if (loop.autopilot && i % 2 === 0) botStep(s)
  }
  if (extra > 0) repair(s)
  engine.notify()
  emit()
}

// ── Headless fast-forward ────────────────────────────────────────────────────

export interface FFSample {
  t: number
  era: number
  rev: number
  cash: number
  empire: number
  goal: string
}

export interface FFResult {
  samples: FFSample[]
  eraAt: Record<number, number>
  seconds: number
  ms: number
}

/**
 * Play `seconds` of game time on a copy with the bot (or idle), in chunks so the page
 * stays responsive, then load the result into the sandbox.
 */
export function fastForward(
  seconds: number,
  opts: { bot: boolean; onProgress: (f: number) => void; onDone: (r: FFResult) => void },
): () => void {
  if (!isDevSave()) return () => {}
  const s = structuredClone(engine.getState())
  const start = s.time
  const samples: FFSample[] = []
  const eraAt: Record<number, number> = { [s.era]: 0 }
  const every = Math.max(10, Math.round(seconds / 240))
  const t0 = performance.now()
  let t = 0
  let cancelled = false
  const chunk = () => {
    if (cancelled) return
    const until = Math.min(seconds, t + 900)
    for (; t < until; t++) {
      if (opts.bot) {
        for (const cmd of campaignCommands(s, Math.floor(start + t))) if (can(s, cmd).ok) run(s, cmd)
      }
      applyTick(s, 1)
      repair(s)
      if (eraAt[s.era] === undefined) eraAt[s.era] = t
      if (t % every === 0) {
        samples.push({ t, era: s.era, rev: s.rates.revenuePerSec, cash: s.cash, empire: s.empire.level, goal: nextGoal(s)?.title ?? 'Done' })
      }
    }
    opts.onProgress(t / seconds)
    if (t < seconds) {
      window.setTimeout(chunk, 0)
      return
    }
    s.offlineReceipt = null
    log(s, `DevMode fast-forward: ${Math.round(seconds / 60)} min${opts.bot ? ' with the autopilot' : ''}.`, 'story')
    engine.replaceState(s)
    opts.onDone({ samples, eraAt, seconds, ms: performance.now() - t0 })
  }
  window.setTimeout(chunk, 0)
  return () => {
    cancelled = true
  }
}

// ── Editors ─────────────────────────────────────────────────────────────────

function mutate(fn: (s: GameState) => void, note: string) {
  if (!isDevSave()) return
  const s = engine.getState()
  fn(s)
  repair(s)
  log(s, `DevMode: ${note}`, 'story')
  engine.save()
  engine.notify()
}

export type DevField = 'cash' | 'baskets' | 'empireLevel' | 'read' | 'ideas' | 'goodwill' | 'capital' | 'control' | 'fuel' | 'brand'

export const DEV_FIELDS: { id: DevField; label: string; get: (s: GameState) => number }[] = [
  { id: 'cash', label: 'Cash', get: (s) => s.cash },
  { id: 'baskets', label: 'Baskets', get: (s) => s.baskets },
  { id: 'empireLevel', label: 'Empire rank', get: (s) => s.empire.level },
  { id: 'read', label: 'Read', get: (s) => s.read },
  { id: 'ideas', label: 'Ideas', get: (s) => s.compute.ideas },
  { id: 'goodwill', label: 'Goodwill', get: (s) => s.rebrand?.goodwill ?? 0 },
  { id: 'capital', label: 'Political capital', get: (s) => s.politics?.capital ?? 0 },
  { id: 'control', label: 'Control', get: (s) => s.control },
  { id: 'fuel', label: 'Fuel', get: (s) => s.fuel },
  { id: 'brand', label: 'Brand (0–1)', get: (s) => s.brand },
]

export function devSet(field: DevField, v: number) {
  if (!Number.isFinite(v)) return
  mutate((s) => {
    switch (field) {
      case 'cash':
        s.cash = Math.max(0, v)
        break
      case 'baskets':
        s.baskets = Math.max(0, Math.floor(v))
        s.stats.sold = Math.max(s.stats.sold, s.baskets)
        break
      case 'empireLevel':
        s.empire.level = Math.max(1, Math.min(100, Math.floor(v)))
        s.empire.xp = 0
        break
      case 'read':
        s.read = Math.max(0, v)
        break
      case 'ideas':
        s.compute.ideas = Math.max(0, v)
        break
      case 'goodwill':
        s.rebrand.goodwill = Math.max(0, Math.floor(v))
        break
      case 'capital':
        s.politics.capital = Math.max(0, v)
        break
      case 'control':
        s.control = Math.max(0, v)
        break
      case 'fuel':
        s.fuel = Math.max(0, v)
        break
      case 'brand':
        s.brand = Math.max(0.05, Math.min(1, v))
        break
    }
  }, `${field} = ${v}`)
}

export function devSetEra(era: number) {
  mutate((s) => {
    const e = Math.max(0, Math.min(6, Math.floor(era)))
    if (e > s.era) setEra(s, e)
    else s.era = e
    s.chapterQueue = []
  }, `era → ${era}`)
}

export function devUpgrades(mode: 'max' | 'half' | 'reset', tree?: string) {
  mutate((s) => {
    for (const u of UPGRADES) {
      if (tree && u.tree !== tree) continue
      s.upgrades[u.id] = mode === 'max' ? u.max : mode === 'half' ? Math.ceil(u.max / 2) : 0
    }
    if (mode !== 'reset') unlockMenu(s, 'upgrades')
  }, `upgrades ${mode}${tree ? ` (${tree})` : ''}`)
}

export function devRivals(mode: 'open' | 'buy' | 'reset') {
  mutate((s) => {
    if (mode === 'reset') {
      s.rivals = {}
      return
    }
    for (const r of RIVALS) {
      const st = (s.rivals[r.id] ??= {
        stores: r.startStores,
        bought: false,
        boughtStores: 0,
        nextGrowAt: s.time + r.growSec,
        frozenUntil: 0,
        warReadyAt: 0,
        grown: 0,
        wars: 0,
      })
      if (mode === 'buy') {
        st.bought = true
        st.boughtStores = st.stores
      }
    }
    unlockMenu(s, 'rivals')
  }, `rivals ${mode}`)
}

export function devChain(stores: number) {
  mutate((s) => {
    const n = Math.max(1, Math.min(12, Math.floor(stores)))
    while (s.stores.length < n) {
      const i = s.stores.length
      s.stores.push({ ...s.stores[0]!, id: `dev-${i}-${Date.now()}`, name: `Store ${i + 1}`, level: 5, xp: 0, drift: 0, attentionShare: 1 / n })
    }
    s.stores.length = n
    for (const st of s.stores) st.attentionShare = 1 / n
    if (n >= 5) s.depot = true
    unlockMenu(s, 'land')
  }, `${stores} stores`)
}

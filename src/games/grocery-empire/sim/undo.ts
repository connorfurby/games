import type { GameState } from './state'
import { serializeState, deserializeState } from '@/shared/save'

const WINDOW_MS = 5000
const MAX = 2

interface Snap {
  at: number
  label: string
  raw: string
}

let stack: Snap[] = []

const HUMAN: Record<string, string> = {
  buyAd: 'ad',
  buyBuild: 'build',
  sellBuild: 'build sale',
  setBuildVariant: 'facing',
  hibernateBuild: 'hibernate',
  buyUpgrade: 'upgrade',
  buyUpgradeSweep: 'upgrades',
  levelVentureSweep: 'venture levels',
  buyMemo: 'memo',
  buyMemoSweep: 'memos',
  buyWholesale: 'crate',
  hire: 'hire',
  buyEndcap: 'endcap',
  openVenture: 'venture',
  levelVenture: 'venture level',
  expandLot: 'lot expansion',
  expandSideYard: 'side yard',
  depositPassbook: 'deposit',
  depositInvest: 'investment',
  incorporate: 'incorporation',
  openStore: 'new store',
  buildDepot: 'depot',
  buyPlant: 'plant',
  buyTank: 'tank',
  hireLobby: 'lobbyist',
  openLane: 'lane',
  buyFuel: 'fuel',
  launchBarge: 'barge',
  buyCharter: 'charter',
  buyDoctrine: 'doctrine',
  buyInvestEngine: 'engine',
}

/** Human phrase for an undo label (raw command type or already-human text). */
export function undoLabel(raw: string): string {
  if (HUMAN[raw]) return HUMAN[raw]
  // Unknown camelCase command → "some command"; already-human text passes through.
  return raw.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
}

/** Push a snapshot before a risky player command (ads, builds, big spends). */
export function pushUndo(s: GameState, label: string) {
  try {
    const now = Date.now()
    stack = stack.filter((snap) => now - snap.at <= WINDOW_MS)
    stack.push({ at: now, label: undoLabel(label), raw: serializeState(s) })
    while (stack.length > MAX) stack.shift()
  } catch {
    /* ignore */
  }
}

/** Test helper — current undo stack depth. */
export function __undoStackLength(): number {
  return stack.length
}

export function canUndo(): { ok: boolean; label?: string } {
  const now = Date.now()
  // Drop expired JSON blobs so late-game saves (~hundreds of KB) do not linger.
  if (stack.some((snap) => now - snap.at > WINDOW_MS)) {
    stack = stack.filter((snap) => now - snap.at <= WINDOW_MS)
  }
  const top = stack[stack.length - 1]
  if (!top) return { ok: false }
  return { ok: true, label: top.label }
}

/** Whole seconds (rounded up) left in the undo window; 0 when nothing can be undone. */
export function undoSecondsLeft(): number {
  const top = stack[stack.length - 1]
  if (!top) return 0
  const left = WINDOW_MS - (Date.now() - top.at)
  return left > 0 ? Math.ceil(left / 1000) : 0
}

/** Restore previous snapshot into `s` by mutating fields. Returns false if window expired. */
export function applyUndo(s: GameState): boolean {
  const gate = canUndo()
  if (!gate.ok) return false
  const snap = stack.pop()
  if (!snap) return false
  const prev = deserializeState<GameState>(snap.raw)
  if (!prev) return false
  for (const key of Object.keys(prev) as (keyof GameState)[]) {
    ;(s as unknown as Record<string, unknown>)[key as string] = prev[key] as unknown
  }
  return true
}

export function clearUndo() {
  stack = []
}

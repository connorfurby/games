import type { GameState } from './state'
import { serializeState, deserializeState } from '@/shared/save'

const WINDOW_MS = 5000
const MAX = 8

interface Snap {
  at: number
  label: string
  raw: string
}

let stack: Snap[] = []

/** Push a snapshot before a risky player command (ads, builds, big spends). */
export function pushUndo(s: GameState, label: string) {
  try {
    stack.push({ at: Date.now(), label, raw: serializeState(s) })
    if (stack.length > MAX) stack.shift()
  } catch {
    /* ignore */
  }
}

export function canUndo(): { ok: boolean; label?: string } {
  const top = stack[stack.length - 1]
  if (!top) return { ok: false }
  if (Date.now() - top.at > WINDOW_MS) return { ok: false }
  return { ok: true, label: top.label }
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

import type { GameState } from './state'

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export function nextRng(s: GameState): number {
  let x = (s.rng | 0) >>> 0
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  s.rng = x >>> 0 || 1
  return (s.rng >>> 0) / 4294967296
}

export function pick<T>(s: GameState, arr: readonly T[]): T {
  return arr[Math.floor(nextRng(s) * arr.length)]!
}

/** Soft-capped additive bonus. Empty input → 0. Use as `base * (1 + softCap(b))`. */
export function softCap(bonus: number): number {
  return Math.pow(1 + Math.max(0, bonus), 0.7) - 1
}

export function clarity(s: GameState): number {
  const c = s.air.carrier
  const n = Math.max(0, s.air.noise)
  return c / (c + n + 1e-9)
}

export function ok(): { ok: true } {
  return { ok: true }
}

export function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason }
}

export type Check = { ok: true } | { ok: false; reason: string }

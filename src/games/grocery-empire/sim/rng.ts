import type { GameState } from './state'

/** Seeded mulberry32 stored on state so replays and offline catch-up are deterministic. */
export function nextRng(s: GameState): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function chance(s: GameState, p: number): boolean {
  return nextRng(s) < p
}

export function pick<T>(s: GameState, items: readonly T[]): T {
  return items[Math.floor(nextRng(s) * items.length) % items.length]
}

import type { GameState } from './state'

/** Last Carrier refused twice. That silence stays parked across a reload. */
export function storySilence(s: GameState): boolean {
  return s.dial.rejected >= 2
}

/**
 * A saved pause is easy to miss on the next visit. Clear it so the station opens on air.
 * Time spent away while paused is not caught up — that gap was frozen on purpose.
 */
export function openUnpaused(s: GameState): void {
  if (!storySilence(s)) s.paused = false
}

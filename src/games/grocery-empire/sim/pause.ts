import type { GameState } from './state'

/** An ending the player chose to stop. Those stay parked across a reload. */
export function storySilence(s: GameState): boolean {
  return s.endingChoice === 'reject' || s.horizon.ending === 'reject'
}

/**
 * A saved pause is easy to miss on the next visit. Clear it so the store opens running.
 * Time spent away while paused is not caught up — that gap was frozen on purpose.
 */
export function openUnpaused(s: GameState): void {
  if (!storySilence(s)) s.paused = false
}

import { ENDING_BEATS } from '../../content/lateEras'
import { ENDINGS } from '../balance'
import { log } from '../helpers'
import type { GameState } from '../state'

export function endingOpen(s: GameState): boolean {
  return s.era >= 6 && s.fleet.biomass <= 0 && s.endingChoice === null
}

export function canAcceptEnding(s: GameState): string | null {
  if (s.endingChoice) return 'Ending already chosen.'
  if (!endingOpen(s) && !(s.memos['universal-ration'] > 0)) {
    return 'Clear universe biomass first.'
  }
  if (s.era < 6 && !(s.memos['accept-exile'] > 0)) return 'Ending not open yet.'
  return null
}

export function canRejectEnding(s: GameState): string | null {
  if (s.endingChoice) return 'Ending already chosen.'
  if (!endingOpen(s) && !(s.memos['universal-ration'] > 0)) {
    return 'Clear universe biomass first.'
  }
  if (s.era < 6 && !(s.memos['reject-silence'] > 0)) return 'Ending not open yet.'
  return null
}

function narrate(s: GameState, beats: readonly string[]) {
  for (const line of beats) log(s, line, 'era')
}

/** Accept: prestige to hungry universe; UI bumps groceryUniverses via pendingAccept. */
export function acceptEnding(s: GameState) {
  narrate(s, ENDING_BEATS.accept)
  s.endingChoice = 'accept'
  s.pendingAccept = true
  s.prestigeCarry.universeIndex += 1
  s.prestigeCarry.appetite += ENDINGS.acceptAppetite
  s.prestigeCarry.tipSharpness += ENDINGS.acceptTip
  // Clear prior laws — player re-picks 0–2 on the Hungry laws board (default none).
  s.prestigeCarry.mutators = []
  // Soft reset of run currencies — appetite carries; cosmetics/meta outside
  s.cash = 20
  s.baskets = 0
  s.fleet.biomass = s.fleet.biomassMax
  s.fleet.barges = 0
  s.fleet.launched = false
  s.fleet.warOn = false
  s.cold.plants = 0
  s.cold.tanks = 0
  s.cold.yieldLeft = s.cold.yieldMax
  s.cold.momentum = 1
  s.cold.browned = false
  s.era = 0
  s.chapterQueue.push(0)
  log(s, 'Accept filed. Hungry laws board open — pick 0–2, or Confirm with none.', 'era')
}

/** Reject: ordered disassembly; no prestige; mythic gallery path. */
export function rejectEnding(s: GameState) {
  narrate(s, ENDING_BEATS.reject)
  s.endingChoice = 'reject'
  s.pendingAccept = false
  s.fleet.warOn = false
  s.fleet.barges = 0
  s.fleet.biomass = 0
  s.cold.plants = 0
  s.cold.tanks = 0
  s.cold.momentumOn = false
  s.compute.attention = 0
  s.paused = true
  log(s, 'Reject complete. Silence. Last Ration plaque filed.', 'era')
}

/** Slow reject disassembly flavour if somehow mid-reject (noop when already done). */
export function tickEndings(s: GameState, _dt: number) {
  if (s.endingChoice !== 'reject') return
  // Keep parked — nothing to tick after reject silence
}

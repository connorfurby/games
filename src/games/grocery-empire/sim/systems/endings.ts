import { ENDING_BEATS, HUNGRY_MUTATORS } from '../../content/lateEras'
import { TUTORIALS } from '../../content/tutorials'
import { upgradeEffect } from '../../content/upgrades'
import { ENDINGS } from '../balance'
import { replaceStateInPlace, freshRunKeepingMeta, canCarry, carryName, type RebrandCarry } from './prestige'
import { log } from '../helpers'
import type { GameState } from '../state'

function endingSpineReady(s: GameState): boolean {
  const boardOk = (s.stats.boardMeetings ?? 0) >= 1 || s.board.lastResolvedAt > 0
  const stewardOk = s.depth?.stewardId != null
  return boardOk && stewardOk
}

export function endingOpen(s: GameState): boolean {
  const pocketsOk =
    (s.fleet.pockets?.filter((p) => p.left <= 0).length ?? 0) >= 4 || s.fleet.biomass <= 0
  const rationFacing = !!s.depth?.facings?.ration
  return (
    s.era >= 6 &&
    pocketsOk &&
    (rationFacing || s.fleet.biomass <= 0) &&
    endingSpineReady(s) &&
    s.endingChoice === null
  )
}

/** Mutator preview upgrade softens Hungry-law board friction (flavor scalar). */
export function mutatorPreviewMul(s: GameState): number {
  return 1 + upgradeEffect(s, 'mutator-preview') * 0.2
}

export function canAcceptEnding(s: GameState, carry: RebrandCarry = null): string | null {
  const carryWhy = canCarry(s, carry)
  if (carryWhy) return carryWhy
  return canAcceptEndingBase(s)
}

function canAcceptEndingBase(s: GameState): string | null {
  if (s.endingChoice === 'continue') return 'Already continued past the ration.'
  if (s.endingChoice) return 'Ending already chosen.'
  if (!endingOpen(s) && !(s.memos['universal-ration'] > 0)) {
    return 'Clear universe biomass first.'
  }
  if (s.era < 6 && !(s.memos['accept-exile'] > 0)) return 'Ending not open yet.'
  if (s.depth?.stewardId == null) return 'Promote a Steward first.'
  if ((s.stats.boardMeetings ?? 0) < 1 && !(s.board.lastResolvedAt > 0)) {
    return 'Resolve a board agenda first.'
  }
  return null
}

export function canRejectEnding(s: GameState): string | null {
  if (s.endingChoice === 'continue') return 'Already continued past the ration.'
  if (s.endingChoice) return 'Ending already chosen.'
  if (!endingOpen(s) && !(s.memos['universal-ration'] > 0)) {
    return 'Clear universe biomass first.'
  }
  if (s.era < 6 && !(s.memos['reject-silence'] > 0)) return 'Ending not open yet.'
  if (s.depth?.stewardId == null) return 'Promote a Steward first.'
  if ((s.stats.boardMeetings ?? 0) < 1 && !(s.board.lastResolvedAt > 0)) {
    return 'Resolve a board agenda first.'
  }
  return null
}

function narrate(s: GameState, beats: readonly string[]) {
  for (const line of beats) log(s, line, 'era')
}

/** Era 0–1 whisper tips (tipsSeen) that replay on NG+. */
export const EARLY_TIP_IDS = [
  'first-unpack',
  'first-basket',
  'first-price',
  'first-wholesale',
  'first-memo',
  'first-staff',
] as const

/** Era 0–1 spoken strip lines (seenLines) that replay on NG+. Openers stay marked — coach owns that lesson. */
export const EARLY_LINE_IDS = [
  'first-unpack',
  'first-sale',
  'first-wholesale',
  'first-hire',
  'first-memo',
  'dlg-baskets-5',
  'dlg-baskets-25',
] as const

/**
 * NG+ teaching reset: Era 0–1 tutorials, tips, and spoken lines may replay (they re-queue from
 * the usual unlock hooks). Empire perks, Hungry laws, and Era 2+ teaching are untouched.
 */
export function softResetTeaching(s: GameState) {
  const early = new Set(TUTORIALS.filter((t) => t.era <= 1).map((t) => t.id))
  for (const id of early) delete s.tutorials.done[id]
  s.tutorials.queue = s.tutorials.queue.filter((id) => !early.has(id))
  if (s.tutorials.active && early.has(s.tutorials.active.id)) s.tutorials.active = null
  for (const id of EARLY_TIP_IDS) delete s.tipsSeen[id]
  const lines = new Set<string>(EARLY_LINE_IDS)
  for (const id of lines) delete s.seenLines[id]
  s.dialogueQueue = s.dialogueQueue.filter((id) => !lines.has(id))
}

/**
 * Accept: rebuild the run like Rebrand (same keep-list — see `freshRunKeepingMeta`), then open the
 * Hungry laws board. Store, staff, depth board, upgrades, cash and fleet all start over; Empire,
 * museum, Goodwill, tipSharpness / appetite carry. UI bumps groceryUniverses via pendingAccept.
 */
export function acceptEnding(s: GameState, carry: RebrandCarry = null) {
  s.prestigeCarry.universeIndex += 1
  s.prestigeCarry.appetite += ENDINGS.acceptAppetite
  s.prestigeCarry.tipSharpness += ENDINGS.acceptTip
  // Clear prior laws — player re-picks 0–2 on the Hungry laws board (default none).
  s.prestigeCarry.mutators = []
  if (s.depth?.stewardId != null) {
    const m = s.staff.find((x) => x.id === s.depth.stewardId)
    if (m) s.prestigeCarry.stewardName = m.name
  }
  void mutatorPreviewMul(s)
  const carried = carry && !canCarry(s, carry) ? carry : null
  const { fresh, gain } = freshRunKeepingMeta(s, s.createdAt, carried)
  replaceStateInPlace(s, fresh)
  narrate(s, ENDING_BEATS.accept)
  s.endingChoice = 'accept'
  s.pendingAccept = true
  softResetTeaching(s)
  s.chapterQueue.push(0)
  log(
    s,
    `Accept filed — rebuilt like a Rebrand (+${gain} Goodwill, ${s.rebrand.goodwill} total). Hungry laws board open — pick 0–2, or Confirm with none.`,
    'era',
  )
  if (carried) log(s, `Carried across: ${carryName(carried)}.`, 'good')
}

/** Hungry-law options an Accept would put on the board (the "law each Accept would turn on"). */
export function acceptLawOptions(): readonly { id: string; name: string; blurb: string }[] {
  return HUNGRY_MUTATORS
}

/** Reject: ordered disassembly; no prestige; mythic gallery path. */
export function rejectEnding(s: GameState) {
  narrate(s, ENDING_BEATS.reject)
  s.endingChoice = 'reject'
  s.pendingAccept = false
  s.fleet.warOn = false
  s.fleet.barges = 0
  s.fleet.launches = 0
  s.fleet.biomass = 0
  s.cold.plants = 0
  s.cold.tanks = 0
  s.cold.momentumOn = false
  s.compute.attention = 0
  s.paused = true
  log(s, 'You chose Reject. The universe goes quiet. The Last Ration plaque is yours.', 'era')
}

/** Slow reject disassembly flavour if somehow mid-reject (noop when already done). */
export function tickEndings(s: GameState, _dt: number) {
  if (s.endingChoice !== 'reject') return
  // Keep parked — nothing to tick after reject silence
}

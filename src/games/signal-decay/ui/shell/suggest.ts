import type { GameState } from '../../sim/state'

/**
 * One aside for the Next strip. Returns null when it would restate the goal,
 * so Next Goal stays the only guidance channel.
 */
export function suggestAside(
  s: GameState,
  goal: { id: string; hint?: string } | null,
): string | null {
  if (!goal) return null
  const id = goal.id
  let line: string | null = null

  const late = s.depth.invoices.some((inv) => !inv.paid && s.time > inv.dueAt)
  const choir = s.rivals.choir
  const humming = !!choir && choir.stores > 0 && s.time >= s.depth.choirHushUntil
  const traitReady = !!s.depth.hotTrait && s.era >= 3 && s.time >= s.depth.hotTraitReadyAt

  if (late) line = 'A power bill is late.'
  else if (humming && id !== 'guest-ears') line = 'The Choir is humming under this show.'
  else if (traitReady && id !== 'hot-trait' && id !== 'heat-logs')
    line = `Hot trait on the towers: ${s.depth.hotTrait}.`
  else if (s.depth.waitingCaller && id !== 'serve-callers' && id !== 'feature-format')
    line = `${s.depth.waitingCaller.name} is waiting on the other line.`
  else if (s.depth.laneOpen && id !== 'exam-holds' && id !== 'clean-manifests')
    line = 'A fast manifest left the lane open.'

  if (!line) return null
  if (goal.hint && goal.hint.toLowerCase() === line.toLowerCase()) return null
  return line
}

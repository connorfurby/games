import { DOCTRINE_BY_ID } from '../../content/doctrines'
import { PROGRAM_BY_ID } from '../../content/programs'
import type { GameState } from '../../sim/state'

export function carryLine(carry: GameState['prestigeCarry']): string {
  if (!carry) return 'Nothing extra is carried — archive and trust still stay.'
  if (carry.type === 'doctrine') {
    return `${DOCTRINE_BY_ID[carry.id]?.name ?? carry.id} comes with you.`
  }
  return `${PROGRAM_BY_ID[carry.id]?.name ?? carry.id} is already slotted on the next run.`
}

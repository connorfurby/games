import { describe, expect, it } from 'vitest'
import { TUTORIALS } from '../content/tutorials'
import { COACH_TARGETS, menuForCoachId } from './coachTargets'

/** True when coachTargets can route this id (exact map, prefix, or known chrome). */
function isMapped(coachId: string): boolean {
  if (Object.prototype.hasOwnProperty.call(COACH_TARGETS, coachId)) return true
  // menuForCoachId returns null for chrome that is always mounted — still "mapped"
  // if a prefix rule or known chrome id matched. Unknown ids also return null, so
  // distinguish via the same prefix rules used in menuForCoachId.
  if (coachId.startsWith('menu-')) return true
  if (coachId.startsWith('floor-')) return true
  if (coachId.startsWith('backroom-')) return true
  if (coachId.startsWith('staff-') || coachId === 'hours' || coachId.startsWith('hire-')) return true
  if (coachId === 'call-inspector') return true
  if (coachId.startsWith('marketing-')) return true
  if (coachId.startsWith('invest-')) return true
  if (coachId.startsWith('upgrades-') || coachId.startsWith('upgrade-')) return true
  if (coachId.startsWith('ventures-') || coachId.startsWith('venture-')) return true
  if (coachId.startsWith('land-') || coachId.startsWith('expand-') || coachId === 'open-store') return true
  if (coachId.startsWith('suppliers-') || coachId === 'wholesale-index' || coachId === 'emergency-delivery') {
    return true
  }
  if (coachId.startsWith('build-')) return true
  if (coachId.startsWith('books-')) return true
  if (coachId.startsWith('strategy-') || coachId.startsWith('doctrine-')) return true
  if (coachId.startsWith('empire-') || coachId.startsWith('perk-')) return true
  if (coachId.startsWith('cold-')) return true
  if (coachId.startsWith('politics-')) return true
  if (coachId.startsWith('logistics-')) return true
  if (coachId.startsWith('fleet-') || coachId.startsWith('ending-')) return true
  if (coachId.startsWith('planets-')) return true
  if (coachId.startsWith('exchange-')) return true
  if (coachId.startsWith('cultivars-')) return true
  if (coachId.startsWith('signal-')) return true
  if (coachId.startsWith('charter-')) return true
  if (coachId.startsWith('lastaisle-')) return true
  if (coachId.startsWith('compute-') || coachId.startsWith('memo-')) return true
  if (
    coachId === 'meta-shelf' ||
    coachId === 'ledger' ||
    coachId === 'hire-analyst' ||
    coachId === 'buy-archive' ||
    coachId === 'new-game'
  ) {
    return true
  }
  return menuForCoachId(coachId) != null
}

describe('coachTargets', () => {
  it('maps every tutorial coachId', () => {
    const missing: string[] = []
    for (const tut of TUTORIALS) {
      for (const step of tut.steps) {
        if (!isMapped(step.coachId)) missing.push(`${tut.id}/${step.id}:${step.coachId}`)
      }
    }
    expect(missing).toEqual([])
  })
})

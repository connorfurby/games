import { describe, expect, it } from 'vitest'
import { TUTORIALS } from '../content/tutorials'
import { COACH_TARGETS, menuForCoachId } from './coachTargets'

describe('coach id coverage', () => {
  const tutorialIds = [
    ...new Set(TUTORIALS.flatMap((t) => t.steps.map((s) => s.coachId))),
  ].sort()

  it('lists every tutorials.ts coachId in COACH_TARGETS', () => {
    const missing = tutorialIds.filter((id) => !(id in COACH_TARGETS))
    expect(missing, `Add missing coachIds to COACH_TARGETS: ${missing.join(', ')}`).toEqual([])
  })

  it('allows UI-only coach targets beyond tutorial steps', () => {
    // ending-reject / fleet-endings / etc. can live on panels without a tour step.
    const used = new Set(tutorialIds)
    const orphans = Object.keys(COACH_TARGETS).filter((id) => !used.has(id))
    expect(orphans.every((id) => typeof COACH_TARGETS[id] !== 'undefined')).toBe(true)
  })

  it('menuForCoachId matches COACH_TARGETS for every tutorial coachId', () => {
    for (const id of tutorialIds) {
      expect(menuForCoachId(id)).toBe(COACH_TARGETS[id])
    }
  })

  it('routes late-era prefixes to their panels', () => {
    expect(menuForCoachId('cold-buy-plant')).toBe('cold')
    expect(menuForCoachId('politics-lobby')).toBe('politics')
    expect(menuForCoachId('logistics-lane')).toBe('logistics')
    expect(menuForCoachId('fleet-launch')).toBe('fleet')
    expect(menuForCoachId('books-incorporate')).toBe('books')
    expect(menuForCoachId('strategy-tournament')).toBe('strategy')
    expect(menuForCoachId('empire-autonomous')).toBe('empire')
    expect(menuForCoachId('marketing-ads')).toBe('marketing')
    expect(menuForCoachId('floor-memos')).toBe(null)
  })
})

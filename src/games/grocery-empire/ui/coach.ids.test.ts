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

  it('every tutorial step points at something the UI actually draws', () => {
    // Walk ui/ for the ids the screens mount: static data-coach-id / coachId strings,
    // plus the few built from a template (menu-*, hire-*, build-*, venture-collect-*).
    const src = Object.values(
      import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts', '!./**/*.test.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
    ).join('\n')
    const templated = [/^menu-/, /^hire-/, /^build-/, /^venture-collect-/, /^venture-open-/, /^staff-policy-/, /^logistics-stance-/]
    const dead = tutorialIds.filter((id) => !templated.some((r) => r.test(id)) && !src.includes(`'${id}'`) && !src.includes(`"${id}"`))
    expect(dead, `Tutorial steps point at ids no screen mounts: ${dead.join(', ')}`).toEqual([])
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

  it('orphaned tutorial coachIds have a known mount point in source', () => {
    // These used to point at dead TopBar / missing Fleet attrs. Keep the map honest.
    const mounts: Record<string, string> = {
      'upgrades-floor': 'data-coach-id="upgrades-floor"',
      'meta-shelf': 'data-coach-id="meta-shelf"',
      'fleet-guardian': 'fleet-guardian',
      'fleet-drift': 'data-coach-id="fleet-drift"',
    }
    for (const [id, needle] of Object.entries(mounts)) {
      expect(COACH_TARGETS[id] !== undefined, id).toBe(true)
      expect(needle.length).toBeGreaterThan(0)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { AWARD_GROUPS, awardGroup, awardsIn, nearestAwards, type AwardProgress } from './groups'
import { ACHIEVEMENTS } from './registry'

describe('award groups', () => {
  it('every award sits in exactly one group and no group is empty', () => {
    const total = AWARD_GROUPS.reduce((n, g) => n + awardsIn(g.id).length, 0)
    expect(total).toBe(ACHIEVEMENTS.length)
    for (const g of AWARD_GROUPS) expect(awardsIn(g.id).length).toBeGreaterThan(0)
  })
  it('section starts land where the wall says', () => {
    expect(awardGroup('first-basket')).toBe('counter')
    expect(awardGroup('first-spoil')).toBe('store')
    expect(awardGroup('era-2')).toBe('chain')
  })
  it('nearest awards skip earned, hidden, untouched and meterless ones', () => {
    const mk = (id: string, fraction: number | null, hidden = false): AwardProgress => ({
      def: { ...ACHIEVEMENTS[0]!, id, hidden },
      fraction,
      value: 0,
      max: fraction == null ? null : 10,
    })
    const list = [mk('a', 0.9), mk('b', 0.5), mk('c', 0), mk('d', null), mk('e', 0.95, true), mk('f', 0.99)]
    expect(nearestAwards(list, { f: true }).map((p) => p.def.id)).toEqual(['a', 'b'])
  })
})

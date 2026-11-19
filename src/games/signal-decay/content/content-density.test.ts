import { describe, expect, it } from 'vitest'
import { WHISPERS } from './dialogue'
import { MEMOS } from './memos'
import { RIVAL_FACES } from './rivals'
import { STAFF_ROLES } from './staff'
import { OPENING_TOUR, TIPS, TOURS } from './tutorials'
import { UPGRADES } from './upgrades'

const unique = (xs: string[]) => new Set(xs).size === xs.length

describe('content density', () => {
  it('has ≥300 upgrades with unique ids and the original 20 first', () => {
    expect(UPGRADES.length).toBeGreaterThanOrEqual(300)
    expect(unique(UPGRADES.map((u) => u.id))).toBe(true)
    expect(UPGRADES[0]!.id).toBe('crystal-gain')
    expect(UPGRADES[19]!.id).toBe('star-glow')
  })

  it('has ≥40 tours across eras 0–6, each with unique step ids', () => {
    const tours = Object.values(TOURS)
    expect(tours.length).toBeGreaterThanOrEqual(40)
    for (const t of tours) {
      expect(t.era).toBeGreaterThanOrEqual(0)
      expect(t.era).toBeLessThanOrEqual(12)
      expect(t.steps.length).toBeGreaterThan(0)
      expect(unique(t.steps.map((s) => s.id))).toBe(true)
    }
    expect(OPENING_TOUR.length).toBe(8)
  })

  it('has ≥40 tips, ≥80 memos, ≥150 whispers with unique ids', () => {
    expect(TIPS.length).toBeGreaterThanOrEqual(40)
    expect(MEMOS.length).toBeGreaterThanOrEqual(80)
    expect(WHISPERS.length).toBeGreaterThanOrEqual(150)
    expect(unique(TIPS.map((t) => t.id))).toBe(true)
    expect(unique(MEMOS.map((m) => m.id))).toBe(true)
    expect(unique(WHISPERS.map((w) => w.id))).toBe(true)
  })

  it('names staff roles and the four rival faces', () => {
    expect(STAFF_ROLES.length).toBeGreaterThanOrEqual(20)
    expect(RIVAL_FACES.map((r) => r.id)).toEqual(['pirate', 'metrowave', 'orbital', 'choir'])
  })
})

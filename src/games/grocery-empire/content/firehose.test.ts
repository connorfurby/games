import { describe, expect, it } from 'vitest'
import { createInitialState } from '../sim/state'
import { DIALOGUE_LINES } from './dialogue'
import { MEMOS } from './memos'
import { poemsForEra } from './poetry'
import { TIPS } from './tips'

function dupes(ids: string[]) {
  const seen = new Set<string>()
  return ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)))
}

describe('content firehose', () => {
  it('has unique ids across memos, tips, dialogue', () => {
    expect(dupes(MEMOS.map((m) => m.id))).toEqual([])
    expect(dupes(TIPS.map((t) => t.id))).toEqual([])
    expect(dupes(DIALOGUE_LINES.map((d) => d.id))).toEqual([])
  })

  it('every dialogue/tip/memo predicate is safe on a fresh state', () => {
    const s = createInitialState(11)
    for (const d of DIALOGUE_LINES) expect(() => d.when(s)).not.toThrow()
    for (const t of TIPS) expect(() => t.when(s)).not.toThrow()
    for (const m of MEMOS) {
      expect(() => m.visible(s)).not.toThrow()
      expect(() => m.cost(s)).not.toThrow()
    }
  })

  it('does not fire late-era dialogue on a fresh state', () => {
    const s = createInitialState(12)
    const fired = DIALOGUE_LINES.filter((d) => d.id.startsWith('era') && d.when(s)).map((d) => d.id)
    expect(fired).toEqual([])
  })

  it('poetry filters by era', () => {
    const early = poemsForEra(0).map((p) => p.text)
    const late = poemsForEra(6).map((p) => p.text)
    expect(early.length).toBeGreaterThan(0)
    expect(late.length).toBeGreaterThan(early.length)
    expect(early).not.toContain('The last ration is a sentence with no period.')
    expect(late).toContain('The last ration is a sentence with no period.')
  })

  it('decorative memos stay small', () => {
    const s = createInitialState(13)
    for (const m of MEMOS) {
      if (!m.effect.startsWith('+1 Empire XP') && !m.effect.startsWith('Brand +')) continue
      const cost = m.cost(s)
      expect(cost.ideas ?? 0).toBe(0)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { RELICS } from '../content/relics'
import { relicPerk } from '../content/relicPerks'
import { run } from './commands'
import { createInitialState } from './state'
import { statMul } from './systems/stats'

describe('relic showcase (sockets)', () => {
  it('a socketed relic makes its stat stronger, and unsocketing takes it back', () => {
    const s = createInitialState(3)
    const r = RELICS.find((x) => !x.feat && x.rarity === 'mythic') ?? RELICS[0]!
    const stat = relicPerk(r).stat
    run(s, {
      type: 'syncRelics',
      wings: [],
      count: 1,
      unlocked: true,
      owned: { [r.id]: 1 },
      levels: { [r.id]: 1 },
      sockets: [],
      litWings: null,
      dust: 0,
    })
    const plain = statMul(s, stat)
    expect(plain).toBeGreaterThan(1)
    expect(run(s, { type: 'socketRelic', id: r.id }).ok).toBe(true)
    const shown = statMul(s, stat)
    expect(shown).toBeGreaterThan(plain)
    // The relic's own share grows by the socket multiplier (1.35 without the Horizon perk).
    expect((shown - 1) / (plain - 1)).toBeCloseTo(1.35, 1)
    run(s, { type: 'unsocketRelic', id: r.id })
    expect(statMul(s, stat)).toBeCloseTo(plain, 6)
  })
})

describe('fill the showcase', () => {
  it('puts the strongest relics in the cases, best first, and is a no-op when already right', async () => {
    const { emptyMuseum: createMuseum, fillShowcase, bestShowcase, relicWorth } = await import('./museum')
    const m = createMuseum()
    const ids = RELICS.filter((r) => !r.feat).slice(0, 6).map((r) => r.id)
    for (const id of ids) m.relics[id] = { n: 1, level: 1, at: 0 }
    expect(fillShowcase(m, 3)).toBe(true)
    expect(m.sockets).toHaveLength(3)
    const worst = Math.min(...m.sockets.map((id) => relicWorth(m, id)))
    for (const id of ids.filter((x) => !m.sockets.includes(x))) expect(relicWorth(m, id)).toBeLessThanOrEqual(worst)
    expect(m.sockets).toEqual(bestShowcase(m, 3))
    expect(fillShowcase(m, 3)).toBe(false)
  })
})

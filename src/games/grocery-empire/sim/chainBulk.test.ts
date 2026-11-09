import { describe, expect, it } from 'vitest'
import { can, run } from './commands'
import { createInitialState, type StoreState } from './state'

function chain(n: number) {
  const s = createInitialState(3)
  s.era = 2
  s.stores = Array.from({ length: n }, (_, i): StoreState => ({
    id: `s${i}`,
    name: `Store ${i + 1}`,
    level: 1,
    xp: 0,
    policy: 'standard',
    attentionShare: i === 0 ? 0.7 : 0.3 / (n - 1),
    drift: i * 0.3,
  }))
  return s
}

describe('chain bulk actions', () => {
  it('even out Attention gives every store the same share', () => {
    const s = chain(4)
    run(s, { type: 'evenAttention' })
    for (const st of s.stores) expect(st.attentionShare).toBeCloseTo(0.25)
    expect(can(s, { type: 'evenAttention' }).ok).toBe(false)
  })

  it('walk all drifting walks the worst stores while Attention lasts', () => {
    const s = chain(4) // drift 0, .3, .6, .9 → two drifting
    s.compute.attention = 1000
    run(s, { type: 'walkDrifting' })
    expect(s.stores.map((st) => st.drift)).toEqual([0, 0.3, 0, 0])
    expect(can(s, { type: 'walkDrifting' }).ok).toBe(false)
  })

  it('stops when Attention runs out, worst first', () => {
    const s = chain(4)
    s.compute.attention = 45
    run(s, { type: 'walkDrifting' })
    expect(s.stores[3]!.drift).toBe(0)
    expect(s.stores[2]!.drift).toBeCloseTo(0.6)
  })
})

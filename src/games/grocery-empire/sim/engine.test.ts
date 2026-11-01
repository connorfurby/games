import { afterEach, describe, expect, it, vi } from 'vitest'
import { GroceryEngine } from './engine'
import { createInitialState } from './state'

describe('GroceryEngine React snapshot identity', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('getSnapshot identity changes on dispatch even though state is mutated in place', () => {
    const eng = new GroceryEngine(createInitialState(7))
    const a = eng.getSnapshot()
    expect(a.state).toBe(eng.getState())
    eng.dispatch({ type: 'unpack' })
    const b = eng.getSnapshot()
    expect(b).not.toBe(a)
    expect(b.v).toBeGreaterThan(a.v)
    expect(b.state).toBe(a.state) // same GameState object
    expect(b.state.stats.unpackedManual).toBeGreaterThan(0)
  })

  it('getSnapshot identity changes every pulse tick', () => {
    vi.useFakeTimers()
    const eng = new GroceryEngine(createInitialState(11))
    const before = eng.getSnapshot()
    eng.start()
    vi.advanceTimersByTime(250) // ~2–3 ticks at 10Hz
    eng.stop()
    const after = eng.getSnapshot()
    expect(after).not.toBe(before)
    expect(after.v).toBeGreaterThan(before.v)
  })

  it('subscribe fires when bumping', () => {
    const eng = new GroceryEngine(createInitialState(3))
    let n = 0
    const unsub = eng.subscribe(() => {
      n += 1
    })
    eng.dispatch({ type: 'setPrice', price: 1.6 })
    expect(n).toBe(1)
    unsub()
    eng.dispatch({ type: 'setPrice', price: 1.7 })
    expect(n).toBe(1)
  })
})

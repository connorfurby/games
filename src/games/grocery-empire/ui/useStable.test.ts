import { beforeEach, describe, expect, it, vi } from 'vitest'

// A tiny stand-in for React's ref storage: one slot per hook call, in order.
const slots: { current: unknown }[] = []
let cursor = 0
vi.mock('react', () => ({
  useRef: (init: unknown) => {
    if (!slots[cursor]) slots[cursor] = { current: init }
    return slots[cursor++]
  },
}))

let now = 0
vi.stubGlobal('performance', { now: () => now })

const { useStable, useSticky } = await import('./useStable')

function render<T>(fn: () => T): T {
  cursor = 0
  return fn()
}

describe('useStable', () => {
  beforeEach(() => {
    slots.length = 0
    now = 0
  })

  it('ignores a value that flickers for less than the settle time', () => {
    expect(render(() => useStable(0, String, 1500, 4000))).toBe(0)
    now = 5000
    expect(render(() => useStable(1, String, 1500, 4000))).toBe(0)
    now = 5400
    expect(render(() => useStable(0, String, 1500, 4000))).toBe(0)
    now = 5800
    expect(render(() => useStable(1, String, 1500, 4000))).toBe(0)
  })

  it('adopts a value once it has held long enough, then holds it', () => {
    now = 1000
    render(() => useStable(0, String, 1500, 4000))
    now = 5000
    render(() => useStable(1, String, 1500, 4000))
    now = 6600
    expect(render(() => useStable(1, String, 1500, 4000))).toBe(1)
    // Flips back right away: still shows 1 during the hold window.
    now = 6700
    expect(render(() => useStable(0, String, 1500, 4000))).toBe(1)
    now = 9000
    expect(render(() => useStable(0, String, 1500, 4000))).toBe(1)
    now = 10_700
    expect(render(() => useStable(0, String, 1500, 4000))).toBe(0)
  })

  it('passes same-key updates straight through', () => {
    render(() => useStable({ id: 'a', n: 1 }, (v) => v.id))
    now = 100
    expect(render(() => useStable({ id: 'a', n: 2 }, (v) => v.id)).n).toBe(2)
  })
})

describe('useSticky', () => {
  beforeEach(() => {
    slots.length = 0
    now = 0
  })

  it('turns on at once and off only after a quiet spell', () => {
    expect(render(() => useSticky(false, 2000))).toBe(false)
    now = 100
    expect(render(() => useSticky(true, 2000))).toBe(true)
    now = 200
    expect(render(() => useSticky(false, 2000))).toBe(true)
    now = 2300
    expect(render(() => useSticky(false, 2000))).toBe(false)
  })
})

describe('useStable on mount', () => {
  it('does not hold the first value', () => {
    slots.length = 0
    now = 0
    render(() => useStable('empty', String, 1500, 4000))
    now = 100
    render(() => useStable('full', String, 1500, 4000))
    now = 1700
    expect(render(() => useStable('full', String, 1500, 4000))).toBe('full')
  })
})

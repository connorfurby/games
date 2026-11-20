import { describe, expect, it } from 'vitest'
import { DEPTH } from './balance'
import { run } from './commands'
import { createInitialState } from './state'

describe('the Choir rival', () => {
  it('wakes when the Dial opens via the Quiet door (Stay)', () => {
    const s = createInitialState(1, 0)
    s.era = 6
    s.depth.quietStamps = DEPTH.quietStampNeed
    expect(s.rivals.choir).toBeUndefined()
    expect(run(s, { type: 'quietStay' }).ok).toBe(true)
    expect(s.era).toBe(7)
    expect(s.rivals.choir).toEqual({ stores: 0, frozenUntil: 0 })
  })

  it('wakes on setEra at era ≥ 7 and never before', () => {
    const s = createInitialState(1, 0)
    s.era = 7
    s.depth.quietStamps = DEPTH.quietStampNeed
    s.depth.guestEars = DEPTH.guestEarNeed
    s.dial.credited.reel = 99
    expect(s.rivals.choir).toBeUndefined()
    const r = run(s, { type: 'setEra', era: 8 })
    expect(r.ok).toBe(true)
    expect(s.rivals.choir).toEqual({ stores: 0, frozenUntil: 0 })

    const early = createInitialState(1, 0)
    early.era = 1
    early.depth.callersServed = 99
    early.depth.checkIns = 99
    early.depth.stars = 5
    early.depth.featuredFormat = 'talk'
    early.depth.shifts.dawn = 'dev'
    early.depth.dawnDays = 99
    run(early, { type: 'setEra', era: 2 })
    expect(early.rivals.choir).toBeUndefined()
  })

  it('stays bought out', () => {
    const s = createInitialState(1, 0)
    s.era = 7
    s.buyouts.push('choir')
    s.depth.guestEars = DEPTH.guestEarNeed
    s.dial.credited.reel = 99
    run(s, { type: 'setEra', era: 8 })
    expect(s.rivals.choir).toBeUndefined()
  })
})

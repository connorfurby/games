import { describe, expect, it } from 'vitest'
import { openUnpaused } from './pause'
import { createInitialState } from './state'

describe('open unpaused', () => {
  it('clears a saved pause, including a Quiet sign-off', () => {
    const s = createInitialState(1)
    s.paused = true
    s.era = 6
    openUnpaused(s)
    expect(s.paused).toBe(false)
  })

  it('leaves a double reject parked', () => {
    const s = createInitialState(1)
    s.paused = true
    s.dial.rejected = 2
    openUnpaused(s)
    expect(s.paused).toBe(true)
  })
})

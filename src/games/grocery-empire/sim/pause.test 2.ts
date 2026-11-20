import { describe, expect, it } from 'vitest'
import { openUnpaused, storySilence } from './pause'
import { createInitialState } from './state'

describe('open unpaused', () => {
  it('clears a saved pause', () => {
    const s = createInitialState(1)
    s.paused = true
    openUnpaused(s)
    expect(s.paused).toBe(false)
    expect(storySilence(s)).toBe(false)
  })

  it('leaves a reject ending parked', () => {
    const s = createInitialState(1)
    s.paused = true
    s.endingChoice = 'reject'
    openUnpaused(s)
    expect(s.paused).toBe(true)

    const last = createInitialState(2)
    last.paused = true
    last.horizon.ending = 'reject'
    openUnpaused(last)
    expect(last.paused).toBe(true)
  })
})

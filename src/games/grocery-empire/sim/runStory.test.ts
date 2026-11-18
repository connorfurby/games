import { describe, expect, it } from 'vitest'
import { setEra } from './helpers'
import { migrate } from './migrate'
import { createInitialState } from './state'

describe('run story: era start times', () => {
  it('setEra stamps the run time each era began', () => {
    const s = createInitialState(1)
    expect(s.stats.eraAt).toEqual([0])
    s.time = 120
    setEra(s, 1)
    s.time = 900
    setEra(s, 2)
    expect(s.stats.eraAt[1]).toBe(120)
    expect(s.stats.eraAt[2]).toBe(900)
  })

  it('old saves migrate with only Era 0 known', () => {
    const s = createInitialState(2)
    const raw = JSON.parse(JSON.stringify(s))
    delete raw.stats.eraAt
    raw.version = 40
    const m = migrate(raw)
    expect(m.stats.eraAt).toEqual([0])
  })
})

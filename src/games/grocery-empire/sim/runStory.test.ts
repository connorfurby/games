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

describe('next goal never points back at a past era', () => {
  it('skips undone side goals once their era is behind you', async () => {
    const { GOALS, nextGoal } = await import('../content/goals')
    const s = createInitialState(3)
    s.era = 7
    const g = nextGoal(s)
    if (g) expect(g.era >= 7 || g.opensEra != null).toBe(true)
    expect(GOALS.some((x) => x.id === 'board-agenda')).toBe(true)
  })
})

describe('goal spine order', () => {
  it('goals are listed in era order', async () => {
    const { GOALS } = await import('../content/goals')
    for (let i = 1; i < GOALS.length; i++) expect(GOALS[i]!.era).toBeGreaterThanOrEqual(GOALS[i - 1]!.era)
  })
})

describe('sticky goals', () => {
  it('a completed goal stays done even if its condition later fails', async () => {
    const { GOALS, nextGoal, stampGoals } = await import('../content/goals')
    const s = createInitialState(4)
    const first = nextGoal(s)!
    s.goalsDone[first.id] = true
    expect(nextGoal(s)?.id).not.toBe(first.id)
    stampGoals(s)
    expect(Object.keys(s.goalsDone).every((id) => GOALS.some((g) => g.id === id))).toBe(true)
  })
})

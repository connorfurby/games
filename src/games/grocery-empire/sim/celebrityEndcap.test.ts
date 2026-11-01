import { describe, expect, it } from 'vitest'
import { MEMO_BY_ID } from '../content/memos'
import { CELEBRITY_ENDCAP } from './balance'
import { can, run } from './commands'
import { demandBreakdown } from './formulas'
import { createInitialState } from './state'
import { applyTick } from './tick'

describe('celebrity endcap', () => {
  it('memo exists and is Era 2 Ideas sink', () => {
    const m = MEMO_BY_ID['celebrity-endcap']
    expect(m).toBeTruthy()
    expect(m.era).toBe(2)
    expect(m.repeatable).toBe(true)
    const cost = m.cost(createInitialState(1))
    expect(cost.ideas).toBe(CELEBRITY_ENDCAP.ideasCost)
    expect(cost.cash).toBe(CELEBRITY_ENDCAP.cashCost)
  })

  it('run sets celebrityUntil and boosts demand ~+25%', () => {
    const s = createInitialState(7)
    s.era = 2
    s.compute.ideasUnlocked = true
    s.compute.ideas = 20
    s.cash = 10_000
    s.brand = 1

    expect(can(s, { type: 'buyMemo', id: 'celebrity-endcap' }).ok).toBe(true)
    expect(run(s, { type: 'buyMemo', id: 'celebrity-endcap' }).ok).toBe(true)
    expect(s.campaigns.celebrityUntil).toBe(s.time + CELEBRITY_ENDCAP.durationSec)
    expect(demandBreakdown(s).parts.celebrity).toBe(CELEBRITY_ENDCAP.demandMul)

    // Still active — blocked while cameras roll.
    s.compute.ideas = 20
    s.cash = 10_000
    expect(can(s, { type: 'buyMemo', id: 'celebrity-endcap' }).ok).toBe(false)
  })

  it('expires after duration and clears demand boost', () => {
    const s = createInitialState(11)
    s.era = 2
    s.compute.ideasUnlocked = true
    s.compute.ideas = 20
    s.cash = 10_000
    s.brand = 1
    expect(run(s, { type: 'buyMemo', id: 'celebrity-endcap' }).ok).toBe(true)

    applyTick(s, CELEBRITY_ENDCAP.durationSec + 1)
    expect(s.campaigns.celebrityUntil).toBe(0)
    expect(demandBreakdown(s).parts.celebrity).toBe(1)
    expect(s.brand).toBeGreaterThanOrEqual(0.05)
    expect(s.brand).toBeLessThanOrEqual(1)
  })
})

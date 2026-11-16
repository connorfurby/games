import { describe, expect, it } from 'vitest'
import { can, run } from './commands'
import { createInitialState } from './state'
import { hasAffordableMemo, planAffordableMemos } from './memoPlan'

describe('memo Buy Best sweep', () => {
  it('fails when the desk is empty', () => {
    const s = createInitialState(2)
    s.cash = 0
    s.compute.attention = 0
    expect(hasAffordableMemo(s)).toBe(false)
    expect(can(s, { type: 'buyMemoSweep' }).ok).toBe(false)
    expect(can(s, { type: 'buyMemoSweep' }).reason).toMatch(/No desk memos/i)
  })

  it('matches sequential cheapest-first spend', () => {
    const s = createInitialState(2)
    s.era = 0
    s.cash = 80
    s.compute.attention = 40
    // Early free/cheap spine memos should be visible
    s.memoSeen['box-cutter'] = true
    s.memoSeen['chalkboard'] = true
    s.memoSeen['hand-truck'] = true

    const plan = planAffordableMemos(s)
    expect(plan.length).toBeGreaterThan(0)

    const draft = structuredClone(s)
    let sequential = 0
    for (const step of plan) {
      expect(can(draft, { type: 'buyMemo', id: step.id }).ok).toBe(true)
      expect(run(draft, { type: 'buyMemo', id: step.id }).ok).toBe(true)
      sequential += 1
    }
    expect(sequential).toBe(plan.length)

    const live = structuredClone(s)
    expect(run(live, { type: 'buyMemoSweep' }).ok).toBe(true)
    expect(live.stats.memosDone).toBe(draft.stats.memosDone)
    expect(live.cash).toBeCloseTo(draft.cash, 6)
    expect(live.compute.attention).toBeCloseTo(draft.compute.attention, 6)
  })
})

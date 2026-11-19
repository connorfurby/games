import { describe, expect, it } from 'vitest'
import { can, run } from './commands'
import { createInitialState } from './state'
import { applyTick } from './tick'
import { clarity } from './helpers'
import { migrate } from './migrate'
import { SAVE_VERSION } from './balance'

describe('signal-decay kernel', () => {
  it('tunes, holds, logs, airs, and earns cash', () => {
    const s = createInitialState(1, 0)
    expect(can(s, { type: 'tune' }).ok).toBe(true)
    expect(run(s, { type: 'tune' }).ok).toBe(true)
    expect(s.air.tuned).toBe(true)
    expect(run(s, { type: 'hold' }).ok).toBe(true)
    s.air.logFill = 1
    expect(run(s, { type: 'log' }).ok).toBe(true)
    expect(s.air.cleanLogs).toBe(1)
    const cashBefore = s.cash
    expect(run(s, { type: 'air' }).ok).toBe(true)
    applyTick(s, 1)
    expect(s.rates.clarity).toBeGreaterThan(0)
    expect(clarity(s)).toBeGreaterThan(0)
    expect(s.cash).toBeGreaterThanOrEqual(cashBefore)
  })

  it('migrates empty and pins SAVE_VERSION', () => {
    const s = migrate({})
    expect(s.version).toBe(SAVE_VERSION)
    expect(s.air).toBeTruthy()
    expect(s.depth).toBeTruthy()
  })

  it('persists through migrate round-trip shape', () => {
    const s = createInitialState(42, 0)
    run(s, { type: 'tune' })
    run(s, { type: 'hold' })
    const again = migrate(JSON.parse(JSON.stringify(s)))
    expect(again.air.tuned).toBe(true)
    expect(again.seed).toBe(42)
  })
})

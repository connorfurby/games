import { describe, expect, it } from 'vitest'
import { DEMAND, DT } from './balance'
import { can, run } from './commands'
import { migrate } from './migrate'
import { createInitialState } from './state'
import { applyOffline, applyTick } from './tick'

describe('grocery empire sim kernel', () => {
  it('uses Era 0 elasticity 1.35', () => {
    expect(DEMAND.elasticity).toBe(1.35)
  })

  it('unpacks, buys wholesale, and sells', () => {
    const s = createInitialState(42)
    expect(run(s, { type: 'unpack' }).ok).toBe(true)
    // Buy while the starting float still covers a crate (~$19.20 at index 1).
    const gate = can(s, { type: 'buyWholesale' })
    expect(gate.ok).toBe(true)
    expect(run(s, { type: 'buyWholesale' }).ok).toBe(true)
    expect(s.orders.length).toBe(1)
    for (let i = 0; i < 50; i++) applyTick(s, DT)
    expect(s.stats.sold).toBeGreaterThan(0)
    expect(s.cash).toBeGreaterThan(0)
  })

  it('migrate never throws and resets pre-v2', () => {
    const m = migrate({ version: 1, cash: 99 })
    expect(m.version).toBe(2)
    expect(m.ledger.some((e) => /reset|fresh|Old save|migrat|unreadable|damaged|recovery/i.test(e.text))).toBe(true)
  })

  it('applyOffline produces a receipt', () => {
    const s = createInitialState(7)
    run(s, { type: 'unpack' })
    const r = applyOffline(s, 30)
    expect(r.cappedSeconds).toBe(30)
    expect(s.offlineReceipt).not.toBeNull()
  })
})

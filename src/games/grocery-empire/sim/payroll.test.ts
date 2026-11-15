import { describe, expect, it } from 'vitest'
import { DEPTH, NETWORK, VALUE } from './balance'
import { wagesPerSec } from './formulas'
import { createInitialState } from './state'
import { oldLayerSoftCount, networkBreakdown } from './systems/network'
import { openStoreCost } from './systems/chain'

describe('payroll fraction (Phase 6 polish)', () => {
  it('era wage scales past Era 3 (no longer capped)', () => {
    const early = createInitialState(1)
    early.era = 3
    early.staff.push({ id: 1, role: 'clerk', name: 'A', level: 1, xp: 0, hiredAt: 0 })
    early.rates.revenuePerSec = 1e9
    const late = createInitialState(2)
    late.era = 8
    late.staff.push({ id: 1, role: 'clerk', name: 'A', level: 1, xp: 0, hiredAt: 0 })
    late.rates.revenuePerSec = 1e9
    expect(wagesPerSec(late)).toBeGreaterThan(wagesPerSec(early))
    expect(1 + 8 * DEPTH.payroll.eraWagePerEra).toBeGreaterThan(1 + 3 * DEPTH.payroll.eraWagePerEra)
  })

  it('soft-caps wage burden at ~30% of recent revenue', () => {
    const s = createInitialState(3)
    s.era = 6
    s.rates.revenuePerSec = 10
    for (let i = 0; i < 12; i++) {
      s.staff.push({ id: i + 1, role: 'clerk', name: `C${i}`, level: 5, xp: 0, hiredAt: 0 })
    }
    const w = wagesPerSec(s)
    expect(w).toBeLessThanOrEqual(s.rates.revenuePerSec * DEPTH.payroll.softCapFrac + 1e-9)
    expect(DEPTH.payroll.softCapFrac).toBeCloseTo(0.3)
  })

  it('docs band stays 15–25% target with 30% soft-cap; thin revenue clamps', () => {
    expect(DEPTH.payroll.targetFullLow).toBeCloseTo(0.15)
    expect(DEPTH.payroll.targetFullHigh).toBeCloseTo(0.25)
    expect(DEPTH.payroll.softCapFrac).toBeCloseTo(0.3)
    const s = createInitialState(4)
    s.era = 3
    for (let i = 0; i < 6; i++) {
      s.staff.push({ id: i + 1, role: 'clerk', name: `S${i}`, level: 2, xp: 0, hiredAt: 0 })
    }
    s.rates.revenuePerSec = 1e12
    const uncapped = wagesPerSec(s)
    expect(uncapped).toBeGreaterThan(0)
    // Force a revenue so uncapped wages would be ~50% — soft-cap must clamp to 30%.
    s.rates.revenuePerSec = uncapped / 0.5
    const clamped = wagesPerSec(s)
    expect(clamped / s.rates.revenuePerSec).toBeLessThanOrEqual(DEPTH.payroll.softCapFrac + 1e-9)
  })
})

describe('old-layer caps (Phase 6 polish)', () => {
  it('softCount dampens units past the floor', () => {
    expect(oldLayerSoftCount(6, 6)).toBe(6)
    expect(oldLayerSoftCount(10, 6)).toBeCloseTo(6 + 4 * NETWORK.oldLayer.weightSoft)
    expect(NETWORK.oldLayer.costSteepen).toBeGreaterThan(1)
    expect(NETWORK.oldLayer.weightSoft).toBeGreaterThan(0)
    expect(NETWORK.oldLayer.weightSoft).toBeLessThan(1)
  })

  it('chain doors steepen once a cold plant exists', () => {
    const plain = createInitialState(4)
    plain.stores = [
      { id: 's0', name: 'HQ', level: 1, xp: 0, policy: 'standard', attentionShare: 1, drift: 0 },
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `s${i + 1}`,
        name: `S${i + 1}`,
        level: 1,
        xp: 0,
        policy: 'standard' as const,
        attentionShare: 0.1,
        drift: 0,
      })),
    ]
    const withCold = createInitialState(5)
    withCold.stores = plain.stores.map((st) => ({ ...st }))
    withCold.cold.plants = 1
    withCold.cold.plantList = [{ id: 'p1', kind: 'compressor' }]
    expect(openStoreCost(withCold)).toBeGreaterThan(openStoreCost(plain))
  })

  it('store network weight soft-caps once plants exist', () => {
    const mk = (plants: number) => {
      const s = createInitialState(6)
      s.cold.plants = plants
      if (plants > 0) s.cold.plantList = [{ id: 'p1', kind: 'compressor' }]
      s.stores = [
        { id: 's0', name: 'HQ', level: 1, xp: 0, policy: 'standard', attentionShare: 1, drift: 0 },
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `s${i + 1}`,
          name: `S${i + 1}`,
          level: 1,
          xp: 0,
          policy: 'standard' as const,
          attentionShare: 0.1,
          drift: 0,
        })),
      ]
      return networkBreakdown(s).parts.stores
    }
    expect(mk(1)).toBeLessThan(mk(0))
  })
})

describe('VALUE.storefront late tiers', () => {
  it('Probe Plaza / Atrium / Last Aisle sit at indices 8–10', () => {
    expect(VALUE.storefront[8]).toBe(32)
    expect(VALUE.storefront[9]).toBe(40)
    expect(VALUE.storefront[10]).toBe(52)
    expect(VALUE.storefront.length).toBe(11)
  })
})

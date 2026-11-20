import { describe, expect, it } from 'vitest'
import { UPGRADES, WIRED_READS, upgradeEffect } from './index'
import { createInitialState } from '../../sim/state'
import { airRate, coolingPower, decayRate, holdPush, logSpeed, checkInCooldown, listenersPerSec, relayMul } from '../../sim/formulas'

describe('upgrade wired reads', () => {
  it('every upgrade id is in WIRED_READS', () => {
    for (const u of UPGRADES) {
      expect(WIRED_READS.has(u.id)).toBe(true)
    }
  })

  it('stat paths read through upgradeEffect / formulas', () => {
    const s = createInitialState(1, 0)
    for (const u of UPGRADES) s.upgrades[u.id] = 3
    // Force formula paths that fold stats
    void holdPush(s)
    void coolingPower(s)
    void logSpeed(s)
    void decayRate(s)
    void airRate(s)
    void listenersPerSec(s)
    void relayMul(s)
    void checkInCooldown(s)
    for (const u of UPGRADES) {
      expect(upgradeEffect(s, u.id)).toBeGreaterThan(0)
    }
  })
})

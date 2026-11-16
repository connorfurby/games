import { describe, expect, it } from 'vitest'
import { DEPTH, SAVE_VERSION } from './balance'
import { can, run } from './commands'
import { agingMul } from './formulas'
import { migrate } from './migrate'
import { createInitialState, type GameState } from './state'
import { hotTraitInfo } from './systems/chain'
import {
  blastSuppressesTunnel,
  freshWaySpoilMul,
  signCoolerLog,
  tunnelFreshAgeMul,
} from './systems/cold'
import {
  flyerLiveBand,
  freshWaySoftFlyerMul,
  pennyLockChanceMul,
  pennyLockGapMul,
} from './systems/flyerStance'

function coldState(): GameState {
  const s = createInitialState(21)
  s.era = 3
  s.time = 1000
  s.memos['cold-plant-permit'] = 1
  s.cold.plantList = [
    { id: 'p1', kind: 'blast' },
    { id: 'p2', kind: 'tunnel' },
  ]
  s.cold.plants = 2
  s.depth.departments.fresh.leadId = 1
  return s
}

function flyerState(): GameState {
  const s = createInitialState(23)
  s.era = 3
  s.time = 500
  s.categories.produce = true
  s.categories.cans = true
  return s
}

function printBand(s: GameState, band: 'soft' | 'mid' | 'deep') {
  const cmd = {
    type: 'printFlyerWeek' as const,
    aisles: ['cans', 'produce'] as ['cans', 'produce'],
    discountBand: band,
    promise: 'hours' as const,
  }
  expect(can(s, cmd).ok).toBe(true)
  expect(run(s, cmd).ok).toBe(true)
}

describe('blast suppresses tunnel spoil cut (SAVE 32)', () => {
  it('powering blast suppresses the tunnel cut until the next signed Cooler log', () => {
    const s = coldState()
    s.cold.poweredKinds = ['tunnel']
    expect(tunnelFreshAgeMul(s)).toBe(DEPTH.tunnelFreshAgeMul)
    const cut = agingMul(s, 'shelf', 'produce')

    expect(run(s, { type: 'setPlantPower', kinds: ['blast', 'tunnel'] }).ok).toBe(true)
    expect(s.depth.blastSuppressesTunnelUntilLog).toBe(true)
    expect(blastSuppressesTunnel(s)).toBe(true)
    expect(tunnelFreshAgeMul(s)).toBe(1)
    expect(agingMul(s, 'shelf', 'produce')).toBeGreaterThan(cut)

    expect(run(s, { type: 'signCoolerLog' }).ok).toBe(true)
    expect(s.depth.blastSuppressesTunnelUntilLog).toBe(false)
    expect(blastSuppressesTunnel(s)).toBe(false)
    expect(tunnelFreshAgeMul(s)).toBe(DEPTH.tunnelFreshAgeMul)
    expect(agingMul(s, 'shelf', 'produce')).toBeCloseTo(cut, 10)
  })

  it('suppression only bites while blast is powered; auto-sign path clears it too', () => {
    const s = coldState()
    s.depth.blastSuppressesTunnelUntilLog = true
    s.cold.poweredKinds = ['tunnel', 'compressor']
    expect(blastSuppressesTunnel(s)).toBe(false)
    expect(tunnelFreshAgeMul(s)).toBe(DEPTH.tunnelFreshAgeMul)
    s.cold.poweredKinds = ['blast', 'tunnel']
    expect(tunnelFreshAgeMul(s)).toBe(1)
    signCoolerLog(s)
    expect(tunnelFreshAgeMul(s)).toBe(DEPTH.tunnelFreshAgeMul)
  })

  it('migrate defaults the flag and keeps a saved true', () => {
    const s = coldState()
    s.depth.blastSuppressesTunnelUntilLog = true
    const raw = JSON.parse(JSON.stringify(s))
    expect(migrate(raw).depth.blastSuppressesTunnelUntilLog).toBe(true)
    delete raw.depth.blastSuppressesTunnelUntilLog
    raw.version = 31
    const m = migrate(raw)
    expect(m.version).toBe(SAVE_VERSION)
    expect(m.depth.blastSuppressesTunnelUntilLog).toBe(false)
  })
})

describe('flyer band vs rivals (SAVE 32)', () => {
  it('deep flyer raises Penny lock pressure only while the week is live', () => {
    const s = flyerState()
    expect(pennyLockChanceMul(s)).toBe(1)
    printBand(s, 'deep')
    expect(flyerLiveBand(s)).toBe('deep')
    expect(pennyLockChanceMul(s)).toBe(DEPTH.flyerDeepPennyLockChanceMul)
    expect(pennyLockChanceMul(s)).toBeGreaterThan(1)
    expect(pennyLockGapMul(s)).toBeLessThan(1)
    s.time = s.depth.flyer!.until + 1
    expect(flyerLiveBand(s)).toBeNull()
    expect(pennyLockChanceMul(s)).toBe(1)
  })

  it('mid flyer is calm and does not touch completed weeks', () => {
    const s = flyerState()
    printBand(s, 'mid')
    expect(pennyLockChanceMul(s)).toBe(1)
    expect(pennyLockGapMul(s)).toBe(1)
    expect(freshWaySoftFlyerMul(s)).toBe(1)
    expect(s.depth.flyerWeeks).toBe(0)
  })

  it('soft flyer feeds FreshWay spoil even with tunnel + a recent log', () => {
    const s = flyerState()
    s.rivals.freshway = {
      stores: 3,
      bought: false,
      boughtStores: 0,
      nextGrowAt: 9999,
      frozenUntil: 0,
      warReadyAt: 0,
      grown: 0,
      wars: 0,
    }
    s.cold.plantList = [{ id: 'p1', kind: 'tunnel' }]
    s.cold.plants = 1
    s.depth.cooler.lastSignedAt = s.time
    expect(freshWaySpoilMul(s)).toBe(1)

    printBand(s, 'soft')
    expect(freshWaySoftFlyerMul(s)).toBe(DEPTH.flyerSoftFreshWaySpoilMul)
    expect(freshWaySpoilMul(s)).toBe(DEPTH.flyerSoftFreshWaySpoilMul)

    s.time = s.depth.flyer!.until + 1
    s.depth.cooler.lastSignedAt = s.time
    expect(freshWaySpoilMul(s)).toBe(1)
  })
})

describe('hot-trait UI helper (SAVE 32)', () => {
  it('reports the live traitBias and matching policies', () => {
    const s = createInitialState(29)
    s.time = 100
    expect(hotTraitInfo(s)).toBeNull()
    s.depth.blockEvent = { kind: 'parade', until: 400, traitBias: 'family' }
    const info = hotTraitInfo(s)!
    expect(info.traitName).toBe('Family')
    expect(info.policies).toEqual(['local', 'standard'])
    s.time = 500
    expect(hotTraitInfo(s)).toBeNull()
  })
})

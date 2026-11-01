import { describe, expect, it } from 'vitest'
import { FLEET, POLITICS } from './balance'
import { can, run } from './commands'
import { createInitialState } from './state'
import { tickFleet } from './systems/fleet'
import { applyTick } from './tick'

function finite(...vals: number[]) {
  for (const v of vals) expect(Number.isFinite(v)).toBe(true)
}

describe('late eras smoke (3–6)', () => {
  it('era 3: buyPlant + buyTank, tick cold without NaN', () => {
    const s = createInitialState(99)
    s.era = 3
    s.cash = 1_000_000
    s.memos['cold-plant-permit'] = 1

    expect(can(s, { type: 'buyPlant' }).ok).toBe(true)
    expect(run(s, { type: 'buyPlant' }).ok).toBe(true)
    expect(can(s, { type: 'buyTank' }).ok).toBe(true)
    expect(run(s, { type: 'buyTank' }).ok).toBe(true)
    expect(s.cold.plants).toBeGreaterThanOrEqual(1)
    expect(s.cold.tanks).toBeGreaterThanOrEqual(1)

    for (let i = 0; i < 30; i++) applyTick(s, 1)

    finite(s.cash, s.cold.freshness, s.cold.momentum, s.cold.surplus, s.cold.yieldLeft)
    expect(s.cold.plants).toBeGreaterThanOrEqual(1)
  })

  it('politics leaveRegion path stubs without NaN', () => {
    const s = createInitialState(7)
    s.era = 3
    s.cash = 1_000_000
    s.memos['lobby-office'] = 1
    s.memos['leave-region'] = 1
    s.cold.yieldLeft = 0
    s.politics.capital = POLITICS.leaveCapitalNeed + 5

    expect(can(s, { type: 'hireLobby' }).ok).toBe(true)
    expect(run(s, { type: 'hireLobby' }).ok).toBe(true)

    for (let i = 0; i < 10; i++) applyTick(s, 1)
    finite(s.politics.capital, s.brand, s.cash)

    expect(can(s, { type: 'leaveRegion' }).ok).toBe(true)
    expect(run(s, { type: 'leaveRegion' }).ok).toBe(true)
    expect(s.era).toBe(4)
    expect(s.politics.leftRegion).toBe(true)

    for (let i = 0; i < 5; i++) applyTick(s, 1)
    finite(s.fuel, s.control, s.brand, s.cash)
  })

  it('era 5: launchBarge + tickFleet, barges >= 1', () => {
    const s = createInitialState(21)
    s.era = 5
    s.cash = FLEET.bargeLaunchCash * 2
    s.read = FLEET.bargeLaunchRead + 2
    s.memos['barge-berth'] = 1

    expect(can(s, { type: 'launchBarge' }).ok).toBe(true)
    expect(run(s, { type: 'launchBarge' }).ok).toBe(true)
    expect(s.fleet.launched).toBe(true)
    expect(s.fleet.barges).toBeGreaterThanOrEqual(1)

    for (let i = 0; i < 20; i++) tickFleet(s, 1)
    finite(s.cash, s.fleet.biomass, s.fleet.legacy, s.read)
    expect(s.fleet.barges).toBeGreaterThanOrEqual(1)
  })

  it('era 6: acceptEnding with biomass 0', () => {
    const s = createInitialState(33)
    s.era = 6
    s.fleet.biomass = 0
    s.fleet.launched = true
    s.endingChoice = null

    expect(can(s, { type: 'acceptEnding' }).ok).toBe(true)
    expect(run(s, { type: 'acceptEnding' }).ok).toBe(true)
    expect(s.endingChoice).toBe('accept')
    expect(s.pendingAccept).toBe(true)
    expect(s.prestigeCarry.mutators).toEqual([])
    finite(s.cash, s.fleet.biomass, s.prestigeCarry.appetite)

    expect(run(s, { type: 'confirmHungryLaws', mutators: ['fasterSpoil', 'richerYield'] }).ok).toBe(true)
    expect(s.pendingAccept).toBe(false)
    expect(s.prestigeCarry.mutators).toEqual(['fasterSpoil', 'richerYield'])
  })

  it('era 6: confirmHungryLaws defaults to none', () => {
    const s = createInitialState(35)
    s.era = 6
    s.fleet.biomass = 0
    s.fleet.launched = true
    s.endingChoice = null
    run(s, { type: 'acceptEnding' })
    expect(run(s, { type: 'confirmHungryLaws' }).ok).toBe(true)
    expect(s.pendingAccept).toBe(false)
    expect(s.prestigeCarry.mutators).toEqual([])
  })

  it('era 6: rejectEnding with biomass 0', () => {
    const s = createInitialState(34)
    s.era = 6
    s.fleet.biomass = 0
    s.fleet.launched = true
    s.endingChoice = null

    expect(can(s, { type: 'rejectEnding' }).ok).toBe(true)
    expect(run(s, { type: 'rejectEnding' }).ok).toBe(true)
    expect(s.endingChoice).toBe('reject')
    expect(s.paused).toBe(true)
    finite(s.cash, s.fleet.biomass)
  })
})

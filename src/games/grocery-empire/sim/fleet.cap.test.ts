import { describe, expect, it } from 'vitest'
import { FLEET, LOGISTICS } from './balance'
import { createInitialState } from './state'
import { repair } from './invariants'
import { canLaunchBarge, canOpenLane, canFranchise, trimFleetLists } from './systems/fleet'

describe('fleet list soft caps', () => {
  it('trims runaway barge / lane / franchise lists', () => {
    const s = createInitialState(1)
    s.fleet.bargeList = Array.from({ length: 200 }, (_, i) => ({
      id: `bg-${i}`,
      class: i % 17 === 0 ? ('replicator' as const) : ('hauler' as const),
    }))
    s.fleet.laneList = Array.from({ length: 80 }, (_, i) => ({
      id: `lane-${i}`,
      route: 'spice-route',
      fuel: 10,
    }))
    s.fleet.franchiseList = Array.from({ length: 80 }, (_, i) => ({
      id: `fr-${i}`,
      name: `F${i}`,
      loyalty: 0.5,
      defected: false,
    }))
    trimFleetLists(s)
    expect(s.fleet.bargeList.length).toBe(FLEET.bargeSoftCap)
    expect(s.fleet.barges).toBe(FLEET.bargeSoftCap)
    expect(s.fleet.laneList.length).toBe(LOGISTICS.laneSoftCap)
    expect(s.fleet.franchiseList.length).toBe(LOGISTICS.franchiseSoftCap)
    expect(s.fleet.bargeList.some((b) => b.class === 'replicator')).toBe(true)
  })

  it('repair trims on load', () => {
    const s = createInitialState(2)
    s.fleet.bargeList = Array.from({ length: 500 }, (_, i) => ({ id: `bg-${i}`, class: 'hauler' as const }))
    repair(s)
    expect(s.fleet.bargeList.length).toBe(FLEET.bargeSoftCap)
  })

  it('gates new barges / lanes / franchises at the cap', () => {
    const s = createInitialState(3)
    s.era = 5
    s.politics.leftRegion = true
    s.cash = 1e30
    s.fuel = 999
    s.fleet.launched = true
    s.fleet.bargeList = Array.from({ length: FLEET.bargeSoftCap }, (_, i) => ({
      id: `bg-${i}`,
      class: 'hauler' as const,
    }))
    s.fleet.barges = FLEET.bargeSoftCap
    s.fleet.laneList = Array.from({ length: LOGISTICS.laneSoftCap }, (_, i) => ({
      id: `lane-${i}`,
      route: 'spice-route',
      fuel: 10,
    }))
    s.fleet.lanes = LOGISTICS.laneSoftCap
    s.fleet.franchiseList = Array.from({ length: LOGISTICS.franchiseSoftCap }, (_, i) => ({
      id: `fr-${i}`,
      name: `F${i}`,
      loyalty: 0.5,
      defected: false,
    }))
    s.fleet.franchises = LOGISTICS.franchiseSoftCap
    expect(canLaunchBarge(s, 'hauler')).toMatch(/full/i)
    expect(canOpenLane(s, 'spice-route')).toMatch(/full/i)
    expect(canFranchise(s)).toMatch(/full/i)
  })
})

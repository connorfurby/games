import { describe, expect, it } from 'vitest'
import { TRACK_BY_ID } from '../content/builds'
import { LATE } from './balance'
import { createInitialState } from './state'
import {
  bondedCap,
  BUILD_CLAIM_READERS,
  lateNetworkAdd,
  offworldSalesMul,
  seedVaultCap,
} from './systems/late'
import {
  bayCaps,
  charterNetworkMul,
  ensureHorizon,
  greenhouseNetworkMul,
  probeCost,
  relayCost,
  relayNetworkMul,
} from './systems/horizon'
import { backroomCap, civicMul, shelfCap, storefrontMul } from './formulas'
import { STAFF_SEATS } from './balance'
import { can, run } from './commands'

function late(era = 12) {
  const s = createInitialState(11)
  s.era = era
  s.rates.revenuePerSec = 1
  ensureHorizon(s)
  return s
}

describe('late build claims', () => {
  it('registers a reader for every era-7+ build tier', () => {
    const missing: string[] = []
    for (const track of Object.values(TRACK_BY_ID)) {
      for (const tier of track.tiers) {
        if (tier.era < 7 || !tier.name) continue
        const key = `${track.id}:${tier.name}`
        if (!(key in BUILD_CLAIM_READERS)) missing.push(key)
      }
    }
    expect(missing).toEqual([])
  })

  it('Probe Plaza cuts probe cost and adds survey trickle', () => {
    const s = late(7)
    s.builds.storefront = 7
    const before = probeCost(s)
    s.builds.storefront = 8
    expect(probeCost(s)).toBeLessThan(before)
    expect(BUILD_CLAIM_READERS['storefront:Probe Plaza']!(s)).toBe(1)
  })

  it('Greenhouse Atrium lifts greenhouse network mul', () => {
    const s = late(9)
    ensureHorizon(s).greenhouses = 2
    s.builds.storefront = 8
    const before = greenhouseNetworkMul(s)
    s.builds.storefront = 9
    expect(greenhouseNetworkMul(s)).toBeGreaterThan(before)
  })

  it('Bonded Warehouse and Seed Vault key their caps on named tiers', () => {
    const s = late(9)
    s.builds.storage = 5
    const bondedBefore = bondedCap(s)
    s.builds.storage = 6
    expect(bondedCap(s)).toBeGreaterThan(bondedBefore)
    expect(bondedCap(s)).toBeGreaterThanOrEqual(LATE.bondedCapBase + LATE.bondedWarehouseBonus)

    const vaultBefore = seedVaultCap(s)
    s.builds.storage = 7
    expect(seedVaultCap(s)).toBeGreaterThan(vaultBefore)
    expect(can(s, { type: 'vaultSeed', amount: 1 }).ok).toBe(false)
    s.horizon.seed = 5
    expect(can(s, { type: 'vaultSeed', amount: 1 }).ok).toBe(true)
  })

  it('Cryo Ark and Orbital Mill keep their measurable rates', () => {
    const s = late(9)
    s.builds.cold = 5
    s.builds.production = 5
    s.offworld.bay = ['x']
    ensureHorizon(s).planets.push({
      id: 'verdant',
      revealed: true,
      stocked: true,
      slots: ['', '', '', '', '', ''],
      score: 1,
      localPrice: null, banTag: null, lockedSku: null })
    const salesBefore = offworldSalesMul(s)
    s.builds.production = 6
    expect(offworldSalesMul(s)).toBeGreaterThan(salesBefore)
    expect(BUILD_CLAIM_READERS['cold:Cryo Ark']!(s)).toBe(0)
    s.builds.cold = 6
    expect(BUILD_CLAIM_READERS['cold:Cryo Ark']!(s)).toBe(1)
  })

  it('Relay Foundry cuts relay cost and lifts relay network', () => {
    const s = late(10)
    ensureHorizon(s).relays = 1
    s.builds.production = 6
    const costBefore = relayCost(s)
    const mulBefore = relayNetworkMul(s)
    s.builds.production = 7
    expect(relayCost(s)).toBeLessThan(costBefore)
    expect(relayNetworkMul(s)).toBeGreaterThan(mulBefore)
  })

  it('Convoy Gantry and Jump Berth change bay / jump freight', () => {
    const s = late(10)
    s.builds.transit = 6
    const bayBefore = bayCaps(s).at(-1)!
    s.builds.transit = 7
    expect(bayCaps(s).at(-1)!).toBeGreaterThan(bayBefore)
    s.fleet.lanes = 1
    s.fuel = 20
    s.builds.transit = 8
    const freightBefore = s.horizon.freight
    expect(run(s, { type: 'jumpLane' }).ok).toBe(true)
    expect(s.horizon.freight).toBeGreaterThan(freightBefore)
  })

  it('Embassy Annex doubles embassies in charter mul; Ivo plaque adds network crumb', () => {
    const s = late(12)
    ensureHorizon(s).embassies = 2
    s.builds.civic = 5
    const before = charterNetworkMul(s)
    s.builds.civic = 6
    expect(charterNetworkMul(s)).toBeGreaterThan(before)
    const netBefore = lateNetworkAdd(s)
    s.builds.civic = 7
    expect(lateNetworkAdd(s)).toBeGreaterThan(netBefore)
  })

  it('capacity ladders continue past Hub for storefront, storage, seats, civic', () => {
    const s = late(12)
    s.builds.storefront = 7
    const shelf7 = shelfCap(s)
    const front7 = storefrontMul(s)
    s.builds.storefront = 10
    expect(shelfCap(s)).toBeGreaterThan(shelf7)
    expect(storefrontMul(s)).toBeGreaterThan(front7)
    expect(STAFF_SEATS.byStorefront.length).toBeGreaterThanOrEqual(11)

    s.builds.storage = 3
    const back3 = backroomCap(s)
    s.builds.storage = 7
    expect(backroomCap(s)).toBeGreaterThan(back3)

    s.builds.civic = 2
    const civic2 = civicMul(s)
    s.builds.civic = 7
    expect(civicMul(s)).toBeGreaterThan(civic2)
  })
})

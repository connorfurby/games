import { describe, expect, it } from 'vitest'
import { TRACK_BY_ID } from '../content/builds'
import { can, run } from './commands'
import { createInitialState } from './state'
import { ensureHorizon } from './systems/horizon'
import { bondedCap, lateNetworkAdd, offworldSalesMul, tickBuildQueue } from './systems/late'

function lateState(era = 8) {
  const s = createInitialState(7)
  s.era = era
  return s
}

describe('late build queue', () => {
  it('buys the next tier once era and cash allow, then clears the queue', () => {
    const s = lateState(7)
    const lvl = TRACK_BY_ID.production.tiers.findIndex((t) => t.name === 'Orbital Mill') - 1
    s.builds.production = lvl
    const cost = TRACK_BY_ID.production.tiers[lvl + 1]!.cost
    ensureHorizon(s).buildQueue = 'production'

    s.cash = cost * 0.5
    tickBuildQueue(s)
    expect(s.builds.production).toBe(lvl)
    expect(s.horizon.buildQueue).toBe('production')

    s.cash = cost * 2
    const before = s.stats.buildsBought
    tickBuildQueue(s)
    expect(s.builds.production).toBe(lvl + 1)
    expect(s.stats.buildsBought).toBe(before + 1)
    expect(s.horizon.buildQueue).toBeNull()
    expect(s.cash).toBeCloseTo(cost, 0)
  })

  it('waits while the next tier is still era-locked', () => {
    const s = lateState(7)
    const lvl = TRACK_BY_ID.civic.tiers.findIndex((t) => t.name === 'Embassy Annex') - 1
    s.builds.civic = lvl
    ensureHorizon(s).buildQueue = 'civic'
    s.cash = 1e30
    tickBuildQueue(s)
    expect(s.builds.civic).toBe(lvl)
    s.era = 11
    tickBuildQueue(s)
    expect(s.builds.civic).toBe(lvl + 1)
  })

  it('drops the queue when the track is maxed', () => {
    const s = lateState(12)
    s.builds.transit = TRACK_BY_ID.transit.tiers.length - 1
    ensureHorizon(s).buildQueue = 'transit'
    tickBuildQueue(s)
    expect(s.horizon.buildQueue).toBeNull()
  })
})

describe('late commands', () => {
  it('registers the late verbs behind era gates', () => {
    const s = lateState(6)
    expect(can(s, { type: 'jumpLane' }).ok).toBe(false)
    expect(can(s, { type: 'unpackBonded' }).ok).toBe(false)
    expect(can(s, { type: 'vaultSeed', amount: 1 }).ok).toBe(false)
    expect(can(s, { type: 'restockOffworld' }).ok).toBe(false)
    expect(can(s, { type: 'openPlanetFranchise' }).ok).toBe(false)
  })

  it('unpacks bonded crates and vaults seed', () => {
    const s = lateState(9)
    s.bonded.crates = 3
    s.rates.revenuePerSec = 100
    const cash = s.cash
    expect(run(s, { type: 'unpackBonded', count: 2 }).ok).toBe(true)
    expect(s.bonded.crates).toBe(1)
    expect(s.cash).toBeGreaterThan(cash)

    s.horizon.seed = 10
    s.builds.storage = 7
    expect(run(s, { type: 'vaultSeed', amount: 6 }).ok).toBe(true)
    expect(s.seedVault.held).toBe(6)
    expect(s.horizon.seed).toBe(4)
  })

  it('late helpers stay neutral before the late game', () => {
    const s = lateState(5)
    expect(lateNetworkAdd(s)).toBe(0)
    expect(offworldSalesMul(s)).toBe(1)
    expect(bondedCap(s)).toBeGreaterThan(0)
  })
})

describe('new build tiers', () => {
  it('appends the 12 late tiers in era order per track', () => {
    const names = Object.values(TRACK_BY_ID).flatMap((t) => t.tiers.map((x) => x.name))
    for (const n of [
      'Probe Plaza',
      'Greenhouse Atrium',
      'The Last Aisle',
      'Bonded Warehouse',
      'Seed Vault',
      'Cryo Ark',
      'Orbital Mill',
      'Relay Foundry',
      'Convoy Gantry',
      'Jump Berth',
      'Embassy Annex',
      "Ivo's Plaque",
    ]) {
      expect(names).toContain(n)
    }
    for (const t of Object.values(TRACK_BY_ID)) {
      for (let i = 1; i < t.tiers.length; i++) {
        expect(t.tiers[i]!.era).toBeGreaterThanOrEqual(t.tiers[i - 1]!.era)
        expect(t.tiers[i]!.cost).toBeGreaterThanOrEqual(t.tiers[i - 1]!.cost)
      }
    }
    expect(TRACK_BY_ID.transit.tiers[7]!.name).toBe('Convoy Gantry')
  })
})

describe('co-op order and cryo treaty', () => {
  it('co-op order is era-gated, part-paid in survey, and slower than express', () => {
    const s = lateState(6)
    expect(can(s, { type: 'coopOrder' }).ok).toBe(false)
    s.era = 7
    s.cash = 1e6
    ensureHorizon(s).survey = 10
    const orders = s.orders.length
    expect(run(s, { type: 'coopOrder' }).ok).toBe(true)
    expect(s.orders.length).toBe(orders + 1)
    expect(s.horizon.survey).toBeLessThan(10)
    expect(s.orders[s.orders.length - 1]!.eta).toBeGreaterThan(4)
  })

  it('cryo treaty spends seal and sets immunity for a season', () => {
    const s = lateState(11)
    expect(can(s, { type: 'cryoTreaty' }).ok).toBe(false)
    ensureHorizon(s).seal = 20
    expect(run(s, { type: 'cryoTreaty' }).ok).toBe(true)
    expect(s.late.cryoImmuneUntil).toBeGreaterThan(s.time)
    expect(s.horizon.seal).toBeLessThan(20)
    expect(can(s, { type: 'cryoTreaty' }).ok).toBe(false)
  })
})

// ── Phases 4–6: Money, Empire, Campaign ──────────────────────────────────────
import { DOCTRINES } from '../content/era2'
import { GOALS } from '../content/goals'
import { UPGRADES } from '../content/upgrades'
import { eraWing } from './museum'
import { migrate } from './migrate'
import { tickFleet } from './systems/fleet'
import {
  councilSeatAdd,
  councilSeatCap,
  instrumentCost,
  outposts,
  scrutinyDrag,
} from './systems/lateHubs'
import { ensureLate, tickLate } from './systems/late'

describe('invest instruments', () => {
  it('are era-gated, buyable with cash, and pay their currency over time', () => {
    const s = lateState(6)
    s.cash = 1e30
    expect(can(s, { type: 'buyInstrument', id: 'planet-bonds' }).ok).toBe(false)
    s.era = 7
    ensureLate(s)
    const cost = instrumentCost(s, 'planet-bonds')
    expect(run(s, { type: 'buyInstrument', id: 'planet-bonds' }).ok).toBe(true)
    expect(s.cash).toBeCloseTo(1e30 - cost, -20)
    expect(s.late.instruments['planet-bonds']).toBe(1)
    const before = ensureHorizon(s).survey
    tickLate(s, 10)
    expect(s.horizon.survey).toBeGreaterThan(before)
    // The next currency stays shut until its era.
    expect(can(s, { type: 'buyInstrument', id: 'seed-index' }).ok).toBe(false)
    s.era = 9
    expect(can(s, { type: 'buyInstrument', id: 'seed-index' }).ok).toBe(true)
  })

  it('stop at the lot cap and get pricier per lot', () => {
    const s = lateState(7)
    s.cash = 1e40
    const first = instrumentCost(s, 'planet-bonds')
    run(s, { type: 'buyInstrument', id: 'planet-bonds' })
    expect(instrumentCost(s, 'planet-bonds')).toBeGreaterThan(first)
    for (let i = 0; i < 10; i++) run(s, { type: 'buyInstrument', id: 'planet-bonds' })
    expect(s.late.instruments['planet-bonds']).toBe(4)
    expect(can(s, { type: 'buyInstrument', id: 'planet-bonds' }).ok).toBe(false)
  })
})

describe('council seats', () => {
  it('pay up to the annex cap, then 40%, and set scrutiny each tick', () => {
    const s = lateState(9)
    s.politics.acquisitions = 3
    const cap = councilSeatCap(s)
    expect(councilSeatAdd(s)).toBeCloseTo(3 * 0.05, 6)
    s.politics.acquisitions = 20
    expect(councilSeatAdd(s)).toBeLessThan(20 * 0.05)
    expect(councilSeatAdd(s)).toBeGreaterThan(cap * 0.05)
    tickLate(s, 1)
    expect(s.late.scrutiny).toBeGreaterThan(0.6)
    expect(scrutinyDrag(s)).toBeGreaterThan(0)
  })

  it('Empire rank rewards open annex seats; the council stays dormant before Era 7', () => {
    const s = lateState(8)
    const base = councilSeatCap(s)
    s.empire.level = 125
    expect(councilSeatCap(s)).toBe(base + 2)
    s.empire.level = 145
    expect(councilSeatCap(s)).toBe(base + 4)
    s.era = 6
    s.politics.acquisitions = 5
    expect(councilSeatAdd(s)).toBe(0)
  })
})

describe('late content and wiring', () => {
  it('adds 30+ late upgrade nodes that stay hidden until their era', () => {
    const late = UPGRADES.filter((u) => u.id.startsWith('lh-'))
    expect(late.length).toBeGreaterThanOrEqual(30)
    const early = lateState(6)
    const end = lateState(12)
    for (const u of late) {
      expect(u.visible?.(early)).toBe(false)
      expect(u.visible?.(end)).toBe(true)
    }
  })

  it('late doctrines open with their era', () => {
    const s = lateState(6)
    const late = DOCTRINES.filter((d) => d.era)
    expect(late.length).toBeGreaterThanOrEqual(4)
    expect(can(s, { type: 'buyDoctrine', id: 'survey-ledger' }).ok).toBe(false)
    expect(can(s, { type: 'buyDoctrine', id: 'survey-ledger' }).reason).toMatch(/Era 7/)
  })

  it('barges haul freight from Era 8', () => {
    const s = lateState(7)
    s.fleet.launched = true
    s.fleet.barges = 16
    ensureHorizon(s).freight = 0
    tickFleet(s, 10)
    expect(s.horizon.freight).toBe(0)
    s.era = 8
    tickFleet(s, 10)
    expect(s.horizon.freight).toBeGreaterThan(0)
  })

  it('outposts list one row per stocked world', () => {
    const s = lateState(7)
    expect(outposts(s)).toEqual([])
    ensureHorizon(s).planets.push({ id: 'pantry', stocked: true, score: 0.8 } as never)
    ensureLate(s).planetFranchises = 1
    const rows = outposts(s)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.franchised).toBe(true)
  })

  it('hub goals complete on their own condition or when the era moves on', () => {
    const council = GOALS.find((g) => g.id === 'council-seat')!
    const s = lateState(9)
    expect(council.done(s)).toBe(false)
    s.politics.acquisitions = 1
    expect(council.done(s)).toBe(true)
    const bonded = GOALS.find((g) => g.id === 'bonded-unpack')!
    const t = lateState(8)
    expect(bonded.done(t)).toBe(false)
    t.bonded.crates = 2
    run(t, { type: 'unpackBonded', count: 1 })
    expect(t.late.unpacked).toBe(1)
    expect(bonded.done(t)).toBe(true)
    expect(GOALS.find((g) => g.id === 'first-franchise')!.done(lateState(8))).toBe(true)
  })

  it('museum files Era 7+ chests under the Horizon wing', () => {
    for (const era of [7, 9, 12]) expect(eraWing(era)).toBe('horizon')
    expect(eraWing(6)).toBe('legacy')
  })

  it('late state round-trips through migrate', () => {
    const s = lateState(9)
    ensureLate(s).instruments['seed-index'] = 2
    s.late.unpacked = 3
    s.late.scrutiny = 0.4
    const m = migrate(JSON.parse(JSON.stringify(s)))
    expect(m.late.instruments).toEqual({ 'seed-index': 2 })
    expect(m.late.unpacked).toBe(3)
    expect(m.late.scrutiny).toBeCloseTo(0.4, 6)
    const old = JSON.parse(JSON.stringify(s)) as Record<string, any>
    delete old.late.instruments
    delete old.late.unpacked
    expect(migrate(old).late.instruments).toEqual({})
  })
})

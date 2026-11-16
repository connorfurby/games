import { describe, expect, it } from 'vitest'
import { FACING_BY_ID } from '../content/depth'
import { GOALS } from '../content/goals'
import { PLANETS, STANDARD_SCORE } from '../content/horizon'
import { DEPTH, HORIZON, SAVE_VERSION } from './balance'
import { can, run } from './commands'
import { facingPullMul } from './formulas'
import { migrate } from './migrate'
import { createInitialState, type GameState } from './state'
import {
  activeFacingBan,
  ensurePlots,
  expectedSeasonChore,
  fileStandardConvoy,
  fileStandardPlanogram,
  launchProbe,
  pendingSettlement,
  routeNetworkMul,
  stopDelayMul,
  stopTariffMul,
} from './systems/horizon'
import { tickSeasons } from './systems/horizonTick'

function climateState(): GameState {
  const s = createInitialState(61)
  s.era = 7
  s.time = 1000
  s.shelf = [{ cat: 'cans', qty: 20, age: 1 }]
  s.depth.facings = { cans: 'tomatoes' }
  const p = PLANETS[0]!
  s.horizon.planets.push({
    id: p.id,
    revealed: true,
    stocked: true,
    slots: [...p.standardSlots],
    score: STANDARD_SCORE,
    localPrice: null,
    banTag: null,
    lockedSku: null,
    gateCredited: true,
  })
  return s
}

function circuitRow(stopKind: 'spoil' | 'tariff' | 'delay') {
  return {
    origin: 'pantry',
    stop: 'cinder',
    dest: 'orchard',
    good: 'rice',
    load: [],
    score: STANDARD_SCORE,
    stopKind,
    gateCredited: true,
  }
}

describe('SAVE 34 pins', () => {
  it('a v33 save migrates onto the current version with the SAVE 34 fields clear', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(34)
    const s = climateState()
    s.horizon.circuits.push(circuitRow('spoil'))
    const raw = JSON.parse(JSON.stringify(s))
    delete raw.depth.climateFacingBan
    delete raw.horizon.pendingStop
    delete raw.horizon.bedLockedChore
    raw.version = 33
    const m = migrate(raw)
    expect(m.version).toBe(SAVE_VERSION)
    expect(m.depth.climateFacingBan).toBeNull()
    expect(m.horizon.pendingStop).toBeNull()
    expect(m.horizon.bedLockedChore).toBeNull()
    expect(m.horizon.circuits[0]!.settledKind).toBeNull()
  })

  it('migrate keeps well-formed SAVE 34 fields and drops junk', () => {
    const s = climateState()
    s.horizon.circuits.push({ ...circuitRow('tariff'), settledKind: 'tariff' })
    s.depth.climateFacingBan = { tag: 'tomatoes', cat: 'cans', until: 1800 }
    s.horizon.pendingStop = { index: 0, kind: 'tariff' }
    s.horizon.bedLockedChore = 'water'
    const m = migrate(JSON.parse(JSON.stringify(s)))
    expect(m.depth.climateFacingBan).toEqual({ tag: 'tomatoes', cat: 'cans', until: 1800 })
    expect(m.horizon.pendingStop).toEqual({ index: 0, kind: 'tariff' })
    expect(m.horizon.bedLockedChore).toBe('water')
    expect(m.horizon.circuits[0]!.settledKind).toBe('tariff')

    const raw = JSON.parse(JSON.stringify(s))
    raw.depth.climateFacingBan = { tag: 'tomatoes', cat: 'bogus', until: 1 }
    raw.horizon.pendingStop = { index: 0, kind: 'nope' }
    raw.horizon.bedLockedChore = 'dance'
    raw.horizon.circuits[0].settledKind = 'free'
    const junk = migrate(raw)
    expect(junk.depth.climateFacingBan).toBeNull()
    expect(junk.horizon.pendingStop).toBeNull()
    expect(junk.horizon.bedLockedChore).toBeNull()
    expect(junk.horizon.circuits[0]!.settledKind).toBeNull()
  })
})

describe('climate guest vs facing', () => {
  it('serving bans the strongest featured facing until the next shift day', () => {
    const s = climateState()
    const before = facingPullMul(s, 'cans')
    expect(before).toBeCloseTo(FACING_BY_ID.tomatoes!.pullMul, 6)
    expect(run(s, { type: 'serveClimateNeighbor' }).ok).toBe(true)
    expect(s.horizon.climateServed).toBe(1)
    const ban = s.depth.climateFacingBan!
    expect(ban.tag).toBe('tomatoes')
    expect(ban.cat).toBe('cans')
    expect(ban.until).toBe(Math.ceil(1000 / DEPTH.shiftDaySec) * DEPTH.shiftDaySec)
    expect(activeFacingBan(s)).not.toBeNull()
    expect(facingPullMul(s, 'cans')).toBeCloseTo(before * DEPTH.climateFacingBanPullMul, 6)
    s.time = ban.until
    expect(activeFacingBan(s)).toBeNull()
    expect(facingPullMul(s, 'cans')).toBeCloseTo(before, 6)
  })

  it('swapping the facing dodges the ban', () => {
    const s = climateState()
    expect(run(s, { type: 'serveClimateNeighbor' }).ok).toBe(true)
    s.depth.facings.cans = 'beans'
    expect(activeFacingBan(s)).toBeNull()
    expect(facingPullMul(s, 'cans')).toBeCloseTo(FACING_BY_ID.beans!.pullMul, 6)
  })

  it('six serves still open the climate gate count with no facing set', () => {
    const s = climateState()
    s.depth.facings = {}
    for (let i = 0; i < HORIZON.climateServeNeed; i++) {
      s.horizon.nextClimateAt = 0
      expect(run(s, { type: 'serveClimateNeighbor' }).ok).toBe(true)
    }
    expect(s.horizon.climateServed).toBe(HORIZON.climateServeNeed)
    expect(s.depth.climateFacingBan).toBeNull()
  })
})

describe('stop personality', () => {
  it('a credited standard convoy arms the pending stop with its personality', () => {
    const s = createInitialState(2)
    s.era = 8
    s.cash = 1e30
    s.horizon.survey = 80
    s.horizon.freight = 200
    s.memos['probe-yard'] = 1
    s.memos['exchange-floor'] = 1
    s.depth.practice.convoy = { left: 0, credited: 0 }
    for (let i = 0; i < 3; i++) {
      expect(launchProbe(s)).toBeNull()
      const id = s.horizon.planets[i]?.id
      s.depth.lastStandardFileAt = 0
      if (id) expect(fileStandardPlanogram(s, id)).toBeNull()
    }
    s.depth.lastStandardFileAt = 0
    expect(fileStandardConvoy(s)).toBeNull()
    const circuit = s.horizon.circuits[0]!
    expect(s.horizon.settlementUntil).toBeGreaterThan(s.time)
    expect(s.horizon.pendingStop).toEqual({ index: 0, kind: circuit.stopKind })
    expect(can(s, { type: 'settleStop' }).ok).toBe(false)
    s.time = s.horizon.settlementUntil
    expect(run(s, { type: 'settleStop' }).ok).toBe(true)
    expect(circuit.settledKind).toBe(circuit.stopKind)
    expect(s.horizon.pendingStop).toBeNull()
  })

  it('settling tariff cuts the freight trickle while the circuit stands', () => {
    const s = createInitialState(3)
    s.era = 8
    s.time = 5000
    s.horizon.circuits.push(circuitRow('tariff'))
    s.horizon.settlementUntil = 4000
    s.horizon.pendingStop = { index: 0, kind: 'tariff' }
    expect(stopTariffMul(s)).toBe(1)
    expect(run(s, { type: 'settleStop' }).ok).toBe(true)
    expect(s.horizon.circuits[0]!.settledKind).toBe('tariff')
    expect(stopTariffMul(s)).toBeCloseTo(1 - HORIZON.stopTariffCut, 6)
    expect(run(s, { type: 'clearCircuit', index: 0 }).ok).toBe(true)
    expect(stopTariffMul(s)).toBe(1)
  })

  it('settling spoil cuts that circuit’s route weight; delay stretches the next ETA', () => {
    const spoil = createInitialState(4)
    spoil.era = 8
    spoil.time = 5000
    spoil.horizon.circuits.push(circuitRow('spoil'))
    const before = routeNetworkMul(spoil)
    spoil.horizon.settlementUntil = 4000
    // No pendingStop: the first credited, unsettled circuit takes the tax.
    expect(pendingSettlement(spoil)).toEqual({ index: 0, kind: 'spoil' })
    expect(run(spoil, { type: 'settleStop' }).ok).toBe(true)
    expect(routeNetworkMul(spoil)).toBeLessThan(before)

    const delay = createInitialState(5)
    delay.era = 8
    delay.time = 5000
    delay.horizon.circuits.push(circuitRow('delay'))
    delay.horizon.settlementUntil = 4000
    expect(stopDelayMul(delay)).toBe(1)
    expect(run(delay, { type: 'settleStop' }).ok).toBe(true)
    expect(stopDelayMul(delay)).toBeCloseTo(1 + HORIZON.stopDelayPerCircuit, 6)
  })
})

describe('season bed lock', () => {
  function bedState(): GameState {
    const s = createInitialState(9)
    s.era = 9
    ensurePlots(s)
    return s
  }

  it('the chore locks out the other chores and clever crosses until the season turns', () => {
    const s = bedState()
    const chore = expectedSeasonChore(s)
    expect(run(s, { type: 'doSeasonChore', chore }).ok).toBe(true)
    expect(s.horizon.bedLockedChore).toBe(chore)
    for (const other of ['water', 'cover', 'harvest', 'rest'] as const) {
      if (other === chore) continue
      const check = can(s, { type: 'doSeasonChore', chore: other })
      expect(check.ok).toBe(false)
      expect(check.reason).toMatch(/locked/)
    }
    const plant = can(s, { type: 'plantCross', index: 0, a: 'sweet', b: 'sturdy' })
    expect(plant.ok).toBe(false)
    expect(plant.reason).toMatch(/locked/)
    // The standard cross still files under the lock.
    expect(can(s, { type: 'fileStandardCross', index: 0 }).ok).toBe(true)

    tickSeasons(s, HORIZON.seasonSec)
    expect(s.horizon.bedLockedChore).toBeNull()
    expect(can(s, { type: 'plantCross', index: 0, a: 'sweet', b: 'sturdy' }).ok).toBe(true)
    expect(can(s, { type: 'doSeasonChore', chore: expectedSeasonChore(s) }).ok).toBe(true)
  })

  it('skipping the chore keeps clever crosses open (and costs a weak year at the turn)', () => {
    const s = bedState()
    expect(can(s, { type: 'plantCross', index: 0, a: 'sweet', b: 'sturdy' }).ok).toBe(true)
    const weak = s.horizon.weakYears
    tickSeasons(s, HORIZON.seasonSec)
    expect(s.horizon.weakYears).toBe(weak + 1)
  })
})

describe('Phase 6 decision goals', () => {
  it('eras 7–9 each carry one decision goal with a live action', () => {
    const ids = { 7: 'climate-guest-facing', 8: 'settle-stop-tax', 9: 'season-chore' } as const
    for (const [era, id] of Object.entries(ids)) {
      const g = GOALS.find((row) => row.id === id)!
      expect(g.era).toBe(Number(era))
      const s = createInitialState(1)
      s.era = Number(era)
      expect(g.action?.(s)).toBeTruthy()
    }
    expect(GOALS.some((g) => g.id === 'hire-planogram-clerk' || g.id === 'hire-stevedore')).toBe(false)
  })

  it('the season goal names the expected chore and is done once the bed is locked', () => {
    const s = createInitialState(9)
    s.era = 9
    ensurePlots(s)
    const g = GOALS.find((row) => row.id === 'season-chore')!
    const act = g.action?.(s)
    expect(act).toEqual({ type: 'doSeasonChore', chore: expectedSeasonChore(s) })
    expect(g.done(s)).toBe(false)
    expect(run(s, act!).ok).toBe(true)
    expect(g.done(s)).toBe(true)
  })
})

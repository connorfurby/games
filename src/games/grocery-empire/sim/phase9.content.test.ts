import { describe, expect, it } from 'vitest'
import { CLIMATE_GUESTS, PLANETS, STANDARD_SCORE, climateGuestFor } from '../content/horizon'
import { PROJECT_BY_ID } from '../content/projects'
import { UPGRADE_BY_ID } from '../content/upgrades'
import { DEPTH, HORIZON } from './balance'
import { can, run } from './commands'
import { climateBanPullMul, demandBreakdown, facingPullMul } from './formulas'
import { setEra } from './helpers'
import { createInitialState, type GameState } from './state'
import {
  amendsPerDocket,
  bedLockOpensIn,
  currentClimateGuest,
  endlessMutateEvery,
  ensurePlots,
  expectedSeasonChore,
} from './systems/horizon'
import { rationBoardBehind, rationBoardDemandMul } from './systems/rivals'

function climateDesk(): GameState {
  const s = createInitialState(91)
  setEra(s, 7)
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

describe('Phase 9 · climate guests', () => {
  it('names a guest for every climate, with a want, inside eras 7–9', () => {
    expect(CLIMATE_GUESTS.length).toBeGreaterThanOrEqual(4)
    expect(CLIMATE_GUESTS.length).toBeLessThanOrEqual(6)
    for (const g of CLIMATE_GUESTS) {
      expect(g.era).toBeGreaterThanOrEqual(7)
      expect(g.era).toBeLessThanOrEqual(9)
      expect(g.wants.length).toBeGreaterThan(0)
    }
    for (const c of ['quiet', 'heat', 'orchard', 'tide', 'night', 'ash', 'ice', 'market'] as const) {
      expect(climateGuestFor(c, 7, 0)).toBeTruthy()
    }
  })

  it('serving names the guest in the log and bans the facing', () => {
    const s = climateDesk()
    const guest = currentClimateGuest(s)
    expect(guest).not.toBeNull()
    expect(run(s, { type: 'serveClimateNeighbor' }).ok).toBe(true)
    const warn = s.ledger.find((e) => e.kind === 'warn' && e.text.includes(guest!.name))
    expect(warn).toBeTruthy()
    expect(s.depth.climateFacingBan).not.toBeNull()
  })

  it('Guest Patience and the Guest Awning soften the ban cut', () => {
    const s = climateDesk()
    expect(climateBanPullMul(s)).toBeCloseTo(DEPTH.climateFacingBanPullMul)
    s.upgrades['guest-patience'] = 3
    const withPatience = climateBanPullMul(s)
    expect(withPatience).toBeGreaterThan(DEPTH.climateFacingBanPullMul)
    s.projects.done['pj-guest-awning'] = true
    expect(climateBanPullMul(s)).toBeGreaterThan(withPatience)
    expect(climateBanPullMul(s)).toBeLessThan(1)
    run(s, { type: 'serveClimateNeighbor' })
    expect(facingPullMul(s, 'cans')).toBeGreaterThan(0)
  })
})

describe('Phase 9 · verb pads', () => {
  it('registers the four new verb nodes in their trees', () => {
    expect(UPGRADE_BY_ID['guest-patience']?.tree).toBe('pantry')
    expect(UPGRADE_BY_ID['bed-lock-pad']?.tree).toBe('cultivar')
    expect(UPGRADE_BY_ID['clause-amend-pad']?.tree).toBe('signal')
    expect(UPGRADE_BY_ID['endless-edit-pad']?.tree).toBe('signal')
    expect(UPGRADE_BY_ID['mutation-clear-pad']?.tree).toBe('signal')
  })

  it('Bed Lock Pad lifts the bed lock for the tail of the season', () => {
    const s = createInitialState(9)
    setEra(s, 9)
    ensurePlots(s)
    const chore = expectedSeasonChore(s)
    expect(run(s, { type: 'doSeasonChore', chore }).ok).toBe(true)
    expect(bedLockOpensIn(s)).toBeNull()
    expect(can(s, { type: 'plantCross', index: 0, a: 'sweet', b: 'sturdy' }).ok).toBe(false)
    s.projects.done['pj-bed-glass'] = true
    const wait = bedLockOpensIn(s)!
    expect(wait).toBeGreaterThan(0)
    s.horizon.seasonT = HORIZON.seasonSec - 1
    expect(bedLockOpensIn(s)).toBe(0)
    expect(can(s, { type: 'plantCross', index: 0, a: 'sweet', b: 'sturdy' }).ok).toBe(true)
  })

  it('Clause Amend Pad and the Embassy Chair raise the amends per docket', () => {
    const s = createInitialState(9)
    setEra(s, 11)
    expect(amendsPerDocket(s)).toBe(HORIZON.hearingAmendsPerDocket)
    s.upgrades['clause-amend-pad'] = 1
    expect(amendsPerDocket(s)).toBe(HORIZON.hearingAmendsPerDocket + 1)
    s.projects.done['pj-embassy-chair'] = true
    expect(amendsPerDocket(s)).toBe(HORIZON.hearingAmendsPerDocket + 2)
  })

  it('Endless Edit Pad stretches the mutation cadence', () => {
    const s = createInitialState(9)
    setEra(s, 12)
    expect(endlessMutateEvery(s)).toBe(HORIZON.endlessMutateEvery)
    s.upgrades['endless-edit-pad'] = 2
    expect(endlessMutateEvery(s)).toBe(HORIZON.endlessMutateEvery + 2)
  })
})

describe('Phase 9 · projects', () => {
  it('each verb has a timed project that starts', () => {
    for (const id of ['pj-guest-awning', 'pj-bed-glass', 'pj-embassy-chair']) {
      const def = PROJECT_BY_ID[id]!
      expect(def).toBeTruthy()
      const s = createInitialState(5)
      setEra(s, def.era)
      s.empire.level = 60
      s.cash = def.cash * 2
      expect(run(s, { type: 'startProject', id }).ok).toBe(true)
      expect(s.projects.active.some((a) => a.id === id)).toBe(true)
    }
  })
})

describe('Phase 9 · ration week Board', () => {
  function weekDesk(): GameState {
    const s = createInitialState(12)
    setEra(s, 6)
    s.time = 100_000
    s.depth.rationWeekUntil = s.time + 90 * 60
    return s
  }

  it('an unstamped ledger past the grace slice skims demand until you stamp', () => {
    const s = weekDesk()
    const len = DEPTH.shiftDaySec
    const dayStart = Math.floor(s.time / len) * len
    s.time = dayStart + len * 0.1
    expect(rationBoardBehind(s)).toBe(false)
    s.time = dayStart + len * (DEPTH.rationBoardGraceFrac + 0.05)
    expect(rationBoardBehind(s)).toBe(true)
    expect(rationBoardDemandMul(s)).toBe(DEPTH.rationBoardDemandMul)
    expect(demandBreakdown(s).parts.rivals).toBeCloseTo(DEPTH.rationBoardDemandMul)
    run(s, { type: 'stampLedger' })
    expect(rationBoardBehind(s)).toBe(false)
    expect(rationBoardDemandMul(s)).toBe(1)
  })

  it('does nothing outside ration week', () => {
    const s = weekDesk()
    s.depth.rationWeekUntil = 0
    s.time += DEPTH.shiftDaySec * 0.9
    expect(rationBoardBehind(s)).toBe(false)
  })
})

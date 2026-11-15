import { describe, expect, it } from 'vitest'
import { RIVALS } from '../content/rivals'
import { VENTURES } from '../content/ventures'
import { SEASON_WANTS } from '../content/horizon'
import { MEMO_BY_ID } from '../content/memos'
import { LATE } from './balance'
import { can, run } from './commands'
import { adMul, agingMul, keelDemandMul, ventureTrafficMul } from './formulas'
import { createInitialState, type GameState } from './state'
import { annexRecommendation, annexSeatCap, annexWorkingIds, deputyCooldownMul } from './staffAnnex'
import { celebrityCashCost, postureFee } from './lateCost'
import { ensureHorizon, clauseToggleCost, plotScore, tickHorizon } from './systems/horizon'
import { offworldSalesMul } from './systems/late'
import { collectVenture, tickVentures } from './systems/growth'
import { buyoutCost, tickRivals } from './systems/rivals'

function team(era: number): GameState {
  const s = createInitialState(7)
  s.era = era
  s.cash = 1e40
  s.menus.staff = true
  ensureHorizon(s)
  return s
}

function hire(s: GameState, role: string, level = 1) {
  s.staff.push({ id: s.nextStaffId++, role: role as never, name: 'T', level, xp: 0, hiredAt: 0 })
}

function openVenture(s: GameState, id: string, level: number, policy: 'a' | 'b') {
  s.ventures[id] = { level, stored: 0, lifetime: 0, carry: 0, policy }
}

describe('annex seats', () => {
  it('floor roles and annex roles draw from separate pools', () => {
    const s = team(12)
    expect(annexSeatCap(s)).toBe(LATE.annexSeatsBase)
    const roles = ['surveyor', 'broker', 'grower', 'taster'] as const
    for (const role of roles) {
      expect(run(s, { type: 'hire', role }).ok).toBe(true)
    }
    const full = can(s, { type: 'hire', role: 'translator' })
    expect(full.ok).toBe(false)
    expect(full.ok === false && full.reason).toMatch(/Annex seats full/)
    // The floor still has its own seats.
    expect(can(s, { type: 'hire', role: 'clerk' }).ok).toBe(true)
  })

  it('past the Hub, plaza tiers add annex seats', () => {
    const s = team(12)
    s.builds.storefront = 8
    expect(annexSeatCap(s)).toBe(LATE.annexSeatsBase + LATE.annexSeatsPerPlaza)
    s.builds.storefront = 10
    expect(annexSeatCap(s)).toBe(LATE.annexSeatsBase + 3 * LATE.annexSeatsPerPlaza)
  })

  it('recommends a horizon role only when it clears something', () => {
    const s = team(7)
    expect(annexRecommendation(s)?.role).toBe('surveyor')
    hire(s, 'surveyor')
    expect(annexRecommendation(s)).toBeNull()
  })
})

describe('annex staff effects', () => {
  it('tasters raise a bed score by their levels, never past 1', () => {
    const s = team(9)
    const h = ensureHorizon(s)
    h.season = 0
    const wanted = SEASON_WANTS[0]!
    const other = (['sweet', 'sturdy', 'pretty', 'lasting'] as const).find((t) => !wanted.includes(t))!
    // One wanted trait out of two wanted: a half score, with room to grow.
    const child = [wanted[0]!, other]
    const before = plotScore(s, child)
    hire(s, 'taster', 4)
    const after = plotScore(s, child)
    expect(after).toBeGreaterThan(before)
    expect(after).toBeLessThanOrEqual(Math.max(1, before))
    expect(plotScore(s, [])).toBe(0)
  })

  it('diplomats cut the clause toggle price and speed embassy seal', () => {
    const s = team(11)
    const base = clauseToggleCost(s)
    hire(s, 'diplomat', 5)
    expect(clauseToggleCost(s)).toBeLessThan(base)

    const a = team(11)
    const b = team(11)
    ensureHorizon(a).embassies = 2
    ensureHorizon(b).embassies = 2
    hire(b, 'diplomat', 5)
    tickHorizon(a, 10)
    tickHorizon(b, 10)
    expect(b.horizon.seal).toBeGreaterThan(a.horizon.seal)
  })

  it('surveyor level quickens the survey trickle', () => {
    const a = team(7)
    const b = team(7)
    a.memos['survey-office'] = 1
    b.memos['survey-office'] = 1
    hire(b, 'surveyor', 10)
    tickHorizon(a, 10)
    tickHorizon(b, 10)
    expect(b.horizon.survey).toBeGreaterThan(a.horizon.survey)
  })

  it('a worked deputy lights its member', () => {
    const s = team(8)
    hire(s, 'broker')
    const id = s.staff[0]!.id
    expect(annexWorkingIds(s)).toEqual([])
    s.staff[0]!.deputy = true
    s.horizon.deputy[id] = true
    s.horizon.deputyAt[id] = s.time + 20
    expect(annexWorkingIds(s)).toEqual([id])
    expect(deputyCooldownMul(10)).toBeLessThan(deputyCooldownMul(1))
  })
})

describe('marketing late verbs', () => {
  function stocked(s: GameState) {
    ensureHorizon(s).planets = [
      { id: 'pantry', revealed: true, stocked: true, slots: ['can', '', '', '', '', ''], score: 0.9, localPrice: null, banTag: null, lockedSku: null },
    ]
    s.offworld = { bay: ['can'], sold: 0 }
  }

  it('a broadcast spends survey and lifts off-world sales while it airs', () => {
    const s = team(8)
    stocked(s)
    s.horizon.survey = 20
    const before = offworldSalesMul(s)
    expect(can(s, { type: 'broadcast', climate: 'tide' }).ok).toBe(false)
    expect(run(s, { type: 'broadcast', climate: 'quiet' }).ok).toBe(true)
    expect(s.horizon.survey).toBe(20 - LATE.broadcastSurveyCost)
    expect(s.late.broadcasts.quiet).toBe(LATE.broadcastDurationSec)
    expect(offworldSalesMul(s)).toBeCloseTo(before * (1 + LATE.broadcastSalesBump))
    expect(can(s, { type: 'broadcast', climate: 'quiet' }).ok).toBe(false)
  })

  it('a wire ad spends signal and lifts the ad stack until it ends', () => {
    const s = team(10)
    s.ads = 5
    s.horizon.signal = 30
    expect(can(s, { type: 'wireAd' }).ok).toBe(true)
    const before = adMul(s)
    run(s, { type: 'wireAd' })
    expect(s.horizon.signal).toBe(30 - LATE.wireAdSignalCost)
    expect(adMul(s)).toBeCloseTo(before * LATE.wireAdMul)
    expect(can(s, { type: 'wireAd' }).ok).toBe(false)
    s.time += LATE.wireAdDurationSec + 1
    expect(adMul(s)).toBeCloseTo(before)
  })

  it('celebrity and posture fees follow revenue only after Era 7', () => {
    const s = team(3)
    s.rates.revenuePerSec = 1e12
    expect(postureFee(s)).toBeLessThan(100)
    expect(celebrityCashCost(s)).toBeLessThan(1e4)
    s.era = 8
    expect(postureFee(s)).toBeGreaterThan(1e8)
    expect(celebrityCashCost(s)).toBeGreaterThan(1e10)
    expect(MEMO_BY_ID['celebrity-endcap']!.cost(s).cash).toBe(celebrityCashCost(s))
  })
})

describe('venture forks that used to be flavor', () => {
  it('tourist adds flagship demand; the crew side does not', () => {
    const s = team(8)
    const base = ventureTrafficMul(s)
    openVenture(s, 'dutyfree', 10, 'a')
    const open = ventureTrafficMul(s)
    openVenture(s, 'dutyfree', 10, 'b')
    expect(open).toBeGreaterThan(ventureTrafficMul(s))
    expect(open).toBeGreaterThan(base)
  })

  it('courier Keel cuts the convoy demand penalty', () => {
    const s = team(8)
    ensureHorizon(s).keel.convoys = 6
    openVenture(s, 'courier', 10, 'b')
    const own = keelDemandMul(s)
    openVenture(s, 'courier', 10, 'a')
    expect(keelDemandMul(s)).toBeGreaterThan(own)
  })

  it('bonded sealed slows backroom aging, ghost rush speeds perishables up', () => {
    const s = team(8)
    const base = agingMul(s, 'backroom', 'produce')
    openVenture(s, 'bonded', 10, 'a')
    expect(agingMul(s, 'backroom', 'produce')).toBeLessThan(base)
    expect(agingMul(s, 'shelf', 'produce')).toBe(agingMul(team(8), 'shelf', 'produce'))
    openVenture(s, 'ghost', 10, 'b')
    expect(agingMul(s, 'shelf', 'produce')).toBeGreaterThan(agingMul(team(8), 'shelf', 'produce'))
  })

  it('meal kits hearty burns less produce than lean', () => {
    function burned(policy: 'a' | 'b') {
      const s = team(3)
      s.categories.produce = true
      openVenture(s, 'mealkits', 10, policy)
      tickVentures(s, 60)
      return s.ventures.mealkits!.carry + 0
    }
    // Carry accrues the produce wanted; hearty wants less per second than lean.
    expect(burned('a')).toBeLessThan(burned('b'))
  })

  it('the era 11–12 ventures open on their gates and pay', () => {
    const ids = ['embassy-gift', 'treaty-caterer', 'ivo-diner', 'endless-kiosk']
    const s = team(10)
    for (const id of ids) expect(VENTURES.find((v) => v.id === id)?.available(s)).toBe(false)
    s.era = 12
    ensureHorizon(s).embassies = 1
    s.horizon.charter = 'standard'
    for (const id of ids) {
      const def = VENTURES.find((v) => v.id === id)!
      expect(def.available(s)).toBe(true)
      expect(def.policies?.a).toBeTruthy()
      expect(run(s, { type: 'openVenture', id }).ok).toBe(true)
    }
    tickVentures(s, 30)
    for (const id of ids) expect(collectVenture(s, id)).toBeGreaterThan(0)
  })
})

describe('horizon rivals', () => {
  it('open on their era and not before', () => {
    const s = team(6)
    tickRivals(s)
    expect(s.rivals.drift).toBeUndefined()
    s.era = 7
    tickRivals(s)
    expect(s.rivals.drift).toBeTruthy()
    expect(s.rivals.keelmark).toBeUndefined()
    s.era = 8
    tickRivals(s)
    expect(s.rivals.keelmark).toBeTruthy()
    expect(s.rivals.verdant).toBeUndefined()
    s.era = 9
    tickRivals(s)
    expect(s.rivals.verdant).toBeTruthy()
    expect(s.rivals.static).toBeUndefined()
    s.era = 12
    tickRivals(s)
    for (const id of ['drift', 'keelmark', 'verdant', 'static', 'concord', 'ration']) {
      expect(s.rivals[id]).toBeTruthy()
    }
    expect(RIVALS).toHaveLength(10)
  })

  it('price follows revenue for horizon chains and buying Ration earns the feat relic', async () => {
    const s = team(12)
    tickRivals(s)
    const flat = buyoutCost(s, 'ration')
    s.rates.revenuePerSec = 1e30
    expect(buyoutCost(s, 'ration')).toBeGreaterThan(flat)
    s.rates.revenuePerSec = 0
    s.cash = buyoutCost(s, 'ration')
    expect(run(s, { type: 'buyoutRival', id: 'ration' }).ok).toBe(true)
    const { FEATS } = await import('./museum')
    expect(FEATS['hz-ration']!.test(s, {} as never)).toBe(true)
  })
})

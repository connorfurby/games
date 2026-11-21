import { describe, expect, it } from 'vitest'
import { GOALS } from '../content/goals'
import { COLD, DEPTH } from './balance'
import { can, run } from './commands'
import { demandBreakdown, demandPerSec } from './formulas'
import { createInitialState } from './state'
import { plantCountOf } from './systems/cold'
import { tickUnlocks } from './unlocks'
import { applyTick } from './tick'

describe('depth smoke', () => {
  it('setFacing stores a can facing', () => {
    const s = createInitialState(3)
    expect(can(s, { type: 'setFacing', cat: 'cans', facingId: 'tomatoes' }).ok).toBe(true)
    expect(run(s, { type: 'setFacing', cat: 'cans', facingId: 'tomatoes' }).ok).toBe(true)
    expect(s.depth.facings.cans).toBe('tomatoes')
  })

  it('era 1 requires facing + 3 bells + regulars + stars + hire/Open + volume', () => {
    const s = createInitialState(5)
    s.staff.push({
      id: 1,
      role: 'clerk',
      name: 'Test',
      level: 1,
      xp: 0,
      hiredAt: 0,
    })
    s.nextStaffId = 2
    tickUnlocks(s, 1)
    expect(s.era).toBe(0)

    run(s, { type: 'setFacing', cat: 'cans', facingId: 'beans' })
    s.depth.marketBellDipAt = 1
    s.depth.marketBellDips = DEPTH.marketBellNeed
    s.depth.regularSatisfied = DEPTH.era1RegularNeed
    s.depth.layawaySlips = DEPTH.layawaySlipNeed
    s.depth.stars = DEPTH.era1StarMin
    run(s, { type: 'assignShift', slot: 'open', staffId: 1 })
    tickUnlocks(s, 1)
    expect(s.era).toBe(0)

    s.baskets = DEPTH.ERA1_HIRE_BASKETS
    tickUnlocks(s, 1)
    expect(s.era).toBe(1)
  })

  it('era 1 opens on facing + 3 bells + regulars + slips + stars + the solo basket gate without hire', () => {
    const s = createInitialState(7)
    s.baskets = DEPTH.ERA1_BASKETS_GATE
    s.depth.marketBellDipAt = 1
    s.depth.marketBellDips = DEPTH.marketBellNeed
    s.depth.regularSatisfied = DEPTH.era1RegularNeed
    s.depth.layawaySlips = DEPTH.layawaySlipNeed
    s.depth.stars = DEPTH.era1StarMin
    tickUnlocks(s, 1)
    expect(s.era).toBe(0)
    run(s, { type: 'setFacing', cat: 'cans', facingId: 'soup' })
    tickUnlocks(s, 1)
    expect(s.era).toBe(1)
  })

  it('corner store goal still names baskets after the slips are cleared', () => {
    const s = createInitialState(1)
    s.depth.facings.cans = 'tomatoes'
    s.depth.marketBellDips = DEPTH.marketBellNeed
    s.depth.regularSatisfied = DEPTH.era1RegularNeed
    s.depth.layawaySlips = DEPTH.layawaySlipNeed
    s.depth.stars = DEPTH.era1StarMin
    s.baskets = 100
    const g = GOALS.find((goal) => goal.id === 'corner-store')!
    expect(g.counts?.(s)).toContain(`Baskets 100/${DEPTH.ERA1_BASKETS_GATE}`)
    expect(g.action?.(s)).toEqual({ type: 'hire', role: 'clerk' })
    s.staff.push({ id: 1, role: 'clerk', name: 'Ada', level: 1, xp: 0, hiredAt: 0 })
    s.depth.shifts.open = [1]
    s.backroom = []
    expect(g.counts?.(s)).toContain(`Baskets 100/${DEPTH.ERA1_HIRE_BASKETS}`)
    expect(g.action?.(s)).toEqual({ type: 'buyWholesale' })
    s.backroom.push({ cat: 'cans', qty: 4, age: 0 })
    expect(g.action?.(s)).toEqual({ type: 'unpack' })
  })

  it('era1 needs 3 bells; invoice pay; planogram practice; side yard blocked without regulars', () => {
    const s = createInitialState(29)
    s.cash = 50_000
    s.lifetimeRevenue = 20_000
    s.compute.unlocked = true
    s.compute.attention = 10_000
    s.memos['lot-survey'] = 1
    s.menus.land = true
    s.builds.storefront = 2
    s.categories.produce = true
    s.categories.dairy = true
    s.depth.writeOffs = DEPTH.writeOffNeedEra2
    s.depth.invoicesOnTime = DEPTH.invoiceOnTimeNeedSideYard
    s.depth.dockCheckIns = DEPTH.dockCheckInNeed
    s.depth.shifts.daysCoveredOpen = DEPTH.openDaysNeedSideYard
    s.depth.stars = DEPTH.era1StarMin
    s.staff.push({
      id: 1,
      role: 'produceLead',
      name: 'Lead',
      level: 1,
      xp: 0,
      hiredAt: 0,
    })
    s.nextStaffId = 2
    s.depth.departments.fresh.leadId = 1
    // Missing regulars — blocked.
    s.depth.regularSatisfied = 0
    expect(can(s, { type: 'expandLot', id: 'side-yard' }).ok).toBe(false)

    s.depth.regularSatisfied = DEPTH.era2RegularNeed
    // Missing planogram credit — blocked.
    expect(can(s, { type: 'expandLot', id: 'side-yard' }).ok).toBe(false)

    expect(can(s, { type: 'fileStandardFlagship' }).ok).toBe(false) // era 0
    s.era = 1
    expect(run(s, { type: 'fileStandardFlagship' }).ok).toBe(true)
    expect(s.depth.flagship.practiceLeft).toBe(DEPTH.flagshipPracticePerEra - 1)
    run(s, { type: 'fileStandardFlagship' })
    run(s, { type: 'fileStandardFlagship' })
    expect(s.depth.flagship.credited).toBe(true)

    // Invoice pay path
    s.depth.invoices.push({
      id: 99,
      cat: 'cans',
      amount: 10,
      dueAt: s.time + 60,
      paid: false,
      onTime: false,
    })
    const before = s.depth.invoicesOnTime
    expect(run(s, { type: 'payInvoice', id: 99 }).ok).toBe(true)
    expect(s.depth.invoicesOnTime).toBe(before + 1)

    // Pay all: settles every invoice cash covers, oldest first, in one command.
    for (const id of [100, 101, 102]) {
      s.depth.invoices.push({ id, cat: 'cans', amount: 5, dueAt: s.time + 60, paid: false, onTime: false })
    }
    s.cash = Math.max(s.cash, 50)
    expect(run(s, { type: 'payAllInvoices' }).ok).toBe(true)
    expect(s.depth.invoices.filter((i) => !i.paid)).toHaveLength(0)
    expect(s.depth.invoicesOnTime).toBe(before + 4)
    expect(can(s, { type: 'payAllInvoices' }).ok).toBe(false)
    // Auto-pay is on by default; switching it off is a command.
    expect(s.depth.autoPayInvoices).toBe(true)
    run(s, { type: 'setAutoPayInvoices', on: false })
    expect(s.depth.autoPayInvoices).toBe(false)

    expect(DEPTH.marketBellNeed).toBe(3)
    expect(can(s, { type: 'expandLot', id: 'side-yard' }).ok).toBe(true)
  })

  it('closed cuts demand', () => {
    const s = createInitialState(9)
    const openDemand = demandPerSec(s)
    expect(demandBreakdown(s).parts.open).toBe(1)
    run(s, { type: 'setOpen', open: false })
    expect(s.depth.open).toBe(false)
    expect(demandBreakdown(s).parts.open).toBe(DEPTH.closedDemandMul)
    expect(demandPerSec(s)).toBeCloseTo(openDemand * DEPTH.closedDemandMul, 5)
  })

  it('setCircular / printFlyerWeek sets aisles and starts a flyer week', () => {
    const s = createInitialState(11)
    s.era = 2
    s.categories.produce = true
    expect(can(s, { type: 'setCircular', aisles: ['cans', 'produce'] }).ok).toBe(true)
    expect(run(s, { type: 'setCircular', aisles: ['cans', 'produce'] }).ok).toBe(true)
    expect(s.depth.circularsRun).toBe(1)
    expect(s.depth.circular?.aisles).toEqual(['cans', 'produce'])
    expect(s.depth.circular!.until).toBeGreaterThan(s.time)
    expect(s.depth.flyer?.aisles).toEqual(['cans', 'produce'])
    expect(s.depth.flyer!.until).toBeGreaterThan(s.time)
  })

  it('cold permit blocked without 3 flyers / 4 matches', () => {
    const s = createInitialState(12)
    s.era = 2
    s.cash = 1e9
    s.compute.attention = 1e6
    s.builds.cold = 2
    s.depot = true
    s.depth.stars = DEPTH.coldPermitStarMin
    s.depth.flagship.chainCredited = true
    s.memoSeen['cold-plant-permit'] = true
    // Seed three stores (not matched) and no flyer weeks.
    s.stores = [
      { id: 's1', name: 'A', level: 1, xp: 0, policy: 'standard', attentionShare: 1 / 3, drift: 0 },
      { id: 's2', name: 'B', level: 1, xp: 0, policy: 'standard', attentionShare: 1 / 3, drift: 0 },
      { id: 's3', name: 'C', level: 1, xp: 0, policy: 'standard', attentionShare: 1 / 3, drift: 0 },
    ]
    s.depth.placeTraits = { s1: 'commuter', s2: 'night', s3: 'family' }
    s.depth.flyerWeeks = 0
    expect(can(s, { type: 'buyMemo', id: 'cold-plant-permit' }).ok).toBe(false)
    expect(can(s, { type: 'buyMemo', id: 'cold-plant-permit' }).reason).toMatch(/flyer/i)

    s.depth.flyerWeeks = DEPTH.flyerWeeksNeed
    expect(can(s, { type: 'buyMemo', id: 'cold-plant-permit' }).ok).toBe(false)
    expect(can(s, { type: 'buyMemo', id: 'cold-plant-permit' }).reason).toMatch(/hot-trait|walk/i)

    s.depth.hotTraitWalks = DEPTH.hotTraitWalkNeed
    expect(can(s, { type: 'buyMemo', id: 'cold-plant-permit' }).ok).toBe(false)
    expect(can(s, { type: 'buyMemo', id: 'cold-plant-permit' }).reason).toMatch(/matched/i)

    // Four matched stores.
    s.stores.push({
      id: 's4',
      name: 'D',
      level: 1,
      xp: 0,
      policy: 'standard',
      attentionShare: 0.25,
      drift: 0,
    })
    for (const st of s.stores) st.attentionShare = 0.25
    s.depth.placeTraits = {
      s1: 'commuter',
      s2: 'commuter',
      s3: 'commuter',
      s4: 'commuter',
    }
    for (const st of s.stores) st.policy = 'standard'
    expect(can(s, { type: 'buyMemo', id: 'cold-plant-permit' }).ok).toBe(true)
  })

  it('blast drains yield; compressor does not', () => {
    const s = createInitialState(13)
    s.era = 3
    s.cash = 10_000_000
    s.memos['cold-plant-permit'] = 1
    s.cold.yieldLeft = COLD.yieldStart
    s.cold.yieldMax = COLD.yieldStart

    expect(run(s, { type: 'buyPlant', kind: 'compressor' }).ok).toBe(true)
    expect(plantCountOf(s, 'compressor')).toBe(1)
    const before = s.cold.yieldLeft
    for (let i = 0; i < 60; i++) applyTick(s, 1)
    expect(s.cold.yieldLeft).toBe(before)

    expect(run(s, { type: 'buyPlant', kind: 'blast' }).ok).toBe(true)
    expect(plantCountOf(s, 'blast')).toBe(1)
    for (let i = 0; i < 30; i++) applyTick(s, 1)
    expect(s.cold.yieldLeft).toBeLessThan(before)
  })

  it('leaveRegion needs five cooler logs + two bills', () => {
    const s = createInitialState(17)
    s.era = 3
    s.cash = 1_000_000
    s.memos['leave-region'] = 1
    s.cold.yieldLeft = 0
    s.politics.capital = 50
    s.politics.bills = { hours: false, waste: false, labor: false, tax: false }
    s.cold.plantList = [
      { id: 'p1', kind: 'blast' },
      { id: 'p2', kind: 'tunnel' },
    ]
    s.cold.plants = 2
    s.depth.leadsOnBoard = { fresh: true, cold: true }
    s.depth.stars = 3.5
    s.depth.cooler = { logsSigned: 0, nextDueAt: 0, missed: 0, lastSignedAt: 0 }
    expect(can(s, { type: 'leaveRegion' }).ok).toBe(false)
    s.politics.bills.hours = true
    s.politics.bills.waste = true
    expect(can(s, { type: 'leaveRegion' }).ok).toBe(false)
    s.depth.cooler.logsSigned = DEPTH.coolerLogNeed
    expect(can(s, { type: 'leaveRegion' }).ok).toBe(true)
  })

  it('launchBarge needs three clean manifests', () => {
    const s = createInitialState(19)
    s.era = 5
    s.cash = 1e12
    s.read = 20
    s.memos['barge-berth'] = 1
    s.categories.import = true
    s.depth.contracts.portBroker = true
    s.depth.flagship.globeCredited = true
    s.depth.stars = 3.5
    s.depth.defectionsHandled = 1
    s.depth.dispatch = {
      cleanManifests: 0,
      lastCycleAt: 0,
      lastCleanAt: 0,
      laneStances: {},
      fastFiled: 0,
      examLaneId: null,
      examMix: null,
      examUntil: 0,
      examsHeld: 0,
    }
    s.staff.push({
      id: 90,
      role: 'dispatcher',
      name: 'Disp',
      level: 1,
      xp: 0,
      hiredAt: 0,
    })
    expect(can(s, { type: 'launchBarge', class: 'hauler' }).ok).toBe(false)
    s.depth.dispatch.cleanManifests = DEPTH.cleanManifestsNeed
    s.depth.dispatch.examsHeld = DEPTH.examHoldNeed
    expect(can(s, { type: 'launchBarge', class: 'hauler' }).ok).toBe(true)
  })

  it('trip required to clear pocket; idle ticks do not drain', () => {
    const s = createInitialState(19)
    s.era = 5
    s.cash = 1e12
    s.read = 20
    s.memos['barge-berth'] = 1
    s.categories.import = true
    s.depth.contracts.portBroker = true
    s.depth.flagship.globeCredited = true
    s.depth.stars = 3.5
    s.depth.defectionsHandled = 1
    s.depth.dispatch = {
      cleanManifests: DEPTH.cleanManifestsNeed,
      lastCycleAt: 0,
      lastCleanAt: 0,
      laneStances: {},
      fastFiled: 0,
      examLaneId: null,
      examMix: null,
      examUntil: 0,
      examsHeld: DEPTH.examHoldNeed,
    }
    s.staff.push({
      id: 91,
      role: 'dispatcher',
      name: 'Disp',
      level: 1,
      xp: 0,
      hiredAt: 0,
    })
    s.fleet.pockets = s.fleet.pockets.map((p, i) =>
      i === 0 ? { ...p, left: p.max, max: p.max } : { ...p, left: 0, max: p.max },
    )
    s.fleet.biomass = s.fleet.pockets[0]!.max
    expect(run(s, { type: 'launchBarge', class: 'hauler' }).ok).toBe(true)
    const hauler = s.fleet.bargeList.find((b) => b.class === 'hauler')!
    const pocket = s.fleet.pockets[0]!
    hauler.ration = pocket.ration
    const before = pocket.left
    for (let i = 0; i < 40; i++) applyTick(s, 1)
    expect(s.fleet.pockets[0]!.left).toBe(before)
    expect(run(s, { type: 'dispatchHauler', bargeId: hauler.id, pocketId: pocket.id }).ok).toBe(true)
    expect(s.fleet.trips.some((t) => t.status === 'enroute')).toBe(true)
    const trip = s.fleet.trips.find((t) => t.status === 'enroute')!
    s.time = trip.arriveAt
    applyTick(s, 1)
    expect(s.fleet.pockets[0]!.left).toBeLessThan(before)
  })

  it('wrong ration wastes the trip', () => {
    const s = createInitialState(21)
    s.era = 5
    s.fleet.launched = true
    s.fleet.barges = 1
    s.fleet.bargeList = [{ id: 'bg-1', class: 'hauler', ration: 'grain' }]
    s.fleet.pockets = s.fleet.pockets.map((p, i) =>
      i === 0 ? { ...p, ration: 'oil', left: p.max } : { ...p, left: 0 },
    )
    s.fleet.biomass = s.fleet.pockets[0]!.max
    const pocket = s.fleet.pockets[0]!
    const before = pocket.left
    expect(run(s, { type: 'dispatchHauler', bargeId: 'bg-1', pocketId: pocket.id }).ok).toBe(true)
    const trip = s.fleet.trips.find((t) => t.status === 'enroute')!
    s.time = trip.arriveAt
    applyTick(s, 1)
    expect(s.fleet.pockets[0]!.left).toBe(before)
    expect(s.fleet.trips.some((t) => t.status === 'wasted')).toBe(true)
  })

  it('era 6 needs pockets + trips + ration + Orbit Mid + Hold + stars', () => {
    const s = createInitialState(23)
    s.era = 5
    s.fleet.launched = true
    s.fleet.barges = 1
    s.categories.ration = true
    s.fleet.pockets = s.fleet.pockets.map((p, i) => ({
      ...p,
      left: i < 4 ? 0 : p.max,
    }))
    s.fleet.biomass = s.fleet.pockets.reduce((a, p) => a + p.left, 0)
    s.depth.stars = DEPTH.era6StarMin
    s.depth.orbitMidOnce = true
    s.depth.driftWar = { step: 3 }
    s.depth.berthTurnarounds = DEPTH.berthTurnaroundNeed
    expect(s.era).toBe(5)
    for (let i = 0; i < 5; i++) applyTick(s, 1)
    expect(s.era).toBe(5)
    run(s, { type: 'setFacing', cat: 'ration', facingId: 'standard-pack' })
    for (let i = 0; i < 5; i++) applyTick(s, 1)
    // Cleared pockets without Pocket Ops trips must not open Era 6.
    expect(s.era).toBe(5)
    s.fleet.trips = Array.from({ length: 4 }, (_, i) => ({
      bargeId: 'bg-1',
      pocketId: `p${i}`,
      ration: 'grain',
      departAt: 0,
      arriveAt: 1,
      status: 'done' as const,
    }))
    for (let i = 0; i < 5; i++) applyTick(s, 1)
    expect(s.era).toBe(6)
    expect(s.depth.rationWeekUntil).toBeGreaterThan(s.time)
    expect(s.depth.starsFrozenAt).toBe(s.depth.stars)
  })
})

describe('autopilot pieces', () => {
  it('dock check-ins run themselves only after the lesson is earned', async () => {
    const { createInitialState } = await import('./state')
    const { tickAutoDock } = await import('./systems/dock')
    const { DEPTH } = await import('./balance')
    const s = createInitialState(5)
    s.era = 1
    ensureDepthForTest(s)
    s.staff.push({ id: 9001, role: 'receiver' } as never)
    s.depth.shifts[DEPTH.shiftSlots[0]] = [9001]
    s.depth.nextDockAt = 0
    s.depth.autoDock = true
    s.depth.dockCheckIns = DEPTH.dockAutoAfter - 1
    tickAutoDock(s)
    expect(s.depth.dockCheckIns).toBe(DEPTH.dockAutoAfter - 1)
    s.depth.dockCheckIns = DEPTH.dockAutoAfter
    const back = s.backroom.reduce((n, b) => n + b.qty, 0)
    tickAutoDock(s)
    expect(s.depth.dockCheckIns).toBe(DEPTH.dockAutoAfter + 1)
    expect(s.backroom.reduce((n, b) => n + b.qty, 0)).toBeGreaterThan(back)
    s.depth.autoDock = false
    s.depth.nextDockAt = 0
    tickAutoDock(s)
    expect(s.depth.dockCheckIns).toBe(DEPTH.dockAutoAfter + 1)
    s.depth.dockCheckIns = DEPTH.dockCheckInNeed
    s.depth.autoDock = true
    s.depth.nextDockAt = 0
    tickAutoDock(s)
    expect(s.depth.dockCheckIns).toBe(DEPTH.dockCheckInNeed)
    const { can } = await import('./commands')
    expect(can(s, { type: 'dockCheckIn', aisle: 'cans' }).ok).toBe(false)
  })

  it('collect all empties every till in one command', async () => {
    const { createInitialState } = await import('./state')
    const { run, can } = await import('./commands')
    const s = createInitialState(6)
    s.ventures = {
      a: { level: 1, stored: 10, lifetime: 0 },
      b: { level: 1, stored: 5, lifetime: 0 },
    } as never
    const cash = s.cash
    expect(run(s, { type: 'collectAllVentures' }).ok).toBe(true)
    expect(s.cash).toBeCloseTo(cash + 15, 5)
    expect(can(s, { type: 'collectAllVentures' }).ok).toBe(false)
  })
})

function ensureDepthForTest(s: { depth?: unknown }) {
  expect(s.depth).toBeTruthy()
}

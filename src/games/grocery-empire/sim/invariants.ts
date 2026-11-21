import { CATEGORY_IDS } from '../content/categories'
import { emptyDepth } from '../content/depth'
import { COMPUTE, DEPTH, HORIZON, HOURS, MORALE, PRICE } from './balance'
import { hoursMax } from './formulas'
import { clamp, compact } from './helpers'
import { isRivalKind, type Batch, type GameState } from './state'
import { trimFleetLists } from './systems/fleet'

function finite(n: number, fallback = 0) {
  return Number.isFinite(n) ? n : fallback
}

function repairBatches(list: Batch[]) {
  for (const b of list) {
    b.qty = Math.max(0, finite(b.qty))
    b.age = Math.max(0, finite(b.age))
    if (!CATEGORY_IDS.includes(b.cat)) b.qty = 0
  }
  compact(list)
}

/** Repair NaNs, floors, clamps. Always returns the same object. */
export function repair(s: GameState): GameState {
  s.time = Math.max(0, finite(s.time))
  s.cash = Math.max(0, finite(s.cash))
  s.baskets = Math.max(0, finite(s.baskets))
  s.lifetimeRevenue = Math.max(0, finite(s.lifetimeRevenue))
  s.arrears = Math.max(0, finite(s.arrears))
  s.arrearsForgiven = Math.max(0, finite(s.arrearsForgiven))
  s.debt.owed = Math.max(0, finite(s.debt.owed))
  s.debt.taken = Math.max(0, finite(s.debt.taken))
  s.price = Math.round(clamp(finite(s.price, PRICE.min), PRICE.min, PRICE.max) * 100) / 100
  s.hours = clamp(finite(s.hours, 1), HOURS.min, hoursMax(s))
  s.morale = clamp(finite(s.morale, 1), MORALE.min, MORALE.max)
  s.speed = 1
  s.era = Math.max(0, Math.floor(finite(s.era)))
  s.ads = Math.max(1, Math.floor(finite(s.ads, 1)))
  s.adCost = Math.max(1, finite(s.adCost, 20))
  s.endcaps = Math.max(0, Math.floor(finite(s.endcaps)))
  s.passbook.balance = Math.max(0, finite(s.passbook.balance))

  s.inspection.meter = clamp(finite(s.inspection.meter), 0, 2)
  s.inspection.penaltyUntil = Math.max(0, finite(s.inspection.penaltyUntil))
  s.inspection.lastInspectorAt = finite(s.inspection.lastInspectorAt, -1e9)

  if (!s.events?.couponWar) {
    s.events = {
      couponWar: { active: false, endsAt: 0, lastAt: -1e9 },
      rival: { kind: null, endsAt: 0, lastAt: -1e9 },
    }
  } else {
    s.events.couponWar.active = Boolean(s.events.couponWar.active)
    s.events.couponWar.endsAt = Math.max(0, finite(s.events.couponWar.endsAt))
    s.events.couponWar.lastAt = finite(s.events.couponWar.lastAt, -1e9)
  }
  if (!s.events.rival) {
    s.events.rival = { kind: null, endsAt: 0, lastAt: -1e9 }
  } else {
    const r = s.events.rival
    if (!isRivalKind(r.kind)) r.kind = null
    r.endsAt = Math.max(0, finite(r.endsAt))
    r.lastAt = finite(r.lastAt, -1e9)
  }

  if (!s.campaigns) {
    s.campaigns = { celebrityUntil: 0 }
  } else {
    s.campaigns.celebrityUntil = Math.max(0, finite(s.campaigns.celebrityUntil))
  }

  s.compute.attention = Math.max(0, finite(s.compute.attention))
  s.compute.ideas = Math.max(0, finite(s.compute.ideas))
  s.compute.reputation = Math.max(0, Math.floor(finite(s.compute.reputation)))
  s.compute.analysts = Math.max(1, Math.floor(finite(s.compute.analysts, 1)))
  s.compute.archives = Math.max(1, Math.floor(finite(s.compute.archives, 1)))
  s.compute.nextRepAt = Math.max(1, finite(s.compute.nextRepAt, COMPUTE.firstRepAt))
  s.compute.fibA = Math.max(1, Math.floor(finite(s.compute.fibA, 2)))
  s.compute.fibB = Math.max(1, Math.floor(finite(s.compute.fibB, 3)))
  s.compute.officeMoves = Math.max(0, Math.floor(finite(s.compute.officeMoves)))
  s.compute.ideasOn = s.compute.ideasOn !== false
  s.compute.autoTourney = s.compute.autoTourney !== false
  s.compute.nextAutoTourneyAt = Math.max(0, finite(s.compute.nextAutoTourneyAt))
  s.compute.scanner = Boolean(s.compute.scanner)
  s.compute.scannerReadyAt = Math.max(0, finite(s.compute.scannerReadyAt))
  // Soft clamp Attention after Archive moves / load repair
  {
    const cap = Math.max(1, s.compute.archives) * COMPUTE.capPerArchive
    if (s.compute.attention > cap) s.compute.attention = cap
  }

  if (
    s.marketingPosture !== 'neighborhood' &&
    s.marketingPosture !== 'circular' &&
    s.marketingPosture !== 'houseBrand'
  ) {
    s.marketingPosture = 'neighborhood'
  }
  s.priceLockUntil = Math.max(0, finite(s.priceLockUntil))
  s.priceLockIndex = Math.max(0.01, finite(s.priceLockIndex, s.wholesale.index))

  s.empire.xp = Math.max(0, finite(s.empire.xp))
  s.empire.level = Math.max(1, Math.floor(finite(s.empire.level, 1)))
  s.empire.points = Math.max(0, Math.floor(finite(s.empire.points)))

  s.wholesale.index = Math.max(0.01, finite(s.wholesale.index, 1))
  s.wholesale.drift = Math.max(0.01, finite(s.wholesale.drift, 1))
  s.wholesale.phase = finite(s.wholesale.phase)
  s.wholesale.idleSec = Math.max(0, finite(s.wholesale.idleSec))
  s.wholesale.tipIndex = Math.max(0.01, finite(s.wholesale.tipIndex, s.wholesale.index))

  repairBatches(s.shelf)
  repairBatches(s.backroom)
  s.orders = s.orders.filter((o) => o.qty > 0 && Number.isFinite(o.eta))
  for (const o of s.orders) {
    o.qty = Math.max(0, finite(o.qty))
    o.eta = finite(o.eta)
    o.unitCost = Math.max(0, finite(o.unitCost))
  }

  for (const c of CATEGORY_IDS) {
    s.mix[c] = clamp(finite(s.mix[c], 0.5), 0, 1)
    s.acc.cat[c] = Math.max(0, finite(s.acc.cat[c]))
    s.stats.soldByCat[c] = Math.max(0, finite(s.stats.soldByCat[c]))
    s.stats.revenueByCat[c] = Math.max(0, finite(s.stats.revenueByCat[c]))
    s.stats.spoiledByCat[c] = Math.max(0, finite(s.stats.spoiledByCat[c]))
  }

  if (!CATEGORY_IDS.includes(s.orderCat)) s.orderCat = 'cans'
  s.staff = s.staff.filter((m) => m && typeof m.id === 'number')
  for (const m of s.staff) {
    m.level = Math.max(1, Math.floor(finite(m.level, 1)))
    m.xp = Math.max(0, finite(m.xp))
  }

  s.rates.soldPerSec = Math.max(0, finite(s.rates.soldPerSec))
  s.rates.revenuePerSec = Math.max(0, finite(s.rates.revenuePerSec))
  s.rates.costPerSec = Math.max(0, finite(s.rates.costPerSec))
  s.rates.spoilPerSec = Math.max(0, finite(s.rates.spoilPerSec))
  s.rates.demandPerSec = Math.max(0, finite(s.rates.demandPerSec))
  s.rates.venturePerSec = Math.max(0, finite(s.rates.venturePerSec))
  s.rates.investYieldPerSec = Math.max(0, finite(s.rates.investYieldPerSec))
  s.rates.cashPerSec = finite(s.rates.cashPerSec)
  s.menuStamp = Math.max(0, Math.floor(finite(s.menuStamp)))
  if (typeof s.lastMenu !== 'string' || !s.lastMenu) s.lastMenu = 'floor'
  s.acc.cashWindow = finite(s.acc.cashWindow)

  if (!s.rateAvg || typeof s.rateAvg !== 'object') {
    s.rateAvg = {
      t: 0,
      curSold: 0,
      curRev: 0,
      curCost: 0,
      curSpoil: 0,
      curCash: 0,
      sold: [],
      rev: [],
      cost: [],
      spoil: [],
      cash: [],
    }
  } else {
    s.rateAvg.t = Math.max(0, finite(s.rateAvg.t))
    s.rateAvg.curSold = Math.max(0, finite(s.rateAvg.curSold))
    s.rateAvg.curRev = Math.max(0, finite(s.rateAvg.curRev))
    s.rateAvg.curCost = Math.max(0, finite(s.rateAvg.curCost))
    s.rateAvg.curSpoil = Math.max(0, finite(s.rateAvg.curSpoil))
    s.rateAvg.curCash = finite(s.rateAvg.curCash)
    if (!Array.isArray(s.rateAvg.sold)) s.rateAvg.sold = []
    if (!Array.isArray(s.rateAvg.rev)) s.rateAvg.rev = []
    if (!Array.isArray(s.rateAvg.cost)) s.rateAvg.cost = []
    if (!Array.isArray(s.rateAvg.spoil)) s.rateAvg.spoil = []
    if (!Array.isArray(s.rateAvg.cash)) s.rateAvg.cash = []
  }

  if (!Array.isArray(s.stores)) s.stores = []
  for (const st of s.stores) {
    st.level = Math.max(1, Math.floor(finite(st.level, 1)))
    st.xp = Math.max(0, finite(st.xp))
    st.attentionShare = clamp(finite(st.attentionShare), 0, 1)
    if (st.policy !== 'local' && st.policy !== 'premium') st.policy = 'standard'
  }
  s.nextStoreId = Math.max(1, Math.floor(finite(s.nextStoreId, s.stores.length + 1)))
  s.equity = Math.max(0, finite(s.equity))
  s.read = Math.max(0, finite(s.read))
  s.repSpent = Math.max(0, Math.floor(finite(s.repSpent)))
  if (!s.invest) {
    s.invest = {
      unlocked: false,
      engineLevel: 0,
      risk: 'low',
      balance: 0,
      peak: 0,
      circuitBreaker: false,
      tickAcc: 0,
    }
  } else {
    s.invest.balance = Math.max(0, finite(s.invest.balance))
    s.invest.peak = Math.max(0, finite(s.invest.peak))
    s.invest.engineLevel = Math.max(0, Math.floor(finite(s.invest.engineLevel)))
    s.invest.tickAcc = Math.max(0, finite(s.invest.tickAcc))
    if (s.invest.risk !== 'mid' && s.invest.risk !== 'high') s.invest.risk = 'low'
  }
  if (!s.board) {
    s.board = {
      seats: 3,
      nextMeetingAt: 0,
      lastResolvedAt: 0,
      pendingAgenda: null,
      expandDiscount: 1,
      rndUntil: 0,
      cutHoursUntil: 0,
    }
  } else {
    s.board.seats = Math.max(1, Math.floor(finite(s.board.seats, 3)))
    s.board.nextMeetingAt = Math.max(0, finite(s.board.nextMeetingAt))
    s.board.lastResolvedAt = Math.max(0, finite(s.board.lastResolvedAt))
    s.board.pendingAgenda = s.board.pendingAgenda ?? null
    s.board.expandDiscount = Math.max(0.5, Math.min(1, finite(s.board.expandDiscount, 1)))
    s.board.rndUntil = Math.max(0, finite(s.board.rndUntil))
    s.board.cutHoursUntil = Math.max(0, finite(s.board.cutHoursUntil))
  }
  for (const st of s.stores ?? []) {
    st.drift = Math.max(0, Math.min(1, finite(st.drift, 0)))
  }
  if (!s.doctrines) s.doctrines = {}

  // Eras 3–6 floors
  if (s.cold) {
    s.cold.plants = Math.max(0, Math.floor(finite(s.cold.plants)))
    s.cold.tanks = Math.max(0, Math.floor(finite(s.cold.tanks)))
    s.cold.freshness = Math.max(0, finite(s.cold.freshness, 1))
    s.cold.momentum = Math.max(1, finite(s.cold.momentum, 1))
    s.cold.yieldLeft = Math.max(0, finite(s.cold.yieldLeft))
    s.cold.yieldMax = Math.max(0, finite(s.cold.yieldMax))
    s.cold.autoSheds = Math.max(0, Math.floor(finite(s.cold.autoSheds)))
    s.cold.offline = Math.max(0, Math.floor(finite(s.cold.offline ?? 0)))
    s.cold.brownouts = Math.max(0, Math.floor(finite(s.cold.brownouts)))
    s.cold.momentumHoldSec = Math.max(0, finite(s.cold.momentumHoldSec))
  }
  if (s.politics) {
    s.politics.capital = Math.max(0, finite(s.politics.capital))
    s.politics.lobby = Math.max(0, Math.floor(finite(s.politics.lobby)))
    s.politics.monopolyRisk = clamp(finite(s.politics.monopolyRisk), 0, 1)
    s.politics.acquisitions = Math.max(0, Math.floor(finite(s.politics.acquisitions)))
  }
  s.fuel = Math.max(0, finite(s.fuel))
  s.control = Math.max(0, finite(s.control))
  s.brand = clamp(finite(s.brand, 1), 0, 1)
  if (s.fleet) {
    s.fleet.barges = Math.max(0, Math.floor(finite(s.fleet.barges)))
    s.fleet.launches = Math.max(0, Math.floor(finite(s.fleet.launches ?? 0)))
    s.fleet.biomass = Math.max(0, finite(s.fleet.biomass))
    s.fleet.biomassMax = Math.max(0, finite(s.fleet.biomassMax))
    s.fleet.charterPool = Math.max(0, Math.floor(finite(s.fleet.charterPool)))
    s.fleet.charterCap = Math.max(0, Math.floor(finite(s.fleet.charterCap)))
    s.fleet.legacy = Math.max(0, finite(s.fleet.legacy))
    s.fleet.lanes = Math.max(0, Math.floor(finite(s.fleet.lanes)))
    s.fleet.franchises = Math.max(0, Math.floor(finite(s.fleet.franchises)))
    // Soft-floor: never wipe last barge while biomass remains
    if (s.fleet.biomass > 0 && s.fleet.launched && s.fleet.barges < 1) {
      s.fleet.barges = 1
    }
  }
  if (!s.rebrand || typeof s.rebrand !== 'object') s.rebrand = { goodwill: 0, count: 0, bankedThisRun: 0 }
  s.rebrand.goodwill = Math.max(0, Math.floor(finite(s.rebrand.goodwill)))
  if (!s.projects || typeof s.projects !== 'object') s.projects = { done: {}, active: [] }
  if (!Array.isArray(s.projects.active)) s.projects.active = []
  if (!s.projects.done || typeof s.projects.done !== 'object') s.projects.done = {}
  if (!s.rivals || typeof s.rivals !== 'object') s.rivals = {}
  if (!s.relics || !Array.isArray(s.relics.wings)) {
    s.relics = { wings: [], count: 0, owned: {}, levels: {}, sockets: [], litWings: null, dust: 0, autoDust: null }
  }
  if (!s.relics.owned || typeof s.relics.owned !== 'object') s.relics.owned = {}
  if (!s.relics.levels || typeof s.relics.levels !== 'object') s.relics.levels = {}
  if (!Array.isArray(s.relics.sockets)) s.relics.sockets = []
  if (!Array.isArray(s.relics.litWings)) s.relics.litWings = null
  if (typeof s.relics.dust !== 'number' || !Number.isFinite(s.relics.dust)) s.relics.dust = 0
  if (s.relics.autoDust === undefined) s.relics.autoDust = null
  if (s.prestigeCarry) {
    s.prestigeCarry.appetite = Math.max(0, finite(s.prestigeCarry.appetite))
    s.prestigeCarry.tipSharpness = Math.max(0, finite(s.prestigeCarry.tipSharpness))
    s.prestigeCarry.universeIndex = Math.max(0, Math.floor(finite(s.prestigeCarry.universeIndex)))
    const allowed = new Set(['fasterSpoil', 'richerYield', 'weirdElasticity', 'expensiveAds'])
    const seen = new Set<string>()
    const muts: typeof s.prestigeCarry.mutators = []
    for (const id of s.prestigeCarry.mutators ?? []) {
      if (!allowed.has(id) || seen.has(id)) continue
      seen.add(id)
      muts.push(id)
      if (muts.length >= 2) break
    }
    s.prestigeCarry.mutators = muts
  }

  if (!s.depth || typeof s.depth !== 'object') s.depth = emptyDepth()
  if (!s.depth.facings || typeof s.depth.facings !== 'object') s.depth.facings = {}
  if (!s.depth.departments || typeof s.depth.departments !== 'object') {
    s.depth.departments = emptyDepth().departments
  }
  for (const id of ['fresh', 'chain', 'cold', 'logistics', 'orbit']) {
    if (!s.depth.departments[id]) {
      s.depth.departments[id] = { leadId: null, specialistIds: [], policy: null }
    }
  }
  if (!s.depth.contracts || typeof s.depth.contracts !== 'object') s.depth.contracts = {}
  if (!s.depth.placeTraits || typeof s.depth.placeTraits !== 'object') s.depth.placeTraits = {}
  if (!s.depth.manifests || typeof s.depth.manifests !== 'object') s.depth.manifests = {}
  if (!s.depth.driftWar || typeof s.depth.driftWar !== 'object') s.depth.driftWar = { step: 0 }
  if (typeof s.depth.open !== 'boolean') s.depth.open = true
  s.depth.marketBellDipAt = Math.max(0, finite(s.depth.marketBellDipAt))
  s.depth.marketBellDips = Math.max(0, Math.floor(finite(s.depth.marketBellDips)))
  if (s.depth.marketBellDips <= 0 && s.depth.marketBellDipAt > 0) s.depth.marketBellDips = 1
  s.depth.stars = Math.max(
    DEPTH.starsMin,
    Math.min(DEPTH.starsMax, finite(s.depth.stars ?? DEPTH.starsStart)),
  )
  s.depth.regularSatisfied = Math.max(0, Math.floor(finite(s.depth.regularSatisfied)))
  s.depth.layawaySlips = Math.max(0, Math.floor(finite(s.depth.layawaySlips ?? 0)))
  s.depth.dockCheckIns = Math.max(0, Math.floor(finite(s.depth.dockCheckIns ?? 0)))
  s.depth.nextDockAt = Math.max(0, finite(s.depth.nextDockAt ?? 0))
  s.depth.regularMissUntil = Math.max(0, finite(s.depth.regularMissUntil))
  s.depth.nextInvoiceId = Math.max(1, Math.floor(finite(s.depth.nextInvoiceId || 1)))
  s.depth.invoicesOnTime = Math.max(0, Math.floor(finite(s.depth.invoicesOnTime)))
  if (!s.depth.regulars || typeof s.depth.regulars !== 'object') {
    s.depth.regulars = emptyDepth().regulars
  } else {
    if (!s.depth.regulars.seen || typeof s.depth.regulars.seen !== 'object') s.depth.regulars.seen = {}
    if (typeof s.depth.regulars.activeId !== 'string') s.depth.regulars.activeId = null
    s.depth.regulars.arrivesAt = Math.max(0, finite(s.depth.regulars.arrivesAt))
    s.depth.regulars.patienceUntil = Math.max(0, finite(s.depth.regulars.patienceUntil))
    s.depth.regulars.layaway = !!s.depth.regulars.layaway
    if (typeof s.depth.regulars.waitingId !== 'string') s.depth.regulars.waitingId = null
    s.depth.regulars.waitingPatienceUntil = Math.max(0, finite(s.depth.regulars.waitingPatienceUntil))
    s.depth.regulars.waitingLayaway = !!s.depth.regulars.waitingLayaway
    if (
      s.depth.regulars.waitingId &&
      (!s.depth.regulars.activeId || s.depth.regulars.waitingId === s.depth.regulars.activeId)
    ) {
      s.depth.regulars.waitingId = null
      s.depth.regulars.waitingPatienceUntil = 0
      s.depth.regulars.waitingLayaway = false
    }
  }
  if (!s.depth.shifts || typeof s.depth.shifts !== 'object') {
    s.depth.shifts = emptyDepth().shifts
  } else {
    for (const slot of DEPTH.shiftSlots) {
      if (!Array.isArray(s.depth.shifts[slot])) s.depth.shifts[slot] = []
    }
    s.depth.shifts.daysCoveredOpen = Math.max(0, Math.floor(finite(s.depth.shifts.daysCoveredOpen)))
    s.depth.shifts.daysCoveredMidOrbit = Math.max(
      0,
      Math.floor(finite(s.depth.shifts.daysCoveredMidOrbit ?? 0)),
    )
    s.depth.shifts.lastRolloverDay = Math.max(0, Math.floor(finite(s.depth.shifts.lastRolloverDay)))
  }
  if (!Array.isArray(s.depth.invoices)) s.depth.invoices = []
  if (!s.depth.flagship || typeof s.depth.flagship !== 'object') {
    s.depth.flagship = emptyDepth().flagship
  } else {
    if (!Array.isArray(s.depth.flagship.slots)) s.depth.flagship.slots = emptyDepth().flagship.slots
    s.depth.flagship.score = Math.max(0, Math.min(1, finite(s.depth.flagship.score)))
    s.depth.flagship.filings = Math.max(0, Math.floor(finite(s.depth.flagship.filings)))
    s.depth.flagship.practiceLeft = Math.max(0, Math.floor(finite(s.depth.flagship.practiceLeft)))
    if (typeof s.depth.flagship.credited !== 'boolean') s.depth.flagship.credited = false
    if (typeof s.depth.flagship.chainCredited !== 'boolean') s.depth.flagship.chainCredited = false
    if (typeof s.depth.flagship.globeCredited !== 'boolean') s.depth.flagship.globeCredited = false
  }
  if (s.depth.produceGrade !== 'good' && s.depth.produceGrade !== 'bruised') {
    s.depth.produceGrade = null
  }
  s.depth.writeOffAt = Math.max(0, finite(s.depth.writeOffAt))
  s.depth.writeOffs = Math.max(0, Math.floor(finite(s.depth.writeOffs)))
  s.depth.promotions = Math.max(0, Math.floor(finite(s.depth.promotions)))
  s.depth.circularsRun = Math.max(0, Math.floor(finite(s.depth.circularsRun)))
  s.depth.flyerWeeks = Math.max(0, Math.floor(finite(s.depth.flyerWeeks ?? 0)))
  s.depth.hotTraitWalks = Math.max(0, Math.floor(finite(s.depth.hotTraitWalks ?? 0)))
  if (typeof s.depth.counterFlyerNeeded !== 'boolean') s.depth.counterFlyerNeeded = false
  s.depth.counterFlyerAt = Math.max(0, finite(s.depth.counterFlyerAt ?? 0))
  s.depth.blockEventAt = Math.max(0, finite(s.depth.blockEventAt ?? 0))
  if (!s.depth.blockEvent || typeof s.depth.blockEvent !== 'object') {
    s.depth.blockEvent = emptyDepth().blockEvent
  } else {
    const k = s.depth.blockEvent.kind
    if (k !== 'parade' && k !== 'payday' && k !== 'rain' && k !== null) s.depth.blockEvent.kind = null
    s.depth.blockEvent.until = Math.max(0, finite(s.depth.blockEvent.until))
    if (typeof s.depth.blockEvent.traitBias !== 'string' && s.depth.blockEvent.traitBias !== null) {
      s.depth.blockEvent.traitBias = null
    }
  }
  if (s.depth.flyer !== null && typeof s.depth.flyer === 'object') {
    if (!Array.isArray(s.depth.flyer.aisles)) s.depth.flyer.aisles = []
    const d = s.depth.flyer.discount
    if (d !== 'soft' && d !== 'mid' && d !== 'deep') s.depth.flyer.discount = 'soft'
    if (s.depth.flyer.promise !== 'hours' && s.depth.flyer.promise !== 'facing') {
      s.depth.flyer.promise = 'hours'
    }
    s.depth.flyer.until = Math.max(0, finite(s.depth.flyer.until))
    s.depth.flyer.weeksCompleted = Math.max(0, Math.floor(finite(s.depth.flyer.weeksCompleted)))
    s.depth.flyer.cooldownUntil = Math.max(0, finite(s.depth.flyer.cooldownUntil))
    s.depth.flyer.bandHeld = s.depth.flyer.bandHeld !== false
  } else if (s.depth.flyer !== null) {
    s.depth.flyer = null
  }
  s.depth.rivalLockAt = Math.max(0, finite(s.depth.rivalLockAt))
  s.depth.brownoutDrillAt = Math.max(0, finite(s.depth.brownoutDrillAt))
  s.depth.drillsRun = Math.max(0, Math.floor(finite(s.depth.drillsRun)))
  if (!s.depth.cooler || typeof s.depth.cooler !== 'object') {
    s.depth.cooler = emptyDepth().cooler
  } else {
    s.depth.cooler.logsSigned = Math.max(0, Math.floor(finite(s.depth.cooler.logsSigned)))
    s.depth.cooler.nextDueAt = Math.max(0, finite(s.depth.cooler.nextDueAt))
    s.depth.cooler.missed = Math.max(0, Math.floor(finite(s.depth.cooler.missed)))
    s.depth.cooler.lastSignedAt = Math.max(0, finite(s.depth.cooler.lastSignedAt ?? 0))
  }
  if (!s.depth.leadsOnBoard || typeof s.depth.leadsOnBoard !== 'object') {
    s.depth.leadsOnBoard = emptyDepth().leadsOnBoard
  } else {
    if (typeof s.depth.leadsOnBoard.fresh !== 'boolean') s.depth.leadsOnBoard.fresh = false
    if (typeof s.depth.leadsOnBoard.cold !== 'boolean') s.depth.leadsOnBoard.cold = false
  }
  if (!s.depth.dispatch || typeof s.depth.dispatch !== 'object') {
    s.depth.dispatch = emptyDepth().dispatch
  } else {
    s.depth.dispatch.cleanManifests = Math.max(0, Math.floor(finite(s.depth.dispatch.cleanManifests)))
    s.depth.dispatch.lastCycleAt = Math.max(0, finite(s.depth.dispatch.lastCycleAt))
    s.depth.dispatch.lastCleanAt = Math.max(0, finite(s.depth.dispatch.lastCleanAt ?? 0))
    s.depth.dispatch.fastFiled = Math.max(0, Math.floor(finite(s.depth.dispatch.fastFiled ?? 0)))
    if (!s.depth.dispatch.laneStances || typeof s.depth.dispatch.laneStances !== 'object') {
      s.depth.dispatch.laneStances = {}
    }
    if (typeof s.depth.dispatch.examLaneId !== 'string') s.depth.dispatch.examLaneId = null
    if (typeof s.depth.dispatch.examMix !== 'string') s.depth.dispatch.examMix = null
    s.depth.dispatch.examUntil = Math.max(0, finite(s.depth.dispatch.examUntil ?? 0))
    s.depth.dispatch.examsHeld = Math.max(0, Math.floor(finite(s.depth.dispatch.examsHeld ?? 0)))
  }
  s.depth.ledgerStamps = Math.max(0, Math.floor(finite(s.depth.ledgerStamps ?? 0)))
  s.depth.lastLedgerDay = Math.floor(finite(s.depth.lastLedgerDay ?? -1))
  s.depth.berthTurnarounds = Math.max(0, Math.floor(finite(s.depth.berthTurnarounds ?? 0)))
  s.depth.manifestsRun = Math.max(0, Math.floor(finite(s.depth.manifestsRun)))
  s.depth.defectionsHandled = Math.max(0, Math.floor(finite(s.depth.defectionsHandled)))
  s.depth.megaMartUntil = Math.max(0, finite(s.depth.megaMartUntil))
  s.depth.rationWeekUntil = Math.max(0, finite(s.depth.rationWeekUntil))
  if (typeof s.depth.orbitMidOnce !== 'boolean') s.depth.orbitMidOnce = false
  if (typeof s.depth.surveyShiftOnce !== 'boolean') s.depth.surveyShiftOnce = false
  s.depth.lastStandardFileAt = Math.max(0, finite(s.depth.lastStandardFileAt))
  if (!s.depth.practice || typeof s.depth.practice !== 'object') {
    s.depth.practice = emptyDepth().practice
  } else {
    for (const layer of ['planogram', 'convoy', 'cross', 'phrase', 'list'] as const) {
      const row = s.depth.practice[layer]
      if (!row || typeof row !== 'object') {
        s.depth.practice[layer] = { left: HORIZON.practicePerLayer, credited: 0 }
      } else {
        row.left = Math.max(0, Math.floor(finite(row.left, HORIZON.practicePerLayer)))
        row.credited = Math.max(0, Math.floor(finite(row.credited)))
      }
    }
  }
  if (!s.depth.hearing || typeof s.depth.hearing !== 'object') {
    s.depth.hearing = emptyDepth().hearing
  } else {
    s.depth.hearing.sessions = Math.max(0, Math.floor(finite(s.depth.hearing.sessions)))
    s.depth.hearing.answered = Math.max(0, Math.floor(finite(s.depth.hearing.answered)))
    s.depth.hearing.needed = s.depth.hearing.needed === 2 ? 2 : 3
    if (s.depth.hearing.pendingClause != null && typeof s.depth.hearing.pendingClause !== 'string') {
      s.depth.hearing.pendingClause = null
    }
  }
  if (s.depth.starsFrozenAt != null) {
    s.depth.starsFrozenAt = Math.max(
      DEPTH.starsMin,
      Math.min(DEPTH.starsMax, finite(s.depth.starsFrozenAt)),
    )
  } else {
    s.depth.starsFrozenAt = null
  }
  if (!s.depth.deptEverStaffed || typeof s.depth.deptEverStaffed !== 'object') s.depth.deptEverStaffed = {}
  if (typeof s.depth.driftLockPlanet !== 'string' && s.depth.driftLockPlanet !== null) {
    s.depth.driftLockPlanet = null
  }
  if (typeof s.depth.stolenBay !== 'number') s.depth.stolenBay = -1
  if (typeof s.depth.stolenBayCircuit !== 'number') s.depth.stolenBayCircuit = -1
  if (typeof s.depth.verdantTrait !== 'string' && s.depth.verdantTrait !== null) s.depth.verdantTrait = null
  if (typeof s.depth.jammedSymbol !== 'string' && s.depth.jammedSymbol !== null) s.depth.jammedSymbol = null
  if (typeof s.depth.hearingAnswered !== 'boolean') s.depth.hearingAnswered = false
  if (typeof s.depth.rationLine !== 'number') s.depth.rationLine = -1
  s.depth.hzRivalAt = Math.max(0, finite(s.depth.hzRivalAt))
  if (s.depth.circular !== null && typeof s.depth.circular !== 'object') s.depth.circular = null
  if (s.depth.rivalLockCat != null && !CATEGORY_IDS.includes(s.depth.rivalLockCat)) {
    s.depth.rivalLockCat = null
  }

  if (!s.cold.plantList) s.cold.plantList = []
  if (!s.cold.offlineList) s.cold.offlineList = []
  if (!s.cold.nextPlantId) s.cold.nextPlantId = Math.max(1, s.cold.plantList.length + 1)
  // Migrate anonymous plant count into compressors once.
  if (s.cold.plants > s.cold.plantList.length) {
    const need = s.cold.plants - s.cold.plantList.length
    for (let i = 0; i < need; i++) {
      s.cold.plantList.push({ id: `p${s.cold.nextPlantId++}`, kind: 'compressor' })
    }
  }
  s.cold.plants = s.cold.plantList.length
  s.cold.offline = s.cold.offlineList.length

  if (!s.politics.bills) s.politics.bills = { hours: false, waste: false, labor: false, tax: false }

  if (!s.fleet.laneList) s.fleet.laneList = []
  if (!s.fleet.franchiseList) s.fleet.franchiseList = []
  if (!s.fleet.bargeList) s.fleet.bargeList = []
  if (!s.fleet.pockets) s.fleet.pockets = []
  if (!Array.isArray(s.fleet.trips)) s.fleet.trips = []
  if (!s.fleet.nextLaneId) s.fleet.nextLaneId = Math.max(1, s.fleet.laneList.length + 1)
  if (!s.fleet.nextFranchiseId) s.fleet.nextFranchiseId = Math.max(1, s.fleet.franchiseList.length + 1)
  if (!s.fleet.nextBargeId) s.fleet.nextBargeId = Math.max(1, s.fleet.bargeList.length + 1)
  if (s.fleet.lastManifestAt == null) s.fleet.lastManifestAt = -1e9
  // Prefer list length as truth, then trim runaway replication / bot spam.
  s.fleet.lanes = Math.max(s.fleet.lanes, s.fleet.laneList.length)
  s.fleet.franchises = Math.max(s.fleet.franchises, s.fleet.franchiseList.length)
  s.fleet.barges = Math.max(s.fleet.barges, s.fleet.bargeList.length)
  trimFleetLists(s)

  return s
}

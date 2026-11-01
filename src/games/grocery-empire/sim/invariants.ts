import { CATEGORY_IDS } from '../content/categories'
import { HOURS, MORALE, PRICE } from './balance'
import { hoursMax } from './formulas'
import { clamp, compact } from './helpers'
import type { Batch, GameState } from './state'

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
  s.price = clamp(finite(s.price, PRICE.min), PRICE.min, PRICE.max)
  s.hours = clamp(finite(s.hours, 1), HOURS.min, hoursMax(s))
  s.morale = clamp(finite(s.morale, 1), MORALE.min, MORALE.max)
  s.speed = [1, 2, 4].includes(s.speed) ? s.speed : 1
  s.era = Math.max(0, Math.floor(finite(s.era)))
  s.ads = Math.max(1, Math.floor(finite(s.ads, 1)))
  s.adCost = Math.max(1, finite(s.adCost, 20))
  s.endcaps = Math.max(0, Math.floor(finite(s.endcaps)))
  s.passbook.balance = Math.max(0, finite(s.passbook.balance))

  s.inspection.meter = clamp(finite(s.inspection.meter), 0, 2)
  s.inspection.penaltyUntil = Math.max(0, finite(s.inspection.penaltyUntil))
  s.inspection.lastInspectorAt = finite(s.inspection.lastInspectorAt, -1e9)

  if (!s.events?.couponWar) {
    s.events = { couponWar: { active: false, endsAt: 0, lastAt: -1e9 } }
  } else {
    s.events.couponWar.active = Boolean(s.events.couponWar.active)
    s.events.couponWar.endsAt = Math.max(0, finite(s.events.couponWar.endsAt))
    s.events.couponWar.lastAt = finite(s.events.couponWar.lastAt, -1e9)
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
  s.compute.nextRepAt = Math.max(1, finite(s.compute.nextRepAt, 3000))
  s.compute.fibA = Math.max(1, Math.floor(finite(s.compute.fibA, 2)))
  s.compute.fibB = Math.max(1, Math.floor(finite(s.compute.fibB, 3)))
  s.compute.scanner = Boolean(s.compute.scanner)
  s.compute.scannerReadyAt = Math.max(0, finite(s.compute.scannerReadyAt))

  s.empire.xp = Math.max(0, finite(s.empire.xp))
  s.empire.level = Math.max(1, Math.floor(finite(s.empire.level, 1)))
  s.empire.points = Math.max(0, Math.floor(finite(s.empire.points)))

  s.wholesale.index = Math.max(0.01, finite(s.wholesale.index, 1))
  s.wholesale.drift = Math.max(0.01, finite(s.wholesale.drift, 1))
  s.wholesale.phase = finite(s.wholesale.phase)
  s.wholesale.idleSec = Math.max(0, finite(s.wholesale.idleSec))

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
  if (!s.board) s.board = { seats: 3, nextMeetingAt: 0, lastResolvedAt: 0 }
  else {
    s.board.seats = Math.max(1, Math.floor(finite(s.board.seats, 3)))
    s.board.nextMeetingAt = Math.max(0, finite(s.board.nextMeetingAt))
    s.board.lastResolvedAt = Math.max(0, finite(s.board.lastResolvedAt))
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

  return s
}

import { HISTORY, OFFLINE_CAP_SEC, OFFLINE_STEP_SEC } from './balance'
import { tickAutoRestock } from './commands'
import { HISTORY_KEEP, type GameState, type OfflineReceipt } from './state'
import { repair } from './invariants'
import {
  tickAging,
  tickDeliveries,
  tickSales,
  tickShrink,
  tickWeather,
  tickWholesale,
} from './systems/market'
import { tickMorale, tickStaffUnpack, tickStaffXp } from './systems/people'
import { tickOffice } from './systems/office'
import { tickFinance } from './systems/finance'
import { tickEvents } from './systems/events'
import { tickGrowth } from './systems/growth'
import { tickRecovery } from './systems/recovery'
import { tickChain } from './systems/chain'
import { tickCapital } from './systems/capital'
import { tickCold } from './systems/cold'
import { tickPolitics } from './systems/politics'
import { tickFleet, tickLogistics } from './systems/fleet'
import { tickEndings } from './systems/endings'
import { tickUnlocks } from './unlocks'

function pushHistory(s: GameState, dt: number) {
  s.history.timer += dt
  if (s.history.timer < HISTORY.everySec) return
  s.history.timer = 0
  const sold = s.stats.sold - s.history.lastSold
  const rev = s.lifetimeRevenue - s.history.lastRevenue
  s.history.lastSold = s.stats.sold
  s.history.lastRevenue = s.lifetimeRevenue
  s.history.cash.push(s.cash)
  s.history.sold.push(sold)
  s.history.revenue.push(rev)
  while (s.history.cash.length > HISTORY_KEEP) s.history.cash.shift()
  while (s.history.sold.length > HISTORY_KEEP) s.history.sold.shift()
  while (s.history.revenue.length > HISTORY_KEEP) s.history.revenue.shift()
}

function updateRates(s: GameState, dt: number) {
  // Exponential-ish window via accumulator drain each second-ish chunk
  const alpha = Math.min(1, dt)
  s.rates.soldPerSec = s.rates.soldPerSec * (1 - alpha) + (s.acc.soldWindow / Math.max(dt, 1e-6)) * alpha
  s.rates.revenuePerSec = s.rates.revenuePerSec * (1 - alpha) + (s.acc.revWindow / Math.max(dt, 1e-6)) * alpha
  s.rates.costPerSec = s.rates.costPerSec * (1 - alpha) + (s.acc.costWindow / Math.max(dt, 1e-6)) * alpha
  s.rates.spoilPerSec = s.rates.spoilPerSec * (1 - alpha) + (s.acc.spoilWindow / Math.max(dt, 1e-6)) * alpha
  s.acc.soldWindow = 0
  s.acc.revWindow = 0
  s.acc.costWindow = 0
  s.acc.spoilWindow = 0
}

/** Advance the sim by dt simulated seconds. Mutates s. */
export function applyTick(s: GameState, dt: number) {
  if (dt <= 0) return s
  if (s.paused) {
    repair(s)
    return s
  }

  const step = dt * (s.speed || 1)
  s.time += step

  tickWholesale(s, step)
  tickWeather(s, step)
  tickDeliveries(s, step)
  tickAging(s, step)
  const { sold, revenue } = tickSales(s, step)
  tickShrink(s, step)
  tickStaffUnpack(s, step)
  tickStaffXp(s, step)
  tickMorale(s, step)
  tickOffice(s, step)
  tickFinance(s, step, revenue)
  tickEvents(s, step)
  tickGrowth(s, step)
  if (s.era >= 2) {
    tickChain(s, step, sold)
    tickCapital(s, step)
  }
  if (s.era >= 3) {
    tickCold(s, step)
    tickPolitics(s, step)
  }
  if (s.era >= 4) tickLogistics(s, step)
  if (s.era >= 5) tickFleet(s, step)
  tickEndings(s, step)
  tickRecovery(s, step)
  tickAutoRestock(s)
  tickUnlocks(s, step)
  updateRates(s, step)
  pushHistory(s, step)
  repair(s)
  return s
}

export function applyOffline(s: GameState, elapsedSec: number): OfflineReceipt {
  const capped = Math.min(Math.max(0, elapsedSec), OFFLINE_CAP_SEC)
  const receipt: OfflineReceipt = {
    seconds: elapsedSec,
    cappedSeconds: capped,
    sold: 0,
    revenue: 0,
    spoiled: 0,
    wages: 0,
    rent: 0,
    attention: 0,
    ventures: 0,
    interest: 0,
  }
  if (capped <= 0) {
    s.offlineReceipt = receipt
    return receipt
  }

  const wasPaused = s.paused
  const wasSpeed = s.speed
  s.paused = false
  s.speed = 1
  const before = {
    sold: s.stats.sold,
    revenue: s.lifetimeRevenue,
    spoiled: s.stats.spoiled,
    wages: s.stats.wagesPaid,
    rent: s.stats.rentPaid,
    attention: s.compute.attention,
    ventures: s.stats.ventureCollected,
    interest: s.stats.interestEarned,
  }

  let left = capped
  while (left > 0) {
    const dt = Math.min(OFFLINE_STEP_SEC, left)
    applyTick(s, dt)
    left -= dt
  }

  receipt.sold = s.stats.sold - before.sold
  receipt.revenue = s.lifetimeRevenue - before.revenue
  receipt.spoiled = s.stats.spoiled - before.spoiled
  receipt.wages = s.stats.wagesPaid - before.wages
  receipt.rent = s.stats.rentPaid - before.rent
  receipt.attention = Math.max(0, s.compute.attention - before.attention)
  receipt.ventures = s.stats.ventureCollected - before.ventures
  receipt.interest = s.stats.interestEarned - before.interest

  s.stats.offlineSec += capped
  s.paused = wasPaused
  s.speed = wasSpeed
  s.offlineReceipt = receipt
  repair(s)
  return receipt
}

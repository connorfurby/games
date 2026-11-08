import { HISTORY, OFFLINE_CAP_SEC, OFFLINE_STEP_SEC } from './balance'
import { tickAutoRestock, tickAutoTournament } from './commands'
import {
  emptyRateAvg,
  HISTORY_KEEP,
  RATE_AVG_KEEP,
  type GameState,
  type OfflineReceipt,
} from './state'
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
  if (!Array.isArray(s.wholesale.history)) s.wholesale.history = []
  s.wholesale.history.push(Number.isFinite(s.wholesale.index) ? s.wholesale.index : 1)
  while (s.wholesale.history.length > HISTORY_KEEP) s.wholesale.history.shift()
  while (s.history.cash.length > HISTORY_KEEP) s.history.cash.shift()
  while (s.history.sold.length > HISTORY_KEEP) s.history.sold.shift()
  while (s.history.revenue.length > HISTORY_KEEP) s.history.revenue.shift()
}

function sumBuf(xs: number[]): number {
  let n = 0
  for (const v of xs) n += v
  return n
}

function pushBucket(buf: number[], value: number) {
  buf.push(value)
  while (buf.length > RATE_AVG_KEEP) buf.shift()
}

/**
 * HUD Sold/Rev/Cost are averages over the last ~45 sim seconds of 1s buckets.
 * Instant tick rates (1 basket in 0.1s → 10/s) never hit the display.
 */
function updateRates(s: GameState, dt: number) {
  if (!s.rateAvg) s.rateAvg = emptyRateAvg()
  const w = s.rateAvg
  w.curSold += s.acc.soldWindow
  w.curRev += s.acc.revWindow
  w.curCost += s.acc.costWindow
  w.curSpoil += s.acc.spoilWindow
  w.t += dt
  s.acc.soldWindow = 0
  s.acc.revWindow = 0
  s.acc.costWindow = 0
  s.acc.spoilWindow = 0

  while (w.t >= 1) {
    w.t -= 1
    // Attribute the whole unfinished second's accumulators into one bucket, then continue.
    // Split proportionally when t was >> 1 (speed-up / offline catch-up chunks).
    pushBucket(w.sold, w.curSold)
    pushBucket(w.rev, w.curRev)
    pushBucket(w.cost, w.curCost)
    pushBucket(w.spoil, w.curSpoil)
    w.curSold = 0
    w.curRev = 0
    w.curCost = 0
    w.curSpoil = 0
  }

  const filled = w.sold.length + w.t
  // Always divide by the full window while warming up so one early basket
  // can't read as 10/s. Once full, filled ≈ RATE_AVG_KEEP.
  const denom = Math.max(RATE_AVG_KEEP, filled)
  // Quantize to 0.01 so HUD strings don't twitch on float noise.
  const q = (n: number) => {
    if (!Number.isFinite(n) || Math.abs(n) < 0.005) return 0
    return Math.round(n * 100) / 100
  }
  s.rates.soldPerSec = q((sumBuf(w.sold) + w.curSold) / denom)
  s.rates.revenuePerSec = q((sumBuf(w.rev) + w.curRev) / denom)
  s.rates.costPerSec = q((sumBuf(w.cost) + w.curCost) / denom)
  s.rates.spoilPerSec = q((sumBuf(w.spoil) + w.curSpoil) / denom)
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
  tickAutoTournament(s)
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

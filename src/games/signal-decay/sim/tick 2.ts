import { AIR, DECAY, DEPTH, OFFLINE_CAP_SEC, OFFLINE_STEP_SEC } from './balance'
import { syncGoals } from '../content/goals'
import { clarity } from './helpers'
import {
  bandMul,
  holdPush,
  logSpeed,
  listenersPerSec,
  relayMul,
  revenuePerSec,
} from './formulas'
import { tickCallers } from './systems/callers'
import { tickDecay } from './systems/decay'
import { tickDial } from './systems/dial'
import { tickRivals } from './systems/rivals'
import type { GameState } from './state'

function refreshRates(s: GameState) {
  s.rates.clarity = clarity(s)
  s.rates.bandMul = bandMul(s)
  s.rates.netMul = relayMul(s)
  s.rates.listenersPerSec = listenersPerSec(s)
  s.rates.revenuePerSec = revenuePerSec(s)
}

function tickAir(s: GameState, dt: number) {
  if (s.air.tuned) {
    const holding = s.air.holding || s.air.lastHoldAt + 1.2 > s.time
    if (holding) {
      s.air.lastHoldAt = s.time
      s.air.logFill = Math.min(1, s.air.logFill + logSpeed(s) * dt)
      // Continuous hold pushes noise down gently (same feel as spam-clicking Hold).
      if (s.air.holding) {
        // Under the clarity floor, Hold works harder so recovery is readable.
        const under = clarity(s) < DECAY.clarityFloor
        const pushMul = under ? 1.35 : 0.55
        s.air.noise = Math.max(0, s.air.noise - holdPush(s) * dt * pushMul)
        s.air.carrier = Math.min(3, s.air.carrier + AIR.carrierLockBonus * dt * (under ? 0.14 : 0.08))
      }
    }
  }
  s.air.focus = Math.min(AIR.focusMax, s.air.focus + AIR.focusRegenPerSec * dt)

  // Dead-air dip: under-floor while airing, or hot air without a recent hold
  const c = clarity(s)
  if (s.air.airingUntil > s.time) {
    const hot = s.air.heat > 1.2 && s.time - s.air.lastHoldAt > 4
    const under = c < DECAY.clarityFloor
    if ((hot || under) && Math.floor(s.time / 20) !== Math.floor((s.time - dt) / 20)) {
      s.depth.deadAirDips += 1
    }
  }

  const rev = revenuePerSec(s) * dt
  if (rev > 0) {
    s.cash += rev
    s.lifetimeRevenue += rev
    s.archive.xp += rev * 0.01
    while (s.archive.xp >= s.archive.level * 50) {
      s.archive.xp -= s.archive.level * 50
      s.archive.level += 1
    }
  }

  // Auto heat-log if board op on dawn/day and ready
  if (
    s.era >= 3 &&
    s.time >= s.depth.heatLogReadyAt &&
    (s.depth.shifts.dawn || s.depth.shifts.day)
  ) {
    if (
      s.time >= s.depth.heatLogReadyAt &&
      Math.floor(s.time / DEPTH.heatLogCooldownSec) !==
        Math.floor((s.time - dt) / DEPTH.heatLogCooldownSec) &&
      s.air.heat > 0.4
    ) {
      s.depth.heatLogs += 1
      s.depth.heatLogReadyAt = s.time + DEPTH.heatLogCooldownSec
      s.air.heat = Math.max(0, s.air.heat - 0.35)
    }
  }

  // Power invoices every few minutes once the Net is open
  if (s.era >= 2) {
    const bucket = Math.floor(s.time / 150)
    const prev = Math.floor((s.time - dt) / 150)
    if (bucket !== prev) {
      const unpaid = s.depth.invoices.filter((i) => !i.paid).length
      if (unpaid < DEPTH.invoiceUnpaidCap) {
        s.depth.invoices.push({
          id: `pwr-${bucket}`,
          amount: 8 + s.antenna * 3 + s.towers.length * 4,
          dueAt: s.time + DEPTH.invoiceDueSec,
          paid: false,
          onTime: false,
        })
      }
    }
  }
}

export function applyTick(s: GameState, dt: number) {
  if (dt <= 0) return
  const steps = dt > 2 ? Math.ceil(dt) : 1
  const step = dt / steps
  for (let i = 0; i < steps; i++) {
    s.time += step
    tickDecay(s, step)
    tickAir(s, step)
    tickCallers(s, step)
    tickRivals(s, step)
    tickDial(s, step)
  }
  refreshRates(s)
  syncGoals(s)
}

export function applyOffline(
  s: GameState,
  elapsedSec: number,
  opts: { showReceipt?: boolean } = {},
) {
  const capped = Math.min(OFFLINE_CAP_SEC, Math.max(0, elapsedSec))
  const clarityBefore = clarity(s)
  let earned = 0
  const cashBefore = s.cash
  for (let t = 0; t < capped; t += OFFLINE_STEP_SEC) {
    applyTick(s, OFFLINE_STEP_SEC)
  }
  earned = s.cash - cashBefore
  if (opts.showReceipt) {
    s.awayReceipt = {
      elapsed: capped,
      lostClarity: Math.max(0, clarityBefore - clarity(s)),
      earned,
    }
    s.overnightNotes.push(
      `Away ${Math.floor(capped / 60)}m — clarity ${clarityBefore.toFixed(2)} → ${clarity(s).toFixed(2)}.`,
    )
  }
}

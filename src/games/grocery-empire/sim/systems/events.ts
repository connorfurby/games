import { RECEIPT_POEMS } from '../../content/poetry'
import { CELEBRITY_ENDCAP, COUPON_WAR, INSPECTION, MORALE } from '../balance'
import { inspectionDecay, inspectionFine, inspectionGainMul, memo, up } from '../formulas'
import { clamp, log } from '../helpers'
import { chance, nextRng } from '../rng'
import type { GameState } from '../state'

export function canCallInspector(s: GameState): string | null {
  if (s.time - s.inspection.lastInspectorAt < INSPECTION.inspectorCooldownSec) {
    return 'Inspector still on the other side of town.'
  }
  if (s.cash < INSPECTION.inspectorCost) return `Need $${INSPECTION.inspectorCost}.`
  return null
}

export function callInspector(s: GameState) {
  s.cash -= INSPECTION.inspectorCost
  s.inspection.lastInspectorAt = s.time
  s.inspection.meter = Math.max(0, s.inspection.meter - INSPECTION.inspectorRelief)
  s.stats.inspectorCalls += 1
  s.stats.inspections += 1
  log(s, 'Inspector visited by appointment. Meter eased.', 'info')
}

export function canOrderPizza(s: GameState): string | null {
  if (!memo(s, 'pizza-friday')) return 'Pizza Friday memo first.'
  if (s.time - s.lastPizzaAt < MORALE.pizzaCooldownSec) return 'Pizza oven is cooling down.'
  if (s.cash < MORALE.pizzaCost) return `Need $${MORALE.pizzaCost}.`
  if (s.staff.length === 0) return 'Nobody to feed.'
  return null
}

export function orderPizza(s: GameState) {
  s.cash -= MORALE.pizzaCost
  s.lastPizzaAt = s.time
  s.pizzaUntil = s.time + 180
  s.morale = Math.min(MORALE.max, s.morale + MORALE.pizzaBoost)
  s.stats.pizzas += 1
  log(s, 'Pizza arrived. Morale climbs.', 'staff')
}

export function matchCouponCost(s: GameState) {
  return Math.max(1, Math.ceil(s.adCost * COUPON_WAR.matchCostFrac))
}

export function canMatchCoupons(s: GameState): string | null {
  if (!s.events?.couponWar?.active) return 'No coupon war running.'
  const cost = matchCouponCost(s)
  if (s.cash < cost) return `Need $${cost}.`
  return null
}

/** End the war early: pay ~half next ad cost, restore demand, mild Brand bump. */
export function matchCoupons(s: GameState) {
  const cost = matchCouponCost(s)
  s.cash -= cost
  endCouponWar(s, true)
  s.brand = clamp(s.brand + COUPON_WAR.brandBoost, 0, 1)
  log(s, `Matched rival coupons (−$${cost}). Demand recovers; Brand holds.`, 'good')
}

function endCouponWar(s: GameState, matched: boolean) {
  const cw = s.events.couponWar
  if (!cw.active) return
  cw.active = false
  cw.endsAt = s.time
  cw.lastAt = s.time
  if (!matched) log(s, 'Rival coupons expire. Shoppers stop comparing circulars.', 'info')
}

function startCouponWar(s: GameState) {
  const cw = s.events.couponWar
  cw.active = true
  cw.endsAt = s.time + COUPON_WAR.durationSec
  cw.lastAt = s.time
  log(s, 'Coupon war! Rival circulars cut demand −8%. Match in Marketing to end early.', 'warn')
}

/** Era 2+ rival banner: ~8–12 min gap, ~90s duration, −8% demand. Never bricks. */
function tickCouponWar(s: GameState, dt: number) {
  if (!s.events?.couponWar) {
    s.events = { couponWar: { active: false, endsAt: 0, lastAt: -1e9 } }
  }
  const cw = s.events.couponWar

  if (cw.active) {
    if (s.time >= cw.endsAt) endCouponWar(s, false)
    return
  }

  if (s.era < 2 || s.ads < 1) return
  if (s.time - cw.lastAt < COUPON_WAR.minGapSec) return
  if (chance(s, COUPON_WAR.startChancePerSec * dt)) startCouponWar(s)
}

/** Inspection meter, fail fine, auto-inspector / auto-pizza, coupon wars. */
export function tickEvents(s: GameState, dt: number) {
  const meter = s.inspection
  meter.meter = Math.max(0, meter.meter - inspectionDecay(s) * dt)

  if (s.morale < INSPECTION.lowMoraleThreshold && s.staff.length > 0) {
    meter.meter += INSPECTION.lowMoralePerSec * inspectionGainMul(s) * dt
  }

  if (meter.meter >= 1) {
    meter.meter = 0
    s.stats.inspections += 1
    s.stats.inspectionsFailed += 1
    const fine = inspectionFine(s)
    const paid = Math.min(s.cash, fine)
    s.cash -= paid
    s.stats.finesPaid += paid
    meter.penaltyUntil = s.time + INSPECTION.penaltySec
    log(
      s,
      `Inspection failed. Fine $${paid.toFixed(2)} (capped). Demand soft for ${INSPECTION.penaltySec}s.`,
      'warn',
    )
  }

  if (up(s, 'auto-inspector') >= 1 && meter.meter >= 0.8 && !canCallInspector(s)) {
    callInspector(s)
  }

  if (up(s, 'auto-pizza') >= 1 && s.morale < 0.85 && !canOrderPizza(s)) {
    orderPizza(s)
  }

  tickCouponWar(s, dt)
  tickCelebrityEndcap(s)
  tickReceiptPoetry(s, dt)
}

/** Celebrity endcap expiry: clear campaign; chance of recoverable Brand nick. */
function tickCelebrityEndcap(s: GameState) {
  if (!s.campaigns) s.campaigns = { celebrityUntil: 0 }
  const until = s.campaigns.celebrityUntil
  if (until <= 0 || s.time < until) return
  s.campaigns.celebrityUntil = 0
  if (chance(s, CELEBRITY_ENDCAP.brandRiskChance)) {
    s.brand = clamp(s.brand - CELEBRITY_ENDCAP.brandHit, 0.05, 1)
    log(s, 'Cameras leave. Gossip nicks Brand — it regenerates.', 'warn')
  } else {
    log(s, 'Celebrity wraps. Demand returns to baseline.', 'info')
  }
}

/** Ideas-gated rare ledger verse — never required, never spends Ideas. */
function tickReceiptPoetry(s: GameState, dt: number) {
  if (!s.compute.ideasUnlocked || s.compute.ideas < 1) return
  if (s.time - (s.acc.lastPoetryAt ?? -1e9) < 240) return
  if (!chance(s, 0.0008 * dt)) return
  const line = RECEIPT_POEMS[Math.floor(nextRng(s) * RECEIPT_POEMS.length) % RECEIPT_POEMS.length]
  s.acc.lastPoetryAt = s.time
  log(s, line, 'story')
}

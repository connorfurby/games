import { poemsForEra } from '../../content/poetry'
import { CELEBRITY_ENDCAP, COUPON_WAR, FRANCHISE_CLONE, INSPECTION, MORALE, RIVAL_EVENTS } from '../balance'
import { inspectionDecay, inspectionFine, inspectionGainMul, memo, up } from '../formulas'
import { clamp, log } from '../helpers'
import { chance, nextRng } from '../rng'
import type { GameState, RivalKind } from '../state'

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
  return Math.max(
    1,
    Math.ceil(s.adCost * COUPON_WAR.matchCostFrac * Math.max(0.5, 1 - up(s, 'campaign-kit') * 0.05)),
  )
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
  s.stats.couponMatches = (s.stats.couponMatches ?? 0) + 1
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

// ── Rival pressure (undercut / poach / smear) ───────────────────────────────

export const RIVAL_COPY: Record<
  RivalKind,
  { name: string; start: string; answer: string; verb: string; end: string }
> = {
  undercut: {
    name: 'Price undercut',
    start: 'Rival undercut: the discount grocer chalked a lower can price. Demand −6%. Answer in Marketing.',
    answer: 'Matched the chalk price on the window. Shoppers stop comparing.',
    verb: 'Match price',
    end: 'Rival undercut fades. The chalk washes off.',
  },
  poach: {
    name: 'Staff poach',
    start: 'Rival poach: a competitor is handing your crew flyers. Morale dips. Answer in Marketing.',
    answer: 'Retention bonus paid. The flyers go in the compost.',
    verb: 'Retention bonus',
    end: 'Poaching flyers dry up. The crew stays.',
  },
  smear: {
    name: 'Health smear',
    start: 'Rival smear: a whisper about the produce bin is going around. Demand −5%. Answer in Marketing.',
    answer: 'Open-door tour done. The produce bin photographs fine; Brand steadies.',
    verb: 'Open the door',
    end: 'Smear fizzles. People remember the bread, not the rumor.',
  },
  raid: {
    name: 'Endcap raid',
    start: 'Rival endcap raid: a competitor rented the display by your door. Demand −4%. Answer in Marketing.',
    answer: 'Rebooked the endcap. The rival display collapses into a cardboard pile.',
    verb: 'Rebook endcap',
    end: 'The rival display comes down. Your endcap reclaims the doorway.',
  },
}

export function rivalAnswerCost(s: GameState) {
  return Math.max(
    2,
    Math.ceil(s.adCost * RIVAL_EVENTS.answerCostFrac * Math.max(0.5, 1 - up(s, 'campaign-kit') * 0.05)),
  )
}

export function rivalActive(s: GameState): RivalKind | null {
  return s.events?.rival?.kind ?? null
}

export function canAnswerRival(s: GameState): string | null {
  if (!rivalActive(s)) return 'No rival pressure right now.'
  const cost = rivalAnswerCost(s)
  if (s.cash < cost) return `Need $${cost}.`
  return null
}

export function answerRival(s: GameState) {
  const kind = rivalActive(s)
  if (!kind) return
  const cost = rivalAnswerCost(s)
  s.cash -= cost
  s.stats.rivalAnswers = (s.stats.rivalAnswers ?? 0) + 1
  endRival(s, true)
  if (kind === 'smear') s.brand = clamp(s.brand + RIVAL_EVENTS.brandBoost, 0, 1)
  if (kind === 'poach') s.morale = Math.min(MORALE.max, s.morale + 0.05)
  log(s, `${RIVAL_COPY[kind].answer} (−$${cost})`, 'good')
}

function endRival(s: GameState, answered: boolean) {
  const r = s.events.rival
  if (!r.kind) return
  const kind = r.kind
  r.kind = null
  r.endsAt = s.time
  r.lastAt = s.time
  if (!answered) log(s, RIVAL_COPY[kind].end, 'info')
}

function startRival(s: GameState) {
  const kinds: RivalKind[] = s.staff.length > 0 ? ['undercut', 'poach', 'smear'] : ['undercut', 'smear']
  // Only raid a door that actually has an endcap to steal — keeps the old roll untouched otherwise.
  if (s.endcaps >= 1) kinds.push('raid')
  const kind = kinds[Math.floor(nextRng(s) * kinds.length) % kinds.length]
  const r = s.events.rival
  r.kind = kind
  r.endsAt = s.time + RIVAL_EVENTS.durationSec
  r.lastAt = s.time
  log(s, RIVAL_COPY[kind].start, 'warn')
}

/** Era 2+: one mild rival move at a time, ~10–14 min apart, never stacked on a coupon war. */
function tickRival(s: GameState, dt: number) {
  if (!s.events.rival) s.events.rival = { kind: null, endsAt: 0, lastAt: -1e9 }
  const r = s.events.rival
  if (r.kind) {
    if (s.time >= r.endsAt) endRival(s, false)
    return
  }
  if (s.era < 2 || s.ads < 1) return
  if (s.events.couponWar?.active) return
  if (s.time - r.lastAt < RIVAL_EVENTS.minGapSec) return
  if (s.time - (s.events.couponWar?.lastAt ?? -1e9) < 120) return
  if (chance(s, RIVAL_EVENTS.startChancePerSec * dt)) startRival(s)
}

/** Era 2+ rival banner: ~8–12 min gap, ~90s duration, −8% demand. Never bricks. */
function tickCouponWar(s: GameState, dt: number) {
  if (!s.events?.couponWar) {
    s.events = {
      couponWar: { active: false, endsAt: 0, lastAt: -1e9 },
      rival: { kind: null, endsAt: 0, lastAt: -1e9 },
    }
  }
  const cw = s.events.couponWar

  if (cw.active) {
    if (s.time >= cw.endsAt) {
      endCouponWar(s, false)
      return
    }
    // War Matcher: answer the rival circular automatically, but never at the cost of a dry till.
    if (up(s, 'war-matcher') >= 1 && s.cash >= matchCouponCost(s) * 2 && !canMatchCoupons(s)) {
      matchCoupons(s)
    }
    return
  }

  if (s.era < 2 || s.ads < 1) return
  if (s.events.rival?.kind) return
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

  const handsOff = up(s, 'hands-off') >= 1
  if (up(s, 'auto-inspector') >= 1 && meter.meter >= (handsOff ? 0.7 : 0.8) && !canCallInspector(s)) {
    callInspector(s)
  }

  if (up(s, 'auto-pizza') >= 1 && s.morale < (handsOff ? 0.9 : 0.85) && !canOrderPizza(s)) {
    orderPizza(s)
  }

  tickCouponWar(s, dt)
  tickRival(s, dt)
  tickCelebrityEndcap(s)
  tickFranchiseClone(s, dt)
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
  const poems = poemsForEra(s.era)
  const line = poems[Math.floor(nextRng(s) * poems.length) % poems.length]?.text
  if (!line) return
  s.acc.lastPoetryAt = s.time
  log(s, line, 'story')
}

/** Era 4+: a lookalike franchise opens nearby. Mild Brand nick that regenerates; never bricks. */
function tickFranchiseClone(s: GameState, dt: number) {
  if (s.era < 4 || s.fleet.franchises <= 0) return
  const last = s.acc.lastCloneAt ?? -1e9
  if (s.time - last < FRANCHISE_CLONE.minGapSec) return
  const p = Math.min(0.2, FRANCHISE_CLONE.chancePerFranchisePerSec * s.fleet.franchises * dt)
  if (!chance(s, p)) return
  s.acc.lastCloneAt = s.time
  s.brand = clamp(s.brand - FRANCHISE_CLONE.brandHit, 0.05, 1)
  log(s, 'A lookalike franchise opens down the road. Brand takes a small nick — it regenerates.', 'warn')
}

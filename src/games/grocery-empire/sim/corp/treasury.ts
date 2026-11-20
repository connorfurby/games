import { upgradeEffect } from '../../content/upgrades'
import { cashLabel } from '@/shared/bn'
import { POLICIES, POLICY_BY_ID } from '../../content/corp/legal'
import { CREDIT, INSURE, WHOLESALE, STAFF_POWER } from '../balance'
import { log } from '../helpers'
import type { GameState } from '../state'
import { crewEffect } from '../staffPower'
import { corpOf, round2, salesRate } from './core'
import { causePerk } from './town'
import { execPower } from './more'

// ── Credit ───────────────────────────────────────────────────────────────

export function creditBand(score: number): string {
  if (score >= 800) return 'Exceptional'
  if (score >= CREDIT.primeAt) return 'Prime'
  if (score >= 670) return 'Good'
  if (score >= 580) return 'Fair'
  if (score >= 450) return 'Poor'
  return 'In trouble'
}

function nudgeCredit(s: GameState, d: number) {
  const c = corpOf(s)
  c.credit = Math.max(CREDIT.min, Math.min(CREDIT.max, c.credit + d))
}

/** Total interest over a bond's term at your score. */
export function bondRate(s: GameState): number {
  const t = (corpOf(s).credit - CREDIT.min) / (CREDIT.max - CREDIT.min)
  return (CREDIT.rateWorst + (CREDIT.rateBest - CREDIT.rateWorst) * t) * (1 - execPower(s, 'cfo')) * (1 - upgradeEffect(s, 'credit-desk')) * (1 - crewEffect(s, 'bookkeeper', STAFF_POWER.bookkeeperBond))
}

export function bondPrincipal(s: GameState, mins: number) {
  return round2(salesRate(s) * 60 * mins)
}

export function issueBond(s: GameState, mins: number) {
  const c = corpOf(s)
  const principal = bondPrincipal(s, mins)
  const interest = round2(principal * bondRate(s))
  c.bonds.push({
    id: c.nextId++,
    principal,
    interest,
    nextCouponAt: s.time + CREDIT.couponEverySec,
    dueAt: s.time + CREDIT.bondTermSec,
    coupons: 0,
  })
  s.cash = round2(s.cash + principal)
  log(s, `Bond issued: ${cashLabel(principal)} now, ${cashLabel(principal + interest)} back over ${CREDIT.bondTermSec / 60} minutes.`, 'good')
}

export function couponOf(b: { interest: number }) {
  return round2(b.interest / (CREDIT.bondTermSec / CREDIT.couponEverySec))
}

export function repayEarly(s: GameState, bondId: number) {
  const c = corpOf(s)
  const b = c.bonds.find((x) => x.id === bondId)
  if (!b) return
  const owe = earlyPayoff(b)
  s.cash = round2(s.cash - owe)
  c.bonds = c.bonds.filter((x) => x.id !== bondId)
  c.bondsRepaid += 1
  nudgeCredit(s, CREDIT.onTimeBonus)
  log(s, `Bond repaid early for ${cashLabel(owe)}. Your credit likes that.`, 'good')
}

/** Paying early: the principal plus the interest still to come, at half. */
export function earlyPayoff(b: { principal: number; interest: number; coupons: number }) {
  const left = b.interest - couponOf(b) * b.coupons
  return round2(b.principal + Math.max(0, left) * 0.5)
}

export function primeCrateMul(s: GameState): number {
  return s.corp && s.corp.credit >= CREDIT.primeAt ? CREDIT.primeCrateMul : 1
}

// ── Insurance ────────────────────────────────────────────────────────────

export function premiumPerMin(s: GameState, id: string): number {
  const p = POLICY_BY_ID[id]
  const pol = corpOf(s).policies[id]
  if (!p) return 0
  return round2(salesRate(s) * p.premiumSec * (1 + (pol?.bump ?? 0)) * (1 - upgradeEffect(s, 'claims-adjuster')))
}

export function insured(s: GameState, id: string): boolean {
  return !!s.corp?.policies[id]
}

/** A claim: pays back a share of a loss and nudges that premium up. Returns what it paid. */
export function insurePays(s: GameState, id: string, loss: number): number {
  if (!insured(s, id) || loss <= 0) return 0
  const c = corpOf(s)
  const pol = c.policies[id]!
  const p = POLICY_BY_ID[id]!
  const pay = round2(loss * p.share)
  s.cash = round2(s.cash + pay)
  c.claimsPaid = round2(c.claimsPaid + pay)
  pol.bump = Math.min(INSURE.bumpCap, pol.bump + INSURE.claimBump)
  return pay
}

export function buyPolicy(s: GameState, id: string) {
  corpOf(s).policies[id] = { bump: 0, since: s.time }
  log(s, `${POLICY_BY_ID[id]?.name} is active. Premiums come out every minute.`, 'info')
}

export function dropPolicy(s: GameState, id: string) {
  delete corpOf(s).policies[id]
}

export { POLICIES }

// ── Tick ─────────────────────────────────────────────────────────────────

export function tickTreasury(s: GameState) {
  const c = corpOf(s)
  // Bonds: coupons and maturities.
  for (const b of [...c.bonds]) {
    if (s.time >= b.nextCouponAt && b.nextCouponAt < b.dueAt) {
      const coupon = couponOf(b)
      if (s.cash >= coupon) {
        s.cash = round2(s.cash - coupon)
        b.coupons += 1
      } else {
        c.missed += 1
        c.arrears = round2(c.arrears + coupon * 1.1)
        nudgeCredit(s, -CREDIT.missedHit)
        log(s, `Missed a bond payment. Credit falls; creditors add it to your arrears.`, 'warn')
      }
      b.nextCouponAt += CREDIT.couponEverySec
    }
    if (s.time >= b.dueAt) {
      const owe = round2(b.principal + Math.max(0, b.interest - couponOf(b) * b.coupons))
      if (s.cash >= owe) {
        s.cash = round2(s.cash - owe)
        c.bondsRepaid += 1
        nudgeCredit(s, CREDIT.onTimeBonus)
        log(s, `Bond repaid in full: ${cashLabel(owe)}.`, 'good')
      } else {
        c.arrears = round2(c.arrears + owe - Math.max(0, s.cash))
        s.cash = 0
        nudgeCredit(s, -CREDIT.defaultHit)
        log(s, `Default! You couldn't repay a bond. Creditors take ${Math.round(CREDIT.garnishShare * 100)}% of sales until it's paid.`, 'warn')
      }
      c.bonds = c.bonds.filter((x) => x.id !== b.id)
    }
  }
  // Arrears are garnished from sales.
  if (c.arrears > 0) {
    const take = Math.min(c.arrears, salesRate(s) * CREDIT.garnishShare, Math.max(0, s.cash))
    s.cash = round2(s.cash - take)
    c.arrears = round2(c.arrears - take)
    if (c.arrears <= 0.01) {
      c.arrears = 0
      log(s, 'Arrears paid off. The creditors leave you alone.', 'good')
    }
  } else if (c.clock % 60 === 0 && c.bonds.length > 0) {
    // Credit builds while you carry debt and pay on time.
    nudgeCredit(s, CREDIT.creepPerMin)
  }
  // Insurance: premiums each minute, ongoing claims each second.
  if (c.clock % 60 === 0) {
    for (const id of Object.keys(c.policies)) {
      const prem = premiumPerMin(s, id)
      if (s.cash >= prem) {
        s.cash = round2(s.cash - prem)
        c.premiumsPaid = round2(c.premiumsPaid + prem)
        const pol = c.policies[id]!
        pol.bump = Math.max(0, pol.bump - INSURE.bumpDecayPerMin)
      } else {
        delete c.policies[id]
        log(s, `${POLICY_BY_ID[id]?.name} lapsed: no cash for the premium.`, 'warn')
      }
    }
  }
  const spoiled = s.stats?.spoiled ?? 0
  if (c.seenSpoiled < 0) c.seenSpoiled = spoiled
  if (spoiled > c.seenSpoiled) {
    const loss = (spoiled - c.seenSpoiled) * WHOLESALE.baseCanCost * (s.wholesale?.index ?? 1)
    if (insured(s, 'spoil')) insurePays(s, 'spoil', loss)
    // The food bank takes what's left and the donation writes some of it back.
    const refund = causePerk(s, 'spoilRefund')
    if (refund > 0) s.cash = round2(s.cash + loss * refund)
  }
  c.seenSpoiled = spoiled
  if (insured(s, 'weather') && s.weather?.now && s.weather.now !== 'fair') {
    // Small, steady: a few percent of sales while the weather is bad (no premium bump).
    const pay = round2(salesRate(s) * (POLICY_BY_ID.weather?.share ?? 0))
    s.cash = round2(s.cash + pay)
    c.claimsPaid = round2(c.claimsPaid + pay)
  }
}

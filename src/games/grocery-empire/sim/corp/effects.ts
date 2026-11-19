import { CAUSES, OFFICE_BY_ID } from '../../content/corp/town'
import { INVENTION_BY_ID } from '../../content/corp/more'
import { OWNER_BY_ID } from '../../content/corp/owners'
import { CO, CREDIT, FRANCHISE, TOWN } from '../balance'
import { salesRate } from './core'
import type { GameState } from '../state'
import { companyBoost, companyBoostExcept, outsideShare, ownerLever, payoutPerSec } from './company'
import { causePerk, goodwillDemand, officeLever, pressReach, segmentDemand, strikeMul, unionLever } from './town'
import { dividendRate, hedgeCrateMul } from './market'
import { rivalStakeDemandMul, rivalStakeTotal } from './rivalry'
import { couponOf, premiumPerMin, primeCrateMul } from './treasury'
import { execPower, execSalary, inventionLever, propertyDemand, rentPerMin } from './more'

/**
 * Every way the company layer touches the store, in one place. Each later system adds its
 * factor here, so the Books page and the tests see one number per lever.
 */
/** Soft cap for the stacked company bonus (see CO.softCap). */
export function softBonus(b: number): number {
  return b > 0 ? b / (1 + b / CO.softCap) : b
}

export function corpDemandMul(s: GameState): number {
  if (!s.corp) return 1
  return (
    (1 + ownerLever(s, 'demand')) *
    companyBoost(s, 'demand') *
    rivalStakeDemandMul(s) *
    (1 +
      softBonus(
        goodwillDemand(s) +
          causePerk(s, 'demand') +
          officeLever(s, 'demand') +
          unionLever(s, 'demand') +
          pressReach(s) +
          segmentDemand(s) +
          inventionLever(s, 'demand') +
          propertyDemand(s) +
          execPower(s, 'cmo'),
      )) *
    strikeMul(s)
  )
}

export function corpWageMul(s: GameState): number {
  if (!s.corp) return 1
  return (
    Math.max(
      0.4,
      1 +
        ownerLever(s, 'wages') +
        causePerk(s, 'wages') +
        officeLever(s, 'wages') +
        unionLever(s, 'wages') +
        inventionLever(s, 'wages') -
        execPower(s, 'coo'),
    ) *
    // Benefits keep the crew loyal: rival poaching stops costing you.
    (s.corp.town.union.benefits > 0 ? companyBoostExcept(s, 'wages', 'poaching') : companyBoost(s, 'wages'))
  )
}

/** Venture till speed from owners and board decisions. */
export function corpVentureMul(s: GameState): number {
  if (!s.corp) return 1
  return (
    (1 + ownerLever(s, 'ventures') + causePerk(s, 'ventures') + officeLever(s, 'ventures') + inventionLever(s, 'ventures')) *
    companyBoost(s, 'ventures')
  )
}

/** How much faster Heat cools (pension-fund owners). */
export function corpHeatCoolMul(s: GameState): number {
  if (!s.corp) return 1
  return Math.max(0.2, 1 + ownerLever(s, 'heatCool') + causePerk(s, 'heat') + officeLever(s, 'heat'))
}

export function corpCrateMul(s: GameState, cat?: string): number {
  if (!s.corp) return 1
  return (
    hedgeCrateMul(s) *
    primeCrateMul(s) *
    (1 + officeLever(s, 'crates') + inventionLever(s, 'crates') - execPower(s, 'coo')) *
    (cat === 'produce' ? 1 - causePerk(s, 'produceCut') : 1)
  )
}

/** Perishables last longer (inventions such as forever lettuce). */
export function corpLifeMul(s: GameState): number {
  if (!s.corp) return 1
  return 1 + inventionLever(s, 'spoil')
}

/** Debug/explain: each additive demand source. */
export function demandParts(s: GameState) {
  return {
    owners: ownerLever(s, 'demand'),
    goodwill: goodwillDemand(s),
    causes: causePerk(s, 'demand'),
    office: officeLever(s, 'demand'),
    union: unionLever(s, 'demand'),
    press: pressReach(s),
    segments: segmentDemand(s),
    inventions: inventionLever(s, 'demand'),
    property: propertyDemand(s),
    cmo: execPower(s, 'cmo'),
    boosts: companyBoost(s, 'demand'),
  }
}

// ── The ledger: every active company effect, with where it comes from ───────

export interface LedgerLine {
  /** Who or what is doing it. */
  source: string
  /** What it does, in plain words. */
  text: string
  good: boolean
  /** Where to go to change it. */
  menu: string
}

const pct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.round(Math.abs(v) * 1000) / 10}%`

export function corpLedger(s: GameState): LedgerLine[] {
  const c = s.corp
  if (!c) return []
  const out: LedgerLine[] = []
  const push = (source: string, text: string, good: boolean, menu: string) => out.push({ source, text, good, menu })
  // Owners and profit share.
  for (const [id, sh] of Object.entries(c.co.owners)) {
    const def = OWNER_BY_ID[id]
    if (!def || sh <= 0) continue
    const k = sh / 1000 / 0.2
    const bits: string[] = []
    for (const [lever, v] of Object.entries(def.levers)) {
      const x = (v ?? 0) * k
      if (lever === 'demand') bits.push(`shoppers ${pct(x)}`)
      if (lever === 'wages') bits.push(`wages ${pct(x)}`)
      if (lever === 'ventures') bits.push(`venture tills ${pct(x)}`)
      if (lever === 'heatCool') bits.push(`Heat cools ${pct(x)} faster`)
      if (lever === 'brandDrift') bits.push('brand slowly slips')
      if (lever === 'quarterTarget') bits.push(x > 0 ? 'tougher quarterly targets' : 'gentler quarterly targets')
    }
    push(`${def.name} (${Math.round(sh / 10)}%)`, bits.join(' · '), !bits.some((b) => b.includes('slips')), 'boardroom')
  }
  const out$ = payoutPerSec(s)
  if (out$ > 0) push('Outside owners', `take ${Math.round(outsideShare(s) * CO.payoutShare * 1000) / 10}% of sales as dividends`, false, 'boardroom')
  // Timed boosts.
  for (const b of c.boosts) {
    if (b.until <= s.time) continue
    const word = b.kind === 'demand' ? 'shoppers' : b.kind === 'wages' ? 'wages' : 'venture tills'
    const good = b.kind === 'wages' ? b.mul < 1 : b.mul > 1
    push(b.label, `${word} ${pct(b.mul - 1)} for ${Math.ceil(b.until - s.time)}s`, good, 'boardroom')
  }
  // Rivals inside your company.
  const rs = rivalStakeTotal(s)
  if (rs > 0) push('Rival stakes in you', `shoppers ${pct(rivalStakeDemandMul(s) - 1)}`, false, 'rivals')
  // Town.
  const gw = goodwillDemand(s)
  if (gw > 0) push('Goodwill', `shoppers ${pct(gw)}`, true, 'foundation')
  for (const x of CAUSES) {
    const lvl = c.town.causes[x.id] ?? 0
    if (lvl >= TOWN.perkAt) push(`${x.name} (L${lvl})`, x.perkText, true, 'foundation')
  }
  for (const [office, h] of Object.entries(c.town.officeHolders)) {
    if (h.until <= s.time) continue
    const cand = OFFICE_BY_ID[office]?.candidates.find((x) => x.id === h.cand)
    if (!cand) continue
    const bits = Object.entries(cand.levers).map(([k, v]) =>
      k === 'heat' ? ((v ?? 0) > 0 ? 'Heat cools faster' : 'Heat cools slower') : `${k === 'demand' ? 'shoppers' : k === 'crates' ? 'crates' : k === 'wages' ? 'wages' : 'venture tills'} ${pct(v ?? 0)}`,
    )
    const good = (cand.levers.demand ?? 0) + (cand.levers.ventures ?? 0) - (cand.levers.crates ?? 0) - (cand.levers.wages ?? 0) >= 0
    push(`${OFFICE_BY_ID[office]?.title} ${cand.name}`, bits.join(' · '), good, 'cityhall')
  }
  const u = c.town.union
  if (u.pay + u.benefits + u.hours > 0) push('Union contract', `shoppers ${pct(unionLever(s, 'demand'))} · wages ${pct(unionLever(s, 'wages'))}`, true, 'union')
  if (u.strikeUntil > s.time) push('Strike', `shoppers ${pct(TOWN.strikeDemand - 1)} for ${Math.ceil(u.strikeUntil - s.time)}s`, false, 'union')
  const pr = pressReach(s)
  if (pr > 0) push(`Your press (${c.town.outlets.length})`, `shoppers ${pct(pr)}`, true, 'press')
  const sg = segmentDemand(s)
  if (c.town.segmentsOn && Math.abs(sg) > 0.0005) push('Customer loyalty', `shoppers ${pct(sg)}`, sg >= 0, 'customers')
  // Lab, property, execs.
  for (const [id, inv] of Object.entries(c.more.lab.invented)) {
    const def = INVENTION_BY_ID[id]
    if (!def) continue
    const share = inv.copied || inv.licensed ? 0.5 : 1
    const v = def.size * share
    const text =
      def.lever === 'spoil'
        ? `food keeps ${Math.round(v * 100)}% longer`
        : `${def.lever === 'demand' ? 'shoppers' : def.lever === 'crates' ? 'crates' : def.lever === 'wages' ? 'wages' : 'venture tills'} ${pct(v)}`
    push(def.name, `${text}${share < 1 ? (inv.licensed ? ' (licensed: half)' : ' (copied: half)') : ''}`, true, 'lab')
  }
  const pd = propertyDemand(s)
  if (Object.keys(c.more.lots).length) push(`Property (${Object.keys(c.more.lots).length} lots)`, `shoppers ${pct(pd)}`, pd >= 0, 'property')
  for (const [role, e] of Object.entries(c.more.execs)) {
    if (!e) continue
    const p = execPower(s, role as never)
    const text =
      role === 'cfo'
        ? `bonds ${Math.round(p * 100)}% cheaper, half trading fees`
        : role === 'cmo'
          ? `shoppers ${pct(p)}`
          : role === 'coo'
            ? `crates and wages ${pct(-p)}`
            : role === 'counsel'
              ? `court odds +${Math.round(p * 100)} points`
              : role === 'research'
                ? `lab ${Math.round(p * 100)}% faster`
                : `${Math.round(p * 100)}% chance to stop a strike`
    push(`${e.name}, ${role.toUpperCase()}`, text, true, 'execs')
  }
  // Money.
  if (hedgeCrateMul(s) < 1) push('Crate-price lock', `crates ${pct(hedgeCrateMul(s) - 1)}`, true, 'market')
  if (primeCrateMul(s) < 1) push('Prime credit', `crates ${pct(primeCrateMul(s) - 1)}`, true, 'treasury')
  if (c.arrears > 0) push('Creditors', `taking ${Math.round(CREDIT.garnishShare * 100)}% of sales until the arrears are paid`, false, 'treasury')
  return out
}

/** The stacked company bonus before and after the soft cap (for the explainer). */
export function softCapInfo(s: GameState) {
  const p = demandParts(s)
  const raw = p.goodwill + p.causes + p.office + p.union + p.press + p.segments + p.inventions + p.property + p.cmo
  return { raw, capped: softBonus(raw) }
}

/** The company's money in and out, per minute, right now. */
export function corpCashFlow(s: GameState): { label: string; perMin: number; menu: string }[] {
  const c = s.corp
  if (!c) return []
  const rows: { label: string; perMin: number; menu: string }[] = []
  const add = (label: string, perMin: number, menu: string) => {
    if (Math.abs(perMin) > 1e-9) rows.push({ label, perMin, menu })
  }
  add('Stock dividends', dividendRate(s), 'market')
  let rent = 0
  for (const id of Object.keys(c.more.lots)) rent += rentPerMin(s, id)
  add('Rent from your lots', rent, 'property')
  let fr = 0
  for (const f of c.more.franchises) fr += salesRate(s) * FRANCHISE.royaltySec * (f.quality / 100) * (f.trait === 'greedy' ? 0.6 : 1)
  add('Franchise royalties', fr, 'franchise')
  let lic = 0
  for (const [id, inv] of Object.entries(c.more.lab.invented)) if (inv.licensed) lic += salesRate(s) * (INVENTION_BY_ID[id]?.royaltySec ?? 0)
  add('Licence royalties', lic, 'lab')
  add('Dividends to outside owners', -payoutPerSec(s) * 60, 'boardroom')
  let sal = 0
  for (const e of Object.values(c.more.execs)) if (e) sal += execSalary(s, e.trait)
  add('Executive salaries', -sal, 'execs')
  let prem = 0
  for (const id of Object.keys(c.policies)) prem += premiumPerMin(s, id)
  add('Insurance premiums', -prem, 'treasury')
  let coupons = 0
  for (const b of c.bonds) coupons += couponOf(b) / (CREDIT.couponEverySec / 60)
  add('Bond coupons (average)', -coupons, 'treasury')
  if (c.arrears > 0) add('Creditors (garnished)', -Math.min(c.arrears, salesRate(s) * CREDIT.garnishShare * 60), 'treasury')
  return rows
}

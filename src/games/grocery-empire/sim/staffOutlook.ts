import { CATEGORIES, CATEGORY_IDS } from '../content/categories'
import { ROLES, isDeptRole, isHorizonRole, type RoleId } from '../content/staff'
import { SHRINK, STAFF_POWER } from './balance'
import {
  agingMul,
  checkoutCap,
  deliveryTime,
  hoursMax,
  lifeMul,
  salesBottleneck,
  shrinkMul,
  staffLevelCap,
  staffSeatCap,
  unitCost,
  unpackPerSec,
  wagesPerSec,
} from './formulas'
import { sumQty } from './helpers'
import { crewEffect, crewStrength } from './staffPower'
import type { GameState, StaffMember } from './state'

/**
 * What one more (or one fewer) of a role would change, measured by running the real
 * formulas on a copy of the state with the crew changed. Read-only: the live state is
 * never touched. Every role answers in the same currency (cash per second) where it can,
 * so the best pick is a comparison, not a guess.
 */

export type OutlookKind = 'rate' | 'pct' | 'sec' | 'count' | 'level'

export interface OutlookLine {
  label: string
  before: number
  after: number
  kind: OutlookKind
  /** True when bigger is better (false for spoil, theft, truck time). */
  up: boolean
}

export interface RoleOutlook {
  role: RoleId
  lines: OutlookLine[]
  /** Net cash per second (gains minus the extra wage). Null when it can't be priced. */
  value: number | null
  /** One plain sentence when the effect isn't in the numbers. */
  note: string | null
}

function withMember(s: GameState, role: RoleId): GameState {
  const fake: StaffMember = { id: -1, role, name: '', level: 1, xp: 0, hiredAt: s.time }
  return { ...s, staff: [...s.staff, fake] }
}

function without(s: GameState, role: RoleId): GameState | null {
  const mine = s.staff.filter((m) => m.role === role)
  if (!mine.length) return null
  // The weakest one goes.
  const weakest = mine.reduce((a, b) => (b.level < a.level ? b : a))
  return { ...s, staff: s.staff.filter((m) => m.id !== weakest.id) }
}

/** Baskets per second the floor actually clears, given its limits. */
export function flowPerSec(s: GameState): number {
  const b = salesBottleneck(s)
  let flow = Math.min(b.demand, b.checkout)
  if (b.kind === 'shelf' || b.kind === 'unpack') flow = Math.min(flow, b.unpack)
  return Math.max(0, flow)
}

function unitRevenue(s: GameState): number {
  return s.rates.soldPerSec > 0.01 ? s.rates.revenuePerSec / s.rates.soldPerSec : s.price
}

function avgUnitCost(s: GameState): number {
  const open = CATEGORY_IDS.filter((c) => s.categories[c])
  if (!open.length) return 0
  return open.reduce((a, c) => a + unitCost(s, c), 0) / open.length
}

function theftPerSec(s: GameState): number {
  return sumQty(s.shelf) * SHRINK.perUnitPerSec * shrinkMul(s)
}

/** How fast fresh food goes off: aging over shelf life, averaged over open fresh aisles. */
function spoilMul(s: GameState): number {
  const fresh = CATEGORY_IDS.filter((c) => s.categories[c] && CATEGORIES[c].life != null)
  if (!fresh.length) return agingMul(s, 'shelf', 'produce')
  return fresh.reduce((a, c) => a + agingMul(s, 'shelf', c) / Math.max(0.01, lifeMul(s, c)), 0) / fresh.length
}

/** Net value (cash/s) of the change from a to b. */
function delta(a: GameState, b: GameState): number {
  const rev = unitRevenue(a)
  const cost = avgUnitCost(a)
  const sales = (flowPerSec(b) - flowPerSec(a)) * rev
  const theft = (theftPerSec(a) - theftPerSec(b)) * cost
  const spoilA = spoilMul(a)
  const spoil = spoilA > 0 ? a.rates.spoilPerSec * (1 - spoilMul(b) / spoilA) * cost : 0
  // Crates bought ≈ what this store sells (the network's sales don't come off this shelf).
  const crates = (avgUnitCost(a) - avgUnitCost(b)) * flowPerSec(a)
  const wages = wagesPerSec(a) - wagesPerSec(b)
  return sales + theft + spoil + crates + wages
}

function line(label: string, before: number, after: number, kind: OutlookKind, up = true): OutlookLine | null {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null
  if (Math.abs(after - before) < Math.max(1e-6, Math.abs(before) * 1e-4)) return null
  return { label, before, after, kind, up }
}

/** Roles whose worth is mostly outside the floor's cash flow: say what they do instead. */
const NOTES: Partial<Record<RoleId, string>> = {
  receiver: 'Trucks arrive sooner, and a receiver on a shift checks deliveries in.',
  night: 'Lets you keep the store open longer (up to 2×).',
  communityRep: 'Every gift to a cause earns more goodwill, goodwill fades slower, and a little comes in on its own.',
  paralegal: 'Better odds at trial and cheaper settlements in the Courthouse.',
  bookkeeper: 'Also cuts the interest on new bonds.',
  hrManager: 'The union brings demands less often.',
  spokesperson: 'Your outlets reach further and crises go better.',
  franchiseScout: 'New franchises open better run and pay a bigger fee.',
  trainer: 'The whole crew levels faster and can climb higher.',
  greeter: 'Crowds become regulars faster.',
}

export function hireOutlook(s: GameState, role: RoleId): RoleOutlook {
  const b = withMember(s, role)
  const lines: (OutlookLine | null)[] = []
  if (isHorizonRole(role) || (isDeptRole(role) && !['produceLead', 'dairyClerk', 'butcher'].includes(role))) {
    return { role, lines: [], value: null, note: ROLES[role].blurb }
  }
  lines.push(line('Unpack', unpackPerSec(s), unpackPerSec(b), 'rate'))
  lines.push(line('Checkout', checkoutCap(s), checkoutCap(b), 'rate'))
  lines.push(line('Sales', flowPerSec(s), flowPerSec(b), 'rate'))
  lines.push(line('Theft', theftPerSec(s), theftPerSec(b), 'pct', false))
  lines.push(line('Spoilage', spoilMul(s), spoilMul(b), 'pct', false))
  lines.push(line('Truck time', deliveryTime(s, s.supplier), deliveryTime(b, s.supplier), 'sec', false))
  lines.push(line('Crate cost', avgUnitCost(s), avgUnitCost(b), 'pct', false))
  lines.push(line('Longest hours', hoursMax(s), hoursMax(b), 'pct'))
  lines.push(line('Top level', staffLevelCap(s), staffLevelCap(b), 'level'))
  lines.push(line('Floor seats', staffSeatCap(s), staffSeatCap(b), 'count'))
  if (role === 'greeter') {
    lines.push(line('Shoppers', 1 + crewEffect(s, 'greeter', STAFF_POWER.greeterDemand), 1 + crewEffect(b, 'greeter', STAFF_POWER.greeterDemand), 'pct'))
  }
  if (role === 'trainer') {
    lines.push(line('Crew XP', 1 + crewStrength(s, 'trainer') * STAFF_POWER.trainerXp, 1 + crewStrength(b, 'trainer') * STAFF_POWER.trainerXp, 'pct'))
  }
  if (role === 'communityRep') {
    lines.push(line('Goodwill per gift', 1 + crewEffect(s, 'communityRep', STAFF_POWER.repGoodwill), 1 + crewEffect(b, 'communityRep', STAFF_POWER.repGoodwill), 'pct'))
  }
  if (role === 'paralegal') {
    lines.push(line('Trial odds', crewEffect(s, 'paralegal', STAFF_POWER.paralegalOdds), crewEffect(b, 'paralegal', STAFF_POWER.paralegalOdds), 'pct'))
  }
  if (role === 'spokesperson') {
    lines.push(line('Press reach', 1 + crewEffect(s, 'spokesperson', STAFF_POWER.spokesReach), 1 + crewEffect(b, 'spokesperson', STAFF_POWER.spokesReach), 'pct'))
  }
  if (role === 'bookkeeper') {
    lines.push(line('Wage bill', 1 - crewEffect(s, 'bookkeeper', STAFF_POWER.bookkeeperWage), 1 - crewEffect(b, 'bookkeeper', STAFF_POWER.bookkeeperWage), 'pct', false))
  }
  const value = PRICED.has(role) ? delta(s, b) : null
  return { role, lines: lines.filter((x): x is OutlookLine => !!x), value, note: NOTES[role] ?? null }
}

/** Roles whose whole effect lands in the floor's cash flow, so a cash value is honest. */
const PRICED = new Set<RoleId>(['clerk', 'stocker', 'cashier', 'security', 'greeter', 'buyer', 'bookkeeper', 'dairyClerk', 'butcher'])

/**
 * Support roles pay off outside the till. Each says when it is worth a seat right now,
 * so it can be the pick when no till role adds anything.
 */
export function supportNeed(s: GameState, role: RoleId): string | null {
  const have = s.staff.some((m) => m.role === role)
  const c = s.corp
  switch (role) {
    case 'receiver':
      return !have && s.era >= 1 ? 'Nobody meets the trucks. A receiver speeds deliveries and can check them in.' : null
    case 'night':
      return !have && !!s.memos['night-latch'] ? 'Nobody can work late, so the store closes early.' : null
    case 'communityRep':
      return !have && (c?.town.donated ?? 0) > 0 ? 'You give to causes. A rep makes each gift count for more.' : null
    case 'paralegal':
      return !have && (c?.suits.length ?? 0) > 0 ? 'You have a case open. A paralegal improves your odds.' : null
    case 'trainer': {
      const cap = staffLevelCap(s)
      const atTop = s.staff.filter((m) => m.level >= cap).length
      return !have && atTop >= 3 ? `${atTop} of your crew are at the top level. A trainer raises it.` : null
    }
    case 'hrManager':
      return !have && !!c?.town.union.formed ? 'The crew has a union. HR keeps demands rare and morale up.' : null
    case 'spokesperson':
      return !have && (c?.town.outlets.length ?? 0) > 0 ? 'You own a paper. A spokesperson makes every story reach further.' : null
    case 'franchiseScout':
      return !have && (c?.more.franchises.length ?? 0) > 0 ? 'You sell franchises. A scout finds better owners.' : null
    case 'produceLead':
      return !have && s.categories.produce ? 'Nobody runs produce, so Fresh rules can’t be set.' : null
    default:
      return null
  }
}

/**
 * With every floor seat taken, the best move is a swap: let the least useful floor
 * member go to make room. Returns the role to drop (the one whose weakest member is
 * worth the least) when the swap is a gain.
 */
export function swapFor(s: GameState, role: RoleId, gain: number): { drop: RoleId; net: number } | null {
  if (isHorizonRole(role) || isDeptRole(role)) return null
  let best: { drop: RoleId; net: number } | null = null
  const seen = new Set<RoleId>()
  for (const m of s.staff) {
    if (seen.has(m.role) || m.role === role || isHorizonRole(m.role) || isDeptRole(m.role) || m.role === 'shiftLead') continue
    seen.add(m.role)
    const keep = keepValue(s, m.role)
    if (keep == null) continue
    const net = gain - Math.max(0, keep)
    if (net > 0 && (!best || net > best.net)) best = { drop: m.role, net }
  }
  return best
}

/** Below this a change is noise: 0.01% of revenue (anything at all early on). */
export function worthFloor(s: GameState): number {
  return Math.max(0.0005, s.rates.revenuePerSec * 0.0001)
}

export interface HirePick {
  role: RoleId
  value: number | null
  why: string
}

/** The single best hire right now: biggest cash gain, else the most needed support role. */
export function pickHire(s: GameState, roles: RoleId[]): HirePick | null {
  const priced = bestHire(s, roles)
  const floor = worthFloor(s)
  if (priced && priced.value >= floor) return { role: priced.role, value: priced.value, why: 'Adds the most to sales right now.' }
  for (const r of roles) {
    const why = supportNeed(s, r)
    if (why) return { role: r, value: null, why }
  }
  return null
}

/** What the store would lose without the weakest member of a role (cash/s, wages saved included). */
export function keepValue(s: GameState, role: RoleId): number | null {
  if (isHorizonRole(role) || isDeptRole(role)) return null
  const b = without(s, role)
  if (!b) return null
  return -delta(s, b)
}

/** Hireable floor-seat roles ranked by net value. Roles with no priced effect come last. */
export function bestHire(s: GameState, roles: RoleId[]): { role: RoleId; value: number } | null {
  let best: { role: RoleId; value: number } | null = null
  for (const r of roles) {
    const v = hireOutlook(s, r).value
    if (v == null || v <= 0) continue
    if (!best || v > best.value) best = { role: r, value: v }
  }
  return best
}

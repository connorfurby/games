import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../content/categories'
import { ROLES, type RoleId } from '../content/staff'
import { UPGRADE_BY_ID, upgradeCost } from '../content/upgrades'
import {
  BACKROOM,
  CHECKOUT,
  COMPUTE,
  CELEBRITY_ENDCAP,
  COUPON_WAR,
  DEMAND,
  ENDCAP,
  EMPIRE,
  HOURS,
  HUNGRY_LAWS,
  INSPECTION,
  LOYALTY,
  MORALE,
  PASSBOOK,
  SHELF,
  SHRINK,
  SPOIL,
  STAFF_XP,
  UNPACK,
  WHOLESALE,
} from './balance'
import type { GameState, PrestigeMutatorId, SupplierId, WeatherId } from './state'
import { chainDemandMul, chainRevenueMul, chainShrinkMul } from './systems/chain'

export function hasMutator(s: GameState, id: PrestigeMutatorId) {
  return (s.prestigeCarry?.mutators ?? []).includes(id)
}

/** Demand elasticity — weirdElasticity swaps in a mild alternate curve. */
export function demandElasticity(s: GameState) {
  return hasMutator(s, 'weirdElasticity') ? HUNGRY_LAWS.weirdElasticity : DEMAND.elasticity
}

/** Multiplier applied when bumping adCost after a buy. */
export function adCostGrowth(s: GameState) {
  return hasMutator(s, 'expensiveAds') ? HUNGRY_LAWS.expensiveAdsGrowth : 2
}

export const up = (s: GameState, id: string) => s.upgrades[id] ?? 0
export const perk = (s: GameState, id: string) => s.empire.perks[id] ?? 0
export const memo = (s: GameState, id: string) => (s.memos[id] ?? 0) > 0

export function roleCount(s: GameState, role: RoleId) {
  let n = 0
  for (const m of s.staff) if (m.role === role) n++
  return n
}

/** Sum of (1 + levelBonus*(level-1)) across a role — a level-5 clerk is worth 1.2 clerks. */
function roleStrength(s: GameState, role: RoleId) {
  let n = 0
  for (const m of s.staff) if (m.role === role) n += 1 + UNPACK.levelBonus * (m.level - 1)
  return n
}

// ── Capacity ────────────────────────────────────────────────────────────────

export function shelfCap(s: GameState) {
  const front = s.builds.storefront ?? 1
  let cap = SHELF.baseCap + up(s, 'shelf-depth') * 10
  if (front >= 2) cap += 20
  if (front >= 3) cap += 60
  if (front >= 4) cap += 200
  if (s.expansions['side-yard']) cap += 30
  return cap
}

export function backroomCap(s: GameState) {
  const st = s.builds.storage ?? 1
  let cap = BACKROOM.baseCap + up(s, 'racks') * BACKROOM.perRackLevel
  if (st >= 2) cap += 60
  if (st >= 3) cap += 400
  if (s.expansions['side-yard']) cap += 40
  if (memo(s, 'dock-plate')) cap += 20
  return cap
}

// ── Wholesale ───────────────────────────────────────────────────────────────

export function crateSize(s: GameState) {
  let n = WHOLESALE.spoolUnits + up(s, 'crate-size') * 4
  if (memo(s, 'hand-truck')) n += 12
  if ((s.builds.transit ?? 0) >= 2) n += 12
  return n
}

export function wholesaleMul(s: GameState) {
  return Math.max(0.5, 1 - up(s, 'wholesale-discount') * 0.02) * (memo(s, 'buying-club') ? 0.9 : 1)
}

export function unitCost(s: GameState, cat: CategoryId, supplier: SupplierId = s.supplier) {
  const base = WHOLESALE.baseCanCost * s.wholesale.index * CATEGORIES[cat].costMul * wholesaleMul(s)
  return supplier === 'b' ? base * WHOLESALE.supplierB.discount : base
}

export function crateCost(s: GameState, cat: CategoryId, supplier: SupplierId = s.supplier) {
  return Math.round(unitCost(s, cat, supplier) * crateSize(s) * 100) / 100
}

export function cheapestCrate(s: GameState) {
  let best = Infinity
  for (const c of CATEGORY_IDS) if (s.categories[c]) best = Math.min(best, crateCost(s, c, 'a'))
  return best
}

export function deliveryTime(s: GameState, supplier: SupplierId) {
  let t = supplier === 'b' ? WHOLESALE.supplierB.delaySec : 4
  t *= 1 - up(s, 'delivery-speed') * 0.1
  const transit = s.builds.transit ?? 0
  if (transit >= 2) t *= 0.5
  else if (transit >= 1) t *= 0.75
  if (memo(s, 'dock-plate')) t *= 0.6
  return Math.max(1, t)
}

export function shortShipChance(s: GameState) {
  return (
    WHOLESALE.supplierB.shortShipChance * (1 - up(s, 'supplier-terms') * 0.2) * (1 - perk(s, 'lucky-trucks') * 0.1)
  )
}

// ── Demand ──────────────────────────────────────────────────────────────────

export function adMul(s: GameState) {
  const per = DEMAND.adMultPerLevel + up(s, 'ad-eff') * 0.005 + (memo(s, 'weekly-circular') ? 0.04 : 0)
  return Math.pow(per, s.ads - 1)
}

export function weatherDemand(s: GameState, w: WeatherId = s.weather.now) {
  const amp = 1 + up(s, 'weather-read') * 0.2
  const rainPlan = memo(s, 'rain-plan') ? 2 : 1
  if (w === 'rain') return 1 + 0.12 * amp * rainPlan
  if (w === 'heat') return 1 + 0.06 * amp
  if (w === 'cold') return 0.92
  return 1
}

/** Heat mainly wilts produce; other perishables stay near normal. Cold slows all spoil. */
export function weatherSpoil(s: GameState, w: WeatherId = s.weather.now, cat?: CategoryId) {
  if (w === 'heat') {
    if (cat && cat !== 'produce') return 1
    const heat = memo(s, 'rain-plan') ? 1 + (SPOIL.heatMul - 1) / 2 : SPOIL.heatMul
    return heat
  }
  if (w === 'cold') return SPOIL.coldSnapMul
  return 1
}

/** Forecast line once the weather-radio (or legacy barometer) memo is owned. */
export function hasWeatherForecast(s: GameState) {
  return memo(s, 'weather-radio') || memo(s, 'barometer')
}

export function hoursMax(s: GameState) {
  return roleCount(s, 'night') > 0 ? HOURS.nightMax : HOURS.max
}

/** Hours beyond 1.0 are night hours; they pull less unless night clerks are on. */
export function hoursDemand(s: GameState) {
  const h = s.hours
  if (h <= 1) return h
  const nightEff = Math.min(1, HOURS.nightEfficiency + up(s, 'night-bonus') * 0.05 + roleStrength(s, 'night') * 0.05)
  const dayPart = Math.min(h, HOURS.max) - 1
  const nightPart = Math.max(0, h - HOURS.max)
  return 1 + dayPart * 0.8 + nightPart * nightEff
}

export function reputationMul(s: GameState) {
  return 1 + s.compute.repEarned * DEMAND.reputationBonusPerPoint * (s.compute.unlocked ? 1 : 0)
}

export function storefrontMul(s: GameState) {
  const f = s.builds.storefront ?? 1
  return [1, 1, 1.15, 1.25, 1.4, 1.6, 1.8, 2][f] ?? 1
}

export function civicMul(s: GameState) {
  const c = s.builds.civic ?? 0
  return [1, 1.08, 1.15][Math.min(c, 2)] ?? 1.15
}

export function loyaltyMul(s: GameState) {
  return 1 + (LOYALTY.bonusByTier[s.loyalty.tier] ?? 0) * (1 + up(s, 'loyalty-earn') * 0.1)
}

export function memoDemandMul(s: GameState) {
  let m = 1
  if (memo(s, 'chalkboard')) m *= 1.1
  if (memo(s, 'radio-spot')) m *= 1.15
  if (memo(s, 'slogan')) m *= 1.1
  if (memo(s, 'planogram')) m *= 1.25
  if (memo(s, 'window-lettering')) m *= 1.08
  return m
}

/** Every multiplier except price, broken out for the Books explainer. */
export function demandBreakdown(s: GameState) {
  const parts = {
    ads: adMul(s),
    reputation: reputationMul(s),
    hours: hoursDemand(s),
    weather: weatherDemand(s),
    storefront: storefrontMul(s),
    civic: civicMul(s),
    loyalty: loyaltyMul(s),
    memos: memoDemandMul(s),
    upgrades: (1 + up(s, 'curb-appeal') * 0.03) * (1 + perk(s, 'window-display') * 0.01),
    endcaps: 1 + s.endcaps * (ENDCAP.demandEach + up(s, 'endcap-design') * 0.01),
    inspection: s.time < s.inspection.penaltyUntil ? INSPECTION.demandPenalty : 1,
    /** Rival coupon war (Era 2+): mild −8% while active. */
    couponWar: s.events?.couponWar?.active ? COUPON_WAR.demandMul : 1,
    /** Celebrity endcap (Era 2+ Ideas sink): +25% while active. */
    celebrity:
      (s.campaigns?.celebrityUntil ?? 0) > s.time ? CELEBRITY_ENDCAP.demandMul : 1,
    morale: 0.9 + 0.1 * Math.min(1, s.morale),
  }
  let total = 1
  for (const v of Object.values(parts)) total *= v
  return { parts, total }
}

export function priceFactor(s: GameState, price = s.price) {
  return Math.pow(DEMAND.refPrice / Math.max(0.01, price), demandElasticity(s))
}

export function basketUnits(s: GameState) {
  return 1 + up(s, 'basket-size') * 0.05
}

/** Units per second shoppers want across every unlocked category. */
export function demandPerSec(s: GameState, price = s.price) {
  return (
    DEMAND.baseShoppersPerSec *
    priceFactor(s, price) *
    demandBreakdown(s).total *
    basketUnits(s) *
    chainDemandMul(s)
  )
}

export function categoryWeights(s: GameState): Partial<Record<CategoryId, number>> {
  const w: Partial<Record<CategoryId, number>> = {}
  let total = 0
  const wx = s.weather.now
  for (const c of CATEGORY_IDS) {
    if (!s.categories[c]) continue
    let weight = CATEGORIES[c].weight
    // Rain: mild comfort-food (cans) pull. Heat: mild dairy/drink pull.
    if (wx === 'rain' && c === 'cans') weight *= 1.22
    if (wx === 'heat' && c === 'dairy') weight *= 1.18
    w[c] = weight
    total += weight
  }
  for (const c of CATEGORY_IDS) if (w[c] !== undefined) w[c] = w[c]! / total
  return w
}

/**
 * Player restock preference (0..1 mix) × category interest.
 * Used by unpack / auto-order so Floor & Backroom mix sliders matter.
 */
export function restockWeight(s: GameState, cat: CategoryId): number {
  if (!s.categories[cat]) return 0
  const mix = Math.max(0, Math.min(1, s.mix[cat] ?? 0.5))
  return CATEGORIES[cat].weight * (0.08 + mix * 0.92)
}

/** Normalized restock targets across unlocked categories (sums to 1 when any unlocked). */
export function restockTargets(s: GameState): Partial<Record<CategoryId, number>> {
  const w: Partial<Record<CategoryId, number>> = {}
  let total = 0
  for (const c of CATEGORY_IDS) {
    const rw = restockWeight(s, c)
    if (rw <= 0) continue
    w[c] = rw
    total += rw
  }
  if (total <= 0) return w
  for (const c of CATEGORY_IDS) if (w[c] !== undefined) w[c] = w[c]! / total
  return w
}

/**
 * Category variety adds demand (more reasons to stop in) but each extra category
 * shares the same shopper pool. Net effect: +12% demand per extra category.
 */
export function varietyMul(s: GameState) {
  let n = 0
  for (const c of CATEGORY_IDS) if (s.categories[c]) n++
  return 1 + Math.max(0, n - 1) * 0.12
}

export function checkoutCap(s: GameState) {
  const cashiers = roleStrength(s, 'cashier')
  let cap = CHECKOUT.basePerSec + cashiers * CHECKOUT.perCashier
  if (memo(s, 'express-lane')) cap *= CHECKOUT.expressLaneMul
  return cap * Math.min(1, s.morale + 0.1)
}

export function revenueMul(s: GameState) {
  return (1 + perk(s, 'tip-jar') * 0.01) * chainRevenueMul(s)
}

/** Profit-maximizing price at today's cost for the Price IQ tip. */
export function bestPrice(s: GameState) {
  const e = demandElasticity(s)
  return (unitCost(s, 'cans', s.supplier) * e) / (e - 1)
}

// ── Staff ───────────────────────────────────────────────────────────────────

export function hireCost(s: GameState, role: RoleId) {
  const def = ROLES[role]
  const n = roleCount(s, role)
  return Math.ceil(def.hireBase * Math.pow(def.hireGrowth, n) * (1 - up(s, 'hiring-fair') * 0.05))
}

export function wagesPerSec(s: GameState) {
  let w = 0
  for (const m of s.staff) w += ROLES[m.role].wagePerMin * (1 + (m.level - 1) * 0.04)
  const hoursMul = Math.max(0.5, s.hours)
  return (w / 60) * hoursMul * Math.max(0.6, 1 - up(s, 'wage-eff') * 0.04)
}

export function staffLevelCap(s: GameState) {
  return Math.min(20, 3 + Math.floor(s.empire.level / 2) + up(s, 'training'))
}

export function xpToLevel(level: number) {
  return STAFF_XP.perLevel * level
}

export function unpackPerSec(s: GameState) {
  let r = roleStrength(s, 'clerk') * UNPACK.clerkPerSec + roleStrength(s, 'stocker') * UNPACK.stockerPerSec
  r *= 1 + up(s, 'clerk-throughput') * 0.08
  if (memo(s, 'pallet-jack')) r *= 1.25
  if (memo(s, 'pallet-chain')) r *= 1.5
  return r * s.morale * Math.min(1.25, Math.max(0.5, s.hours))
}

export function manualUnpackAmount(s: GameState) {
  return 1 + up(s, 'quick-hands') + perk(s, 'quick-unpack') + (memo(s, 'box-cutter') ? 1 : 0)
}

export function moraleTarget(s: GameState) {
  let t = 1 + perk(s, 'calm-staff') * 0.02
  if (s.hours > HOURS.longThreshold) t -= (s.hours - HOURS.longThreshold) * (1 - MORALE.longHoursPenalty) * 1.5
  const sec = roleCount(s, 'security')
  if (sec > 2) t -= (sec - 2) * MORALE.securityCrowding
  if (memo(s, 'staff-room')) t += 0.05
  if (s.time < s.pizzaUntil) t += MORALE.pizzaBoost
  return Math.min(MORALE.max, Math.max(MORALE.min, t))
}

// ── Spoil / shrink / inspection ─────────────────────────────────────────────

export function lifeMul(s: GameState, cat: CategoryId) {
  let m = 1
  const cold = s.builds.cold ?? 0
  if (cold >= 2) m *= 1.6
  else if (cold >= 1) m *= 1.25
  if (cat === 'produce' && memo(s, 'misting-bar')) m *= 1.4
  return m
}

export function agingMul(s: GameState, where: 'shelf' | 'backroom', cat?: CategoryId) {
  let m = weatherSpoil(s, s.weather.now, cat) * (1 - perk(s, 'slow-spoil') * 0.03)
  const stockers = Math.min(SPOIL.maxStockers, roleCount(s, 'stocker'))
  m *= Math.pow(SPOIL.stockerMul, stockers)
  if (where === 'backroom') {
    m *= SPOIL.backroomAgeMul
    if ((s.builds.storage ?? 1) >= 2) m *= 0.9
  }
  if (hasMutator(s, 'fasterSpoil')) m *= HUNGRY_LAWS.fasterSpoilMul
  return m
}

export function shrinkMul(s: GameState) {
  const sec = roleStrength(s, 'security')
  const cash = roleCount(s, 'cashier')
  let m = Math.max(SHRINK.floor, 1 - sec * SHRINK.securityCut - cash * SHRINK.cashierCut)
  if (memo(s, 'security-mirror')) m *= SHRINK.mirrorMul
  m *= 1 - up(s, 'shrink-sense') * SHRINK.senseCutPerLevel
  const pricePerception = Math.pow(Math.max(0.5, s.price / DEMAND.refPrice), 0.3)
  return m * pricePerception * chainShrinkMul(s)
}

export function inspectionGainMul(s: GameState) {
  return memo(s, 'inspector-prep') ? INSPECTION.prepMul : 1
}

export function inspectionDecay(s: GameState) {
  return INSPECTION.decayPerSec * (memo(s, 'clipboard-rounds') ? 2 : 1)
}

export function inspectionFine(s: GameState) {
  const raw = Math.min(s.cash * INSPECTION.fineCashFrac, INSPECTION.fineFlat * Math.pow(3, s.era))
  return Math.max(0, raw * (1 - up(s, 'inspection-cushion') * 0.1))
}

// ── Fixed costs ─────────────────────────────────────────────────────────────

export function rentPerSec(s: GameState) {
  let perMin = 0.3
  if (s.era >= 1) perMin = 0.8
  if (s.expansions['side-yard']) perMin += 0.5
  return perMin / 60
}

export function upkeepPerSec(s: GameState, tracks: { id: string; tiers: { upkeepPerMin: number }[] }[]) {
  let perMin = 0
  for (const t of tracks) {
    const lvl = s.builds[t.id] ?? 0
    perMin += t.tiers[lvl]?.upkeepPerMin ?? 0
  }
  perMin += s.endcaps * 0.1
  return perMin / 60
}

export function arrearsCap(s: GameState, recoveryCapSec: number) {
  return (rentPerSec(s) + wagesPerSec(s)) * recoveryCapSec * (1 + up(s, 'arrears-grace') * 0.2) + 5
}

export function passbookRate(s: GameState) {
  return PASSBOOK.ratePerSec * (1 + up(s, 'passbook-rate') * PASSBOOK.rateBonusPerLevel)
}

// ── Compute ─────────────────────────────────────────────────────────────────

export function attentionCap(s: GameState) {
  return s.compute.archives * COMPUTE.capPerArchive
}

export function attentionPerSec(s: GameState) {
  return s.compute.analysts * COMPUTE.attentionPerAnalyst * (memo(s, 'ledger-tape') ? 1.1 : 1)
}

export function ideasPerSec(s: GameState) {
  return COMPUTE.ideasBase * Math.pow(s.compute.analysts, COMPUTE.ideasExp)
}

export function nextUpgradeCost(s: GameState, id: string) {
  const def = UPGRADE_BY_ID[id]
  return upgradeCost(def, up(s, id))
}

/** Sum of geometric upgrade costs for the next `count` levels from current. */
export function upgradeBulkCost(s: GameState, id: string, count: number) {
  const def = UPGRADE_BY_ID[id]
  if (!def || count <= 0) return 0
  const lvl = up(s, id)
  const n = Math.min(Math.floor(count), Math.max(0, def.max - lvl))
  let total = 0
  for (let i = 0; i < n; i++) total += upgradeCost(def, lvl + i)
  return total
}

/** How many levels the player can afford right now (capped by remaining + optional hard cap). */
export function maxAffordableUpgrades(s: GameState, id: string, hardCap = 50) {
  const def = UPGRADE_BY_ID[id]
  if (!def) return 0
  const lvl = up(s, id)
  const room = Math.min(hardCap, Math.max(0, def.max - lvl))
  let cash = s.cash
  let bought = 0
  for (let i = 0; i < room; i++) {
    const cost = upgradeCost(def, lvl + i)
    if (cash < cost) break
    cash -= cost
    bought += 1
  }
  return bought
}

export function empireXpToNext(level: number) {
  return Math.floor(EMPIRE.levelBase * Math.pow(EMPIRE.levelGrowth, level - 1))
}

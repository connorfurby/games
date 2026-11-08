import { valueMul } from './systems/network'
import { rivalDemandMul } from './systems/rivals'
import { statCut, statMul } from './systems/stats'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../content/categories'
import { ROLES, STAFF_TRAITS, type RoleId, type StaffTraitId } from '../content/staff'
import {
  UPGRADE_BY_ID,
  upgradeCostWithToll,
  upgradeCurveAt,
  upgradeEffect,
  upgradeSynergy,
  bandRankUnlocked,
  type UpgradeDef,
} from '../content/upgrades'
import {
  BACKROOM,
  CAPITAL,
  CHAIN,
  CHECKOUT,
  COMPUTE,
  CELEBRITY_ENDCAP,
  COLD,
  COUPON_WAR,
  DEMAND,
  DOCTRINE_EFFECTS,
  ENDCAP,
  EMPIRE,
  FLEET,
  HOURS,
  HUNGRY_LAWS,
  INSPECTION,
  INVEST,
  LOYALTY,
  MARKETING,
  MORALE,
  PASSBOOK,
  PRICE,
  RECOVERY,
  RIVAL_EVENTS,
  SHELF,
  SHRINK,
  SPOIL,
  STAFF_SEATS,
  STAFF_XP,
  UNPACK,
  STANDING_ORDERS,
  VARIETY,
  VENTURE_TRAFFIC,
  WHOLESALE,
  WORD_OF_MOUTH,
} from './balance'
import type {
  GameState,
  MarketingPosture,
  PrestigeMutatorId,
  SalesBottleneck,
  SupplierId,
  WeatherId,
} from './state'
import { chainCheckoutBonus, chainDemandMul, chainRevenueMul, chainShrinkMul } from './systems/chain'
import { clamp, sumQty } from './helpers'

export function hasMutator(s: GameState, id: PrestigeMutatorId) {
  return (s.prestigeCarry?.mutators ?? []).includes(id)
}

/** Demand elasticity — weirdElasticity / Everyday Low doctrine softens the curve. */
export function demandElasticity(s: GameState) {
  let e = hasMutator(s, 'weirdElasticity') ? HUNGRY_LAWS.weirdElasticity : DEMAND.elasticity
  if ((s.doctrines['edlp'] ?? 0) > 0) e *= DOCTRINE_EFFECTS.edlpElasticityMul
  return e
}

/** Multiplier applied when bumping adCost after a buy. */
export function adCostGrowth(s: GameState) {
  let g = hasMutator(s, 'expensiveAds') ? HUNGRY_LAWS.expensiveAdsGrowth : 2
  // Coupon Math: slower cost climb.
  g *= Math.max(0.75, 1 - up(s, 'coupon-math') * 0.04)
  return g
}

export function hasDoctrine(s: GameState, id: string) {
  return (s.doctrines[id] ?? 0) > 0
}

export function marketingPosture(s: GameState): MarketingPosture {
  return s.marketingPosture ?? 'neighborhood'
}

export function marketingDemandMul(s: GameState) {
  const p = MARKETING.postures[marketingPosture(s)]
  let m = p.demandMul
  if (marketingPosture(s) === 'circular' && hasDoctrine(s, 'loss-leader')) {
    m += MARKETING.lossLeaderCircularBonus
  }
  return m
}

export function marketingRevenueMul(s: GameState) {
  const p = MARKETING.postures[marketingPosture(s)]
  let m = p.revenueMul
  if (marketingPosture(s) === 'circular') m += up(s, 'circular-truth') * 0.01
  if (hasDoctrine(s, 'premium-bodega')) m += MARKETING.premiumBodegaRevenueBonus * 0.25
  return m
}

export const up = (s: GameState, id: string) => s.upgrades[id] ?? 0
export const perk = (s: GameState, id: string) => s.empire.perks[id] ?? 0
export const memo = (s: GameState, id: string) => (s.memos[id] ?? 0) > 0
export const memoRank = (s: GameState, id: string) => s.memos[id] ?? 0

/**
 * Synergy product for a cash node — each doctrine multiplies by mul^points,
 * capped at UPGRADE_RANKS.synergyCap.
 */
export function upgradeSynergyMul(s: GameState, def: UpgradeDef): number {
  return upgradeSynergy(s, def)
}

/**
 * Curve magnitude formulas should multiply by.
 * Untouched linear nodes without effectCap return raw ranks (same as up()).
 */
export function upgradeMagnitude(s: GameState, id: string): number {
  return upgradeEffect(s, id)
}

/** Preview magnitude at an arbitrary level (includes current synergy). */
export function upgradeMagnitudeAt(s: GameState, id: string, level: number): number {
  const def = UPGRADE_BY_ID[id]
  if (!def || level <= 0) return 0
  return upgradeCurveAt(def, level) * upgradeSynergyMul(s, def)
}

/** Standing-order memo diminishing magnitude (0..cap). */
export function standingOrderMagnitude(s: GameState, id: string, cap: number, k = STANDING_ORDERS.diminishK) {
  const lvl = memoRank(s, id)
  if (lvl <= 0) return 0
  return cap * (1 - 1 / (1 + lvl * k))
}

export function roleCount(s: GameState, role: RoleId) {
  let n = 0
  for (const m of s.staff) if (m.role === role) n++
  return n
}

function traitStrength(id: StaffTraitId | undefined) {
  return id && STAFF_TRAITS[id] ? STAFF_TRAITS[id].strengthMul : 1
}

function traitWage(id: StaffTraitId | undefined) {
  return id && STAFF_TRAITS[id] ? STAFF_TRAITS[id].wageMul : 1
}

/** Sum of (1 + levelBonus*(level-1)) across a role — a level-5 clerk is worth 1.2 clerks. Traits nudge ±5%. */
function roleStrength(s: GameState, role: RoleId) {
  let n = 0
  for (const m of s.staff) {
    if (m.role === role) n += (1 + UNPACK.levelBonus * (m.level - 1)) * traitStrength(m.traitId)
  }
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
  // One Perfect Aisle: shelf growth from nesting stops; Wall of Cans adds asymptotic capacity.
  const nest = up(s, 'one-perfect-aisle') > 0 ? 0 : up(s, 'basket-nesting') * 0.03
  const fullShelves = memo(s, 'full-shelves') ? 0.03 : 0
  return Math.floor(cap * (1 + nest + fullShelves + upgradeMagnitude(s, 'wall-of-cans')) * statMul(s, 'shelf'))
}

export function backroomCap(s: GameState) {
  const st = s.builds.storage ?? 1
  let cap = BACKROOM.baseCap + up(s, 'racks') * BACKROOM.perRackLevel
  if (st >= 2) cap += 60
  if (st >= 3) cap += 400
  if (s.expansions['side-yard']) cap += 40
  if (memo(s, 'dock-plate')) cap += 20
  return Math.floor(cap * (1 + up(s, 'case-cube') * 0.03) * statMul(s, 'backroom'))
}

/** Door overflow Refuse Softener lets a truck squeeze past the backroom cap. */
export function doorOverflow(s: GameState) {
  return up(s, 'refuse-softener') * 4
}

// ── Wholesale ───────────────────────────────────────────────────────────────

export function crateSize(s: GameState) {
  let n = WHOLESALE.spoolUnits + up(s, 'crate-size') * 4
  if (memo(s, 'hand-truck')) n += 12
  if (memo(s, 'crate-chisel')) n += 2
  if ((s.builds.transit ?? 0) >= 2) n += 12
  return n
}

/** Dip Bell strength: the upgrade rank, or rank 1 for free with the Empire perk. */
export function dipBellLevel(s: GameState) {
  return Math.max(up(s, 'dip-bell'), perk(s, 'dip-bell-always') > 0 ? 1 : 0)
}

/** Wholesale is dipping when the live index sits clearly under its slow EMA. */
export function wholesaleDipping(s: GameState) {
  const tip = Number.isFinite(s.wholesale.tipIndex) ? s.wholesale.tipIndex : s.wholesale.index
  return s.wholesale.index < tip * 0.97
}

export function wholesaleMul(s: GameState) {
  const dip = wholesaleDipping(s) ? 1 - dipBellLevel(s) * 0.015 : 1
  // Many Docks: wholesale discount stops advancing; One Vendor: asymptotic cost cut.
  const haggle = up(s, 'many-docks') > 0 ? 0 : up(s, 'wholesale-discount') * 0.02
  const vendor = upgradeMagnitude(s, 'one-vendor')
  return Math.max(0.5, 1 - haggle - vendor) * (memo(s, 'buying-club') ? 0.9 : 1) * dip
}

export function unitCost(s: GameState, cat: CategoryId, supplier: SupplierId = s.supplier) {
  const base =
    WHOLESALE.baseCanCost *
    s.wholesale.index *
    CATEGORIES[cat].costMul *
    wholesaleMul(s) *
    valueMul(s) *
    statCut(s, 'crateCut')
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
  t *= Math.max(0.55, 1 - upgradeMagnitude(s, 'standing-order'))
  if (supplier === 'b') t *= 1 - up(s, 'dock-appointment') * 0.06
  // Many Docks: delivery asymptote; One Vendor barely moves short-ship/delivery.
  if (up(s, 'many-docks') > 0) t *= Math.max(0.5, 1 - upgradeMagnitude(s, 'many-docks') * 0.5)
  const transit = s.builds.transit ?? 0
  if (transit >= 2) t *= 0.5
  else if (transit >= 1) t *= 0.75
  if (memo(s, 'dock-plate')) t *= 0.6
  if (hasDoctrine(s, 'route-density')) t *= DOCTRINE_EFFECTS.routeDensityDeliveryMul
  return Math.max(1, t)
}

export function shortShipChance(s: GameState) {
  const oneVendorSoft = up(s, 'one-vendor') > 0 ? 0.15 : 1
  return (
    WHOLESALE.supplierB.shortShipChance *
    (1 - up(s, 'supplier-terms') * 0.2) *
    (1 - up(s, 'invoice-memory') * 0.12) *
    Math.max(0.5, 1 - upgradeMagnitude(s, 'depot-slot')) *
    Math.max(0.5, 1 - upgradeMagnitude(s, 'many-docks') * oneVendorSoft) *
    (1 - perk(s, 'lucky-trucks') * 0.1) *
    (1 - perk(s, 'buyers-eye') * 0.08) *
    (1 - perk(s, 'invoice-eye') * 0.06)
  )
}

// ── Demand ──────────────────────────────────────────────────────────────────

export function adMul(s: GameState) {
  // Neighborhood Saint weakens ads; Circular Machine boosts them.
  const saintCut = up(s, 'neighborhood-saint') > 0 ? 0.5 : 1
  const per =
    DEMAND.adMultPerLevel +
    (up(s, 'ad-eff') * 0.005 +
      up(s, 'coupon-math') * 0.004 +
      upgradeMagnitude(s, 'metro-circular') * 0.01 +
      upgradeMagnitude(s, 'circular-machine') * 0.015 +
      standingOrderMagnitude(s, 'circular-rewrite', 0.008) +
      (hasDoctrine(s, 'hi-lo') ? DOCTRINE_EFFECTS.hiLoAdBonus : 0) +
      (memo(s, 'weekly-circular') ? 0.04 : 0)) *
      saintCut
  return Math.pow(per, s.ads - 1)
}

export function weatherDemand(s: GameState, w: WeatherId = s.weather.now) {
  const amp = 1 + up(s, 'weather-read') * 0.2
  const rainPlan = memo(s, 'rain-plan') ? 2 : 1
  if (w === 'rain') return 1 + 0.12 * amp * rainPlan
  if (w === 'heat') return 1 + 0.06 * amp
  if (w === 'cold') return Math.min(1, 0.92 + up(s, 'seasonal-signage') * 0.015)
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

/** Forecast line once the weather-radio memo is owned (legacy barometer saves migrate to it). */
export function hasWeatherForecast(s: GameState) {
  return memo(s, 'weather-radio')
}

export function hoursMax(s: GameState) {
  if (s.board?.cutHoursUntil > s.time) return Math.min(1, HOURS.max)
  return roleCount(s, 'night') > 0 ? HOURS.nightMax : HOURS.max
}

/** Hours beyond 1.0 are night hours; they pull less unless night clerks are on. */
export function hoursDemand(s: GameState) {
  const h = s.hours
  if (h <= 1) return h
  const nightEff = Math.min(
    1,
    HOURS.nightEfficiency +
      up(s, 'night-bonus') * 0.05 +
      roleStrength(s, 'night') * 0.05 +
      (memo(s, 'night-store') ? 0.02 : 0) +
      upgradeMagnitude(s, 'closer') * 0.15,
  )
  const dayPart = Math.min(h, HOURS.max) - 1
  const nightPart = Math.max(0, h - HOURS.max)
  const sunday = memo(s, 'sunday-hours') ? 1.02 : 1
  return (1 + dayPart * 0.8 + nightPart * nightEff) * sunday
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
  return (
    1 +
    (LOYALTY.bonusByTier[s.loyalty.tier] ?? 0) *
      (1 + up(s, 'loyalty-earn') * 0.1 + upgradeMagnitude(s, 'punch-math'))
  )
}

export function memoDemandMul(s: GameState) {
  let m = 1
  if (memo(s, 'chalkboard')) m *= 1.1
  if (memo(s, 'radio-spot')) m *= 1.15
  if (memo(s, 'slogan')) m *= 1.1
  if (memo(s, 'planogram')) m *= 1.25
  if (memo(s, 'window-lettering')) m *= 1.08
  if (memo(s, 'bike-rack')) m *= 1.02
  if (memo(s, 'community-board')) m *= 1.03
  return m
}

export function empireDemandMul(s: GameState) {
  return 1 + Math.max(0, s.empire.level - 1) * EMPIRE.demandPerLevel
}

export function expansionDemandMul(s: GameState) {
  let m = 1
  if (s.expansions['lot']) m *= CHAIN.lotDemandMul
  if (s.expansions['parking']) m *= CHAIN.parkingDemandMul
  m *= 1 + up(s, 'deed-sense') * 0.02
  return m
}

export function ventureTrafficMul(s: GameState) {
  let open = 0
  for (const id of Object.keys(s.ventures)) {
    if ((s.ventures[id]?.level ?? 0) > 0) open += 1
  }
  return 1 + Math.min(VENTURE_TRAFFIC.cap, open * VENTURE_TRAFFIC.perOpen)
}

export function wordOfMouthMul(s: GameState) {
  return 1 + WORD_OF_MOUTH.perDecade * Math.log10(1 + Math.max(0, s.baskets) / WORD_OF_MOUTH.scale)
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
    loyalty: loyaltyMul(s) * (s.loyalty.tier > 0 ? 1 + perk(s, 'regulars') * 0.04 : 1),
    memos: memoDemandMul(s),
    upgrades:
      (1 + up(s, 'curb-appeal') * 0.03) *
      (1 + perk(s, 'known-door') * 0.03) *
      (1 + perk(s, 'block-captain') * 0.02) *
      (1 + upgradeMagnitude(s, 'sidewalk-bench')) *
      // Neighborhood Saint: demand asymptote. Circular Machine: base demand stops.
      (up(s, 'circular-machine') > 0 ? 1 : 1 + upgradeMagnitude(s, 'neighborhood-saint')) *
      (memo(s, 'morning-rush') ? 1.02 : 1) *
      (memo(s, 'flagship-memo') ? 1.03 : 1),
    endcaps:
      1 +
      s.endcaps *
        (ENDCAP.demandEach +
          up(s, 'endcap-design') * 0.01 +
          up(s, 'aisle-caps') * 0.003 +
          upgradeMagnitude(s, 'endcap-season') * 0.01),
    inspection: s.time < s.inspection.penaltyUntil ? INSPECTION.demandPenalty : 1,
    /** Rival coupon war (Era 2+): mild −8% while active. */
    couponWar: s.events?.couponWar?.active ? COUPON_WAR.demandMul : 1,
    /** Rival undercut / smear (Era 2+): mild −5–6% while active. Poach hits morale instead. */
    rival:
      s.events?.rival?.kind === 'undercut'
        ? RIVAL_EVENTS.undercutDemandMul
        : s.events?.rival?.kind === 'smear'
          ? RIVAL_EVENTS.smearDemandMul
          : s.events?.rival?.kind === 'raid'
            ? RIVAL_EVENTS.raidDemandMul
            : 1,
    /** Celebrity endcap (Era 2+ Ideas sink): +25% while active. */
    celebrity:
      (s.campaigns?.celebrityUntil ?? 0) > s.time
        ? CELEBRITY_ENDCAP.demandMul + up(s, 'campaign-kit') * 0.02
        : 1,
    /** Brand 0..1 maps to roughly ±12% demand — visible on Books. */
    brand: 0.88 + 0.24 * clamp(s.brand, 0, 1),
    morale: 0.9 + 0.1 * Math.min(1, s.morale),
    empire: empireDemandMul(s),
    expansions: expansionDemandMul(s),
    marketing: marketingDemandMul(s),
    ventures: ventureTrafficMul(s),
    /** 2.0: lifetime baskets bring shoppers back. */
    wordOfMouth: wordOfMouthMul(s),
    /** 2.0: independent rival chains pull shoppers away. */
    rivals: rivalDemandMul(s),
    /** 2.0 stat engine: trees, doctrines, rank rewards, projects. */
    trees: statMul(s, 'demand'),
  }
  let total = 1
  for (const v of Object.values(parts)) total *= v
  return { parts, total }
}

export function priceFactor(s: GameState, price = s.price) {
  return Math.pow(DEMAND.refPrice / Math.max(0.01, price), demandElasticity(s))
}

export function basketUnits(s: GameState) {
  return (
    1 +
    up(s, 'basket-size') * 0.05 +
    upgradeMagnitude(s, 'bag-well') +
    (memo(s, 'bag-station') ? 0.03 : 0)
  )
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

/** Featured aisle when mix ≥ featureMixMin and 2+ aisles open. */
export function featuredCategory(s: GameState): CategoryId | null {
  return featuredCategories(s)[0] ?? null
}

/**
 * Feature aisles, best mix first. One by default; the Second Feature perk adds a
 * runner-up (3+ aisles open, mix ≥ featureMixMin).
 */
export function featuredCategories(s: GameState): CategoryId[] {
  let unlocked = 0
  for (const c of CATEGORY_IDS) if (s.categories[c]) unlocked += 1
  if (unlocked < 2) return []
  const eligible: { cat: CategoryId; mix: number; idx: number }[] = []
  CATEGORY_IDS.forEach((c, idx) => {
    if (!s.categories[c]) return
    const mix = s.mix[c] ?? 0.5
    if (mix >= VARIETY.featureMixMin) eligible.push({ cat: c, mix, idx })
  })
  // Ties go to the later aisle, matching the original single-pick scan.
  eligible.sort((a, b) => b.mix - a.mix || b.idx - a.idx)
  const slots = perk(s, 'second-feature') > 0 && unlocked >= 3 ? 2 : 1
  return eligible.slice(0, slots).map((e) => e.cat)
}

export function categoryWeights(s: GameState): Partial<Record<CategoryId, number>> {
  const w: Partial<Record<CategoryId, number>> = {}
  let total = 0
  const wx = s.weather.now
  const featured = featuredCategories(s)
  // Wall of Cans dulls feature pull; One Perfect Aisle / eye-level raise it.
  const wallDull = up(s, 'wall-of-cans') > 0 ? 0.65 : 1
  const featureMul =
    (VARIETY.featureWeightMul +
      up(s, 'facing') * VARIETY.facingBonusPerLevel +
      upgradeMagnitude(s, 'eye-level') +
      upgradeMagnitude(s, 'one-perfect-aisle') +
      standingOrderMagnitude(s, 'extra-facing-hour', 0.2)) *
    wallDull
  const posture = MARKETING.postures[marketingPosture(s)]
  for (const c of CATEGORY_IDS) {
    if (!s.categories[c]) continue
    let weight = CATEGORIES[c].weight
    // Rain: mild comfort-food (cans) pull. Heat: mild dairy/drink pull.
    if (wx === 'rain' && c === 'cans') weight *= 1.22
    if (wx === 'heat' && c === 'dairy') weight *= 1.18
    if (featured.includes(c)) weight *= featureMul
    let plMul = posture.privateLabelWeightMul
    if (memo(s, 'dry-empire')) plMul *= 1.08
    if (c === 'privateLabel') weight *= plMul
    // Cold Momentum pulls dairy/meat; brownout softens them.
    if ((c === 'dairy' || c === 'meat') && coldLineActive(s)) {
      if (coldBrownout(s)) {
        weight *= COLD.brownoutDemandMul
      } else if (s.cold.momentumOn && s.cold.momentum > 1) {
        weight *= Math.min(
          COLD.momentumWeightCap,
          1 + (s.cold.momentum - 1) * COLD.momentumWeightPerStep,
        )
      }
    }
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
  return CATEGORIES[cat].weight * (0.08 + mix * 0.92) * mixAutopilotMul(s, cat)
}

/**
 * Mix Autopilot: nudge restock toward aisles that sell above their fair share.
 * Up to ±(6% × rank), only once there is real sales history.
 */
export function mixAutopilotMul(s: GameState, cat: CategoryId): number {
  const rank = up(s, 'mix-autopilot')
  const habit = upgradeMagnitude(s, 'clipboard-habit')
  if (rank <= 0 && habit <= 0) return 1
  let open = 0
  let total = 0
  for (const c of CATEGORY_IDS) {
    if (!s.categories[c]) continue
    open += 1
    total += s.stats.soldByCat[c] ?? 0
  }
  if (open < 2 || total < 50) return 1
  const share = (s.stats.soldByCat[cat] ?? 0) / total
  const rel = Math.max(-1, Math.min(1, share * open - 1))
  return 1 + (rank * 0.06 + habit) * rel
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
 * Category variety: +10% for 2nd and 3rd aisle, +4% after that.
 * Featuring one aisle still shares the shopper pool.
 */
export function varietyMul(s: GameState) {
  let n = 0
  for (const c of CATEGORY_IDS) if (s.categories[c]) n++
  if (n <= 1) return 1
  const early = Math.min(2, n - 1) * VARIETY.earlyEach
  const late = Math.max(0, n - 3) * VARIETY.lateEach
  return 1 + early + late
}

export function checkoutCap(s: GameState) {
  const cashiers = roleStrength(s, 'cashier')
  let cap = CHECKOUT.basePerSec + cashiers * CHECKOUT.perCashier
  cap += chainCheckoutBonus(s)
  if (memo(s, 'express-lane')) cap *= CHECKOUT.expressLaneMul
  cap *= 1 + up(s, 'two-way-radio') * 0.03 + upgradeMagnitude(s, 'register-glance')
  if (memo(s, 'two-way-radio-memo')) cap *= 1.03
  return cap * Math.min(1, s.morale + 0.1) * statMul(s, 'checkout')
}

/** What one unit of `cat` actually rings up for at the register (value ladder included). */
export function shelfPrice(s: GameState, cat: CategoryId, price = s.price) {
  return price * CATEGORIES[cat].priceRatio * valueMul(s)
}

export function revenueMul(s: GameState) {
  return (
    (1 + up(s, 'label-gun') * 0.01) *
    (memo(s, 'price-gun') ? 1.01 : 1) *
    chainRevenueMul(s) *
    marketingRevenueMul(s) *
    valueMul(s) *
    statMul(s, 'margin')
  )
}

/**
 * Profit-maximizing shelf price for Price IQ.
 * Uses a slow wholesale EMA (tipIndex), not the live sine — otherwise Best ≈
 * jitters every tick and runs away when the player tries to match it.
 * Snapped to 10¢ so Floor ± buttons can land on it.
 */
export function bestPrice(s: GameState) {
  const e = demandElasticity(s)
  if (e <= 1.01) return DEMAND.refPrice
  const tipIndex = Number.isFinite(s.wholesale.tipIndex) ? s.wholesale.tipIndex : s.wholesale.index
  const cost =
    WHOLESALE.baseCanCost *
    tipIndex *
    CATEGORIES.cans.costMul *
    wholesaleMul(s) *
    (s.supplier === 'b' ? WHOLESALE.supplierB.discount : 1)
  const raw = (cost * e) / (e - 1)
  const step = 0.1
  const snapped = Math.round(raw / step) * step
  return Math.min(PRICE.max, Math.max(PRICE.min, snapped))
}

// ── Staff ───────────────────────────────────────────────────────────────────

export function hireCost(s: GameState, role: RoleId) {
  const def = ROLES[role]
  const n = roleCount(s, role)
  return Math.ceil(
    def.hireBase *
      Math.pow(def.hireGrowth, n) *
      (1 - up(s, 'hiring-fair') * 0.05) *
      (1 - up(s, 'hire-iq') * 0.02) *
      Math.max(0.7, 1 - upgradeMagnitude(s, 'bench')),
  )
}

export function wagesPerSec(s: GameState) {
  let w = 0
  const eraWage = 1 + Math.min(3, s.era) * 0.08
  for (const m of s.staff) {
    w += ROLES[m.role].wagePerMin * (1 + (m.level - 1) * 0.04) * eraWage * traitWage(m.traitId)
  }
  const hoursMul = Math.max(0.5, s.hours)
  // House Crew softens the wage floor; Traveling Team leaves wages alone.
  const wageCut = up(s, 'wage-eff') * 0.04 + upgradeMagnitude(s, 'house-crew') * 0.15
  return (
    (w / 60) *
    hoursMul *
    Math.max(0.6, 1 - wageCut) *
    (memo(s, 'open-book-accounting') ? 0.98 : 1) *
    statCut(s, 'wageCut')
  )
}

export function staffLevelCap(s: GameState) {
  return Math.min(20, 3 + Math.floor(s.empire.level / 2) + up(s, 'training'))
}

/** Max heads on payroll from building + deeds + Shift Lead. */
export function staffSeatCap(s: GameState) {
  const front = Math.min(
    STAFF_SEATS.byStorefront.length - 1,
    Math.max(0, s.builds.storefront ?? 1),
  )
  let seats = STAFF_SEATS.byStorefront[front] ?? 3
  if (s.expansions['side-yard']) seats += STAFF_SEATS.sideYardBonus
  if (s.expansions['parking']) seats += STAFF_SEATS.parkingBonus
  const stores = Math.max(0, s.stores.length - 1)
  seats += stores * STAFF_SEATS.perExtraStore
  seats += Math.floor(up(s, 'shift-lead') / STAFF_SEATS.shiftLeadPerRanks)
  seats += Math.floor(up(s, 'district-lead') / 3)
  seats += Math.floor(upgradeMagnitude(s, 'traveling-team') * 8)
  seats += perk(s, 'extra-seat')
  return Math.max(1, seats)
}

export function xpToLevel(level: number) {
  return STAFF_XP.perLevel * level
}

export function unpackPerSec(s: GameState) {
  let r = roleStrength(s, 'clerk') * UNPACK.clerkPerSec + roleStrength(s, 'stocker') * UNPACK.stockerPerSec
  // Cross-Train: cashiers lend a sliver of their pace to Unpack between customers.
  const cross = up(s, 'cross-train') * 0.03 * (1 + (up(s, 'float-pool') > 0 ? 0.5 : 0))
  r += roleStrength(s, 'cashier') * UNPACK.clerkPerSec * cross
  r *= 1 + up(s, 'clerk-throughput') * 0.08 + upgradeMagnitude(s, 'hands-on')
  if (memo(s, 'pallet-jack')) r *= 1.25
  if (memo(s, 'pallet-chain')) r *= 1.5
  if (hasDoctrine(s, 'throughput')) r *= DOCTRINE_EFFECTS.throughputUnpackMul
  return r * s.morale * Math.min(1.25, Math.max(0.5, s.hours)) * statMul(s, 'unpack')
}

export function manualUnpackAmount(s: GameState) {
  return 1 + up(s, 'quick-hands') + perk(s, 'quick-unpack') + (memo(s, 'box-cutter') ? 1 : 0)
}

export function moraleTarget(s: GameState) {
  let t = 1
  if (s.staff.length >= 2) t += up(s, 'buddy-system') * 0.01
  t += upgradeMagnitude(s, 'tip-jar')
  t += upgradeMagnitude(s, 'house-crew') * 0.5
  t += perk(s, 'second-bell') * 0.01
  if (s.hours > HOURS.longThreshold) {
    t -=
      (s.hours - HOURS.longThreshold) *
      (1 - MORALE.longHoursPenalty) *
      1.5 *
      Math.max(0.5, 1 - up(s, 'overtime-cap') * 0.08)
  }
  const sec = roleCount(s, 'security')
  if (sec > 2) t -= (sec - 2) * MORALE.securityCrowding
  if (memo(s, 'staff-room')) t += 0.05
  if (memo(s, 'smell-of-bread')) t += 0.02
  if (s.time < s.pizzaUntil) t += MORALE.pizzaBoost
  if (s.events?.rival?.kind === 'poach' && s.staff.length > 0) t += RIVAL_EVENTS.poachMoraleTarget
  return Math.min(MORALE.max, Math.max(MORALE.min, t))
}

// ── Spoil / shrink / inspection ─────────────────────────────────────────────

/** Cold line is live (Era 3+, at least one plant or tank). */
export function coldLineActive(s: GameState) {
  return s.era >= 3 && (s.cold.plants > 0 || s.cold.tanks > 0)
}

/** Brownout: freshness pinned at the floor (~25%). */
export function coldBrownout(s: GameState) {
  return coldLineActive(s) && (s.cold.browned || s.cold.freshness <= COLD.freshnessFloor + 0.01)
}

export function lifeMul(s: GameState, cat: CategoryId) {
  let m = 1
  const cold = s.builds.cold ?? 0
  if (cold >= 2) m *= 1.6
  else if (cold >= 1) m *= 1.25
  if (cat === 'produce' && memo(s, 'misting-bar')) m *= 1.4
  m *= 1 + up(s, 'cold-hands') * 0.04 + upgradeMagnitude(s, 'cold-chain-drill')
  if (memo(s, 'cold-vault')) m *= 1.04
  if (memo(s, 'spoil-log')) m *= 1.03
  if (s.board?.rndUntil > s.time) m *= 1.1
  // Cold chain: healthy freshness + Momentum stretch perishable life; sagging freshness / brownout shortens it.
  if (CATEGORIES[cat].life != null && coldLineActive(s)) {
    const f = s.cold.freshness
    if (coldBrownout(s)) {
      m *= COLD.brownoutLifeMul
    } else if (f >= 1) {
      m *= COLD.healthyLifeMul
      if (s.cold.momentumOn && s.cold.momentum > 1) {
        const steps = Math.min(COLD.momentumMax, s.cold.momentum) - 1
        m *= 1 + Math.min(COLD.momentumLifeCap, steps * COLD.momentumLifePerStep)
      }
    } else {
      // Below 100% but above the brownout floor: ramp from neutral toward the brownout cut.
      const span = Math.max(0.01, 1 - COLD.freshnessFloor)
      const t = Math.min(1, Math.max(0, (1 - f) / span))
      m *= 1 - t * (1 - COLD.brownoutLifeMul)
    }
  }
  return m
}

/** True spoil life in age-seconds (base life × lifeMul), or null for non-perishables. */
export function effectiveLife(s: GameState, cat: CategoryId): number | null {
  const life = CATEGORIES[cat].life
  if (life === null) return null
  return life * lifeMul(s, cat)
}

/** 0 = fresh … 1 = about to spoil. Uses lifeMul so UI wilt matches tickAging. Non-perishables are 0. */
export function batchSpoilFrac(s: GameState, batch: { cat: CategoryId; age: number }): number {
  const life = effectiveLife(s, batch.cat)
  if (life === null || life <= 0) return 0
  return Math.min(1, Math.max(0, batch.age / life))
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
  if (cat && featuredCategories(s).includes(cat) && CATEGORIES[cat].life != null) {
    m *= VARIETY.featureSpoilMul
  }
  // Brownout: warm aisles age faster (perishables only).
  if (coldBrownout(s) && (!cat || CATEGORIES[cat].life != null)) m *= COLD.brownoutAgingMul
  return m * statCut(s, 'spoilCut')
}

export function shrinkMul(s: GameState) {
  const sec = roleStrength(s, 'security')
  const cash = roleCount(s, 'cashier')
  let m = Math.max(SHRINK.floor, 1 - sec * SHRINK.securityCut - cash * SHRINK.cashierCut)
  if (memo(s, 'security-mirror')) m *= SHRINK.mirrorMul
  if (memo(s, 'corner-watch')) m *= 0.95
  m *= 1 - up(s, 'shrink-sense') * SHRINK.senseCutPerLevel
  m *= Math.max(0.5, 1 - upgradeMagnitude(s, 'count-night'))
  m *= Math.max(0.5, 1 - standingOrderMagnitude(s, 'crate-recount', 0.2))
  const pricePerception = Math.pow(Math.max(0.5, s.price / DEMAND.refPrice), 0.3)
  return m * pricePerception * chainShrinkMul(s)
}

export function inspectionGainMul(s: GameState) {
  return (
    (memo(s, 'inspector-prep') ? INSPECTION.prepMul : 1) *
    (memo(s, 'wet-floor-cone') ? 0.95 : 1) *
    Math.max(0.5, 1 - up(s, 'spill-mat') * 0.05) *
    Math.max(0.7, 1 - standingOrderMagnitude(s, 'courtesy-call', 0.2))
  )
}

export function inspectionDecay(s: GameState) {
  const night =
    s.hours > HOURS.max
      ? 1 + up(s, 'night-sweep') * 0.25 + upgradeMagnitude(s, 'night-list')
      : 1
  return INSPECTION.decayPerSec * (memo(s, 'clipboard-rounds') ? 2 : 1) * night
}

export function inspectionFine(s: GameState) {
  const raw = Math.min(s.cash * INSPECTION.fineCashFrac, INSPECTION.fineFlat * Math.pow(3, s.era))
  return Math.max(0, raw * (1 - up(s, 'inspection-cushion') * 0.1))
}

// ── Fixed costs ─────────────────────────────────────────────────────────────

export function rentPerSec(s: GameState) {
  // Softer Era 0 rent so the heartbeat teaches before the clock feels loud.
  let perMin = 0.18
  if (s.era >= 1) perMin = 0.7
  if (s.expansions['side-yard']) perMin += 0.5
  if (s.expansions['parking']) perMin += CHAIN.parkingRentPerMin
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

/** Debt-to-assets ratio at which the covenant bites (Covenant Cushion raises it). */
export function covenantRatio(s: GameState) {
  return (
    CAPITAL.covenantDebtRatio +
    up(s, 'covenant-cushion') * 0.03 +
    upgradeMagnitude(s, 'covenant-footnote')
  )
}

/** Bailout wait, shortened by Petty Cash. */
export function bailoutCooldownSec(s: GameState) {
  return RECOVERY.bailoutCooldownSec * Math.max(0.5, 1 - up(s, 'petty-cash') * 0.1)
}

/** Reboot Fleet fee, softened by Reboot Discount. */
export function rebootFee(s: GameState) {
  return Math.max(1000, s.cash * FLEET.rebootCashFrac) * Math.max(0.4, 1 - up(s, 'reboot-discount') * 0.08)
}

export function passbookRate(s: GameState) {
  return PASSBOOK.ratePerSec * (1 + up(s, 'passbook-rate') * PASSBOOK.rateBonusPerLevel)
}

/** Max yielding passbook balance — scales with Empire level. */
export function passbookCap(s: GameState) {
  let cap = PASSBOOK.capBase * Math.pow(PASSBOOK.capGrowth, Math.max(0, s.empire.level - 1))
  cap *= 1 + up(s, 'passbook-rate') * PASSBOOK.capBonusPerUpgrade
  cap *= 1 + up(s, 'vault-clerk') * INVEST.vaultClerkCapBonus
  // Risk Desk: passbook growth from deep trees stops; Passbook House / Teller Name raise it.
  if (up(s, 'risk-desk') <= 0) {
    cap *= 1 + upgradeMagnitude(s, 'teller-name') + upgradeMagnitude(s, 'passbook-house')
  }
  if (hasDoctrine(s, 'float-discipline')) cap *= DOCTRINE_EFFECTS.floatDisciplineCapMul
  return Math.max(PASSBOOK.capBase, cap)
}

export function investBookCap(s: GameState) {
  const pb = passbookCap(s)
  const engine = s.invest?.engineLevel ?? 0
  let mul = INVEST.bookCapBase + INVEST.bookCapPerEngine * engine
  // Passbook House leaves the risk book alone; Risk Desk raises it.
  if (up(s, 'passbook-house') <= 0) mul *= 1 + upgradeMagnitude(s, 'risk-desk')
  return pb * mul
}

export function passbookYieldingBalance(s: GameState) {
  return Math.min(s.passbook.balance, passbookCap(s))
}

export function investYieldingBalance(s: GameState) {
  return Math.min(s.invest.balance, investBookCap(s))
}

/** Max upgrade rank unlocked by Empire level (capped by def.max). */
export function upgradeRankCap(s: GameState, id: string) {
  const def = UPGRADE_BY_ID[id]
  if (!def) return 0
  return Math.min(def.max, bandRankUnlocked(s, def))
}

/**
 * Current sales bottleneck: empty shelf, unpack lag, checkout line, or soft demand.
 */
export function salesBottleneck(s: GameState): {
  kind: SalesBottleneck
  label: string
  demand: number
  checkout: number
  unpack: number
  shelf: number
} {
  const demand = demandPerSec(s) * varietyMul(s)
  const checkout = checkoutCap(s)
  const unpack = unpackPerSec(s) + (s.staff.length === 0 ? 0.01 : 0)
  const shelf = sumQty(s.shelf)
  const back = sumQty(s.backroom)
  let kind: SalesBottleneck = 'demand'
  let label = 'Shoppers are the limit — ads, price, or another door.'
  if (shelf <= 0) {
    kind = 'shelf'
    label =
      back > 0
        ? 'Shelf empty — Unpack from the backroom.'
        : 'Shelf empty — buy a crate, then Unpack.'
  } else if (unpack + 0.05 < Math.min(demand, checkout) && back > 0) {
    kind = 'unpack'
    label = 'Unpack is behind demand — hire a clerk or Unpack yourself.'
  } else if (checkout + 0.05 < demand && shelf > 0) {
    kind = 'checkout'
    label = 'Checkout is the line — hire cashiers or open managed stores.'
  }
  return { kind, label, demand, checkout, unpack, shelf }
}

/** Seconds until next Reputation +1 at current sold rate (Infinity if stalled). */
export function reputationEtaSec(s: GameState) {
  const need = Math.max(0, s.compute.nextRepAt - s.baskets)
  if (need <= 0) return 0
  const rate = s.rates.soldPerSec
  if (rate <= 1e-6) return Number.POSITIVE_INFINITY
  return need / rate
}

// ── Compute ─────────────────────────────────────────────────────────────────

export function attentionCap(s: GameState) {
  return s.compute.archives * COMPUTE.capPerArchive
}

export function attentionPerSec(s: GameState) {
  return s.compute.analysts * COMPUTE.attentionPerAnalyst * (memo(s, 'ledger-tape') ? 1.1 : 1) * statMul(s, 'attention')
}

export function ideasPerSec(s: GameState) {
  return COMPUTE.ideasBase * Math.pow(s.compute.analysts, COMPUTE.ideasExp) * statMul(s, 'ideas')
}

export function nextUpgradeCost(s: GameState, id: string) {
  const def = UPGRADE_BY_ID[id]
  if (!def) return 0
  return upgradeCostWithToll(def, up(s, id))
}

/** Sum of geometric upgrade costs for the next `count` levels from current. */
export function upgradeBulkCost(s: GameState, id: string, count: number) {
  const def = UPGRADE_BY_ID[id]
  if (!def || count <= 0) return 0
  const lvl = up(s, id)
  const rankCap = upgradeRankCap(s, id)
  const n = Math.min(Math.floor(count), Math.max(0, Math.min(def.max, rankCap) - lvl))
  let total = 0
  for (let i = 0; i < n; i++) total += upgradeCostWithToll(def, lvl + i)
  return total
}

/** How many levels the player can afford right now (capped by remaining + optional hard cap). */
export function maxAffordableUpgrades(s: GameState, id: string, hardCap = 50) {
  const def = UPGRADE_BY_ID[id]
  if (!def) return 0
  const lvl = up(s, id)
  const rankCap = upgradeRankCap(s, id)
  const room = Math.min(hardCap, Math.max(0, Math.min(def.max, rankCap) - lvl))
  let cash = s.cash
  let bought = 0
  for (let i = 0; i < room; i++) {
    const cost = upgradeCostWithToll(def, lvl + i)
    if (cash < cost) break
    cash -= cost
    bought += 1
  }
  return bought
}

export function empireXpToNext(level: number) {
  return Math.floor(EMPIRE.levelBase * Math.pow(EMPIRE.levelGrowth, level - 1))
}

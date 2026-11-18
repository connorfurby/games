import { cashLabel } from '@/shared/bn'
/**
 * Late-hub (Era 7–12) systems that thread Worlds into every existing hub.
 * Horizon currencies gate verbs; cash buys buildings via gated floors.
 */
import { TRACK_BY_ID, type BuildFilter } from '../../content/builds'
import { CATEGORIES, type CategoryId } from '../../content/categories'
import { HORIZON, LATE, LOGISTICS, WHOLESALE } from '../balance'
import { crateCost, crateSize, deliveryTime } from '../formulas'
import { PLANET_BY_ID } from '../../content/horizon'
import { log, round2 } from '../helpers'
import type { GameState } from '../state'
import { ensureHorizon } from './horizon'
import {
  bondedCapBonus,
  bondedRateMul,
  councilSeatAdd,
  endcapMul,
  franchiseLayerMul,
  jumpBurnCap,
  jumpFreightMul,
  queueFloorMul,
  tickLateHubs,
  vaultCapBonus,
  vaultCapMul,
  vaultDecayMul,
} from './lateHubs'

function cashFloor(s: GameState, authored: number, mul = 1): number {
  const floor = Math.max(0, s.rates?.revenuePerSec ?? 0) * LATE.cashGateSec * mul
  return Math.max(authored, floor)
}

export function emptyOffworld(): { bay: string[]; sold: number } {
  return { bay: [], sold: 0 }
}

export function emptyBonded(): { crates: number; cap: number } {
  return { crates: 0, cap: LATE.bondedCapBase }
}

export function emptySeedVault(): { held: number; cap: number } {
  return { held: 0, cap: LATE.seedVaultCapBase }
}

export function emptyLate(): LateState {
  return {
    broadcasts: {},
    wireAdsUntil: 0,
    cryoImmuneUntil: 0,
    jumpFreightAcc: 0,
    planetFranchises: 0,
    futuresUntil: 0,
    futuresSku: null,
    scrutiny: 0,
    instruments: {},
    unpacked: 0,
  }
}

export interface LateState {
  /** Climate id → remaining broadcast seconds. */
  broadcasts: Record<string, number>
  wireAdsUntil: number
  cryoImmuneUntil: number
  jumpFreightAcc: number
  planetFranchises: number
  futuresUntil: number
  futuresSku: string | null
  scrutiny: number
  instruments: Record<string, number>
  unpacked: number
}

export function ensureLate(s: GameState): LateState {
  if (!s.late) s.late = emptyLate()
  if (typeof s.late.scrutiny !== 'number') s.late.scrutiny = 0
  if (!s.late.instruments || typeof s.late.instruments !== 'object') s.late.instruments = {}
  if (typeof s.late.unpacked !== 'number') s.late.unpacked = 0
  if (!s.offworld) s.offworld = emptyOffworld()
  if (!s.bonded) s.bonded = emptyBonded()
  if (!s.seedVault) s.seedVault = emptySeedVault()
  return s.late
}

export function bondedCap(s: GameState): number {
  const storage = s.builds.storage ?? 1
  // Bonded Warehouse (storage tier 6) owns the crate room claim — not earlier DC tiers.
  const warehouse =
    storage >= 6
      ? LATE.bondedWarehouseBonus
      : storage >= 5
        ? LATE.bondedCapPerStorage * 2
        : storage >= 4
          ? LATE.bondedCapPerStorage
          : 0
  return LATE.bondedCapBase + warehouse + bondedCapBonus(s)
}

export function seedVaultCap(s: GameState): number {
  const storage = s.builds.storage ?? 1
  // Seed Vault (storage tier 7) is the named cap; earlier storage only gives a thin floor.
  const tier =
    storage >= 7
      ? LATE.seedVaultTierBonus + LATE.seedVaultPerStorage * 2
      : storage >= 6
        ? LATE.seedVaultPerStorage
        : Math.max(0, storage - 3) * Math.floor(LATE.seedVaultPerStorage / 2)
  return (LATE.seedVaultCapBase + tier + vaultCapBonus(s)) * vaultCapMul(s)
}

/**
 * Late build claim readers — every era-7+ tier id must appear here (or in lateHubs)
 * so the build-claim test can prove the sim spends the claim.
 */
export const BUILD_CLAIM_READERS: Record<string, (s: GameState) => number> = {
  'storefront:Probe Plaza': (s) => ((s.builds.storefront ?? 0) >= 8 ? 1 : 0),
  'storefront:Greenhouse Atrium': (s) => ((s.builds.storefront ?? 0) >= 9 ? 1 : 0),
  'storefront:The Last Aisle': (s) => ((s.builds.storefront ?? 0) >= 10 ? 1 : 0),
  'storage:Bonded Warehouse': (s) => ((s.builds.storage ?? 0) >= 6 ? 1 : 0),
  'storage:Seed Vault': (s) => ((s.builds.storage ?? 0) >= 7 ? 1 : 0),
  'cold:Cryo Ark': (s) => ((s.builds.cold ?? 0) >= 6 ? 1 : 0),
  'production:Orbital Mill': (s) => ((s.builds.production ?? 0) >= 6 ? 1 : 0),
  'production:Relay Foundry': (s) => ((s.builds.production ?? 0) >= 7 ? 1 : 0),
  'transit:Convoy Gantry': (s) => ((s.builds.transit ?? 0) >= 7 ? 1 : 0),
  'transit:Jump Berth': (s) => ((s.builds.transit ?? 0) >= 8 ? 1 : 0),
  'civic:Embassy Annex': (s) => ((s.builds.civic ?? 0) >= 6 ? 1 : 0),
  "civic:Ivo's Plaque": (s) => ((s.builds.civic ?? 0) >= 7 ? 1 : 0),
}

export function hasIvoPlaque(s: GameState): boolean {
  return (s.builds.civic ?? 0) >= 7
}

export function hasSeedVaultTier(s: GameState): boolean {
  return (s.builds.storage ?? 0) >= 7
}

export function hasProbePlaza(s: GameState): boolean {
  return (s.builds.storefront ?? 0) >= 8
}

export function hasGreenhouseAtrium(s: GameState): boolean {
  return (s.builds.storefront ?? 0) >= 9
}

export function hasLastAisle(s: GameState): boolean {
  return (s.builds.storefront ?? 0) >= 10
}

export function hasRelayFoundry(s: GameState): boolean {
  return (s.builds.production ?? 0) >= 7
}

export function hasJumpBerth(s: GameState): boolean {
  return (s.builds.transit ?? 0) >= 8
}

export function hasEmbassyAnnex(s: GameState): boolean {
  return (s.builds.civic ?? 0) >= 6
}

/** Buy the queued build when cash clears the floor. */
export function tickBuildQueue(s: GameState): void {
  if (s.era < 7) return
  const h = ensureHorizon(s)
  const id = h.buildQueue
  if (!id) return
  const track = TRACK_BY_ID[id as BuildFilter]
  if (!track) {
    h.buildQueue = null
    return
  }
  const lvl = s.builds[id as BuildFilter] ?? 0
  const next = track.tiers[lvl + 1]
  if (!next) {
    h.buildQueue = null
    return
  }
  if (next.era > s.era) return
  if (s.cash < next.cost) return
  const floorOk = s.cash - next.cost >= s.cash * LATE.buildQueueCashFloor * queueFloorMul(s)
  if (!floorOk) return
  s.cash -= next.cost
  s.builds[id as BuildFilter] = lvl + 1
  s.stats.buildsBought += 1
  h.buildQueue = null
  log(s, `Queue built ${next.name}.`, 'good')
}

export function canRestockOffworld(s: GameState): string | null {
  if (s.era < 7) return 'Off-world bay opens in Era 7.'
  ensureLate(s)
  const stocked = s.horizon.planets.filter((p) => p.stocked)
  if (!stocked.length) return 'Stock a world first.'
  if (s.horizon.survey < LATE.offworldRestockSurvey) return `Need ${LATE.offworldRestockSurvey} survey.`
  return null
}

export function restockOffworld(s: GameState): string | null {
  const why = canRestockOffworld(s)
  if (why) return why
  ensureLate(s)
  const bay: string[] = []
  for (const run of s.horizon.planets) {
    if (!run.stocked) continue
    const sku = run.slots.find((id) => id) ?? run.id
    if (sku) bay.push(sku)
  }
  s.offworld.bay = bay.slice(0, 12)
  s.horizon.survey -= LATE.offworldRestockSurvey
  log(s, `Off-world bay restocked · ${s.offworld.bay.length} goods.`, 'good')
  return null
}

export function canUnpackBonded(s: GameState, n = 1, kind?: string): string | null {
  if (s.era < 8) return 'The bonded cage opens in Era 8.'
  ensureLate(s)
  if ((s.bonded?.crates ?? 0) < n) return 'No bonded crates waiting.'
  if (kind != null && kind !== 'dry' && kind !== 'chill' && kind !== 'fragile') {
    return 'Pick dry, chill, or fragile.'
  }
  return null
}

export function unpackBonded(s: GameState, n = 1, kind: string = 'dry'): string | null {
  const why = canUnpackBonded(s, n, kind)
  if (why) return why
  ensureLate(s)
  const take = Math.min(n, s.bonded.crates)
  s.bonded.crates -= take
  s.late.unpacked += take
  const kindMul = kind === 'chill' ? 1.08 : kind === 'fragile' ? 1.15 : 1
  const pay = cashFloor(s, s.rates.revenuePerSec * LATE.bondedUnpackCashFrac * take * kindMul, 0.05)
  s.cash += pay
  s.lifetimeRevenue += pay
  if (kind === 'fragile' && s.horizon) s.horizon.freight = Math.min(240, s.horizon.freight + 2 * take)
  if (kind === 'chill' && s.horizon) s.horizon.seed = Math.min(240, (s.horizon.seed ?? 0) + 1 * take)
  log(s, `Unpacked ${take} ${kind} bonded crate${take === 1 ? '' : 's'}.`, 'good')
  return null
}

export function canVaultSeed(s: GameState, amount: number): string | null {
  if (s.era < 9) return 'The seed vault opens in Era 9.'
  if (!hasSeedVaultTier(s)) return 'Build the Seed Vault first.'
  ensureLate(s)
  if (amount <= 0) return 'Vault some seed.'
  if (s.horizon.seed < amount) return 'Not enough seed on hand.'
  const room = seedVaultCap(s) - s.seedVault.held
  if (room <= 0) return 'The vault is full.'
  return null
}

export function vaultSeed(s: GameState, amount: number): string | null {
  const why = canVaultSeed(s, amount)
  if (why) return why
  ensureLate(s)
  const room = seedVaultCap(s) - s.seedVault.held
  const take = Math.min(amount, room, s.horizon.seed)
  s.horizon.seed -= take
  s.seedVault.held += take
  s.seedVault.cap = seedVaultCap(s)
  return null
}

export function canJumpLane(s: GameState): string | null {
  if (s.era < 8) return 'Jump lanes open in Era 8.'
  if (s.fleet.lanes < 1) return 'Open an ocean lane first.'
  if (s.fuel < 5) return 'Need fuel.'
  return null
}

export function jumpLane(s: GameState): string | null {
  const why = canJumpLane(s)
  if (why) return why
  ensureLate(s)
  const burn = Math.min(s.fuel, jumpBurnCap(s))
  s.fuel -= burn
  const freight =
    burn * LATE.jumpFreightPerFuel * jumpFreightMul(s) * (hasJumpBerth(s) ? LATE.jumpBerthFreightMul : 1)
  s.horizon.freight = Math.min(
    (s.horizon.freight ?? 0) + freight,
    HORIZON.freightCap,
  )
  log(s, `Jump haul · +${freight.toFixed(1)} freight.`, 'info')
  return null
}

export function canOpenPlanetFranchise(s: GameState): string | null {
  if (s.era < 7) return 'Planet franchises open in Era 7.'
  ensureLate(s)
  const stocked = s.horizon.planets.filter((p) => p.stocked).length
  if (s.late.planetFranchises >= stocked) return 'One franchise per stocked world.'
  return null
}

export function openPlanetFranchise(s: GameState): string | null {
  const why = canOpenPlanetFranchise(s)
  if (why) return why
  ensureLate(s)
  s.late.planetFranchises += 1
  log(s, `Planet franchise ${s.late.planetFranchises} opened.`, 'good')
  return null
}

export function coopCrateCost(s: GameState, cat: CategoryId): number {
  return round2(crateCost(s, cat, 'a') * LATE.coopCrates * LATE.coopCostMul)
}

export function coopSurveyCost(): number {
  return Math.ceil(LATE.coopCrates * LATE.coopSurveyPerCrate)
}

export function coopEta(s: GameState): number {
  return deliveryTime(s, 'a') * LATE.coopEtaMul
}

export function canCoopOrder(s: GameState, cat: CategoryId = s.orderCat): string | null {
  if (s.era < 7) return 'Co-op orders open in Era 7.'
  if (!(cat in CATEGORIES) || !s.categories[cat]) return 'Category locked.'
  ensureHorizon(s)
  const survey = coopSurveyCost()
  if (s.horizon.survey < survey) return `Need ${survey} survey.`
  const cost = coopCrateCost(s, cat)
  if (s.cash < cost) return `Need ${cashLabel(cost)}.`
  return null
}

/** Co-op truck: ~30% off Express, slow, part-paid in survey. */
export function coopOrder(s: GameState, cat: CategoryId = s.orderCat): string | null {
  const why = canCoopOrder(s, cat)
  if (why) return why
  const cost = coopCrateCost(s, cat)
  const qty = crateSize(s) * LATE.coopCrates
  s.cash -= cost
  s.horizon.survey -= coopSurveyCost()
  s.stats.wholesaleSpent += cost
  s.stats.ordersPlaced += 1
  s.wholesale.drift = Math.min(1.35, s.wholesale.drift + WHOLESALE.buyBump * LATE.coopCrates * 0.5)
  s.wholesale.idleSec = 0
  s.orders.push({
    id: s.nextOrderId++,
    supplier: 'a',
    cat,
    qty,
    eta: coopEta(s),
    unitCost: round2(cost / qty),
  })
  log(s, `Co-op truck rolling · ${qty} units, slow and cheap.`, 'info')
  return null
}

export function canCryoTreaty(s: GameState): string | null {
  if (s.era < 11) return 'The Cryo Treaty opens in Era 11.'
  ensureLate(s)
  if (s.late.cryoImmuneUntil > s.time) return 'Treaty already holds.'
  if (ensureHorizon(s).seal < HORIZON.clauseToggleSeal) return `Need ${HORIZON.clauseToggleSeal} seal.`
  return null
}

/** Spend seal for one season of brownout immunity. */
export function cryoTreaty(s: GameState): string | null {
  const why = canCryoTreaty(s)
  if (why) return why
  s.horizon.seal -= HORIZON.clauseToggleSeal
  s.late.cryoImmuneUntil = s.time + HORIZON.seasonSec
  log(s, 'Cryo Treaty signed · cold line immune for a season.', 'good')
  return null
}

export function cryoImmune(s: GameState): boolean {
  return (s.late?.cryoImmuneUntil ?? 0) > s.time
}

export function fuelCap(s: GameState): number {
  return LOGISTICS.fuelCapBase + (s.memos['fuel-buffer'] ? LOGISTICS.fuelCapPerBuffer : 0)
}

/** Climates with at least one stocked world. Only those can be put on the air. */
export function broadcastClimates(s: GameState): string[] {
  const out: string[] = []
  for (const run of s.horizon?.planets ?? []) {
    if (!run.stocked) continue
    const climate = PLANET_BY_ID[run.id]?.climate
    if (climate && !out.includes(climate)) out.push(climate)
  }
  return out
}

export function canBroadcast(s: GameState, climate: string): string | null {
  if (s.era < 7) return 'Broadcasts open in Era 7.'
  ensureLate(s)
  if (!broadcastClimates(s).includes(climate)) return 'Stock a world in that climate first.'
  if ((s.late.broadcasts[climate] ?? 0) > 0) return 'That climate is already on the air.'
  if (s.horizon.survey < LATE.broadcastSurveyCost) return `Need ${LATE.broadcastSurveyCost} survey.`
  return null
}

/** Spend survey; stocked worlds in that climate sell a little more off-world while it airs. */
export function broadcast(s: GameState, climate: string): string | null {
  const why = canBroadcast(s, climate)
  if (why) return why
  s.horizon.survey -= LATE.broadcastSurveyCost
  s.late.broadcasts[climate] = LATE.broadcastDurationSec
  log(s, `Broadcast to ${climate} worlds for ${LATE.broadcastDurationSec}s.`, 'good')
  return null
}

export function wireAdActive(s: GameState): boolean {
  return (s.late?.wireAdsUntil ?? 0) > s.time
}

export function canWireAd(s: GameState): string | null {
  if (s.era < 10) return 'Wire ads open in Era 10.'
  ensureLate(s)
  if (wireAdActive(s)) return 'A wire ad is already running.'
  if (s.horizon.signal < LATE.wireAdSignalCost) return `Need ${LATE.wireAdSignalCost} signal.`
  return null
}

/** Spend signal; the ad multiplier gets LATE.wireAdMul while the spot runs. */
export function wireAd(s: GameState): string | null {
  const why = canWireAd(s)
  if (why) return why
  s.horizon.signal -= LATE.wireAdSignalCost
  s.late.wireAdsUntil = s.time + LATE.wireAdDurationSec
  log(s, `Wire ad is live for ${LATE.wireAdDurationSec}s.`, 'good')
  return null
}

export function tickLate(s: GameState, dt: number): void {
  if (s.era < 7) return
  ensureLate(s)
  tickBuildQueue(s)

  // Bonded crates trickle in from filed circuits.
  if (s.era >= 8 && s.horizon.circuits.length > 0) {
    s.bonded.cap = bondedCap(s)
    const rate = s.horizon.circuits.length * 0.02 * bondedRateMul(s)
    if (s.bonded.crates < s.bonded.cap) {
      s.bonded.crates = Math.min(s.bonded.cap, s.bonded.crates + rate * dt)
    }
  }

  // Unvaulted seed decays; vaulted seed is safe.
  if (s.era >= 9) {
    s.seedVault.cap = seedVaultCap(s)
    let decay = LATE.seedDecayPerSec
    if ((s.builds.cold ?? 0) >= 6) decay *= LATE.cryoArkDecayMul
    decay *= vaultDecayMul(s)
    if (s.cold?.plants) decay *= Math.max(0.5, 1 - s.cold.plants * 0.02)
    const free = Math.max(0, s.horizon.seed - s.seedVault.held)
    if (free > 0) s.horizon.seed = Math.max(s.seedVault.held, s.horizon.seed - free * decay * dt)
  }

  // Broadcast timers.
  for (const key of Object.keys(s.late.broadcasts)) {
    const left = (s.late.broadcasts[key] ?? 0) - dt
    if (left <= 0) delete s.late.broadcasts[key]
    else s.late.broadcasts[key] = left
  }
  if (s.late.wireAdsUntil > 0 && s.time >= s.late.wireAdsUntil) s.late.wireAdsUntil = 0
  if (s.late.futuresUntil > 0 && s.time >= s.late.futuresUntil) {
    s.late.futuresUntil = 0
    s.late.futuresSku = null
  }
  tickLateHubs(s, dt)
}

export function offworldSalesMul(s: GameState): number {
  if (s.era < 7 || !s.offworld?.bay.length) return 1
  const stocked = s.horizon.planets.filter((p) => p.stocked)
  if (!stocked.length) return 1
  let mean = 0
  for (const p of stocked) mean += p.score
  mean /= stocked.length
  let mul = (1 + LATE.offworldPerWorld * mean * stocked.length) * endcapMul(s)
  if ((s.builds.production ?? 0) >= 6) mul *= 1.1
  if (s.era >= 8 && s.horizon.circuits.length > 0) mul *= 1 + LATE.importedSalesBump
  if (s.era >= 9) mul *= 1 + LATE.seasonalPremium * 0.25
  // Broadcasts: each stocked world whose climate is on the air sells a little more.
  const air = s.late?.broadcasts
  if (air) {
    for (const p of stocked) {
      const climate = PLANET_BY_ID[p.id]?.climate
      if (climate && (air[climate] ?? 0) > 0) mul *= 1 + LATE.broadcastSalesBump
    }
  }
  return mul
}

export function lateNetworkAdd(s: GameState): number {
  if (s.era < 7) return 0
  ensureLate(s)
  let add = 0
  add += s.late.planetFranchises * LATE.planetFranchiseLayer * franchiseLayerMul(s)
  if (s.era >= 8) add += Math.min(6, Math.floor(s.bonded?.crates ?? 0)) * LATE.bondedNetwork * 0.25
  add += councilSeatAdd(s)
  if (hasIvoPlaque(s)) add += LATE.ivoPlaqueEndless
  return add
}

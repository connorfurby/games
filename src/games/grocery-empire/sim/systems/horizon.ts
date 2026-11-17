/**
 * Eras 7–12. The flagship stays the engine; this file only moves the horizon
 * slice and the six network layers. It does not import commands.ts.
 */

import {
  CLAUSE_BY_ID,
  ENDLESS_NAMES,
  FAST_SCORE,
  HEADLINE_BY_ID,
  PLANETS,
  PLANET_BY_ID,
  PLANET_SKUS,
  SEASON_CHORES,
  SEASON_WANTS,
  SKU_BY_ID,
  STANDARD_SCORE,
  TRAIT_IDS as TRAIT_ID_LIST,
  climateForIndex,
  climateMul,
  crossTraits,
  fileStandardSymbols,
  generatePhrase,
  matchScore,
  namedFromChild,
  pickList,
  scorePhrase,
  scorePlanogram,
  type AgentHabit,
  type CharterId,
  type EndlessBan,
  type HeadlineDef,
  type HorizonState,
  type PlanetClimate,
  type PlanetDef,
  type SeasonChore,
  type StopPersonality,
  type TasterId,
  type TraitId,
} from '../../content/horizon'
import { DEPTH, NETWORK } from '../balance'
import { cashLabel } from '@/shared/bn'
import { upgradeEffect } from '../../content/upgrades'
import { HORIZON, LATE, PRICE } from '../balance'
import { clamp, log, setEra } from '../helpers'
import {
  diplomatSealCut,
  tasterMatchBonus,
} from '../staffAnnex'
import { hasFork } from '../ventureForks'
import type { GameState } from '../state'
import { agentSeatBonus, empireBaySlots, phraseClueBonus } from './lateHubs'
import { statCut, statMul } from './stats'
import {
  SEED_CAP,
  creditPracticeFiling,
  ensureHearing,
  ensureHorizon,
  ensurePractice,
  expectedSeasonChore,
  hearingDocketClear,
  markDeptStaffed,
  markStandardFile,
  say,
} from './horizonCore'
import {
  tickAgents,
  tickDeputies,
  tickHeadlines,
  tickKeel,
  tickPhrases,
  tickSeasons,
  tickTrickles,
  tickWages,
} from './horizonTick'
import { postHabitWatch, postedAgentId, stopDelayMul, tickHorizonVerbs } from './horizonVerbs'

// Public API stays importable from './systems/horizon'.
export { creditPracticeFiling, ensureHearing, ensureHorizon, ensurePractice, expectedSeasonChore, hearingDocketClear }
export {
  activeFacingBan,
  currentClimateGuest,
  guestBanTarget,
  pendingSettlement,
  stopDelayMul,
  stopTariffMul,
  stopTaxLine,
  canHaulYield,
  canRehearseAccept,
  canSeatClause,
  canServeClimateNeighbor,
  canSettleStop,
  haulYield,
  pendingSeatClause,
  postedAgentId,
  rehearsalMissChance,
  rehearseAccept,
  seatClause,
  serveClimateNeighbor,
  settleStop,
  tickHorizonVerbs,
} from './horizonVerbs'
export { nextHearingClause } from './horizonCore'


const TRAIT_IDS: readonly TraitId[] = TRAIT_ID_LIST
const AGENT_NAMES = ['Ada', 'Bo', 'Chi', 'Dev', 'Eli', 'Faye'] as const
const PLANET_LINE: Record<string, string> = {
  pantry: 'hz-planet-pantry',
  cinder: 'hz-planet-cinder',
  orchard: 'hz-planet-orchard',
  brine: 'hz-planet-brine',
  mercy: 'hz-planet-mercy',
  ash: 'hz-planet-ash',
  snow: 'hz-planet-snow',
  bazaar: 'hz-planet-bazaar',
}
const CLAUSE_LINE: Record<string, string> = {
  'open-hours': 'hz-clause-open',
  'cold-law': 'hz-clause-cold',
  'fair-stamp': 'hz-clause-fair',
  'local-shelf': 'hz-clause-local',
  'night-bell': 'hz-clause-night',
  'one-price': 'hz-clause-price',
}
const IVO_ERA: Record<number, string> = {
  7: 'hz-ivo-can-7',
  8: 'hz-ivo-can-8',
  9: 'hz-ivo-can-9',
  10: 'hz-ivo-can-10',
  11: 'hz-ivo-can-11',
  12: 'hz-ivo-corner',
}

const CONTINUE_BEATS = [
  'The ration is a door, not a closing time.',
  'The counter stays. The map grows a ring.',
  'Eight worlds are waiting on a survey.',
  'You can still prestige later, from the Empire board.',
] as const

type Policy = 'volume' | 'margin' | 'fresh'
type Habit = 'price' | 'stock' | 'route' | 'taste'

function isTrait(id: string): id is TraitId {
  return (TRAIT_IDS as readonly string[]).includes(id)
}

function isHabit(id: string): id is Habit {
  return id === 'price' || id === 'stock' || id === 'route' || id === 'taste'
}

function isPolicy(id: string): id is Policy {
  return id === 'volume' || id === 'margin' || id === 'fresh'
}

/** Planogram / convoy: practice first, then one credit per distinct planet / circuit. */
function creditUniqueFiling(
  s: GameState,
  layer: 'planogram' | 'convoy',
  alreadyCredited: boolean,
  markCredited: () => void,
): boolean {
  const bucket = ensurePractice(s)[layer]
  if (bucket.left > 0) {
    bucket.left -= 1
    log(s, `Practice ${layer} filed — ${bucket.left} practice left.`, 'info')
    return false
  }
  if (alreadyCredited) return false
  markCredited()
  bucket.credited += 1
  return true
}

function standardFileGap(s: GameState): string | null {
  const h = s.horizon
  if (h?.watchUntil > s.time) {
    return `Habit watch still running (${Math.ceil(h.watchUntil - s.time)}s).`
  }
  if (h?.settlementUntil > s.time) {
    return `Stop settlement ETA (${Math.ceil(h.settlementUntil - s.time)}s).`
  }
  if (h?.seatingGapUntil > s.time) {
    return `Clause seating gap (${Math.ceil(h.seatingGapUntil - s.time)}s).`
  }
  if (!s.depth) return null
  const last = s.depth.lastStandardFileAt ?? 0
  if (last <= 0) return null
  const left = HORIZON.standardFileGapSec - (s.time - last)
  if (left > 0) return `Standard desk cooling down (${Math.ceil(left)}s).`
  return null
}

function countAtLeast(scores: readonly number[], bar: number): number {
  let n = 0
  for (const score of scores) if (score + 1e-9 >= bar) n++
  return n
}

function surveyStaffed(s: GameState): boolean {
  return s.staff.some((m) => m.role === 'surveyor' || m.role === 'planogramClerk')
}

function exchangeStaffed(s: GameState): boolean {
  return s.staff.some((m) => m.role === 'broker' || m.role === 'stevedore')
}

function stopPersonality(seed: number, stop: string, index: number): StopPersonality {
  const kinds: StopPersonality[] = ['spoil', 'tariff', 'delay']
  const h = (Math.imul(seed ^ stop.length, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b)) >>> 0
  return kinds[h % 3]!
}


function spendCash(s: GameState, cost: number): boolean {
  if (!Number.isFinite(cost) || cost < 0 || s.cash < cost) return false
  s.cash -= cost
  return true
}

function cashNeed(cost: number): string {
  return `Need ${cashLabel(cost)}.`
}

function craftCap(s: GameState): number {
  return (s.empire.perks['hz-boutique'] ?? 0) > 0 ? 1.65 : HORIZON.boutiqueCraft
}

function filedScore(s: GameState): number {
  if (s.horizon.charter === 'standard' && upgradeEffect(s, 'fair-copy') > 0) return HORIZON.fairCopyScore
  return STANDARD_SCORE
}

function lockScore(s: GameState, score: number): number {
  if (s.horizon.charter === 'standard') return filedScore(s)
  return clamp(score, 0, 1)
}

function cleverBlocked(s: GameState): string | null {
  if (s.horizon.charter === 'standard') return 'Standard files only the standard.'
  if (s.horizon.clauses.includes('fair-stamp')) return 'Fair Stamp refuses clever commits.'
  return null
}

/** Worlds between list mutations; Endless Edit Pad stretches it by one world a rank. */
export function endlessMutateEvery(s: GameState): number {
  const extra = Math.min(HORIZON.endlessEditMaxExtra, Math.floor(upgradeEffect(s, 'endless-edit-pad') + 1e-9))
  return HORIZON.endlessMutateEvery + extra
}

function endlessDivisor(s: GameState): number {
  const base = (s.empire.perks['hz-endless'] ?? 0) > 0 ? 0.12 : 0.15
  return base + Math.min(0.08, ensureHorizon(s).listMutations * 0.01)
}

function endlessDef(index: number): PlanetDef {
  const climate = climateForIndex(index)
  const named = PLANETS.find((p) => p.climate === climate) ?? PLANETS[0]!
  const word = ENDLESS_NAMES[index % ENDLESS_NAMES.length] ?? 'Larder'
  return {
    id: `e${index}`,
    name: `${word} ${index}`,
    climate,
    wanted: named.wanted,
    banned: named.banned,
    standardSlots: named.standardSlots,
  }
}

function defFor(id: string): PlanetDef | null {
  const named = PLANET_BY_ID[id]
  if (named) return named
  if (id.startsWith('e')) {
    const index = Number(id.slice(1))
    if (Number.isInteger(index) && index >= 0) return endlessDef(index)
  }
  return null
}

/** Named worlds and endless `e{index}` titles. The shelf UI reads the same row the sim stocks. */
export function planetDef(id: string): PlanetDef | null {
  return defFor(id)
}

function slotsOf(raw: readonly string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < 6; i++) {
    const id = raw[i] ?? ''
    out.push(SKU_BY_ID[id] ? id : '')
  }
  return out
}

function wantedOf(id: string): string[] {
  return defFor(id)?.wanted ?? []
}

function goodMatches(planetId: string, good: string): boolean {
  const sku = SKU_BY_ID[good]
  if (!sku) return false
  const wanted = new Set(wantedOf(planetId))
  return sku.tags.some((tag) => wanted.has(tag))
}

/** 1 both ends, 0.6 one end, 0.3 neither. The stop is not part of the score. */
export function routeMatchScore(origin: string, dest: string, good: string): number {
  const a = goodMatches(origin, good)
  const b = goodMatches(dest, good)
  if (a && b) return 1
  if (a || b) return 0.6
  return 0.3
}

export interface ConvoyCrate {
  /** Stable offer id for this circuit roll. */
  id: string
  sku: string
  size: 1 | 2 | 3
}

/** Encode a packed crate into Circuit.load. */
export function packToken(sku: string, size: number): string {
  return `${sku}@${size}`
}

export function parsePackToken(token: string): { sku: string; size: number } | null {
  const at = token.indexOf('@')
  if (at < 0) {
    if (!SKU_BY_ID[token]) return null
    return { sku: token, size: 1 }
  }
  const sku = token.slice(0, at)
  const size = Number(token.slice(at + 1))
  if (!SKU_BY_ID[sku] || ![1, 2, 3].includes(size)) return null
  return { sku, size }
}

export function bayCaps(s: GameState): number[] {
  const caps: number[] = [...HORIZON.bayCaps]
  const bonus = Math.floor(upgradeEffect(s, 'bay-walls')) + ((s.builds.transit ?? 0) >= 7 ? 1 : 0) + empireBaySlots(s)
  caps[caps.length - 1] = (caps[caps.length - 1] ?? 4) + bonus
  if (s.depth && s.depth.stolenBay >= 0 && s.depth.stolenBay < caps.length) {
    caps[s.depth.stolenBay] = 0
  }
  return caps
}

export function convoyCapacity(s: GameState): number {
  return bayCaps(s).reduce((a, b) => a + b, 0)
}

/** Deterministic eight-crate offer from save seed + route. Does not advance rng. */
export function offerCrates(s: GameState, origin: string, dest: string, circuitIndex: number): ConvoyCrate[] {
  const skus = PLANET_SKUS
  let t =
    (Math.imul(s.seed ^ 0x9e3779b9, 0x85ebca6b) ^
      Math.imul(circuitIndex + 1, 0xc2b2ae35) ^
      origin.length * 97 ^
      dest.length * 193) >>>
    0
  const next = () => {
    t = (Math.imul(t, 1664525) + 1013904223) >>> 0
    return t / 4294967296
  }
  const out: ConvoyCrate[] = []
  for (let i = 0; i < HORIZON.crateOfferCount; i++) {
    const sku = skus[Math.floor(next() * skus.length) % skus.length]!
    const size = ([1, 2, 3] as const)[Math.floor(next() * 3) % 3]!
    out.push({ id: `c${circuitIndex}-${i}`, sku: sku.id, size })
  }
  return out
}

/** Matched cargo volume / capacity. */
export function convoyCargoFrac(dest: string, load: readonly string[], capacity: number): number {
  if (capacity <= 0) return 0
  let matched = 0
  for (const token of load) {
    const row = parsePackToken(token)
    if (!row) continue
    if (goodMatches(dest, row.sku)) matched += row.size
  }
  return matched / capacity
}

export function convoyScore(origin: string, dest: string, good: string, load: readonly string[], capacity: number): number {
  const route = routeMatchScore(origin, dest, good)
  return convoyCargoFrac(dest, load, capacity) * route
}

export function packFits(s: GameState, load: readonly string[]): boolean {
  const caps = bayCaps(s)
  const sizes = load.map((token) => parsePackToken(token)?.size ?? 0).filter((n) => n > 0)
  sizes.sort((a, b) => b - a)
  const remain = caps.slice()
  for (const size of sizes) {
    let placed = false
    for (let i = 0; i < remain.length; i++) {
      if ((remain[i] ?? 0) >= size) {
        remain[i]! -= size
        placed = true
        break
      }
    }
    if (!placed) return false
  }
  return true
}

/** Authored standard pack: fill capacity with dest-matching cargo for ~STANDARD_SCORE when route is 1. */
export function standardPack(s: GameState, dest: string, offers: readonly ConvoyCrate[]): string[] {
  const capacity = convoyCapacity(s)
  const need = Math.round(capacity * STANDARD_SCORE)
  const matching = offers.filter((c) => goodMatches(dest, c.sku)).sort((a, b) => b.size - a.size)
  const other = offers.filter((c) => !goodMatches(dest, c.sku)).sort((a, b) => a.size - b.size)
  const pack: string[] = []
  let used = 0
  for (const crate of matching) {
    if (used + crate.size > need && used >= need) break
    if (used + crate.size > capacity) continue
    const next = [...pack, packToken(crate.sku, crate.size)]
    if (!packFits(s, next)) continue
    pack.push(packToken(crate.sku, crate.size))
    used += crate.size
    if (used >= need) break
  }
  for (const crate of other) {
    if (used >= capacity) break
    if (used + crate.size > capacity) continue
    const next = [...pack, packToken(crate.sku, crate.size)]
    if (!packFits(s, next)) continue
    // Keep cargo frac near 0.8 — don't add non-matching if already at need.
    if (used >= need) break
  }
  return pack
}

function localPriceMul(s: GameState, climate: PlanetClimate, local: number | null): number {
  if (local == null || !Number.isFinite(local)) return 1
  const e = s.horizon.clauses.includes('one-price') ? 1.2 : HORIZON.localPriceElasticity
  const optimal = Math.max(PRICE.min, s.price) * climateMul(climate)
  const rel = Math.pow(optimal / Math.max(0.01, local), e)
  return Math.max(0.4, Math.min(1.5, rel))
}

function craftOf(h: HorizonState, score: number): number {
  if (h.charter !== 'boutique' || score <= STANDARD_SCORE) return 1
  return score / STANDARD_SCORE
}

function applyCraft(s: GameState, add: number, craft: number): number {
  const cap = craftCap(s)
  if (craft > cap && craft > 0) return add * (cap / craft)
  return add
}

function intenseBonus(s: GameState): number {
  return HORIZON.intenseBedPerRank * upgradeEffect(s, 'intense-bed') * (1 + upgradeEffect(s, 'cu-cross-sheet'))
}

/**
 * A bed's match score. Tasters on the clock add LATE.tasterMatchPerLevel per level, but never
 * push a score past 1 (an intense bed that already beats 1 keeps its own score).
 */
export function plotScore(s: GameState, child: readonly TraitId[]): number {
  const h = ensureHorizon(s)
  const base = matchScore(child, h.season, h.taster, intenseBonus(s))
  if (base <= 0) return base
  const bonus = tasterMatchBonus(s)
  if (bonus <= 0) return base
  return Math.min(Math.max(1, base), base + bonus)
}

function plotMatch(s: GameState): number {
  const h = s.horizon
  const planted = h.plots.filter((p) => p.child.length > 0)
  if (planted.length === 0) return h.greenhouses > 0 ? 0.5 : 0
  let sum = 0
  for (const plot of planted) {
    sum += plotScore(s, plot.child)
  }
  return lockScore(s, sum / planted.length)
}

/** Authored geometric cost, never below N seconds of current revenue. */
function gatedCash(s: GameState, authored: number, gateMul: number): number {
  const floor = Math.max(0, s.rates?.revenuePerSec ?? 0) * HORIZON.cashGateSec * gateMul
  return Math.max(authored, floor)
}

export function probeCost(s: GameState): number {
  const h = ensureHorizon(s)
  const authored = h.endless
    ? HORIZON.probeBase * HORIZON.endlessProbeGrowth ** h.endlessPlanets
    : HORIZON.probeBase * HORIZON.probeGrowth ** h.probes
  const plaza = (s.builds.storefront ?? 0) >= 8 ? LATE.probePlazaCostMul : 1
  const credit = Math.max(HORIZON.probeCreditFloor, 1 - upgradeEffect(s, 'pan-probe-credit'))
  // Per-world survey/cash variance so not every probe is an identical cashGate.
  const wobble =
    1 + HORIZON.probeSurveyVar * (((Math.imul(s.seed ^ h.probes, 0x27d4eb2d) >>> 0) / 4294967296) * 2 - 1)
  return gatedCash(s, authored * plaza * credit * wobble, HORIZON.probeGate * wobble)
}

export function greenhouseCost(s: GameState): number {
  const authored = HORIZON.greenhouseBase * HORIZON.greenhouseGrowth ** ensureHorizon(s).greenhouses
  return gatedCash(s, authored, HORIZON.greenhouseGate)
}

export function relayCost(s: GameState): number {
  const authored = HORIZON.relayBase * HORIZON.relayGrowth ** ensureHorizon(s).relays
  const foundry = (s.builds.production ?? 0) >= 7 ? LATE.relayFoundryCostMul : 1
  return gatedCash(s, authored * foundry, HORIZON.relayGate)
}

export function embassyCost(s: GameState): number {
  const authored = HORIZON.embassyBase * HORIZON.embassyGrowth ** ensureHorizon(s).embassies
  return gatedCash(s, authored, HORIZON.embassyGate)
}

export function circuitFreightCost(s: GameState): number {
  return HORIZON.circuitBase * HORIZON.circuitGrowth ** ensureHorizon(s).circuits.length
}

export function keelBuyoutCost(s: GameState): number {
  const convoys = ensureHorizon(s).keel.convoys
  const authored =
    HORIZON.keelBuyoutBase * (1 + convoys * HORIZON.keelBuyoutPerConvoy) * statCut(s, 'dealCut')
  return Math.ceil(gatedCash(s, authored, HORIZON.keelGate))
}

export function stockedCount(s: GameState): number {
  let n = 0
  for (const planet of ensureHorizon(s).planets) if (planet.stocked) n++
  return n
}

export function meanPlanetScore(s: GameState): number {
  const stocked = ensureHorizon(s).planets.filter((p) => p.stocked)
  if (stocked.length === 0) return 0
  let sum = 0
  for (const planet of stocked) sum += planet.score
  return sum / stocked.length
}

export function planetNetworkMul(s: GameState): number {
  const h = ensureHorizon(s)
  const cluster = h.cluster ? HORIZON.clusterMul[h.cluster.policy] : 1
  const layer = HORIZON.planetLayer * (h.clauses.includes('local-shelf') ? 1.12 : 1)
  const chalk = upgradeEffect(s, 'local-chalk')
  const staffMul = surveyStaffed(s) ? 1 : NETWORK.neglectFloor
  const surveyPol = s.depth?.departments?.survey?.policy
  const surveyMul =
    surveyPol === 'volume'
      ? DEPTH.surveyVolumeMul
      : surveyPol === 'margin'
        ? DEPTH.surveyMarginMul
        : surveyPol === 'fresh'
          ? DEPTH.surveyFreshMul
          : 1
  let sum = 0
  let craftProd = 1
  for (const run of h.planets) {
    if (!run.stocked) continue
    const def = defFor(run.id)
    let score = run.score
    if (run.id === 'ash' && (s.memos['ash-dock-credit'] ?? 0) > 0) score = Math.max(score, 0.5)
    if (run.id === 'mercy' && (s.memos['quiet-hours'] ?? 0) > 0) score = Math.min(1, score + 0.05)
    let piece = layer * score * staffMul * surveyMul
    if (run.localPrice != null && chalk > 0) {
      piece *= 1 + HORIZON.localChalkPerRank * chalk + upgradeEffect(s, 'pan-fine-chalk')
    }
    if (def) piece *= localPriceMul(s, def.climate, run.localPrice)
    if (run.id === 'bazaar' && (s.memos['bazaar-permit'] ?? 0) > 0) piece *= 1.1
    if (run.id === 'pantry' && (s.memos['pantry-key'] ?? 0) > 0) piece += 0.02
    if ((s.memos['local-shelf-draft'] ?? 0) > 0) piece *= 1.01
    const craft = craftOf(h, score)
    craftProd *= craft
    sum += piece * craft * headlineAidMul(h, run.id, run.slots)
  }
  if (craftProd > craftCap(s) && craftProd > 0) sum *= craftCap(s) / craftProd
  return 1 + sum * statMul(s, 'planet') * cluster
}

export function routeNetworkMul(s: GameState): number {
  const h = ensureHorizon(s)
  const staffed = exchangeStaffed(s)
  let weight = 0
  for (const circuit of h.circuits) {
    let score = circuit.score
    if (!staffed || score <= 0.8) score *= NETWORK.neglectFloor
    if (circuit.settledKind === 'spoil') score *= 1 - HORIZON.stopSpoilCut
    weight += score
  }
  const mean = h.circuits.length ? weight / h.circuits.length : 0
  const craft = craftOf(h, mean)
  let add = applyCraft(
    s,
    h.circuits.length *
      HORIZON.circuitLayer *
      (1 + upgradeEffect(s, 'ex-bay-liner')) *
      mean *
      craft *
      statMul(s, 'freight'),
    craft,
  )
  if (h.keel.bought) add += h.keel.convoys * 0.25
  return 1 + add
}

export function greenhouseNetworkMul(s: GameState): number {
  const h = ensureHorizon(s)
  if (h.greenhouses <= 0) return 1
  const atrium = (s.builds.storefront ?? 0) >= 9 ? LATE.greenhouseAtriumMul : 1
  const hasNamed = h.plots.some((p) => p.namedId || namedFromChild(p.child))
  if (!hasNamed) {
    // Unnamed beds pay a neglect scrap; Atrium still lifts the claim.
    return 1 + h.greenhouses * HORIZON.greenhouseLayer * NETWORK.neglectFloor * 0.35 * atrium
  }
  const match = plotMatch(s)
  const craft = craftOf(h, match)
  const quality = h.taster === 'quality' ? HORIZON.qualityPlotMul : 1
  const add = applyCraft(
    s,
    h.greenhouses * HORIZON.greenhouseLayer * match * craft * quality * atrium * statMul(s, 'seed'),
    craft,
  )
  return 1 + add
}

export function relayNetworkMul(s: GameState): number {
  const h = ensureHorizon(s)
  if (h.relays <= 0) return 1
  const mean = h.phraseScores.length
    ? h.phraseScores.reduce((a, b) => a + b, 0) / h.phraseScores.length
    : STANDARD_SCORE
  const craft = craftOf(h, mean)
  const foundry = (s.builds.production ?? 0) >= 7 ? LATE.relayFoundryLayerMul : 1
  const add = applyCraft(
    s,
    h.relays * HORIZON.relayLayer * mean * craft * foundry * statMul(s, 'signal'),
    craft,
  )
  return 1 + add
}

export function charterNetworkMul(s: GameState): number {
  const h = ensureHorizon(s)
  let fork = 1
  if (h.charter === 'standard') fork = HORIZON.standardNetwork
  else if (h.charter === 'coop') fork = HORIZON.coopNetworkMul
  // Embassy Annex (civic tier 6): embassies count double in the network mul.
  const annex = (s.builds.civic ?? 0) >= 6 ? LATE.embassyAnnexMul : 1
  const emb = 1 + h.embassies * HORIZON.embassyLayer * annex * statMul(s, 'seal')
  const diplomat = s.staff.some((m) => m.role === 'diplomat')
  const seats = s.politics?.acquisitions ?? 0
  const leak = !diplomat && seats > 0 ? 0.94 : 1
  return (1 + h.clauses.length * HORIZON.clauseLayer) * fork * emb * leak
}

export function endlessNetworkMul(s: GameState): number {
  const h = ensureHorizon(s)
  const div = endlessDivisor(s)
  let add = 0
  for (let i = 0; i < h.endlessPlanets; i++) add += HORIZON.endlessPlanetLayer / (1 + i * div)
  return 1 + add
}

function doorOpen(s: GameState): boolean {
  if ((s.memos['universal-ration'] ?? 0) > 0) return true
  if (s.era < 6) return false
  const cleared = (s.fleet?.pockets ?? []).filter((p) => p.left <= 0).length
  return (s.fleet?.biomass ?? 1) <= 0 || cleared >= 4
}

export function canContinueHorizon(s: GameState): string | null {
  if (s.endingChoice) return 'Ending already chosen.'
  if (!doorOpen(s)) return s.era < 6 ? 'Ending not open yet.' : 'Clear four pockets and feature ration first.'
  if (s.depth?.stewardId == null) return 'Promote a Steward first.'
  if ((s.depth?.ledgerStamps ?? 0) < DEPTH.rationLedgerNeed) {
    return `Stamp the ration ledger ${DEPTH.rationLedgerNeed} times while stars are frozen.`
  }
  // Board agenda if Incorporated; Autonomous wipes Reputation and can strand Incorporate.
  if (
    s.incorporated &&
    (s.stats.boardMeetings ?? 0) < 1 &&
    !(s.board.lastResolvedAt > 0)
  ) {
    return 'Resolve a board agenda first.'
  }
  return null
}

export function continueHorizon(s: GameState): string | null {
  const why = canContinueHorizon(s)
  if (why) return why
  s.endingChoice = 'continue'
  if (s.depth?.stewardId != null) {
    s.depth.stewardKept = true
    const m = s.staff.find((x) => x.id === s.depth.stewardId)
    if (m) s.prestigeCarry.stewardName = m.name
  }
  const h = ensureHorizon(s)
  h.continued = true
  s.memos['survey-office'] = Math.max(1, s.memos['survey-office'] ?? 0)
  setEra(s, 7)
  for (const line of CONTINUE_BEATS) log(s, line, 'era')
  say(s, 'hz-continue-door', 'hz-continue-map', 'hz-nia-desk', 'hz-ivo-can-7')
  return null
}

export function canUnsealHorizon(s: GameState): string | null {
  if (s.endingChoice !== 'reject' || !s.paused) return 'The silence has no latch.'
  return null
}

export function unsealHorizon(s: GameState): string | null {
  const why = canUnsealHorizon(s)
  if (why) return why
  const h = ensureHorizon(s)
  s.paused = false
  h.unsealed = true
  h.continued = true
  s.cash += HORIZON.unsealStipend
  s.memos['survey-office'] = Math.max(1, s.memos['survey-office'] ?? 0)
  // setEra never steps backward, so an Era 12 refusal stays on the list.
  if (h.ending === 'reject' && s.era >= 12) h.ending = null
  setEra(s, 7)
  log(s, 'The silence had a latch. Era 7, and a stipend so the first probe is not a rumor.', 'era')
  say(s, 'hz-unseal', 'hz-unseal-nia')
  return null
}

function needHorizonMemo(s: GameState, id: string, unlock: string): string | null {
  if ((s.memos[id] ?? 0) <= 0) return `Unlocks: buy ${unlock} on the memo desk.`
  return null
}

/** Venture ids whose level-10 fork is set — the forks an endless mutation may ban. */
export function activeForkVentures(s: GameState): string[] {
  return Object.keys(s.ventures ?? {})
    .filter((id) => {
      const v = s.ventures[id]
      return !!v && v.level >= 10 && (v.policy === 'a' || v.policy === 'b')
    })
    .sort()
}

/** Release a kept clause without a seal toll or a toggle count (shared by toggle and the ban). */
function releaseClause(h: HorizonState, id: string) {
  h.clauses = h.clauses.filter((clause) => clause !== id)
  if (h.seatingClause === id) {
    // Released before it sat: the seal is torn up.
    h.seatingClause = null
    h.seatingUntil = 0
  } else if (h.seatedClauses.includes(id)) {
    // Releasing a seated clause vacates the seat.
    h.seatedClauses = h.seatedClauses.filter((clause) => clause !== id)
    h.seatingsDone = Math.max(0, (h.seatingsDone ?? 0) - 1)
  }
}

/** Why this clause / fork cannot be set right now because the mutated list banned it. */
export function endlessBanReason(s: GameState, kind: 'clause' | 'ventureFork', id: string): string | null {
  const ban = s.horizon?.endlessBan
  if (!ban || ban.kind !== kind || ban.id !== id) return null
  return kind === 'clause'
    ? 'The mutated list banned this clause. Toggle another clause to lift the ban.'
    : 'The mutated list banned this fork. Set another venture’s fork to lift the ban.'
}

/** One sentence the UI shows while a ban stands, with how to clear it. Null when nothing is banned. */
export function endlessBanLine(s: GameState): string | null {
  const ban = s.horizon?.endlessBan
  if (!ban) return null
  if (ban.kind === 'clause') {
    const name = CLAUSE_BY_ID[ban.id]?.name ?? ban.id
    return `The mutated list banned ${name}. Toggle another clause to clear it.`
  }
  return `The mutated list banned the ${ban.id} fork. Set another venture’s fork to clear it.`
}

/** Pick (deterministically) a kept clause or a set venture fork to ban. Returns the ban, or null if there is nothing to ban. */
export function pickEndlessBan(s: GameState): EndlessBan | null {
  const h = ensureHorizon(s)
  const pool: EndlessBan[] = [
    ...h.clauses.map((id) => ({ kind: 'clause' as const, id })),
    ...activeForkVentures(s).map((id) => ({ kind: 'ventureFork' as const, id })),
  ]
  if (pool.length === 0) return null
  const hash =
    (Math.imul(s.seed ^ 0x51ed270b, 0x9e3779b1) ^ Math.imul(h.listMutations + 1, 0x85ebca6b) ^
      Math.imul(h.endlessPlanets + 1, 0xc2b2ae35)) >>>
    0
  return pool[hash % pool.length]!
}

/**
 * Apply a standing-list mutation: one line scratches, the Ration Board leans on it, and one kept
 * clause OR one set venture fork is banned until the player edits the loadout.
 */
export function mutateEndlessList(s: GameState): void {
  const h = ensureHorizon(s)
  if (!h.list || h.list.length === 0) return
  const i = h.endlessPlanets % h.list.length
  const line = h.list[i]
  if (line) {
    line.want = `${line.want}|mut${h.listMutations}`
    line.score = Math.min(line.score, STANDARD_SCORE)
    if (s.depth) s.depth.rationLine = i
  }
  const ban = pickEndlessBan(s)
  h.listMutations += 1
  h.endlessBan = ban
  if (ban) enforceEndlessBan(s)
  refreshListScore(s)
  log(s, 'The standing order mutated a line. The Ration Board notices.', 'warn')
  const why = endlessBanLine(s)
  if (why) log(s, why, 'warn')
}

/** A banned clause cannot stay kept; a banned fork cannot stay set. Idempotent; runs on mutation and every tick. */
export function enforceEndlessBan(s: GameState): void {
  const h = s.horizon
  const ban = h?.endlessBan
  if (!ban) return
  if (ban.kind === 'clause') {
    if (h.clauses.includes(ban.id)) releaseClause(h, ban.id)
  } else {
    const v = s.ventures?.[ban.id]
    if (v && v.policy) v.policy = null
  }
}

export function canLaunchProbe(s: GameState): string | null {
  if (s.era < 7) return 'The probe yard opens in Era 7.'
  const gate = needHorizonMemo(s, 'probe-yard', 'Probe Yard')
  if (gate) return gate
  const h = ensureHorizon(s)
  if (!h.endless && h.probes >= PLANETS.length) return 'The named aisle is full.'
  const cost = probeCost(s)
  if (s.cash < cost) return cashNeed(cost)
  return null
}

export function launchProbe(s: GameState): string | null {
  const why = canLaunchProbe(s)
  if (why) return why
  const h = ensureHorizon(s)
  const cost = probeCost(s)
  if (!spendCash(s, cost)) return cashNeed(cost)
  if (h.endless) {
    const index = h.endlessPlanets
    const def = endlessDef(index)
    h.planets.push({
      id: def.id,
      revealed: true,
      stocked: false,
      slots: ['', '', '', '', '', ''],
      score: 0,
      localPrice: null,
      banTag: null,
      lockedSku: null,
    })
    h.endlessPlanets += 1
    log(s, `Probe away. ${def.name} answers.`, 'era')
    if (h.endlessPlanets % 10 === 0) {
      log(s, `${h.endlessPlanets} worlds past the named eight. Each new one adds a little less. There is no chapter 13.`, 'story')
    }
    if (h.list && h.endlessPlanets > 0 && h.endlessPlanets % endlessMutateEvery(s) === 0) {
      mutateEndlessList(s)
    }
    return null
  }
  const def = PLANETS[h.probes]
  if (!def) return 'The named aisle is full.'
  h.planets.push({
    id: def.id,
    revealed: true,
    stocked: false,
    slots: ['', '', '', '', '', ''],
    score: 0,
    localPrice: null,
    banTag: null,
    lockedSku: null,
  })
  h.probes += 1
  log(s, `Probe away. ${def.name} is on the map.`, 'era')
  say(s, PLANET_LINE[def.id] ?? '')
  if (h.probes === 1) say(s, 'hz-first-probe', 'hz-first-probe-clerk', 'hz-standard-button')
  return null
}

function findPlanet(s: GameState, planetId: string) {
  return ensureHorizon(s).planets.find((p) => p.id === planetId) ?? null
}

export function canSetPlanogram(s: GameState, planetId: string, slots: readonly string[]): string | null {
  if (s.era < 7) return 'Planets open in Era 7.'
  ensureHorizon(s)
  const blocked = cleverBlocked(s)
  if (blocked) return blocked
  if (!findPlanet(s, planetId)) return 'That world is still dark.'
  if (!defFor(planetId)) return 'Unknown world.'
  if (slots.length !== 6) return 'A shelf is six slots.'
  return null
}

export function setPlanogram(s: GameState, planetId: string, slots: readonly string[]): string | null {
  const why = canSetPlanogram(s, planetId, slots)
  if (why) return why
  const run = findPlanet(s, planetId)
  const def = defFor(planetId)
  if (!run || !def) return 'That world is still dark.'
  if (run.lockedSku && !slots.includes(run.lockedSku)) {
    return 'Drift locked a SKU on this shelf.'
  }
  const next = slotsOf(slots)
  run.slots = next
  run.score = lockScore(s, scorePlanogram(def, next, run.banTag))
  run.stocked = true
  log(s, `${def.name} stocked at ${Math.round(run.score * 100)}%.`, 'good')
  markDeptStaffed(s, 'survey')
  maybeOpenEras(s)
  return null
}

export function canFileStandardPlanogram(s: GameState, planetId: string): string | null {
  if (s.era < 7) return 'Planets open in Era 7.'
  if (!findPlanet(s, planetId)) return 'That world is still dark.'
  if (!defFor(planetId)) return 'Unknown world.'
  return standardFileGap(s)
}

export function fileStandardPlanogram(s: GameState, planetId: string): string | null {
  const why = canFileStandardPlanogram(s, planetId)
  if (why) return why
  const run = findPlanet(s, planetId)
  const def = defFor(planetId)
  if (!run || !def) return 'That world is still dark.'
  if (run.lockedSku) return 'Drift locked a SKU. Answer the rival or clear the lock.'
  const next = slotsOf(def.standardSlots)
  run.slots = next
  // Intentionally mediocre: lock to STANDARD_SCORE (~0.72), not a clever 0.85 shelf.
  run.score = lockScore(s, STANDARD_SCORE)
  run.stocked = true
  run.localPrice = null
  const credited = creditUniqueFiling(s, 'planogram', !!run.gateCredited, () => {
    run.gateCredited = true
  })
  markStandardFile(s)
  if (credited) {
    log(s, `${def.name} filed the standard at ${Math.round(run.score * 100)}%.`, 'good')
  } else if (run.gateCredited) {
    log(s, `${def.name} refiled at ${Math.round(run.score * 100)}%.`, 'info')
  } else {
    log(s, `${def.name} practice shelf at ${Math.round(run.score * 100)}%.`, 'info')
  }
  markDeptStaffed(s, 'survey')
  maybeOpenEras(s)
  return null
}

export function canSetPlanetPrice(s: GameState, planetId: string, price: number | null): string | null {
  if (s.era < 7) return 'Planets open in Era 7.'
  const gate = needHorizonMemo(s, 'local-chalk', 'Local Chalk')
  if (gate) return gate
  const run = findPlanet(s, planetId)
  if (!run?.stocked) return 'Stock the world before pricing it.'
  if (price != null && (!Number.isFinite(price) || price < PRICE.min || price > PRICE.max)) {
    return `Price stays between ${PRICE.min} and ${PRICE.max}.`
  }
  return null
}

export function setPlanetPrice(s: GameState, planetId: string, price: number | null): string | null {
  const why = canSetPlanetPrice(s, planetId, price)
  if (why) return why
  const run = findPlanet(s, planetId)
  if (!run) return 'That world is still dark.'
  run.localPrice = price
  if (price != null) say(s, 'hz-local-price')
  return null
}

export function canNameCluster(s: GameState, name: string, policy: string): string | null {
  if (s.era < 7) return 'Planets open in Era 7.'
  const gate = needHorizonMemo(s, 'cluster-name', 'Cluster Name')
  if (gate) return gate
  const h = ensureHorizon(s)
  if (stockedCount(s) < 4) return 'Stock four worlds first.'
  if (!isPolicy(policy)) return 'Pick volume, margin, or fresh.'
  const trimmed = name.trim()
  if (!trimmed) return 'The cluster needs a name.'
  if (h.cluster && h.cluster.policy !== policy && h.survey < HORIZON.clusterRetarget) {
    return `Retarget costs ${HORIZON.clusterRetarget} survey.`
  }
  return null
}

export function nameCluster(s: GameState, name: string, policy: string): string | null {
  const why = canNameCluster(s, name, policy)
  if (why) return why
  if (!isPolicy(policy)) return 'Pick volume, margin, or fresh.'
  const h = ensureHorizon(s)
  if (h.cluster && h.cluster.policy !== policy) h.survey -= HORIZON.clusterRetarget
  h.cluster = { name: name.trim().slice(0, 12), policy }
  log(s, `Cluster named ${h.cluster.name} (${policy}).`, 'era')
  say(s, 'hz-four-worlds')
  if (policy === 'fresh') say(s, 'hz-cluster-fresh')
  return null
}

function blankCircuit(h: HorizonState): number {
  return h.circuits.findIndex((c) => !c.origin && !c.dest && !c.good)
}

export function canOpenCircuit(s: GameState): string | null {
  if (s.era < 8) return 'The exchange opens in Era 8.'
  const gate = needHorizonMemo(s, 'exchange-floor', 'Exchange Floor')
  if (gate) return gate
  const h = ensureHorizon(s)
  if (h.circuits.length >= HORIZON.maxCircuits) return 'Eight circuits is the floor.'
  const cost = circuitFreightCost(s)
  if (h.freight < cost) return `Need ${Math.ceil(cost)} freight.`
  return null
}

export function openCircuit(s: GameState): string | null {
  const why = canOpenCircuit(s)
  if (why) return why
  const h = ensureHorizon(s)
  h.freight -= circuitFreightCost(s)
  h.circuits.push({ origin: '', stop: '', dest: '', good: '', load: [], score: 0, stopKind: null })
  return null
}

export function canSetConvoy(
  s: GameState,
  origin: string,
  stop: string,
  dest: string,
  good: string,
  load: readonly string[] = [],
): string | null {
  if (s.era < 8) return 'The exchange opens in Era 8.'
  ensureHorizon(s)
  const blocked = cleverBlocked(s)
  if (blocked) return blocked
  if (!defFor(origin) || !defFor(stop) || !defFor(dest)) return 'Unknown world.'
  if (!SKU_BY_ID[good]) return 'Unknown good.'
  if (load.length > 0 && !packFits(s, load)) return 'That pack does not fit the five bays.'
  const h = s.horizon
  if (blankCircuit(h) < 0 && h.circuits.length >= HORIZON.maxCircuits) return 'Eight circuits is the floor.'
  if (blankCircuit(h) < 0 && h.freight < circuitFreightCost(s)) {
    return `Need ${Math.ceil(circuitFreightCost(s))} freight.`
  }
  return null
}

export function setConvoy(
  s: GameState,
  origin: string,
  stop: string,
  dest: string,
  good: string,
  load: readonly string[] = [],
  index?: number,
): string | null {
  const why = canSetConvoy(s, origin, stop, dest, good, load)
  if (why) return why
  const h = ensureHorizon(s)
  const capacity = convoyCapacity(s)
  const packed = load.map((token) => parsePackToken(token)).filter(Boolean) as { sku: string; size: number }[]
  const tokens = packed.map((row) => packToken(row.sku, row.size))
  const raw =
    tokens.length > 0
      ? convoyScore(origin, dest, good, tokens, capacity)
      : routeMatchScore(origin, dest, good) * STANDARD_SCORE
  let score = lockScore(s, raw)
  if (s.staff.some((m) => m.role === 'stevedore') && score + 1e-9 >= HORIZON.stevedoreStick) {
    score = lockScore(s, Math.max(score, HORIZON.stevedoreStick))
  }
  const circuitIndex =
    typeof index === 'number' && h.circuits[index]
      ? index
      : blankCircuit(h) >= 0
        ? blankCircuit(h)
        : h.circuits.length
  const stopKind = stopPersonality(s.seed, stop, circuitIndex)
  if (
    h.standingRoute &&
    h.standingRoute.origin === origin &&
    h.standingRoute.dest === dest &&
    h.standingRoute.stopKind &&
    h.standingRoute.stopKind !== stopKind
  ) {
    return 'Stop personality changed — refile the standing route.'
  }
  const row = {
    origin,
    stop,
    dest,
    good,
    load: tokens,
    score,
    stopKind,
    settledKind: (typeof index === 'number' ? h.circuits[index]?.settledKind : null) ?? null,
  }
  if (typeof index === 'number' && h.circuits[index]) {
    h.circuits[index] = row
  } else {
    const blank = blankCircuit(h)
    if (blank >= 0) h.circuits[blank] = row
    else {
      h.freight -= circuitFreightCost(s)
      h.circuits.push(row)
    }
  }
  log(s, `Convoy filed at ${Math.round(score * 100)}% (${stopKind}).`, 'good')
  markDeptStaffed(s, 'exchange')
  maybeOpenEras(s)
  return null
}

export interface ConvoySpec {
  origin?: string
  stop?: string
  dest?: string
  good?: string
}

export function canFileStandardConvoy(s: GameState): string | null {
  if (s.era < 8) return 'The exchange opens in Era 8.'
  const gate = needHorizonMemo(s, 'exchange-floor', 'Exchange Floor')
  if (gate) return gate
  const cool = standardFileGap(s)
  if (cool) return cool
  const h = ensureHorizon(s)
  const blank = blankCircuit(h)
  const uncredited = h.circuits.findIndex((c) => !!c.origin && !c.gateCredited)
  // Full floor, or uncredited practice rows, may refile without new freight.
  if (blank < 0 && (h.circuits.length >= HORIZON.maxCircuits || uncredited >= 0)) return null
  if (blank < 0 && h.freight < circuitFreightCost(s)) {
    return `Need ${Math.ceil(circuitFreightCost(s))} freight.`
  }
  return null
}

export function fileStandardConvoy(s: GameState, spec: ConvoySpec = {}): string | null {
  const why = canFileStandardConvoy(s)
  if (why) return why
  const h = ensureHorizon(s)
  const stocked = h.planets.filter((p) => p.stocked).map((p) => p.id)
  const ids = stocked.length >= 2 ? stocked : h.planets.map((p) => p.id)
  const origin = spec.origin || ids[0] || 'pantry'
  const stop = spec.stop || ids[1] || ids[0] || 'cinder'
  const dest = spec.dest || ids[2] || ids[1] || ids[0] || 'orchard'
  // Prefer a good that both ends want so route score is 1 and cargo can hit 0.8.
  let good = spec.good || ''
  if (!SKU_BY_ID[good]) {
    good =
      PLANET_SKUS.find((sku) => goodMatches(origin, sku.id) && goodMatches(dest, sku.id))?.id ??
      PLANET_SKUS.find((sku) => goodMatches(dest, sku.id))?.id ??
      'rice'
  }
  if (!defFor(origin) || !defFor(stop) || !defFor(dest) || !SKU_BY_ID[good]) return 'The standard route is not on the map.'
  const blank = blankCircuit(h)
  const uncredited = h.circuits.findIndex((c) => !!c.origin && !c.gateCredited)
  let circuitIndex = blank >= 0 ? blank : h.circuits.length
  let refile = false
  if (blank < 0 && uncredited >= 0) {
    circuitIndex = uncredited
    refile = true
  } else if (blank < 0 && h.circuits.length >= HORIZON.maxCircuits) {
    circuitIndex = h.circuits.reduce(
      (best, c, i, arr) => (c.score <= arr[best]!.score ? i : best),
      0,
    )
    refile = true
  } else if (blank < 0 && h.freight < circuitFreightCost(s) && uncredited >= 0) {
    circuitIndex = uncredited
    refile = true
  }
  const offers = offerCrates(s, origin, dest, circuitIndex)
  const load = standardPack(s, dest, offers)
  const capacity = convoyCapacity(s)
  // Leave awkward crates so the standard lands ~0.72, not an auto-clear 0.85.
  const raw = Math.min(STANDARD_SCORE, convoyScore(origin, dest, good, load, capacity))
  const score = lockScore(s, STANDARD_SCORE)
  const stopKind = stopPersonality(s.seed, stop, circuitIndex)
  const prior = blank >= 0 ? h.circuits[blank] : h.circuits[circuitIndex]
  const already = !!prior?.gateCredited
  const row = {
    origin,
    stop,
    dest,
    good,
    load,
    score,
    stopKind,
    gateCredited: already,
    settledKind: prior?.settledKind ?? null,
  }
  if (blank >= 0) h.circuits[blank] = row
  else if (refile) h.circuits[circuitIndex] = row
  else {
    h.freight -= circuitFreightCost(s)
    h.circuits.push(row)
  }
  const stored = blank >= 0 ? h.circuits[blank]! : h.circuits[circuitIndex] ?? h.circuits[h.circuits.length - 1]!
  const credited = creditUniqueFiling(s, 'convoy', !!stored.gateCredited, () => {
    stored.gateCredited = true
  })
  markStandardFile(s)
  if (credited) {
    log(s, `Circuit filed the standard at ${Math.round(score * 100)}%.`, 'good')
    const eta =
      HORIZON.settlementEtaSec *
      (1 - Math.min(0.35, upgradeEffect(s, 'settlement-pad'))) *
      stopDelayMul(s)
    h.settlementUntil = Math.max(h.settlementUntil, s.time + eta)
    if (!h.pendingStop && stored.stopKind) {
      h.pendingStop = { index: h.circuits.indexOf(stored), kind: stored.stopKind }
    }
  } else if (stored.gateCredited) {
    log(s, `Circuit refiled at ${Math.round(score * 100)}%.`, 'info')
  } else {
    log(s, `Circuit practice convoy at ${Math.round(score * 100)}%.`, 'info')
  }
  if (h.circuits.length === 1) say(s, 'hz-first-circuit', 'hz-first-circuit-clerk', 'hz-maris-fonts')
  markDeptStaffed(s, 'exchange')
  maybeOpenEras(s)
  return null
}

export function canSetStandingRoute(s: GameState, index: number): string | null {
  if (s.era < 8) return 'The exchange opens in Era 8.'
  if (upgradeEffect(s, 'standing-circuit') <= 0) return 'Buy Standing Circuit before pinning a route.'
  const circuit = ensureHorizon(s).circuits[index]
  if (!circuit?.origin || !circuit.dest) return 'File a circuit before pinning it.'
  return null
}

export function setStandingRoute(s: GameState, index: number): string | null {
  const why = canSetStandingRoute(s, index)
  if (why) return why
  const circuit = s.horizon.circuits[index]!
  s.horizon.standingRoute = {
    origin: circuit.origin,
    stop: circuit.stop,
    dest: circuit.dest,
    good: circuit.good,
    load: [...circuit.load],
    score: circuit.score,
    stopKind: circuit.stopKind ?? null,
  }
  log(s, 'Standing route pinned.', 'info')
  return null
}

export function canClearCircuit(s: GameState, index: number): string | null {
  if (!ensureHorizon(s).circuits[index]) return 'No circuit there.'
  return null
}

export function clearCircuit(s: GameState, index: number): string | null {
  const why = canClearCircuit(s, index)
  if (why) return why
  const h = s.horizon
  const gone = h.circuits[index]!
  h.circuits.splice(index, 1)
  if (h.pendingStop) {
    if (h.pendingStop.index === index) h.pendingStop = null
    else if (h.pendingStop.index > index) h.pendingStop = { ...h.pendingStop, index: h.pendingStop.index - 1 }
  }
  if (
    h.standingRoute &&
    h.standingRoute.origin === gone.origin &&
    h.standingRoute.dest === gone.dest &&
    h.standingRoute.good === gone.good
  ) {
    h.standingRoute = null
  }
  return null
}

export function canPriceWarKeel(s: GameState): string | null {
  if (s.era < 8) return 'Keel opens in Era 8.'
  const keel = ensureHorizon(s).keel
  if (keel.bought) return 'Keel already flies your flag.'
  if (keel.convoys <= 0) return 'Keel has no convoys.'
  if (s.time < keel.frozenUntil) return 'Keel is already frozen.'
  const cost = Math.ceil(keelBuyoutCost(s) * HORIZON.keelWarCostFrac)
  if (s.cash < cost) return cashNeed(cost)
  return null
}

export function priceWarKeel(s: GameState): string | null {
  const why = canPriceWarKeel(s)
  if (why) return why
  const cost = Math.ceil(keelBuyoutCost(s) * HORIZON.keelWarCostFrac)
  if (!spendCash(s, cost)) return cashNeed(cost)
  const keel = s.horizon.keel
  const closed = Math.min(2, keel.convoys)
  keel.convoys -= closed
  keel.frozenUntil = s.time + HORIZON.keelFreezeSec
  log(s, `Price war with Keel & Sons: ${closed} convoy${closed === 1 ? '' : 's'} frozen.`, 'good')
  return null
}

export function canBuyoutKeel(s: GameState): string | null {
  if (s.era < 8) return 'Keel opens in Era 8.'
  const keel = ensureHorizon(s).keel
  if (keel.bought) return 'Keel already flies your flag.'
  const cost = keelBuyoutCost(s)
  if (s.cash < cost) return cashNeed(cost)
  return null
}

export function buyoutKeel(s: GameState): string | null {
  const why = canBuyoutKeel(s)
  if (why) return why
  const cost = keelBuyoutCost(s)
  if (!spendCash(s, cost)) return cashNeed(cost)
  s.horizon.keel.bought = true
  log(s, 'You bought the route. Keel’s convoys fold into the network.', 'era')
  say(s, 'hz-keel-buyout')
  return null
}

function plotTarget(s: GameState): number {
  const h = s.horizon
  const extra = s.projects?.done?.['pj-greenhouse'] ? 1 : 0
  const cap = HORIZON.plotsCap + extra
  if (s.era < 9 && h.greenhouses <= 0) return h.plots.length
  let n = HORIZON.plotsStart + h.greenhouses
  if (h.taster === 'volume') n += HORIZON.volumePlots
  return Math.min(cap, n)
}

export function ensurePlots(s: GameState): void {
  const h = ensureHorizon(s)
  const n = plotTarget(s)
  while (h.plots.length < n) {
    h.plots.push({ a: null, b: null, child: [], plantedSeason: h.season, namedId: null })
  }
}

/** Share of the season's tail the bed lock lifts for (Bed Lock Pad + the Bed Glass project). */
export function bedLockOpenFrac(s: GameState): number {
  const glass = s.projects?.done?.['pj-bed-glass'] ? HORIZON.bedGlassOpen : 0
  return Math.min(HORIZON.bedLockOpenCap, upgradeEffect(s, 'bed-lock-pad') + glass)
}

/** Seconds until the lock lifts this season (0 = open now, null = never lifts early). */
export function bedLockOpensIn(s: GameState): number | null {
  const frac = bedLockOpenFrac(s)
  if (frac <= 0) return null
  const h = ensureHorizon(s)
  return Math.max(0, HORIZON.seasonSec * (1 - frac) - h.seasonT)
}

export function canPlantCross(s: GameState, index: number, a: string, b: string): string | null {
  if (s.era < 9) return 'Cultivars open in Era 9.'
  ensurePlots(s)
  const blocked = cleverBlocked(s)
  if (blocked) return blocked
  if (!s.horizon.plots[index]) return 'That bed is not there.'
  if (!isTrait(a) || !isTrait(b)) return 'Both parents.'
  const locked = s.horizon.bedLockedChore
  if (locked) {
    const opens = bedLockOpensIn(s)
    if (opens === 0) return null
    return opens != null
      ? `The bed is locked to ${locked} for ${Math.ceil(opens)}s more. The standard cross still files.`
      : `The bed is locked to ${locked} until the season turns. The standard cross still files.`
  }
  return null
}

export function plantCross(s: GameState, index: number, a: string, b: string): string | null {
  const why = canPlantCross(s, index, a, b)
  if (why) return why
  if (!isTrait(a) || !isTrait(b)) return 'Both parents.'
  const plot = s.horizon.plots[index]!
  let child = crossTraits(a, b)
  if (s.depth?.verdantTrait && child.includes(s.depth.verdantTrait as TraitId)) {
    child = child.filter((t) => t !== s.depth!.verdantTrait)
    if (child.length === 0) child = [a]
  }
  plot.a = a
  plot.b = b
  plot.child = child
  plot.plantedSeason = s.horizon.season
  const named = namedFromChild(child)
  plot.namedId = named?.id ?? null
  if (named) {
    const score = plotScore(s, child)
    s.horizon.namedBest = Math.max(s.horizon.namedBest, score)
  }
  markDeptStaffed(s, 'cultivar')
  maybeOpenEras(s)
  return null
}

export function canFileStandardCross(s: GameState, index?: number): string | null {
  if (s.era < 9) return 'Cultivars open in Era 9.'
  ensurePlots(s)
  const plots = s.horizon.plots
  if (typeof index === 'number') {
    if (!plots[index]) return 'That bed is not there.'
    return standardFileGap(s)
  }
  // Empty bed preferred; otherwise refile bed 0 for practice / weak-year credit.
  if (plots.length === 0) return 'That bed is not there.'
  return standardFileGap(s)
}

export function fileStandardCross(s: GameState, index?: number): string | null {
  const why = canFileStandardCross(s, index)
  if (why) return why
  const h = s.horizon
  const empty = h.plots.findIndex((p) => p.child.length === 0)
  const idx =
    typeof index === 'number' ? index : empty >= 0 ? empty : 0
  const plot = h.plots[idx]
  const wants = SEASON_WANTS[h.season]
  if (!plot || !wants) return 'That bed is not there.'
  // Weak year on purpose: intense single trait that only half-matches the season.
  plot.a = wants[0]
  plot.b = wants[0]
  plot.child = crossTraits(wants[0], wants[0])
  plot.plantedSeason = h.season
  plot.namedId = null
  const credited = creditPracticeFiling(s, 'cross')
  markStandardFile(s)
  if (credited) {
    h.weakYears += 1
    h.seasonChore = null
    log(s, 'Planted the safe cross. This season will be a weak year.', 'good')
  } else {
    log(s, 'Practice cross — does not count as a weak year yet.', 'info')
  }
  if (h.plots.filter((p) => p.child.length > 0).length === 1) {
    say(s, 'hz-first-planting', 'hz-greenhouse-empty', 'hz-edda-seed')
  }
  markDeptStaffed(s, 'cultivar')
  maybeOpenEras(s)
  return null
}

export function canHarvestPlot(s: GameState, index: number): string | null {
  const plot = ensureHorizon(s).plots[index]
  if (!plot || plot.child.length === 0) return 'Nothing to harvest.'
  return null
}

export function harvestPlot(s: GameState, index: number): string | null {
  const why = canHarvestPlot(s, index)
  if (why) return why
  const h = s.horizon
  const plot = h.plots[index]!
  const score = plotScore(s, plot.child)
  h.seed = Math.min(SEED_CAP, h.seed + 2 * score)
  plot.a = null
  plot.b = null
  plot.child = []
  return null
}

export function canSetTaster(s: GameState, taster: string): string | null {
  if (s.era < 9) return 'Cultivars open in Era 9.'
  if (taster !== 'quality' && taster !== 'volume') return 'Quality or volume.'
  const hired = ensureHorizon(s).taster
  if (hired && hired !== taster) {
    if (s.projects?.done?.['pj-retaste'] && !(s.memos['retaste-spent'] ?? 0)) return null
    return 'The taster is hired.'
  }
  if (hired === taster) return 'Already tasting that way.'
  return null
}

export function setTaster(s: GameState, taster: string): string | null {
  const why = canSetTaster(s, taster)
  if (why) return why
  if (s.horizon.taster && s.horizon.taster !== taster) s.memos['retaste-spent'] = 1
  s.horizon.taster = taster as TasterId
  ensurePlots(s)
  log(s, taster === 'quality' ? 'Taster hired for quality.' : 'Taster hired for volume.', 'era')
  say(s, taster === 'quality' ? 'hz-taster-quality' : 'hz-taster-volume')
  return null
}

export function canBuyGreenhouse(s: GameState): string | null {
  if (s.era < 9) return 'Greenhouses open in Era 9.'
  const gate = needHorizonMemo(s, 'greenhouse-permit', 'Greenhouse Permit')
  if (gate) return gate
  const cost = greenhouseCost(s)
  if (s.cash < cost) return cashNeed(cost)
  return null
}

export function buyGreenhouse(s: GameState): string | null {
  const why = canBuyGreenhouse(s)
  if (why) return why
  const cost = greenhouseCost(s)
  if (!spendCash(s, cost)) return cashNeed(cost)
  s.horizon.greenhouses += 1
  ensurePlots(s)
  log(s, `Greenhouse ${s.horizon.greenhouses} raised.`, 'good')
  return null
}

function pushPhraseScore(h: HorizonState, score: number) {
  h.phraseScores.push(score)
  while (h.phraseScores.length > 8) h.phraseScores.shift()
}

export function spawnPhrase(s: GameState) {
  const h = s.horizon
  const revealed = h.planets.filter((p) => p.revealed)
  const planetId = revealed.length ? revealed[h.phrasesCleared % revealed.length]!.id : 'pantry'
  h.phrase = generatePhrase(s.seed, h.phrasesCleared, planetId)
  if (h.phrasesCleared === 0) say(s, 'hz-first-phrase', 'hz-first-phrase-clerk', 'hz-relay', 'hz-listener-name')
}

function clearPhrase(s: GameState, score: number, habitMatch = false) {
  const h = s.horizon
  pushPhraseScore(h, score)
  h.phrasesCleared += 1
  if (score + 1e-9 >= 1) h.perfectPhrases += 1
  if (habitMatch) h.phraseHabitMatch = true
  h.phrase = null
  h.nextPhraseAt =
    s.time + HORIZON.phraseEvery * Math.max(HORIZON.quickReelFloor, 1 - upgradeEffect(s, 'sg-quick-reel'))
  if (h.phrasesCleared === 1) say(s, 'hz-first-phrase', 'hz-listener-name')
}

export function canCommitPhrase(s: GameState, symbols: readonly string[]): string | null {
  if (s.era < 10) return 'The signal opens in Era 10.'
  const h = ensureHorizon(s)
  if (!h.phrase) return 'No phrase on the wire.'
  const blocked = cleverBlocked(s)
  if (blocked) return blocked
  if (symbols.length !== 4) return 'A phrase is four marks.'
  if (h.signal < HORIZON.phraseSignalCost) return `Need ${HORIZON.phraseSignalCost} signal.`
  if (h.phrase.nightOnly) {
    const nightOk = s.depth?.open === false || s.staff.some((m) => m.role === 'nightOperator')
    if (!nightOk) return 'Night-only phrase. Close the store or hire a Night Operator.'
  }
  if (s.depth?.jammedSymbol && symbols.includes(s.depth.jammedSymbol)) {
    return `Static jammed ${s.depth.jammedSymbol}. Answer the rival first.`
  }
  return null
}

export function commitPhrase(s: GameState, symbols: readonly string[]): string | null {
  const why = canCommitPhrase(s, symbols)
  if (why) return why
  const h = s.horizon
  const phrase = h.phrase
  if (!phrase) return 'No phrase on the wire.'
  h.signal -= HORIZON.phraseSignalCost
  const score = lockScore(s, scorePhrase(phrase, symbols))
  const habitMatch = !!(
    phrase.habit && h.agents.some((a) => a.habit === phrase.habit) && score + 1e-9 >= 1
  )
  clearPhrase(s, score, habitMatch)
  markDeptStaffed(s, 'signal')
  log(s, score > 0 ? `Phrase filed at ${score.toFixed(2)}.` : 'Phrase missed. The till does not notice.', 'info')
  // A clever commit at the fast bar credits a watch too, but only when the desk is free.
  if (phrase.habit && score + 1e-9 >= FAST_SCORE && h.watchUntil <= 0) {
    startHabitWatch(s, phrase.habit)
  }
  maybeOpenEras(s)
  return null
}

/** Start (or extend) the habit watch and post the phrase's habit until it resolves. */
function startHabitWatch(s: GameState, habit: AgentHabit) {
  const h = s.horizon
  const watch = HORIZON.habitWatchSec * (1 - Math.min(0.35, upgradeEffect(s, 'habit-watch-pad')))
  const live = h.watchUntil > s.time && !!h.postedHabit
  h.watchUntil = Math.max(h.watchUntil, s.time + watch)
  if (live && h.postedHabit) h.postedHabit.until = h.watchUntil
  else postHabitWatch(s, habit, h.watchUntil)
}

export function canFileStandardPhrase(s: GameState): string | null {
  if (s.era < 10) return 'The signal opens in Era 10.'
  const cool = standardFileGap(s)
  if (cool) return cool
  const h = ensureHorizon(s)
  if (!h.phrase && h.relays <= 0) return 'Raise a relay before the wire speaks.'
  if (h.signal < HORIZON.phraseSignalCost) return `Need ${HORIZON.phraseSignalCost} signal.`
  if (h.phrase?.nightOnly) {
    const nightOk = s.depth?.open === false || s.staff.some((m) => m.role === 'nightOperator')
    if (!nightOk) return 'Night-only phrase. Close the store or hire a Night Operator.'
  }
  if (s.depth?.jammedSymbol && h.phrase) {
    const jam = s.depth.jammedSymbol
    if (h.phrase.symbols.includes(jam) || fileStandardSymbols(h.phrase).includes(jam)) {
      return `Static jammed ${jam}. Answer the rival first.`
    }
  }
  return null
}

export function fileStandardPhrase(s: GameState): string | null {
  const why = canFileStandardPhrase(s)
  if (why) return why
  const h = s.horizon
  if (!h.phrase) spawnPhrase(s)
  const phrase = h.phrase
  if (!phrase) return 'No phrase on the wire.'
  if (phrase.nightOnly) {
    const nightOk = s.depth?.open === false || s.staff.some((m) => m.role === 'nightOperator')
    if (!nightOk) return 'Night-only phrase. Close the store or hire a Night Operator.'
  }
  if (s.depth?.jammedSymbol) {
    const jam = s.depth.jammedSymbol
    if (phrase.symbols.includes(jam) || fileStandardSymbols(phrase).includes(jam)) {
      return `Static jammed ${jam}. Answer the rival first.`
    }
  }
  if (h.signal < HORIZON.phraseSignalCost) return `Need ${HORIZON.phraseSignalCost} signal.`
  h.signal -= HORIZON.phraseSignalCost
  const guess = [...fileStandardSymbols(phrase)]
  if (upgradeEffect(s, 'phrasebook') > 0) {
    for (let i = 0; i < 4; i++) {
      if (guess[i] !== phrase.symbols[i]) {
        guess[i] = phrase.symbols[i] ?? guess[i]!
        break
      }
    }
  }
  // Standard stays mediocre (< 0.8). Phrasebook / clue can nudge within the slow band.
  let raw = scorePhrase(phrase, guess)
  if (s.ventures.phrasebook?.policy === 'a') raw = Math.min(1, raw + 0.05)
  raw = Math.min(1, raw + phraseClueBonus(s))
  raw = Math.min(0.79, raw)
  const score = lockScore(s, raw)
  const credited = creditPracticeFiling(s, 'phrase')
  markStandardFile(s)
  clearPhrase(s, score, false)
  markDeptStaffed(s, 'signal')
  if (credited) {
    log(s, `Phrase filed the standard at ${Math.round(score * 100)}%.`, 'good')
    // Habit watch starts now and posts the phrase habit; desk gap applies after the watch.
    startHabitWatch(s, phrase.habit ?? 'price')
    // Undo desk gap until watch completes — serial watch then gap.
    if (s.depth) s.depth.lastStandardFileAt = 0
  } else {
    log(s, `Phrase practice at ${Math.round(score * 100)}%.`, 'info')
  }
  maybeOpenEras(s)
  return null
}

function agentLimit(s: GameState): number {
  let n = 1
  if ((s.memos['handler-badge'] ?? 0) > 0) n += 1
  if (upgradeEffect(s, 'handler-desk') > 0) n += 1
  const handlers = s.staff.filter((m) => m.role === 'handler').length
  n += handlers
  const seats = agentSeatBonus(s)
  n += seats
  const cap = HORIZON.agentCap + seats
  return Math.min(cap, n)
}

/** Wanted tags show before the first commit once the survey map project is done. */
export function tagsRevealed(s: GameState, planetId: string): boolean {
  const run = ensureHorizon(s).planets.find((p) => p.id === planetId)
  if (run?.stocked) return true
  return !!s.projects?.done?.['pj-survey-map']
}

export function canHireAgent(s: GameState, habit: string): string | null {
  if (s.era < 10) return 'Agents open in Era 10.'
  if (!isHabit(habit)) return 'Pick a habit.'
  const h = ensureHorizon(s)
  if (h.agents.length >= agentLimit(s)) return 'The desk is full. A handler raises the cap.'
  if (h.signal < HORIZON.agentHireSignal) return `Need ${HORIZON.agentHireSignal} signal.`
  return null
}

export function hireAgent(s: GameState, habit: string): string | null {
  const why = canHireAgent(s, habit)
  if (why) return why
  if (!isHabit(habit)) return 'Pick a habit.'
  const h = s.horizon
  h.signal -= HORIZON.agentHireSignal
  const id = h.agents.reduce((max, agent) => Math.max(max, agent.id), 0) + 1
  const name = AGENT_NAMES[(id - 1) % AGENT_NAMES.length] ?? 'Ada'
  h.agents.push({ id, name, habit, xp: 0 })
  h.agentAt[id] = s.time + 30
  log(s, `${name} hired to ${habit}.`, 'era')
  if (h.agents.length === 1) say(s, 'hz-first-agent', 'hz-agent-wage')
  maybeOpenEras(s)
  return null
}

export function canSetAgentHabit(s: GameState, id: number, habit: string): string | null {
  if (!ensureHorizon(s).agents.some((agent) => agent.id === id)) return 'No such agent.'
  if (!isHabit(habit)) return 'Pick a habit.'
  if (postedAgentId(s) === id) {
    return `Posted on ${s.horizon.postedHabit?.habit} until the watch resolves (${Math.ceil(
      s.horizon.watchUntil - s.time,
    )}s).`
  }
  const phrase = s.horizon.phrase
  if (phrase?.habit && habit !== phrase.habit && s.horizon.agents.length >= 2) {
    // Agents refuse a mismatched habit while a phrase on the wire asks for another.
    const already = s.horizon.agents.filter((a) => a.habit === habit).length
    if (already >= 2) return 'Agents refuse that habit while the wire asks for another.'
  }
  return null
}

export function setAgentHabit(s: GameState, id: number, habit: string): string | null {
  const why = canSetAgentHabit(s, id, habit)
  if (why) return why
  if (!isHabit(habit)) return 'Pick a habit.'
  const agent = s.horizon.agents.find((row) => row.id === id)
  if (!agent) return 'No such agent.'
  agent.habit = habit
  // Matching an unclaimed post takes the job: locked until the watch resolves.
  const post = s.horizon.postedHabit
  if (post && post.agentId == null && s.horizon.watchUntil > 0 && post.habit === habit) {
    post.agentId = agent.id
    log(s, `${agent.name} posted on ${habit} until the watch resolves.`, 'info')
  }
  return null
}

export function canFireAgent(s: GameState, id: number): string | null {
  if (!ensureHorizon(s).agents.some((agent) => agent.id === id)) return 'No such agent.'
  if (postedAgentId(s) === id) return 'Posted on the habit watch. Wait for it to resolve.'
  return null
}

export function fireAgent(s: GameState, id: number): string | null {
  const why = canFireAgent(s, id)
  if (why) return why
  const h = s.horizon
  h.agents = h.agents.filter((agent) => agent.id !== id)
  delete h.agentAt[id]
  return null
}

export function canBuyRelay(s: GameState): string | null {
  if (s.era < 10) return 'Relays open in Era 10.'
  const gate = needHorizonMemo(s, 'relay-mast', 'Relay Mast')
  if (gate) return gate
  const cost = relayCost(s)
  if (s.cash < cost) return cashNeed(cost)
  return null
}

export function buyRelay(s: GameState): string | null {
  const why = canBuyRelay(s)
  if (why) return why
  const cost = relayCost(s)
  if (!spendCash(s, cost)) return cashNeed(cost)
  s.horizon.relays += 1
  log(s, `Relay ${s.horizon.relays} lit.`, 'good')
  if (s.horizon.relays === 1) say(s, 'hz-relay')
  maybeOpenEras(s)
  return null
}

/** Seal a toggle costs once the free ones are gone. Diplomats and the Treaty Table fork cut it. */
export function clauseToggleCost(s: GameState): number {
  const table = hasFork(s, 'treatyTable') ? LATE.treatyTableSealMul : 1
  return HORIZON.clauseToggleSeal * (1 - diplomatSealCut(s)) * table
}

const CLAUSE_DRAFT: Record<string, string> = {
  'open-hours': 'open-hours-draft',
  'cold-law': 'cold-law-draft',
  'fair-stamp': 'fair-stamp-draft',
  'local-shelf': 'local-shelf-draft',
  'night-bell': 'night-bell-draft',
  'one-price': 'one-price-draft',
}

export function canToggleClause(s: GameState, id: string): string | null {
  if (s.era < 11) return 'The charter opens in Era 11.'
  if (!CLAUSE_BY_ID[id]) return 'Unknown clause.'
  if (!s.horizon?.clauses?.includes(id)) {
    const banned = endlessBanReason(s, 'clause', id)
    if (banned) return banned
  }
  const board = needHorizonMemo(s, 'clause-board', 'Clause Board')
  if (board) return board
  const draftId = CLAUSE_DRAFT[id]
  if (draftId) {
    const draft = needHorizonMemo(s, draftId, CLAUSE_BY_ID[id]?.name ?? id)
    if (draft) return draft
  }
  const h = ensureHorizon(s)
  const kept = h.clauses.includes(id)
  // Serial seating: seat (and gap) before the next keep.
  if (!kept) {
    if (h.seatingUntil > s.time) {
      return `Seat the pending clause first (${Math.ceil(h.seatingUntil - s.time)}s).`
    }
    if (h.seatingUntil > 0 && s.time >= h.seatingUntil) {
      return 'Seat the pending clause before keeping another.'
    }
    if (h.seatingGapUntil > s.time) {
      return `Seating gap ${Math.ceil(h.seatingGapUntil - s.time)}s.`
    }
  }
  if (!kept && h.clauses.length >= HORIZON.clauseKeep) return 'Four clauses. The fifth does not fit.'
  if (!kept && id === 'fair-stamp' && h.charter === 'boutique') return 'Fair Stamp leaves no room for a boutique.'
  if (h.clauseToggles >= HORIZON.freeClauseToggles && h.seal < clauseToggleCost(s)) {
    return `Need ${clauseToggleCost(s).toFixed(1)} seal.`
  }
  return null
}

export function toggleClause(s: GameState, id: string): string | null {
  const why = canToggleClause(s, id)
  if (why) return why
  const h = s.horizon
  if (h.clauseToggles >= HORIZON.freeClauseToggles) h.seal -= clauseToggleCost(s)
  h.clauseToggles += 1
  const wasKept = h.clauses.includes(id)
  if (wasKept) h.clauses = h.clauses.filter((clause) => clause !== id)
  else h.clauses.push(id)
  // Editing the loadout with any other clause lifts a standing endless ban.
  if (h.endlessBan?.kind === 'clause' && h.endlessBan.id !== id) {
    h.endlessBan = null
    log(s, 'The mutated list’s ban lifts — the loadout changed.', 'info')
  }
  log(s, h.clauses.includes(id) ? `Kept ${CLAUSE_BY_ID[id]?.name ?? id}.` : `Released ${id}.`, 'info')
  if (h.clauses.includes(id)) {
    say(s, CLAUSE_LINE[id] ?? '')
    const seat =
      HORIZON.clauseSeatingSec * (1 - Math.min(0.35, upgradeEffect(s, 'clause-seat-pad')))
    h.seatingUntil = Math.max(h.seatingUntil, s.time + seat)
    h.seatingClause = id
  } else if (h.seatingClause === id) {
    // Released before it sat: the seal is torn up.
    h.seatingClause = null
    h.seatingUntil = 0
  } else if (h.seatedClauses.includes(id)) {
    // Releasing a seated clause vacates the seat.
    h.seatedClauses = h.seatedClauses.filter((clause) => clause !== id)
    h.seatingsDone = Math.max(0, (h.seatingsDone ?? 0) - 1)
  }
  maybeOpenEras(s)
  return null
}

export function canSetCharter(s: GameState, charter: string): string | null {
  if (s.era < 11) return 'The charter opens in Era 11.'
  if (charter !== 'standard' && charter !== 'boutique' && charter !== 'coop') return 'Standard, boutique, or co-op.'
  const h = ensureHorizon(s)
  const docket = ensureHearing(s)
  if (!hearingDocketClear(s) || docket.pendingClause || h.hearingClause) {
    const left = Math.max(0, docket.needed - docket.answered)
    return left > 0
      ? `Concord hearing docket open — ${left} session${left === 1 ? '' : 's'} left.`
      : 'Answer the pending Concord clause before you sign.'
  }
  if (charter === 'boutique' && h.clauses.includes('fair-stamp')) return 'Fair Stamp leaves no room for a boutique.'
  if (h.charter && h.charter !== charter) {
    if (s.projects?.done?.['pj-reseal'] && !(s.memos['reseal-spent'] ?? 0)) return null
    return 'The charter is signed.'
  }
  if (h.charter === charter) return 'The charter is already signed that way.'
  return null
}

export function setCharter(s: GameState, charter: string): string | null {
  const why = canSetCharter(s, charter)
  if (why) return why
  if (s.horizon.charter && s.horizon.charter !== charter) s.memos['reseal-spent'] = 1
  s.horizon.charter = charter as CharterId
  const label =
    charter === 'standard' ? 'Standard charter signed.' : charter === 'coop' ? 'Co-op charter signed.' : 'Boutique charter signed.'
  log(s, label, 'era')
  say(
    s,
    charter === 'standard' ? 'hz-charter-standard' : charter === 'boutique' ? 'hz-charter-boutique' : 'hz-charter-standard',
    'hz-arun-stamps',
  )
  markDeptStaffed(s, 'charter')
  maybeOpenEras(s)
  return null
}

export function canOpenEmbassy(s: GameState): string | null {
  if (s.era < 11) return 'Embassies open in Era 11.'
  const gate = needHorizonMemo(s, 'embassy-keys', 'Embassy Keys')
  if (gate) return gate
  const h = ensureHorizon(s)
  if (h.embassies >= HORIZON.maxEmbassies) return 'Eight embassies is the ring.'
  const cost = embassyCost(s)
  if (s.cash < cost) return cashNeed(cost)
  return null
}

export function openEmbassy(s: GameState): string | null {
  const why = canOpenEmbassy(s)
  if (why) return why
  const cost = embassyCost(s)
  if (!spendCash(s, cost)) return cashNeed(cost)
  s.horizon.embassies += 1
  log(s, `Embassy ${s.horizon.embassies} opened.`, 'good')
  if (s.horizon.embassies === 1) say(s, 'hz-embassy', 'hz-arun-stamps')
  return null
}

export function ensureList(s: GameState): void {
  const h = ensureHorizon(s)
  if (h.list && h.list.length === 5) return
  const template = pickList(s.seed)
  h.list = template.lines.map((line) => ({
    kind: line.kind,
    want: line.want,
    filled: '',
    score: 0,
    dept: line.dept,
  }))
  h.listScore = 0
  say(s, 'hz-ivo-list', 'hz-ivo-list-clerk', 'hz-last-mean')
}

function lineDeptHard(s: GameState, dept?: string): number {
  if (!dept) return 1
  if (s.depth?.deptEverStaffed?.[dept]) return 1
  // Never staffed matching dept → line scores softer until staffed.
  return 0.85
}

export function refreshListScore(s: GameState) {
  const list = s.horizon.list
  if (!list?.length) {
    s.horizon.listScore = 0
    return
  }
  let sum = 0
  for (let i = 0; i < list.length; i++) {
    const line = list[i]!
    let score = line.score * lineDeptHard(s, line.dept)
    if (s.depth?.rationLine === i) score *= 0.85
    sum += score
  }
  let mean = sum / list.length
  // The Last Aisle (storefront 10): floor bump so the closing aisle always moves the mean.
  if ((s.builds.storefront ?? 0) >= 10) mean = Math.max(mean, LATE.lastAisleListFloor)
  s.horizon.listScore = mean
}

export function canFillLastLine(s: GameState, index: number, filled: string): string | null {
  if (s.era < 12) return 'The last aisle opens in Era 12.'
  const gate = needHorizonMemo(s, 'ivos-list', "Ivo's List")
  if (gate) return gate
  ensureList(s)
  const blocked = cleverBlocked(s)
  if (blocked) return blocked
  const line = s.horizon.list?.[index]
  if (!line) return 'That line is not on the list.'
  if (!filled.trim()) return 'Write something on the line.'
  return null
}

export function fillLastLine(s: GameState, index: number, filled: string): string | null {
  const why = canFillLastLine(s, index, filled)
  if (why) return why
  const line = s.horizon.list?.[index]
  if (!line) return 'That line is not on the list.'
  line.filled = filled.trim().slice(0, 48)
  if (s.horizon.rehearsalScratch === index) s.horizon.rehearsalScratch = -1
  if (line.kind === 'shelf') {
    const planetId = line.want.split('@')[0] ?? ''
    const planet = findPlanet(s, planetId)
    line.score = planet?.stocked ? planet.score : 0
  } else if (line.kind === 'route') {
    const [good, dest] = line.want.split('@')
    const hit = s.horizon.circuits.find((c) => c.good === good && c.dest === dest)
    line.score = hit ? hit.score : 0
  } else if (line.kind === 'crop') {
    line.score = s.horizon.plots.some((p) => p.child.includes(line.want as TraitId)) ? 1 : 0
  } else if (line.kind === 'phrase') {
    line.score = !line.want || line.filled === line.want ? 1 : 0
  } else if (line.kind === 'clause') {
    line.score = !line.want || s.horizon.clauses.includes(line.want) ? 1 : 0
  }
  refreshListScore(s)
  return null
}

function plantTrait(s: GameState, trait: TraitId): boolean {
  ensurePlots(s)
  if (s.horizon.plots.some((p) => p.child.includes(trait))) return true
  const idx = s.horizon.plots.findIndex((p) => p.child.length === 0)
  const plot = s.horizon.plots[idx]
  if (!plot || !isTrait(trait)) return false
  plot.a = trait
  plot.b = trait
  plot.child = crossTraits(trait, trait)
  plot.plantedSeason = s.horizon.season
  return true
}

export function canFileStandardList(s: GameState): string | null {
  if (s.era < 12) return 'The last aisle opens in Era 12.'
  const list = needHorizonMemo(s, 'ivos-list', "Ivo's List")
  if (list) return list
  const gate = needHorizonMemo(s, 'standing-order-last', 'Standing Order, Last')
  if (gate) return gate
  const cool = standardFileGap(s)
  if (cool) return cool
  ensureList(s)
  return null
}

export function fileStandardList(s: GameState): string | null {
  const why = canFileStandardList(s)
  if (why) return why
  const h = s.horizon
  const list = h.list
  if (!list) return 'The list is blank.'
  h.rehearsalScratch = -1
  for (const line of list) {
    if (line.kind === 'shelf') {
      const planetId = line.want.split('@')[0] ?? ''
      if (!canFileStandardPlanogram(s, planetId)) fileStandardPlanogram(s, planetId)
      const planet = findPlanet(s, planetId)
      line.filled = 'standard'
      line.score = planet?.stocked ? planet.score : 0
    } else if (line.kind === 'route') {
      const [good, dest] = line.want.split('@')
      if (!canFileStandardConvoy(s)) fileStandardConvoy(s, { good, dest })
      const hit = h.circuits.find((c) => c.good === good && c.dest === dest)
      line.filled = 'standard'
      line.score = hit ? hit.score : 0
    } else if (line.kind === 'crop') {
      const trait = line.want
      const planted = isTrait(trait) ? plantTrait(s, trait) : false
      line.filled = trait
      line.score = planted ? filedScore(s) : 0
    } else if (line.kind === 'phrase') {
      if (!canFileStandardPhrase(s)) fileStandardPhrase(s)
      line.filled = line.want
      line.score = h.phrasesCleared > 0 ? filedScore(s) : 0
    } else {
      line.filled = line.want
      line.score = !line.want || h.clauses.includes(line.want) ? 1 : 0
    }
  }
  refreshListScore(s)
  // Standard list is intentionally ~0.75 — Accept still wants FAST_SCORE (0.85).
  h.listScore = Math.min(HORIZON.listStandardScore, Math.max(0.7, h.listScore))
  const credited = creditPracticeFiling(s, 'list')
  markStandardFile(s)
  if (credited) {
    log(s, `The list files at ${Math.round(h.listScore * 100)}%.`, 'good')
  } else {
    log(s, `List practice at ${Math.round(h.listScore * 100)}%.`, 'info')
  }
  return null
}

export function canAcceptLastAisle(s: GameState): string | null {
  if (s.era < 12) return 'The last aisle opens in Era 12.'
  const h = ensureHorizon(s)
  if (h.ending) return 'The list is already answered.'
  if (h.listScore + 1e-9 < HORIZON.listAcceptScore) return 'The list is still short of 0.85.'
  if (!h.acceptRehearsal) return 'Run Accept rehearsal first (clever fill + desk gap).'
  if (h.acceptRehearsalUntil > s.time) {
    return `Accept rehearsal cooling (${Math.ceil(h.acceptRehearsalUntil - s.time)}s).`
  }
  return null
}

export function acceptLastAisle(s: GameState): string | null {
  const why = canAcceptLastAisle(s)
  if (why) return why
  const h = s.horizon
  h.ending = 'accept'
  h.endless = true
  s.memos['endless-berth'] = Math.max(1, s.memos['endless-berth'] ?? 0)
  log(s, 'The list is a standing order.', 'era')
  say(s, 'hz-ending-accept', 'hz-endless')
  return null
}

export function canRejectLastAisle(s: GameState): string | null {
  if (s.era < 12) return 'The last aisle opens in Era 12.'
  const gate = needHorizonMemo(s, 'refuse-twice', 'Refuse Twice')
  if (gate) return gate
  const h = ensureHorizon(s)
  if (h.ending) return 'The list is already answered.'
  if (h.listScore + 1e-9 < HORIZON.listAcceptScore) return 'The list is still short of 0.85.'
  return null
}

export function rejectLastAisle(s: GameState): string | null {
  const why = canRejectLastAisle(s)
  if (why) return why
  s.horizon.ending = 'reject'
  s.paused = true
  s.memos['plaque-copy'] = Math.max(1, s.memos['plaque-copy'] ?? 0)
  log(s, 'Refused twice. Last Ration, refused twice.', 'era')
  say(s, 'hz-ending-reject')
  return null
}

export function canSetVenturePolicy(s: GameState, id: string, policy: string): string | null {
  const venture = s.ventures[id]
  if (!venture || venture.level <= 0) return 'Open that till first.'
  if (venture.level < 10) return 'The fork opens at level 10.'
  if (policy !== 'a' && policy !== 'b') return 'Pick a side.'
  const banned = endlessBanReason(s, 'ventureFork', id)
  if (banned) return banned
  if (venture.policy && venture.policy !== policy) return 'That fork is locked.'
  return null
}

export function setVenturePolicy(s: GameState, id: string, policy: string): string | null {
  const why = canSetVenturePolicy(s, id, policy)
  if (why) return why
  const venture = s.ventures[id]
  if (!venture) return 'Open that till first.'
  venture.policy = policy === 'b' ? 'b' : 'a'
  // Setting another venture's fork lifts a standing endless ban.
  const h = ensureHorizon(s)
  if (h.endlessBan?.kind === 'ventureFork' && h.endlessBan.id !== id) {
    h.endlessBan = null
    log(s, 'The mutated list’s ban lifts — a fork was set elsewhere.', 'info')
  }
  return null
}

export function canSetDeputy(s: GameState, staffId: number): string | null {
  if (!s.staff.some((member) => member.id === staffId)) return 'No such hire.'
  return null
}

export function setDeputy(s: GameState, staffId: number, on: boolean): string | null {
  const why = canSetDeputy(s, staffId)
  if (why) return why
  const member = s.staff.find((row) => row.id === staffId)
  if (!member) return 'No such hire.'
  member.deputy = on
  ensureHorizon(s).deputy[staffId] = on
  return null
}

export function queueBuild(s: GameState, id: string): string | null {
  const track = id.trim()
  if (!track) return 'Name the build.'
  ensureHorizon(s).buildQueue = track
  return null
}

export function cancelQueue(s: GameState): string | null {
  ensureHorizon(s).buildQueue = null
  return null
}

function headlineAidMul(h: HorizonState, planetId: string, slots: readonly string[]): number {
  let mul = 1
  for (const aid of h.aids) {
    if (aid.planetId !== planetId) continue
    if (aid.kind === 'layer') mul *= aid.mul
    else if (aid.kind === 'tag') {
      if (slots.some((id) => SKU_BY_ID[id]?.tags.includes(aid.tag))) mul *= aid.mul
    } else if (aid.kind === 'night') {
      const night = slots.some((id) => SKU_BY_ID[id]?.tags.includes('night'))
      mul *= night ? aid.mul : 0.95
    }
  }
  return mul
}

function headlineCashSpend(s: GameState, frac: number): number {
  return Math.min(probeCost(s), Math.max(0, s.cash) * frac)
}

function aidsFrom(def: HeadlineDef, untilTime: number): HorizonState['aids'] {
  if (!def.planetId) return []
  const text = def.helpEffect
  const base = { planetId: def.planetId, untilTime }
  if (/layer ×1\.1/i.test(text)) return [{ ...base, kind: 'layer', tag: '', mul: 1.1 }]
  if (/day tag ×0\.95/i.test(text)) return [{ ...base, kind: 'night', tag: 'night', mul: 1.1 }]
  const tagged = text.match(/([A-Za-z]+)-tagged goods match ×([\d.]+)/i)
  const goods = text.match(/([A-Za-z]+) goods match ×([\d.]+)/i)
  const tagOnly = text.match(/([A-Za-z]+) tag ×([\d.]+)/i)
  const hit = tagged || goods || tagOnly
  if (!hit) return []
  const mul = Number(hit[2])
  if (!(mul > 0)) return []
  return [{ ...base, kind: 'tag', tag: hit[1].toLowerCase(), mul }]
}

function spendHelp(s: GameState, def: HeadlineDef): string | null {
  const cost = def.helpCost
  if (!cost) return null
  const h = s.horizon
  if (cost.currency === 'cash') {
    const spend = headlineCashSpend(s, cost.amount)
    if (!(spend > 0) || s.cash < spend) return 'Need cash.'
    s.cash -= spend
    return null
  }
  if (cost.currency === 'seed' && s.era < 9) return 'Seed opens in Era 9.'
  if (h[cost.currency] < cost.amount) return `Need ${cost.amount} ${cost.currency}.`
  h[cost.currency] -= cost.amount
  return null
}

export function canHelpHeadline(s: GameState): string | null {
  const h = ensureHorizon(s)
  if (!h.headlineId) return 'No headline on the wire.'
  const def = HEADLINE_BY_ID[h.headlineId]
  if (!def) return 'That headline has already moved on.'
  return spendHelpCheck(s, def)
}

function spendHelpCheck(s: GameState, def: HeadlineDef): string | null {
  const cost = def.helpCost
  if (!cost) return null
  const h = s.horizon
  if (cost.currency === 'cash') {
    const spend = headlineCashSpend(s, cost.amount)
    if (!(spend > 0) || s.cash < spend) return 'Need cash.'
    return null
  }
  if (cost.currency === 'seed' && s.era < 9) return 'Seed opens in Era 9.'
  if (h[cost.currency] < cost.amount) return `Need ${cost.amount} ${cost.currency}.`
  return null
}

export function helpHeadline(s: GameState): string | null {
  const why = canHelpHeadline(s)
  if (why) return why
  const h = s.horizon
  const def = HEADLINE_BY_ID[h.headlineId ?? '']
  if (!def) return 'That headline has already moved on.'
  const spent = spendHelp(s, def)
  if (spent) return spent
  const text = def.helpEffect
  if (/freeze keel/i.test(text)) {
    h.keel.frozenUntil = Math.max(h.keel.frozenUntil, s.time + HORIZON.keelFreezeSec)
  }
  if (/\+1 legacy/i.test(text)) {
    const live = s.fleet.barges > 0 || s.fleet.lanes > 0 || s.fleet.franchises > 0
    if (live) s.fleet.legacy += 1
  }
  if (def.id === 'hl-season-telegraph') {
    const next = SEASON_WANTS[(h.season + 1) % 4]
    if (next) log(s, `Next season wants ${next[0]} and ${next[1]}.`, 'info')
  }
  const left = Math.max(30, HORIZON.seasonSec - (s.era >= 9 ? h.seasonT : 0))
  h.aids.push(...aidsFrom(def, s.time + left))
  log(s, def.text, 'good')
  h.headlineId = null
  h.headlineUntil = 0
  return null
}

export function canIgnoreHeadline(s: GameState): string | null {
  const h = ensureHorizon(s)
  if (!h.headlineId) return 'No headline on the wire.'
  return null
}

export function ignoreHeadline(s: GameState): string | null {
  const why = canIgnoreHeadline(s)
  if (why) return why
  const h = s.horizon
  if (h.headlineId === 'hl-ash-flour' && s.era >= 8) h.keel.convoys += 1
  log(s, 'Headline set aside.', 'info')
  h.headlineId = null
  h.headlineUntil = 0
  return null
}


export function canDoSeasonChore(s: GameState, chore: string): string | null {
  if (s.era < 9) return 'Cultivars open in Era 9.'
  if (!(SEASON_CHORES as readonly string[]).includes(chore)) return 'Water, cover, harvest, or rest.'
  const locked = ensureHorizon(s).bedLockedChore
  if (locked && locked !== chore) return `The bed is locked to ${locked} until the season turns.`
  if (s.horizon.seasonChore) return 'This season’s chore is done.'
  const want = expectedSeasonChore(s)
  if (chore !== want) return `This season wants ${want}.`
  return null
}

export function doSeasonChore(s: GameState, chore: string): string | null {
  const why = canDoSeasonChore(s, chore)
  if (why) return why
  s.horizon.seasonChore = chore as SeasonChore
  s.horizon.bedLockedChore = chore as SeasonChore
  const haul =
    HORIZON.yieldHaulSec * (1 - Math.min(0.35, upgradeEffect(s, 'yield-haul-pad')))
  s.horizon.haulUntil = Math.max(s.horizon.haulUntil, s.time + haul)
  log(s, `Season chore: ${chore}. A harvest is ready to bring in.`, 'good')
  return null
}

export function canAnswerHearing(s: GameState): string | null {
  if (s.era < 11) return 'Hearings open in Era 11.'
  const docket = ensureHearing(s)
  const pending = docket.pendingClause || ensureHorizon(s).hearingClause
  if (!pending) {
    if (docket.answered >= docket.needed) return 'Hearing docket is clear.'
    return 'No hearing on the docket.'
  }
  return null
}

/** Amends the Minutes Clerk may strike per docket: one, plus Clause Amend Pad ranks and the Embassy Chair. */
export function amendsPerDocket(s: GameState): number {
  const chair = s.projects?.done?.['pj-embassy-chair'] ? 1 : 0
  return HORIZON.hearingAmendsPerDocket + Math.floor(upgradeEffect(s, 'clause-amend-pad') + 1e-9) + chair
}

/** A Minutes Clerk amends one hearing per docket: the heard clause keeps its seat, loses its grudge. */
export function canAmendHearing(s: GameState): boolean {
  const h = ensureHorizon(s)
  const clause = ensureHearing(s).pendingClause || h.hearingClause
  if (!clause || !s.staff.some((m) => m.role === 'minutesClerk')) return false
  if (h.minutesAmends >= 1 || h.amendedClauses.length >= amendsPerDocket(s)) return false
  return !!CLAUSE_BY_ID[clause]?.grudge && !h.amendedClauses.includes(clause)
}

export function answerHearing(s: GameState): string | null {
  const why = canAnswerHearing(s)
  if (why) return why
  if (!s.depth) return 'No depth.'
  const docket = ensureHearing(s)
  const clause = docket.pendingClause || s.horizon.hearingClause
  if (clause && canAmendHearing(s)) {
    // The clause stays seated; only its grudge is struck from the minutes.
    s.horizon.amendedClauses.push(clause)
    s.horizon.minutesAmends += 1
    log(s, `Minutes Clerk amended ${CLAUSE_BY_ID[clause]?.name ?? clause} — its grudge is struck.`, 'good')
  }
  docket.answered += 1
  docket.pendingClause = null
  s.horizon.hearingClause = null
  s.depth.hearingAnswered = docket.answered >= docket.needed
  if (s.depth.hearingAnswered) {
    log(s, 'Hearing docket clear. The charter may be signed.', 'good')
  } else {
    const left = docket.needed - docket.answered
    log(s, `Hearing answered (${docket.answered}/${docket.needed}). ${left} left.`, 'good')
  }
  return null
}

export function canClearHorizonRival(s: GameState, kind: string): string | null {
  if (!s.depth) return 'No depth.'
  if (kind === 'drift' && !s.depth.driftLockPlanet) return 'No Drift lock.'
  if (kind === 'keelmark' && s.depth.stolenBay < 0) return 'No stolen bay.'
  if (kind === 'verdant' && !s.depth.verdantTrait) return 'No Verdant undercut.'
  if (kind === 'static' && !s.depth.jammedSymbol) return 'No Static jam.'
  if (kind === 'ration' && s.depth.rationLine < 0) return 'No Ration pressure.'
  return null
}

export function clearHorizonRival(s: GameState, kind: string): string | null {
  const why = canClearHorizonRival(s, kind)
  if (why) return why
  const d = s.depth!
  if (kind === 'drift') {
    const planet = findPlanet(s, d.driftLockPlanet ?? '')
    if (planet) planet.lockedSku = null
    d.driftLockPlanet = null
    log(s, 'The locked item is back on sale.', 'good')
  } else if (kind === 'keelmark') {
    d.stolenBay = -1
    d.stolenBayCircuit = -1
    log(s, 'Keelmark bay returned.', 'good')
  } else if (kind === 'verdant') {
    d.verdantTrait = null
    log(s, 'Verdant undercut lifted.', 'good')
  } else if (kind === 'static') {
    d.jammedSymbol = null
    log(s, 'Static jam cleared.', 'good')
  } else if (kind === 'ration') {
    const line = s.horizon.list?.[d.rationLine]
    d.rationLine = -1
    log(s, 'Ration Board pressure eased.', 'good')
    // Mutation Clear Pad: the scarred line comes back a little better.
    const restore = Math.min(HORIZON.mutationClearCap, upgradeEffect(s, 'mutation-clear-pad'))
    if (line && restore > 0 && line.want.includes('|mut')) {
      line.want = line.want.replace(/\|mut\d+$/, '')
      line.score = Math.min(1, line.score + restore)
      refreshListScore(s)
      log(s, 'The mutated line is restored.', 'good')
    }
  }
  return null
}

export function proposePlanogram(s: GameState, planetId: string): string | null {
  if (s.era < 7) return 'Planets open in Era 7.'
  if (!s.staff.some((m) => m.role === 'planogramClerk')) return 'Hire a Planogram Clerk first.'
  const run = findPlanet(s, planetId)
  const def = defFor(planetId)
  if (!run || !def) return 'That world is still dark.'
  const clever: string[] = []
  for (const sku of PLANET_SKUS) {
    if (clever.length >= 6) break
    if (sku.tags.some((t) => def.wanted.includes(t)) && (!def.banned || !sku.tags.includes(def.banned))) {
      clever.push(sku.id)
    }
  }
  while (clever.length < 6) clever.push(def.standardSlots[clever.length] ?? 'can')
  return setPlanogram(s, planetId, clever.slice(0, 6))
}

export function maybeOpenEras(s: GameState) {
  const h = ensureHorizon(s)
  const practice = ensurePractice(s)
  const before = s.era
  if (s.era < 8 && s.era >= 7) {
    // Practice shelves stock but never count — only gateCredited worlds fuel the door.
    const scores = h.planets.filter((p) => p.stocked && p.gateCredited).map((p) => p.score)
    const surveyOk = !!s.depth?.surveyShiftOnce
    const climateOk = (h.climateServed ?? 0) >= HORIZON.climateServeNeed
    const fast =
      surveyOk &&
      climateOk &&
      practice.planogram.left === 0 &&
      countAtLeast(scores, FAST_SCORE) >= HORIZON.fastWorlds
    const slow =
      surveyOk &&
      climateOk &&
      practice.planogram.credited >= HORIZON.slowWorlds &&
      countAtLeast(scores, STANDARD_SCORE) >= HORIZON.slowWorlds
    if (fast || slow) setEra(s, 8)
  }
  if (s.era < 9 && s.era >= 8) {
    const scores = h.circuits.filter((c) => c.gateCredited).map((c) => c.score)
    const stevedoreOk = s.staff.some((m) => m.role === 'stevedore')
    const settled = (h.settlements ?? 0) >= HORIZON.settlementNeed
    const fast =
      practice.convoy.left === 0 &&
      stevedoreOk &&
      settled &&
      countAtLeast(scores, FAST_SCORE) >= HORIZON.fastCircuits
    const slow =
      settled &&
      practice.convoy.credited >= HORIZON.slowCircuits &&
      countAtLeast(scores, STANDARD_SCORE) >= HORIZON.slowCircuits
    if (fast || slow) setEra(s, 9)
  }
  if (s.era < 10 && s.era >= 9) {
    const practiceOk = practice.cross.left === 0
    const haulsOk = (h.haulsDone ?? 0) >= HORIZON.yieldHaulNeed
    const namedFast =
      practiceOk &&
      haulsOk &&
      (h.namedBest + 1e-9 >= FAST_SCORE ||
        h.plots.some((p) => {
          const named = p.namedId || namedFromChild(p.child)?.id
          return !!named && plotScore(s, p.child) + 1e-9 >= FAST_SCORE
        }))
    const slow = practiceOk && haulsOk && h.seasonsSeen >= 4 && h.weakYears >= 2
    if (namedFast || slow) setEra(s, 10)
  }
  if (s.era < 11 && s.era >= 10) {
    const desk = h.agents.length >= 1 && h.relays >= 1
    const watched = (h.watchedPhrases ?? 0) >= HORIZON.habitWatchNeed
    const fast =
      practice.phrase.left === 0 &&
      h.perfectPhrases >= 1 &&
      h.phraseHabitMatch &&
      desk &&
      watched
    const slow = practice.phrase.credited >= HORIZON.slowPhrases && desk && watched
    if (fast || slow) setEra(s, 11)
  }
  if (
    s.era < 12 &&
    s.era >= 11 &&
    h.charter &&
    h.clauses.length >= HORIZON.clauseKeep &&
    hearingDocketClear(s) &&
    (h.seatingsDone ?? 0) >= HORIZON.clauseSeatingNeed
  ) {
    setEra(s, 12)
  }
  if (s.era !== before) say(s, IVO_ERA[s.era] ?? '')
}

export function tickHorizon(s: GameState, dt: number) {
  if (!(dt > 0)) return
  ensureHorizon(s)
  if (s.projects?.done?.['pj-fifth-socket']) {
    s.horizon.socketsUnlocked = Math.max(5, s.horizon.socketsUnlocked)
  }
  if (s.era >= 9) ensurePlots(s)
  enforceEndlessBan(s)
  tickTrickles(s, dt)
  tickSeasons(s, dt)
  tickHorizonVerbs(s)
  tickPhrases(s)
  tickKeel(s)
  tickHeadlines(s)
  // Live ticks are 0.1–0.8s. Offline steps are 1s, and must not file puzzles.
  if (dt < 1) {
    tickDeputies(s)
    tickAgents(s)
  }
  tickWages(s, dt)
  maybeOpenEras(s)
}

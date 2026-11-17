import { cashLabel } from '@/shared/bn'
import { statMul } from './stats'
import {
  FRANCHISE_NAMES,
  LANE_ROUTE_BY_ID,
  isBargeClass,
  isLaneRouteId,
  isManifestStance,
  isOrbitShiftRole,
  type BargeClass,
  type ManifestStance,
} from '../../content/depth'
import { CHARTER_AXES, CHARTER_OPENER } from '../../content/lateEras'
import { upgradeEffect } from '../../content/upgrades'
import { DEPTH, FLEET, HORIZON, LOGISTICS, NETWORK } from '../balance'
import { rebootFee, starLoyaltyResist, up } from '../formulas'
import { clamp, log, round2, setEra, unlockMenu } from '../helpers'
import { chance } from '../rng'
import { bargeFreightPerSec } from './lateHubs'
import { ledgerDayLength } from './rivals'
import {
  syncFleetBiomass,
  type BargeClassId,
  type FranchiseEntry,
  type GameState,
  type LaneEntry,
  type PocketTrip,
} from '../state'

/** 2.0: each franchise costs more than the last (network scale must be earned). */
export function franchiseCost(s: GameState): number {
  return Math.ceil(LOGISTICS.franchiseCash * Math.pow(LOGISTICS.franchiseGrowth, s.fleet.franchises))
}

/** Priced by barges you bought; replication is free and doesn't raise the price. */
export function bargeCost(s: GameState): number {
  const n = s.fleet.launches ?? s.fleet.barges
  let cost = FLEET.bargeLaunchCash * Math.pow(FLEET.bargeGrowth, n)
  // After a planet is stocked, further barge launches get steeper.
  if ((s.horizon?.planets ?? []).some((p) => p.stocked)) {
    const extras = Math.max(0, n - NETWORK.oldLayer.softAfter.barges)
    if (extras > 0) cost *= Math.pow(NETWORK.oldLayer.costSteepen, extras)
  }
  return Math.ceil(cost)
}

export function laneCost(s: GameState): number {
  const n = s.fleet.lanes
  let cost = LOGISTICS.laneCash * Math.pow(LOGISTICS.laneGrowth, n)
  // After barges exist, further lanes get steeper.
  if ((s.fleet.barges ?? 0) > 0) {
    const extras = Math.max(0, n - NETWORK.oldLayer.softAfter.lanes)
    if (extras > 0) cost *= Math.pow(NETWORK.oldLayer.costSteepen, extras)
  }
  return Math.ceil(cost)
}

function ensureLaneList(s: GameState) {
  if (!s.fleet.laneList) s.fleet.laneList = []
  if (!s.fleet.franchiseList) s.fleet.franchiseList = []
  if (!s.fleet.bargeList) s.fleet.bargeList = []
  if (!s.fleet.pockets) s.fleet.pockets = []
  if (!s.fleet.trips) s.fleet.trips = []
  if (s.fleet.nextLaneId == null) s.fleet.nextLaneId = s.fleet.laneList.length + 1
  if (s.fleet.nextFranchiseId == null) s.fleet.nextFranchiseId = s.fleet.franchiseList.length + 1
  if (s.fleet.nextBargeId == null) s.fleet.nextBargeId = s.fleet.bargeList.length + 1
  if (s.fleet.lastManifestAt == null) s.fleet.lastManifestAt = -1e9
}

export function pocketClearPerTrip(pocketMax: number): number {
  return Math.max(1, pocketMax / Math.max(1, FLEET.tripsToClearPocket))
}

export function bargeOnTrip(s: GameState, bargeId: string): PocketTrip | undefined {
  ensureLaneList(s)
  return s.fleet.trips.find((t) => t.bargeId === bargeId && t.status === 'enroute')
}

export function activeTrips(s: GameState): PocketTrip[] {
  ensureLaneList(s)
  return s.fleet.trips.filter((t) => t.status === 'enroute')
}

export function orbitMidCovered(s: GameState): boolean {
  if (s.depth?.orbitMidOnce) return true
  if ((s.depth?.shifts?.daysCoveredMidOrbit ?? 0) >= 1) return true
  const mid = s.depth?.shifts?.mid ?? []
  return mid.some((id) => {
    const m = s.staff.find((x) => x.id === id)
    return m != null && isOrbitShiftRole(m.role)
  })
}

/** Max simultaneous Pocket Ops trips: base 1 + the `pocket-concurrent` (Second Berth) upgrade. */
export function pocketConcurrency(s: GameState): number {
  return DEPTH.pocketTripConcurrent + Math.floor(Math.min(2, upgradeEffect(s, 'pocket-concurrent')))
}

/** Distinct rations that open (uncleared) pockets are asking for right now. */
export function openPocketRations(s: GameState): string[] {
  const out: string[] = []
  for (const p of s.fleet.pockets ?? []) {
    if (p.left > 0 && !out.includes(p.ration)) out.push(p.ration)
  }
  return out
}

/** SAVE 33: two open pockets want different rations but only one hauler may sail. */
export function pocketsOutrunHauler(s: GameState): boolean {
  return openPocketRations(s).length >= 2 && pocketConcurrency(s) <= 1
}

export function canDispatchHauler(
  s: GameState,
  opts: { bargeId?: string; pocketId: string; class?: string; loadRation?: string },
): string | null {
  ensureLaneList(s)
  if (s.era < 5 && !s.fleet.launched) return 'Launch a barge first.'
  const pocket = s.fleet.pockets.find((p) => p.id === opts.pocketId)
  if (!pocket) return 'Unknown pocket.'
  if (pocket.left <= 0) return 'Pocket already cleared.'
  let barge = opts.bargeId ? s.fleet.bargeList.find((b) => b.id === opts.bargeId) : undefined
  if (!barge && opts.class && isBargeClass(opts.class)) {
    barge = s.fleet.bargeList.find(
      (b) => b.class === opts.class && !bargeOnTrip(s, b.id),
    )
  }
  if (!barge) {
    barge = s.fleet.bargeList.find((b) => b.class === 'hauler' && !bargeOnTrip(s, b.id))
  }
  if (!barge) return 'No idle Hauler available.'
  if (barge.class !== 'hauler') return 'Only Haulers run Pocket Ops.'
  if (bargeOnTrip(s, barge.id)) return 'Hauler already en route.'
  if ((barge.restUntil ?? 0) > s.time) {
    return `Hauler resting ${Math.ceil((barge.restUntil ?? 0) - s.time)}s (berth turnaround).`
  }
  const concurrent = pocketConcurrency(s)
  if (activeTrips(s).length >= concurrent) {
    if (concurrent <= 1 && openPocketRations(s).length >= 2) {
      return 'A Hauler is already en route — one hauler feeds one ration at a time. Second Berth (Supply) sends two.'
    }
    return 'A Hauler is already en route — wait for ETA.'
  }
  return null
}

export function dispatchHauler(
  s: GameState,
  opts: { bargeId?: string; pocketId: string; class?: string; loadRation?: string },
) {
  ensureLaneList(s)
  const pocket = s.fleet.pockets.find((p) => p.id === opts.pocketId)
  if (!pocket) return
  let barge = opts.bargeId ? s.fleet.bargeList.find((b) => b.id === opts.bargeId) : undefined
  if (!barge && opts.class && isBargeClass(opts.class)) {
    barge = s.fleet.bargeList.find(
      (b) => b.class === opts.class && !bargeOnTrip(s, b.id),
    )
  }
  if (!barge) {
    barge = s.fleet.bargeList.find((b) => b.class === 'hauler' && !bargeOnTrip(s, b.id))
  }
  if (!barge || barge.class !== 'hauler') return
  if (opts.loadRation) barge.ration = opts.loadRation
  // Unset haulers load the target pocket; sticky ration otherwise.
  if (!barge.ration) barge.ration = pocket.ration
  const tripSec =
    DEPTH.pocketTripSec *
    (1 - Math.min(0.25, upgradeEffect(s, 'pocket-sweep') * 0.15)) *
    (roleOnDuty(s, 'pilot') ? 0.92 : 1)
  const trip: PocketTrip = {
    bargeId: barge.id,
    pocketId: pocket.id,
    ration: barge.ration,
    departAt: s.time,
    arriveAt: s.time + Math.max(60, tripSec),
    status: 'enroute',
  }
  s.fleet.trips.push(trip)
  // Keep recent history bounded.
  if (s.fleet.trips.length > 48) {
    s.fleet.trips = s.fleet.trips.filter((t) => t.status === 'enroute').concat(
      s.fleet.trips.filter((t) => t.status !== 'enroute').slice(-24),
    )
  }
  const match = trip.ration === pocket.ration
  log(
    s,
    match
      ? `Hauler ${barge.id} outbound to ${pocket.ration} pocket · ETA ${Math.round((trip.arriveAt - s.time) / 60)} min.`
      : `Hauler ${barge.id} outbound with ${trip.ration} toward ${pocket.ration} — mismatch risk.`,
    match ? 'info' : 'warn',
  )
}

function resolveArrivedTrips(s: GameState) {
  ensureLaneList(s)
  const rationLife = 1 + upgradeEffect(s, 'ration-life')
  const rationYield =
    1 + upgradeEffect(s, 'ration-yield') * 0.5 + (roleOnDuty(s, 'steward') ? 0.15 : 0)
  const sprint =
    s.depth?.departments?.orbit?.policy === 'sprint' ? 1.12 : 1
  for (const trip of s.fleet.trips) {
    if (trip.status !== 'enroute' || s.time < trip.arriveAt) continue
    const pocket = s.fleet.pockets.find((p) => p.id === trip.pocketId)
    const barge = s.fleet.bargeList.find((b) => b.id === trip.bargeId)
    if (!pocket || pocket.left <= 0) {
      trip.status = 'wasted'
      log(s, `Hauler trip wasted — pocket gone.`, 'warn')
      continue
    }
    if (trip.ration !== pocket.ration) {
      trip.status = 'wasted'
      log(
        s,
        `Wrong ration (${trip.ration} ≠ ${pocket.ration}). Trip wasted.`,
        'warn',
      )
      continue
    }
    const chunk = Math.min(pocket.left, pocketClearPerTrip(pocket.max) * sprint)
    pocket.left = Math.max(0, pocket.left - chunk)
    s.cash = round2(s.cash + chunk * 2)
    s.lifetimeRevenue += chunk * 2
    if (s.categories.ration) {
      const packs = FLEET.rationPerTripClear * rationYield * rationLife * (chunk / Math.max(1, pocketClearPerTrip(pocket.max)))
      if (packs > 0) s.backroom.push({ cat: 'ration', qty: packs, age: 0 })
    }
    trip.status = 'done'
    if (barge) {
      if (!barge.ration) barge.ration = pocket.ration
      const rest =
        DEPTH.berthTurnaroundSec * (1 - Math.min(0.35, upgradeEffect(s, 'berth-turn-pad')))
      barge.restUntil = s.time + Math.max(20, rest)
      s.depth.berthTurnarounds = (s.depth.berthTurnarounds ?? 0) + 1
      log(
        s,
        `Berth turnaround ${s.depth.berthTurnarounds}/${DEPTH.berthTurnaroundNeed} · rest ${Math.ceil(rest)}s.`,
        'info',
      )
    }
    log(
      s,
      pocket.left <= 0
        ? `${pocket.ration} pocket cleared.`
        : `Hauler cut ${pocket.ration} pocket (${Math.ceil((pocket.left / pocket.max) * 100)}% left).`,
      pocket.left <= 0 ? 'good' : 'info',
    )
  }
  syncFleetBiomass(s.fleet)
}

export function matchedLaneCount(s: GameState): number {
  ensureLaneList(s)
  let n = 0
  for (const lane of s.fleet.laneList) {
    if (lane.fuel <= 0 && s.fuel <= 0) continue
    const route = LANE_ROUTE_BY_ID[lane.route]
    if (!route) continue
    const mix = s.depth?.manifests?.[lane.id]
    if (mix === route.prefer) n += 1
  }
  return n
}

export function wetLaneWeight(s: GameState): { matched: number; dry: number } {
  ensureLaneList(s)
  const wet = s.fuel > 0
  if (!wet) return { matched: 0, dry: s.fleet.lanes }
  let matched = 0
  let dry = 0
  for (const lane of s.fleet.laneList) {
    const route = LANE_ROUTE_BY_ID[lane.route]
    const mix = s.depth?.manifests?.[lane.id]
    if (route && mix === route.prefer) matched += 1
    else dry += 1
  }
  // Compat: anonymous lanes (count only) count as dry-ish wet.
  const listed = s.fleet.laneList.length
  if (s.fleet.lanes > listed) dry += s.fleet.lanes - listed
  return { matched, dry }
}

export function canOpenLane(s: GameState, route?: string): string | null {
  if (s.era < 4 && !s.politics.leftRegion) return 'Leave the region first (Era 4).'
  if (route && !isLaneRouteId(route)) return 'Unknown route.'
  if (!route) return 'Pick a route for this lane.'
  const cash = LOGISTICS.laneCash * Math.pow(LOGISTICS.laneGrowth, s.fleet.lanes)
  const ctl = LOGISTICS.laneControl * (1 + s.fleet.lanes)
  if (s.cash < cash && s.control < ctl) return `Need ${cashLabel(Math.ceil(cash))} or ${Math.ceil(ctl)} Control.`
  if (s.fuel < LOGISTICS.laneFuel * 0.5) return 'Fuel buffer too low to launch a lane.'
  return null
}

export function openLane(s: GameState, route: string) {
  ensureLaneList(s)
  const cash = Math.ceil(LOGISTICS.laneCash * Math.pow(LOGISTICS.laneGrowth, s.fleet.lanes))
  const ctl = Math.ceil(LOGISTICS.laneControl * (1 + s.fleet.lanes))
  if (s.control >= ctl) s.control = round2(s.control - ctl)
  else s.cash = round2(s.cash - cash)
  const id = `lane-${s.fleet.nextLaneId++}`
  const entry: LaneEntry = { id, route, fuel: Math.min(40, s.fuel) }
  s.fleet.laneList.push(entry)
  s.fleet.lanes = s.fleet.laneList.length
  // Dispatch Board: manifests are assigned via setManifest (no auto-match).
  unlockMenu(s, 'logistics')
  log(s, `Ocean lane ${LANE_ROUTE_BY_ID[route]?.name ?? route} chartered. Set a manifest.`, 'good')
}

export function canBuyFuel(s: GameState): string | null {
  if (s.era < 4 && s.fleet.lanes <= 0 && !s.politics.leftRegion) return 'Logistics locked.'
  if (s.cash < LOGISTICS.fuelBuyCash) return `Need ${cashLabel(LOGISTICS.fuelBuyCash)}.`
  return null
}

export function buyFuel(s: GameState) {
  ensureLaneList(s)
  s.cash = round2(s.cash - LOGISTICS.fuelBuyCash)
  const cap = LOGISTICS.fuelCapBase + (s.memos['fuel-buffer'] ? LOGISTICS.fuelCapPerBuffer : 0)
  s.fuel = Math.min(cap, s.fuel + LOGISTICS.fuelBuyUnit)
  for (const lane of s.fleet.laneList) {
    lane.fuel = Math.min(40, lane.fuel + LOGISTICS.fuelBuyUnit * 0.25)
  }
  log(s, `Fuel topped up to ${Math.floor(s.fuel)}.`, 'info')
}

export function canFranchise(s: GameState): string | null {
  if (s.fleet.lanes < 1) return 'Open a lane first.'
  const fc = franchiseCost(s)
  if (s.cash < fc) return `Need ${cashLabel(fc)}.`
  return null
}

export function openFranchise(s: GameState) {
  ensureLaneList(s)
  s.cash = round2(s.cash - franchiseCost(s))
  const name = FRANCHISE_NAMES[(s.fleet.nextFranchiseId - 1) % FRANCHISE_NAMES.length]!
  const entry: FranchiseEntry = {
    id: `fr-${s.fleet.nextFranchiseId++}`,
    name,
    loyalty: 0.85,
    defected: false,
  }
  s.fleet.franchiseList.push(entry)
  s.fleet.franchises = s.fleet.franchiseList.length
  s.brand = clamp(s.brand - LOGISTICS.franchiseBrandHit, 0.05, 1)
  log(s, `Franchise ${name} signed. Brand drifts unless sealed.`, 'warn')
}

export function canWinBackFranchise(s: GameState, franchiseId: string): string | null {
  ensureLaneList(s)
  const fr = s.fleet.franchiseList.find((f) => f.id === franchiseId)
  if (!fr) return 'Unknown franchise.'
  if (!fr.defected) return 'Franchise is still loyal.'
  if (s.control < DEPTH.franchiseWinBackControl) {
    return `Need ${DEPTH.franchiseWinBackControl} Control (or walk / circular).`
  }
  return null
}

export function winBackFranchise(s: GameState, franchiseId: string) {
  ensureLaneList(s)
  const fr = s.fleet.franchiseList.find((f) => f.id === franchiseId)
  if (!fr) return
  s.control = round2(s.control - DEPTH.franchiseWinBackControl)
  fr.defected = false
  fr.loyalty = Math.min(1, fr.loyalty + DEPTH.franchiseWinBackLoyalty)
  s.depth.defectionsHandled = (s.depth.defectionsHandled ?? 0) + 1
  if (s.depth.megaMartTarget === franchiseId) {
    s.depth.megaMartTarget = null
    s.depth.megaMartUntil = 0
  }
  log(s, `${fr.name} won back. Loyalty ${Math.round(fr.loyalty * 100)}%.`, 'good')
}

/** Preferred cargo mix for a lane's route (null if the route is unknown). */
export function lanePreferMix(lane: LaneEntry | undefined): string | null {
  if (!lane) return null
  return LANE_ROUTE_BY_ID[lane.route]?.prefer ?? null
}

/** Exam credits tick on `lastCycleAt` (dispatch cycle). */
export function examCycleLeft(s: GameState): number {
  const last = s.depth?.dispatch?.lastCycleAt ?? 0
  if (last <= 0) return 0
  return Math.max(0, DEPTH.dispatchCycleSec - (s.time - last))
}

/** Clean credits tick on their own clock (`lastCleanAt`). */
export function cleanCycleLeft(s: GameState): number {
  const last = s.depth?.dispatch?.lastCleanAt ?? 0
  if (last <= 0) return 0
  return Math.max(0, DEPTH.dispatchCycleSec - (s.time - last))
}

export function examCycleReady(s: GameState): boolean {
  return examCycleLeft(s) <= 0
}

export function cleanCycleReady(s: GameState): boolean {
  return cleanCycleLeft(s) <= 0
}

/** Stance of a lane's current filing (null = never filed matched). */
export function laneStance(s: GameState, laneId: string): ManifestStance | null {
  return s.depth?.dispatch?.laneStances?.[laneId] ?? null
}

/** A lane MegaMart can snipe: cargo unmatched, or filed fast (spent, left open). */
export function laneLeftOpen(s: GameState, lane: LaneEntry): boolean {
  const prefer = lanePreferMix(lane)
  const mix = s.depth?.manifests?.[lane.id]
  if (!prefer || mix !== prefer) return true
  return laneStance(s, lane.id) === 'fast'
}

const STANCE_LABEL: Record<ManifestStance, string> = {
  clean: 'clean',
  exam: 'for inspection',
  fast: 'fast',
}

function waitLabel(sec: number): string {
  return sec >= 90 ? `${Math.ceil(sec / 60)} min` : `${Math.ceil(sec)}s`
}

export function canSetManifest(
  s: GameState,
  laneId: string,
  mix: string,
  stance: ManifestStance = 'exam',
): string | null {
  ensureLaneList(s)
  if (s.era < 4 && s.fleet.lanes <= 0) return 'Logistics locked.'
  const lane = s.fleet.laneList.find((l) => l.id === laneId)
  if (!lane) return 'Unknown lane.'
  const known = ['import', 'frozen', 'household', 'bakery', 'cans', 'produce', 'dairy', 'meat', 'deli', 'ration', 'privateLabel']
  if (!known.includes(mix)) return 'Unknown cargo mix.'
  if (!isManifestStance(stance)) return 'Unknown manifest stance.'
  if (s.time - (s.fleet.lastManifestAt ?? -1e9) < DEPTH.manifestCooldownSec) {
    return 'Manifest still cycling.'
  }
  const prefer = lanePreferMix(lane)
  if (stance !== 'exam' && mix !== prefer) {
    return `A ${STANCE_LABEL[stance]} manifest needs the matched cargo (${prefer ?? 'route mix'}).`
  }
  if (stance === 'clean' && !cleanCycleReady(s)) {
    return `Clean credit cooling — ${waitLabel(cleanCycleLeft(s))} to the next clean filing.`
  }
  if (stance === 'fast' && s.fuel < DEPTH.fastManifestFuel) {
    return `Fast run burns ${DEPTH.fastManifestFuel} fuel — top up first.`
  }
  return null
}

/** Stance filing files the lane's matched cargo (what the Dispatch Board's three choices use). */
export function canSetManifestStance(s: GameState, laneId: string, stance: string): string | null {
  ensureLaneList(s)
  if (!isManifestStance(stance)) return 'Unknown manifest stance.'
  const lane = s.fleet.laneList.find((l) => l.id === laneId)
  if (!lane) return s.era < 4 && s.fleet.lanes <= 0 ? 'Logistics locked.' : 'Unknown lane.'
  const prefer = lanePreferMix(lane)
  if (!prefer) return 'Unknown route.'
  return canSetManifest(s, laneId, prefer, stance)
}

export function setManifestStance(s: GameState, laneId: string, stance: ManifestStance) {
  const lane = s.fleet.laneList.find((l) => l.id === laneId)
  const prefer = lanePreferMix(lane)
  if (!prefer) return
  setManifest(s, laneId, prefer, stance)
}

export function setManifest(s: GameState, laneId: string, mix: string, stance: ManifestStance = 'exam') {
  ensureLaneList(s)
  if (!s.depth.manifests) s.depth.manifests = {}
  if (!s.depth.dispatch) s.depth.dispatch = emptyDispatchSafe(s)
  const d = s.depth.dispatch
  if (!d.laneStances) d.laneStances = {}
  s.depth.manifests[laneId] = mix as import('../../content/categories').CategoryId
  s.fleet.lastManifestAt = s.time
  s.depth.manifestsRun = (s.depth.manifestsRun ?? 0) + 1
  const lane = s.fleet.laneList.find((l) => l.id === laneId)
  const prefer = lane ? lanePreferMix(lane) : null
  const matched = prefer === mix
  const laneName = lane ? (LANE_ROUTE_BY_ID[lane.route]?.name ?? lane.route) : laneId
  if (!matched) {
    delete d.laneStances[laneId]
    d.examLaneId = null
    d.examMix = null
    d.examUntil = 0
    log(s, `Manifest set: ${mix} on ${lane?.route ?? laneId} (mismatch — dry pay).`, 'info')
    return
  }
  // One filing, one stance. Re-filing a lane drops any exam hold it was holding.
  d.laneStances[laneId] = stance
  if (d.examLaneId === laneId && stance !== 'exam') {
    d.examLaneId = null
    d.examMix = null
    d.examUntil = 0
  }
  if (stance === 'exam') {
    const hold = DEPTH.examHoldSec * (1 - Math.min(0.35, upgradeEffect(s, 'exam-hold-pad')))
    d.examLaneId = laneId
    d.examMix = mix
    d.examUntil = s.time + Math.max(30, hold)
    log(
      s,
      `Exam-ready: swear ${mix} on ${laneName} within ${Math.ceil(hold / 60)}m (counts as an exam, not a clean).`,
      'info',
    )
    return
  }
  if (stance === 'clean') {
    d.cleanManifests = (d.cleanManifests ?? 0) + 1
    d.lastCleanAt = s.time
    log(
      s,
      `Clean manifest filed on ${laneName}: ${d.cleanManifests}/${DEPTH.cleanManifestsNeed} (no exam window).`,
      'good',
    )
    return
  }
  // fast
  const cap = Math.max(1, LOGISTICS.fuelCapBase)
  const burst = Math.round(
    LOGISTICS.matchedLaneCashPerSec * DEPTH.fastManifestSec * (0.5 + Math.min(1, s.fuel / cap)),
  )
  s.cash = round2(s.cash + burst)
  s.fuel = Math.max(0, s.fuel - DEPTH.fastManifestFuel)
  if (lane) lane.fuel = Math.max(0, lane.fuel - DEPTH.fastManifestFuel)
  s.fleet.lastManifestAt = s.time - DEPTH.manifestCooldownSec * (1 - DEPTH.fastManifestCooldownFrac)
  d.fastFiled = (d.fastFiled ?? 0) + 1
  log(
    s,
    `Fast run on ${laneName}: +${cashLabel(burst)}, no credit — the lane is left open to MegaMart.`,
    'warn',
  )
}

function emptyDispatchSafe(s: GameState) {
  return {
    cleanManifests: s.depth?.dispatch?.cleanManifests ?? 0,
    lastCycleAt: s.depth?.dispatch?.lastCycleAt ?? 0,
    lastCleanAt: s.depth?.dispatch?.lastCleanAt ?? 0,
    laneStances: {} as Record<string, ManifestStance>,
    fastFiled: s.depth?.dispatch?.fastFiled ?? 0,
    examLaneId: null as string | null,
    examMix: null as string | null,
    examUntil: 0,
    examsHeld: s.depth?.dispatch?.examsHeld ?? 0,
  }
}

/** Missed exam holds slip the cycle without decrementing cleanManifests. */
export function tickExamHold(s: GameState) {
  if (!s.depth?.dispatch) return
  const d = s.depth.dispatch
  if (!d.examLaneId || d.examUntil <= 0) return
  if (s.time < d.examUntil) return
  log(s, 'Inspection window missed. Your clean runs still count.', 'warn')
  d.examLaneId = null
  d.examMix = null
  d.examUntil = 0
}

export function canSwearExam(s: GameState): string | null {
  const d = s.depth?.dispatch
  if (!d?.examLaneId || !d.examMix) return 'No inspection waiting. File a run for inspection first.'
  if (s.time > d.examUntil) return 'The inspection window closed.'
  if (!examCycleReady(s)) {
    return `Next inspection in ${waitLabel(examCycleLeft(s))}.`
  }
  return null
}

/** SAVE 33: an exam is an exam — it never also counts as a clean manifest. */
export function swearExam(s: GameState) {
  const why = canSwearExam(s)
  if (why) return
  const d = s.depth.dispatch
  d.examsHeld = (d.examsHeld ?? 0) + 1
  d.lastCycleAt = s.time
  log(
    s,
    `Exam sworn #${d.examsHeld}/${DEPTH.examHoldNeed} (cleans stay ${d.cleanManifests}/${DEPTH.cleanManifestsNeed}).`,
    'good',
  )
  d.examLaneId = null
  d.examMix = null
  d.examUntil = 0
}

function logisticsStaffed(s: GameState): boolean {
  return roleOnDuty(s, 'dispatcher') || roleOnDuty(s, 'purser')
}

function portBrokerInvoicesClean(s: GameState): boolean {
  if (!s.depth?.contracts?.portBroker) return false
  const unpaid = (s.depth.invoices ?? []).filter((i) => !i.paid && i.cat === 'import')
  return unpaid.length === 0
}

function bargeGateBlocked(s: GameState): string | null {
  const clean = s.depth?.dispatch?.cleanManifests ?? 0
  if (clean < DEPTH.cleanManifestsNeed) {
    return `Need ${DEPTH.cleanManifestsNeed} clean manifests (${clean}/${DEPTH.cleanManifestsNeed}).`
  }
  const exams = s.depth?.dispatch?.examsHeld ?? 0
  if (exams < DEPTH.examHoldNeed) {
    return `Need ${DEPTH.examHoldNeed} sworn exams (${exams}/${DEPTH.examHoldNeed}).`
  }
  if (!logisticsStaffed(s)) return 'Hire a Dispatcher or Purser.'
  const handled = s.depth?.defectionsHandled ?? 0
  const loyal = (s.fleet.franchiseList ?? []).filter((f) => !f.defected).length
  // Prefer a resolved defection; one loyal franchise after opening is the soft path
  // when MegaMart never fires (same spirit as the franchise-stable goal).
  if (handled < 1 && loyal < 1) {
    return 'Win back a defection, or hold one stable franchise.'
  }
  if (!s.categories.import) return 'Unlock Import (Ocean Lane).'
  if (!portBrokerInvoicesClean(s)) {
    return 'Unlock Port Broker and clear import invoices.'
  }
  if (!s.depth?.flagship?.globeCredited) {
    return 'Refile flagship planogram after Import.'
  }
  if ((s.depth?.stars ?? 0) < DEPTH.bargeStarMin) {
    return `Need stars ≥ ${DEPTH.bargeStarMin}.`
  }
  return null
}

export function canLaunchBarge(s: GameState, bargeClass?: string): string | null {
  if (s.era < 5 && !(s.memos['barge-berth'] > 0)) return 'Seed Barge Berth required.'
  if (bargeClass && !isBargeClass(bargeClass)) return 'Unknown barge class.'
  const gate = bargeGateBlocked(s)
  if (gate) return gate
  const bc = bargeCost(s)
  if (s.cash < bc) return `Need ${cashLabel(bc)}.`
  if (s.read < FLEET.bargeLaunchRead && !s.fleet.launched) {
    return `Need ${FLEET.bargeLaunchRead} Read to launch the first barge.`
  }
  return null
}

/** Shared hard gates for barge-berth memo and launch. */
export function canBargeBerth(s: GameState): string | null {
  return bargeGateBlocked(s)
}

export function launchBarge(s: GameState, bargeClass: BargeClass = 'hauler') {
  ensureLaneList(s)
  s.cash = round2(s.cash - bargeCost(s))
  if (!s.fleet.launched) {
    s.read = Math.max(0, s.read - FLEET.bargeLaunchRead)
    s.fleet.launched = true
  }
  const pockets = s.fleet.pockets ?? []
  const open = pockets.find((p) => p.left > 0)
  const entry = {
    id: `bg-${s.fleet.nextBargeId++}`,
    class: bargeClass as BargeClassId,
    ration: bargeClass === 'hauler' ? open?.ration : undefined,
  }
  s.fleet.bargeList.push(entry)
  s.fleet.barges = s.fleet.bargeList.length
  s.fleet.launches = (s.fleet.launches ?? 0) + 1
  unlockMenu(s, 'fleet')
  if (s.era < 5) setEra(s, 5)
  if (!s.categories.ration) {
    s.categories.ration = true
    log(s, 'Ration packs unlocked on the flagship.', 'memo')
  }
  log(s, `${bargeClass} barge #${s.fleet.barges} launched into the dark.`, 'era')
}

export function canAdvanceDriftWar(s: GameState): string | null {
  if (!s.fleet.launched && s.fleet.barges <= 0) return 'Launch a barge first.'
  const step = s.depth?.driftWar?.step ?? 0
  if (step >= 3) return 'Drift war held.'
  if (step === 0 && !s.fleet.warOn) return 'Start Off-Brand contact first.'
  return null
}

export function advanceDriftWar(s: GameState) {
  if (!s.depth.driftWar) s.depth.driftWar = { step: 0 }
  const cur = s.depth.driftWar.step
  if (cur >= 3) return
  const next = (cur + 1) as 1 | 2 | 3
  s.depth.driftWar.step = next
  s.fleet.warOn = true
  const labels = { 1: 'Sight', 2: 'Board', 3: 'Hold' } as const
  log(s, `Drift war: ${labels[next]}. Halo copies your strongest Charter axis.`, 'era')
  if (next === 3) {
    s.fleet.driftWins += 1
    s.fleet.legacy = round2(s.fleet.legacy + FLEET.driftWinLegacy)
  }
}

export function canPromoteSteward(s: GameState, staffId: number): string | null {
  if (s.era < 6) return 'Ration week opens in Era 6.'
  if (s.depth.stewardId != null) return 'Steward already promoted.'
  const m = s.staff.find((x) => x.id === staffId)
  if (!m) return 'Unknown staff.'
  if (m.role !== 'steward' && m.role !== 'pilot' && m.role !== 'produceLead' && m.role !== 'storeManager') {
    return 'Promote a lead (Steward, Pilot, Produce Lead, or Store Manager).'
  }
  return null
}

export function promoteSteward(s: GameState, staffId: number) {
  const m = s.staff.find((x) => x.id === staffId)
  if (!m) return
  s.depth.stewardId = staffId
  log(s, `${m.name} promoted to Steward of the Counter.`, 'era')
}

export function charterSpent(s: GameState): number {
  return Object.values(s.fleet.charter).reduce((a, n) => a + Math.max(0, n), 0)
}

export function refreshCharterCap(s: GameState) {
  const arks = (s.fleet.bargeList ?? []).filter((b) => b.class === 'ark').length
  const arkMul = 1 + arks * (FLEET.arkCharterMul - 1) * 0.15
  s.fleet.charterCap = Math.floor(
    (FLEET.charterBaseCap + s.fleet.legacy * FLEET.charterPerLegacy + s.read * 0.02) * arkMul,
  )
}

/** Effective axis after Shell ↔ Replication conflict. */
export function effectiveCharter(s: GameState, axis: string): number {
  const raw = s.fleet.charter[axis] ?? 0
  if (axis === 'shell') {
    const rep = s.fleet.charter.replication ?? 0
    const reps = (s.fleet.bargeList ?? []).filter((b) => b.class === 'replicator').length
    return Math.max(0, raw * (1 - FLEET.shellRepConflict * (rep * 0.15 + reps * 0.2)))
  }
  if (axis === 'replication') {
    const shell = s.fleet.charter.shell ?? 0
    return Math.max(0, raw * (1 - FLEET.shellRepConflict * shell * 0.2))
  }
  return raw
}

export function canBuyCharterPoint(s: GameState): string | null {
  if (!s.fleet.launched && s.fleet.barges <= 0) return 'Launch a barge first.'
  refreshCharterCap(s)
  const spent = charterSpent(s) + s.fleet.charterPool
  if (spent >= s.fleet.charterCap) return 'Charter cap reached. Earn Legacy or Read.'
  if (s.read < FLEET.readPerCharterPoint) return `Need ${FLEET.readPerCharterPoint} Read.`
  return null
}

export function buyCharterPoint(s: GameState) {
  s.read = Math.max(0, s.read - FLEET.readPerCharterPoint)
  s.fleet.charterPool += 1
  refreshCharterCap(s)
  log(s, `Charter pool +1 (cap ${s.fleet.charterCap}).`, 'info')
}

export function canAllocateCharter(s: GameState, axis: string, delta: number): string | null {
  if (!CHARTER_AXES.some((a) => a.id === axis)) return 'Unknown Charter axis.'
  const cur = s.fleet.charter[axis] ?? 0
  if (delta > 0) {
    if (s.fleet.charterPool < delta) return 'No unspent Charter points.'
  } else if (delta < 0) {
    if (cur + delta < 0) return 'Axis already at 0.'
  } else return 'No change.'
  return null
}

export function allocateCharter(s: GameState, axis: string, delta: number) {
  const cur = s.fleet.charter[axis] ?? 0
  if (delta > 0) {
    s.fleet.charterPool -= delta
    s.fleet.charter[axis] = cur + delta
  } else {
    s.fleet.charter[axis] = cur + delta
    s.fleet.charterPool -= delta // delta negative → pool increases
  }
  log(s, `Charter ${axis}: ${s.fleet.charter[axis]} (pool ${s.fleet.charterPool}).`, 'info')
}

/** Guardian safety preset — shell-heavy opener; one soft use path before extinction. */
export function canGuardianPreset(s: GameState): string | null {
  if (s.fleet.barges <= 0 && !s.fleet.launched) return 'No fleet.'
  if (s.fleet.guardianUsed && s.fleet.barges > FLEET.bargeSoftFloor) {
    return 'Guardian already applied this pressure cycle.'
  }
  return null
}

export function applyGuardianPreset(s: GameState) {
  refreshCharterCap(s)
  const total = Object.values(CHARTER_OPENER).reduce((a, n) => a + n, 0)
  let refund = 0
  for (const a of CHARTER_AXES) {
    refund += s.fleet.charter[a.id] ?? 0
    s.fleet.charter[a.id] = 0
  }
  s.fleet.charterPool += refund
  let need = Math.min(total, s.fleet.charterCap)
  if (s.fleet.charterPool < need) {
    s.fleet.charterPool = need
  }
  for (const a of CHARTER_AXES) {
    const want = CHARTER_OPENER[a.id] ?? 0
    const give = Math.min(want, s.fleet.charterPool, need)
    s.fleet.charter[a.id] = give
    s.fleet.charterPool -= give
    need -= give
  }
  if (s.fleet.barges < FLEET.bargeSoftFloor && s.fleet.biomass > 0) {
    s.fleet.barges = FLEET.bargeSoftFloor
  }
  s.fleet.guardianUsed = true
  log(s, 'Guardian preset locked in. Last barge protected while biomass remains.', 'recovery')
}

export function canRebootFleet(s: GameState): string | null {
  if (!s.fleet.launched) return 'Fleet not launched.'
  const fee = rebootFee(s)
  if (s.cash < fee) return `Need ${cashLabel(Math.ceil(fee))} reboot fee.`
  return null
}

export function rebootFleet(s: GameState) {
  const fee = round2(rebootFee(s))
  s.cash = round2(s.cash - fee)
  let refund = 0
  for (const a of CHARTER_AXES) {
    refund += s.fleet.charter[a.id] ?? 0
    s.fleet.charter[a.id] = 0
  }
  s.fleet.charterPool += refund
  s.fleet.guardianUsed = false
  log(s, `Reboot Fleet: Charter refunded (${refund} pts). Fee $${fee.toFixed(0)}.`, 'memo')
}

export function startDriftWar(s: GameState) {
  s.fleet.warOn = true
  if (!s.depth.driftWar) s.depth.driftWar = { step: 0 }
  if (s.depth.driftWar.step < 1) s.depth.driftWar.step = 1
  log(s, 'Off-Brand contact. Drift war started. Legacy is on the table.', 'era')
}

export function pocketsCleared(s: GameState): number {
  return (s.fleet.pockets ?? []).filter((p) => p.left <= 0).length
}

export function era6GateReady(s: GameState): boolean {
  const rationFacing = !!s.depth?.facings?.ration
  const hold = (s.depth?.driftWar?.step ?? 0) >= 3
  const stars = (s.depth?.stars ?? 0) >= DEPTH.era6StarMin
  // Pocket clears must come from Pocket Ops trips — no idle / checkbox drain.
  const tripsDone = (s.fleet.trips ?? []).filter((t) => t.status === 'done').length
  const turns = (s.depth?.berthTurnarounds ?? 0) >= DEPTH.berthTurnaroundNeed
  return (
    pocketsCleared(s) >= FLEET.era6PocketsNeed &&
    tripsDone >= FLEET.era6PocketsNeed &&
    turns &&
    rationFacing &&
    orbitMidCovered(s) &&
    hold &&
    stars
  )
}

export function canStampLedger(s: GameState): string | null {
  if (s.era < 6) return 'Ration ledger opens in Era 6.'
  if (!starsFrozenNow(s)) return 'Stars are not frozen — wait for ration week.'
  const day = Math.floor(s.time / ledgerDayLength(s))
  if ((s.depth?.lastLedgerDay ?? -1) >= day) return 'Already stamped this shift-day.'
  return null
}

function starsFrozenNow(s: GameState): boolean {
  const until = s.depth?.rationWeekUntil ?? 0
  return s.era >= 6 && until > 0 && s.time < until
}

export function stampLedger(s: GameState) {
  const why = canStampLedger(s)
  if (why) return
  const day = Math.floor(s.time / ledgerDayLength(s))
  s.depth.ledgerStamps = (s.depth.ledgerStamps ?? 0) + 1
  s.depth.lastLedgerDay = day
  log(s, `Ration ledger stamped ${s.depth.ledgerStamps}/${DEPTH.rationLedgerNeed}.`, 'good')
}

function roleOnDuty(s: GameState, role: string): boolean {
  return s.staff.some((m) => m.role === role)
}

/** Logistics fuel burn + franchise loyalty + Control. */
export function tickLogistics(s: GameState, dt: number) {
  if (s.era < 4 && s.fleet.lanes <= 0) return
  ensureLaneList(s)

  const cap = LOGISTICS.fuelCapBase + (s.memos['fuel-buffer'] ? LOGISTICS.fuelCapPerBuffer : 0)
  const dispatchMul = roleOnDuty(s, 'dispatcher') ? DEPTH.dispatcherFuelMul : 1
  const seal =
    1 -
    Math.min(
      0.45,
      up(s, 'sealant') * 0.04 + upgradeEffect(s, 'berth-time') + upgradeEffect(s, 'manifest-seal') * 0.5,
    )

  if (s.fleet.lanes > 0) {
    const logPol = s.depth?.departments?.logistics?.policy
    const scheduleFuel = logPol === 'schedule' ? 1 / DEPTH.logisticsScheduleCleanMul : 1
    const pushFreight = logPol === 'push-freight' ? DEPTH.logisticsPushFreightMul : 1
    const burn =
      LOGISTICS.fuelBurnPerLanePerSec * s.fleet.lanes * dt * seal * dispatchMul * scheduleFuel
    s.fuel = Math.max(0, s.fuel - burn)
    for (const lane of s.fleet.laneList) {
      lane.fuel = Math.max(0, lane.fuel - burn / Math.max(1, s.fleet.lanes))
    }
    if (s.fuel <= 0) {
      // Dry lanes idle
    } else {
      const { matched, dry } = wetLaneWeight(s)
      s.control = round2(s.control + s.fleet.lanes * 0.02 * dt * pushFreight)
      s.cash = round2(
        s.cash +
          matched *
            LOGISTICS.matchedLaneCashPerSec *
            dt *
            (0.5 + s.fuel / Math.max(1, cap)) *
            pushFreight +
          dry * LOGISTICS.dryLaneCashPerSec * dt * (0.5 + s.fuel / Math.max(1, cap)) * pushFreight,
      )
    }
  }

  if (s.era >= 4) {
    s.control = round2(s.control + Math.log10(1 + Math.max(0, s.cash)) * LOGISTICS.controlPerLogCash * dt)
    if (roleOnDuty(s, 'purser')) {
      const lvl = s.staff.find((m) => m.role === 'purser')?.level ?? 1
      s.control = round2(
        s.control +
          Math.log10(1 + Math.max(0, s.cash)) *
            DEPTH.purserControlPerSec *
            (1 + (lvl - 1) * 0.05) *
            (1 + upgradeEffect(s, 'purser-books')) *
            dt,
      )
    }
  }

  // Franchise loyalty / defection (Star Board soft-caps hold).
  const liaisonMul = roleOnDuty(s, 'franchiseLiaison') ? DEPTH.liaisonDriftMul : 1
  const starResist = starLoyaltyResist(s)
  const resist = ((1 + up(s, 'drift-resist') * 0.03) * starResist) / liaisonMul
  for (const fr of s.fleet.franchiseList) {
    if (fr.defected) continue
    fr.loyalty = clamp(
      fr.loyalty - (DEPTH.franchiseLoyaltyDrift * dt) / resist - (LOGISTICS.brandDriftPerFranchise * dt) / resist,
      0,
      1,
    )
    if (fr.loyalty < DEPTH.franchiseDefectAt) {
      fr.defected = true
      s.brand = clamp(s.brand - 0.06, 0.05, 1)
      log(s, `${fr.name} defected. Win them back with Control, a walk, or a circular.`, 'warn')
    }
  }
  s.fleet.franchises = s.fleet.franchiseList.length

  if (s.fleet.franchiseList.length > 0) {
    s.brand = clamp(
      s.brand -
        (LOGISTICS.brandDriftPerFranchise *
          s.fleet.franchiseList.filter((f) => !f.defected).length *
          dt) /
          resist,
      0.05,
      1,
    )
  }

  // MegaMart pressure: drifting franchises, or unassigned / mismatched manifests.
  // SAVE 33: a lane filed 'fast' counts as left open — MegaMart snipes the lane you spent.
  const unassignedLanes = s.fleet.laneList.filter((lane) => laneLeftOpen(s, lane)).length
  if (s.era >= 4 && (s.fleet.franchiseList.some((f) => f.loyalty < 0.5 && !f.defected) || unassignedLanes > 0)) {
    if (!s.depth.megaMartTarget && s.time - (s.depth.megaMartUntil || 0) > DEPTH.megaMartGapSec) {
      const target =
        s.fleet.franchiseList.find((f) => f.loyalty < 0.5 && !f.defected) ??
        s.fleet.franchiseList.find((f) => !f.defected)
      const chanceMul = unassignedLanes > 0 ? 0.05 : 0.02
      if (target && chance(s, chanceMul * dt)) {
        s.depth.megaMartTarget = target.id
        s.depth.megaMartUntil = s.time + DEPTH.megaMartDurationSec
        log(
          s,
          unassignedLanes > 0
            ? `MegaMart snipes open lanes — circling ${target.name}. Set manifests or win them back.`
            : `MegaMart is circling ${target.name}. Price war or buyout defends.`,
          'warn',
        )
      }
    }
  }
  if (s.depth.megaMartTarget && s.time >= s.depth.megaMartUntil) {
    const fr = s.fleet.franchiseList.find((f) => f.id === s.depth.megaMartTarget)
    if (fr && !fr.defected) {
      fr.defected = true
      fr.loyalty = 0
      log(s, `MegaMart bought ${fr.name}. Price war next time — or win them back.`, 'warn')
    }
    // Unassigned lanes go dry when MegaMart lands the snipe.
    if (unassignedLanes > 0) {
      for (const lane of s.fleet.laneList) {
        if (laneLeftOpen(s, lane)) lane.fuel = 0
      }
      log(s, 'MegaMart sniped unassigned lanes — fuel drained until you rematch cargo.', 'warn')
    }
    s.depth.megaMartTarget = null
  }

  s.fuel = Math.min(cap, s.fuel)
}

/** Survey strength after upgrades (feeds harvest). */
function surveyPower(s: GameState): number {
  const longChart = upgradeEffect(s, 'long-chart')
  const chartRoom = upgradeEffect(s, 'chart-room')
  return (
    effectiveCharter(s, 'survey') *
    (1 + up(s, 'survey-yield') * 0.05 + chartRoom + longChart * 0.5)
  )
}

/** Biomass harvested per barge per second, with Charter and upgrades. */
export function harvestPerBarge(s: GameState): number {
  return (
    FLEET.harvestPerBargePerSec *
    (1 + surveyPower(s) * 0.08) *
    (1 + effectiveCharter(s, 'transit') * 0.05) *
    (1 + upgradeEffect(s, 'sp-hull-yard')) *
    (1 + upgradeEffect(s, 'pocket-sweep') * 0.5) *
    (roleOnDuty(s, 'pilot') ? 1.08 : 1) *
    statMul(s, 'harvest')
  )
}

/** Whole-fleet harvest per second — Pocket Ops is trip-based; estimate from en-route clears. */
export function fleetHarvestPerSec(s: GameState): number {
  if (s.fleet.barges <= 0 || s.fleet.biomass <= 0) return 0
  const enroute = activeTrips(s)
  if (enroute.length === 0) return 0
  let rate = 0
  for (const trip of enroute) {
    const pocket = s.fleet.pockets.find((p) => p.id === trip.pocketId)
    if (!pocket || pocket.left <= 0 || trip.ration !== pocket.ration) continue
    const left = Math.max(1, trip.arriveAt - s.time)
    rate += pocketClearPerTrip(pocket.max) / left
  }
  return rate
}

/** Expected free barges per minute from the Replication axis. */
export function replicationPerMin(s: GameState): number {
  const r = effectiveCharter(s, 'replication')
  if (s.fleet.barges <= 0 || r <= 0 || s.fleet.biomass <= 0) return 0
  const reps = (s.fleet.bargeList ?? []).filter((b) => b.class === 'replicator').length
  return Math.min(0.2, FLEET.replicationPerSec * r * (1 + reps * 0.5)) * 60
}

/** Shell + Brand Seal resistance in a Drift war (divides losses). */
export function warResist(s: GameState): number {
  const thick = upgradeEffect(s, 'thick-shell')
  const shell = effectiveCharter(s, 'shell') * (1 + up(s, 'shell-eff') * 0.04 + thick)
  const brandSeal = s.fleet.charter['brand-seal'] ?? 0
  const hull = roleOnDuty(s, 'hullTech') ? 1.1 : 1
  return (
    (1 + shell * 0.1 + brandSeal * 0.12 + up(s, 'soft-hull') * 0.03 + thick * 0.5) *
    hull *
    (1 + upgradeEffect(s, 'drift-brace') * 0.3)
  )
}

export function activeFranchiseCount(s: GameState): number {
  ensureLaneList(s)
  if (s.fleet.franchiseList.length === 0) return s.fleet.franchises
  return s.fleet.franchiseList.filter((f) => !f.defected).length
}

export function tickFleet(s: GameState, dt: number) {
  tickExamHold(s)
  if (s.era < 5 && !s.fleet.launched) return
  ensureLaneList(s)
  refreshCharterCap(s)

  const longChart = upgradeEffect(s, 'long-chart')
  const replication = effectiveCharter(s, 'replication')
  const brandSeal = s.fleet.charter['brand-seal'] ?? 0

  // Pocket Ops: hauler trips resolve on ETA (no idle biomass drain).
  resolveArrivedTrips(s)

  // Replicator barges + replication axis
  const reps = (s.fleet.bargeList ?? []).filter((b) => b.class === 'replicator').length
  if (s.fleet.barges > 0 && (replication > 0 || reps > 0) && s.fleet.biomass > 0) {
    const p = Math.min(
      0.25,
      (FLEET.replicationPerSec * replication + FLEET.replicatorCopyChance * reps) * dt,
    )
    if (chance(s, p)) {
      const donor = s.fleet.bargeList[0]
      const cls = (donor?.class ?? 'hauler') as BargeClassId
      // Shell conflict: high shell reduces copy chance already via effectiveCharter
      s.fleet.bargeList.push({
        id: `bg-${s.fleet.nextBargeId++}`,
        class: cls === 'ark' ? 'hauler' : cls,
        ration: donor?.ration,
      })
      s.fleet.barges = s.fleet.bargeList.length
      log(s, `Replication: barge count ${s.fleet.barges}.`, 'info')
    }
  }

  if (s.era >= 8 && s.horizon) {
    const haul = bargeFreightPerSec(s) * dt
    if (haul > 0) s.horizon.freight = Math.min(HORIZON.freightCap, (s.horizon.freight ?? 0) + haul)
  }

  if (s.fleet.biomass > 0 && s.fleet.barges < FLEET.bargeSoftFloor) {
    s.fleet.barges = FLEET.bargeSoftFloor
  }

  const warStep = s.depth?.driftWar?.step ?? 0
  if ((s.fleet.warOn || warStep > 0) && s.fleet.barges > 0) {
    const resist = warResist(s)
    const legacyMul = 1 + up(s, 'legacy-gain') * 0.05 + longChart * 0.4
    const stepMul = 1 + warStep * 0.25
    s.fleet.legacy = round2(s.fleet.legacy + (FLEET.warLegacyGainPerSec / resist) * legacyMul * stepMul * dt)
    // Halo copies strongest axis until shift/fight (flavor: slight brand nick)
    if (warStep >= 1) {
      let best = 'shell'
      let bestV = -1
      for (const a of CHARTER_AXES) {
        const v = s.fleet.charter[a.id] ?? 0
        if (v > bestV) {
          bestV = v
          best = a.id
        }
      }
      if (bestV > 0 && chance(s, 0.01 * dt * warStep)) {
        s.brand = clamp(s.brand - 0.01, 0.05, 1)
        log(s, `Halo copies your ${best} doctrine.`, 'warn')
      }
    }
    if (chance(s, (FLEET.warBargeLossChance / resist) * dt * 60 * stepMul)) {
      if (s.fleet.barges > FLEET.bargeSoftFloor || s.fleet.biomass <= 0) {
        if (s.fleet.bargeList.length > 0) s.fleet.bargeList.pop()
        s.fleet.barges = Math.max(
          s.fleet.biomass > 0 ? FLEET.bargeSoftFloor : 0,
          s.fleet.bargeList.length,
        )
        s.fleet.legacy = Math.max(0, round2(s.fleet.legacy - FLEET.warLegacyLossOnHit))
        log(s, `Drift hit. Barges ${s.fleet.barges}. Legacy nicked.`, 'warn')
        if (s.fleet.barges <= FLEET.bargeSoftFloor + 1 && !s.fleet.guardianUsed) {
          log(s, 'Fleet under pressure — Guardian preset available.', 'recovery')
        }
      } else {
        s.fleet.legacy = round2(s.fleet.legacy + FLEET.driftWinLegacy * 0.05)
      }
    }
  }

  if (brandSeal > 0 && s.brand < 1) {
    s.brand = clamp(s.brand + brandSeal * 0.002 * dt, 0, 1)
  }

  // Era 6 gate: 4 pockets + ration facing + Orbit Mid + Hold + stars
  if (era6GateReady(s) && s.fleet.launched) {
    if (s.era < 6) {
      setEra(s, 6)
      s.depth.rationWeekUntil = s.time + DEPTH.rationWeekSec * (1 + upgradeEffect(s, 'ration-week-pad'))
      s.depth.starsFrozenAt = s.depth.stars
      log(s, 'Four pockets cleared. Ration week begins and your star rating holds still.', 'era')
    }
  }
}

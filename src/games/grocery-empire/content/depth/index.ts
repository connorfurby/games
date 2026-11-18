export {
  FACINGS,
  FACING_BY_ID,
  facingsFor,
  type FacingDef,
} from './facings'
export {
  DEPARTMENTS,
  DEPARTMENT_BY_ID,
  policyOf,
  type DepartmentDef,
  type DeptPolicyDef,
} from './departments'
export { CONTRACTS, CONTRACT_BY_ID, type ContractDef } from './contracts'
export {
  STORE_TRAITS,
  STORE_TRAIT_BY_ID,
  PLACE_TRAIT_IDS,
  isPlaceTraitId,
  policyMatchesTrait,
  type PlaceTraitId,
  type PlaceTraitDef,
} from './placeTraits'
export {
  LANE_ROUTES,
  LANE_ROUTE_BY_ID,
  LANE_ROUTE_IDS,
  isLaneRouteId,
  POCKET_RATIONS,
  BARGE_CLASSES,
  FRANCHISE_NAMES,
  isBargeClass,
  type LaneRouteDef,
  type PocketRation,
  type BargeClass,
} from './lanes'
export {
  REGULARS,
  REGULAR_BY_ID,
  pickNextRegular,
  type RegularDef,
} from './regulars'
export {
  scoreFlagship,
  standardLayout,
  cleverLayout,
  isColdCat,
} from './flagshipPlanogram'

import type { CategoryId } from '../categories'
import { DEPTH, HORIZON } from '../../sim/balance'

export interface DeptRuntime {
  leadId: number | null
  specialistIds: number[]
  policy: string | null
}

export type PlantKind = 'compressor' | 'tunnel' | 'blast'

export interface PlantEntry {
  id: string
  kind: PlantKind
}

export type BillId = 'hours' | 'waste' | 'labor' | 'tax'

export type ShiftSlot = (typeof DEPTH.shiftSlots)[number]

export interface DepthInvoice {
  id: number
  cat: CategoryId
  amount: number
  dueAt: number
  paid: boolean
  onTime: boolean
}

export interface DepthRegulars {
  activeId: string | null
  arrivesAt: number
  patienceUntil: number
  seen: Record<string, number>
  /** Active visit skips auto-serve — player must serveRegular. */
  layaway: boolean
  /** SAVE 31: second shopper in the shop (never auto-serves; promotes when active clears). */
  waitingId: string | null
  /** Absolute sim time the waiting shopper gives up. */
  waitingPatienceUntil: number
  /** Waiting visit is a layaway slip (carries over on promote / focus swap). */
  waitingLayaway: boolean
}

export interface DepthShifts {
  open: number[]
  mid: number[]
  close: number[]
  daysCoveredOpen: number
  /** Days Mid had an Orbit role (pilot / steward / hullTech). */
  daysCoveredMidOrbit: number
  lastRolloverDay: number
}

export interface DepthFlagship {
  slots: string[]
  score: number
  filings: number
  practiceLeft: number
  credited: boolean
  /** Credited filing after deli + bakery unlocked (cold permit gate). */
  chainCredited: boolean
  /** Credited filing after Import unlocked (barge berth gate). */
  globeCredited: boolean
}

/** Worlds fileStandard* practice counter (planogram / convoy / cross / phrase / list). */
export type PracticeLayer = 'planogram' | 'convoy' | 'cross' | 'phrase' | 'list'

export interface PracticeBucket {
  left: number
  credited: number
}

export type DepthPractice = Record<PracticeLayer, PracticeBucket>

/** Concord Hearing Docket (Era 11) — answer `needed` sessions before signing. */
export interface DepthHearing {
  sessions: number
  needed: 2 | 3
  answered: number
  pendingClause: string | null
}

export const PRACTICE_LAYERS: PracticeLayer[] = [
  'planogram',
  'convoy',
  'cross',
  'phrase',
  'list',
]

export function emptyPracticeBucket(): PracticeBucket {
  return { left: HORIZON.practicePerLayer, credited: 0 }
}

export function emptyPractice(): DepthPractice {
  return {
    planogram: emptyPracticeBucket(),
    convoy: emptyPracticeBucket(),
    cross: emptyPracticeBucket(),
    phrase: emptyPracticeBucket(),
    list: emptyPracticeBucket(),
  }
}

export function emptyHearing(needed: 2 | 3 = 3): DepthHearing {
  return { sessions: 0, needed, answered: 0, pendingClause: null }
}

export interface DepthCooler {
  logsSigned: number
  nextDueAt: number
  missed: number
  /** Last successful sign sim-time (FreshWay recent-log window). */
  lastSignedAt: number
}

/**
 * SAVE 33: one manifest filing is ONE stance — they never stack on the same lane filing.
 * - clean: credits a clean manifest now (barge gate); no exam window.
 * - exam: opens the exam hold; swearExam credits an exam (NOT a clean).
 * - fast: spends the lane quickly (cash burst, no credit, no hold); the lane is left open to MegaMart.
 */
export type ManifestStance = 'clean' | 'fast' | 'exam'
export const MANIFEST_STANCES: readonly ManifestStance[] = ['clean', 'exam', 'fast']

export function isManifestStance(v: unknown): v is ManifestStance {
  return v === 'clean' || v === 'fast' || v === 'exam'
}

export interface DepthDispatch {
  cleanManifests: number
  /** Last swearExam credit (exam cycle clock). */
  lastCycleAt: number
  /** SAVE 33: last clean-stance credit (clean cycle clock — separate from exams). */
  lastCleanAt: number
  /** SAVE 33: stance of each lane's current filing (exclusive per filing). */
  laneStances: Record<string, ManifestStance>
  /** SAVE 33: lifetime fast filings (flavor / stats). */
  fastFiled: number
  /** Lane waiting on swearExam (null = none). */
  examLaneId: string | null
  examMix: string | null
  examUntil: number
  /** Successful swearExam credits (berth gate). */
  examsHeld: number
}

/** Fresh / Cold leads have sat on the Shift Board at least once (leave gate). */
export interface DepthLeadsOnBoard {
  fresh: boolean
  cold: boolean
}

export type FlyerDiscount = 'soft' | 'mid' | 'deep'
export type FlyerPromise = 'hours' | 'facing'
export type BlockEventKind = 'parade' | 'payday' | 'rain'

export interface DepthFlyer {
  aisles: CategoryId[]
  discount: FlyerDiscount
  promise: FlyerPromise
  until: number
  weeksCompleted: number
  cooldownUntil: number
  /** False once featured prices break the printed band during the live window. */
  bandHeld: boolean
}

export interface DepthBlockEvent {
  kind: BlockEventKind | null
  until: number
  traitBias: string | null
}

export interface DepthState {
  facings: Partial<Record<CategoryId, string>>
  departments: Record<string, DeptRuntime>
  contracts: Record<string, boolean>
  placeTraits: Record<string, string>
  /** Open/Close card; false cuts wages + demand. */
  open: boolean
  /** Last wholesale order time that counted as a Market Bell dip. */
  marketBellDipAt: number
  /** Lifetime Market Bell dips (Era 1 needs 3). */
  marketBellDips: number
  /** Public star rating. */
  stars: number
  /** Satisfied regular visits (lifetime). */
  regularSatisfied: number
  /** Manual layaway serves credited (Era 1 gate; separate from regularSatisfied). */
  layawaySlips: number
  regulars: DepthRegulars
  /** Demand cut until this sim time after a missed regular. */
  regularMissUntil: number
  shifts: DepthShifts
  invoices: DepthInvoice[]
  nextInvoiceId: number
  invoicesOnTime: number
  /** SAVE 39: pay supplier invoices automatically while cash allows (default on). */
  autoPayInvoices: boolean
  /** Receiver dock check-ins (side-yard gate). */
  dockCheckIns: number
  /** Next dock check-in allowed at this sim time. */
  nextDockAt: number
  /** Aisle the last dock check-in put away into. */
  lastDockAisle: string | null
  flagship: DepthFlagship
  produceGrade: 'good' | 'bruised' | null
  /** Last morning write-off sim-time. */
  writeOffAt: number
  writeOffs: number
  promotions: number
  /** Era 2 chain circular: featured aisles for a short window (mirrors active flyer). */
  circular: { aisles: CategoryId[]; until: number } | null
  circularsRun: number
  /** Flyer Desk — weekly craft; weeks complete when until elapses. */
  flyer: DepthFlyer | null
  flyerWeeks: number
  /** Penny forces a counter-flyer; cleared by printFlyerWeek. */
  counterFlyerNeeded: boolean
  counterFlyerAt: number
  /** Neighborhood block events that bias the hot trait. */
  blockEvent: DepthBlockEvent
  blockEventAt: number
  /** Walks credited when a store policy matches the live hot trait before until. */
  hotTraitWalks: number
  /** Penny Pantry aisle lock (null = clear). */
  rivalLockCat: CategoryId | null
  rivalLockAt: number
  /** Brownout drill timer / completions. */
  brownoutDrillAt: number
  drillsRun: number
  /** Cooler Log (Era 3): signed temp checks / brownout drills. */
  cooler: DepthCooler
  /** Fresh + Cold leads on Shift Board (lifetime flags). */
  leadsOnBoard: DepthLeadsOnBoard
  /** Era 4: manifests assigned this run. */
  manifestsRun: number
  /** Lane id → preferred cargo category mix for setManifest. */
  manifests: Record<string, CategoryId>
  /** Dispatch Board: clean matched manifests toward barge. */
  dispatch: DepthDispatch
  /** Era 4: MegaMart pressure on a drifting franchise (franchise id or null). */
  megaMartTarget: string | null
  megaMartUntil: number
  /** Franchises won back / buyouts defended. */
  defectionsHandled: number
  /** Era 5: drift war steps — 0 idle, 1 sight, 2 board, 3 hold. */
  driftWar: { step: 0 | 1 | 2 | 3 }
  /** Orbit role assigned to Mid at least once (Era 6 gate). */
  orbitMidOnce: boolean
  /** Survey desk on the Shift Board at least once (Era 8 gate). */
  surveyShiftOnce: boolean
  /** Worlds practice filings per puzzle layer. */
  practice: DepthPractice
  /** Last fileStandard* sim-time (practice gap). */
  lastStandardFileAt: number
  /** Stars snapshot when ration week freezes the Star Board (null = live). */
  starsFrozenAt: number | null
  /** Era 6: ration week ends at this sim time (0 = inactive). */
  rationWeekUntil: number
  /** Ledger stamps while stars frozen (Continue gate). */
  ledgerStamps: number
  /** Shift-day index of last stampLedger. */
  lastLedgerDay: number
  /** Completed berth turnarounds after hauler arrival. */
  berthTurnarounds: number
  /** Steward of the Counter staff id (promoted lead). */
  stewardId: number | null
  /** Steward kept after Continue. */
  stewardKept: boolean
  /** Departments that have ever been staffed (Last Aisle line difficulty). */
  deptEverStaffed: Record<string, boolean>
  /** Drift Provisions: planet id with locked SKU (cleared by price war / refile). */
  driftLockPlanet: string | null
  /** Keelmark stolen bay index on a circuit (−1 = clear). */
  stolenBay: number
  stolenBayCircuit: number
  /** Verdant undercuts this breeding trait. */
  verdantTrait: string | null
  /** Static FM jammed symbol. */
  jammedSymbol: string | null
  /**
   * Concord hearing answered (legacy mirror).
   * Prefer `hearing.answered >= hearing.needed` — kept in sync by answerHearing.
   */
  hearingAnswered: boolean
  /** Concord Hearing Docket (Era 11). */
  hearing: DepthHearing
  /** Ration Board pressures this list line index (−1 = none). */
  rationLine: number
  /** Last horizon rival pressure time. */
  hzRivalAt: number
  /** SAVE 32: powered blast cancels the tunnel spoil cut until the next signed Cooler log. */
  blastSuppressesTunnelUntilLog: boolean
  /** SAVE 34: a served climate guest bans one facing (tag = facing id) until the next shift day. */
  climateFacingBan: { tag: string; cat: CategoryId; until: number } | null
}

export function emptyFlagship(): DepthFlagship {
  return {
    slots: Array(DEPTH.flagshipSlots).fill(''),
    score: 0,
    filings: 0,
    practiceLeft: DEPTH.flagshipPracticePerEra,
    credited: false,
    chainCredited: false,
    globeCredited: false,
  }
}

export function emptyCooler(): DepthCooler {
  return { logsSigned: 0, nextDueAt: 0, missed: 0, lastSignedAt: 0 }
}

export function emptyDispatch(): DepthDispatch {
  return {
    cleanManifests: 0,
    lastCycleAt: 0,
    lastCleanAt: 0,
    laneStances: {},
    fastFiled: 0,
    examLaneId: null,
    examMix: null,
    examUntil: 0,
    examsHeld: 0,
  }
}

export function emptyLeadsOnBoard(): DepthLeadsOnBoard {
  return { fresh: false, cold: false }
}

export function emptyBlockEvent(): DepthBlockEvent {
  return { kind: null, until: 0, traitBias: null }
}

export function emptyShifts(): DepthShifts {
  return {
    open: [],
    mid: [],
    close: [],
    daysCoveredOpen: 0,
    daysCoveredMidOrbit: 0,
    lastRolloverDay: 0,
  }
}

/** Orbit dept roles that cover Mid for the Era 6 gate. */
export const ORBIT_SHIFT_ROLES = ['pilot', 'steward', 'hullTech'] as const

export function isOrbitShiftRole(role: string): boolean {
  return (ORBIT_SHIFT_ROLES as readonly string[]).includes(role)
}

export function emptyRegulars(): DepthRegulars {
  return {
    activeId: null,
    arrivesAt: 0,
    patienceUntil: 0,
    seen: {},
    layaway: false,
    waitingId: null,
    waitingPatienceUntil: 0,
    waitingLayaway: false,
  }
}

export function emptyDepth(): DepthState {
  return {
    facings: {},
    departments: {
      fresh: { leadId: null, specialistIds: [], policy: null },
      chain: { leadId: null, specialistIds: [], policy: null },
      cold: { leadId: null, specialistIds: [], policy: null },
      logistics: { leadId: null, specialistIds: [], policy: null },
      orbit: { leadId: null, specialistIds: [], policy: null },
      survey: { leadId: null, specialistIds: [], policy: null },
    },
    contracts: {},
    placeTraits: {},
    open: true,
    marketBellDipAt: 0,
    marketBellDips: 0,
    stars: DEPTH.starsStart,
    regularSatisfied: 0,
    layawaySlips: 0,
    regulars: emptyRegulars(),
    regularMissUntil: 0,
    shifts: emptyShifts(),
    invoices: [],
    nextInvoiceId: 1,
    invoicesOnTime: 0,
    autoPayInvoices: true,
    dockCheckIns: 0,
    nextDockAt: 0,
    lastDockAisle: null,
    flagship: emptyFlagship(),
    produceGrade: null,
    writeOffAt: 0,
    writeOffs: 0,
    promotions: 0,
    circular: null,
    circularsRun: 0,
    flyer: null,
    flyerWeeks: 0,
    counterFlyerNeeded: false,
    counterFlyerAt: 0,
    blockEvent: emptyBlockEvent(),
    blockEventAt: 0,
    hotTraitWalks: 0,
    rivalLockCat: null,
    rivalLockAt: 0,
    brownoutDrillAt: 0,
    drillsRun: 0,
    cooler: emptyCooler(),
    leadsOnBoard: emptyLeadsOnBoard(),
    manifestsRun: 0,
    manifests: {},
    dispatch: emptyDispatch(),
    megaMartTarget: null,
    megaMartUntil: 0,
    defectionsHandled: 0,
    driftWar: { step: 0 },
    orbitMidOnce: false,
    surveyShiftOnce: false,
    practice: emptyPractice(),
    lastStandardFileAt: 0,
    starsFrozenAt: null,
    rationWeekUntil: 0,
    ledgerStamps: 0,
    lastLedgerDay: -1,
    berthTurnarounds: 0,
    stewardId: null,
    stewardKept: false,
    deptEverStaffed: {},
    driftLockPlanet: null,
    stolenBay: -1,
    stolenBayCircuit: -1,
    verdantTrait: null,
    jammedSymbol: null,
    hearingAnswered: false,
    hearing: emptyHearing(3),
    rationLine: -1,
    hzRivalAt: 0,
    blastSuppressesTunnelUntilLog: false,
    climateFacingBan: null,
  }
}

export function emptyBills(): Record<BillId, boolean> {
  return { hours: false, waste: false, labor: false, tax: false }
}

export const BILL_IDS: BillId[] = ['hours', 'waste', 'labor', 'tax']

export const BILL_DEFS: Record<BillId, { name: string; blurb: string }> = {
  hours: { name: 'Hours Bill', blurb: 'Keeps late doors legal across the region.' },
  waste: { name: 'Waste Bill', blurb: 'Files spoil logs before inspectors do.' },
  labor: { name: 'Labor Bill', blurb: 'Locks the wage floor for the campaign.' },
  tax: { name: 'Tax Bill', blurb: 'Settles the county on your terms.' },
}

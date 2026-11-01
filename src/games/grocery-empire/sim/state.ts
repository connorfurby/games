import { CATEGORY_IDS, type CategoryId } from '../content/categories'
import { CHARTER_AXES } from '../content/lateEras'
import { MENU_IDS, type MenuId } from '../content/menus'
import type { RoleId } from '../content/staff'
import { COLD, COMPUTE, FLEET, HISTORY, SAVE_VERSION, START, WHOLESALE } from './balance'

export type SupplierId = 'a' | 'b'
export type WeatherId = 'fair' | 'rain' | 'heat' | 'cold'
export type LedgerKind =
  | 'info'
  | 'good'
  | 'warn'
  | 'memo'
  | 'recovery'
  | 'era'
  | 'staff'
  | 'sale'
  | 'story'

export interface Batch {
  cat: CategoryId
  qty: number
  /** Effective age in seconds; spoils when it reaches the category's life. */
  age: number
}

export interface Order {
  id: number
  supplier: SupplierId
  cat: CategoryId
  qty: number
  eta: number
  /** Paid per unit, so refused units can be refunded exactly. */
  unitCost: number
}

export interface StaffMember {
  id: number
  role: RoleId
  name: string
  level: number
  xp: number
  hiredAt: number
}

export interface LedgerEntry {
  id: number
  t: number
  text: string
  kind: LedgerKind
}

export interface VentureState {
  level: number
  stored: number
  lifetime: number
  /** Fractional produce consumption carry. */
  carry: number
}

export interface TutorialRun {
  id: string
  step: number
  /** Counter values captured when the current step began. */
  baseline: Record<string, number>
  startedAt: number
}

export interface OfflineReceipt {
  seconds: number
  cappedSeconds: number
  sold: number
  revenue: number
  spoiled: number
  wages: number
  rent: number
  attention: number
  ventures: number
  interest: number
}

export type StorePolicy = 'local' | 'standard' | 'premium'
export type InvestRisk = 'low' | 'mid' | 'high'

export interface StoreState {
  id: string
  name: string
  level: number
  xp: number
  policy: StorePolicy
  /** 0..1 share of Attention allocated to this store. */
  attentionShare: number
}

export interface InvestBook {
  unlocked: boolean
  engineLevel: number
  risk: InvestRisk
  balance: number
  /** Peak balance since unlock; circuit trips at −40%. */
  peak: number
  circuitBreaker: boolean
  /** Accrual toward next 2.5s book tick. */
  tickAcc: number
}

export interface BoardState {
  seats: number
  nextMeetingAt: number
  /** Last meeting the player acknowledged (time). */
  lastResolvedAt: number
}

/** Era 3 — cold chain / freshness / Momentum. */
export interface ColdState {
  plants: number
  tanks: number
  /** 0..∞; 1 = supply meets demand; floors at 0.25 on brownout. */
  freshness: number
  /** Compound multiplier while freshness ≥ 1; pauses (does not wipe) on brownout. */
  momentum: number
  surplus: number
  yieldLeft: number
  yieldMax: number
  momentumOn: boolean
  browned: boolean
  brownouts: number
  autoSheds: number
  momentumHoldSec: number
  quadratic: boolean
  lastBrownoutLogAt: number
}

/** Era 3 — political capital / acquisition. */
export interface PoliticsState {
  capital: number
  lobby: number
  monopolyRisk: number
  acquisitions: number
  leftRegion: boolean
}

/** Era 5 — seed barges / Charter. */
export interface FleetState {
  barges: number
  biomass: number
  biomassMax: number
  charter: Record<string, number>
  /** Unspent Charter points. */
  charterPool: number
  charterCap: number
  legacy: number
  warOn: boolean
  guardianUsed: boolean
  lanes: number
  franchises: number
  driftWins: number
  launched: boolean
}

/** Mild New Game+ laws picked after Accept (0–2). */
export type PrestigeMutatorId = 'fasterSpoil' | 'richerYield' | 'weirdElasticity' | 'expensiveAds'

/** Mild bonuses carried after Accept prestige. */
export interface PrestigeCarry {
  appetite: number
  tipSharpness: number
  universeIndex: number
  /** Active Hungry laws for this universe (max 2). Default []. */
  mutators: PrestigeMutatorId[]
}

export interface Stats {
  unpackedManual: number
  unpackedStaff: number
  sold: number
  soldByCat: Record<CategoryId, number>
  revenueByCat: Record<CategoryId, number>
  spoiled: number
  spoiledByCat: Record<CategoryId, number>
  shrunk: number
  wagesPaid: number
  rentPaid: number
  upkeepPaid: number
  wholesaleSpent: number
  ordersPlaced: number
  ordersBelow85: number
  shortShips: number
  peakCash: number
  peakPrice: number
  minPrice: number
  priceChanges: number
  adsBought: number
  hires: number
  inspections: number
  inspectionsFailed: number
  inspectorCalls: number
  finesPaid: number
  pizzas: number
  ventureCollected: number
  ventureCollects: number
  interestEarned: number
  memosDone: number
  upgradesBought: number
  buildsBought: number
  attentionFilled: number
  ideasEarned: number
  stockoutSec: number
  playSec: number
  offlineSec: number
  helperCrates: number
  bailouts: number
  interventions: number
  emergencyDeliveries: number
  dumps: number
  weatherDays: number
  storesOpened: number
  tournamentsRun: number
  doctrinesBought: number
  investDeposits: number
  boardMeetings: number
}

export interface GameState {
  version: number
  seed: number
  rng: number
  /** Simulated seconds since the run began. */
  time: number
  createdAt: number
  lastSavedAt: number
  paused: boolean
  speed: number
  era: number

  baskets: number
  cash: number
  lifetimeRevenue: number
  arrears: number
  arrearsForgiven: number
  debt: { owed: number; taken: number }
  price: number

  categories: Record<CategoryId, boolean>
  /** Restock mix weights per category, 0..1. */
  mix: Record<CategoryId, number>
  orderCat: CategoryId
  shelf: Batch[]
  backroom: Batch[]
  orders: Order[]
  nextOrderId: number

  wholesale: { index: number; phase: number; drift: number; idleSec: number; history: number[] }
  supplier: SupplierId
  autoRestock: { enabled: boolean; maxCost: number; minUnits: number }

  ads: number
  adCost: number
  lastAdAt: number
  lastAdSpend: number
  hours: number
  weather: { now: WeatherId; next: WeatherId; timer: number }

  staff: StaffMember[]
  nextStaffId: number
  morale: number
  pizzaUntil: number
  lastPizzaAt: number

  inspection: { meter: number; penaltyUntil: number; lastInspectorAt: number }
  loyalty: { tier: number; liability: number }

  /** Timed soft events (coupon wars, etc.). */
  events: {
    couponWar: { active: boolean; endsAt: number; lastAt: number }
  }

  /** Timed campaigns (celebrity endcap, etc.). */
  campaigns: {
    /** Sim-time when celebrity endcap expires; 0 = inactive. */
    celebrityUntil: number
  }

  compute: {
    unlocked: boolean
    analysts: number
    archives: number
    attention: number
    ideasUnlocked: boolean
    ideasOn: boolean
    ideas: number
    reputation: number
    repEarned: number
    nextRepAt: number
    fibA: number
    fibB: number
    retrains: number
    /** Scanner Array (Attention pulse) unlocked via memo. */
    scanner: boolean
    /** Sim-time when pulseScanner is ready again. */
    scannerReadyAt: number
  }

  memos: Record<string, number>
  /** Memos stay listed once they have appeared, even if their reveal condition lapses. */
  memoSeen: Record<string, boolean>
  memoFavorites: Record<string, boolean>
  upgrades: Record<string, number>
  upgradeSpend: number
  builds: Record<string, number>
  endcaps: number
  ventures: Record<string, VentureState>
  passbook: { balance: number }
  empire: { xp: number; level: number; points: number; perks: Record<string, number> }
  expansions: Record<string, boolean>

  /** Era 2+ multi-store chain. Empty until Era 2 seeds the flagship. */
  stores: StoreState[]
  nextStoreId: number
  incorporated: boolean
  equity: number
  invest: InvestBook
  /** Tournament / doctrine currency (later eras also consume Read). */
  read: number
  doctrines: Record<string, number>
  depot: boolean
  autonomous: boolean
  board: BoardState
  /** Reputation spent since run start (for Autonomous gate). */
  repSpent: number

  /** Era 3+ cold chain. */
  cold: ColdState
  /** Era 3+ politics wallet. */
  politics: PoliticsState
  /** Era 4+ globe currencies. */
  fuel: number
  control: number
  brand: number
  /** Era 5+ seed barges. */
  fleet: FleetState
  /** Era 6 ending pick. */
  endingChoice: null | 'accept' | 'reject'
  /** UI applies MetaSave.groceryUniverses bump then clears. */
  pendingAccept: boolean
  /** Mild permanent bonuses after Accept prestige. */
  prestigeCarry: PrestigeCarry

  menus: Record<MenuId, boolean>
  seenMenus: Record<string, boolean>
  tutorials: { done: Record<string, boolean>; queue: string[]; active: TutorialRun | null }
  chapterQueue: number[]

  ledger: LedgerEntry[]
  nextLedgerId: number

  recovery: {
    /** Sim seconds shelves have been empty (all cats). */
    emptySec: number
    brokeSec: number
    stallSec: number
    /** Last empty-shelf starter crate grant (sim time). */
    lastEmptyShelfAt: number
    lastBailoutAt: number
    lastInterventionAt: number
    watchdogTimer: number
    lastProgress: number
  }

  /** Dismissed tip-whisper ids (plan Part C5 / O). */
  tipsSeen: Record<string, true>

  /** Opening cutscene finished (once per save). */
  introSeen: boolean

  /** Gallery of notable spoilage events (top 12 by qty). */
  museum: { exhibits: { t: number; qty: number; note: string }[] }

  stats: Stats
  rates: { soldPerSec: number; revenuePerSec: number; costPerSec: number; spoilPerSec: number; demandPerSec: number }
  history: { cash: number[]; sold: number[]; revenue: number[]; timer: number; lastSold: number; lastRevenue: number }
  acc: {
    cat: Record<CategoryId, number>
    unpack: number
    shrink: number
    garden: number
    secTimer: number
    revWindow: number
    costWindow: number
    soldWindow: number
    spoilWindow: number
    lastSpoilLogAt: number
    lastShrinkLogAt: number
    /** Sim time of last receipt-poetry ledger line. */
    lastPoetryAt: number
  }
  offlineReceipt: OfflineReceipt | null
}

function emptyByCat(): Record<CategoryId, number> {
  return Object.fromEntries(CATEGORY_IDS.map((c) => [c, 0])) as Record<CategoryId, number>
}

export function emptyCold(): ColdState {
  return {
    plants: 0,
    tanks: 0,
    freshness: 1,
    momentum: 1,
    surplus: 0,
    yieldLeft: COLD.yieldStart,
    yieldMax: COLD.yieldStart,
    momentumOn: false,
    browned: false,
    brownouts: 0,
    autoSheds: 0,
    momentumHoldSec: 0,
    quadratic: false,
    lastBrownoutLogAt: -1e9,
  }
}

export function emptyPolitics(): PoliticsState {
  return {
    capital: 0,
    lobby: 0,
    monopolyRisk: 0,
    acquisitions: 0,
    leftRegion: false,
  }
}

export function emptyFleet(): FleetState {
  const charter = Object.fromEntries(CHARTER_AXES.map((a) => [a.id, 0])) as Record<string, number>
  return {
    barges: 0,
    biomass: FLEET.biomassStart,
    biomassMax: FLEET.biomassStart,
    charter,
    charterPool: 0,
    charterCap: FLEET.charterBaseCap,
    legacy: 0,
    warOn: false,
    guardianUsed: false,
    lanes: 0,
    franchises: 0,
    driftWins: 0,
    launched: false,
  }
}

export function emptyPrestigeCarry(): PrestigeCarry {
  return { appetite: 0, tipSharpness: 0, universeIndex: 0, mutators: [] }
}

export function emptyStats(): Stats {
  return {
    unpackedManual: 0,
    unpackedStaff: 0,
    sold: 0,
    soldByCat: emptyByCat(),
    revenueByCat: emptyByCat(),
    spoiled: 0,
    spoiledByCat: emptyByCat(),
    shrunk: 0,
    wagesPaid: 0,
    rentPaid: 0,
    upkeepPaid: 0,
    wholesaleSpent: 0,
    ordersPlaced: 0,
    ordersBelow85: 0,
    shortShips: 0,
    peakCash: START.cash,
    peakPrice: START.price,
    minPrice: START.price,
    priceChanges: 0,
    adsBought: 0,
    hires: 0,
    inspections: 0,
    inspectionsFailed: 0,
    inspectorCalls: 0,
    finesPaid: 0,
    pizzas: 0,
    ventureCollected: 0,
    ventureCollects: 0,
    interestEarned: 0,
    memosDone: 0,
    upgradesBought: 0,
    buildsBought: 0,
    attentionFilled: 0,
    ideasEarned: 0,
    stockoutSec: 0,
    playSec: 0,
    offlineSec: 0,
    helperCrates: 0,
    bailouts: 0,
    interventions: 0,
    emergencyDeliveries: 0,
    dumps: 0,
    weatherDays: 0,
    storesOpened: 0,
    tournamentsRun: 0,
    doctrinesBought: 0,
    investDeposits: 0,
    boardMeetings: 0,
  }
}

export function createInitialState(seed = Date.now() % 2147483647, now = Date.now()): GameState {
  const menus = Object.fromEntries(MENU_IDS.map((m) => [m, false])) as Record<MenuId, boolean>
  menus.floor = true
  menus.more = true
  const categories = Object.fromEntries(CATEGORY_IDS.map((c) => [c, c === 'cans'])) as Record<
    CategoryId,
    boolean
  >
  const mix = Object.fromEntries(CATEGORY_IDS.map((c) => [c, c === 'cans' ? 1 : 0.5])) as Record<
    CategoryId,
    number
  >
  return {
    version: SAVE_VERSION,
    seed: seed || 1,
    rng: seed || 1,
    time: 0,
    createdAt: now,
    lastSavedAt: now,
    paused: false,
    speed: 1,
    era: 0,

    baskets: 0,
    cash: START.cash,
    lifetimeRevenue: 0,
    arrears: 0,
    arrearsForgiven: 0,
    debt: { owed: 0, taken: 0 },
    price: START.price,

    categories,
    mix,
    orderCat: 'cans',
    shelf: [],
    backroom: [{ cat: 'cans', qty: START.backroomCans, age: 0 }],
    orders: [],
    nextOrderId: 1,

    wholesale: { index: WHOLESALE.indexStart, phase: 0, drift: 1, idleSec: 0, history: [] },
    supplier: 'a',
    autoRestock: { enabled: false, maxCost: 0.85, minUnits: 24 },

    ads: 1,
    adCost: 20,
    lastAdAt: -1,
    lastAdSpend: 0,
    hours: 1,
    weather: { now: 'fair', next: 'fair', timer: 0 },

    staff: [],
    nextStaffId: 1,
    morale: 1,
    pizzaUntil: 0,
    lastPizzaAt: -1e9,

    inspection: { meter: 0, penaltyUntil: 0, lastInspectorAt: -1e9 },
    loyalty: { tier: 0, liability: 0 },

    events: {
      couponWar: { active: false, endsAt: 0, lastAt: -1e9 },
    },
    campaigns: {
      celebrityUntil: 0,
    },

    compute: {
      unlocked: false,
      analysts: 1,
      archives: 1,
      attention: 0,
      ideasUnlocked: false,
      ideasOn: true,
      ideas: 0,
      reputation: 2,
      repEarned: 2,
      nextRepAt: COMPUTE.firstRepAt,
      fibA: 2,
      fibB: 3,
      retrains: 0,
      scanner: false,
      scannerReadyAt: 0,
    },

    memos: {},
    memoSeen: {},
    memoFavorites: {},
    upgrades: {},
    upgradeSpend: 0,
    builds: { storefront: 1, storage: 1 },
    endcaps: 0,
    ventures: {},
    passbook: { balance: 0 },
    empire: { xp: 0, level: 1, points: 0, perks: {} },
    expansions: {},

    stores: [],
    nextStoreId: 1,
    incorporated: false,
    equity: 0,
    invest: {
      unlocked: false,
      engineLevel: 0,
      risk: 'low',
      balance: 0,
      peak: 0,
      circuitBreaker: false,
      tickAcc: 0,
    },
    read: 0,
    doctrines: {},
    depot: false,
    autonomous: false,
    board: { seats: 3, nextMeetingAt: 0, lastResolvedAt: 0 },
    repSpent: 0,

    cold: emptyCold(),
    politics: emptyPolitics(),
    fuel: 0,
    control: 0,
    brand: 1,
    fleet: emptyFleet(),
    endingChoice: null,
    pendingAccept: false,
    prestigeCarry: emptyPrestigeCarry(),

    menus,
    seenMenus: { floor: true, more: true },
    tutorials: { done: {}, queue: [], active: null },
    chapterQueue: [],

    ledger: [],
    nextLedgerId: 1,

    recovery: {
      emptySec: 0,
      brokeSec: 0,
      stallSec: 0,
      lastEmptyShelfAt: -1e9,
      lastBailoutAt: -1e9,
      lastInterventionAt: -1e9,
      watchdogTimer: 0,
      lastProgress: 0,
    },

    tipsSeen: {},
    introSeen: false,

    museum: { exhibits: [] },

    stats: emptyStats(),
    rates: { soldPerSec: 0, revenuePerSec: 0, costPerSec: 0, spoilPerSec: 0, demandPerSec: 0 },
    history: { cash: [], sold: [], revenue: [], timer: 0, lastSold: 0, lastRevenue: 0 },
    acc: {
      cat: emptyByCat(),
      unpack: 0,
      shrink: 0,
      garden: 0,
      secTimer: 0,
      revWindow: 0,
      costWindow: 0,
      soldWindow: 0,
      spoilWindow: 0,
      lastSpoilLogAt: -1e9,
      lastShrinkLogAt: -1e9,
      lastPoetryAt: -1e9,
    },
    offlineReceipt: null,
  }
}

export const HISTORY_KEEP = HISTORY.keep

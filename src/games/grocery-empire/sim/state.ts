import { CATEGORY_IDS, type CategoryId } from '../content/categories'
import { CHARTER_AXES } from '../content/lateEras'
import { MENU_IDS, type MenuId } from '../content/menus'
import type { RoleId, StaffTraitId } from '../content/staff'
import { COLD, COMPUTE, FLEET, HISTORY, SAVE_VERSION, START, WHOLESALE } from './balance'

export type SupplierId = 'a' | 'b'
export type WeatherId = 'fair' | 'rain' | 'heat' | 'cold'
/** Mild rival pressure kinds (Era 2+). One slot at a time; always answerable. */
export type RivalKind = 'undercut' | 'poach' | 'smear' | 'raid'

export function isRivalKind(x: unknown): x is RivalKind {
  return x === 'undercut' || x === 'poach' || x === 'smear' || x === 'raid'
}
export interface RivalEventState {
  kind: RivalKind | null
  endsAt: number
  lastAt: number
}
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
  /** Soft personality trait: ±5% on one axis. Optional for old saves. */
  traitId?: StaffTraitId
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
export type MarketingPosture = 'neighborhood' | 'circular' | 'houseBrand'

export type SalesBottleneck = 'shelf' | 'unpack' | 'checkout' | 'demand'

export interface StoreState {
  id: string
  name: string
  level: number
  xp: number
  policy: StorePolicy
  /** 0..1 share of Attention allocated to this store. */
  attentionShare: number
  /** 0..1 neglect heat — rises when under-attended; Walk store resets. */
  drift: number
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

export type BoardAgenda = 'expand' | 'dividend' | 'rnd' | 'hours'

/** Autonomous ticker focus — balanced runs all three habits. */
export type AutonomousHabit = 'balanced' | 'price' | 'attention' | 'collect'

export interface BoardState {
  seats: number
  nextMeetingAt: number
  /** Last meeting the player acknowledged (time). */
  lastResolvedAt: number
  /** Pending agenda choice while meeting is due (UI). */
  pendingAgenda: BoardAgenda | null
  /** One-shot next openStore cost mul after Expand agenda. */
  expandDiscount: number
  /** Shelf R&D lifeMul buff until this time. */
  rndUntil: number
  /** Cut-hours clamp until this time. */
  cutHoursUntil: number
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
  /** 2.0: plants auto-shed during a brownout wait here and come back when surplus returns. */
  offline: number
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
  /** Barges you paid for (replicated barges are free and do not raise the price). */
  launches: number
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
  /** Times Amend the Minutes cleared a standing-order fork. */
  amendMinutes: number
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
  couponMatches: number
  rivalAnswers: number
  rivalsBought: number
  walks: number
  trains: number
  /** 2.0: revenue booked by the store network (copies of flagship sales). */
  networkRevenue: number
}

export interface RivalState {
  stores: number
  /** Bought out: its stores count toward your network. */
  bought: boolean
  /** Stores it had when bought (frozen). */
  boughtStores: number
  nextGrowAt: number
  /** Growth frozen until this time (price war). */
  frozenUntil: number
  /** Next price war allowed at this time. */
  warReadyAt: number
  grown: number
  wars: number
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

  wholesale: {
    index: number
    phase: number
    drift: number
    idleSec: number
    history: number[]
    /** Slow EMA of index — Price IQ tip (avoids sine/idle jitter chasing the player). */
    tipIndex: number
  }
  supplier: SupplierId
  autoRestock: { enabled: boolean; maxCost: number; minUnits: number }

  ads: number
  adCost: number
  lastAdAt: number
  lastAdSpend: number
  /** Active marketing posture (Neighborhood / Circular / House brand). */
  marketingPosture: MarketingPosture
  /** Wholesale index freeze until this sim-time (0 = none). */
  priceLockUntil: number
  /** Wholesale index value while locked. */
  priceLockIndex: number
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
    /** Price undercut / staff poach / health smear — one at a time, never bricks. */
    rival: RivalEventState
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
    /** Tourney While Full. False pauses it. Ideas still own the full bar while ideasOn. */
    autoTourney: boolean
    /** Sim-time before the next automatic tournament. */
    nextAutoTourneyAt: number
    ideas: number
    reputation: number
    repEarned: number
    nextRepAt: number
    fibA: number
    fibB: number
    retrains: number
    /** Times Rewrite the Charter refunded empire perk points. */
    perkRespecs: number
    /** Times you've paid cash to move Analyst ↔ Archive. */
    officeMoves: number
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
  /** After Autonomous release: which habits the ticker runs. */
  autonomousHabit: AutonomousHabit
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
  /** 2.0 Rebrand prestige: Goodwill carried across runs. */
  rebrand: { goodwill: number; count: number; bankedThisRun: number }
  /** 2.0 Empire Projects: finished ids and the builds in progress. */
  projects: { done: Record<string, true>; active: { id: string; endsAt: number }[] }
  /** 2.0 named rival chains, keyed by rival id. Missing = not opened yet. */
  rivals: Record<string, RivalState>
  /** 2.0 Relic Museum, mirrored in from the museum save (which outlives runs). */
  relics: { wings: string[]; count: number; owned: Record<string, number> }

  menus: Record<MenuId, boolean>
  seenMenus: Record<string, boolean>
  /** Player-opened department. Coach auto-nav does not bump this. */
  menuStamp: number
  lastMenu: string
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
    /** Last Era-0 mentor crate (sim time). */
    lastMentorAt: number
    lastInterventionAt: number
    watchdogTimer: number
    lastProgress: number
  }

  /** Dismissed tip-whisper ids (plan Part C5 / O). */
  tipsSeen: Record<string, true>

  /** Spoken dialogue lines finished or skipped (once per save). */
  seenLines: Record<string, true>
  /** Pending dialogue strip ids — first is active. */
  dialogueQueue: string[]

  /** Opening cutscene finished (once per save). */
  introSeen: boolean

  /** Gallery of notable spoilage events (top 12 by qty). */
  museum: { exhibits: { t: number; qty: number; note: string }[] }

  stats: Stats
  rates: {
    soldPerSec: number
    revenuePerSec: number
    costPerSec: number
    spoilPerSec: number
    demandPerSec: number
    /** Venture paycheck income rate (stored till fill). */
    venturePerSec: number
    /** Passbook + invest book interest rate on yielding balances. */
    investYieldPerSec: number
    /** Smoothed till: actual cash change per sim second (sales, side income, bills, debt). */
    cashPerSec: number
  }
  history: { cash: number[]; sold: number[]; revenue: number[]; timer: number; lastSold: number; lastRevenue: number }
  /**
   * Rolling ~1s buckets for HUD averages. Rates = sum(buckets+current) / span —
   * not EMA of instant tick rates (those thrash on discrete baskets).
   */
  rateAvg: {
    t: number
    curSold: number
    curRev: number
    curCost: number
    curSpoil: number
    curCash: number
    sold: number[]
    rev: number[]
    cost: number[]
    spoil: number[]
    cash: number[]
  }
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
    /** Net cash delta since the last rate bucket (can be negative). */
    cashWindow: number
    lastSpoilLogAt: number
    lastShrinkLogAt: number
    /** Sim time of last receipt-poetry ledger line. */
    lastPoetryAt: number
    /** Sim time of last franchise-clone nick (Era 4+, optional). */
    lastCloneAt?: number
    /** Sim time of last Dip Bell chime. */
    lastDipLogAt: number
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
    offline: 0,
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
    launches: 0,
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
    amendMinutes: 0,
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
    couponMatches: 0,
    rivalAnswers: 0,
    rivalsBought: 0,
    walks: 0,
    trains: 0,
    networkRevenue: 0,
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

    wholesale: {
      index: WHOLESALE.indexStart,
      phase: 0,
      drift: 1,
      idleSec: 0,
      history: [],
      tipIndex: WHOLESALE.indexStart,
    },
    supplier: 'a',
    autoRestock: { enabled: false, maxCost: 0.85, minUnits: 24 },

    ads: 1,
    adCost: 20,
    lastAdAt: -1,
    lastAdSpend: 0,
    marketingPosture: 'neighborhood',
    priceLockUntil: 0,
    priceLockIndex: WHOLESALE.indexStart,
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
      rival: { kind: null, endsAt: 0, lastAt: -1e9 },
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
      autoTourney: true,
      nextAutoTourneyAt: 0,
      ideas: 0,
      reputation: 2,
      repEarned: 2,
      nextRepAt: COMPUTE.firstRepAt,
      fibA: 2,
      fibB: 3,
      retrains: 0,
      perkRespecs: 0,
      officeMoves: 0,
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
    autonomousHabit: 'balanced',
    board: {
      seats: 3,
      nextMeetingAt: 0,
      lastResolvedAt: 0,
      pendingAgenda: null,
      expandDiscount: 1,
      rndUntil: 0,
      cutHoursUntil: 0,
    },
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
    projects: { done: {}, active: [] },
    rivals: {},
    relics: { wings: [], count: 0, owned: {} },
    rebrand: { goodwill: 0, count: 0, bankedThisRun: 0 },

    menus,
    seenMenus: { floor: true, more: true },
    menuStamp: 0,
    lastMenu: 'floor',
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
      lastMentorAt: -1e9,
      lastInterventionAt: -1e9,
      watchdogTimer: 0,
      lastProgress: 0,
    },

    tipsSeen: {},
    seenLines: {},
    dialogueQueue: [],
    introSeen: false,

    museum: { exhibits: [] },

    stats: emptyStats(),
    rates: {
      soldPerSec: 0,
      revenuePerSec: 0,
      costPerSec: 0,
      spoilPerSec: 0,
      demandPerSec: 0,
      venturePerSec: 0,
      investYieldPerSec: 0,
      cashPerSec: 0,
    },
    history: { cash: [], sold: [], revenue: [], timer: 0, lastSold: 0, lastRevenue: 0 },
    rateAvg: emptyRateAvg(),
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
      cashWindow: 0,
      lastSpoilLogAt: -1e9,
      lastShrinkLogAt: -1e9,
      lastPoetryAt: -1e9,
      lastDipLogAt: -1e9,
    },
    offlineReceipt: null,
  }
}

/** How many ~1s buckets feed Sold/Rev/Net HUD averages. */
export const RATE_AVG_KEEP = 45

export function emptyRateAvg(): GameState['rateAvg'] {
  return {
    t: 0,
    curSold: 0,
    curRev: 0,
    curCost: 0,
    curSpoil: 0,
    curCash: 0,
    sold: [],
    rev: [],
    cost: [],
    spoil: [],
    cash: [],
  }
}

export const HISTORY_KEEP = HISTORY.keep

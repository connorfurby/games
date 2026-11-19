import { DEPTH, SAVE_VERSION } from './balance'

export type ShiftSlot = (typeof DEPTH.shiftSlots)[number]
export type Daypart = 'talk' | 'record' | 'night' | 'weather' | 'pledge' | 'static'
export type Habit = 'talk' | 'log' | 'route' | 'night'
export type PromoBand = 'soft' | 'mid' | 'deep'
export type StopTax = 'drop' | 'tariff' | 'delay'
export type CharterFork = 'public' | 'archive' | 'coop'
export type QuietLaw = 'fasterDecay' | 'richerNight' | 'weirdElasticity' | 'expensivePromos'

export interface Invoice {
  id: string
  amount: number
  dueAt: number
  paid: boolean
  onTime: boolean
}

export interface Caller {
  id: string
  name: string
  want: Daypart
  patienceUntil: number
  layaway: boolean
}

export type TowerPolicy = 'match' | 'push' | 'quiet'

export interface Tower {
  id: string
  trait: 'commuter' | 'night' | 'storm' | 'highway'
  policy: TowerPolicy | null
}

export interface Operator {
  id: string
  name: string
  habit: Habit
}

export interface DepthState {
  stars: number
  callersServed: number
  checkIns: number
  checkInReadyAt: number
  deadAirDips: number
  cleanLogsLifetime: number
  dawnDays: number
  shiftDay: number
  shifts: Record<ShiftSlot, string | null>
  activeCaller: Caller | null
  waitingCaller: Caller | null
  nextCallerAt: number
  featuredFormat: Daypart | null
  formatSlots: (Daypart | null)[]
  formatPractice: number
  formatCredited: boolean
  invoices: Invoice[]
  invoicesOnTime: number
  promoBand: PromoBand | null
  promoUntil: number
  promoWeeks: number
  heatLogs: number
  heatLogReadyAt: number
  hotTrait: Tower['trait'] | null
  hotTraitWalks: number
  hotTraitReadyAt: number
  examHolds: number
  cleanManifests: number
  manifestReadyAt: number
  fieldHaulsDone: number
  haulReadyAt: number
  quietStamps: number
  quietReadyAt: number
  guestEars: number
  guestReadyAt: number
  settles: number
  settleReadyAt: number
  yieldHauls: number
  choreReadyAt: number
  habitWatches: number
  habitReadyAt: number
  clauseSeats: number
  clauseReadyAt: number
  rehearseDone: boolean
  climateFacingBan: { format: Daypart; until: number } | null
  pendingStop: StopTax | null
  bedLocked: boolean
  postedHabit: { habit: Habit; until: number; agentId: string | null } | null
  seatingClause: string | null
  seatedClauses: string[]
  heardClauses: string[]
  hearingSession: number
  charterFork: CharterFork | null
  endlessBan: { kind: 'clause' | 'fork'; id: string } | null
  lastMutationAt: number
  /** Show slotted on each daypart. Missing key = the old flat format. */
  programs: Partial<Record<Daypart, string>>
  choirHushUntil: number
  /** A fast manifest left the band plan lane open. */
  laneOpen: boolean
}

export interface DialState {
  tape: number
  packet: number
  season: number
  phrase: number
  seal: number
  practice: Record<string, number>
  credited: Record<string, number>
  deskReadyAt: number
  lastScore: number
  listLines: (string | null)[]
  listMean: number
  rehearsalUntil: number
  accepted: boolean
  rejected: number
}

export interface AirState {
  tuned: boolean
  frequency: number
  carrier: number
  noise: number
  heat: number
  focus: number
  logFill: number
  cleanLogs: number
  airingUntil: number
  airReadyAt: number
  tuneReadyAt: number
  lastHoldAt: number
  /** Press-and-hold from UI; tick treats this as continuous lock. */
  holding: boolean
  /** Last air burst cash (UI floater). */
  lastBurst: number
  lastBurstAt: number
}

export interface Rates {
  revenuePerSec: number
  listenersPerSec: number
  clarity: number
  bandMul: number
  netMul: number
}

export interface GameState {
  version: number
  seed: number
  rng: number
  time: number
  createdAt: number
  lastSavedAt: number
  paused: boolean
  speed: number
  era: number
  cash: number
  calls: number
  ear: number
  lifetimeRevenue: number
  antenna: number
  towers: Tower[]
  regions: number
  skips: number
  birds: number
  subcarriers: number
  hasDepot: boolean
  crew: { id: string; role: string; name: string }[]
  operators: Operator[]
  upgrades: Record<string, number>
  doctrines: string[]
  memos: Record<string, boolean>
  goalsDone: Record<string, boolean>
  menus: Record<string, boolean>
  tutorials: Record<string, boolean>
  introSeen: boolean
  /** Highest era whose chapter card was accepted. -1 until the shack chapter. */
  chapterSeen: number
  archive: { level: number; xp: number }
  listenerTrust: number
  tournamentReadyAt: number
  rivals: Record<string, { stores: number; frozenUntil: number }>
  buyouts: string[]
  air: AirState
  depth: DepthState
  dial: DialState
  rates: Rates
  quietLaws: QuietLaw[]
  prestigeCarry: { type: 'doctrine' | 'facing'; id: string } | null
  overnightNotes: string[]
  awayReceipt: { elapsed: number; lostClarity: number; earned: number } | null
}

export function emptyDepth(): DepthState {
  return {
    stars: DEPTH.starsStart,
    callersServed: 0,
    checkIns: 0,
    checkInReadyAt: 0,
    deadAirDips: 0,
    cleanLogsLifetime: 0,
    dawnDays: 0,
    shiftDay: 0,
    shifts: { dawn: null, day: null, night: null },
    activeCaller: null,
    waitingCaller: null,
    nextCallerAt: 30,
    featuredFormat: null,
    formatSlots: Array.from({ length: DEPTH.formatSlots }, () => null),
    formatPractice: 0,
    formatCredited: false,
    invoices: [],
    invoicesOnTime: 0,
    promoBand: null,
    promoUntil: 0,
    promoWeeks: 0,
    heatLogs: 0,
    heatLogReadyAt: 0,
    hotTrait: null,
    hotTraitWalks: 0,
    hotTraitReadyAt: 0,
    examHolds: 0,
    cleanManifests: 0,
    manifestReadyAt: 0,
    fieldHaulsDone: 0,
    haulReadyAt: 0,
    quietStamps: 0,
    quietReadyAt: 0,
    guestEars: 0,
    guestReadyAt: 0,
    settles: 0,
    settleReadyAt: 0,
    yieldHauls: 0,
    choreReadyAt: 0,
    habitWatches: 0,
    habitReadyAt: 0,
    clauseSeats: 0,
    clauseReadyAt: 0,
    rehearseDone: false,
    climateFacingBan: null,
    pendingStop: null,
    bedLocked: false,
    postedHabit: null,
    seatingClause: null,
    seatedClauses: [],
    heardClauses: [],
    hearingSession: 0,
    charterFork: null,
    endlessBan: null,
    lastMutationAt: 0,
    programs: {},
    choirHushUntil: 0,
    laneOpen: false,
  }
}

export function emptyDial(): DialState {
  return {
    tape: 0,
    packet: 0,
    season: 0,
    phrase: 0,
    seal: 0,
    practice: {},
    credited: {},
    deskReadyAt: 0,
    lastScore: 0,
    listLines: [null, null, null, null, null],
    listMean: 0,
    rehearsalUntil: 0,
    accepted: false,
    rejected: 0,
  }
}

export function emptyAir(): AirState {
  return {
    tuned: false,
    frequency: 88.1,
    carrier: 1,
    noise: 0.2,
    heat: 0,
    focus: 1,
    logFill: 0,
    cleanLogs: 0,
    airingUntil: 0,
    airReadyAt: 0,
    tuneReadyAt: 0,
    lastHoldAt: 0,
    holding: false,
    lastBurst: 0,
    lastBurstAt: 0,
  }
}

export function createInitialState(seed = Date.now() % 2147483647, now = Date.now()): GameState {
  const s = seed || 1
  return {
    version: SAVE_VERSION,
    seed: s,
    rng: s,
    time: 0,
    createdAt: now,
    lastSavedAt: now,
    paused: false,
    speed: 1,
    era: 0,
    cash: 20,
    calls: 0,
    ear: 0,
    lifetimeRevenue: 0,
    antenna: 0,
    towers: [],
    regions: 0,
    skips: 0,
    birds: 0,
    subcarriers: 0,
    hasDepot: false,
    crew: [],
    operators: [],
    upgrades: {},
    doctrines: [],
    memos: {},
    goalsDone: {},
    menus: { air: true },
    tutorials: {},
    introSeen: false,
    chapterSeen: -1,
    archive: { level: 1, xp: 0 },
    listenerTrust: 0,
    tournamentReadyAt: 0,
    rivals: {},
    buyouts: [],
    air: emptyAir(),
    depth: emptyDepth(),
    dial: emptyDial(),
    rates: {
      revenuePerSec: 0,
      listenersPerSec: 0,
      clarity: 1,
      bandMul: 1,
      netMul: 1,
    },
    quietLaws: [],
    prestigeCarry: null,
    overnightNotes: [],
    awayReceipt: null,
  }
}

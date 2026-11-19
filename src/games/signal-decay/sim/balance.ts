/** All tunable constants. UI and content read these; nothing hardcodes economy numbers. */

export const TICK_HZ = 10
export const DT = 1 / TICK_HZ
export const OFFLINE_STEP_SEC = 1
export const OFFLINE_CAP_SEC = 8 * 60 * 60
export const AUTOSAVE_MS = 10_000
export const SAVE_VERSION = 4
export const GAME_VERSION = '1.2'

export const PUZZLE_SLOW = 0.72
export const PUZZLE_FAST = 0.85

export const BAND = {
  antenna: [1, 1, 2, 3.5, 6, 10, 16, 24, 32, 40, 52] as const,
  era: [1, 1.5, 2.5, 5, 10, 20, 40, 70, 120, 200, 340, 560, 900] as const,
}

export const RELAY = {
  margin: 0.55,
  neglectFloor: 0.55,
  towerBase: 0.7,
  towerPer: 0.08,
  regionPer: 0.3,
  skipPer: 0.25,
  birdPer: 0.15,
  subPer: 0.12,
  costGrowth: 1.18,
  oldLayerCostSteepen: 1.12,
  oldLayerWeightSoft: 0.4,
  towersBeforeDepot: 4,
  noDepotMul: 0.6,
}

export const DEMAND = {
  baseListenersPerSec: 0.85,
  elasticity: 1.35,
  wordOfMouth: 0.45,
  earlyMulStart: 0.55,
  earlyMulEnd: 1,
  /** Healthy-signal audience slope. Weird elasticity replaces this. */
  claritySlope: 0.35,
}

export const DECAY = {
  rate: 0.018,
  clarityFloor: 0.35,
  holdPush: 0.08,
  coolingPerLog: 0.35,
  heatRisePerAirSec: 0.012,
  heatMax: 3,
  underFloorAudienceMul: 0.55,
  underFloorStarNick: 0.002,
  eraMul: [1, 1, 1.05, 1.12, 1.2, 1.28, 1.35, 1.4, 1.45, 1.5, 1.55, 1.6, 1.65] as const,
}

export const AIR = {
  tuneCooldownSec: 2,
  holdFocusCost: 0,
  /** ~8s to fill a buffer while holding — length comes from clean-log counts. */
  logFillPerSec: 0.125,
  logRotSec: 45,
  cleanLogPay: 1.15,
  /** Flat cash pop when you press Air (on top of listener revenue). */
  airBurstCash: 3.5,
  airDurationSec: 10,
  airCooldownSec: 1.5,
  rateBase: 3.2,
  focusMax: 1,
  focusRegenPerSec: 0.08,
  carrierLockBonus: 0.45,
}

export const DEPTH = {
  shiftSlots: ['dawn', 'day', 'night'] as const,
  shiftDaySec: 900,
  starsStart: 3.5,
  starMinEra1: 3.5,
  starMinSkip: 3.8,
  callerVisitGapSec: 110,
  callerPatienceSec: 140,
  /** ~8s/log × 280 ≈ 37 min of hold/log/air for the bot Era 0 window. */
  era0CleanLogs: 280,
  era0DeadAirDips: 3,
  /** First antenna is a soft milestone (goal), not a hard door. */
  era0AntennaHintAt: 8,
  era1CallersNeed: 18,
  era1CheckInsNeed: 28,
  checkInCooldownSec: 140,
  /** Dawn days to leave Neighborhood (enter Era 2). 14 × 900s ≈ 3.5h of coverage. */
  dawnDaysNeedEra2: 14,
  dawnDaysNeedNet: 14,
  invoiceDueSec: 180,
  invoiceEarlyDisc: 0.97,
  invoiceLateFee: 1.08,
  invoiceUnpaidCap: 8,
  invoiceOnTimeNeedTower: 48,
  formatSlots: 6,
  formatPracticeNeed: 2,
  promoCooldownSec: 900,
  promoWeeksNeedSkip: 24,
  heatLogCooldownSec: 240,
  heatLogNeedEra3: 30,
  heatLogNeedLeave: 48,
  hotTraitCooldownSec: 720,
  hotTraitWalkNeed: 16,
  examHoldNeed: 10,
  cleanManifestNeed: 12,
  manifestCooldownSec: 600,
  fieldHaulNeed: 10,
  haulCooldownSec: 1850,
  quietStampNeed: 12,
  quietCooldownSec: 1100,
  guestEarNeed: 8,
  guestCooldownSec: 900,
  settleNeed: 8,
  settleCooldownSec: 900,
  yieldHaulNeed: 8,
  choreCooldownSec: 1200,
  habitWatchNeed: 8,
  habitCooldownSec: 900,
  clauseSeatNeed: 4,
  clauseCooldownSec: 900,
  rehearseNeed: 1,
  tournamentCooldownSec: 600,
  tournamentCallCost: 120,
  depotEarNeed: 12,
  autonomousEarNeed: 48,
  doctrineGrowth: 1.65,
  buildFacingSoftCap: 1.35,
  /** Bold shows pull this hard and run this hot. Safe / unset stay ×1. */
  programBoldPull: 1.12,
  programBoldHeat: 1.22,
  /** Richer night: night feature or a staffed night shift. */
  richerNightMul: 1.18,
  /** Weird elasticity: audience barely tracks clarity, and a big band thins the crowd. */
  weirdClaritySlope: 0.12,
  weirdBandDamp: 0.08,
  choirHumPerStore: 0.04,
  choirHumCap: 0.3,
  choirHushSec: 480,
  towerMatchStep: 0.08,
  towerPushStep: 0.04,
  towerPolicyCap: 0.24,
  towerQuietRelay: 0.96,
  towerQuietFloor: 0.84,
  towerPushNoise: 0.04,
  towerQuietNoise: 0.03,
  metroSoftNoise: 0.02,
  fastManifestMin: 24,
  fastManifestCashSec: 8,
  fastManifestFrac: 0.45,
  buyQtyMax: 10,
}

export const DIAL = {
  practicePerLayer: 2,
  deskGapSec: 28 * 60,
  slowReels: 10,
  slowRoutes: 8,
  slowSeasons: 7,
  slowPhrases: 7,
  keepClauses: 4,
  hearingSessions: 3,
  rehearsalMissChance: 0.2,
  rehearsalRetrySec: 120,
  acceptMean: 0.85,
  endlessMutateSec: 3600,
}

export const LATE = {
  buildingFloorSec: 45,
}

export const CAPITAL = {
  towerBase: 85,
  towerGrowth: 1.22,
  antennaBase: 28,
  antennaGrowth: 1.35,
  hireBase: 18,
  hireGrowth: 1.15,
  promoCost: 35,
  retuneMinEra: 3,
}

export const ERA_TITLES = [
  'The Shack',
  'Neighborhood',
  'The Net',
  'Night Skip',
  'Band Plan',
  'Birds',
  'The Quiet',
  'Subcarrier',
  'Packet Net',
  'Night Garden',
  'Grammar',
  'Charter of Air',
  'Last Carrier',
] as const

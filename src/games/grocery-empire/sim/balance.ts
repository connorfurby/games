/** All tunable constants. UI and content read these; nothing hardcodes economy numbers. */

export const TICK_HZ = 10
export const DT = 1 / TICK_HZ
export const OFFLINE_STEP_SEC = 1
export const OFFLINE_CAP_SEC = 8 * 60 * 60
export const AUTOSAVE_MS = 10_000
export const SAVE_VERSION = 4

export const START = {
  /** Gentler open: enough for a first wholesale dip without immediate rent panic. */
  cash: 35,
  price: 1.5,
  /** More starter stock so Unpack → first baskets lands before the truck is urgent. */
  backroomCans: 24,
}

export const PRICE = { min: 0.05, max: 50, step: 0.01 }

/**
 * shoppers/sec = base * (refPrice / price)^elasticity * demandMultiplier
 * Plan Part F Era 0 uses elasticity 1.35 (Paperclips-like pull curve).
 */
export const DEMAND = {
  baseShoppersPerSec: 0.25,
  refPrice: 1.5,
  elasticity: 1.35,
  adMultPerLevel: 1.08,
  adStartCost: 20,
  substitution: 0.4,
  reputationBonusPerPoint: 0.03,
}

export const CHECKOUT = {
  basePerSec: 1,
  perCashier: 1.5,
  expressLaneMul: 1.4,
  /** Extra checkout lanes from a managed store (≥ half fair Attention). */
  perManagedStore: 0.7,
  /** Neglected store still adds a sliver of lanes. */
  perNeglectedStore: 0.15,
  /** Attention share vs fair share below this = neglected. */
  neglectAttFrac: 0.5,
}

export const WHOLESALE = {
  baseCanCost: 0.8,
  spoolUnits: 24,
  indexStart: 1,
  indexFloor: 0.78,
  baseFloor: 0.9,
  sineAmp: 0.14,
  changeChancePerSec: 0.16,
  buyBump: 0.006,
  idleSagEverySec: 25,
  idleSag: 0.004,
  supplierB: { discount: 0.85, delaySec: 30, minSpools: 2, shortShipChance: 0.15, shortShipFrac: 0.75 },
}

/** Restock Smarts: auto-order only when index <= tipIndex * (base − perRank × rank). */
export const RESTOCK_SMARTS = { tolBase: 1.04, tolPerRank: 0.02 }

export const SHELF = { baseCap: 40 }
export const BACKROOM = { baseCap: 60, perRackLevel: 25 }

export const UNPACK = {
  clerkPerSec: 0.6,
  stockerPerSec: 0.2,
  levelBonus: 0.05,
}

export const SPOIL = {
  backroomAgeMul: 0.5,
  stockerMul: 0.85,
  maxStockers: 3,
  heatMul: 1.3,
  coldSnapMul: 0.8,
}

export const SHRINK = {
  perUnitPerSec: 0.0006,
  securityCut: 0.15,
  cashierCut: 0.05,
  floor: 0.2,
  mirrorMul: 0.7,
  senseCutPerLevel: 0.06,
}

export const INSPECTION = {
  decayPerSec: 0.002,
  lowMoraleThreshold: 0.7,
  lowMoralePerSec: 0.003,
  fineCashFrac: 0.15,
  fineFlat: 15,
  demandPenalty: 0.9,
  penaltySec: 120,
  inspectorCost: 12,
  inspectorCooldownSec: 120,
  inspectorRelief: 0.5,
  prepMul: 0.6,
  cushionPerLevel: 0.1,
  /** Meter gain per spoiled unit. */
  inspectionPerUnit: 0.012,
}

export const MORALE = {
  regenPerSec: 0.01,
  longHoursPenalty: 0.8,
  securityCrowding: 0.04,
  pizzaCost: 15,
  pizzaBoost: 0.15,
  pizzaCooldownSec: 180,
  min: 0.5,
  max: 1.15,
}

export const HOURS = { min: 0.5, max: 1.5, nightMax: 2, longThreshold: 1.2, nightEfficiency: 0.6 }

export const LOYALTY = { bonusByTier: [0, 0.08, 0.14], liabilityFrac: 0.03, weekSec: 600, redeemCapFrac: 0.2 }

export const WEATHER_SEC = 180

/** Era 2+ timed rival circular (Part K light). Mild — never bricks. */
export const COUPON_WAR = {
  minGapSec: 8 * 60,
  /** Soft chance each sim-second once past minGap (≈ fires by ~12 min). */
  startChancePerSec: 1 / 180,
  durationSec: 90,
  demandMul: 0.92,
  /** Match cost = ceil(adCost * matchCostFrac). */
  matchCostFrac: 0.5,
  brandBoost: 0.05,
}

/**
 * Era 2+ mild rival pressure cloned from the coupon-war pattern. One slot, three flavors.
 * Each has a player verb (Answer) that ends it early; nothing here can brick a run.
 */
export const RIVAL_EVENTS = {
  minGapSec: 10 * 60,
  startChancePerSec: 1 / 240,
  durationSec: 80,
  /** Price undercut: mild demand dip. */
  undercutDemandMul: 0.94,
  /** Staff poach: morale target dip (needs staff on the clock). */
  poachMoraleTarget: -0.06,
  /** Health smear: mild demand dip; Answer restores Brand. */
  smearDemandMul: 0.95,
  /** Endcap raid: rival rents the door-side display; mild demand dip (needs ≥1 endcap). */
  raidDemandMul: 0.96,
  /** Answer cost = ceil(adCost * answerCostFrac), floor of 2. */
  answerCostFrac: 0.4,
  brandBoost: 0.03,
} as const

/** Era 4+ franchise clone: a lookalike opens down the road; Brand takes a small, recoverable nick. */
export const FRANCHISE_CLONE = {
  minGapSec: 8 * 60,
  chancePerFranchisePerSec: 1 / 900,
  brandHit: 0.02,
}

/** Era 2+ Ideas sink — temporary demand spike with mild Brand risk on end. */
export const CELEBRITY_ENDCAP = {
  durationSec: 120,
  demandMul: 1.25,
  brandRiskChance: 0.4,
  brandHit: 0.06,
  cashCost: 1800,
  ideasCost: 8,
}

export const COMPUTE = {
  /** Soft baskets reminder; back-office memo is the real unlock (~1200). */
  unlockBaskets: 1200,
  attentionPerAnalyst: 8,
  capPerArchive: 1000,
  ideasBase: 0.35,
  ideasExp: 1.1,
  /** First Reputation +1 from baskets (free starter Rep is separate). */
  firstRepAt: 1500,
  /** Starting free Reputation (not earned from baskets). */
  freeRep: 2,
  /** Gap after k basket-earned points: round(repGapBase × repGapGrowth^k). */
  repGapBase: 900,
  repGapGrowth: 1.16,
}

/** Cash paid to move 1 spent Reputation between Analyst ↔ Archive (keeps ≥1 of each). */
export const OFFICE_REBALANCE = {
  baseCash: 180,
  growth: 1.45,
}

/** Chip-based scanner path (unused by Part K pulse UI). */
export const SCANNER = {
  chipCostBase: 10_000,
  chipCostStep: 5_000,
  maxChips: 10,
  gainPerChip: 40,
  phaseSpeed: 0.9,
}

/** Clickable Attention pulse — Scanner Array memo unlock. */
export const SCANNER_PULSE = {
  cooldownMinSec: 2,
  cooldownMaxSec: 4,
  /** Base Attention grant before wobble (scales lightly with Analysts). */
  baseBurst: 80,
  perAnalyst: 12,
  /** Multiplier range — sometimes skimpy, sometimes generous; always ≥ 0. */
  wobbleMin: 0.35,
  wobbleMax: 2.15,
}

export const RETRAIN = { baseAttention: 5000, ideas: 50, growth: 2 }

export const RECOVERY = {
  helperAfterSec: 30,
  helperCooldownSec: 3600,
  helperCrates: 12,
  interventionAfterSec: 90,
  bailoutCash: 15,
  bailoutCrates: 12,
  bailoutCooldownSec: 300,
  emergencyCrates: 24,
  /** Era 0 mentor crate: minimum gap between grants (sim seconds). */
  mentorCooldownSec: 120,
  /** Dump-cooler inspection meter is this fraction of the spoil rate (you chose to bin it). */
  dumpInspectionFrac: 0.25,
  arrearsCapSec: 600,
  arrearsRevenueShare: 0.5,
}

/**
 * Passbook — slow parking, capped by Empire level.
 * ~0.8%/hr base; Better Passbook mainly raises the cap.
 */
export const PASSBOOK = {
  ratePerSec: 0.00005 / 22.5, // ≈ 0.8%/hr
  rateBonusPerLevel: 0.04,
  capBase: 2500,
  capGrowth: 1.42,
  /** Extra cap fraction per Better Passbook upgrade level. */
  capBonusPerUpgrade: 0.12,
}

export const DEBT = { nephewCash: 80, nephewOwed: 120, revenueShare: 0.1, planBonusPerLevel: 0.25 }

export const EMPIRE = {
  xpPerUnitSold: 0.4,
  xpPerMemo: 25,
  xpPerUpgrade: 5,
  /** Soft XP from venture collect — scaled by payout, far below basket XP. */
  xpPerVentureCollect: 2,
  xpPerVentureCash: 0.0004,
  levelBase: 100,
  levelGrowth: 1.35,
  maxLevel: 50,
  /** +2.5% demand per Empire level above 1. */
  demandPerLevel: 0.025,
}

/** Staff seats from storefront tier (index = builds.storefront). */
export const STAFF_SEATS = {
  byStorefront: [0, 3, 5, 8, 12, 16, 22, 30] as const,
  sideYardBonus: 2,
  perExtraStore: 2,
  parkingBonus: 1,
  /** Shift Lead upgrade: +1 seat every this many ranks. */
  shiftLeadPerRanks: 2,
}

/** Variety / feature-aisle demand rules. */
export const VARIETY = {
  /** +10% for 2nd and 3rd aisle. */
  earlyEach: 0.1,
  /** +4% for each aisle after the 3rd. */
  lateEach: 0.04,
  featureMixMin: 0.75,
  featureWeightMul: 1.25,
  featureSpoilMul: 1.15,
  facingBonusPerLevel: 0.04,
}

/** Marketing postures — one active at a time. */
export const MARKETING = {
  switchFee: 40,
  postures: {
    neighborhood: { demandMul: 1, revenueMul: 1, privateLabelWeightMul: 1 },
    circular: { demandMul: 1.18, revenueMul: 0.92, privateLabelWeightMul: 1 },
    houseBrand: { demandMul: 0.92, revenueMul: 1.16, privateLabelWeightMul: 1.35 },
  } as const,
  /** Loss Leader doctrine sweetens Circular shoppers. */
  lossLeaderCircularBonus: 0.06,
  /** Premium Bodega doctrine sweetens Premium policy revenue. */
  premiumBodegaRevenueBonus: 0.04,
  paybackWarnSec: 30 * 60,
}

/** Memo-gated wholesale price lock. */
export const PRICE_LOCK = {
  durationSec: 180,
  /** Cost ≈ this many crates of the selected aisle. */
  cratesCost: 8,
}

/** Venture foot traffic — open ventures bring shoppers to the aisle. */
export const VENTURE_TRAFFIC = {
  perOpen: 0.03,
  cap: 0.25,
}

export const STAFF_XP = { perSec: 1, perLevel: 60, trainingBonusPerLevel: 0.25 }

export const ENDCAP = { base: 40, growth: 1.3, demandEach: 0.04, max: 10, refund: 0.5 }

export const HISTORY = { everySec: 5, keep: 72 }

/** Era 2 — chain & capital (plan Part F). */
export const CHAIN = {
  maxStores: 12,
  openBaseCost: 12_000,
  openGrowth: 2.1,
  xpPerSaleShare: 0.35,
  xpPerLevel: 80,
  maxStoreLevel: 20,
  attentionDrainPerSec: 0.45,
  depotDemandMul: 1.08,
  storeCountDemandEach: 0.35,
  /** Metro slot: extra demand per store beyond the first. */
  metroStoreDemandEach: 0.08,
  metroAttDrainMul: 0.9,
  /** Corner parcel: next store cheaper + opens one level higher. */
  cornerParcelCostMul: 0.85,
  cornerParcelStartLevelBonus: 1,
  /** Lot ownership: corner presence. */
  lotDemandMul: 1.08,
  parkingDemandMul: 1.1,
  parkingRentPerMin: 0.35,
  policyDemand: { local: 1.12, standard: 1, premium: 0.9 } as const,
  policyRevenue: { local: 0.96, standard: 1, premium: 1.14 } as const,
  policyShrink: { local: 1.08, standard: 1, premium: 0.92 } as const,
  neglectSpoilMul: 0.4,
}

/**
 * Risk book — yield only on balance inside the Empire-scaled cap.
 * Means ≈ 3% / 7% / 14% per hour at engine 0.
 * engineMeanBonus is additive fraction of the base mean (not a runaway multiply).
 */
export const INVEST = {
  tickSec: 2.5,
  unlockCash: 8000,
  engineBaseCost: 2500,
  engineGrowth: 1.65,
  maxEngine: 8,
  circuitDrop: 0.4,
  risk: {
    low: { mean: 0.0000206, vol: 0.00004 },
    mid: { mean: 0.000048, vol: 0.00022 },
    high: { mean: 0.000096, vol: 0.00085 },
  } as const,
  /** Engine level required before Mid / High can be selected. */
  riskGate: { mid: 2, high: 4 } as const,
  /** +6% of base mean per engine level. */
  engineMeanBonus: 0.06,
  /** Book cap = passbookCap × (bookCapBase + bookCapPerEngine × engine). */
  bookCapBase: 1.5,
  bookCapPerEngine: 0.45,
  /** Vault Clerk upgrade: +8% book/passbook cap per level. */
  vaultClerkCapBonus: 0.08,
}

/** Strategy doctrines — small stackable rule changes. */
export const DOCTRINE_EFFECTS = {
  throughputUnpackMul: 1.08,
  edlpElasticityMul: 0.92,
  hiLoAdBonus: 0.01,
  routeDensityDeliveryMul: 0.88,
  floatDisciplineCapMul: 1.2,
  bankReadBonus: 1.5,
} as const

/**
 * Upgrade rank gates by band.
 * Band 0 (Counter): classic `2 + floor(empire/2)` — teaching nodes ignore this.
 * Band 1 (Aisle): opens at empire 4 → `4 + max(0, empire - 4)`.
 * Band 2 (Chain): opens at empire 8 → `1 + floor((empire - 8) / 2)`.
 * Band 3 (Institution): opens at empire 16 → `1 + floor((empire - 16) / 3)`.
 */
export const UPGRADE_RANKS = {
  baseUnlocked: 2,
  perTwoEmpireLevels: 1,
  /** First purchase of a band > 0 node costs this × geometric cost. */
  layerToll: 2.5,
  /** Synergy product on a single cash node never exceeds this. */
  synergyCap: 1.25,
  /** Default k for diminishing curves. Rank 1 ≈ 13% of cap, 10 ≈ 60%, 30 ≈ 82%. */
  diminishK: 0.15,
  /** Default k for asymptotic curves. */
  asymptoteK: 0.08,
  bands: {
    0: { name: 'Counter', empireOpen: 0 },
    1: { name: 'Aisle', empireOpen: 4 },
    2: { name: 'Chain', empireOpen: 8 },
    3: { name: 'Institution', empireOpen: 16 },
  } as const,
}

/** Empire doctrine board — Rewrite the Charter refunds all trait points. */
export const PERK_RESPEC = { ideas: 40, growth: 2 }

/** Standing-order memos — repeatable operational ranks (Attention). */
export const STANDING_ORDERS = {
  max: 10,
  diminishK: 0.15,
  baseAttention: 400,
  growth: 1.35,
}

/** Amend the Minutes — clear one memo fork so the other standing order can be filed. */
export const AMEND_MINUTES = { ideas: 25, growth: 2 }

export const CAPITAL = {
  incorporateCash: 12_000,
  incorporateRep: 8,
  equityFromCashFrac: 0.25,
  boardIntervalSec: 420,
  boardIgnoreRepDrain: 0.15,
  tournamentAttention: 120,
  tournamentBaseRead: 4,
  readPerDoctrine: 1.5,
  autonomousReadNeed: 40,
  /** Reachable gate — was 80 (~6e8 baskets). Analyst/Archive spend should clear ~18. */
  autonomousRepSpentNeed: 18,
  brandRegenPerSec: 0.002,
  covenantDebtRatio: 0.45,
  doctrineBaseRead: 6,
  doctrineGrowth: 1.4,
}

/** Era 3 — cold chain. */
export const COLD = {
  plantCost: 25_000,
  plantGrowth: 1.45,
  tankCost: 18_000,
  tankGrowth: 1.4,
  plantSupply: 12,
  tankBuffer: 8,
  baseDemand: 10,
  demandPerPlant: 4,
  freshnessFloor: 0.25,
  momentumGainPerSec: 0.008,
  momentumDecayPerSec: 0.02,
  momentumMax: 3,
  brownoutLogCooldown: 45,
  yieldStart: 100_000,
  yieldDrainPerPlant: 2.5,
  quadraticYieldMul: 4,
  plantCashIncome: 8,
  surplusCashMul: 0.15,
  /** Cold ↔ aisle coupling (Era 3+, only once a plant or tank exists). */
  healthyLifeMul: 1.06,
  /** Extra perishable life per Momentum step above ×1 (while Momentum is on), capped. */
  momentumLifePerStep: 0.03,
  momentumLifeCap: 0.06,
  /** lifeMul cut at the brownout floor; ramps in as freshness drops below 100%. */
  brownoutLifeMul: 0.94,
  brownoutAgingMul: 1.15,
  brownoutDemandMul: 0.92,
  /** Dairy/meat category weight bump per Momentum step above ×1, capped. */
  momentumWeightPerStep: 0.05,
  momentumWeightCap: 1.1,
}

/** Era 3 — politics. */
export const POLITICS = {
  capitalStart: 20,
  leakPerSec: 0.015,
  lobbyGainPerSec: 0.004,
  lobbyCost: 40,
  lobbyCapitalGain: 12,
  acquireCash: 50_000,
  acquireCapital: 25,
  acquireGrowth: 1.5,
  monopolyPerAcquire: 0.12,
  monopolyFineCashFrac: 0.08,
  monopolyFineFlat: 5000,
  monopolyCap: 0.95,
  leaveYieldNeed: 0,
  leaveCapitalNeed: 15,
  brandRegenPerSec: 0.01,
}

/** Era 4 — globe logistics. */
export const LOGISTICS = {
  laneCash: 80_000,
  laneControl: 5,
  laneFuel: 40,
  fuelCapBase: 100,
  fuelCapPerBuffer: 50,
  fuelBurnPerLanePerSec: 0.08,
  fuelBuyUnit: 20,
  fuelBuyCash: 2000,
  controlFromCash: 0.00002,
  brandDriftPerFranchise: 0.004,
  franchiseCash: 60_000,
  franchiseBrandHit: 0.08,
}

/** Era 5 — seed barges / charter. */
export const FLEET = {
  bargeLaunchCash: 200_000,
  bargeLaunchRead: 8,
  bargeSoftFloor: 1,
  biomassStart: 50_000,
  harvestPerBargePerSec: 0.35,
  replicationPerSec: 0.002,
  charterBaseCap: 12,
  charterPerLegacy: 0.05,
  charterPerReadSpend: 1,
  readPerCharterPoint: 5,
  warLegacyGainPerSec: 0.04,
  warBargeLossChance: 0.0008,
  warLegacyLossOnHit: 0.5,
  guardianShellCost: 15,
  rebootCashFrac: 0.05,
  driftWinLegacy: 8,
}

/** Era 6 — endings / prestige. */
export const ENDINGS = {
  acceptAppetite: 0.05,
  acceptTip: 0.02,
  rejectDisassembleSec: 2,
}

/** New Game+ Hungry laws — mild mutators, never brick. */
export const HUNGRY_LAWS = {
  maxMutators: 2,
  /** agingMul multiplier when fasterSpoil is on. */
  fasterSpoilMul: 1.2,
  /** Cold plant / surplus cash when richerYield is on. */
  richerYieldMul: 1.25,
  /** Demand elasticity override when weirdElasticity is on (base 1.35). */
  weirdElasticity: 1.55,
  /** Ad cost growth after each buy (base 2). */
  expensiveAdsGrowth: 2.35,
} as const

/** All tunable constants. UI and content read these; nothing hardcodes economy numbers. */

export const TICK_HZ = 10
export const DT = 1 / TICK_HZ
export const OFFLINE_STEP_SEC = 1
export const OFFLINE_CAP_SEC = 8 * 60 * 60
export const AUTOSAVE_MS = 10_000
export const SAVE_VERSION = 38

/** Re-export puzzle bars used across goals / UI (same numbers as HORIZON / content). */
export const PUZZLE_SLOW = 0.72
export const PUZZLE_FAST = 0.85

/** Era depth framework (facings, departments, open/close, contracts). */
export const DEPTH = {
  ERA1_BASKETS_GATE: 1350,
  /** With a hire on Open shift, still need this many baskets before Era 1. */
  ERA1_HIRE_BASKETS: 1050,
  /** Early demand ramp: soft foot traffic until facing + regulars land. */
  earlyDemandMulStart: 0.34,
  earlyDemandMulEnd: 1,
  marketBellNeed: 3,
  era1RegularNeed: 10,
  /** Layaway slips (manual serve of layaway visits) — separate Era 1 gate. */
  layawaySlipNeed: 16,
  /** Extra visit gap when the active regular is on a layaway slip. */
  layawayVisitGapSec: 150,
  /** Dock check-in cooldown shortener unit (read via upgradeEffect('dock-check-pad')). */
  dockCheckPadPerRank: 0.08,
  /** Side-yard path: receiver check-ins at the dock. */
  dockCheckInNeed: 28,
  dockCheckInCooldownSec: 120,
  era2RegularNeed: 24,
  era1StarMin: 3.5,
  writeOffNeedEra2: 3,
  invoiceOnTimeNeedLot: 3,
  invoiceOnTimeNeedSideYard: 48,
  invoiceDueSec: 180,
  invoiceEarlyDisc: 0.97,
  invoiceLateFee: 1.08,
  /** Cap unpaid invoices so float cannot run forever (softlock floor for fuzz). */
  invoiceUnpaidCap: 8,
  flagshipSlots: 6,
  flagshipPracticePerEra: 2,
  flagshipSlow: 0.72,
  flagshipFast: 0.85,
  shiftSlots: ['open', 'mid', 'close'] as const,
  /** Close coverage cuts night shrink. */
  closeShiftShrinkMul: 0.92,
  /** Mid coverage eases checkout during the midday third of a shift day. */
  midShiftCheckoutMul: 1.12,
  /** Chain Patrol slows store drift; Push raises demand slightly. */
  chainPatrolDriftMul: 0.88,
  chainPushDemandMul: 1.08,
  /** Logistics Schedule improves clean-manifest odds; Push Freight speeds lane income slightly. */
  logisticsScheduleCleanMul: 1.1,
  logisticsPushFreightMul: 1.08,
  /** Survey policies: volume / margin / fresh on planet pull. */
  surveyVolumeMul: 1.1,
  surveyMarginMul: 1.08,
  surveyFreshMul: 1.06,
  /** Max powered cold plants at once (own three, run two). */
  plantPowerSlots: 2,
  /** Sim seconds per store day (Open → Mid → Close thirds). */
  shiftDaySec: 900,
  /** SAVE 34: a served climate guest bans one featured facing's pull until the next shift day. */
  climateFacingBanPullMul: 0.85,
  /** Phase 9: Guest Patience (and the Guest Awning) soften the ban's cut, up to this share of it. */
  guestPatienceCap: 0.6,
  /** Phase 9: the Guest Awning project adds this much patience on its own. */
  guestAwningPatience: 0.2,
  /** Phase 9: ration week — an unstamped ledger after the first slice of the shift day feeds the Ration Board. */
  rationBoardDemandMul: 0.93,
  /** Share of the ledger day the Board waits before it counts the stamp as missed. */
  rationBoardGraceFrac: 1 / 3,
  /** Side yard needs this many Open days covered (Phase 2 lengthen → ~3.5–4h). */
  openDaysNeedSideYard: 14,
  regularVisitGapSec: 120,
  regularPatienceSec: 150,
  starsStart: 3.5,
  starsMin: 1,
  starsMax: 5,
  /** Missed regular / late invoice star hits. */
  starMissHit: 0.05,
  starLateInvoiceHit: 0.04,
  starServeBump: 0.08,
  /** Drift back toward starsStart when open and stocked. */
  starRegenPerSec: 0.01,
  /** Temporary demand cut after a missed regular (sim seconds). */
  regularMissDemandMul: 0.82,
  regularMissDemandSec: 45,
  /** Unstaffed Open shift: bottleneck + spoil pressure. */
  unstaffedOpenSpoilMul: 1.18,
  unstaffedOpenDemandMul: 0.9,
  closedDemandMul: 0.35,
  closedWageMul: 0.25,
  /** Per receiver on ETA; soft-capped with a floor. */
  receiverEtaMul: 0.7,
  marketBellIndex: 0.88,
  greengrocer: { discount: 0.75, ageOnArrive: 60, cat: 'produce' as const },
  freshSeats: { lead: 1, specialists: 2 },
  facingPullDefault: 1,
  /** Morning write-off cooldown (sim seconds). */
  writeOffCooldown: 480,
  /** Shift Lead staff: +1 floor seat each. */
  shiftLeadSeatBonus: 1,
  butcherMeatLifeMul: 1.45,
  dairyClerkLifeMul: 1.3,
  /** Markdown cash fraction of unit wholesale when write-off discounts. */
  writeOffDiscountFrac: 0.35,
  /** Era 2 flyer / circular: featured aisles demand bump (sim seconds). */
  circularSec: 600,
  circularDemandMul: 1.18,
  /** Cooldown after a flyer week completes before the next print. */
  flyerCooldownSec: 110 * 60,
  /** Cold permit needs this many completed flyer weeks (band-held). */
  flyerWeeksNeed: 4,
  /** Price ceilings vs bestPrice while a flyer band is live. */
  flyerBandSoftMax: 0.98,
  flyerBandMidMax: 0.9,
  flyerBandDeepMax: 0.8,
  /** Band-lock cooldown shortener (upgradeEffect('flyer-band-pad')). */
  flyerBandPadPerRank: 0.06,
  /** SAVE 32: live deep flyer pulls Penny — lock chance ×, quiet gap × while the week runs. */
  flyerDeepPennyLockChanceMul: 2.5,
  flyerDeepPennyLockGapMul: 0.55,
  /** SAVE 32: live soft flyer feeds FreshWay spoil (× on the FreshWay mul, even with tunnel + log). */
  flyerSoftFreshWaySpoilMul: 1.25,
  /** Cold permit matched-store hard gate. */
  matchedStoresNeed: 4,
  /** Era 2 companion: bank Read via tournaments before cold permit. */
  bankReadNeed: 24,
  /** Cold permit star floor (memo block uses starMemoFloor for others). */
  coldPermitStarMin: 3.7,
  /** Hot-trait walks credited during block events (cold permit gate). */
  hotTraitWalkNeed: 8,
  /** Hot-trait walk gap shortener (upgradeEffect('hot-trait-pad')). */
  hotTraitPadPerRank: 0.08,
  /** Soft floor: certain memos blocked below this. */
  starMemoFloor: 3.0,
  /** Mild demand cut while Penny forces a counter-flyer. */
  counterFlyerDemandMul: 0.92,
  counterFlyerGapSec: 11 * 60,
  counterFlyerChancePerSec: 1 / 220,
  /** Block events rewrite the hot trait for a window (fixed gap — not chance). */
  blockEventGapSec: 16 * 60,
  blockEventDurationSec: 5 * 60,
  /** @deprecated fixed-gap spawn; kept so old reads do not NaN. */
  blockEventChancePerSec: 0,
  blockEventDemandMul: 1.14,
  /** Commissary softens no-depot penalty; raises Attention drain. */
  commissaryNoDepotMul: 0.82,
  commissaryAttDrainMul: 1.12,
  /** Penny aisle lock cadence. */
  rivalLockGapSec: 8 * 60,
  rivalLockChancePerSec: 1 / 200,
  /** Horizon rival pressure cadence (Drift / Keelmark / Verdant / Static / Concord / Ration). */
  hzRivalGapSec: 24 * 60,
  hzRivalChancePerSec: 1 / 280,
  /** Bakery open-cycle (sim seconds): strong first half, weak second. */
  bakeryCycleSec: 600,
  bakeryMorningMul: 1.28,
  bakeryAfternoonMul: 0.62,
  /** Frozen without tunnel/plant coverage. */
  frozenNoColdWeightMul: 0.55,
  /** FreshWay dump when no tunnel plant. */
  freshWaySpoilMul: 1.55,
  /** Tunnel spoil cut for fresh aisles when Fresh dept is staffed. */
  tunnelFreshAgeMul: 0.72,
  /** Unstaffed chain stores drift faster. */
  unstaffedDriftMul: 1.6,
  /** Brownout drill cadence / duration. */
  brownoutDrillGapSec: 12 * 60,
  brownoutDrillDurationSec: 90,
  /** Port Broker discount / weather short chance. */
  portBrokerDiscount: 0.72,
  portBrokerShortChance: 0.35,
  /** Franchise loyalty drift / win-back. */
  franchiseLoyaltyDrift: 0.0035,
  franchiseDefectAt: 0.28,
  franchiseWinBackControl: 8,
  franchiseWinBackLoyalty: 0.35,
  megaMartGapSec: 10 * 60,
  megaMartDurationSec: 180,
  megaMartBuyoutCashFrac: 0.04,
  /** Purser Control from work (log-scaled with cash). */
  purserControlPerSec: 0.04,
  /** Dispatcher fuel burn mul (<1). */
  dispatcherFuelMul: 0.82,
  liaisonDriftMul: 0.7,
  /** Era 6 ration week (~90 min content; bots finish faster). */
  rationWeekSec: 90 * 60,
  rationTaxMul: 0.72,
  rationDemandMul: 1.55,
  rationFreshBiasMul: 1.2,
  rationImportBiasMul: 1.15,
  /** Manifest cooldown / fuel cycle. */
  manifestCooldownSec: 45,
  /** Cooler Log: timed temp checks (Era 3 leave gate). */
  coolerLogGapSec: 52 * 60,
  coolerLogNeed: 6,
  /** Window after a signed log that counts as “recent” for FreshWay relief. */
  coolerRecentLogSec: 20 * 60,
  /** Per missed log: brownout pressure (demand mul) and FreshWay spoil bump. */
  coolerMissedBrownoutMul: 0.08,
  coolerMissedFreshWayMul: 0.12,
  /** Leave the Region star floor. */
  leaveStarMin: 3.5,
  /** Dispatch Board: clean matched manifests toward barge berth. */
  cleanManifestsNeed: 5,
  /** Exam holds sworn before berth (setManifest locks; swearExam credits). */
  examHoldNeed: 8,
  /** Window to swear after locking a matching manifest. */
  examHoldSec: 8 * 60,
  /** Exam hold shortener (upgradeEffect('exam-hold-pad')). */
  examHoldPadPerRank: 0.08,
  /**
   * Sim seconds between exam credits AND (separate clock) between clean credits (loop stretch).
   * SAVE 33: one filing is ONE stance, so cleans and exams tick on their own clocks —
   * a bot that files exam then clean each cycle keeps the old pacing.
   */
  dispatchCycleSec: 70 * 60,
  /** SAVE 33 fast stance: cash burst = matchedLaneCashPerSec × this (sim s), plus a fuel spend. */
  fastManifestSec: 600,
  fastManifestFuel: 8,
  /** SAVE 33 fast stance: the next filing only waits this fraction of manifestCooldownSec. */
  fastManifestCooldownFrac: 0.4,
  /** Barge berth / first launch star floor. */
  bargeStarMin: 3.5,
  /** Era 6 door star floor (Pocket Ops + Orbit Mid + Hold). */
  era6StarMin: 3.5,
  /**
   * Pocket Ops: one-way hauler trip ETA (sim seconds).
   * Concurrent trips capped (pocketTripConcurrent) so the door is an ETA clock;
   * 8 matching trips × 4 pockets × 12 min ≈ 6.4 h after Era 5 → Era 6 ~18–22 h.
   */
  pocketTripSec: 18 * 60,
  /** Max simultaneous en-route Pocket Ops trips (replication cannot parallelize the clock). */
  pocketTripConcurrent: 1,
  /** Rest after a hauler arrives before next dispatch. */
  berthTurnaroundSec: 7 * 60,
  /** Era 6 reads this many completed turnarounds. */
  berthTurnaroundNeed: 10,
  /** Turnaround shortener (upgradeEffect('berth-turn-pad')). */
  berthTurnPadPerRank: 0.08,
  /** Ration ledger stamps while stars are frozen (Continue gate). */
  rationLedgerNeed: 12,
  /**
   * Payroll. Era wage used to stop at Era 3; it now keeps climbing so a full
   * org sits roughly in targetFullFrac of recent revenue. Soft-cap clamps the
   * burden so wages cannot eat more than softCapFrac of revenue forever.
   */
  payroll: {
    eraWagePerEra: 0.08,
    /** Full org target band (docs / tests). */
    targetFullLow: 0.15,
    targetFullHigh: 0.25,
    /** Hard soft-cap vs rates.revenuePerSec. */
    softCapFrac: 0.3,
  },
}

/** Lifetime revenue before the Lot Survey memo appears (Era 1 → 2 spine). */
export const LOT_SURVEY_LIFETIME = 52_000

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
  levelBase: 120,
  levelGrowth: 1.37,
  maxLevel: 160,
  /** +2.5% demand per Empire level above 1. */
  demandPerLevel: 0.025,
}

/** Staff seats from storefront tier (index = builds.storefront). */
export const STAFF_SEATS = {
  /** Index = builds.storefront. Tiers 8–10 are Probe Plaza / Atrium / Last Aisle. */
  byStorefront: [0, 3, 5, 8, 12, 16, 22, 30, 36, 42, 48] as const,
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
  /** One-time depot build cost. */
  depotCash: 18_000,
  /** Drift at which a store counts as drifting (UI warning, Walk drifting). */
  driftWarn: 0.4,
  /** Attention to train a store: base × growth^(level−1). */
  trainAttBase: 60,
  trainAttGrowth: 1.28,
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
  /** Sim seconds before the next tournament (manual or auto). */
  tournamentCooldownSec: 600,
  autonomousReadNeed: 48,
  /** Reachable gate — was 80 (~6e8 baskets). Analyst/Archive spend should clear ~18. */
  autonomousRepSpentNeed: 18,
  /** First depot needs banked Read so Strategy cannot be skipped. */
  depotReadNeed: 12,
  brandRegenPerSec: 0.002,
  covenantDebtRatio: 0.45,
  doctrineBaseRead: 6,
  /** Steeper ladder — multi-hour Read sink, not a one-sitting clear. */
  doctrineGrowth: 1.65,
}

/** Era 3 — cold chain. */
export const COLD = {
  plantCost: 60_000,
  plantGrowth: 1.6,
  tankCost: 45_000,
  tankGrowth: 1.55,
  plantSupply: 16,
  tankBuffer: 8,
  baseDemand: 10,
  demandPerPlant: 4,
  freshnessFloor: 0.25,
  momentumGainPerSec: 0.008,
  momentumDecayPerSec: 0.02,
  momentumMax: 3,
  brownoutLogCooldown: 45,
  /** Blast plants only drain yield; ~45–70 min with a staffed blast. */
  yieldStart: 10_000,
  yieldDrainPerBlast: 3.2,
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
  /** One lobbyist beats the leak. Extra retainers stack. */
  lobbyGainPerSec: 0.02,
  lobbyCost: 40,
  lobbyCapitalGain: 12,
  acquireCash: 400_000,
  acquireCapital: 25,
  acquireGrowth: 2.2,
  monopolyPerAcquire: 0.12,
  monopolyFineCashFrac: 0.08,
  monopolyFineFlat: 5000,
  monopolyCap: 0.95,
  leaveYieldNeed: 0,
  leaveCapitalNeed: 15,
  leaveBillsNeed: 2,
  brandRegenPerSec: 0.01,
  /** Named bills (replace anonymous acquire spam for leave gate). */
  billCash: 180_000,
  billCapital: 18,
  billGrowth: 1.55,
}

/** Era 4 — globe logistics. Priced for a few minutes of post-cold Era 4 cash. */
export const LOGISTICS = {
  laneCash: 8_000_000,
  laneGrowth: 2,
  laneControl: 5,
  laneFuel: 40,
  fuelCapBase: 100,
  fuelCapPerBuffer: 50,
  fuelBurnPerLanePerSec: 0.08,
  fuelBuyUnit: 20,
  fuelBuyCash: 400_000,
  controlPerLogCash: 0.01,
  brandDriftPerFranchise: 0.004,
  franchiseCash: 12_000_000,
  franchiseGrowth: 1.9,
  franchiseBrandHit: 0.08,
  /** Matched wet lane cash trickle (per lane / sec). */
  matchedLaneCashPerSec: 40,
  dryLaneCashPerSec: 8,
}

/** Era 5 — seed barges / charter / biomass pockets. */
export const FLEET = {
  bargeLaunchCash: 5_000_000_000,
  bargeGrowth: 2.4,
  bargeLaunchRead: 8,
  bargeSoftFloor: 1,
  /** Compat total; pockets are the live drain. Kept for UI/migrate. */
  biomassStart: 12_000_000,
  /** Six pockets; focused Haulers clear 4 via trip ETAs (~90 min parallel). */
  pocketCount: 6,
  pocketMax: 450_000,
  /** Matching trips needed to empty one pocket (clear max / this per arrive). */
  tripsToClearPocket: 8,
  /** Compat — idle drain removed; trips clear pockets. */
  haulerClearPerSec: 55,
  replicatorCopyChance: 0.004,
  arkCharterMul: 1.35,
  /** Shell vs Replication fork: each point of the other axis softens this one. */
  shellRepConflict: 0.08,
  harvestPerBargePerSec: 2,
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
  /** Ration packs into backroom per successful pocket clear chunk. */
  rationPerTripClear: 18,
  /** Compat with older harvest-tick ration drip. */
  rationPerBargePerSec: 0.15,
  /** Pockets cleared + ration facing required for Era 6. */
  era6PocketsNeed: 4,
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

/**
 * 2.0 network — every owned asset copies the flagship's sales.
 * Total income ≈ flagship sales × value ladder × network.
 */
export const NETWORK = {
  /** Share of a copied sale that lands as profit (stores buy their own stock). */
  margin: 0.55,
  /** A fresh chain store is worth this many flagships; +perLevel each store level. */
  storeBase: 0.7,
  storePerLevel: 0.08,
  /** Neglected store floor (fraction of its weight at zero Attention). */
  neglectFloor: 0.55,
  driftCut: 0.3,
  /** Without a Depot, stores from this index on run at noDepotMul. */
  storesBeforeDepot: 4,
  noDepotMul: 0.6,
  depotMul: 1.2,
  perFranchise: 1.5,
  /** Each acquired district (Era 3 politics) multiplies the whole network. */
  perDistrict: 0.3,
  /** Each fuelled ocean lane (Era 4) multiplies the network; dry lanes barely help. */
  perLane: 0.25,
  perDryLane: 0.08,
  /** Each seed barge (Era 5+). */
  perBarge: 0.15,
  autonomousMul: 1.3,
  /** Empire XP from copied baskets, relative to flagship baskets. */
  xpShare: 0.06,
  /**
   * Once the next era’s layer is online, further buys of the previous repeatable
   * get steeper and old-layer network weight soft-caps (stops climbing hard).
   * Chain→cold→lanes→barges→planets.
   */
  oldLayer: {
    /** Extra geometric cost growth per buy past softAfter once next layer is up. */
    costSteepen: 1.12,
    /** Weight of units past softAfter (1 = full, 0 = frozen). */
    weightSoft: 0.4,
    /** Soft-cap floor for cold momentum once lanes exist. */
    coldMomentumFloor: 1.6,
    softAfter: {
      /** Extra chain stores past this index (excl. flagship) after plants exist. */
      stores: 6,
      /** Extra plants past this count after lanes exist. */
      plants: 4,
      /** Extra lanes past this count after barges exist. */
      lanes: 3,
      /** Extra barges past this count after a planet is stocked. */
      barges: 6,
    },
  },
}

/**
 * 2.0 value ladder — premium stock: price and wholesale cost both scale.
 * storefront[i] pairs with BUILD_TRACKS storefront tiers[i]:
 *   0 Empty, 1 Stall, 2 Corner (×2), 3 Standard (×3.5), 4 Super (×6),
 *   5 Hyper (×10), 6 Mega (×16), 7 Hub (×24),
 *   8 Probe Plaza (×32), 9 Greenhouse Atrium (×40), 10 Last Aisle (×52).
 * builds.storefront starts at 1 (Stall). Late tiers 8–10 keep a modest step so
 * the building ladder matches the claim without a new exponent.
 */
export const VALUE = {
  storefront: [1, 1, 2, 3.5, 6, 10, 16, 24, 32, 40, 52] as const,
  /** By era 0..12. Eras 7–12 step modestly; network layers carry the real jump. */
  era: [1, 1.5, 2.5, 5, 10, 20, 40, 70, 120, 200, 340, 560, 900] as const,
}

/**
 * Past-Era-6 horizon. Every new economy number for Eras 7–12 lives here.
 * Probe / greenhouse / relay / embassy scalars are retuned with LONG_HORIZON.
 */
export const HORIZON = {
  unsealStipend: 5e14,
  /** Floor every Horizon cash buy at N seconds of current revenue. */
  cashGateSec: 300,
  probeGate: 1,
  greenhouseGate: 2.5,
  relayGate: 4,
  embassyGate: 6,
  keelGate: 8,
  surveyPerSec: 0.03,
  surveyCap: 120,
  probeBase: 8e14,
  probeGrowth: 2.35,
  planetLayer: 0.55,
  clusterMul: { volume: 1.08, margin: 1.12, fresh: 1.1 },
  clusterRetarget: 25,
  localPriceElasticity: 1.35,
  localChalkPerRank: 0.02,
  freightPerPlanet: 0.2,
  freightCap: 240,
  circuitBase: 40,
  circuitGrowth: 1.35,
  circuitLayer: 0.6,
  /** Five bays; bay-walls adds +1 to the last bay. Total base capacity 14. */
  bayCaps: [2, 2, 3, 3, 4] as const,
  crateOfferCount: 8,
  /** Practice + credited circuits without refile cheats (was 6). */
  maxCircuits: 8,
  keelConvoyEvery: 180,
  keelDemandCut: 0.004,
  keelWarCostFrac: 0.05,
  keelFreezeSec: 600,
  /** Season length — Era 9 slow gate wants 4 seasons + chores. */
  seasonSec: 2700,
  plotsStart: 4,
  plotsCap: 8,
  /** First N fileStandard* per layer are practice (no gate credit). */
  practicePerLayer: 2,
  /** Min gap between Worlds standard filings (practice or credit). */
  standardFileGapSec: 1500,
  /** Climate neighbor serves needed for Era 8. */
  climateServeNeed: 6,
  climateServeCooldownSec: 480,
  /** Stop settlements after circuit credit (Era 9). */
  settlementNeed: 6,
  settlementEtaSec: 900,
  /** SAVE 34 stop tax, per settled circuit while it stands. Spoil cuts that circuit's route weight. */
  stopSpoilCut: 0.12,
  /** Tariff cuts the freight trickle (per tariffed circuit, floored). */
  stopTariffCut: 0.06,
  stopTariffFloor: 0.76,
  /** Delay lengthens the next settlement ETA (per delayed circuit, capped). */
  stopDelayPerCircuit: 0.08,
  stopDelayCap: 0.24,
  /** Yield hauls after season chore (Era 10). */
  yieldHaulNeed: 4,
  yieldHaulSec: 1200,
  /** Habit watches after phrase credit (Era 11). */
  habitWatchNeed: 5,
  habitWatchSec: 900,
  /** Clause seatings after keep (Era 12). */
  clauseSeatingNeed: 4,
  /** +80 each in 4.0 real — Era 12 landed ~145s under the 40h floor. */
  clauseSeatingSec: 800,
  clauseSeatingGapSec: 640,
  /** Accept rehearsal desk gap after clever fill (post–Era 12 desk; does not move the door). */
  acceptRehearsalSec: 900,
  /** SAVE 35: a rehearsal at ≥0.85 still misses this often and scratches the weakest line. */
  rehearsalMissChance: 0.2,
  /** Accept Rehearsal Pad cuts the miss chance by its effect, up to this much. */
  rehearsalMissPadCap: 0.08,
  /** Wait after a missed rehearsal before the next try (post-door, like the desk gap). */
  rehearsalRetrySec: 120,
  /** Slow file-the-standard bar / slow era gates. */
  slowScore: 0.72,
  /** Fast clever gate. */
  fastScore: 0.85,
  /** Standard list mean before Accept. */
  listStandardScore: 0.75,
  /** Accept / Reject threshold. */
  listAcceptScore: 0.85,
  /** Keep this many clauses under the charter. */
  clauseKeep: 4,
  /** Fast: worlds / circuits at fastScore. Slow: at slowScore. */
  fastWorlds: 4,
  slowWorlds: 8,
  fastCircuits: 3,
  /** Unique gate credits (maxCircuits 8 − practice 2 leaves room for 6). */
  slowCircuits: 6,
  slowPhrases: 6,
  /** Concord hearing sessions before the charter may be signed. */
  hearingNeededMin: 3,
  hearingNeededMax: 3,
  /** SAVE 35: Minutes Clerk amends (grudge struck, clause stays seated) per hearing docket. */
  hearingAmendsPerDocket: 1,
  /** Phase 9: Bed Lock Pad releases the lock for the last share of a season, up to this much of it. */
  bedLockOpenCap: 0.45,
  /** Phase 9: Bed Glass project opens this much more of the season's tail. */
  bedGlassOpen: 0.1,
  /** Phase 9: Mutation Clear Pad can restore a mutated line by at most this much score. */
  mutationClearCap: 0.12,
  /** Endless list mutates every N worlds. */
  endlessMutateEvery: 5,
  /** Phase 9: Endless Edit Pad stretches the mutate cadence by its rank, up to this many worlds. */
  endlessEditMaxExtra: 3,
  /** Cap on department-lead endless bonuses (doubles safety). */
  leadBonusCap: 1.35,
  /** Per-world probe survey surcharge variance (±frac). */
  probeSurveyVar: 0.22,
  /** Co-op charter: venture lift / network cut. */
  coopVentureMul: 1.12,
  coopNetworkMul: 0.92,
  /** Packing sticks at this score when a stevedore is on duty. */
  stevedoreStick: 0.85,
  /** Season Hand saves per year. */
  seasonHandSaves: 1,
  greenhouseBase: 2e16,
  greenhouseGrowth: 2.2,
  greenhouseLayer: 0.45,
  qualityMatch: 1.25,
  qualityPlotMul: 0.8,
  volumePlots: 2,
  volumeMatch: 0.85,
  intenseBedPerRank: 0.1,
  signalPerRelay: 0.25,
  signalCap: 160,
  relayBase: 5e17,
  relayGrowth: 2.3,
  relayLayer: 0.5,
  phraseEvery: 90,
  phraseSignalCost: 8,
  agentCap: 6,
  agentHireSignal: 30,
  agentWageFrac: 0.02,
  agentMinWage: 1e12,
  clauseLayer: 0.22,
  clauseToggleSeal: 10,
  freeClauseToggles: 3,
  fairCopyScore: 0.85,
  embassyBase: 2e18,
  embassyGrowth: 2.25,
  embassyLayer: 0.4,
  embassySealPerSec: 0.15,
  sealCap: 80,
  maxEmbassies: 8,
  standardNetwork: 1.25,
  boutiqueCraft: 1.5,
  endlessPlanetLayer: 0.18,
  endlessProbeGrowth: 2.6,
  relicLevelCap: 10,
  relicSockets: 3,
  relicSocketsLater: 5,
  /** A socketed Horizon-wing relic (Era 7+) gets this on top of the socket multiplier. */
  socketHorizonMul: 1.1,
  deputyCooldown: 45,
  deputyCooldownFast: 30,
  deputyCashFloor: 0.1,
  forecastLeadSec: 60,
  forecastLeadFastSec: 120,
  headlineEvery: 360,
  headlineSwing: 0.1,
  seedPerSec: 0.02,
  seedPerGreenhouse: 0.05,
  seedCap: 240,
  coldLawSeedMul: 0.92,
  keelBuyoutBase: 8e16,
  keelBuyoutPerConvoy: 0.35,
  /** Rows 4–6 verb amplifiers (content/upgrades/deep.ts). Per rank unless noted. */
  widePinSurveyPerRank: 0.1,
  fineChalkPerRank: 0.01,
  probeCreditPerRank: 0.03,
  probeCreditFloor: 0.6,
  bayLinerPerRank: 0.04,
  pinFileCutPerRank: 0.04,
  pinFileFloor: 0.6,
  freightClerkPerRank: 0.06,
  longBellSecPerRank: 15,
  bedHandSeedPerRank: 0.08,
  crossSheetPerRank: 0.2,
  quickReelCutPerRank: 0.04,
  quickReelFloor: 0.6,
  briskDeskCutPerRank: 0.05,
  briskDeskFloor: 0.6,
  mastTunePerRank: 0.06,
} as const

/**
 * Late-hub (Era 7–12) scalars that thread Worlds into Store / Supply / Team / Money / Empire.
 * Cash costs still go through gatedCash; Horizon currencies gate verbs.
 */
export const LATE = {
  /** Cash floor seconds of revenue for late hub buys. */
  cashGateSec: 240,
  offworldPerWorld: 0.04,
  offworldRestockSurvey: 4,
  importedSalesBump: 0.06,
  seasonalPremium: 0.12,
  bondedCapBase: 8,
  bondedCapPerStorage: 4,
  bondedUnpackCashFrac: 0.015,
  bondedNetwork: 0.02,
  seedDecayPerSec: 0.004,
  seedVaultCapBase: 20,
  seedVaultPerStorage: 30,
  cryoArkDecayMul: 0.5,
  annexSeatsBase: 4,
  annexSeatsPerPlaza: 2,
  tasterMatchPerLevel: 0.03,
  diplomatSealCutPerLevel: 0.04,
  diplomatEmbassySealPerLevel: 0.02,
  horizonPacePerLevel: 0.05,
  jumpFreightPerFuel: 0.35,
  planetFranchiseLayer: 0.08,
  councilSeatLayer: 0.05,
  councilScrutinyPerSeat: 0.04,
  councilSealPerSeat: 0.03,
  broadcastSurveyCost: 6,
  /** A broadcast lifts off-world sales for stocked worlds in that climate for this long. */
  broadcastDurationSec: 240,
  /** Off-world sales bump per stocked world whose climate is on the air. */
  broadcastSalesBump: 0.06,
  wireAdSignalCost: 12,
  wireAdMul: 1.15,
  wireAdDurationSec: 180,
  buildQueueCashFloor: 0.12,
  /** Late build claim scalars (era 7+ tiers). */
  probePlazaCostMul: 0.85,
  probePlazaSurveyPerSec: 0.015,
  greenhouseAtriumMul: 1.2,
  lastAisleListFloor: 0.05,
  bondedWarehouseBonus: 12,
  seedVaultTierBonus: 40,
  relayFoundryCostMul: 0.85,
  relayFoundryLayerMul: 1.15,
  jumpBerthFreightMul: 1.35,
  embassyAnnexMul: 2,
  ivoPlaqueEndless: 0.04,
  /** Clause toggle seal cut stops here, however many diplomats are on the clock. */
  diplomatSealCutCap: 0.6,
  /** Annex staff may not push a deputy cooldown below this share of its base. */
  horizonPaceFloor: 0.4,
  /** Celebrity endcap and posture fees follow revenue past Era 7: this share of the gate seconds. */
  celebrityGateMul: 0.04,
  postureGateMul: 0.004,
  /** Venture forks that used to be flavor only. */
  dutyfreeTouristDemand: 0.04,
  courierKeelCutMul: 0.5,
  courierOwnPaceMul: 0.8,
  bondedSealedAgeMul: 0.9,
  mealkitsHeartyBurnMul: 0.7,
  mealkitsLeanBurnMul: 1.25,
  /** Media Loud: rivals notice sooner and more often. */
  mediaLoudRivalGapMul: 0.75,
  mediaLoudRivalChanceMul: 1.5,
  /** Ghost Rush: delivery bags sit warm. Perishables age this much faster. */
  ghostRushAgeMul: 1.05,
  /** Era 11–12 ventures. */
  embassyGiftSealMul: 1.05,
  treatyTableSealMul: 0.9,
  ivoDinerWageMul: 0.9,
  endlessKioskSurveyMul: 1.1,
  /** Era 7+ Co-op order: cheaper than Express, slower than Budget, part-paid in survey. */
  coopCostMul: 0.7,
  coopEtaMul: 2.5,
  coopSurveyPerCrate: 1,
  coopCrates: 2,
  /** Era 8+ barges haul freight too: freight/s per √barge. */
  bargeFreightPerSec: 0.012,
  /** Orbital rows 21+ (content/upgrades/deep.ts). Per rank. */
  jumpSkidBurnPerRank: 1,
  bargeHoldPerRank: 0.08,
  franchiseDeedPerRank: 0.05,
  hullYardHarvestPerRank: 0.04,
  /** Council seats past the cap still count for scrutiny, but pay this fraction. */
  councilOverCapPay: 0.4,
  /** Extra seat per Council Clerk rank (upgrade `lh-council-clerk`). */
  councilSeatPerClerk: 1,
  /** Scrutiny above this share trims instrument yield, up to `scrutinyDragMax`. */
  scrutinyDragAt: 0.6,
  scrutinyDragMax: 0.35,
  /** Instruments: lots per instrument, cost growth, and the revenue floor in seconds. */
  instrumentMaxLots: 4,
  instrumentGrowth: 1.9,
  instrumentGateSec: 90,
  /** Doctrine knobs (Strategy, era 7+). */
  doctrineSurveyMul: 1.25,
  doctrineBondedMul: 1.25,
  doctrineVaultMul: 1.25,
  doctrineSignalMul: 1.2,
  doctrineSeatMul: 1.25,
  doctrineJumpMul: 1.2,
  /** Council Whip reward: seat payoff multiplier. */
  councilWhipMul: 1.25,
  /** Phase 5 project specials (content/projects.ts): what each one does beyond its stat line. */
  /** File the Manifest: freight that rides through a Rebrand with the standing route. */
  manifestCrumbFreight: 18,
  /** Raise the Wire Hall: one more chair on the agent desk, and a higher desk cap. */
  wireHallAgentSeats: 1,
  /** Open the Council Annex: extra paying seats. */
  councilAnnexSeats: 3,
  /** Empire 105 (phrase clue): the standard file lands this much closer to a full phrase. */
  phraseClueBonus: 0.05,
  /** Empire 115 (bay slot): extra capacity on the last bay. */
  empireBaySlots: 1,
  /** Empire 120 (agent seat): extra desk cap past HORIZON.agentCap. */
  empireAgentSeats: 1,
} as const

/** Horizon currency yield instruments (Invest, era 7+). One lot = a standing position. */
export const LATE_INSTRUMENTS = {
  'planet-bonds': { era: 7, currency: 'survey', base: 1e15, yieldPerLot: 0.012 },
  'freight-futures': { era: 8, currency: 'freight', base: 5e15, yieldPerLot: 0.1 },
  'seed-index': { era: 9, currency: 'seed', base: 5e16, yieldPerLot: 0.02 },
  'signal-options': { era: 10, currency: 'signal', base: 5e17, yieldPerLot: 0.08 },
} as const
export type InstrumentId = keyof typeof LATE_INSTRUMENTS

/** 2.0 Rebrand prestige. Goodwill = floor(cbrt(lifetime revenue / revenuePerGoodwillCube)). */
export const REBRAND = {
  minEra: 3,
  revenuePerGoodwillCube: 1e6,
  /** Stat bonus per Goodwill (soft-capped with everything else). */
  valuePerGoodwill: 0.04,
  demandPerGoodwill: 0.03,
  startCashPerGoodwill: 0.25,
}

/** 2.0 word of mouth — every basket sold brings a few more shoppers. Log-scaled, never runs away. */
export const WORD_OF_MOUTH = {
  /** Demand × (1 + perDecade × log10(1 + baskets / scale)). */
  perDecade: 0.45,
  scale: 60,
}

/** 2.0 named rival chains (content/rivals.ts). */
export const RIVAL_CHAINS = {
  /** Demand cut per independent rival store: demand × 1 / (1 + Σ stores × perStore). */
  perStore: 0.006,
  /** Buyout = buyoutBase × (1 + stores × buyoutPerStore). */
  buyoutPerStore: 0.35,
  /** A bought rival store is worth this many flagships in the network. */
  boughtStoreWeight: 0.25,
  /** Price war: costs this share of the buyout, closes stores, freezes growth. */
  warCostFrac: 0.05,
  warStoresClosed: 2,
  warFreezeSec: 600,
  warCooldownSec: 180,
  /** Empire XP on buyout: this share of the current level's cost, per store bought. */
  buyoutLevelShare: 0.06,
  /** A taunt is logged every this-many new stores. */
  tauntEvery: 3,
  /** Horizon rivals (opening Era 9+): buyout never below this many gate-seconds of revenue (× LATE.cashGateSec). */
  lateGateMul: 5,
}

/** Relic Museum: +0.1% shoppers per relic owned (soft-capped like every stat). */
export const RELIC_DEMAND_PER = 0.001

/**
 * Daily run twists: one upside and one downside each, only in a daily run (normal runs and the
 * pacing bots have no rule). Order matches the daily theme's second word (shell/dailyStamp).
 */
export type DailyRuleId =
  | 'morning-rush'
  | 'delivery-day'
  | 'market-day'
  | 'payday'
  | 'school-run'
  | 'late-shift'
  | 'street-fair'
  | 'stock-take'

export interface DailyRuleMods {
  demand?: number
  crateCost?: number
  truckTime?: number
  wages?: number
}

export const DAILY_RULE_ORDER: readonly DailyRuleId[] = [
  'morning-rush',
  'delivery-day',
  'market-day',
  'payday',
  'school-run',
  'late-shift',
  'street-fair',
  'stock-take',
]

export const DAILY_RULES: Record<DailyRuleId, DailyRuleMods> = {
  'morning-rush': { demand: 1.15, wages: 1.15 },
  'delivery-day': { truckTime: 0.6, crateCost: 1.1 },
  'market-day': { crateCost: 0.85, demand: 0.92 },
  payday: { demand: 1.2, crateCost: 1.12 },
  'school-run': { demand: 1.1, truckTime: 1.25 },
  'late-shift': { wages: 0.85, demand: 0.94 },
  'street-fair': { demand: 1.25, wages: 1.2 },
  'stock-take': { crateCost: 0.8, truckTime: 1.3 },
}


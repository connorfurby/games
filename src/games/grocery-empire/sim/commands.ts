import { DAILY_RULE_ORDER, type DailyRuleId } from './balance'
import { cashLabel } from '@/shared/bn'
import { valueMul } from './systems/network'
import { buyout, canBuyout, canPriceWar, priceWar } from './systems/rivals'
import type { RivalId } from '../content/rivals'
import {
  BUILD_VARIANT_BY_ID,
  TRACK_BY_ID,
  type BuildFilter,
  refundFrac,
  variantSlotKey,
} from '../content/builds'
import { CATEGORY_IDS, type CategoryId } from '../content/categories'
import { ERA2_EXPANSION_BY_ID } from '../content/era2'
import { INTRO_BEATS } from '../content/intro'
import { MEMO_BY_ID, MEMOS } from '../content/memos'
import { PROJECT_BY_ID } from '../content/projects'
import { empireUnlocked } from '../content/empireRewards'
import { PERK_BY_ID } from '../content/perks'
import { ROLE_IDS, ROLES, isDeptRole, isHorizonRole, traitForStaffId, type RoleId } from '../content/staff'
import { annexSeatBlock, floorHeadcount } from './staffAnnex'
import { deptSeatBlock, syncDeptRoster } from './staffDept'
import { postureFee } from './lateCost'
import { TIP_BY_ID } from '../content/tips'
import {
  UPGRADE_BY_ID,
  forkBlockedBy,
  isUpgradeVisible,
  requirementsMet,
  type TreeId,
} from '../content/upgrades'
import { VENTURE_BY_ID, ventureLevelCost } from '../content/ventures'
import {
  CAPITAL,
  CHAIN,
  DEMAND,
  EMPIRE,
  ENDCAP,
  HOURS,
  LOYALTY,
  PERK_RESPEC,
  PRICE,
  PRICE_LOCK,
  RESTOCK_SMARTS,
  WHOLESALE,
} from './balance'
import {
  adCostGrowth,
  attentionCap,
  backroomCap,
  bestPrice,
  crateCost,
  crateSize,
  deliveryTime,
  hireCost,
  hoursMax,
  manualUnpackAmount,
  nextUpgradeCost,
  restockTargets,
  shortShipChance,
  staffSeatCap,
  unitCost,
  up,
  upgradeBulkCost,
  upgradeRankCap,
  wholesaleIsDip,
} from './formulas'
import {
  addBatch,
  advanceDialogue,
  advanceTutorialStep,
  beginTutorial,
  clamp,
  finishOpeningLegacy,
  isMenuId,
  log,
  queueTutorial,
  replayTutorial,
  round2,
  setEra,
  skipOpeningDialogue,
  sumQty,
  unlockMenu, waitLabel } from './helpers'
import { TUTORIAL_BY_ID } from '../content/tutorials'
import { chance } from './rng'
import type {
  GameState,
  InvestRisk,
  MarketingPosture,
  PrestigeMutatorId,
  StorePolicy,
  SupplierId,
} from './state'
import { cleanStoreName } from './state'
import {
  buyAnalyst,
  buyArchive,
  canBuyAnalyst,
  canBuyArchive,
  canPulseScanner,
  canRebalanceOffice,
  pulseScanner,
  rebalanceOffice,
  toggleIdeas,
} from './systems/office'
import {
  callInspector,
  canCallInspector,
  answerRival,
  canAnswerRival,
  canMatchCoupons,
  canOrderPizza,
  matchCoupons,
  orderPizza,
} from './systems/events'
import { crimeHandlers } from './commandsCrime'
import { corpHandlers } from './commandsCorp'
import { collectVenture } from './systems/growth'
import type { RebrandCarry } from './systems/prestige'
import { hasAffordableMemo, planAffordableMemos } from './memoPlan'
import { hasAffordableUpgrade, hasAffordableVenture, planAffordableUpgrades, planAffordableVentures } from './upgradePlan'
import { unpackUnits, staffName } from './systems/people'
import {
  applyBailout,
  applyEmptyShelfHelper,
  applyEmergencyDelivery,
  applyMentorRestock,
  canBailout,
  canEmergencyDelivery,
  canEmptyShelfHelper,
  canMentorRestock,
  dumpCooler,
  dumpCoolerPartial,
  perishableQty,
  type DumpWhere,
} from './systems/recovery'
import { canWalkStore, checkFlyerBandLock, ensureFlagshipStore, walkStore } from './systems/chain'
import { debtCovenantBreached } from './systems/capital'
import { era2Handlers } from './commandsEra2'
import { eraLateHandlers } from './commandsEraLate'
import { horizonHandlers } from './commandsHorizon'
import { depthHandlers } from './commandsDepth'
import { DEPTH } from './balance'
import { emptyDepth } from '../content/depth'

export interface Check {
  ok: boolean
  reason?: string
}

export type Command =
  | { type: 'unpack'; amount?: number }
  | { type: 'setPrice'; price: number }
  | { type: 'buyWholesale'; cat?: CategoryId; crates?: number; qty?: number }
  | { type: 'setSupplier'; supplier: SupplierId }
  | { type: 'hire'; role: RoleId }
  | { type: 'fire'; id: number }
  | { type: 'buyAd' }
  | { type: 'refundAd' }
  | { type: 'setMarketingPosture'; posture: MarketingPosture }
  | { type: 'lockWholesalePrice' }
  | { type: 'setHours'; hours: number }
  | { type: 'orderPizza' }
  | { type: 'callInspector' }
  | { type: 'matchCoupons' }
  | { type: 'answerRival' }
  /** Backroom perishables only unless includeShelf (UI should confirm that one). */
  | { type: 'dumpCooler'; includeShelf?: boolean }
  | { type: 'dumpCoolerPartial'; cat: CategoryId; qty: number; where?: DumpWhere }
  | { type: 'buyMemo'; id: string }
  /** Buy the best affordable desk memos, cheapest first, until broke. */
  | { type: 'buyMemoSweep' }
  | { type: 'buyUpgrade'; id: string; count?: number }
  /** Buy the best affordable ranks, one at a time, up to the sweep limit. */
  | { type: 'buyUpgradeSweep'; tree?: TreeId | 'all' }
  | { type: 'levelVentureSweep' }
  | { type: 'buyBuild'; track?: string; id?: BuildFilter }
  | { type: 'sellBuild'; track?: string; id?: BuildFilter }
  | { type: 'setBuildVariant'; track: BuildFilter; variantId: string }
  | { type: 'hibernateBuild'; track: BuildFilter }
  | { type: 'buyEndcap' }
  | { type: 'sellEndcap' }
  | { type: 'openVenture'; id: string }
  | { type: 'levelVenture'; id: string }
  | { type: 'collectVenture'; id: string }
  | { type: 'pullScheme'; id: string }
  | { type: 'lieLow' }
  | { type: 'bribeInspector' }
  | { type: 'answerVisitor'; pick: 'a' | 'b' }
  | { type: 'buyStock'; id: string; cash: number }
  | { type: 'sellStock'; id: string; shares: number }
  | { type: 'openFuture'; kind: 'hedge' | 'rise' | 'fall'; stake: number }
  | { type: 'answerOffer'; accept: boolean }
  | { type: 'buyOutOwner'; owner: string }
  | { type: 'goPublic'; pct: number }
  | { type: 'buyback' }
  | { type: 'issueShares' }
  | { type: 'goPrivate' }
  | { type: 'resolveMeeting'; choice: import('./corp/company').MeetingChoice }
  | { type: 'castVote'; yes: boolean }
  | { type: 'lobbyOwner'; owner: string }
  | { type: 'headToHead'; id: string }
  | { type: 'playWar'; id: string; move: 'undercut' | 'match' | 'hold' }
  | { type: 'makeTruce'; id: string }
  | { type: 'plantMole'; id: string }
  | { type: 'moleJob'; id: string; job: 'steal' | 'sabotage' }
  | { type: 'takeoverRival'; id: string }
  | { type: 'buyBackStake'; id: string }
  | { type: 'depositPassbook'; amount: number }
  | { type: 'withdrawPassbook'; amount: number }
  | { type: 'buyPerk'; id: string }
  | { type: 'startProject'; id: string }
  | { type: 'priceWar'; id: RivalId }
  | { type: 'evenAttention' }
  | {
      type: 'syncRelics'
      wings: string[]
      count: number
      unlocked: boolean
      owned?: Record<string, number>
      levels?: Record<string, number>
      sockets?: string[]
      litWings?: string[] | null
      dust?: number
    }
  | { type: 'walkDrifting' }
  | { type: 'buyoutRival'; id: RivalId }
  | { type: 'respecPerks' }
  | { type: 'expandLot'; id?: string }
  | { type: 'expandSideYard' }
  | { type: 'emergencyDelivery' }
  | { type: 'mentorRestock' }
  | { type: 'bailout' }
  | { type: 'callStarterCrate' }
  | { type: 'dismissTip'; id: string }
  | { type: 'setStoreName'; name: string }
  | { type: 'setDailyRule'; rule: DailyRuleId }
  | { type: 'advanceDialogue' }
  | { type: 'finishIntro' }
  | { type: 'introBeat'; index: number }
  | { type: 'setAutoRestock'; enabled: boolean; maxCost?: number; minUnits?: number }
  | { type: 'setMix'; cat: CategoryId; weight: number }
  | { type: 'setOrderCat'; cat: CategoryId }
  | { type: 'setFacing'; cat: CategoryId; facingId: string }
  | { type: 'setOpen'; open: boolean }
  | { type: 'setDeptPolicy'; dept: string; policy: string }
  | { type: 'promoteStaff'; staffId: number; toRole: RoleId }
  | { type: 'morningWriteOff'; mode: 'dump' | 'discount' }
  | { type: 'unlockContract'; id: string }
  | { type: 'setContract'; id: string; on: boolean }
  | { type: 'setCircular'; aisles: [CategoryId, CategoryId] }
  | {
      type: 'printFlyerWeek'
      aisles: [CategoryId, CategoryId] | [CategoryId, CategoryId, CategoryId]
      discountBand: 'soft' | 'mid' | 'deep'
      promise: 'hours' | 'facing'
    }
  | { type: 'runBrownoutDrill' }
  | { type: 'signCoolerLog' }
  | { type: 'assignShift'; slot: import('../content/depth').ShiftSlot; staffId: number }
  | { type: 'clearShift'; slot: import('../content/depth').ShiftSlot; staffId?: number }
  | { type: 'serveRegular' }
  /** SAVE 31: swap which of two shoppers Serve targets. */
  | { type: 'focusRegular'; which: 'active' | 'waiting' }
  | { type: 'dockCheckIn'; aisle?: import('../content/categories').CategoryId; short?: boolean }
  | { type: 'payInvoice'; id: number }
  | { type: 'payAllInvoices' }
  | { type: 'setAutoPayInvoices'; on: boolean }
  | { type: 'setAutoDock'; on: boolean }
  | { type: 'collectAllVentures' }
  /** Clear oldest unpaid invoice without cash (softlock rail / collections). */
  | { type: 'writeOffInvoice' }
  | { type: 'setFlagshipSlot'; index: number; cat: CategoryId | '' }
  | { type: 'fileFlagshipPlanogram' }
  | { type: 'fileStandardFlagship' }
  | { type: 'setProduceGrade'; grade: 'good' | 'bruised' | null }
  | { type: 'passBill'; id: import('../content/depth').BillId }
  | { type: 'toggleFavoriteMemo'; id: string }
  | { type: 'dismissOfflineReceipt' }
  | { type: 'skipTutorial' }
  | { type: 'completeTutorialStep'; id?: string; step?: number }
  | { type: 'noteMenu'; id: string }
  | { type: 'doTutorialForMe' }
  | { type: 'setPaused'; paused?: boolean }
  | { type: 'setSpeed'; speed: number }
  | { type: 'acceptChapter' }
  | { type: 'buyAnalyst' }
  | { type: 'buyArchive' }
  | { type: 'spendRep'; on: 'analyst' | 'archive' }
  | { type: 'rebalanceOffice'; toward: 'archive' | 'analyst' }
  | { type: 'toggleIdeas' }
  | { type: 'setAutoTourney'; on: boolean }
  | { type: 'pulseScanner' }
  | { type: 'startTutorial'; id: string }
  | { type: 'redeemLoyalty' }
  | { type: 'openStore'; name?: string }
  | { type: 'setPolicy'; storeId: string; policy: StorePolicy }
  | { type: 'setAttentionShare'; storeId: string; share: number }
  | { type: 'incorporate' }
  | { type: 'depositInvest'; amount: number }
  | { type: 'withdrawInvest'; amount: number }
  | { type: 'setInvestRisk'; risk: InvestRisk }
  | { type: 'resetCircuitBreaker' }
  | { type: 'buyInvestEngine' }
  | { type: 'runTournament' }
  | { type: 'buyDoctrine'; id: string }
  | { type: 'buildDepot' }
  | { type: 'releaseAutonomous' }
  | { type: 'setAutonomousHabit'; habit: import('./state').AutonomousHabit }
  | { type: 'resolveBoard'; agenda?: import('./state').BoardAgenda }
  | { type: 'walkStore'; storeId: string }
  | { type: 'trainStore'; storeId: string }
  // Era 3–6
  | { type: 'buyPlant'; kind?: import('./state').PlantKind }
  | { type: 'setPlantPower'; kinds: import('./state').PlantKind[] }
  | { type: 'buyTank' }
  | { type: 'decommissionPlant' }
  | { type: 'hireLobby' }
  | { type: 'acquireRegion' }
  | { type: 'leaveRegion' }
  | { type: 'openLane'; route?: string }
  | { type: 'buyFuel' }
  | { type: 'openFranchise' }
  | { type: 'winBackFranchise'; franchiseId: string }
  /** `stance` defaults to 'exam' (opens the exam hold). One filing = one stance. */
  | { type: 'setManifest'; laneId: string; mix: string; stance?: 'clean' | 'fast' | 'exam' }
  /** SAVE 33: file the lane's matched cargo as ONE of clean / fast / exam-ready. */
  | { type: 'setManifestStance'; laneId: string; stance: 'clean' | 'fast' | 'exam' }
  | { type: 'swearExam' }
  | { type: 'stampLedger' }
  | { type: 'launchBarge'; class?: 'hauler' | 'replicator' | 'ark' }
  | {
      type: 'dispatchHauler'
      bargeId?: string
      pocketId: string
      class?: 'hauler' | 'replicator' | 'ark'
      /** When set, load this ration onto the Hauler before the trip. */
      loadRation?: string
    }
  | { type: 'buyCharter' }
  | { type: 'setCharterAxis'; axis: string; delta: number }
  | { type: 'applyGuardian' }
  | { type: 'rebootFleet' }
  | { type: 'startDriftWar' }
  | { type: 'advanceDriftWar' }
  | { type: 'promoteSteward'; staffId: number }
  | { type: 'acceptEnding'; carry?: RebrandCarry }
  | { type: 'rejectEnding' }
  | { type: 'clearPendingAccept' }
  | { type: 'confirmHungryLaws'; mutators?: PrestigeMutatorId[] }
  // Era 7–12 horizon
  | { type: 'continueHorizon' }
  | { type: 'unsealHorizon' }
  | { type: 'launchProbe' }
  | { type: 'setPlanogram'; planetId: string; slots: string[] }
  | { type: 'fileStandardPlanogram'; planetId: string }
  | { type: 'setPlanetPrice'; planetId: string; price: number | null }
  | { type: 'nameCluster'; name: string; policy: 'volume' | 'margin' | 'fresh' }
  | { type: 'openCircuit' }
  | {
      type: 'setConvoy'
      origin: string
      stop: string
      dest: string
      good: string
      load?: string[]
      index?: number
    }
  | { type: 'fileStandardConvoy'; origin?: string; stop?: string; dest?: string; good?: string }
  | { type: 'setStandingRoute'; index: number }
  | { type: 'clearCircuit'; index: number }
  | { type: 'priceWarKeel' }
  | { type: 'buyoutKeel' }
  | { type: 'buyGreenhouse' }
  | { type: 'plantCross'; index: number; a: string; b: string }
  | { type: 'fileStandardCross'; index?: number }
  | { type: 'harvestPlot'; index: number }
  | { type: 'setTaster'; taster: 'quality' | 'volume' }
  | { type: 'buyRelay' }
  | { type: 'commitPhrase'; symbols: string[] }
  | { type: 'fileStandardPhrase' }
  | { type: 'hireAgent'; habit?: 'price' | 'stock' | 'route' | 'taste' }
  | { type: 'setAgentHabit'; id: number; habit: 'price' | 'stock' | 'route' | 'taste' }
  | { type: 'fireAgent'; id: number }
  | { type: 'toggleClause'; id: string }
  | { type: 'setCharter'; charter: 'standard' | 'boutique' | 'coop' }
  | { type: 'openEmbassy' }
  | { type: 'fillLastLine'; index: number; filled: string }
  | { type: 'fileStandardList' }
  | { type: 'acceptLastAisle' }
  | { type: 'rejectLastAisle' }
  | { type: 'helpHeadline' }
  | { type: 'ignoreHeadline' }
  | { type: 'setVenturePolicy'; id: string; policy: 'a' | 'b' }
  | { type: 'setDeputy'; staffId: number; on: boolean }
  | { type: 'queueBuild'; id: string }
  | { type: 'cancelQueue' }
  | { type: 'socketRelic'; id: string }
  | { type: 'unsocketRelic'; id: string }
  | { type: 'setWingSocket'; wing: string; on: boolean; swapOut?: string }
  | { type: 'dustRelic'; id: string }
  | { type: 'setAutoDust'; rarityCeiling: string | null }
  | { type: 'levelRelic'; id: string; count?: number }
  | { type: 'doSeasonChore'; chore: 'water' | 'cover' | 'harvest' | 'rest' }
  | { type: 'serveClimateNeighbor' }
  | { type: 'settleStop' }
  | { type: 'haulYield' }
  | { type: 'seatClause' }
  | { type: 'rehearseAccept' }
  | { type: 'answerHearing' }
  | { type: 'clearHorizonRival'; kind: 'drift' | 'keelmark' | 'verdant' | 'static' | 'ration' }
  | { type: 'proposePlanogram'; planetId: string }
  // Era 7–12 late hub
  | { type: 'restockOffworld' }
  | { type: 'unpackBonded'; count?: number; kind?: 'dry' | 'chill' | 'fragile' }
  | { type: 'vaultSeed'; amount: number }
  | { type: 'jumpLane' }
  | { type: 'openPlanetFranchise' }
  | { type: 'buyInstrument'; id: string }
  | { type: 'coopOrder'; cat?: CategoryId }
  | { type: 'cryoTreaty' }
  | { type: 'broadcast'; climate: string }
  | { type: 'wireAd' }

function buildTrackId(cmd: { track?: string; id?: string }): BuildFilter | null {
  const raw = cmd.track ?? cmd.id
  if (!raw || !(raw in TRACK_BY_ID)) return null
  return raw as BuildFilter
}

type Handler = {
  can: (s: GameState, cmd: Command) => Check
  run: (s: GameState, cmd: Command) => void
}

const ok: Check = { ok: true }
const no = (reason: string): Check => ({ ok: false, reason })
const needCash = (cost: number): Check => no(`Need ${cashLabel(cost)}.`)

function placeOrder(s: GameState, cat: CategoryId, crates: number): Check {
  if (!s.categories[cat]) return no('Category locked.')
  const supplier = s.supplier
  if (supplier === 'b') {
    if (crates < WHOLESALE.supplierB.minSpools) {
      return no(`Supplier B needs at least ${WHOLESALE.supplierB.minSpools} crates.`)
    }
  }
  if (!s.depth) s.depth = emptyDepth()
  const unpaid = s.depth.invoices.filter((i) => !i.paid).length
  if (unpaid >= DEPTH.invoiceUnpaidCap) {
    return no('Invoice book full — pay an invoice first.')
  }
  const costEach = crateCost(s, cat, supplier)
  const total = round2(costEach * crates)
  const unitsEach = crateSize(s)
  let qty = unitsEach * crates
  let amount = total
  let unit = unitCost(s, cat, supplier)
  if (supplier === 'b' && chance(s, shortShipChance(s))) {
    const keptFrac = Math.min(0.95, WHOLESALE.supplierB.shortShipFrac + up(s, 'claim-window') * 0.03)
    const kept = Math.max(1, Math.floor(qty * keptFrac))
    const refundUnits = qty - kept
    qty = kept
    const refund = round2(refundUnits * unit)
    amount = round2(amount - refund)
    s.stats.shortShips += 1
    log(s, `Short ship: crate light by ${refundUnits}. Invoice cut ${cashLabel(refund)}.`, 'warn')
  }
  const firstOrder = s.stats.ordersPlaced <= 0
  // Invoice float: goods arrive on ETA; cash settles via payInvoice.
  s.stats.ordersPlaced += 1
  if (s.wholesale.index < 0.85) s.stats.ordersBelow85 += 1
  s.wholesale.drift = Math.min(1.35, s.wholesale.drift + WHOLESALE.buyBump * crates)
  s.wholesale.idleSec = 0
  if (wholesaleIsDip(s)) {
    s.depth.marketBellDipAt = s.time
    s.depth.marketBellDips += 1
  }
  const invId = s.depth.nextInvoiceId++
  s.depth.invoices.push({
    id: invId,
    cat,
    amount,
    dueAt: s.time + DEPTH.invoiceDueSec,
    paid: false,
    onTime: false,
  })
  const eta = deliveryTime(s, supplier)
  s.orders.push({
    id: s.nextOrderId++,
    supplier,
    cat,
    qty,
    eta,
    unitCost: unit,
  })
  if (firstOrder) {
    log(s, 'Truck inbound. Pay the invoice when you can — early pays discount.', 'story')
  } else {
    log(s, `Invoice #${invId} for ${cashLabel(amount)}, due in ${DEPTH.invoiceDueSec}s. Pay it in Suppliers.`, 'info')
  }
  const room = backroomCap(s) - sumQty(s.backroom)
  if (room < qty * 0.25) {
    log(s, 'Order placed — backroom is tight. Overflow will refund at the door.', 'warn')
  }
  return ok
}

/**
 * Map tutorial step.action → real Command paths (same can/run as the player).
 * openMenu unlocks the menu; UI switches via Coach / setActiveMenu.
 */
function applyTutorialAction(s: GameState, action: { type: string; params?: Record<string, unknown> }) {
  const p = action.params ?? {}
  switch (action.type) {
    case 'unpack': {
      // Never softlock a tour demo on empty backroom.
      if (sumQty(s.backroom) <= 0) {
        addBatch(s.backroom, 'cans', 8, 0)
      }
      const amount = Math.max(0, Math.floor(Number(p.n ?? p.amount ?? 0) || 0))
      run(s, amount > 0 ? { type: 'unpack', amount } : { type: 'unpack' })
      break
    }
    case 'setPrice': {
      let price: number
      if (typeof p.price === 'number' && Number.isFinite(p.price)) {
        price = p.price
      } else {
        const delta = typeof p.delta === 'number' ? p.delta : -0.05
        price = round2(clamp(s.price + delta, PRICE.min, PRICE.max))
      }
      run(s, { type: 'setPrice', price })
      break
    }
    case 'buyWholesale': {
      const crates = Math.max(1, Math.floor(Number(p.qty ?? p.crates ?? 1) || 1))
      const cat = typeof p.cat === 'string' ? (p.cat as CategoryId) : undefined
      run(s, { type: 'buyWholesale', crates, cat })
      break
    }
    case 'hire': {
      const role = (typeof p.role === 'string' && ROLE_IDS.includes(p.role as RoleId)
        ? p.role
        : 'clerk') as RoleId
      run(s, { type: 'hire', role })
      break
    }
    case 'buyAd':
      run(s, { type: 'buyAd' })
      break
    case 'matchCoupons':
      run(s, { type: 'matchCoupons' })
      break
    case 'answerRival':
      run(s, { type: 'answerRival' })
      break
    case 'buyMemo':
      if (typeof p.id === 'string') run(s, { type: 'buyMemo', id: p.id })
      break
    case 'buyArchives':
    case 'buyArchive':
      run(s, { type: 'buyArchive' })
      break
    case 'buyUpgrade':
      if (typeof p.id === 'string') {
        const count = typeof p.count === 'number' ? p.count : undefined
        run(s, { type: 'buyUpgrade', id: p.id, count })
      }
      break
    case 'openVenture':
      if (typeof p.id === 'string') run(s, { type: 'openVenture', id: p.id })
      break
    case 'buyExpansion':
    case 'expandLot': {
      const id = typeof p.id === 'string' ? p.id : 'side-yard'
      run(s, { type: 'expandLot', id })
      break
    }
    case 'setAutoRestock':
      run(s, {
        type: 'setAutoRestock',
        enabled: p.enabled !== false,
        maxCost: typeof p.maxCost === 'number' ? p.maxCost : undefined,
        minUnits: typeof p.minUnits === 'number' ? p.minUnits : undefined,
      })
      break
    case 'openStore':
      run(s, { type: 'openStore', name: typeof p.name === 'string' ? p.name : undefined })
      break
    case 'buildDepot':
      run(s, { type: 'buildDepot' })
      break
    case 'incorporate':
      run(s, { type: 'incorporate' })
      break
    case 'resolveBoard':
      run(s, {
        type: 'resolveBoard',
        agenda:
          p.agenda === 'expand' ||
          p.agenda === 'dividend' ||
          p.agenda === 'rnd' ||
          p.agenda === 'hours'
            ? p.agenda
            : undefined,
      })
      break
    case 'walkStore':
      if (typeof p.storeId === 'string') run(s, { type: 'walkStore', storeId: p.storeId })
      break
    case 'trainStore':
      if (typeof p.storeId === 'string') run(s, { type: 'trainStore', storeId: p.storeId })
      break
    case 'releaseAutonomous':
      run(s, { type: 'releaseAutonomous' })
      break
    case 'runTournament':
      run(s, { type: 'runTournament' })
      break
    case 'openMenu': {
      const menu = typeof p.menu === 'string' ? p.menu : ''
      if (isMenuId(menu)) {
        unlockMenu(s, menu)
        s.seenMenus[menu] = true
      }
      break
    }
    case 'buyPlant':
    case 'buyColdPlant': {
      const kind =
        p.kind === 'tunnel' || p.kind === 'blast' || p.kind === 'compressor' ? p.kind : 'compressor'
      run(s, { type: 'buyPlant', kind })
      break
    }
    case 'hireLobby':
      run(s, { type: 'hireLobby' })
      break
    case 'openLane':
      run(s, {
        type: 'openLane',
        route: typeof p.route === 'string' ? p.route : 'spice-route',
      })
      break
    case 'launchBarge':
      run(s, {
        type: 'launchBarge',
        class:
          p.class === 'replicator' || p.class === 'ark' || p.class === 'hauler'
            ? p.class
            : 'hauler',
      })
      break
    case 'dispatchHauler':
      if (typeof p.pocketId === 'string') {
        run(s, {
          type: 'dispatchHauler',
          pocketId: p.pocketId,
          bargeId: typeof p.bargeId === 'string' ? p.bargeId : undefined,
          class:
            p.class === 'replicator' || p.class === 'ark' || p.class === 'hauler'
              ? p.class
              : undefined,
          loadRation: typeof p.loadRation === 'string' ? p.loadRation : undefined,
        })
      }
      break
    case 'applyGuardian':
    case 'guardianPreset':
      run(s, { type: 'applyGuardian' })
      break
    case 'releaseAutonomous':
      run(s, { type: 'releaseAutonomous' })
      break
    case 'buildDepot':
      run(s, { type: 'buildDepot' })
      break
    case 'incorporate':
      run(s, { type: 'incorporate' })
      break
    case 'resolveBoard':
      run(s, { type: 'resolveBoard' })
      break
    case 'pulseScanner':
      run(s, { type: 'pulseScanner' })
      break
    case 'launchProbe':
      run(s, { type: 'launchProbe' })
      break
    case 'fileStandardPlanogram': {
      const id =
        typeof p.planetId === 'string'
          ? p.planetId
          : (s.horizon.planets.find((pl) => pl.revealed && !pl.stocked)?.id ??
            s.horizon.planets.find((pl) => pl.revealed)?.id)
      if (id) run(s, { type: 'fileStandardPlanogram', planetId: id })
      break
    }
    case 'fileStandardConvoy':
      run(s, { type: 'fileStandardConvoy' })
      break
    case 'fileStandardCross':
      run(s, { type: 'fileStandardCross', index: typeof p.index === 'number' ? p.index : undefined })
      break
    case 'fileStandardPhrase':
      run(s, { type: 'fileStandardPhrase' })
      break
    case 'fileStandardList':
      run(s, { type: 'fileStandardList' })
      break
    case 'toggleClause':
      if (typeof p.id === 'string') run(s, { type: 'toggleClause', id: p.id })
      break
    case 'setCharter':
      run(s, {
        type: 'setCharter',
        charter: p.charter === 'boutique' ? 'boutique' : p.charter === 'coop' ? 'coop' : 'standard',
      })
      break
    default:
      break
  }
}

const coreHandlers = {
  unpack: {
    can: (s) => (sumQty(s.backroom) <= 0 ? no('Backroom empty.') : ok),
    run: (s, cmd) => {
      const first = s.stats.unpackedManual <= 0
      const extra = Math.max(0, Math.floor((cmd as Extract<Command, { type: 'unpack' }>).amount ?? 0))
      const n = manualUnpackAmount(s) + extra
      const moved = unpackUnits(s, n)
      s.stats.unpackedManual += moved
      if (first && moved > 0) {
        log(s, 'Stock on the shelf. Shoppers can buy now — watch baskets and cash climb.', 'story')
      }
    },
  },
  setPrice: {
    can: (s, cmd) => {
      if (s.autonomous) return no('Autonomous fulfillment sets price.')
      const p = (cmd as Extract<Command, { type: 'setPrice' }>).price
      if (!Number.isFinite(p)) return no('Bad price.')
      if (p < PRICE.min || p > PRICE.max) return no(`Price ${PRICE.min}–${PRICE.max}.`)
      return ok
    },
    run: (s, cmd) => {
      const p = round2(clamp((cmd as Extract<Command, { type: 'setPrice' }>).price, PRICE.min, PRICE.max))
      if (p !== s.price) s.stats.priceChanges += 1
      s.price = p
      if (p > s.stats.peakPrice) s.stats.peakPrice = p
      if (p < s.stats.minPrice) s.stats.minPrice = p
      checkFlyerBandLock(s, bestPrice(s))
    },
  },
  buyWholesale: {
    can: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'buyWholesale' }>
      const cat = c.cat ?? s.orderCat
      const crates = Math.max(1, Math.floor(c.crates ?? c.qty ?? 1))
      if (!s.categories[cat]) return no('Category locked.')
      if (!s.depth) s.depth = emptyDepth()
      const unpaid = s.depth.invoices.filter((i) => !i.paid).length
      if (unpaid >= DEPTH.invoiceUnpaidCap) return no('Invoice book full — pay an invoice first.')
      if (s.supplier === 'b' && crates < WHOLESALE.supplierB.minSpools) {
        return no(`Supplier B needs ≥${WHOLESALE.supplierB.minSpools} crates.`)
      }
      return ok
    },
    run: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'buyWholesale' }>
      placeOrder(s, c.cat ?? s.orderCat, Math.max(1, Math.floor(c.crates ?? c.qty ?? 1)))
    },
  },
  setSupplier: {
    can: (s, cmd) => {
      const supplier = (cmd as Extract<Command, { type: 'setSupplier' }>).supplier
      if (supplier !== 'a' && supplier !== 'b') return no('Unknown supplier.')
      if (supplier === 'b' && !s.memos['second-wholesaler']) return no('Second wholesaler memo first.')
      return ok
    },
    run: (s, cmd) => {
      s.supplier = (cmd as Extract<Command, { type: 'setSupplier' }>).supplier
    },
  },
  hire: {
    can: (s, cmd) => {
      const role = (cmd as Extract<Command, { type: 'hire' }>).role
      if (!ROLE_IDS.includes(role)) return no('Unknown role.')
      const roleDef = ROLES[role]
      if (roleDef.era && s.era < roleDef.era) return no(`${roleDef.name} hires in Era ${roleDef.era}.`)
      if (role === 'shiftLead') return no('Promote a clerk to Shift Lead.')
      if (role === 'night' && !s.memos['night-latch']) return no('Night Latch memo first.')
      if (!s.menus.staff && !s.memos['help-wanted']) return no('Staff not unlocked.')
      if (isHorizonRole(role)) {
        const full = annexSeatBlock(s)
        if (full) return no(full)
      } else if (isDeptRole(role)) {
        const full = deptSeatBlock(s, role)
        if (full) return no(full)
      } else {
        const seats = staffSeatCap(s)
        if (floorHeadcount(s) >= seats) {
          return no(`Staff seats full (${seats}). Grow the storefront or buy Shift Lead.`)
        }
      }
      const cost = hireCost(s, role)
      if (s.cash < cost) return needCash(cost)
      return ok
    },
    run: (s, cmd) => {
      const role = (cmd as Extract<Command, { type: 'hire' }>).role
      const cost = hireCost(s, role)
      s.cash -= cost
      const id = s.nextStaffId++
      const traitId = traitForStaffId(id)
      s.staff.push({
        id,
        role,
        name: staffName(id),
        level: 1,
        xp: 0,
        hiredAt: s.time,
        ...(traitId ? { traitId } : {}),
      })
      s.stats.hires += 1
      log(s, `Hired ${staffName(id)} as ${role}.`, 'staff')
      if (isDeptRole(role)) syncDeptRoster(s)
    },
  },
  fire: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'fire' }>).id
      if (!s.staff.some((m) => m.id === id)) return no('No such employee.')
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'fire' }>).id
      const i = s.staff.findIndex((m) => m.id === id)
      if (i < 0) return
      const [gone] = s.staff.splice(i, 1)
      log(s, `${gone.name} left the store.`, 'staff')
      if (isDeptRole(gone.role)) syncDeptRoster(s)
    },
  },
  buyAd: {
    can: (s) => {
      if (!s.menus.marketing && s.era < 1) return no('Marketing locked.')
      if (s.cash < s.adCost) return needCash(s.adCost)
      return ok
    },
    run: (s) => {
      s.cash -= s.adCost
      s.lastAdSpend = s.adCost
      s.lastAdAt = s.time
      s.ads += 1
      s.stats.adsBought += 1
      s.adCost = Math.ceil(s.adCost * adCostGrowth(s))
      log(s, `Ad level ${s.ads}. Next costs ${cashLabel(s.adCost)}.`, 'info')
    },
  },
  refundAd: {
    can: (s) => {
      if (s.lastAdAt < 0) return no('No recent ad.')
      if (s.time - s.lastAdAt > 10) return no('Refund window is 10 seconds.')
      if (s.ads <= 1) return no('Cannot refund below level 1.')
      return ok
    },
    run: (s) => {
      s.ads -= 1
      s.cash += s.lastAdSpend
      s.adCost = Math.max(DEMAND.adStartCost, Math.ceil(s.lastAdSpend))
      s.lastAdAt = -1
      log(s, `Ad refunded. ${cashLabel(s.lastAdSpend)} returned.`, 'info')
    },
  },
  setMarketingPosture: {
    can: (s, cmd) => {
      if (!s.menus.marketing && s.era < 1) return no('Marketing locked.')
      const posture = (cmd as Extract<Command, { type: 'setMarketingPosture' }>).posture
      if (posture !== 'neighborhood' && posture !== 'circular' && posture !== 'houseBrand') {
        return no('Unknown posture.')
      }
      if (s.marketingPosture === posture) return no('Already set.')
      const fee = postureFee(s)
      if (s.cash < fee) return needCash(fee)
      return ok
    },
    run: (s, cmd) => {
      const posture = (cmd as Extract<Command, { type: 'setMarketingPosture' }>).posture
      const fee = postureFee(s)
      s.cash -= fee
      s.marketingPosture = posture
      if (s.depth?.rivalLockCat) {
        s.depth.rivalLockCat = null
        log(s, 'Posture change cleared Penny’s aisle lock.', 'good')
      }
      const label =
        posture === 'circular' ? 'Circular' : posture === 'houseBrand' ? 'House brand' : 'Neighborhood'
      log(s, `Marketing posture → ${label} (−${cashLabel(fee)}).`, 'info')
    },
  },
  lockWholesalePrice: {
    can: (s) => {
      if (!s.memos['price-lock']) return no('Price Lock memo first.')
      if (s.priceLockUntil > s.time) {
        return no(`Already locked (${waitLabel(s.priceLockUntil - s.time)}).`)
      }
      const cost = crateCost(s, s.orderCat) * PRICE_LOCK.cratesCost
      if (s.cash < cost) return needCash(cost)
      return ok
    },
    run: (s) => {
      const cost = crateCost(s, s.orderCat) * PRICE_LOCK.cratesCost
      s.cash -= cost
      s.priceLockIndex = s.wholesale.index
      s.priceLockUntil = s.time + PRICE_LOCK.durationSec
      log(
        s,
        `Wholesale index locked at ${s.priceLockIndex.toFixed(2)} for ${PRICE_LOCK.durationSec}s (−${cashLabel(cost)}).`,
        'good',
      )
    },
  },
  setHours: {
    can: (s, cmd) => {
      const h = (cmd as Extract<Command, { type: 'setHours' }>).hours
      if (!Number.isFinite(h)) return no('Bad hours.')
      if (h < HOURS.min || h > hoursMax(s) + 1e-9) return no(`Hours ${HOURS.min}–${hoursMax(s)}.`)
      return ok
    },
    run: (s, cmd) => {
      s.hours = clamp((cmd as Extract<Command, { type: 'setHours' }>).hours, HOURS.min, hoursMax(s))
    },
  },
  orderPizza: {
    can: (s) => {
      const r = canOrderPizza(s)
      return r ? no(r) : ok
    },
    run: (s) => orderPizza(s),
  },
  callInspector: {
    can: (s) => {
      const r = canCallInspector(s)
      return r ? no(r) : ok
    },
    run: (s) => callInspector(s),
  },
  matchCoupons: {
    can: (s) => {
      const r = canMatchCoupons(s)
      return r ? no(r) : ok
    },
    run: (s) => matchCoupons(s),
  },
  answerRival: {
    can: (s) => {
      const r = canAnswerRival(s)
      return r ? no(r) : ok
    },
    run: (s) => answerRival(s),
  },
  dumpCooler: {
    can: (s, cmd) => {
      const includeShelf = !!(cmd as Extract<Command, { type: 'dumpCooler' }>).includeShelf
      const n = perishableQty(s, 'backroom') + (includeShelf ? perishableQty(s, 'shelf') : 0)
      if (n > 0) return ok
      return no(includeShelf ? 'No perishables to dump.' : 'No perishables in the backroom.')
    },
    run: (s, cmd) => {
      dumpCooler(s, !!(cmd as Extract<Command, { type: 'dumpCooler' }>).includeShelf)
    },
  },
  dumpCoolerPartial: {
    can: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'dumpCoolerPartial' }>
      if (!CATEGORY_IDS.includes(c.cat)) return no('Unknown aisle.')
      if (!Number.isFinite(c.qty) || Math.floor(c.qty) < 1) return no('Pick at least 1 unit.')
      const where: DumpWhere = c.where === 'shelf' ? 'shelf' : 'backroom'
      if (perishableQty(s, where, c.cat) <= 0) return no('Nothing perishable there to dump.')
      return ok
    },
    run: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'dumpCoolerPartial' }>
      dumpCoolerPartial(s, c.cat, Math.floor(c.qty), c.where === 'shelf' ? 'shelf' : 'backroom')
    },
  },
  buyMemo: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'buyMemo' }>).id
      const def = MEMO_BY_ID[id]
      if (!def) return no('Unknown memo.')
      const owned = s.memos[id] ?? 0
      if (owned > 0 && !def.repeatable) return no('Already done.')
      if (def.max != null && owned >= def.max) return no('Maxed.')
      if (!s.memoSeen[id]) {
        try {
          if (!def.visible(s)) return no('Not available yet.')
        } catch {
          return no('Not available yet.')
        }
      }
      const blocked = def.blocked?.(s)
      if (blocked) return no(blocked)
      const cost = def.cost(s)
      if ((cost.cash ?? 0) > s.cash) return needCash(cost.cash ?? 0)
      if ((cost.attention ?? 0) > s.compute.attention) return no(`Need ${cost.attention} Attention.`)
      if ((cost.ideas ?? 0) > s.compute.ideas) return no(`Need ${cost.ideas} Ideas.`)
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'buyMemo' }>).id
      const def = MEMO_BY_ID[id]
      const cost = def.cost(s)
      s.cash -= cost.cash ?? 0
      s.compute.attention -= cost.attention ?? 0
      s.compute.ideas -= cost.ideas ?? 0
      s.memos[id] = (s.memos[id] ?? 0) + 1
      s.memoSeen[id] = true
      s.stats.memosDone += 1
      s.empire.xp += EMPIRE.xpPerMemo
      def.run?.(s)
      log(s, def.voice, 'story')
      log(s, def.done, 'memo')
    },
  },
  buyMemoSweep: {
    can: (s) => {
      if (!hasAffordableMemo(s)) return no('No desk memos ready to buy.')
      return ok
    },
    run: (s) => {
      const plan = planAffordableMemos(s)
      let n = 0
      for (const step of plan) {
        if (!run(s, { type: 'buyMemo', id: step.id }).ok) break
        n += 1
      }
      if (n > 0) log(s, `Bought ${n} memos, cheapest first.`, 'good')
    },
  },
  syncRelics: {
    can: () => ok,
    run: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'syncRelics' }>
      s.relics = {
        wings: [...c.wings],
        count: Math.max(0, Math.floor(c.count)),
        owned: { ...(c.owned ?? {}) },
        levels: { ...(c.levels ?? {}) },
        sockets: [...(c.sockets ?? [])],
        litWings: c.litWings ? [...c.litWings] : null,
        dust: Math.max(0, Math.floor(c.dust ?? 0)),
        autoDust: s.relics.autoDust ?? null,
      }
      if (c.unlocked) s.menus.relics = true
    },
  },
  evenAttention: {
    can: (s) => {
      if (s.era < 2) return no('Need Era 2.')
      if (s.stores.length < 2) return no('Open a second store first.')
      const fair = 1 / s.stores.length
      if (s.stores.every((st) => Math.abs(st.attentionShare - fair) < 0.005)) return no('Already even.')
      return ok
    },
    run: (s) => {
      const fair = 1 / s.stores.length
      for (const st of s.stores) st.attentionShare = fair
      log(s, `Attention split evenly across ${s.stores.length} stores.`, 'info')
    },
  },
  walkDrifting: {
    can: (s) => {
      const drifting = s.stores.filter((st) => (st.drift ?? 0) >= CHAIN.driftWarn)
      if (drifting.length === 0) return no('No store is drifting.')
      return canWalkStore(s, drifting[0]!.id) ? no(canWalkStore(s, drifting[0]!.id)!) : ok
    },
    run: (s) => {
      // Worst first, until Attention runs out.
      const drifting = s.stores
        .filter((st) => (st.drift ?? 0) >= CHAIN.driftWarn)
        .sort((a, b) => (b.drift ?? 0) - (a.drift ?? 0))
      let walked = 0
      for (const st of drifting) {
        if (canWalkStore(s, st.id)) break
        walkStore(s, st.id)
        walked += 1
      }
      if (walked < drifting.length) log(s, `Visited ${walked} of ${drifting.length} stores before your Attention ran out.`, 'info')
    },
  },
  priceWar: {
    can: (s, cmd) => {
      const why = canPriceWar(s, (cmd as Extract<Command, { type: 'priceWar' }>).id)
      return why ? no(why) : ok
    },
    run: (s, cmd) => priceWar(s, (cmd as Extract<Command, { type: 'priceWar' }>).id),
  },
  buyoutRival: {
    can: (s, cmd) => {
      const why = canBuyout(s, (cmd as Extract<Command, { type: 'buyoutRival' }>).id)
      return why ? no(why) : ok
    },
    run: (s, cmd) => buyout(s, (cmd as Extract<Command, { type: 'buyoutRival' }>).id),
  },
  startProject: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'startProject' }>).id
      const def = PROJECT_BY_ID[id]
      if (!def) return no('Unknown project.')
      if (!empireUnlocked(s.empire.level, 'projects')) return no('Projects open at Empire 15.')
      if (s.era < def.era) return no(`Needs era ${def.era}.`)
      if (s.projects.done[id]) return no('Already built.')
      if (s.projects.active.some((a) => a.id === id)) return no('Already under way.')
      const crews = empireUnlocked(s.empire.level, 'second-project') ? 2 : 1
      if (s.projects.active.length >= crews) return no(crews > 1 ? 'Both crews are busy.' : 'The crew is busy.')
      if (s.cash < def.cash) return needCash(Math.ceil(def.cash))
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'startProject' }>).id
      const def = PROJECT_BY_ID[id]!
      s.cash -= def.cash
      s.projects.active.push({ id, endsAt: s.time + def.seconds })
      log(s, `Project started: ${def.name}.`, 'good')
    },
  },
  buyUpgrade: {
    can: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'buyUpgrade' }>
      const id = c.id
      const def = UPGRADE_BY_ID[id]
      if (!def) return no('Unknown upgrade.')
      if (!isUpgradeVisible(s, def)) return no('Not visible yet.')
      if (!requirementsMet(s, def)) return no('Prerequisites not met.')
      const blocked = forkBlockedBy(s, def)
      if (blocked) return no(`Other path filed: ${blocked.name}. Retrain to switch.`)
      const lvl = s.upgrades[id] ?? 0
      if (lvl >= def.max) return no('Maxed.')
      const rankCap = upgradeRankCap(s, id)
      if (lvl >= rankCap) {
        return no(`A higher Empire rank unlocks more levels (limit ${rankCap}).`)
      }
      const want = Math.max(1, Math.floor(c.count ?? 1))
      const count = Math.min(want, def.max - lvl, rankCap - lvl, 50)
      if (count < 1) return no('Maxed.')
      const cost = upgradeBulkCost(s, id, count)
      if (s.cash < cost) return needCash(cost)
      return ok
    },
    run: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'buyUpgrade' }>
      const id = c.id
      const def = UPGRADE_BY_ID[id]
      const rankCap = upgradeRankCap(s, id)
      const want = Math.max(1, Math.floor(c.count ?? 1))
      const count = Math.min(want, def.max - (s.upgrades[id] ?? 0), rankCap - (s.upgrades[id] ?? 0), 50)
      for (let i = 0; i < count; i++) {
        const cost = nextUpgradeCost(s, id)
        s.cash -= cost
        s.upgrades[id] = (s.upgrades[id] ?? 0) + 1
        s.upgradeSpend += cost
      }
      s.stats.upgradesBought += count
      s.empire.xp += EMPIRE.xpPerUpgrade * count
    },
  },
  buyUpgradeSweep: {
    can: (s, cmd) => {
      const tree = (cmd as Extract<Command, { type: 'buyUpgradeSweep' }>).tree ?? 'all'
      if (!hasAffordableUpgrade(s, tree)) return no('Nothing affordable there. Capstones stay a choice.')
      return ok
    },
    run: (s, cmd) => {
      const tree = (cmd as Extract<Command, { type: 'buyUpgradeSweep' }>).tree ?? 'all'
      const plan = planAffordableUpgrades(s, tree)
      let ranks = 0
      let stop = false
      for (const step of plan) {
        for (let i = 0; i < step.count; i++) {
          if (!run(s, { type: 'buyUpgrade', id: step.id, count: 1 }).ok) {
            stop = true
            break
          }
          ranks += 1
        }
        if (stop) break
      }
      if (ranks > 0) log(s, `Bought ${ranks} upgrade ranks, best value first.`, 'good')
    },
  },
  levelVentureSweep: {
    can: (s) => {
      if (!hasAffordableVenture(s)) return no('No open till can be raised right now.')
      return ok
    },
    run: (s) => {
      const plan = planAffordableVentures(s)
      let n = 0
      let stop = false
      for (const step of plan) {
        for (let i = 0; i < step.count; i++) {
          if (!run(s, { type: 'levelVenture', id: step.id }).ok) {
            stop = true
            break
          }
          n += 1
        }
        if (stop) break
      }
      if (n > 0) log(s, `Raised ${n} venture levels, best income per dollar first.`, 'good')
    },
  },
  buyBuild: {
    can: (s, cmd) => {
      const id = buildTrackId(cmd as { track?: string; id?: string })
      if (!id) return no('Unknown build.')
      const track = TRACK_BY_ID[id]
      if (!track.visible(s)) return no('Track locked.')
      const lvl = s.builds[id] ?? 0
      const next = track.tiers[lvl + 1]
      if (!next) return no('Max tier.')
      if (next.era > s.era) return no(`Needs era ${next.era}.`)
      if (s.cash < next.cost) return needCash(next.cost)
      return ok
    },
    run: (s, cmd) => {
      const id = buildTrackId(cmd as { track?: string; id?: string })!
      const track = TRACK_BY_ID[id]
      const lvl = s.builds[id] ?? 0
      const next = track.tiers[lvl + 1]
      s.cash -= next.cost
      s.builds[id] = lvl + 1
      s.stats.buildsBought += 1
      delete s.buildHibernated?.[id]
      log(s, `Built ${next.name}.`, 'good')
    },
  },
  sellBuild: {
    can: (s, cmd) => {
      const id = buildTrackId(cmd as { track?: string; id?: string })
      if (!id) return no('Unknown build.')
      const lvl = s.builds[id] ?? 0
      const min = id === 'storefront' || id === 'storage' ? 1 : 0
      if (lvl <= min) return no('Nothing to sell.')
      return ok
    },
    run: (s, cmd) => {
      const id = buildTrackId(cmd as { track?: string; id?: string })!
      const track = TRACK_BY_ID[id]
      const lvl = s.builds[id] ?? 0
      const tier = track.tiers[lvl]
      const refund = round2((tier?.cost ?? 0) * refundFrac(s))
      s.builds[id] = lvl - 1
      s.cash += refund
      // Drop facing slots that no longer meet minTier after the sell-back.
      if (s.buildVariants) {
        for (const [key, vid] of Object.entries(s.buildVariants)) {
          const def = BUILD_VARIANT_BY_ID[vid]
          if (!def || def.track !== id) continue
          if ((s.builds[id] ?? 0) < def.minTier) delete s.buildVariants[key]
        }
      }
      delete s.buildHibernated?.[id]
      log(s, `Sold back ${tier?.name ?? id} for ${cashLabel(refund)}.`, 'info')
    },
  },
  setBuildVariant: {
    can: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'setBuildVariant' }>
      const def = BUILD_VARIANT_BY_ID[c.variantId]
      if (!def || def.track !== c.track) return no('Unknown facing.')
      if ((s.builds[c.track] ?? 0) < def.minTier) return no(`Needs ${TRACK_BY_ID[c.track].tiers[def.minTier]?.name ?? 'higher tier'}.`)
      const slot = variantSlotKey(c.track, def.minTier)
      const legacy = s.buildVariants?.[c.track]
      const existing = s.buildVariants?.[slot] ?? (def.minTier === 2 && legacy ? legacy : undefined)
      if (existing && existing !== c.variantId) {
        return no('Facing already chosen for this tier.')
      }
      return ok
    },
    run: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'setBuildVariant' }>
      const def = BUILD_VARIANT_BY_ID[c.variantId]
      if (!s.buildVariants) s.buildVariants = {}
      if (def) {
        const slot = variantSlotKey(c.track, def.minTier)
        s.buildVariants[slot] = c.variantId
        // Drop legacy track-only key once slotted.
        if (s.buildVariants[c.track] && s.buildVariants[c.track] === c.variantId) {
          delete s.buildVariants[c.track]
        } else if (s.buildVariants[c.track] && BUILD_VARIANT_BY_ID[s.buildVariants[c.track]]?.minTier === def.minTier) {
          delete s.buildVariants[c.track]
        }
      }
      log(s, `Facing: ${def?.name ?? c.variantId}.`, 'good')
    },
  },
  hibernateBuild: {
    can: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'hibernateBuild' }>
      const id = c.track
      if (!TRACK_BY_ID[id]) return no('Unknown build.')
      const lvl = s.builds[id] ?? 0
      const min = id === 'storefront' || id === 'storage' ? 1 : 0
      if (lvl <= min) return no('Nothing to hibernate.')
      if (s.buildHibernated?.[id]) return no('Already hibernating.')
      return ok
    },
    run: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'hibernateBuild' }>
      const id = c.track
      const track = TRACK_BY_ID[id]
      const lvl = s.builds[id] ?? 0
      const tier = track.tiers[lvl]
      const refund = round2((tier?.cost ?? 0) * refundFrac(s) * 0.35)
      s.builds[id] = lvl - 1
      s.cash += refund
      if (!s.buildHibernated) s.buildHibernated = {}
      s.buildHibernated[id] = true
      if (s.buildVariants) {
        for (const [key, vid] of Object.entries(s.buildVariants)) {
          const def = BUILD_VARIANT_BY_ID[vid]
          if (!def || def.track !== id) continue
          if ((s.builds[id] ?? 0) < def.minTier) delete s.buildVariants[key]
        }
      }
      log(s, `Hibernated ${tier?.name ?? id} · +${cashLabel(refund)}. Effects parked.`, 'warn')
    },
  },
  buyEndcap: {
    can: (s) => {
      if (s.endcaps >= ENDCAP.max) return no('Max endcaps.')
      const cost = Math.ceil(ENDCAP.base * Math.pow(ENDCAP.growth, s.endcaps))
      if (s.cash < cost) return needCash(cost)
      return ok
    },
    run: (s) => {
      const cost = Math.ceil(ENDCAP.base * Math.pow(ENDCAP.growth, s.endcaps))
      s.cash -= cost
      s.endcaps += 1
    },
  },
  sellEndcap: {
    can: (s) => (s.endcaps > 0 ? ok : no('No endcaps.')),
    run: (s) => {
      const cost = Math.ceil(ENDCAP.base * Math.pow(ENDCAP.growth, s.endcaps - 1))
      s.endcaps -= 1
      s.cash += round2(cost * ENDCAP.refund)
    },
  },
  openVenture: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'openVenture' }>).id
      const def = VENTURE_BY_ID[id]
      if (!def) return no('Unknown venture.')
      if (!def.available(s)) return no('Not available.')
      if (s.ventures[id]?.level) return no('Already open.')
      if (s.cash < def.openCost) return needCash(def.openCost)
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'openVenture' }>).id
      const def = VENTURE_BY_ID[id]
      s.cash -= def.openCost
      s.ventures[id] = { level: 1, stored: 0, lifetime: 0, carry: 0 }
      log(s, `${def.name} opened.`, 'good')
    },
  },
  levelVenture: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'levelVenture' }>).id
      const def = VENTURE_BY_ID[id]
      const vs = s.ventures[id]
      if (!def || !vs) return no('Venture closed.')
      if (vs.level >= def.maxLevel) return no('Max level.')
      const cost = ventureLevelCost(def, vs.level)
      if (s.cash < cost) return needCash(cost)
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'levelVenture' }>).id
      const def = VENTURE_BY_ID[id]
      const vs = s.ventures[id]
      const cost = ventureLevelCost(def, vs.level)
      s.cash -= cost
      vs.level += 1
    },
  },
  collectVenture: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'collectVenture' }>).id
      const vs = s.ventures[id]
      if (!vs || vs.stored <= 0) return no('Nothing to collect.')
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'collectVenture' }>).id
      const got = collectVenture(s, id)
      if (got > 0) log(s, `Collected ${cashLabel(got)} from venture.`, 'sale')
    },
  },
  collectAllVentures: {
    can: (s) => (Object.values(s.ventures).some((v) => (v?.stored ?? 0) > 0) ? ok : no('Nothing to collect.')),
    run: (s) => {
      let total = 0
      let n = 0
      for (const id of Object.keys(s.ventures)) {
        const got = collectVenture(s, id)
        if (got > 0) {
          total += got
          n += 1
        }
      }
      if (total > 0) log(s, `Collected ${cashLabel(total)} from ${n} till${n === 1 ? '' : 's'}.`, 'sale')
    },
  },
  depositPassbook: {
    can: (s, cmd) => {
      if (!s.menus.invest && !s.memos['passbook']) return no('Invest locked.')
      const amount = (cmd as Extract<Command, { type: 'depositPassbook' }>).amount
      if (!(amount > 0)) return no('Enter an amount.')
      if (s.cash < amount) return no('Not enough cash.')
      return ok
    },
    run: (s, cmd) => {
      const amount = round2((cmd as Extract<Command, { type: 'depositPassbook' }>).amount)
      s.cash -= amount
      s.passbook.balance += amount
    },
  },
  withdrawPassbook: {
    can: (s, cmd) => {
      const amount = (cmd as Extract<Command, { type: 'withdrawPassbook' }>).amount
      if (!(amount > 0)) return no('Enter an amount.')
      if (s.passbook.balance < amount) return no('Passbook balance too low.')
      return ok
    },
    run: (s, cmd) => {
      const amount = round2((cmd as Extract<Command, { type: 'withdrawPassbook' }>).amount)
      s.passbook.balance -= amount
      s.cash += amount
    },
  },
  buyPerk: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'buyPerk' }>).id
      const def = PERK_BY_ID[id]
      if (!def) return no('Unknown perk.')
      if (def.visible && !def.visible(s)) return no('Not available yet.')
      if (def.requires?.length) {
        for (const r of def.requires) {
          if ((s.empire.perks[r.id] ?? 0) < r.level) return no('Prerequisites not met.')
        }
      }
      if (def.exclusive) {
        for (const other of Object.values(PERK_BY_ID)) {
          if (other.id === id || other.exclusive !== def.exclusive) continue
          if ((s.empire.perks[other.id] ?? 0) > 0) {
            return no(`Other doctrine filed: ${other.name}. Rewrite the Charter to switch.`)
          }
        }
      }
      const lvl = s.empire.perks[id] ?? 0
      if (lvl >= def.max) return no('Maxed.')
      if (s.empire.points < def.cost) return no('Need perk points.')
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'buyPerk' }>).id
      const def = PERK_BY_ID[id]
      s.empire.points -= def.cost
      s.empire.perks[id] = (s.empire.perks[id] ?? 0) + 1
      if (id === 'extra-archive' && s.compute.unlocked) s.compute.archives += 1
      if (id === 'drawer-map' && s.compute.unlocked) s.compute.archives += 1
    },
  },
  respecPerks: {
    can: (s) => {
      const spent = Object.values(s.empire.perks).reduce((n, v) => n + (v ?? 0), 0)
      if (spent <= 0) return no('No strategies to change.')
      const cost = Math.ceil(PERK_RESPEC.ideas * Math.pow(PERK_RESPEC.growth, s.compute.perkRespecs ?? 0))
      if (s.compute.ideas < cost) return no(`Need ${cost} Ideas.`)
      return ok
    },
    run: (s) => {
      let refund = 0
      for (const [id, lvl] of Object.entries(s.empire.perks)) {
        const def = PERK_BY_ID[id]
        if (!def || !lvl) continue
        refund += def.cost * lvl
        if (id === 'extra-archive' || id === 'drawer-map') {
          // Archives granted by perks are left in place — Rewrite refunds points only.
        }
      }
      const cost = Math.ceil(PERK_RESPEC.ideas * Math.pow(PERK_RESPEC.growth, s.compute.perkRespecs ?? 0))
      s.compute.ideas -= cost
      s.empire.perks = {}
      s.empire.points += refund
      s.compute.perkRespecs = (s.compute.perkRespecs ?? 0) + 1
      log(s, `Rewrite the Charter refunded ${refund} trait point${refund === 1 ? '' : 's'}.`, 'good')
    },
  },
  expandLot: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'expandLot' }>).id ?? 'side-yard'
      if (!s.menus.land && !s.memos['lot-survey'] && s.era < 2) return no('Land locked.')
      if (s.expansions[id]) return no('Already owned.')
      const era2 = ERA2_EXPANSION_BY_ID[id]
      if (era2) {
        if (era2.era > s.era) return no(`Needs era ${era2.era}.`)
        if (era2.requires && !era2.requires(s)) return no('Prerequisites not met.')
        if (debtCovenantBreached(s)) return no('Debt covenant blocks expansion.')
        if (s.cash < era2.cost) return needCash(era2.cost)
        return ok
      }
      // Side yard / lot: sustained Era 1 loops before Era 2 opens.
      if (id === 'side-yard' || id === 'lot') {
        if ((s.depth?.writeOffs ?? 0) < DEPTH.writeOffNeedEra2) {
          return no(`Survive ${DEPTH.writeOffNeedEra2} morning write-offs first.`)
        }
        const freshLead =
          s.staff.some((m) => m.role === 'produceLead') ||
          (s.depth?.departments?.fresh?.leadId ?? null) != null
        if (!freshLead) return no('Hire a Produce Lead first.')
        if ((s.builds.storefront ?? 1) < 2) return no('Upgrade to a Corner Store first.')
        if (!s.categories.dairy) return no('Unlock Dairy first.')
        if ((s.depth?.regularSatisfied ?? 0) < DEPTH.era2RegularNeed) {
          return no(`Satisfy ${DEPTH.era2RegularNeed} regulars first.`)
        }
        if ((s.depth?.invoicesOnTime ?? 0) < DEPTH.invoiceOnTimeNeedSideYard) {
          return no(`Pay ${DEPTH.invoiceOnTimeNeedSideYard} invoices on time first.`)
        }
        const flag =
          !!s.depth?.flagship?.credited ||
          ((s.depth?.flagship?.filings ?? 0) > DEPTH.flagshipPracticePerEra &&
            (s.depth?.flagship?.score ?? 0) >= DEPTH.flagshipSlow)
        if (!flag) return no('File a flagship planogram (≥0.72 after practice) first.')
        if ((s.depth?.shifts?.daysCoveredOpen ?? 0) < DEPTH.openDaysNeedSideYard) {
          return no(`Cover Open shift for ${DEPTH.openDaysNeedSideYard} days first.`)
        }
        if ((s.depth?.dockCheckIns ?? 0) < DEPTH.dockCheckInNeed) {
          return no(`Check in at the dock ${DEPTH.dockCheckInNeed} times first.`)
        }
        if ((s.depth?.stars ?? 0) < DEPTH.era1StarMin) {
          return no(`Need stars ≥ ${DEPTH.era1StarMin}.`)
        }
      }
      const cost = id === 'side-yard' ? 2500 : id === 'lot' ? 5000 : 5000
      if (s.cash < cost) return needCash(cost)
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'expandLot' }>).id ?? 'side-yard'
      const era2 = ERA2_EXPANSION_BY_ID[id]
      const cost = era2 ? era2.cost : id === 'side-yard' ? 2500 : 5000
      s.cash -= cost
      s.expansions[id] = true
      log(s, `Expansion purchased: ${id}.`, 'era')
      // Lot / side yard gates Era 2 — chain and capital
      if (id === 'lot' || id === 'side-yard') {
        setEra(s, 2)
        ensureFlagshipStore(s)
        unlockMenu(s, 'land')
        unlockMenu(s, 'strategy')
        // One opener only — rest live in Coach catalog (player-pulled).
        queueTutorial(s, 'e2-second-store')
        log(s, 'Era 2 — Chain and capital. Attention splits; the book waits.', 'era')
      }
    },
  },
  expandSideYard: {
    can: (s) => can(s, { type: 'expandLot', id: 'side-yard' }),
    run: (s) => {
      run(s, { type: 'expandLot', id: 'side-yard' })
    },
  },
  emergencyDelivery: {
    can: (s) => {
      const r = canEmergencyDelivery(s)
      return r ? no(r) : ok
    },
    run: (s) => {
      applyEmergencyDelivery(s)
    },
  },
  mentorRestock: {
    can: (s) => {
      const r = canMentorRestock(s)
      return r ? no(r) : ok
    },
    run: (s) => {
      applyMentorRestock(s)
    },
  },
  bailout: {
    can: (s) => {
      const r = canBailout(s)
      return r ? no(r) : ok
    },
    run: (s) => {
      applyBailout(s)
    },
  },
  callStarterCrate: {
    can: (s) => {
      const reason = canEmptyShelfHelper(s, { ignoreWait: true })
      return reason ? no(reason) : ok
    },
    run: (s) => {
      applyEmptyShelfHelper(s, { ignoreWait: true })
    },
  },
  setStoreName: {
    can: (s, cmd) => {
      const name = cleanStoreName((cmd as Extract<Command, { type: 'setStoreName' }>).name)
      if (name === s.storeName) return no('That is already the name.')
      return ok
    },
    run: (s, cmd) => {
      s.storeName = cleanStoreName((cmd as Extract<Command, { type: 'setStoreName' }>).name)
    },
  },
  setDailyRule: {
    can: (s, cmd) => {
      const rule = (cmd as Extract<Command, { type: 'setDailyRule' }>).rule
      if (!(DAILY_RULE_ORDER as readonly string[]).includes(rule)) return no('No such rule.')
      if (s.dailyRule) return no('Today already has its rule.')
      if (s.stats.sold > 0) return no('The rule is set when a daily run starts.')
      return ok
    },
    run: (s, cmd) => {
      s.dailyRule = (cmd as Extract<Command, { type: 'setDailyRule' }>).rule
    },
  },
  dismissTip: {
    can: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'dismissTip' }>).id
      if (!TIP_BY_ID[id]) return no('Unknown tip.')
      if (s.tipsSeen[id]) return no('Already dismissed.')
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'dismissTip' }>).id
      s.tipsSeen[id] = true
    },
  },
  advanceDialogue: {
    can: (s) => (s.dialogueQueue.length ? ok : no('No dialogue waiting.')),
    run: (s) => {
      advanceDialogue(s)
    },
  },
  introBeat: {
    can: (s) => (s.introSeen ? no('Intro already finished.') : ok),
    run: (s, cmd) => {
      const idx = (cmd as Extract<Command, { type: 'introBeat' }>).index
      const beat = INTRO_BEATS[idx]
      if (beat?.ledger) log(s, beat.ledger, 'story')
    },
  },
  finishIntro: {
    can: (s) => (s.introSeen ? no('Intro already finished.') : ok),
    run: (s) => {
      s.introSeen = true
      s.paused = false
      log(s, 'The counter is yours. Unpack puts stock on the shelf. Baskets are the score; cash pays the bills.', 'story')
      // Opening strip facts live on the coach card — mark them seen so they never fight the tour.
      skipOpeningDialogue(s)
      if (!s.tutorials.done['opening'] && !s.tutorials.active) beginTutorial(s, 'opening')
    },
  },
  setAutoRestock: {
    can: (s) => {
      if (!s.memos['auto-order']) return no('Auto-Order Clipboard memo first.')
      return ok
    },
    run: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'setAutoRestock' }>
      s.autoRestock.enabled = c.enabled
      if (c.maxCost !== undefined) s.autoRestock.maxCost = c.maxCost
      if (c.minUnits !== undefined) s.autoRestock.minUnits = Math.max(1, Math.floor(c.minUnits))
    },
  },
  setMix: {
    can: (_s, cmd) => {
      const c = cmd as Extract<Command, { type: 'setMix' }>
      if (!CATEGORY_IDS.includes(c.cat)) return no('Bad category.')
      if (!Number.isFinite(c.weight)) return no('Bad weight.')
      return ok
    },
    run: (s, cmd) => {
      const c = cmd as Extract<Command, { type: 'setMix' }>
      s.mix[c.cat] = clamp(c.weight, 0, 1)
    },
  },
  setOrderCat: {
    can: (s, cmd) => {
      const cat = (cmd as Extract<Command, { type: 'setOrderCat' }>).cat
      if (!s.categories[cat]) return no('Category locked.')
      return ok
    },
    run: (s, cmd) => {
      s.orderCat = (cmd as Extract<Command, { type: 'setOrderCat' }>).cat
    },
  },
  toggleFavoriteMemo: {
    can: (_s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'toggleFavoriteMemo' }>).id
      return MEMO_BY_ID[id] ? ok : no('Unknown memo.')
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'toggleFavoriteMemo' }>).id
      s.memoFavorites[id] = !s.memoFavorites[id]
    },
  },
  dismissOfflineReceipt: {
    can: (s) => (s.offlineReceipt ? ok : no('No receipt.')),
    run: (s) => {
      s.offlineReceipt = null
    },
  },
  skipTutorial: {
    can: (s) => (s.tutorials.active ? ok : no('No active tutorial.')),
    run: (s) => {
      const id = s.tutorials.active!.id
      s.tutorials.done[id] = true
      if (id === 'opening') finishOpeningLegacy(s)
      s.tutorials.active = null
      s.tutorials.calmUntil = s.time + 10
    },
  },
  completeTutorialStep: {
    can: (s) => (s.tutorials.active ? ok : no('No active tutorial.')),
    run: (s, cmd) => {
      const t = s.tutorials.active
      if (!t) return
      const c = cmd as Extract<Command, { type: 'completeTutorialStep' }>
      // Stale overlay (Strict Mode double-effect, or a tick that already advanced)
      // must not skip the next step.
      if (c.id != null && c.id !== t.id) return
      if (c.step != null && c.step !== t.step) return
      advanceTutorialStep(s)
    },
  },
  noteMenu: {
    can: () => ok,
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'noteMenu' }>).id
      if (!isMenuId(id)) return
      s.lastMenu = id
      s.menuStamp = (s.menuStamp ?? 0) + 1
    },
  },
  doTutorialForMe: {
    can: (s) => (s.tutorials.active ? ok : no('No active tutorial.')),
    run: (s) => {
      const t = s.tutorials.active!
      const step = TUTORIAL_BY_ID[t.id]?.steps[t.step]
      if (step?.action) applyTutorialAction(s, step.action)
      advanceTutorialStep(s)
    },
  },
  setPaused: {
    can: () => ok,
    run: (s, cmd) => {
      const p = (cmd as Extract<Command, { type: 'setPaused' }>).paused
      s.paused = p === undefined ? !s.paused : p
    },
  },
  setSpeed: {
    can: (_s, cmd) => {
      const speed = (cmd as Extract<Command, { type: 'setSpeed' }>).speed
      // The game runs at one speed for everyone; the command stays so old replays still parse.
      if (speed !== 1) return no('The game runs at one speed.')
      return ok
    },
    run: (s, cmd) => {
      s.speed = (cmd as Extract<Command, { type: 'setSpeed' }>).speed
    },
  },
  acceptChapter: {
    can: (s) => (s.chapterQueue.length ? ok : no('No chapter waiting.')),
    run: (s) => {
      const era = s.chapterQueue.shift()
      if (era != null) {
        log(s, `Chapter ${era} accepted. The aisle keeps its new name.`, 'story')
      }
    },
  },
  buyAnalyst: {
    can: (s) => {
      const r = canBuyAnalyst(s)
      return r ? no(r) : ok
    },
    run: (s) => buyAnalyst(s),
  },
  buyArchive: {
    can: (s) => {
      const r = canBuyArchive(s)
      return r ? no(r) : ok
    },
    run: (s) => buyArchive(s),
  },
  rebalanceOffice: {
    can: (s, cmd) => {
      const toward = (cmd as Extract<Command, { type: 'rebalanceOffice' }>).toward
      const r = canRebalanceOffice(s, toward)
      return r ? no(r) : ok
    },
    run: (s, cmd) => {
      const toward = (cmd as Extract<Command, { type: 'rebalanceOffice' }>).toward
      rebalanceOffice(s, toward)
    },
  },
  spendRep: {
    can: (s, cmd) => {
      const on = (cmd as Extract<Command, { type: 'spendRep' }>).on
      const r = on === 'archive' ? canBuyArchive(s) : canBuyAnalyst(s)
      return r ? no(r) : ok
    },
    run: (s, cmd) => {
      const on = (cmd as Extract<Command, { type: 'spendRep' }>).on
      if (on === 'archive') buyArchive(s)
      else buyAnalyst(s)
    },
  },
  toggleIdeas: {
    can: (s) => (s.compute.ideasUnlocked ? ok : no('Ideas not unlocked.')),
    run: (s) => toggleIdeas(s),
  },
  setAutoTourney: {
    can: (s) => ((s.upgrades['tourney-while-full'] ?? 0) >= 1 ? ok : no('Buy Tourney While Full first.')),
    run: (s, cmd) => {
      s.compute.autoTourney = (cmd as Extract<Command, { type: 'setAutoTourney' }>).on
    },
  },
  pulseScanner: {
    can: (s) => {
      const r = canPulseScanner(s)
      return r ? no(r) : ok
    },
    run: (s) => pulseScanner(s),
  },
  startTutorial: {
    can: (_s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'startTutorial' }>).id
      if (!TUTORIAL_BY_ID[id]) return no('Unknown tour.')
      return ok
    },
    run: (s, cmd) => {
      const id = (cmd as Extract<Command, { type: 'startTutorial' }>).id
      replayTutorial(s, id)
      unlockMenu(s, 'coach')
      // Promote immediately so Replay feels responsive
      if (!s.tutorials.active && s.tutorials.queue[0] === id) {
        s.tutorials.queue.shift()
        beginTutorial(s, id)
      }
    },
  },
  redeemLoyalty: {
    can: (s) => {
      if (s.loyalty.tier <= 0) return no('No punch card yet.')
      if (s.loyalty.liability < 0.5) return no('No rewards waiting.')
      if (s.cash < 0.5) return no('Need cash to pay rewards.')
      return ok
    },
    run: (s) => {
      const cap = Math.max(1, s.loyalty.liability * LOYALTY.redeemCapFrac)
      const pay = round2(Math.min(s.cash, s.loyalty.liability, cap))
      if (pay <= 0) return
      s.cash = round2(s.cash - pay)
      s.loyalty.liability = round2(Math.max(0, s.loyalty.liability - pay))
      log(s, `Punch-card rewards paid: ${cashLabel(pay)}. Regulars stay happy.`, 'good')
    },
  },
} satisfies Record<string, Handler>

const handlers = {
  ...coreHandlers,
  ...Object.fromEntries(
    Object.entries(era2Handlers).map(([k, h]) => [
      k,
      {
        can: (s: GameState, cmd: Command) => h.can(s, cmd as never),
        run: (s: GameState, cmd: Command) => h.run(s, cmd as never),
      } satisfies Handler,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(eraLateHandlers).map(([k, h]) => [
      k,
      {
        can: (s: GameState, cmd: Command) => h.can(s, cmd as never),
        run: (s: GameState, cmd: Command) => h.run(s, cmd as never),
      } satisfies Handler,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(horizonHandlers).map(([k, h]) => [
      k,
      {
        can: (s: GameState, cmd: Command) => h.can(s, cmd as never),
        run: (s: GameState, cmd: Command) => h.run(s, cmd as never),
      } satisfies Handler,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(corpHandlers).map(([k, h]) => [
      k,
      {
        can: (s: GameState, cmd: Command) => h.can(s, cmd as never),
        run: (s: GameState, cmd: Command) => h.run(s, cmd as never),
      } satisfies Handler,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(crimeHandlers).map(([k, h]) => [
      k,
      {
        can: (s: GameState, cmd: Command) => h.can(s, cmd as never),
        run: (s: GameState, cmd: Command) => h.run(s, cmd as never),
      } satisfies Handler,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(depthHandlers).map(([k, h]) => [
      k,
      {
        can: (s: GameState, cmd: Command) => h.can(s, cmd as never),
        run: (s: GameState, cmd: Command) => h.run(s, cmd as never),
      } satisfies Handler,
    ]),
  ),
} as Record<string, Handler>

export function can(s: GameState, cmd: Command): Check {
  const h = handlers[cmd.type]
  if (!h) return no('Unknown command.')
  try {
    return h.can(s, cmd)
  } catch {
    return no('Cannot do that.')
  }
}

/** Mutates state. No-ops when can() fails. */
export function run(s: GameState, cmd: Command): Check {
  const check = can(s, cmd)
  if (!check.ok) return check
  const h = handlers[cmd.type]
  if (!h) return no('Unknown command.')
  h.run(s, cmd)
  return ok
}

/** Auto-restock tick helper — places orders through the same buy path. */
export function tickAutoRestock(s: GameState) {
  if (!s.autoRestock.enabled) return
  if (!s.memos['auto-order']) return
  if (s.orders.length > 0) return
  const back = sumQty(s.backroom)
  if (back >= s.autoRestock.minUnits) return
  // Restock Smarts: wait for a dip vs the slow EMA — unless the floor is already dry.
  const smarts = up(s, 'restock-smarts')
  if (smarts > 0 && sumQty(s.shelf) + back > 0) {
    const tip = Number.isFinite(s.wholesale.tipIndex) ? s.wholesale.tipIndex : s.wholesale.index
    const tol = RESTOCK_SMARTS.tolBase - RESTOCK_SMARTS.tolPerRank * smarts
    if (s.wholesale.index > tip * tol) return
  }
  // Neediest aisle first (furthest below its mix target in the backroom); skip any over the
  // cost cap or unaffordable so one pricey aisle never blocks the cheaper ones.
  const targets = restockTargets(s)
  const backTotal = Math.max(1, back)
  const ranked: { cat: CategoryId; gap: number }[] = []
  for (const c of CATEGORY_IDS) {
    const target = targets[c]
    if (target == null) continue
    ranked.push({ cat: c, gap: target - sumQty(s.backroom, c) / backTotal })
  }
  ranked.sort((a, b) => b.gap - a.gap)
  const order: CategoryId[] = ranked.map((r) => r.cat)
  if (!order.length && s.categories[s.orderCat]) order.push(s.orderCat)
  const crates = s.supplier === 'b' ? WHOLESALE.supplierB.minSpools : 1
  for (const cat of order) {
    // maxCost is in base (stall-tier) dollars so the cap survives the 2.0 value ladder.
    if (unitCost(s, cat) / valueMul(s) > s.autoRestock.maxCost) continue
    if (!can(s, { type: 'buyWholesale', cat, crates }).ok) continue
    run(s, { type: 'buyWholesale', cat, crates })
    return
  }
}

/** Sim seconds between automatic tournaments. The bar has to sit full long enough for Ideas. */
const AUTO_TOURNEY_GAP = 45

/**
 * Tourney While Full spends 120 Attention when the bar is full.
 * It waits while Ideas are on — Ideas only mint at the cap — and never fires every tick.
 */
export function tickAutoTournament(s: GameState) {
  if (up(s, 'tourney-while-full') < 1) return
  if (s.compute.autoTourney === false) return
  if (s.era < 2 || !s.compute.unlocked) return
  if (s.compute.ideasUnlocked && s.compute.ideasOn) return
  if (s.time < (s.compute.nextAutoTourneyAt ?? 0)) return
  if (s.time < (s.compute.nextTournamentAt ?? 0)) return
  const cap = attentionCap(s)
  if (cap <= 0 || s.compute.attention < cap * 0.98) return
  // Never eat Attention that a memo on the desk is waiting for.
  const after = s.compute.attention - CAPITAL.tournamentAttention
  for (const m of MEMOS) {
    if (!s.memoSeen[m.id]) continue
    if ((s.memos[m.id] ?? 0) > 0 && !m.repeatable) continue
    try {
      const need = m.cost(s).attention ?? 0
      if (need > after && need <= cap) return
    } catch {
      /* ignore */
    }
  }
  const cmd: Command = { type: 'runTournament' }
  if (!can(s, cmd).ok) return
  run(s, cmd)
  s.compute.nextAutoTourneyAt = s.time + AUTO_TOURNEY_GAP
}

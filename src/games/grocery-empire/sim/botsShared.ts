import { MEMOS } from '../content/memos'
import { UPGRADE_BY_ID } from '../content/upgrades'
import { ROLE_IDS, type RoleId } from '../content/staff'
import { BUILD_FILTERS } from '../content/builds'
import { can, run, type Command } from './commands'
import { DEPTH } from './balance'
import { attentionCap, bestPrice, crateCost, hireCost, roleCount, unpackPerSec } from './formulas'
import { valueMul } from './systems/network'
import { sumQty } from './helpers'
import { repair } from './invariants'
import { nextRng } from './rng'
import { createInitialState, type GameState } from './state'
import { progressMetric } from './systems/recovery'
import { applyTick } from './tick'
import {
  pushCansFacing,
  pushFlagshipAndLeadShift,
  pushRegularsAndDock,
  pushShiftBoard,
} from './botsEarly'

/**
 * Headless Era 0–1 bots for balance gates + softlock fuzz (Part H4 / Q3).
 * Prefer dt≈1s steps (not 10Hz) so CI can cover tens of sim-minutes quickly.
 */

export interface BotResult {
  name: string
  ok: boolean
  detail: string
  final?: GameState
  /** Sim seconds when key gates first tripped (undefined if never). */
  gates?: {
    clerkAt?: number
    produceAt?: number
    attentionAt?: number
    lotAt?: number
  }
}

export type BotFn = (seed: number, seconds: number) => BotResult

const CHEAP_MEMO_CASH = 80
const BACKROOM_BUY_BELOW = 18
const MAX_REASONABLE_CRATE = 55
/** Race volume until past the back-office basket gate (Attention path). */
const VOLUME_BASKETS = 1400
/** Matches back-office memo cash cost. */
const OFFICE_CASH = 100
const OFFICE_SAVE_BASKETS = 1000
const CLERKS_BEFORE_OFFICE = 4
/** lot-survey Attention cost — need this much Archives cap before the Land gate. */
const LOT_SURVEY_ATTENTION = 5000
const LOT_SURVEY_CASH = 500
const SIDE_YARD_CASH = 2500

export function stockUnits(s: GameState): number {
  return sumQty(s.backroom) + sumQty(s.shelf)
}

export function fairPrice(s: GameState): number {
  // Volume-first through Attention unlock; then nudge toward bestPrice.
  if (s.baskets < VOLUME_BASKETS) return 1.25
  const tip = bestPrice(s)
  if (s.cash < 40) return 1.35
  return Math.min(2.5, Math.max(1.2, tip * 0.85))
}

export function affordableMemos(s: GameState, maxCash = CHEAP_MEMO_CASH): string[] {
  const ids: string[] = []
  for (const m of MEMOS) {
    if ((s.memos[m.id] ?? 0) > 0 && !m.repeatable) continue
    // Ending memos close the run; bots never file them.
    if (m.id === 'accept-exile' || m.id === 'reject-silence') continue
    const cmd: Command = { type: 'buyMemo', id: m.id }
    if (!can(s, cmd).ok) continue
    try {
      const cost = m.cost(s)
      if ((cost.cash ?? 0) > maxCash) continue
      if ((cost.attention ?? 0) > 0 && s.compute.attention < (cost.attention ?? 0)) continue
    } catch {
      continue
    }
    ids.push(m.id)
  }
  return ids
}

/** Recovery / progress rails the player (or fuzz) can always lean on when stuck. */
export function recoveryCommands(s: GameState): Command[] {
  const cmds: Command[] = [
    { type: 'mentorRestock' },
    { type: 'bailout' },
    { type: 'callStarterCrate' },
    { type: 'emergencyDelivery' },
    { type: 'unpack' },
    { type: 'buyWholesale' },
  ]
  for (const inv of s.depth?.invoices ?? []) {
    if (!inv.paid) cmds.push({ type: 'payInvoice', id: inv.id })
  }
  cmds.push({ type: 'writeOffInvoice' })
  return cmds.filter((c) => can(s, c).ok)
}

/** Actions that move the progress metric or unlock the next spine beat. */
export function progressCommands(s: GameState): Command[] {
  const cmds: Command[] = []
  if (can(s, { type: 'unpack' }).ok) cmds.push({ type: 'unpack' })
  if (can(s, { type: 'buyWholesale' }).ok) cmds.push({ type: 'buyWholesale' })
  for (const inv of s.depth?.invoices ?? []) {
    if (!inv.paid && can(s, { type: 'payInvoice', id: inv.id }).ok) {
      cmds.push({ type: 'payInvoice', id: inv.id })
    }
  }
  if (can(s, { type: 'hire', role: 'clerk' }).ok) cmds.push({ type: 'hire', role: 'clerk' })
  for (const id of affordableMemos(s, 200)) cmds.push({ type: 'buyMemo', id })
  for (const c of recoveryCommands(s)) cmds.push(c)
  return cmds
}

export function hasProgressOrRecovery(s: GameState): boolean {
  return progressCommands(s).length > 0 || recoveryCommands(s).length > 0
}

/**
 * Attentive play: unpack, fair price, wholesale when backroom low (if affordable),
 * hire clerk when unlocked+affordable, buy cheap memos.
 * Prioritizes volume → back-office → first Attention fill → lot-survey / side-yard.
 */
export function attentiveCommands(s: GameState): Command[] {
  const cmds: Command[] = []
  const savingForOffice =
    !s.compute.unlocked && s.baskets >= OFFICE_SAVE_BASKETS && !s.memos['back-office']
  const awaitFirstFill = s.compute.unlocked && s.stats.attentionFilled < 1
  const afterFill = s.compute.unlocked && s.stats.attentionFilled >= 1
  const needLot = afterFill && !s.memos['lot-survey']
  const needYard = !!s.memos['lot-survey'] && !s.expansions['side-yard']
  const needLotCap = needLot && attentionCap(s) < LOT_SURVEY_ATTENTION
  // Bank cash for Land spine once Attention is online.
  const landReserve = needLot ? LOT_SURVEY_CASH : needYard ? SIDE_YARD_CASH : 0
  const reserve = savingForOffice ? OFFICE_CASH : landReserve
  const spendable = s.cash - reserve
  const clerks = roleCount(s, 'clerk')

  if (sumQty(s.backroom) > 0) cmds.push({ type: 'unpack' })

  const target = fairPrice(s)
  if (Math.abs(s.price - target) > 0.05) cmds.push({ type: 'setPrice', price: Math.round(target * 100) / 100 })

  // Era depth: feature a can facing early (Era 1 gate).
  pushCansFacing(s, cmds)
  if (s.depth && s.depth.open === false) cmds.push({ type: 'setOpen', open: true })

  // Invoice book — pay due-soon invoices, but keep the land / office reserve.
  {
    const unpaid = (s.depth?.invoices ?? [])
      .filter((i) => !i.paid)
      .sort((a, b) => a.dueAt - b.dueAt)
    let paid = 0
    for (const inv of unpaid) {
      if (paid >= 2) break
      const early = s.time <= inv.dueAt
      const due = inv.amount * (early ? DEPTH.invoiceEarlyDisc : DEPTH.invoiceLateFee)
      // Always protect on-time pays when due within a minute; otherwise respect reserve.
      const urgent = inv.dueAt - s.time < 60
      if (!urgent && spendable < due) continue
      if (can(s, { type: 'payInvoice', id: inv.id }).ok) {
        cmds.push({ type: 'payInvoice', id: inv.id })
        paid += 1
      }
    }
  }

  // Serve waiting regulars; match their facing when needed.
  pushRegularsAndDock(s, cmds)

  // Shift board: park first hire on Open; keep a receiver on a board so dock check-ins stay legal.
  pushShiftBoard(s, cmds)

  // Desk first once affordable — before hire/wholesale eat the reserve.
  if (can(s, { type: 'buyMemo', id: 'back-office' }).ok) {
    cmds.push({ type: 'buyMemo', id: 'back-office' })
  }

  // Bank Reputation for Incorporate — Continue Horizon needs a board agenda.
  if (!s.incorporated && s.era >= 2 && can(s, { type: 'incorporate' }).ok) {
    cmds.push({ type: 'incorporate' })
  }

  // Hold starting Reputation for Archives (lot-survey needs cap ≥ 5000). First fill with 1 Analyst is fine.
  // After fill: Archives until lot-survey is buyable, then Analysts.
  if (afterFill) {
    if (needLotCap && can(s, { type: 'buyArchive' }).ok) {
      cmds.push({ type: 'buyArchive' })
    } else if (!needLot && can(s, { type: 'buyArchive' }).ok && attentionCap(s) < LOT_SURVEY_ATTENTION * 2) {
      cmds.push({ type: 'buyArchive' })
    }
    if (!needLotCap && can(s, { type: 'buyAnalyst' }).ok) {
      cmds.push({ type: 'buyAnalyst' })
    }
  }

  // Land spine — buy as soon as affordable after Attention unlock.
  if (needLot && can(s, { type: 'buyMemo', id: 'lot-survey' }).ok) {
    cmds.push({ type: 'buyMemo', id: 'lot-survey' })
  }
  if (
    (s.memos['lot-survey'] || s.menus.land) &&
    can(s, { type: 'expandLot', id: 'side-yard' }).ok &&
    s.cash >= SIDE_YARD_CASH
  ) {
    cmds.push({ type: 'expandLot', id: 'side-yard' })
  } else if (can(s, { type: 'expandSideYard' }).ok && s.cash >= SIDE_YARD_CASH) {
    cmds.push({ type: 'expandSideYard' })
  }

  // While Archives are still short of lot-survey, spend Attention on growth (refills before the buy).
  // Once cap ≥ 5000, bank a full bar for lot-survey — do not touch Attention.
  if (needLotCap) {
    for (const id of ['pallet-jack', 'weekly-circular', 'radio-spot']) {
      if (can(s, { type: 'buyMemo', id }).ok && spendable >= 0) {
        try {
          const m = MEMOS.find((x) => x.id === id)
          const cashNeed = m?.cost(s).cash ?? 0
          if (spendable < cashNeed) continue
        } catch {
          continue
        }
        cmds.push({ type: 'buyMemo', id })
      }
    }
  }

  const back = sumQty(s.backroom)
  const shelf = sumQty(s.shelf)
  const pending = s.orders.reduce((n, o) => n + o.qty, 0)
  const crate = crateCost(s, s.orderCat)
  const tip = Number.isFinite(s.wholesale.tipIndex) ? s.wholesale.tipIndex : s.wholesale.index
  const onDip = s.wholesale.index <= tip * DEPTH.marketBellIndex

  const vm = valueMul(s)
  const buyBelow = Math.max(BACKROOM_BUY_BELOW, Math.ceil(unpackPerSec(s) * 45))
  // Prefer Market Bell dips (need 3 for Era 1). Hold orders if an invoice is near due.
  const needBells = (s.depth?.marketBellDips ?? 0) < DEPTH.marketBellNeed
  const invoicePressure = (s.depth?.invoices ?? []).some(
    (i) => !i.paid && i.dueAt - s.time < 45 && s.cash < i.amount * DEPTH.invoiceEarlyDisc,
  )
  if (!invoicePressure) {
    if (
      onDip &&
      (needBells || back + pending <= buyBelow * 1.5) &&
      crate <= MAX_REASONABLE_CRATE * vm &&
      can(s, { type: 'buyWholesale' }).ok
    ) {
      cmds.push({ type: 'buyWholesale' })
    } else if (
      !needBells &&
      back + pending <= buyBelow &&
      crate <= MAX_REASONABLE_CRATE * vm &&
      can(s, { type: 'buyWholesale' }).ok
    ) {
      cmds.push({ type: 'buyWholesale' })
    } else if (back + shelf + pending <= 0 && can(s, { type: 'buyWholesale' }).ok) {
      cmds.push({ type: 'buyWholesale' })
    }
  }

  // Demand memos early — chalkboard/flyer feed the basket race.
  for (const id of ['chalkboard', 'help-wanted', 'box-cutter', 'hand-truck']) {
    if (can(s, { type: 'buyMemo', id }).ok && spendable >= 20) {
      cmds.push({ type: 'buyMemo', id })
    }
  }

  // Cap headcount while banking for the desk so wages don't eat the $80.
  // After Attention: clerks for unpack + cashiers for checkout (base cap is only 1/s).
  const clerkCap = afterFill ? 10 : s.compute.unlocked ? 8 : savingForOffice ? CLERKS_BEFORE_OFFICE : 5
  const cashierCap = afterFill ? 4 : 0
  if (can(s, { type: 'buyMemo', id: 'help-wanted' }).ok && spendable >= hireCost(s, 'clerk') + 10) {
    cmds.push({ type: 'buyMemo', id: 'help-wanted' })
  }
  // First hire: receiver or clerk (both clear the Era 1 hire gate once facing is set).
  if (
    s.staff.length === 0 &&
    can(s, { type: 'hire', role: 'receiver' }).ok &&
    spendable >= hireCost(s, 'receiver') + crate * 0.35
  ) {
    cmds.push({ type: 'hire', role: 'receiver' })
  } else if (
    clerks < clerkCap &&
    can(s, { type: 'hire', role: 'clerk' }).ok &&
    spendable >= hireCost(s, 'clerk') + crate * 0.35
  ) {
    cmds.push({ type: 'hire', role: 'clerk' })
  }
  // Era 1 Fresh spine: produce → write-offs ×3 → produceLead → dairy → planogram.
  if (s.era >= 1) {
    if (!s.categories.produce && can(s, { type: 'buyMemo', id: 'produce-crates' }).ok) {
      cmds.push({ type: 'buyMemo', id: 'produce-crates' })
    }
    if (s.categories.produce && (s.depth?.writeOffs ?? 0) < DEPTH.writeOffNeedEra2) {
      if (s.orderCat !== 'produce' && can(s, { type: 'setOrderCat', cat: 'produce' }).ok) {
        cmds.push({ type: 'setOrderCat', cat: 'produce' })
      }
      const produceStock = sumQty(s.backroom, 'produce') + sumQty(s.shelf, 'produce')
      if (produceStock <= 0 && can(s, { type: 'buyWholesale', cat: 'produce' }).ok) {
        cmds.push({ type: 'buyWholesale', cat: 'produce', crates: 1 })
      }
      if (can(s, { type: 'morningWriteOff', mode: 'dump' }).ok) {
        cmds.push({ type: 'morningWriteOff', mode: 'dump' })
      }
    }
    if (
      roleCount(s, 'produceLead') < 1 &&
      can(s, { type: 'hire', role: 'produceLead' }).ok &&
      spendable >= hireCost(s, 'produceLead') + crate * 0.35
    ) {
      cmds.push({ type: 'hire', role: 'produceLead' })
    }
    // Dairy path: reach-in → cold build → dairy-case.
    if (!s.categories.dairy) {
      if (can(s, { type: 'buyMemo', id: 'reach-in' }).ok) cmds.push({ type: 'buyMemo', id: 'reach-in' })
      if ((s.builds.cold ?? 0) < 1 && can(s, { type: 'buyBuild', track: 'cold' }).ok && spendable >= 150) {
        cmds.push({ type: 'buyBuild', track: 'cold' })
      }
      if (can(s, { type: 'buyMemo', id: 'dairy-case' }).ok && spendable >= 150) {
        cmds.push({ type: 'buyMemo', id: 'dairy-case' })
      }
    }
    // Flagship planogram practice + credit; Produce Lead on Open (side-yard shift gate).
    pushFlagshipAndLeadShift(s, cmds)
  }
  if (
    afterFill &&
    roleCount(s, 'cashier') < cashierCap &&
    can(s, { type: 'hire', role: 'cashier' }).ok &&
    spendable >= hireCost(s, 'cashier') + crate * 0.35
  ) {
    cmds.push({ type: 'hire', role: 'cashier' })
  }
  if (afterFill && s.hours < 1.2 && can(s, { type: 'setHours', hours: 1.2 }).ok) {
    cmds.push({ type: 'setHours', hours: 1.2 })
  }

  // Spine memos (lot-survey handled above with land reserve).
  for (const id of ['produce-crates', 'flyer', 'upgrades-binder']) {
    if (!can(s, { type: 'buyMemo', id }).ok) continue
    if (savingForOffice || landReserve > 0) {
      try {
        const m = MEMOS.find((x) => x.id === id)
        const cashNeed = m?.cost(s).cash ?? 0
        if (spendable < cashNeed) continue
      } catch {
        continue
      }
    }
    cmds.push({ type: 'buyMemo', id })
  }

  // Flavor / cheap memos — never burn Attention while banking a full bar for lot-survey.
  const memoCashCap = savingForOffice
    ? Math.min(CHEAP_MEMO_CASH, Math.max(0, spendable))
    : needLot || needYard
      ? Math.min(40, Math.max(0, spendable))
      : CHEAP_MEMO_CASH
  for (const id of affordableMemos(s, memoCashCap)) {
    if (cmds.some((c) => c.type === 'buyMemo' && c.id === id)) continue
    try {
      const m = MEMOS.find((x) => x.id === id)
      const cost = m?.cost(s)
      // Block Attention spends once cap can hold lot-survey (needLot && !needLotCap).
      if ((cost?.attention ?? 0) > 0 && (s.stats.attentionFilled < 1 || (needLot && !needLotCap))) continue
      if ((savingForOffice || landReserve > 0) && (cost?.cash ?? 0) > spendable) continue
    } catch {
      continue
    }
    cmds.push({ type: 'buyMemo', id })
  }

  const adBudget = needYard ? SIDE_YARD_CASH : needLot ? LOT_SURVEY_CASH : 0
  if (
    !savingForOffice &&
    can(s, { type: 'buyAd' }).ok &&
    s.cash - adBudget > s.adCost * 1.5 + 20 &&
    s.ads < (afterFill ? 12 : 6)
  ) {
    cmds.push({ type: 'buyAd' })
  }

  // Keep recovery available if dry and broke.
  if (stockUnits(s) <= 0 && s.orders.length === 0) {
    for (const c of recoveryCommands(s)) cmds.push(c)
  }

  return cmds
}

/** Always overprices; still unpacks / restocks / uses recovery so rails can fire. */
export function badPriceCommands(s: GameState): Command[] {
  const cmds: Command[] = [{ type: 'setPrice', price: 8 }]
  if (sumQty(s.backroom) > 0) cmds.push({ type: 'unpack' })
  if (stockUnits(s) + s.orders.reduce((n, o) => n + o.qty, 0) <= BACKROOM_BUY_BELOW) {
    if (can(s, { type: 'buyWholesale' }).ok) cmds.push({ type: 'buyWholesale' })
  }
  if (can(s, { type: 'buyMemo', id: 'help-wanted' }).ok) cmds.push({ type: 'buyMemo', id: 'help-wanted' })
  if (can(s, { type: 'hire', role: 'clerk' }).ok) cmds.push({ type: 'hire', role: 'clerk' })
  for (const c of recoveryCommands(s)) cmds.push(c)
  return cmds
}

export function trackGates(s: GameState, gates: NonNullable<BotResult['gates']>) {
  if (gates.clerkAt === undefined && s.staff.some((m) => m.role === 'clerk')) gates.clerkAt = s.time
  if (gates.produceAt === undefined && s.categories.produce) gates.produceAt = s.time
  if (gates.attentionAt === undefined && s.stats.attentionFilled >= 1) gates.attentionAt = s.time
  if (gates.lotAt === undefined && (s.memos['lot-survey'] || s.expansions['side-yard'] || s.menus.land)) {
    gates.lotAt = s.time
  }
}

export function runLoop(
  name: string,
  seed: number,
  seconds: number,
  pickCmds: (s: GameState) => Command[],
  dt = 1,
): BotResult {
  const s = createInitialState(seed)
  s.paused = false
  const gates: NonNullable<BotResult['gates']> = {}
  const steps = Math.max(1, Math.ceil(seconds / dt))
  for (let i = 0; i < steps; i++) {
    for (const cmd of pickCmds(s)) run(s, cmd)
    applyTick(s, dt)
    trackGates(s, gates)
  }
  repair(s)
  const ok = Number.isFinite(s.cash) && s.cash >= 0 && (s.stats.sold > 0 || s.stats.bailouts > 0 || s.stats.helperCrates > 0)
  return {
    name,
    ok,
    detail: `t=${s.time.toFixed(0)}s sold=${s.stats.sold} cash=${s.cash.toFixed(2)} baskets=${s.baskets} staff=${s.staff.length} produce=${s.categories.produce} attFilled=${s.stats.attentionFilled} memos=${s.stats.memosDone}`,
    final: s,
    gates,
  }
}

/** Attentive bot — primary Era 0–1 balance gates. */
export function attentiveBot(seed: number, seconds: number, dt = 1): BotResult {
  return runLoop('attentive', seed, seconds, attentiveCommands, dt)
}

/** Always $8; must still progress via sales or recovery rails. */
export function badPriceBot(seed: number, seconds: number, dt = 1): BotResult {
  return runLoop('badPrice', seed, seconds, badPriceCommands, dt)
}

/** @deprecated Prefer attentiveBot — kept for sim.test.ts compatibility. */
export function runAttentiveLoop(seed: number, seconds: number): BotResult {
  return attentiveBot(seed, seconds, 1)
}

export function runBotStub(name: string): BotResult {
  return { name, ok: true, detail: 'stub — not executed' }
}

/** Candidate legal commands for fuzz (subset of Command surface that is safe to spam). */
export function legalCommands(s: GameState): Command[] {
  const out: Command[] = []
  const tryAdd = (cmd: Command) => {
    if (can(s, cmd).ok) out.push(cmd)
  }

  tryAdd({ type: 'unpack' })
  for (const p of [0.5, 1, 1.5, 2, 3, 5, 8]) tryAdd({ type: 'setPrice', price: p })
  tryAdd({ type: 'buyWholesale' })
  tryAdd({ type: 'buyWholesale', crates: 2 })
  tryAdd({ type: 'setSupplier', supplier: 'a' })
  tryAdd({ type: 'setSupplier', supplier: 'b' })
  for (const inv of s.depth?.invoices ?? []) {
    if (!inv.paid) tryAdd({ type: 'payInvoice', id: inv.id })
  }
  tryAdd({ type: 'writeOffInvoice' })
  tryAdd({ type: 'serveRegular' })
  tryAdd({ type: 'dockCheckIn' })
  tryAdd({ type: 'fileStandardFlagship' })
  for (const m of s.staff) {
    tryAdd({ type: 'assignShift', slot: 'open', staffId: m.id })
    tryAdd({ type: 'assignShift', slot: 'mid', staffId: m.id })
    tryAdd({ type: 'assignShift', slot: 'close', staffId: m.id })
  }
  for (const role of ROLE_IDS) tryAdd({ type: 'hire', role: role as RoleId })
  for (const m of s.staff) tryAdd({ type: 'fire', id: m.id })
  tryAdd({ type: 'buyAd' })
  tryAdd({ type: 'refundAd' })
  for (const h of [0.5, 1, 1.2, 1.5]) tryAdd({ type: 'setHours', hours: h })
  tryAdd({ type: 'orderPizza' })
  tryAdd({ type: 'callInspector' })
  tryAdd({ type: 'matchCoupons' })
  tryAdd({ type: 'answerRival' })
  tryAdd({ type: 'dumpCooler' })
  for (const m of MEMOS) tryAdd({ type: 'buyMemo', id: m.id })
  for (const id of Object.keys(UPGRADE_BY_ID)) tryAdd({ type: 'buyUpgrade', id })
  for (const id of BUILD_FILTERS) tryAdd({ type: 'buyBuild', track: id })
  tryAdd({ type: 'buyEndcap' })
  tryAdd({ type: 'sellEndcap' })
  tryAdd({ type: 'mentorRestock' })
  tryAdd({ type: 'bailout' })
  tryAdd({ type: 'callStarterCrate' })
  tryAdd({ type: 'emergencyDelivery' })
  tryAdd({ type: 'expandLot', id: 'side-yard' })
  tryAdd({ type: 'expandSideYard' })
  tryAdd({ type: 'acceptChapter' })
  tryAdd({ type: 'buyAnalyst' })
  tryAdd({ type: 'buyArchive' })
  tryAdd({ type: 'toggleIdeas' })
  tryAdd({ type: 'redeemLoyalty' })
  tryAdd({ type: 'dismissOfflineReceipt' })
  if (s.tutorials.active) {
    tryAdd({ type: 'completeTutorialStep' })
    tryAdd({ type: 'doTutorialForMe' })
    tryAdd({ type: 'skipTutorial' })
  }
  return out
}

export interface FuzzResult {
  name: string
  ok: boolean
  detail: string
  final: GameState
  ticks: number
}

/**
 * Random legal commands for N ticks. Asserts progress/recovery always available,
 * cash stays finite, and repair() keeps invariants.
 */
export function fuzzBot(seed: number, ticks: number, dt = 1): FuzzResult {
  const s = createInitialState(seed)
  s.paused = false
  let softlocks = 0
  for (let i = 0; i < ticks; i++) {
    const legal = legalCommands(s)
    if (legal.length === 0 || !hasProgressOrRecovery(s)) softlocks += 1
    if (legal.length > 0) {
      const cmd = legal[Math.floor(nextRng(s) * legal.length) % legal.length]
      run(s, cmd)
    }
    applyTick(s, dt)
    repair(s)
    if (!Number.isFinite(s.cash) || s.cash < 0) {
      return {
        name: 'fuzz',
        ok: false,
        detail: `NaN/negative cash at tick ${i}: cash=${s.cash}`,
        final: s,
        ticks: i + 1,
      }
    }
  }
  const ok = softlocks === 0 && Number.isFinite(s.cash) && s.cash >= 0
  return {
    name: 'fuzz',
    ok,
    detail: `ticks=${ticks} softlocks=${softlocks} cash=${s.cash.toFixed(2)} sold=${s.stats.sold} metric=${progressMetric(s).toFixed(1)}`,
    final: s,
    ticks,
  }
}

// ── Campaign bot (2.0 pacing gate) ───────────────────────────────────────────

/** Era → first sim-second reached. Used by pacing.test.ts. */
export type EraTimes = Record<number, number>

export interface PacingResult {
  eraAt: EraTimes
  final: GameState
  samples: { t: number; era: number; empire: number; cash: number; revPerSec: number; goal: string }[]
}

/** True if cmd is affordable while keeping `reserve` cash untouched. */
export function canWithin(s: GameState, cmd: Command, reserve: number): boolean {
  if (reserve <= 0) return can(s, cmd).ok
  const cash = s.cash
  s.cash = Math.max(0, cash - reserve)
  const ok = can(s, cmd).ok
  s.cash = cash
  return ok
}

export const LATE_VERBS: Command[] = [
  { type: 'buildDepot' },
  { type: 'incorporate' },
  { type: 'openStore' },
  { type: 'buyPlant', kind: 'blast' },
  { type: 'buyPlant', kind: 'tunnel' },
  { type: 'buyPlant', kind: 'compressor' },
  { type: 'buyTank' },
  { type: 'hireLobby' },
  { type: 'passBill', id: 'hours' },
  { type: 'passBill', id: 'waste' },
  { type: 'passBill', id: 'labor' },
  { type: 'passBill', id: 'tax' },
  { type: 'acquireRegion' },
  { type: 'openLane', route: 'spice-route' },
  { type: 'openLane', route: 'cold-line' },
  { type: 'openLane', route: 'dry-haul' },
  { type: 'openFranchise' },
  { type: 'launchBarge', class: 'hauler' },
  { type: 'launchBarge', class: 'replicator' },
  { type: 'buyEndcap' },
]

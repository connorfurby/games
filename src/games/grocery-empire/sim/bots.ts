import { goalCash, goalNeeds, nextGoal } from '../content/goals'
import {
  REGULAR_BY_ID,
  STORE_TRAIT_BY_ID,
  policyMatchesTrait,
  type PlaceTraitId,
} from '../content/depth'
import { RIVALS } from '../content/rivals'
import { MEMOS } from '../content/memos'
import { PERK_BY_ID } from '../content/perks'
import { PROJECTS } from '../content/projects'
import { ROLE_IDS, type RoleId } from '../content/staff'
import { UPGRADE_BY_ID } from '../content/upgrades'
import { BUILD_FILTERS } from '../content/builds'
import { can, run, type Command } from './commands'
import { CAPITAL, DEPTH, HORIZON } from './balance'
import { attentionCap, bestPrice, crateCost, hireCost, roleCount, unpackPerSec } from './formulas'
import { valueMul } from './systems/network'
import { sumQty } from './helpers'
import { repair } from './invariants'
import { nextRng } from './rng'
import { createInitialState, type GameState } from './state'
import { progressMetric } from './systems/recovery'
import { applyTick } from './tick'

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

function stockUnits(s: GameState): number {
  return sumQty(s.backroom) + sumQty(s.shelf)
}

function fairPrice(s: GameState): number {
  // Volume-first through Attention unlock; then nudge toward bestPrice.
  if (s.baskets < VOLUME_BASKETS) return 1.25
  const tip = bestPrice(s)
  if (s.cash < 40) return 1.35
  return Math.min(2.5, Math.max(1.2, tip * 0.85))
}

function affordableMemos(s: GameState, maxCash = CHEAP_MEMO_CASH): string[] {
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
  if (!s.depth?.facings?.cans && can(s, { type: 'setFacing', cat: 'cans', facingId: 'tomatoes' }).ok) {
    cmds.push({ type: 'setFacing', cat: 'cans', facingId: 'tomatoes' })
  }
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
  if (s.depth?.regulars?.activeId) {
    const reg = REGULAR_BY_ID[s.depth.regulars.activeId]
    if (reg?.facingId) {
      for (const cat of reg.wants) {
        if (s.depth.facings?.[cat] === reg.facingId) break
        const c: Command = { type: 'setFacing', cat, facingId: reg.facingId }
        if (can(s, c).ok) {
          cmds.push(c)
          break
        }
      }
    }
    if (can(s, { type: 'serveRegular' }).ok) cmds.push({ type: 'serveRegular' })
  }
  if (can(s, { type: 'dockCheckIn' }).ok) cmds.push({ type: 'dockCheckIn' })

  // Shift board: park first hire on Open.
  if (s.staff.length > 0 && (s.depth?.shifts?.open?.length ?? 0) === 0) {
    const id = s.staff[0]!.id
    if (can(s, { type: 'assignShift', slot: 'open', staffId: id }).ok) {
      cmds.push({ type: 'assignShift', slot: 'open', staffId: id })
    }
  }
  // Keep a receiver on a board so dock check-ins stay legal.
  if (s.era >= 1) {
    const receiver = s.staff.find((m) => m.role === 'receiver')
    if (receiver) {
      const onBoard = DEPTH.shiftSlots.some((slot) => (s.depth?.shifts?.[slot] ?? []).includes(receiver.id))
      if (!onBoard && can(s, { type: 'assignShift', slot: 'open', staffId: receiver.id }).ok) {
        cmds.push({ type: 'assignShift', slot: 'open', staffId: receiver.id })
      }
    } else if (can(s, { type: 'hire', role: 'receiver' }).ok) {
      cmds.push({ type: 'hire', role: 'receiver' })
    }
  }

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
    // Flagship planogram practice + credit.
    if (!s.depth?.flagship?.credited && can(s, { type: 'fileStandardFlagship' }).ok) {
      cmds.push({ type: 'fileStandardFlagship' })
    }
    // Produce Lead on Open (side-yard shift gate).
    const lead = s.staff.find((m) => m.role === 'produceLead')
    if (lead && !(s.depth?.shifts?.open ?? []).includes(lead.id)) {
      if (can(s, { type: 'assignShift', slot: 'open', staffId: lead.id }).ok) {
        cmds.push({ type: 'assignShift', slot: 'open', staffId: lead.id })
      }
    }
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

function trackGates(s: GameState, gates: NonNullable<BotResult['gates']>) {
  if (gates.clerkAt === undefined && s.staff.some((m) => m.role === 'clerk')) gates.clerkAt = s.time
  if (gates.produceAt === undefined && s.categories.produce) gates.produceAt = s.time
  if (gates.attentionAt === undefined && s.stats.attentionFilled >= 1) gates.attentionAt = s.time
  if (gates.lotAt === undefined && (s.memos['lot-survey'] || s.expansions['side-yard'] || s.menus.land)) {
    gates.lotAt = s.time
  }
}

function runLoop(
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
function canWithin(s: GameState, cmd: Command, reserve: number): boolean {
  if (reserve <= 0) return can(s, cmd).ok
  const cash = s.cash
  s.cash = Math.max(0, cash - reserve)
  const ok = can(s, cmd).ok
  s.cash = cash
  return ok
}

const LATE_VERBS: Command[] = [
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

/**
 * Plays like a steady casual player: keeps the floor stocked, saves for the next
 * campaign goal, and spends the surplus on whatever is affordable.
 */
export function campaignCommands(s: GameState, step: number): Command[] {
  const goal = nextGoal(s)
  const holdAtt = goalNeeds(s, goal).attention > 0
  const cmds: Command[] = [...recoveryCommands(s), ...attentiveCommands(s)].filter(
    (c) => !holdAtt || !(c.type === 'buyMemo' || c.type === 'pulseScanner' || c.type === 'runTournament'),
  )
  // Incorporate early so Era 6 Continue can resolve a board agenda.
  if (!s.incorporated && s.era >= 2 && can(s, { type: 'incorporate' }).ok) {
    cmds.push({ type: 'incorporate' })
  }
  // Depth verbs every tick so Era 0–1 gates don't stall between 5s samples.
  if (!s.depth?.facings?.cans && can(s, { type: 'setFacing', cat: 'cans', facingId: 'tomatoes' }).ok) {
    cmds.push({ type: 'setFacing', cat: 'cans', facingId: 'tomatoes' })
  }
  {
    const unpaid = [...(s.depth?.invoices ?? [])].filter((i) => !i.paid).sort((a, b) => a.dueAt - b.dueAt)
    let paid = 0
    for (const inv of unpaid) {
      if (paid >= 2) break
      if (can(s, { type: 'payInvoice', id: inv.id }).ok) {
        cmds.push({ type: 'payInvoice', id: inv.id })
        paid += 1
      }
    }
  }
  if (s.depth?.regulars?.activeId) {
    const reg = REGULAR_BY_ID[s.depth.regulars.activeId]
    if (reg?.facingId) {
      for (const cat of reg.wants) {
        if (s.depth.facings?.[cat] === reg.facingId) break
        const c: Command = { type: 'setFacing', cat, facingId: reg.facingId }
        if (can(s, c).ok) {
          cmds.push(c)
          break
        }
      }
    }
    if (can(s, { type: 'serveRegular' }).ok) cmds.push({ type: 'serveRegular' })
  }
  if (can(s, { type: 'dockCheckIn' }).ok) cmds.push({ type: 'dockCheckIn' })
  if (s.staff.length > 0 && (s.depth?.shifts?.open?.length ?? 0) === 0) {
    const id = s.staff[0]!.id
    if (can(s, { type: 'assignShift', slot: 'open', staffId: id }).ok) {
      cmds.push({ type: 'assignShift', slot: 'open', staffId: id })
    }
  }
  if (s.era >= 1) {
    const receiver = s.staff.find((m) => m.role === 'receiver')
    if (receiver) {
      const onBoard = DEPTH.shiftSlots.some((slot) => (s.depth?.shifts?.[slot] ?? []).includes(receiver.id))
      if (!onBoard && can(s, { type: 'assignShift', slot: 'open', staffId: receiver.id }).ok) {
        cmds.push({ type: 'assignShift', slot: 'open', staffId: receiver.id })
      }
    } else if (can(s, { type: 'hire', role: 'receiver' }).ok) {
      cmds.push({ type: 'hire', role: 'receiver' })
    }
  }
  // Chase Market Bell dips until we have 3.
  if ((s.depth?.marketBellDips ?? 0) < DEPTH.marketBellNeed) {
    const tip = Number.isFinite(s.wholesale.tipIndex) ? s.wholesale.tipIndex : s.wholesale.index
    if (s.wholesale.index <= tip * DEPTH.marketBellIndex && can(s, { type: 'buyWholesale' }).ok) {
      cmds.push({ type: 'buyWholesale' })
    }
  }
  if (s.era >= 1) {
    if (!s.categories.produce && can(s, { type: 'buyMemo', id: 'produce-crates' }).ok) {
      cmds.push({ type: 'buyMemo', id: 'produce-crates' })
    }
    if (s.categories.produce && (s.depth?.writeOffs ?? 0) < DEPTH.writeOffNeedEra2) {
      if (s.orderCat !== 'produce') cmds.push({ type: 'setOrderCat', cat: 'produce' })
      if (
        sumQty(s.backroom, 'produce') + sumQty(s.shelf, 'produce') <= 0 &&
        can(s, { type: 'buyWholesale', cat: 'produce' }).ok
      ) {
        cmds.push({ type: 'buyWholesale', cat: 'produce', crates: 1 })
      }
      if (can(s, { type: 'morningWriteOff', mode: 'dump' }).ok) {
        cmds.push({ type: 'morningWriteOff', mode: 'dump' })
      }
    }
    if (roleCount(s, 'produceLead') < 1 && can(s, { type: 'hire', role: 'produceLead' }).ok) {
      cmds.push({ type: 'hire', role: 'produceLead' })
    }
    if (!s.categories.dairy) {
      if (can(s, { type: 'buyMemo', id: 'reach-in' }).ok) cmds.push({ type: 'buyMemo', id: 'reach-in' })
      if ((s.builds.cold ?? 0) < 1 && can(s, { type: 'buyBuild', track: 'cold' }).ok) {
        cmds.push({ type: 'buyBuild', track: 'cold' })
      }
      if (can(s, { type: 'buyMemo', id: 'dairy-case' }).ok) cmds.push({ type: 'buyMemo', id: 'dairy-case' })
    }
    if (!s.depth?.flagship?.credited && can(s, { type: 'fileStandardFlagship' }).ok) {
      cmds.push({ type: 'fileStandardFlagship' })
    }
    const lead = s.staff.find((m) => m.role === 'produceLead')
    if (lead && !(s.depth?.shifts?.open ?? []).includes(lead.id)) {
      if (can(s, { type: 'assignShift', slot: 'open', staffId: lead.id }).ok) {
        cmds.push({ type: 'assignShift', slot: 'open', staffId: lead.id })
      }
    }
  }
  // Era 2 depth: match traits, flyer weeks, commissary, clear Penny locks / counter-flyer.
  if (s.era >= 2) {
    if (s.depth?.rivalLockCat) {
      const cat = s.depth.rivalLockCat
      const facings = ['tomatoes', 'beans', 'soup', 'apples', 'greens', 'roots', 'milk', 'yogurt', 'cheese']
      for (const id of facings) {
        const c: Command = { type: 'setFacing', cat, facingId: id }
        if (can(s, c).ok) {
          cmds.push(c)
          break
        }
      }
      if (can(s, { type: 'setMarketingPosture', posture: 'circular' }).ok) {
        cmds.push({ type: 'setMarketingPosture', posture: 'circular' })
      } else if (can(s, { type: 'priceWar', id: 'penny' }).ok) {
        cmds.push({ type: 'priceWar', id: 'penny' })
      }
    }
    const needFlyer =
      s.depth?.counterFlyerNeeded ||
      (s.depth?.flyerWeeks ?? 0) < DEPTH.flyerWeeksNeed
    if (needFlyer) {
      const cats = (['cans', 'produce', 'dairy', 'household', 'bakery', 'deli'] as const).filter(
        (c) => s.categories[c],
      )
      if (cats.length >= 2) {
        const c: Command = {
          type: 'printFlyerWeek',
          aisles: [cats[0]!, cats[1]!],
          discountBand: 'mid',
          promise: 'hours',
        }
        if (can(s, c).ok) cmds.push(c)
      }
    }
    // Match every door to its trait (cold-permit hard gate).
    for (const st of s.stores) {
      const trait = s.depth?.placeTraits?.[st.id]
      if (!trait) continue
      const def = STORE_TRAIT_BY_ID[trait as PlaceTraitId]
      if (!def || policyMatchesTrait(st.policy, trait)) continue
      const c: Command = { type: 'setPolicy', storeId: st.id, policy: def.matchPolicies[0]! }
      if (can(s, c).ok) cmds.push(c)
    }
    const hot = s.depth?.blockEvent?.traitBias
    if (hot && (s.depth?.blockEvent?.until ?? 0) > s.time) {
      const hotDef = STORE_TRAIT_BY_ID[hot as PlaceTraitId]
      if (hotDef) {
        for (const st of s.stores) {
          if (policyMatchesTrait(st.policy, hot)) continue
          const c: Command = { type: 'setPolicy', storeId: st.id, policy: hotDef.matchPolicies[0]! }
          if (can(s, c).ok) {
            cmds.push(c)
            break
          }
        }
      }
    }
    if (s.stores.length < DEPTH.matchedStoresNeed && can(s, { type: 'openStore' }).ok) {
      cmds.push({ type: 'openStore' })
    }
    // Deli + bakery then chain planogram refile.
    if (!s.categories.meat && can(s, { type: 'buyMemo', id: 'butcher-block' }).ok) {
      cmds.push({ type: 'buyMemo', id: 'butcher-block' })
    }
    if (s.categories.meat && !s.categories.deli && can(s, { type: 'buyMemo', id: 'deli-case' }).ok) {
      cmds.push({ type: 'buyMemo', id: 'deli-case' })
    }
    if (!s.categories.bakery && can(s, { type: 'buyMemo', id: 'bakery-oven' }).ok) {
      cmds.push({ type: 'buyMemo', id: 'bakery-oven' })
    }
    if (
      s.categories.deli &&
      s.categories.bakery &&
      !s.depth?.flagship?.chainCredited &&
      can(s, { type: 'fileStandardFlagship' }).ok
    ) {
      cmds.push({ type: 'fileStandardFlagship' })
    }
    if (!(s.depth?.contracts && 'commissary' in s.depth.contracts)) {
      if (can(s, { type: 'unlockContract', id: 'commissary' }).ok) {
        cmds.push({ type: 'unlockContract', id: 'commissary' })
      }
    } else if (!s.depth.contracts.commissary && can(s, { type: 'setContract', id: 'commissary', on: true }).ok) {
      cmds.push({ type: 'setContract', id: 'commissary', on: true })
    }
    if (roleCount(s, 'storeManager') < 1 && can(s, { type: 'hire', role: 'storeManager' }).ok) {
      cmds.push({ type: 'hire', role: 'storeManager' })
    }
  }
  if (s.era >= 3) {
    if (roleCount(s, 'plantOperator') < 1 && can(s, { type: 'hire', role: 'plantOperator' }).ok) {
      cmds.push({ type: 'hire', role: 'plantOperator' })
    }
    if ((s.depth?.drillsRun ?? 0) < 1 && can(s, { type: 'runBrownoutDrill' }).ok) {
      cmds.push({ type: 'runBrownoutDrill' })
    }
    // Cooler Log + Shift Board leads (leave gate).
    if (can(s, { type: 'signCoolerLog' }).ok) cmds.push({ type: 'signCoolerLog' })
    const plantOp = s.staff.find((m) => m.role === 'plantOperator')
    if (plantOp) {
      const onBoard = DEPTH.shiftSlots.some((slot) => (s.depth?.shifts?.[slot] ?? []).includes(plantOp.id))
      if (!onBoard && can(s, { type: 'assignShift', slot: 'mid', staffId: plantOp.id }).ok) {
        cmds.push({ type: 'assignShift', slot: 'mid', staffId: plantOp.id })
      }
    }
    const produceLead = s.staff.find((m) => m.role === 'produceLead')
    if (produceLead) {
      const onBoard = DEPTH.shiftSlots.some((slot) =>
        (s.depth?.shifts?.[slot] ?? []).includes(produceLead.id),
      )
      if (!onBoard && can(s, { type: 'assignShift', slot: 'open', staffId: produceLead.id }).ok) {
        cmds.push({ type: 'assignShift', slot: 'open', staffId: produceLead.id })
      }
    }
    if (
      (s.cold.plantList ?? []).filter((p) => p.kind === 'blast').length < 1 &&
      can(s, { type: 'buyPlant', kind: 'blast' }).ok
    ) {
      cmds.push({ type: 'buyPlant', kind: 'blast' })
    }
    if (
      (s.cold.plantList ?? []).filter((p) => p.kind === 'tunnel').length < 1 &&
      can(s, { type: 'buyPlant', kind: 'tunnel' }).ok
    ) {
      cmds.push({ type: 'buyPlant', kind: 'tunnel' })
    }
    // Leave-region path: power blast + tunnel; leave compressor dark when all three exist.
    const kindsOwned = new Set((s.cold.plantList ?? []).map((p) => p.kind))
    if (kindsOwned.has('blast') && kindsOwned.has('tunnel')) {
      const powered = s.cold.poweredKinds ?? []
      const want = ['blast', 'tunnel'] as const
      if (want.some((k) => !powered.includes(k)) || powered.includes('compressor')) {
        const c: Command = { type: 'setPlantPower', kinds: ['blast', 'tunnel'] }
        if (can(s, c).ok) cmds.push(c)
      }
    }
  }
  // Era 4–6 depth: manifests, logistics hires, win-backs, pockets, steward.
  if (s.era >= 4) {
    for (const lane of s.fleet.laneList ?? []) {
      const prefer =
        lane.route === 'spice-route'
          ? 'import'
          : lane.route === 'cold-line'
            ? 'frozen'
            : lane.route === 'dry-haul'
              ? 'household'
              : 'bakery'
      if (s.depth?.manifests?.[lane.id] !== prefer) {
        const c: Command = { type: 'setManifest', laneId: lane.id, mix: prefer }
        if (can(s, c).ok) cmds.push(c)
      } else if (
        (s.depth?.dispatch?.cleanManifests ?? 0) < DEPTH.cleanManifestsNeed &&
        can(s, { type: 'setManifest', laneId: lane.id, mix: prefer }).ok
      ) {
        // Re-file when the dispatch cycle is ready to earn another clean credit.
        cmds.push({ type: 'setManifest', laneId: lane.id, mix: prefer })
      }
      if (can(s, { type: 'swearExam' }).ok) cmds.push({ type: 'swearExam' })
    }
    if (can(s, { type: 'stampLedger' }).ok) cmds.push({ type: 'stampLedger' })
    if (roleCount(s, 'dispatcher') < 1 && can(s, { type: 'hire', role: 'dispatcher' }).ok) {
      cmds.push({ type: 'hire', role: 'dispatcher' })
    } else if (roleCount(s, 'purser') < 1 && can(s, { type: 'hire', role: 'purser' }).ok) {
      cmds.push({ type: 'hire', role: 'purser' })
    }
    const defected = s.fleet.franchiseList?.find((f) => f.defected)
    if (defected && can(s, { type: 'winBackFranchise', franchiseId: defected.id }).ok) {
      cmds.push({ type: 'winBackFranchise', franchiseId: defected.id })
    }
    if (!(s.depth?.contracts && 'portBroker' in s.depth.contracts)) {
      if (can(s, { type: 'unlockContract', id: 'portBroker' }).ok) {
        cmds.push({ type: 'unlockContract', id: 'portBroker' })
      }
    } else if (!s.depth.contracts.portBroker && can(s, { type: 'setContract', id: 'portBroker', on: true }).ok) {
      cmds.push({ type: 'setContract', id: 'portBroker', on: true })
    }
    if (
      s.categories.import &&
      !s.depth?.flagship?.globeCredited &&
      can(s, { type: 'fileStandardFlagship' }).ok
    ) {
      cmds.push({ type: 'fileStandardFlagship' })
    }
    if ((s.fleet.franchiseList?.length ?? 0) < 1 && can(s, { type: 'openFranchise' }).ok) {
      cmds.push({ type: 'openFranchise' })
    }
  }
  if (s.era >= 5) {
    if (roleCount(s, 'pilot') < 1 && can(s, { type: 'hire', role: 'pilot' }).ok) {
      cmds.push({ type: 'hire', role: 'pilot' })
    }
    // Orbit on Mid — Era 6 gate.
    const orbitStaff =
      s.staff.find((m) => m.role === 'pilot') ??
      s.staff.find((m) => m.role === 'steward') ??
      s.staff.find((m) => m.role === 'hullTech')
    if (
      orbitStaff &&
      !s.depth?.orbitMidOnce &&
      !(s.depth?.shifts?.mid ?? []).includes(orbitStaff.id) &&
      can(s, { type: 'assignShift', slot: 'mid', staffId: orbitStaff.id }).ok
    ) {
      cmds.push({ type: 'assignShift', slot: 'mid', staffId: orbitStaff.id })
    }
    if (s.categories.ration && !s.depth?.facings?.ration) {
      const c: Command = { type: 'setFacing', cat: 'ration', facingId: 'standard-pack' }
      if (can(s, c).ok) cmds.push(c)
    }
    if ((s.depth?.driftWar?.step ?? 0) < 3 && s.fleet.warOn) {
      if (can(s, { type: 'advanceDriftWar' }).ok) cmds.push({ type: 'advanceDriftWar' })
    } else if (s.fleet.launched && !s.fleet.warOn && can(s, { type: 'startDriftWar' }).ok) {
      cmds.push({ type: 'startDriftWar' })
    }
    // Pocket Ops: one en-route trip at a time (human parallel path is faster).
    const enroute = (s.fleet.trips ?? []).filter((t) => t.status === 'enroute')
    if (enroute.length === 0) {
      const openPockets = (s.fleet.pockets ?? []).filter((p) => p.left > 0)
      const busy = new Set(enroute.map((t) => t.bargeId))
      const h = (s.fleet.bargeList ?? []).find((b) => b.class === 'hauler' && !busy.has(b.id))
      const pocket =
        (h?.ration ? openPockets.find((p) => p.ration === h.ration) : undefined) ?? openPockets[0]
      if (h && pocket) {
        const c: Command = {
          type: 'dispatchHauler',
          bargeId: h.id,
          pocketId: pocket.id,
          loadRation: pocket.ration,
        }
        if (can(s, c).ok) cmds.push(c)
      }
    }
  }
  if (s.era >= 6) {
    if (s.depth?.stewardId == null) {
      const lead =
        s.staff.find((m) => m.role === 'steward') ??
        s.staff.find((m) => m.role === 'pilot') ??
        s.staff.find((m) => m.role === 'storeManager')
      if (lead && can(s, { type: 'promoteSteward', staffId: lead.id }).ok) {
        cmds.push({ type: 'promoteSteward', staffId: lead.id })
      } else if (can(s, { type: 'hire', role: 'steward' }).ok) {
        cmds.push({ type: 'hire', role: 'steward' })
      }
    }
    // Continue Horizon needs Incorporate → board agenda → steward.
    if (!s.incorporated && can(s, { type: 'incorporate' }).ok) {
      cmds.push({ type: 'incorporate' })
    }
    if (
      s.incorporated &&
      (s.stats.boardMeetings ?? 0) < 1 &&
      !(s.board.lastResolvedAt > 0) &&
      can(s, { type: 'resolveBoard', agenda: 'expand' }).ok
    ) {
      cmds.push({ type: 'resolveBoard', agenda: 'expand' })
    }
  }
  // Bank for land even while an early depth goal has no cash() — otherwise wages eat the lot-survey reserve.
  if (s.compute.unlocked && s.stats.attentionFilled >= 1 && !s.memos['lot-survey'] && !s.expansions['side-yard']) {
    if (can(s, { type: 'buyMemo', id: 'lot-survey' }).ok) cmds.push({ type: 'buyMemo', id: 'lot-survey' })
  }
  if (step % 5 !== 0) return cmds
  cmds.push({ type: 'acceptChapter' })
  const act = goal?.action?.(s) ?? null
  if (act && can(s, act).ok) {
    run(s, act)
  }
  // Match store policies to traits (cold-permit hard gate + matched-stores goal).
  if (s.era >= 2) {
    for (const st of s.stores) {
      const trait = s.depth?.placeTraits?.[st.id]
      if (!trait) continue
      const def = STORE_TRAIT_BY_ID[trait as PlaceTraitId]
      if (!def || policyMatchesTrait(st.policy, trait)) continue
      const c: Command = { type: 'setPolicy', storeId: st.id, policy: def.matchPolicies[0]! }
      if (can(s, c).ok) run(s, c)
    }
  }
  // Grow Attention capacity / Ideas when the goal needs more than we can hold.
  const needs = goalNeeds(s, goal)
  const bankRepForInc =
    !s.incorporated && s.era >= 2 && s.compute.reputation < CAPITAL.incorporateRep
  if (needs.attention > attentionCap(s) && !bankRepForInc) {
    cmds.push({ type: 'spendRep', on: 'archive' })
  }
  if (needs.ideas > s.compute.ideas && s.compute.ideasUnlocked && !s.compute.ideasOn) {
    cmds.push({ type: 'toggleIdeas' })
  }
  // Keep a reserve for the goal; buy small things freely.
  const reserve = goalCash(s, goal)
  if (s.fuel < 20 && s.fleet.lanes > 0) cmds.push({ type: 'buyFuel' })
  const saveCapital = goal?.id === 'leave-region'
  const pocketsLeft = (s.fleet.pockets ?? []).filter((p) => p.left > 0).length
  const haulers = (s.fleet.bargeList ?? []).filter((b) => b.class === 'hauler').length
  for (const v of LATE_VERBS) {
    if (saveCapital && (v.type === 'acquireRegion' || v.type === 'hireLobby')) {
      if (v.type === 'hireLobby' && canWithin(s, v, reserve)) run(s, v)
      continue
    }
    // Pocket Ops stretch: one Hauler at a time until four pockets clear (parallel is the human path).
    if (
      v.type === 'launchBarge' &&
      (v.class === 'hauler' || !v.class) &&
      haulers >= 1 &&
      pocketsLeft > 2
    ) {
      continue
    }
    if (canWithin(s, v, reserve)) run(s, v)
  }
  const holdAttention = needs.attention > 0
  if (!holdAttention) cmds.push({ type: 'runTournament' })
  if (!holdAttention) {
    for (const st of s.stores) {
      if (st.drift > 0.4) cmds.push({ type: 'walkStore', storeId: st.id })
      else cmds.push({ type: 'trainStore', storeId: st.id })
    }
  }
  if (s.board.pendingAgenda !== null || (s.board.nextMeetingAt > 0 && s.time >= s.board.nextMeetingAt)) {
    cmds.push({ type: 'resolveBoard', agenda: 'expand' })
  }
  for (const tr of BUILD_FILTERS) {
    const c: Command = { type: 'buyBuild', track: tr }
    if (canWithin(s, c, reserve)) run(s, c)
  }
  for (const m of MEMOS) {
    // Resets and replacements are a choice, not progress.
    if (m.again) continue
    // The ending memos close the run; the campaign bot continues into Worlds instead.
    if (m.id === 'accept-exile' || m.id === 'reject-silence') continue
    const c: Command = { type: 'buyMemo', id: m.id }
    if (holdAttention) {
      try {
        if ((m.cost(s).attention ?? 0) > 0) continue
      } catch {
        continue
      }
    }
    if (canWithin(s, c, reserve)) run(s, c)
  }
  for (const d of ['throughput', 'edlp', 'hi-lo', 'loss-leader', 'premium-bodega', 'route-density', 'float-discipline', 'read-bank']) {
    cmds.push({ type: 'buyDoctrine', id: d })
  }
  // Two cheapest affordable upgrade ranks.
  for (let k = 0; k < 2; k++) {
    let best: { id: string; cost: number } | null = null
    for (const id of Object.keys(UPGRADE_BY_ID)) {
      const c: Command = { type: 'buyUpgrade', id }
      if (!canWithin(s, c, reserve)) continue
      const def = UPGRADE_BY_ID[id]!
      const cost = Math.ceil(def.base * Math.pow(def.growth, s.upgrades[id] ?? 0))
      if (!best || cost < best.cost) best = { id, cost }
    }
    if (best) run(s, { type: 'buyUpgrade', id: best.id })
  }
  for (const role of ['clerk', 'cashier', 'stocker'] as RoleId[]) {
    const c: Command = { type: 'hire', role }
    if (canWithin(s, c, reserve + 200)) cmds.push(c)
  }
  for (const p of Object.keys(PERK_BY_ID)) cmds.push({ type: 'buyPerk', id: p })
  for (const pj of PROJECTS) {
    const c: Command = { type: 'startProject', id: pj.id }
    if (canWithin(s, c, reserve)) run(s, c)
  }
  for (const r of RIVALS) {
    // Keep Concord alive until the hearing docket is cleared (2–3 sessions).
    if (
      r.id === 'concord' &&
      ((s.depth?.hearing && s.depth.hearing.answered < s.depth.hearing.needed) ||
        (s.horizon?.seatingsDone ?? 0) < HORIZON.clauseSeatingNeed)
    ) {
      continue
    }
    const buy: Command = { type: 'buyoutRival', id: r.id }
    if (canWithin(s, buy, reserve)) {
      run(s, buy)
      continue
    }
    const st = s.rivals?.[r.id]
    const war: Command = { type: 'priceWar', id: r.id }
    if (st && st.stores >= r.maxStores / 2 && canWithin(s, war, reserve)) run(s, war)
  }
  if (s.fleet.launched) {
    cmds.push({ type: 'buyCharter' })
    // Prefer shell/survey while pockets remain — replication floods Haulers and does not speed the trip clock.
    const axes =
      (s.fleet.pockets ?? []).filter((p) => p.left > 0).length > 2
        ? (['shell', 'survey', 'transit'] as const)
        : (['replication', 'survey', 'transit', 'shell'] as const)
    for (const axis of axes) cmds.push({ type: 'setCharterAxis', axis, delta: 1 })
  }
  if (s.era >= 6) {
    // Gate memos before the verbs they unlock — cheapest path through the desk.
    const gateMemos = [
      'probe-yard',
      'local-chalk',
      'cluster-name',
      'exchange-floor',
      'first-manifest',
      'greenhouse-permit',
      'trait-book',
      'taster-hire',
      'relay-mast',
      'phrase-desk',
      'first-agent-papers',
      'embassy-keys',
      'clause-board',
      'open-hours-draft',
      'local-shelf-draft',
      'one-price-draft',
      'ivos-list',
      'standing-order-last',
      'refuse-twice',
      'new-counter-form',
    ] as const
    for (const id of gateMemos) {
      const c: Command = { type: 'buyMemo', id }
      if (canWithin(s, c, reserve)) run(s, c)
    }
    const horizon: Command[] = [{ type: 'continueHorizon' }, { type: 'launchProbe' }]
    // Practice then credited fileStandard* path for Worlds gates.
    const prac = s.depth?.practice
    const needPlanogram =
      !!prac &&
      (prac.planogram.left > 0 ||
        prac.planogram.credited < HORIZON.slowWorlds ||
        s.era < 8)
    if (needPlanogram) {
      const planets = s.horizon?.planets ?? []
      // Prefer unstocked / uncredited — gap allows one filing per tick window.
      const ordered = [...planets].sort((a, b) => {
        const ac = a.stocked ? (a.gateCredited ? 2 : 1) : 0
        const bc = b.stocked ? (b.gateCredited ? 2 : 1) : 0
        return ac - bc
      })
      const target = ordered.find((p) => p.revealed)
      if (target) horizon.push({ type: 'fileStandardPlanogram', planetId: target.id })
    }
    const needConvoy =
      !!prac &&
      (prac.convoy.left > 0 || prac.convoy.credited < HORIZON.slowCircuits || s.era < 9)
    if (needConvoy) {
      horizon.push({ type: 'fileStandardConvoy' })
    }
    const needCross =
      !!prac && (prac.cross.left > 0 || prac.cross.credited < 2 || s.era < 10)
    if (needCross) horizon.push({ type: 'fileStandardCross' })
    const needPhrase =
      !!prac &&
      (prac.phrase.left > 0 || prac.phrase.credited < HORIZON.slowPhrases || s.era < 11)
    if (needPhrase) {
      if (s.horizon?.phrase?.nightOnly && !s.staff.some((m) => m.role === 'nightOperator')) {
        horizon.push({ type: 'hire', role: 'nightOperator' })
        if (s.depth?.open !== false) horizon.push({ type: 'setOpen', open: false })
      }
      if (s.depth?.jammedSymbol) horizon.push({ type: 'clearHorizonRival', kind: 'static' })
      horizon.push({ type: 'fileStandardPhrase' })
    }
    if ((s.horizon?.greenhouses ?? 0) < 1) horizon.push({ type: 'buyGreenhouse' })
    if ((s.horizon?.relays ?? 0) < 1) horizon.push({ type: 'buyRelay' })
    {
      const needHabit = (s.horizon?.phrase?.habit ?? 'price') as 'price' | 'stock' | 'route' | 'taste'
      if ((s.horizon?.agents.length ?? 0) < 1) horizon.push({ type: 'hireAgent', habit: needHabit })
      // Keep an agent on the phrase habit so habit watches credit.
      const agent = s.horizon?.agents[0]
      if (agent && agent.habit !== needHabit) {
        horizon.push({ type: 'setAgentHabit', id: agent.id, habit: needHabit })
      }
    }
    if ((s.horizon?.embassies ?? 0) < 1) horizon.push({ type: 'openEmbassy' })
    // Seat pending clause before the next keep (serial seating).
    horizon.push({ type: 'seatClause' })
    for (const id of ['open-hours', 'local-shelf', 'one-price', 'cold-law'] as const) {
      if (!s.horizon?.clauses?.includes(id)) horizon.push({ type: 'toggleClause', id })
    }
    const hearing = s.depth?.hearing
    if (
      s.horizon?.hearingClause ||
      hearing?.pendingClause ||
      (hearing && hearing.answered < hearing.needed)
    ) {
      horizon.push({ type: 'answerHearing' })
    }
    for (const kind of ['drift', 'keelmark', 'verdant', 'static', 'ration'] as const) {
      horizon.push({ type: 'clearHorizonRival', kind })
    }
    horizon.push(
      { type: 'setCharter', charter: 'standard' },
      { type: 'fileStandardList' },
      { type: 'rehearseAccept' },
      { type: 'acceptLastAisle' },
    )
    // Late hubs (Era 7+): franchise, unpack, jump, restock, co-op, broadcast, wire, vault, cryo, instruments, annex.
    if (s.era >= 7) {
      // Survey desk on the Shift Board once before Era 8 credit.
      const surveyor =
        s.staff.find((m) => m.role === 'surveyor') ?? s.staff.find((m) => m.role === 'planogramClerk')
      if (surveyor && !s.depth?.surveyShiftOnce) {
        horizon.push({ type: 'assignShift', slot: 'open', staffId: surveyor.id })
      }
      horizon.push({ type: 'openPlanetFranchise' })
      // Bank survey for Probe Yard (15) before co-op / broadcast drains the trickle.
      if ((s.memos['probe-yard'] ?? 0) > 0 && (s.horizon?.survey ?? 0) >= 20) {
        horizon.push({ type: 'coopOrder', cat: s.orderCat })
      }
      const seasonChore = (['water', 'cover', 'harvest', 'rest'] as const)[
        (s.horizon?.season ?? 0) % 4
      ]!
      horizon.push({ type: 'doSeasonChore', chore: seasonChore })
      horizon.push({ type: 'serveClimateNeighbor' })
      horizon.push({ type: 'settleStop' })
      horizon.push({ type: 'haulYield' })
      horizon.push({ type: 'seatClause' })
      horizon.push({ type: 'rehearseAccept' })
      const seasonHand = s.staff.find((m) => m.role === 'seasonHand')
      if (seasonHand) {
        horizon.push({ type: 'assignShift', slot: 'mid', staffId: seasonHand.id })
      }
      if ((s.memos['probe-yard'] ?? 0) > 0) {
        for (const climate of ['quiet', 'heat', 'orchard', 'tide', 'night', 'ash', 'ice', 'market'] as const) {
          horizon.push({ type: 'broadcast', climate })
        }
      }
      if (s.era >= 8) {
        horizon.push({ type: 'unpackBonded', count: 1, kind: 'dry' })
        if (s.fuel >= 20) horizon.push({ type: 'jumpLane' })
      }
      if (s.era >= 9) {
        if ((s.builds.storage ?? 0) < 7) horizon.push({ type: 'buyBuild', track: 'storage' })
        horizon.push({ type: 'vaultSeed', amount: 1 })
        horizon.push({ type: 'cryoTreaty' })
      }
      if (s.era >= 10) {
        horizon.push({ type: 'wireAd' })
        horizon.push({ type: 'buyInstrument', id: 'planet-bonds' })
      }
      for (const role of [
        'surveyor',
        'planogramClerk',
        'broker',
        'stevedore',
        'grower',
        'seasonHand',
        'translator',
        'nightOperator',
        'diplomat',
        'minutesClerk',
        'whip',
      ] as const) {
        horizon.push({ type: 'hire', role })
      }
      if (s.horizon?.buildQueue == null) {
        for (const id of ['storefront', 'storage', 'cold', 'production', 'transit', 'civic'] as const) {
          horizon.push({ type: 'queueBuild', id })
        }
      }
      const stocked = s.horizon?.planets.filter((p) => p.stocked).length ?? 0
      const bay = s.offworld?.bay.length ?? 0
      if (stocked > bay && bay < 12 && (s.horizon?.survey ?? 0) >= 8) {
        horizon.push({ type: 'restockOffworld' })
      }
    }
    for (const c of horizon) {
      if (can(s, c).ok) run(s, c)
    }
  }
  return cmds
}

export function runPacing(seed: number, seconds: number, sampleEvery = 600): PacingResult {
  const s = createInitialState(seed, 0)
  s.introSeen = true
  const eraAt: EraTimes = { 0: 0 }
  const samples: PacingResult['samples'] = []
  for (let t = 1; t <= seconds; t++) {
    for (const cmd of campaignCommands(s, t)) {
      if (can(s, cmd).ok) run(s, cmd)
    }
    applyTick(s, 1)
    repair(s)
    if (eraAt[s.era] === undefined) eraAt[s.era] = t
    if (t % sampleEvery === 0) {
      samples.push({
        t,
        era: s.era,
        empire: s.empire.level,
        cash: s.cash,
        revPerSec: s.rates.revenuePerSec,
        goal: nextGoal(s)?.id ?? 'done',
      })
    }
  }
  return { eraAt, final: s, samples }
}

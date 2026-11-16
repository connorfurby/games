import { REGULAR_BY_ID } from '../content/depth'
import { can, type Command } from './commands'
import { DEPTH } from './balance'
import { roleCount } from './formulas'
import { sumQty } from './helpers'
import type { GameState } from './state'
import { regularWantsMet } from './systems/regulars'

/**
 * Era 0–1 depth pushes shared by attentiveCommands and campaignCommands.
 * Helpers keep the exact push order of the original bots; reserve-aware gating
 * stays in attentiveCommands (it differs from the campaign bot on purpose).
 */

/** Feature a can facing early (Era 1 gate). */
export function pushCansFacing(s: GameState, cmds: Command[]): void {
  if (!s.depth?.facings?.cans && can(s, { type: 'setFacing', cat: 'cans', facingId: 'tomatoes' }).ok) {
    cmds.push({ type: 'setFacing', cat: 'cans', facingId: 'tomatoes' })
  }
}

/** Serve waiting regulars (matching their facing when needed) + dock check-in. */
export function pushRegularsAndDock(s: GameState, cmds: Command[]): void {
  const r = s.depth?.regulars
  // Two shoppers: if the primary cannot be served yet but the other can, switch focus.
  if (
    r?.activeId &&
    r.waitingId &&
    !regularWantsMet(s, r.activeId) &&
    regularWantsMet(s, r.waitingId) &&
    can(s, { type: 'focusRegular', which: 'waiting' }).ok
  ) {
    cmds.push({ type: 'focusRegular', which: 'waiting' })
  } else if (s.depth?.regulars?.activeId) {
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
}

/** Shift board: park first hire on Open; keep a receiver on a board so dock check-ins stay legal. */
export function pushShiftBoard(s: GameState, cmds: Command[]): void {
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
}

/** Flagship planogram practice + credit; Produce Lead on Open (side-yard shift gate). */
export function pushFlagshipAndLeadShift(s: GameState, cmds: Command[]): void {
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

/** Invoice book — campaign version (no reserve): pay up to two, earliest due first. */
function pushInvoicePays(s: GameState, cmds: Command[]): void {
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

/** Era 0–1 depth verbs the campaign bot runs every tick so gates don't stall between 5s samples. */
export function pushEarlyCampaign(s: GameState, cmds: Command[]): void {
  pushCansFacing(s, cmds)
  pushInvoicePays(s, cmds)
  pushRegularsAndDock(s, cmds)
  pushShiftBoard(s, cmds)
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
    pushFlagshipAndLeadShift(s, cmds)
  }
}

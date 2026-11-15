import { cashLabel } from '@/shared/bn'
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../content/categories'
import {
  CONTRACT_BY_ID,
  DEPARTMENT_BY_ID,
  emptyDepth,
  FACING_BY_ID,
  isOrbitShiftRole,
  scoreFlagship,
  standardLayout,
  type FlyerDiscount,
  type FlyerPromise,
  type ShiftSlot,
} from '../content/depth'
import { ROLES, type RoleId } from '../content/staff'
import { upgradeEffect } from '../content/upgrades'
import { DEPTH } from './balance'
import type { Check, Command } from './commands'
import { crateSize, unitCost } from './formulas'
import { addBatch, compact, log, round2 } from './helpers'
import { syncDeptRoster } from './staffDept'
import type { GameState } from './state'
import { canRunBrownoutDrill, canSignCoolerLog, runBrownoutDrill, signCoolerLog } from './systems/cold'
import { dumpCooler, perishableQty } from './systems/recovery'
import { applyStarHit, tryServeRegular } from './systems/regulars'
import { clearRivalLock } from './systems/rivals'

const ok: Check = { ok: true }
const no = (reason: string): Check => ({ ok: false, reason })

export type DepthCmd =
  | Extract<Command, { type: 'setFacing' }>
  | Extract<Command, { type: 'setOpen' }>
  | Extract<Command, { type: 'setDeptPolicy' }>
  | Extract<Command, { type: 'promoteStaff' }>
  | Extract<Command, { type: 'morningWriteOff' }>
  | Extract<Command, { type: 'unlockContract' }>
  | Extract<Command, { type: 'setContract' }>
  | Extract<Command, { type: 'setCircular' }>
  | Extract<Command, { type: 'printFlyerWeek' }>
  | Extract<Command, { type: 'runBrownoutDrill' }>
  | Extract<Command, { type: 'signCoolerLog' }>
  | Extract<Command, { type: 'assignShift' }>
  | Extract<Command, { type: 'clearShift' }>
  | Extract<Command, { type: 'serveRegular' }>
  | Extract<Command, { type: 'dockCheckIn' }>
  | Extract<Command, { type: 'payInvoice' }>
  | Extract<Command, { type: 'writeOffInvoice' }>
  | Extract<Command, { type: 'setFlagshipSlot' }>
  | Extract<Command, { type: 'fileFlagshipPlanogram' }>
  | Extract<Command, { type: 'fileStandardFlagship' }>
  | Extract<Command, { type: 'setProduceGrade' }>

type DepthHandler<C extends DepthCmd = DepthCmd> = {
  can: (s: GameState, cmd: C) => Check
  run: (s: GameState, cmd: C) => void
}

function ensureDepth(s: GameState) {
  if (!s.depth) s.depth = emptyDepth()
}

function isShiftSlot(slot: string): slot is ShiftSlot {
  return (DEPTH.shiftSlots as readonly string[]).includes(slot)
}

function fileFlagship(s: GameState, slots: string[]) {
  ensureDepth(s)
  const score = scoreFlagship(slots)
  s.depth.flagship.slots = slots.slice(0, DEPTH.flagshipSlots)
  while (s.depth.flagship.slots.length < DEPTH.flagshipSlots) s.depth.flagship.slots.push('')
  s.depth.flagship.score = score
  s.depth.flagship.filings += 1
  if (s.depth.flagship.practiceLeft > 0) {
    s.depth.flagship.practiceLeft -= 1
    log(s, `Flagship planogram practice (${score.toFixed(2)}) — ${s.depth.flagship.practiceLeft} left.`, 'info')
    return
  }
  if (score >= DEPTH.flagshipSlow) {
    s.depth.flagship.credited = true
    if (s.categories.deli && s.categories.bakery) {
      s.depth.flagship.chainCredited = true
    }
    if (s.categories.import) {
      s.depth.flagship.globeCredited = true
      log(s, `Flagship planogram filed at ${score.toFixed(2)} — globe layout credited.`, 'good')
    } else if (s.categories.deli && s.categories.bakery) {
      log(s, `Flagship planogram filed at ${score.toFixed(2)} — chain layout credited.`, 'good')
    } else {
      log(s, `Flagship planogram filed at ${score.toFixed(2)}.`, 'good')
    }
  } else {
    log(s, `Flagship planogram scored ${score.toFixed(2)} — need ≥${DEPTH.flagshipSlow}.`, 'warn')
  }
}

function canPrintFlyer(s: GameState, aisles: CategoryId[]): Check {
  ensureDepth(s)
  if (s.era < 2) return no('Flyer Desk opens in Era 2.')
  if (!Array.isArray(aisles) || aisles.length < 2 || aisles.length > 3) {
    return no('Pick two or three aisles.')
  }
  const uniq = new Set(aisles)
  if (uniq.size !== aisles.length) return no('Pick distinct aisles.')
  for (const cat of aisles) {
    if (!CATEGORY_IDS.includes(cat)) return no('Unknown aisle.')
    if (!s.categories[cat]) return no(`${cat} aisle locked.`)
  }
  if (s.depth.flyer && s.depth.flyer.until > s.time) return no('Flyer week already running.')
  if (s.depth.circular && s.depth.circular.until > s.time) return no('Flyer week already running.')
  const cool = s.depth.flyer?.cooldownUntil ?? 0
  if (cool > s.time) {
    return no(`Flyer cooldown ${Math.ceil((cool - s.time) / 60)}m.`)
  }
  return ok
}

function runPrintFlyer(
  s: GameState,
  aisles: CategoryId[],
  discount: FlyerDiscount,
  promise: FlyerPromise,
) {
  ensureDepth(s)
  const until = s.time + DEPTH.circularSec
  const prior = s.depth.flyer
  s.depth.flyer = {
    aisles: [...aisles],
    discount,
    promise,
    until,
    weeksCompleted: prior?.weeksCompleted ?? s.depth.flyerWeeks,
    cooldownUntil: prior?.cooldownUntil ?? 0,
    bandHeld: true,
  }
  s.depth.circular = { aisles: aisles.slice(0, 2) as CategoryId[], until }
  s.depth.circularsRun += 1
  if (s.depth.counterFlyerNeeded) {
    s.depth.counterFlyerNeeded = false
    log(s, 'Counter-flyer printed — Penny’s smear quieted.', 'good')
  }
  const defected = s.fleet?.franchiseList?.find((f) => f.defected)
  if (defected) {
    defected.loyalty = Math.min(1, defected.loyalty + 0.25)
    if (defected.loyalty >= 0.45) {
      defected.defected = false
      s.depth.defectionsHandled = (s.depth.defectionsHandled ?? 0) + 1
      log(s, `${defected.name} returned after the flyer.`, 'good')
    }
  }
  log(
    s,
    `Flyer week live: ${aisles.join(' + ')} (${discount}/${promise}) for ${DEPTH.circularSec / 60} min.`,
    'good',
  )
}

export const depthHandlers: { [K in DepthCmd['type']]: DepthHandler<Extract<DepthCmd, { type: K }>> } = {
  setFacing: {
    can: (s, cmd) => {
      ensureDepth(s)
      const def = FACING_BY_ID[cmd.facingId]
      if (!def) return no('Unknown facing.')
      if (def.cat !== cmd.cat) return no('Facing is for another aisle.')
      if (!s.categories[cmd.cat]) return no('Aisle locked.')
      if (cmd.cat !== 'cans' && s.era < 1) return no('Fresh facings open in Era 1.')
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      s.depth.facings[cmd.cat] = cmd.facingId
      if (s.depth.rivalLockCat === cmd.cat) clearRivalLock(s, `Refaced ${cmd.cat} — Penny lock cleared.`)
      const def = FACING_BY_ID[cmd.facingId]
      log(s, `Featuring ${def?.name ?? cmd.facingId} on ${cmd.cat}.`, 'info')
    },
  },
  setOpen: {
    can: (s) => {
      ensureDepth(s)
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      s.depth.open = !!cmd.open
      log(s, s.depth.open ? 'Store open.' : 'Store closed — wages and foot traffic drop.', 'info')
    },
  },
  setDeptPolicy: {
    can: (s, cmd) => {
      ensureDepth(s)
      const dept = DEPARTMENT_BY_ID[cmd.dept]
      if (!dept) return no('Unknown department.')
      if (s.era < dept.era) return no(`${dept.name} opens in Era ${dept.era}.`)
      if (!dept.policies.some((p) => p.id === cmd.policy)) return no('Unknown policy.')
      if (!s.depth.departments[cmd.dept]?.leadId) return no('Hire a department lead first.')
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      const slot = s.depth.departments[cmd.dept] ?? { leadId: null, specialistIds: [], policy: null }
      slot.policy = cmd.policy
      s.depth.departments[cmd.dept] = slot
      const pol = DEPARTMENT_BY_ID[cmd.dept]?.policies.find((p) => p.id === cmd.policy)
      log(s, `${DEPARTMENT_BY_ID[cmd.dept]?.name ?? cmd.dept} policy: ${pol?.name ?? cmd.policy}.`, 'staff')
    },
  },
  promoteStaff: {
    can: (s, cmd) => {
      ensureDepth(s)
      if (s.era < 1) return no('Promotions open in Era 1.')
      const m = s.staff.find((x) => x.id === cmd.staffId)
      if (!m) return no('No such employee.')
      if (cmd.toRole !== 'shiftLead') return no('Only clerk → Shift Lead for now.')
      if (m.role !== 'clerk') return no('Promote a clerk.')
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      const m = s.staff.find((x) => x.id === cmd.staffId)
      if (!m) return
      m.role = cmd.toRole as RoleId
      s.depth.promotions += 1
      log(s, `${m.name} promoted to ${ROLES[cmd.toRole as RoleId]?.name ?? cmd.toRole}.`, 'staff')
      syncDeptRoster(s)
    },
  },
  morningWriteOff: {
    can: (s, cmd) => {
      ensureDepth(s)
      if (s.era < 1) return no('Write-offs open in Era 1.')
      if (cmd.mode !== 'dump' && cmd.mode !== 'discount') return no('Dump or discount.')
      if (s.depth.writeOffAt > 0 && s.time - s.depth.writeOffAt < DEPTH.writeOffCooldown) {
        return no('Already wrote off this morning.')
      }
      if (perishableQty(s, 'backroom') + perishableQty(s, 'shelf') <= 0) {
        return no('Nothing perishable to write off.')
      }
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      if (cmd.mode === 'dump') {
        dumpCooler(s, false)
      } else {
        let cleared = 0
        let cash = 0
        for (const b of s.backroom) {
          if (b.qty <= 0) continue
          const life = CATEGORIES[b.cat as CategoryId]?.life
          if (life == null) continue
          if (b.age >= life * 0.55) {
            const n = b.qty
            cash += n * unitCost(s, b.cat) * DEPTH.writeOffDiscountFrac
            cleared += n
            b.qty = 0
          } else {
            b.age = Math.max(0, b.age * 0.35)
          }
        }
        compact(s.backroom)
        s.cash = round2(s.cash + cash)
        if (cleared > 0) {
          log(s, `Morning markdown: cleared ${cleared} sour units for $${cash.toFixed(2)}.`, 'good')
        } else {
          log(s, 'Morning markdown: rotated the cooler; nothing dumped.', 'info')
        }
      }
      s.depth.writeOffAt = s.time
      s.depth.writeOffs += 1
    },
  },
  unlockContract: {
    can: (s, cmd) => {
      ensureDepth(s)
      const def = CONTRACT_BY_ID[cmd.id]
      if (!def) return no('Unknown contract.')
      if (s.era < def.era) return no(`Opens in Era ${def.era}.`)
      if (cmd.id in s.depth.contracts) return no('Already unlocked.')
      // Commissary is chain-wide, not aisle-gated.
      if (def.id !== 'commissary' && !s.categories[def.cat]) return no(`${def.cat} aisle locked.`)
      if (s.cash < def.unlockCash) return no(`Need ${cashLabel(def.unlockCash)}.`)
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      const def = CONTRACT_BY_ID[cmd.id]!
      s.cash -= def.unlockCash
      s.depth.contracts[cmd.id] = true
      log(s, `Unlocked ${def.name} contract.`, 'memo')
    },
  },
  setContract: {
    can: (s, cmd) => {
      ensureDepth(s)
      const def = CONTRACT_BY_ID[cmd.id]
      if (!def) return no('Unknown contract.')
      if (!(cmd.id in s.depth.contracts)) return no('Unlock the contract first.')
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      s.depth.contracts[cmd.id] = !!cmd.on
      const def = CONTRACT_BY_ID[cmd.id]
      log(s, `${def?.name ?? cmd.id} contract ${cmd.on ? 'on' : 'off'}.`, 'info')
    },
  },
  setCircular: {
    can: (s, cmd) => canPrintFlyer(s, [...cmd.aisles]),
    run: (s, cmd) => runPrintFlyer(s, [...cmd.aisles], 'soft', 'hours'),
  },
  printFlyerWeek: {
    can: (s, cmd) => {
      const disc = cmd.discountBand
      if (disc !== 'soft' && disc !== 'mid' && disc !== 'deep') return no('Pick a discount band.')
      if (cmd.promise !== 'hours' && cmd.promise !== 'facing') return no('Pick a promise.')
      return canPrintFlyer(s, [...cmd.aisles])
    },
    run: (s, cmd) => {
      runPrintFlyer(s, [...cmd.aisles], cmd.discountBand, cmd.promise)
    },
  },
  runBrownoutDrill: {
    can: (s) => {
      ensureDepth(s)
      const r = canRunBrownoutDrill(s)
      return r ? no(r) : ok
    },
    run: (s) => {
      ensureDepth(s)
      runBrownoutDrill(s)
    },
  },
  signCoolerLog: {
    can: (s) => {
      ensureDepth(s)
      const r = canSignCoolerLog(s)
      return r ? no(r) : ok
    },
    run: (s) => {
      ensureDepth(s)
      signCoolerLog(s)
    },
  },
  assignShift: {
    can: (s, cmd) => {
      ensureDepth(s)
      if (!isShiftSlot(cmd.slot)) return no('Unknown shift.')
      if (!s.staff.some((m) => m.id === cmd.staffId)) return no('No such employee.')
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      const slot = cmd.slot
      // One board seat per person.
      for (const k of DEPTH.shiftSlots) {
        s.depth.shifts[k] = s.depth.shifts[k].filter((id) => id !== cmd.staffId)
      }
      if (!s.depth.shifts[slot].includes(cmd.staffId)) s.depth.shifts[slot].push(cmd.staffId)
      const member = s.staff.find((m) => m.id === cmd.staffId)
      const name = member?.name ?? 'Staff'
      if (!s.depth.leadsOnBoard) s.depth.leadsOnBoard = { fresh: false, cold: false }
      const freshLead = s.depth.departments?.fresh?.leadId
      const coldLead = s.depth.departments?.cold?.leadId
      if (
        member?.role === 'produceLead' ||
        (freshLead != null && freshLead === cmd.staffId)
      ) {
        s.depth.leadsOnBoard.fresh = true
      }
      if (
        member?.role === 'plantOperator' ||
        (coldLead != null && coldLead === cmd.staffId)
      ) {
        s.depth.leadsOnBoard.cold = true
      }
      if (slot === 'mid' && member && isOrbitShiftRole(member.role)) {
        s.depth.orbitMidOnce = true
      }
      if (member?.role === 'surveyor' || member?.role === 'planogramClerk') {
        s.depth.surveyShiftOnce = true
      }
      log(s, `${name} on ${slot} shift.`, 'staff')
    },
  },
  clearShift: {
    can: (s, cmd) => {
      ensureDepth(s)
      if (!isShiftSlot(cmd.slot)) return no('Unknown shift.')
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      if (cmd.staffId != null) {
        s.depth.shifts[cmd.slot] = s.depth.shifts[cmd.slot].filter((id) => id !== cmd.staffId)
      } else {
        s.depth.shifts[cmd.slot] = []
      }
    },
  },
  serveRegular: {
    can: (s) => {
      ensureDepth(s)
      if (!s.depth.regulars.activeId) return no('No regular waiting.')
      return ok
    },
    run: (s) => {
      ensureDepth(s)
      if (!tryServeRegular(s)) {
        log(s, 'Shelf or facing does not match their list yet.', 'warn')
      }
    },
  },
  dockCheckIn: {
    can: (s) => {
      ensureDepth(s)
      if (s.era < 1) return no('Dock check-in opens in Era 1.')
      const onBoard = DEPTH.shiftSlots.some((slot) =>
        (s.depth.shifts?.[slot] ?? []).some((id) => {
          const m = s.staff.find((x) => x.id === id)
          return m?.role === 'receiver'
        }),
      )
      if (!onBoard) return no('Put a receiver on a shift board first.')
      if (s.time < (s.depth.nextDockAt ?? 0)) {
        const left = Math.ceil((s.depth.nextDockAt ?? 0) - s.time)
        return no(`Next dock check-in in ${left}s.`)
      }
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      const aisle = cmd.aisle && s.categories[cmd.aisle] ? cmd.aisle : 'cans'
      const short = !!cmd.short
      const units = short ? Math.max(2, Math.floor(crateSize(s) * 0.55)) : crateSize(s)
      addBatch(s.backroom, aisle, units, 0)
      s.depth.dockCheckIns = (s.depth.dockCheckIns ?? 0) + 1
      s.depth.lastDockAisle = aisle
      const pad = Math.min(0.4, upgradeEffect(s, 'dock-check-pad'))
      const cd = DEPTH.dockCheckInCooldownSec * (1 - pad) * (short ? 0.7 : 1)
      s.depth.nextDockAt = s.time + cd
      log(
        s,
        `Dock check-in ${s.depth.dockCheckIns}/${DEPTH.dockCheckInNeed} → ${aisle}${short ? ' (short)' : ''}. Next in ${Math.ceil(cd)}s.`,
        'good',
      )
    },
  },
  payInvoice: {
    can: (s, cmd) => {
      ensureDepth(s)
      const inv = s.depth.invoices.find((i) => i.id === cmd.id)
      if (!inv) return no('Unknown invoice.')
      if (inv.paid) return no('Already paid.')
      const early = s.time < inv.dueAt
      const due = round2(inv.amount * (early ? DEPTH.invoiceEarlyDisc : DEPTH.invoiceLateFee))
      if (s.cash < due) return no(`Need ${cashLabel(due)}.`)
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      const inv = s.depth.invoices.find((i) => i.id === cmd.id)
      if (!inv || inv.paid) return
      const early = s.time <= inv.dueAt
      const due = round2(inv.amount * (early ? DEPTH.invoiceEarlyDisc : DEPTH.invoiceLateFee))
      s.cash = round2(s.cash - due)
      s.stats.wholesaleSpent += due
      inv.paid = true
      inv.onTime = early
      if (early) {
        s.depth.invoicesOnTime += 1
        log(s, `Paid invoice #${inv.id} early (−$${due.toFixed(2)}).`, 'good')
      } else {
        applyStarHit(s, DEPTH.starLateInvoiceHit)
        log(s, `Paid invoice #${inv.id} late (−$${due.toFixed(2)}).`, 'warn')
      }
      // Drop settled invoices so the book stays O(unpaid), not O(lifetime orders).
      s.depth.invoices = s.depth.invoices.filter((i) => !i.paid)
    },
  },
  writeOffInvoice: {
    can: (s) => {
      ensureDepth(s)
      const unpaid = s.depth.invoices.filter((i) => !i.paid)
      if (unpaid.length === 0) return no('No open invoices.')
      if (unpaid.length < DEPTH.invoiceUnpaidCap && s.cash > 5) {
        return no('Pay invoices with cash when you can.')
      }
      return ok
    },
    run: (s) => {
      ensureDepth(s)
      const oldest = s.depth.invoices.find((i) => !i.paid)
      if (!oldest) return
      oldest.paid = true
      oldest.onTime = false
      applyStarHit(s, DEPTH.starLateInvoiceHit * 0.5)
      s.depth.invoices = s.depth.invoices.filter((i) => !i.paid)
      log(s, `Collections cleared invoice #${oldest.id}.`, 'warn')
    },
  },
  setFlagshipSlot: {
    can: (s, cmd) => {
      ensureDepth(s)
      if (s.era < 1) return no('Flagship planogram opens in Era 1.')
      if (cmd.index < 0 || cmd.index >= DEPTH.flagshipSlots) return no('Bad slot.')
      if (cmd.cat !== '' && !CATEGORY_IDS.includes(cmd.cat as CategoryId)) return no('Unknown aisle.')
      if (cmd.cat !== '' && !s.categories[cmd.cat as CategoryId]) return no('Aisle locked.')
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      s.depth.flagship.slots[cmd.index] = cmd.cat
      s.depth.flagship.score = scoreFlagship(s.depth.flagship.slots)
    },
  },
  fileFlagshipPlanogram: {
    can: (s) => {
      ensureDepth(s)
      if (s.era < 1) return no('Flagship planogram opens in Era 1.')
      if (!s.depth.flagship.slots.some((c) => !!c)) return no('Set at least one slot.')
      return ok
    },
    run: (s) => {
      ensureDepth(s)
      fileFlagship(s, [...s.depth.flagship.slots])
    },
  },
  fileStandardFlagship: {
    can: (s) => {
      ensureDepth(s)
      if (s.era < 1) return no('Flagship planogram opens in Era 1.')
      return ok
    },
    run: (s) => {
      ensureDepth(s)
      fileFlagship(s, standardLayout(DEPTH.flagshipSlots))
    },
  },
  setProduceGrade: {
    can: (s, cmd) => {
      ensureDepth(s)
      if (!s.categories.produce) return no('Produce locked.')
      if (cmd.grade !== null && cmd.grade !== 'good' && cmd.grade !== 'bruised') {
        return no('Good or bruised.')
      }
      return ok
    },
    run: (s, cmd) => {
      ensureDepth(s)
      s.depth.produceGrade = cmd.grade
      if (cmd.grade === 'bruised') {
        log(s, 'Produce graded bruised — sells faster, stars softer.', 'info')
      } else if (cmd.grade === 'good') {
        log(s, 'Produce graded good.', 'info')
      }
    },
  },
}

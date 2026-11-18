import { DEPTH } from '../balance'
import { log, round2 } from '../helpers'
import type { GameState } from '../state'
import { applyStarHit } from './regulars'

type Invoice = GameState['depth']['invoices'][number]

/** What an invoice costs right now: early discount before its due time, late fee after. */
export function invoiceDue(s: GameState, inv: Invoice): number {
  const early = s.time <= inv.dueAt
  return round2(inv.amount * (early ? DEPTH.invoiceEarlyDisc : DEPTH.invoiceLateFee))
}

export function settleInvoice(s: GameState, inv: Invoice, quiet = false) {
  const early = s.time <= inv.dueAt
  const due = invoiceDue(s, inv)
  s.cash = round2(s.cash - due)
  s.stats.wholesaleSpent += due
  inv.paid = true
  inv.onTime = early
  if (early) {
    s.depth.invoicesOnTime += 1
    if (!quiet) log(s, `Paid invoice #${inv.id} early (−$${due.toFixed(2)}).`, 'good')
  } else {
    applyStarHit(s, DEPTH.starLateInvoiceHit)
    log(s, `Paid invoice #${inv.id} late (−$${due.toFixed(2)}).`, 'warn')
  }
}

/** Pays open invoices oldest first while cash covers each one. Returns how many were paid. */
export function payInvoicesWhileCash(s: GameState, quiet = false): number {
  if (!s.depth) return 0
  let n = 0
  for (const inv of s.depth.invoices) {
    if (inv.paid) continue
    if (s.cash < invoiceDue(s, inv)) break
    settleInvoice(s, inv, quiet)
    n += 1
  }
  if (n) s.depth.invoices = s.depth.invoices.filter((i) => !i.paid)
  return n
}

import { describe, expect, it } from 'vitest'
import { DEPTH } from './balance'
import { run, tickAutoRestock } from './commands'
import { backroomCap, crateSize, doorOverflow } from './formulas'
import { sumQty } from './helpers'
import { createInitialState } from './state'

describe('tickAutoRestock', () => {
  function ready(seed = 11) {
    const s = createInitialState(seed)
    s.memos['auto-order'] = 1
    s.autoRestock.enabled = true
    // Legacy dials that used to block — must be ignored.
    s.autoRestock.maxCost = 0.01
    s.autoRestock.minUnits = 10_000
    s.backroom = []
    s.shelf = []
    s.orders = []
    s.depth!.invoices = []
    return s
  }

  it('fills an empty backroom with enough crates at live price despite a tiny maxCost', () => {
    const s = ready()
    const units = crateSize(s)
    const room = backroomCap(s) + doorOverflow(s)
    const expectCrates = Math.floor(room / units)

    tickAutoRestock(s)

    expect(expectCrates).toBeGreaterThan(1)
    const pending = s.orders.reduce((n, o) => n + o.qty, 0)
    expect(pending).toBe(expectCrates * units)
    expect(s.orders.length).toBeGreaterThanOrEqual(1)
  })

  it('keeps ordering while a truck is already inbound', () => {
    const s = ready()
    const units = crateSize(s)
    const room = backroomCap(s) + doorOverflow(s)
    run(s, { type: 'buyWholesale', cat: 'cans', crates: 1 })
    expect(s.orders.length).toBe(1)

    tickAutoRestock(s)

    const pending = s.orders.reduce((n, o) => n + o.qty, 0)
    expect(s.orders.length).toBeGreaterThan(1)
    expect(pending).toBeGreaterThanOrEqual(room - units)
    expect(pending).toBeLessThanOrEqual(room)
  })

  it('does not order once on-hand plus inbound fill the room', () => {
    const s = ready()
    const room = backroomCap(s) + doorOverflow(s)
    const units = crateSize(s)
    const crates = Math.floor(room / units)
    run(s, { type: 'buyWholesale', cat: 'cans', crates })
    const filled = s.orders.length

    tickAutoRestock(s)

    expect(s.orders.length).toBe(filled)
    expect(sumQty(s.backroom) + s.orders.reduce((n, o) => n + o.qty, 0)).toBe(crates * units)
  })

  it('buys an empty aisle when the backroom is already a wall of cans', () => {
    const s = ready()
    s.categories.household = true
    s.categories.produce = true
    s.categories.dairy = true
    const units = crateSize(s)
    const cap = backroomCap(s) + doorOverflow(s)
    s.backroom = [{ cat: 'cans', qty: cap - units, age: 0 }]

    tickAutoRestock(s)

    expect(s.orders.length).toBeGreaterThan(0)
    expect(s.orders.every((o) => o.cat !== 'cans')).toBe(true)
  })

  it('splits a roomy backroom across unlocked aisles', () => {
    const s = ready()
    s.builds.storage = 3
    s.categories.household = true
    s.categories.produce = true
    s.backroom = []

    tickAutoRestock(s)

    const cats = new Set(s.orders.map((o) => o.cat))
    expect(cats.has('cans')).toBe(true)
    expect(cats.has('household')).toBe(true)
    expect(cats.has('produce')).toBe(true)
  })

  it('stops when the invoice book is full', () => {
    const s = ready()
    for (let id = 1; id <= DEPTH.invoiceUnpaidCap; id++) {
      s.depth!.invoices.push({
        id,
        cat: 'cans',
        amount: 1,
        dueAt: s.time + 60,
        paid: false,
        onTime: false,
      })
    }
    s.depth!.nextInvoiceId = DEPTH.invoiceUnpaidCap + 1

    tickAutoRestock(s)

    expect(s.orders.length).toBe(0)
  })
})

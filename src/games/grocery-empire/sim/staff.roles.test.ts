import { describe, expect, it } from 'vitest'
import { ROLE_IDS, ROLES, STAFF_NAMES, type RoleId } from '../content/staff'
import { hireName, staffName } from './systems/people'
import { CAUSES } from '../content/corp/town'
import { can, run } from './commands'
import { corpOf } from './corp/core'
import { franchiseFee } from './corp/more'
import { donate, pressReach } from './corp/town'
import { demandPerSec, moraleTarget, staffLevelCap, unitCost, unpackPerSec, wagesPerSec } from './formulas'
import { createInitialState, type GameState } from './state'
import { crewStrength, leadMul } from './staffPower'
import { hireOutlook, pickHire, swapFor } from './staffOutlook'

let nextId = 1000
function add(s: GameState, role: RoleId, level = 1) {
  s.staff.push({ id: nextId++, role, name: 'T', level, xp: 0, hiredAt: 0 })
}
function base(era = 4) {
  const s = createInitialState(3, 0)
  s.introSeen = true
  s.era = era
  s.menus.staff = true
  s.cash = 1e9
  corpOf(s)
  return s
}
/** The change a role makes: f(with one more) vs f(without). */
function lift(role: RoleId, f: (s: GameState) => number, prep?: (s: GameState) => void) {
  const a = base()
  prep?.(a)
  const b = base()
  prep?.(b)
  add(b, role)
  return { before: f(a), after: f(b) }
}

describe('every crew role does something', () => {
  it('greeters bring shoppers', () => {
    // A crew on both sides, so only the greeter differs.
    const r = lift('greeter', (s) => demandPerSec(s), (s) => add(s, 'clerk'))
    expect(r.after).toBeGreaterThan(r.before)
  })
  it('buyers cut crate cost', () => {
    const r = lift('buyer', (s) => unitCost(s, 'cans'))
    expect(r.after).toBeLessThan(r.before)
  })
  it('bookkeepers cut the wage bill', () => {
    const prep = (s: GameState) => {
      for (let i = 0; i < 20; i++) add(s, 'cashier', 5)
      s.rates.revenuePerSec = 1e6
    }
    const a = base()
    prep(a)
    const b = base()
    prep(b)
    add(b, 'bookkeeper')
    for (let i = 0; i < 3; i++) add(a, 'cashier', 5)
    // Same heads both sides (b has the bookkeeper, a one more cashier of similar wage).
    expect(wagesPerSec(b) / wagesPerSec(a)).toBeLessThan(1)
  })
  it('trainers raise the level cap', () => {
    const r = lift('trainer', staffLevelCap)
    expect(r.after).toBe(r.before + 2)
  })
  it('HR raises morale', () => {
    const r = lift('hrManager', moraleTarget)
    expect(r.after).toBeGreaterThan(r.before)
  })
  it('community reps make gifts earn more goodwill', () => {
    const r = lift('communityRep', (s) => {
      s.rates.revenuePerSec = 10
      corpOf(s).econ = 10
      donate(s, CAUSES[0]!.id, 30)
      return corpOf(s).town.goodwill
    })
    expect(r.after).toBeGreaterThan(r.before)
  })
  it('spokespeople widen press reach', () => {
    const r = lift('spokesperson', pressReach, (s) => {
      corpOf(s).town.outlets = ['gazette']
    })
    expect(r.after).toBeGreaterThan(r.before)
  })
  it('scouts raise the franchise fee', () => {
    const r = lift('franchiseScout', franchiseFee, (s) => {
      s.rates.revenuePerSec = 10
      corpOf(s).econ = 10
    })
    expect(r.after).toBeGreaterThan(r.before)
  })
  it('every role id is defined', () => {
    for (const id of ROLE_IDS) expect(ROLES[id]?.id).toBe(id)
  })
})

describe('shift leads are a real promotion', () => {
  it('still unpack, and lift the floor crew', () => {
    const a = base(1)
    add(a, 'clerk', 5)
    add(a, 'clerk', 5)
    const before = unpackPerSec(a)
    a.staff[0]!.role = 'shiftLead'
    expect(leadMul(a)).toBeGreaterThan(1)
    expect(unpackPerSec(a)).toBeGreaterThan(before)
  })
  it('costs a raise and needs a seasoned clerk', () => {
    const s = base(1)
    add(s, 'clerk', 1)
    const id = s.staff[0]!.id
    expect(can(s, { type: 'promoteStaff', staffId: id, toRole: 'shiftLead' }).ok).toBe(false)
    s.staff[0]!.level = 3
    const cash = s.cash
    expect(can(s, { type: 'promoteStaff', staffId: id, toRole: 'shiftLead' }).ok).toBe(true)
    run(s, { type: 'promoteStaff', staffId: id, toRole: 'shiftLead' })
    expect(s.cash).toBeLessThan(cash)
  })
  it('the lift stops at three leads', () => {
    const s = base(1)
    for (let i = 0; i < 6; i++) add(s, 'shiftLead', 3)
    expect(leadMul(s)).toBeCloseTo(1.12)
  })
})

describe('more people and higher levels keep counting', () => {
  it('a second butcher and higher levels add a little', () => {
    const s = base(1)
    add(s, 'butcher', 1)
    const one = crewStrength(s, 'butcher')
    s.staff[0]!.level = 10
    expect(crewStrength(s, 'butcher')).toBeGreaterThan(one)
  })
})

describe('hiring is gated by the system a role works for', () => {
  it('paralegals need the Courthouse open', () => {
    const s = base(2)
    s.menus.court = false
    expect(can(s, { type: 'hire', role: 'paralegal' }).ok).toBe(false)
    s.menus.court = true
    expect(can(s, { type: 'hire', role: 'paralegal' }).ok).toBe(true)
  })
})

describe('hire names', () => {
  it('uses a long list, with Connor, Luke, and Jonas as the first three hires', () => {
    expect(new Set(STAFF_NAMES).size).toBe(STAFF_NAMES.length)
    expect(STAFF_NAMES.length).toBeGreaterThan(100)
    expect(staffName(1)).toBe('Connor')
    expect(staffName(2)).toBe('Luke')
    expect(staffName(3)).toBe('Jonas')
    const firstRound = Array.from({ length: STAFF_NAMES.length }, (_, i) => staffName(i + 1))
    expect(new Set(firstRound).size).toBe(STAFF_NAMES.length)
    expect(staffName(STAFF_NAMES.length + 1)).toMatch(/ 2$/)
  })

  it('gives Connor, Luke, and Jonas to the next open hires on a save that already has a crew', () => {
    const s = base(1)
    s.nextStaffId = 40
    add(s, 'clerk')
    expect(hireName(s, s.nextStaffId)).toBe('Connor')
    s.staff.push({ id: 2, role: 'clerk', name: 'Connor', level: 1, xp: 0, hiredAt: 0 })
    expect(hireName(s, s.nextStaffId)).toBe('Luke')
    s.staff.push({ id: 3, role: 'clerk', name: 'Luke', level: 1, xp: 0, hiredAt: 0 })
    expect(hireName(s, s.nextStaffId)).toBe('Jonas')
  })
})

describe('the hire outlook', () => {
  it('measures a cashier at the till limit and names it the best pick', () => {
    const s = base(1)
    for (let i = 0; i < 4; i++) add(s, 'clerk', 5)
    s.shelf = [{ cat: 'cans', qty: 30, age: 0 }]
    s.backroom = [{ cat: 'cans', qty: 300, age: 0 }]
    s.rates.soldPerSec = 1
    s.rates.revenuePerSec = 2
    s.ads = 60
    const o = hireOutlook(s, 'cashier')
    expect(o.lines.some((l) => l.label === 'Checkout' && l.after > l.before)).toBe(true)
    const pick = pickHire(s, ['clerk', 'stocker', 'cashier', 'security'])
    expect(pick?.role).toBe('cashier')
  })
  it('offers a swap when seats are full and a role is idle', () => {
    const s = base(1)
    for (let i = 0; i < 6; i++) add(s, 'clerk', 5)
    s.shelf = [{ cat: 'cans', qty: 30, age: 0 }]
    s.backroom = [{ cat: 'cans', qty: 300, age: 0 }]
    s.rates.revenuePerSec = 2
    const sw = swapFor(s, 'cashier', 5)
    expect(sw?.drop).toBe('clerk')
  })
})

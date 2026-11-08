import { describe, expect, it } from 'vitest'
import { INVEST } from './balance'
import { can, run } from './commands'
import { checkoutCap, investBookCap, investYieldingBalance, passbookCap, staffSeatCap, upgradeRankCap } from './formulas'
import { migrate } from './migrate'
import { basketRepEarned, deservedRepEarned, nextRepThreshold } from './reputation'
import { createInitialState } from './state'
import { tickCapital } from './systems/capital'
import { chainCheckoutBonus } from './systems/chain'

describe('balanced aisle economy', () => {
  it('low-risk invest on $10k inside the cap grows about 3%/hr, not doubles', () => {
    const s = createInitialState(42)
    s.era = 2
    s.empire.level = 5
    s.invest.unlocked = true
    s.invest.risk = 'low'
    s.invest.engineLevel = 0
    s.invest.balance = 10_000
    s.invest.peak = 10_000
    const cap = investBookCap(s)
    expect(cap).toBeGreaterThan(10_000)
    expect(investYieldingBalance(s)).toBe(10_000)

    // 3600s / 2.5s = 1440 ticks of mean return
    const ticks = Math.floor(3600 / INVEST.tickSec)
    for (let i = 0; i < ticks; i++) {
      s.invest.tickAcc = INVEST.tickSec
      tickCapital(s, 0) // tickAcc already full; need dt path
      s.invest.tickAcc = INVEST.tickSec
      // Drive one book tick via tickCapital with enough dt
    }
    // Cleaner: run tickCapital with large dt in 2.5s steps
    s.invest.balance = 10_000
    s.invest.tickAcc = 0
    s.invest.circuitBreaker = false
    for (let i = 0; i < ticks; i++) tickCapital(s, INVEST.tickSec)

    const grown = s.invest.balance
    // ~3% ± noise from vol; allow 1%–8% band
    expect(grown).toBeGreaterThan(10_000 * 1.01)
    expect(grown).toBeLessThan(10_000 * 1.08)
  })

  it('balance above the invest cap does not grow the surplus', () => {
    const s = createInitialState(7)
    s.era = 2
    s.empire.level = 1
    s.invest.unlocked = true
    s.invest.risk = 'low'
    s.invest.engineLevel = 0
    const cap = investBookCap(s)
    s.invest.balance = cap + 1_000_000
    s.invest.peak = s.invest.balance
    const before = s.invest.balance
    for (let i = 0; i < 40; i++) tickCapital(s, INVEST.tickSec)
    // Yielding portion grows a little; surplus above cap stays as float — total should not explode
    expect(s.invest.balance).toBeLessThan(before * 1.02)
    expect(s.invest.balance - cap).toBeLessThan(1_000_000 + cap * 0.02)
  })

  it('migrates a 30k-basket save to the new Reputation curve without wiping cash', () => {
    const raw = createInitialState(99)
    raw.baskets = 30_000
    raw.cash = 300_000_000
    raw.compute.unlocked = true
    raw.compute.repEarned = 6
    raw.compute.reputation = 2
    raw.compute.nextRepAt = 87_000
    raw.version = 2
    raw.invest.unlocked = true
    raw.invest.balance = 50_000_000

    const s = migrate(JSON.parse(JSON.stringify(raw)))
    expect(s.cash).toBe(300_000_000)
    expect(s.invest.balance).toBe(50_000_000)
    expect(s.baskets).toBe(30_000)
    const deserved = deservedRepEarned(30_000)
    expect(s.compute.repEarned).toBeGreaterThanOrEqual(deserved)
    expect(s.compute.nextRepAt).toBe(nextRepThreshold(basketRepEarned(s.compute.repEarned)))
    expect(s.compute.nextRepAt).toBeLessThan(50_000)
    expect(s.marketingPosture).toBe('neighborhood')
  })

  it('hire fails at the staff seat cap', () => {
    const s = createInitialState(1)
    s.menus.staff = true
    s.memos['help-wanted'] = 1
    s.cash = 10_000
    s.builds.storefront = 1 // 3 seats
    const cap = staffSeatCap(s)
    expect(cap).toBe(3)
    for (let i = 0; i < cap; i++) {
      expect(can(s, { type: 'hire', role: 'clerk' }).ok).toBe(true)
      expect(run(s, { type: 'hire', role: 'clerk' }).ok).toBe(true)
    }
    expect(can(s, { type: 'hire', role: 'clerk' }).ok).toBe(false)
    expect(can(s, { type: 'hire', role: 'clerk' }).reason).toMatch(/seats/i)
  })

  it('upgrade above Empire rank cap fails', () => {
    const s = createInitialState(2)
    s.menus.upgrades = true
    s.empire.level = 1 // rank cap 2 for non-teaching
    s.cash = 1e9
    s.upgrades['curb-appeal'] = 2
    expect(upgradeRankCap(s, 'curb-appeal')).toBe(2)
    expect(can(s, { type: 'buyUpgrade', id: 'curb-appeal' }).ok).toBe(false)
    expect(can(s, { type: 'buyUpgrade', id: 'curb-appeal' }).reason).toMatch(/Empire/i)
    // Teaching node still buyable
    s.upgrades['quick-hands'] = 0
    expect(upgradeRankCap(s, 'quick-hands')).toBe(5)
    expect(can(s, { type: 'buyUpgrade', id: 'quick-hands' }).ok).toBe(true)
  })

  it('parking expansion and throughput doctrine change formulas', () => {
    const s = createInitialState(3)
    s.era = 2
    s.expansions['side-yard'] = true
    s.expansions['parking'] = true
    s.builds.storefront = 2
    expect(staffSeatCap(s)).toBeGreaterThanOrEqual(5 + 2 + 1) // corner + yard + parking

    s.doctrines.throughput = 1
    s.staff.push({ id: 1, role: 'clerk', name: 'A', level: 1, xp: 0, hiredAt: 0 })
    // Unpack gets doctrine mul — smoke via checkout/chain
    s.stores = [
      { id: 's1', name: 'Flagship', level: 1, xp: 0, policy: 'standard', attentionShare: 0.5, drift: 0 },
      { id: 's2', name: 'Store 2', level: 1, xp: 0, policy: 'standard', attentionShare: 0.5, drift: 0 },
    ]
    expect(chainCheckoutBonus(s)).toBeGreaterThan(0)
    expect(checkoutCap(s)).toBeGreaterThan(1)
    expect(passbookCap(s)).toBeGreaterThan(2000)
  })
})

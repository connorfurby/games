import { describe, expect, it } from 'vitest'
import { DAILY_RULE_ORDER, DAILY_RULES, SAVE_VERSION } from './balance'
import { can, run } from './commands'
import { crateCost, dailyMod, deliveryTime, demandPerSec } from './formulas'
import { migrate } from './migrate'
import { createInitialState } from './state'
import { rebrand } from './systems/prestige'
import { DAILY_RULE_TEXT, dailyRuleForSeed, dailyRuleFigures } from '../content/dailyRules'
import { dailyTheme } from '@/shell/dailyStamp'

describe('daily rule', () => {
  it('is off in a normal run, so every multiplier is 1', () => {
    const s = createInitialState(7)
    expect(s.dailyRule).toBeNull()
    for (const k of ['demand', 'crateCost', 'truckTime', 'wages'] as const) expect(dailyMod(s, k)).toBe(1)
  })

  it('can be set once, before the first sale', () => {
    const s = createInitialState(7)
    expect(run(s, { type: 'setDailyRule', rule: 'payday' }).ok).toBe(true)
    expect(can(s, { type: 'setDailyRule', rule: 'stock-take' }).ok).toBe(false)
    const t = createInitialState(7)
    t.stats.sold = 3
    expect(can(t, { type: 'setDailyRule', rule: 'payday' }).ok).toBe(false)
  })

  it('moves the levers it names', () => {
    const base = createInitialState(7)
    const pay = createInitialState(7)
    run(pay, { type: 'setDailyRule', rule: 'payday' })
    expect(demandPerSec(pay)).toBeCloseTo(demandPerSec(base) * DAILY_RULES.payday.demand!, 6)
    expect(crateCost(pay, 'cans')).toBeGreaterThan(crateCost(base, 'cans'))
    const del = createInitialState(7)
    run(del, { type: 'setDailyRule', rule: 'delivery-day' })
    expect(deliveryTime(del, 'a')).toBeLessThan(deliveryTime(base, 'a'))
  })

  it('every rule has an upside and a downside, and words', () => {
    for (const id of DAILY_RULE_ORDER) {
      const m = Object.values(DAILY_RULES[id])
      const good = (k: string, v: number) => (k === 'demand' ? v > 1 : v < 1)
      const entries = Object.entries(DAILY_RULES[id]) as [string, number][]
      expect(m.length).toBe(2)
      expect(entries.some(([k, v]) => good(k, v))).toBe(true)
      expect(entries.some(([k, v]) => !good(k, v))).toBe(true)
      expect(DAILY_RULE_TEXT[id].line.length).toBeGreaterThan(10)
      expect(dailyRuleFigures(id)).toMatch(/%/)
    }
  })

  it('matches the daily theme name', () => {
    for (const seed of [1, 9, 17, 4242, 123457]) {
      const name = DAILY_RULE_TEXT[dailyRuleForSeed(seed)].name.toLowerCase()
      expect(dailyTheme(seed).toLowerCase()).toContain(name)
    }
  })

  it('survives a save, and junk is dropped', () => {
    const s = createInitialState(7)
    run(s, { type: 'setDailyRule', rule: 'street-fair' })
    expect(migrate(JSON.parse(JSON.stringify(s)))?.dailyRule).toBe('street-fair')
    const raw = JSON.parse(JSON.stringify(createInitialState(7)))
    raw.dailyRule = 'free-money'
    expect(migrate(raw)?.dailyRule).toBeNull()
    expect(SAVE_VERSION).toBe(38)
  })

  it('a rebrand keeps the store name and the rule', () => {
    const s = createInitialState(7)
    run(s, { type: 'setStoreName', name: 'Penny Lane' })
    run(s, { type: 'setDailyRule', rule: 'market-day' })
    const next = rebrand(s, Date.now(), null)
    expect(next.storeName).toBe('Penny Lane')
    expect(next.dailyRule).toBe('market-day')
  })
})

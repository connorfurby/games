import { describe, expect, it } from 'vitest'
import { fuzzBot, legalCommands, recoveryCommands } from './bots'
import { run } from './commands'
import { addBatch, sumQty } from './helpers'
import { repair } from './invariants'
import { migrate } from './migrate'
import { createInitialState } from './state'
import { progressMetric } from './systems/recovery'
import { applyOffline } from './tick'

describe('softlock fuzz + save/offline (H4 / Q3)', () => {
  it(
    'fuzzBot: 500–2000 random legal ticks never softlock / NaN cash',
    () => {
      const wall0 = Date.now()
      const seeds = [1, 2, 3, 11, 42]
      const ticks = 800
      for (const seed of seeds) {
        const baseline = createInitialState(seed)
        const metric0 = progressMetric(baseline)
        const intervention0 = baseline.recovery.lastInterventionAt
        const r = fuzzBot(seed, ticks, 1)
        expect(r.ok, r.detail).toBe(true)
        expect(Number.isFinite(r.final.cash)).toBe(true)
        expect(r.final.cash).toBeGreaterThanOrEqual(0)
        repair(r.final)
        expect(Number.isFinite(r.final.cash)).toBe(true)
        // Softlock escape after random play: metric rose, watchdog intervened,
        // or a recovery can() is still legal — never a dead end with no rail.
        const metricUp = progressMetric(r.final) > metric0
        const interventionAdvanced = r.final.recovery.lastInterventionAt > intervention0
        const recoveryLegal = recoveryCommands(r.final).length > 0
        expect(metricUp || interventionAdvanced || recoveryLegal).toBe(true)
      }
      // eslint-disable-next-line no-console
      console.log(`[fuzz] wall=${Date.now() - wall0}ms seeds=${seeds.length} ticks=${ticks}`)
    },
    120_000,
  )

  it('migrate old / corrupt saves never throw and yield v2', () => {
    expect(() => migrate(null)).not.toThrow()
    expect(migrate(null).version).toBe(2)

    const old = migrate({ version: 1, cash: 12, salesTotal: 999, seed: 3 })
    expect(old.version).toBe(2)
    expect(old.ledger.some((e) => /reset|fresh|Old save|unreadable/i.test(e.text))).toBe(true)

    const damaged = migrate({ version: 2, cash: Number.NaN, shelf: 'nope' })
    expect(damaged.version).toBe(2)
    expect(Number.isFinite(damaged.cash)).toBe(true)
  })

  it('offline 8h: produce dies, cans survive', () => {
    const s = createInitialState(21)
    s.categories.produce = true
    s.backroom = []
    s.shelf = []
    addBatch(s.shelf, 'produce', 40, 0)
    addBatch(s.shelf, 'cans', 40, 0)
    const produceBefore = sumQty(s.shelf, 'produce') + sumQty(s.backroom, 'produce')
    const cansBefore = sumQty(s.shelf, 'cans') + sumQty(s.backroom, 'cans')
    expect(produceBefore).toBe(40)
    expect(cansBefore).toBe(40)

    const receipt = applyOffline(s, 8 * 60 * 60)
    expect(receipt.cappedSeconds).toBe(8 * 60 * 60)

    const produceAfter = sumQty(s.shelf, 'produce') + sumQty(s.backroom, 'produce')
    const cansAfter = sumQty(s.shelf, 'cans') + sumQty(s.backroom, 'cans')
    expect(produceAfter).toBe(0)
    expect(cansAfter).toBeGreaterThan(0)
    expect(s.stats.spoiled).toBeGreaterThan(0)
  })

  it('legalCommands includes unpack on fresh state', () => {
    const s = createInitialState(9)
    const legal = legalCommands(s)
    expect(legal.some((c) => c.type === 'unpack')).toBe(true)
    expect(run(s, { type: 'unpack' }).ok).toBe(true)
  })
})

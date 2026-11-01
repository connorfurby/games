import { describe, expect, it } from 'vitest'
import { serializeState, deserializeState } from '@/shared/save'
import { DT } from './balance'
import { runAttentiveLoop } from './bots'
import { can, run } from './commands'
import { sumQty } from './helpers'
import { migrate } from './migrate'
import { createInitialState } from './state'
import { applyOffline, applyTick } from './tick'

describe('grocery empire sim', () => {
  it('unpack → sell → cash increases', () => {
    const s = createInitialState(42)
    const cashBefore = s.cash
    expect(sumQty(s.backroom)).toBeGreaterThan(0)
    expect(run(s, { type: 'unpack' }).ok).toBe(true)
    expect(sumQty(s.shelf)).toBeGreaterThan(0)

    for (let i = 0; i < 80; i++) applyTick(s, DT)

    expect(s.stats.sold).toBeGreaterThan(0)
    expect(s.cash).toBeGreaterThan(cashBefore)
  })

  it('migrate(null) never throws', () => {
    expect(() => migrate(null)).not.toThrow()
    const s = migrate(null)
    expect(s.version).toBe(2)
    expect(s.cash).toBeGreaterThanOrEqual(0)
  })

  it('migrate(old prototype with salesTotal) never throws', () => {
    const proto = {
      version: 1,
      cash: 50,
      salesTotal: 999,
      price: 1.5,
      seed: 7,
    }
    expect(() => migrate(proto)).not.toThrow()
    const s = migrate(proto)
    expect(s.version).toBe(2)
    expect(s.ledger.some((e) => /reset|fresh|Old save|unreadable/i.test(e.text))).toBe(true)
  })

  it('save serialize roundtrip via shared/save helpers (no localStorage)', () => {
    const s = createInitialState(99)
    run(s, { type: 'unpack' })
    s.cash = 33.45
    s.baskets = 12

    const raw = serializeState(s)
    expect(typeof raw).toBe('string')
    expect(raw.length).toBeGreaterThan(10)

    const parsed = deserializeState<typeof s>(raw)
    expect(parsed).not.toBeNull()
    expect(parsed!.cash).toBe(33.45)
    expect(parsed!.baskets).toBe(12)
    expect(parsed!.stats.unpackedManual).toBe(s.stats.unpackedManual)

    const again = migrate(parsed)
    expect(again.cash).toBeCloseTo(33.45, 2)
    expect(again.baskets).toBe(12)
  })

  it('applyOffline short elapsed produces receipt fields', () => {
    const s = createInitialState(7)
    run(s, { type: 'unpack' })
    const r = applyOffline(s, 5)
    expect(r.seconds).toBe(5)
    expect(r.cappedSeconds).toBe(5)
    expect(typeof r.sold).toBe('number')
    expect(typeof r.revenue).toBe('number')
    expect(typeof r.spoiled).toBe('number')
    expect(typeof r.wages).toBe('number')
    expect(typeof r.rent).toBe('number')
    expect(typeof r.attention).toBe('number')
    expect(typeof r.ventures).toBe('number')
    expect(typeof r.interest).toBe('number')
    expect(s.offlineReceipt).not.toBeNull()
    expect(s.offlineReceipt?.cappedSeconds).toBe(5)
  })

  it('bailout / mentorRestock ok when broke', () => {
    const s = createInitialState(3)
    s.cash = 0
    s.backroom = []
    s.shelf = []
    s.orders = []
    s.recovery.lastBailoutAt = -1e9

    expect(can(s, { type: 'mentorRestock' }).ok).toBe(true)
    expect(run(s, { type: 'mentorRestock' }).ok).toBe(true)
    expect(sumQty(s.backroom)).toBeGreaterThan(0)

    s.backroom = []
    s.shelf = []
    s.cash = 0
    expect(can(s, { type: 'bailout' }).ok).toBe(true)
    expect(run(s, { type: 'bailout' }).ok).toBe(true)
    expect(s.cash).toBeGreaterThan(0)
    expect(sumQty(s.backroom) + sumQty(s.shelf)).toBeGreaterThan(0)
  })

  it('callStarterCrate grants when shelves and backroom are dry', () => {
    const s = createInitialState(5)
    s.shelf = []
    s.backroom = []
    s.orders = []
    s.recovery.lastEmptyShelfAt = -1e9
    s.recovery.emptySec = 40

    expect(can(s, { type: 'callStarterCrate' }).ok).toBe(true)
    expect(run(s, { type: 'callStarterCrate' }).ok).toBe(true)
    expect(sumQty(s.backroom)).toBe(12)
    expect(s.recovery.lastEmptyShelfAt).toBe(s.time)
    expect(can(s, { type: 'callStarterCrate' }).ok).toBe(false)
  })

  it('dismissTip persists tipsSeen', () => {
    const s = createInitialState(8)
    s.stats.unpackedManual = 1
    expect(run(s, { type: 'dismissTip', id: 'first-unpack' }).ok).toBe(true)
    expect(s.tipsSeen['first-unpack']).toBe(true)
    expect(can(s, { type: 'dismissTip', id: 'first-unpack' }).ok).toBe(false)
  })

  it('doTutorialForMe dispatches unpack action from TUTORIALS', () => {
    const s = createInitialState(11)
    s.tutorials.active = {
      id: 'unpack',
      step: 0,
      baseline: { unpackedManual: 0 },
      startedAt: 0,
    }
    const before = s.stats.unpackedManual
    expect(run(s, { type: 'doTutorialForMe' }).ok).toBe(true)
    expect(s.stats.unpackedManual).toBeGreaterThan(before)
    expect(s.tutorials.done['unpack'] || s.tutorials.active === null || (s.tutorials.active?.step ?? 0) > 0).toBe(
      true,
    )
  })

  it('attentive bot loop sells something', () => {
    const result = runAttentiveLoop(5, 30)
    expect(result.ok).toBe(true)
    expect(result.final!.stats.sold).toBeGreaterThan(0)
  })

  it('buyUpgrade count matches N single buys (balance)', () => {
    const a = createInitialState(21)
    const b = createInitialState(21)
    a.cash = 1e6
    b.cash = 1e6
    const id = 'quick-hands'
    expect(run(a, { type: 'buyUpgrade', id, count: 3 }).ok).toBe(true)
    for (let i = 0; i < 3; i++) expect(run(b, { type: 'buyUpgrade', id }).ok).toBe(true)
    expect(a.upgrades[id]).toBe(3)
    expect(b.upgrades[id]).toBe(3)
    expect(a.cash).toBeCloseTo(b.cash, 6)
    expect(a.upgradeSpend).toBeCloseTo(b.upgradeSpend, 6)
    expect(a.stats.upgradesBought).toBe(b.stats.upgradesBought)
  })

  it('empire XP gains from sales, memos, and venture collects', () => {
    const s = createInitialState(5)
    s.cash = 1e6
    s.empire.xp = 0
    run(s, { type: 'unpack' })
    for (let i = 0; i < 120; i++) applyTick(s, DT)
    expect(s.empire.xp).toBeGreaterThan(0)

    const afterSales = s.empire.xp
    s.memos = {}
    // Prefer a cheap always-visible memo path: force ledger-tape buy via run if available
    s.compute.unlocked = true
    s.compute.attention = 1e6
    s.compute.ideas = 1e6
    const memoId = 'weather-radio'
    s.stats.weatherDays = 2
    expect(run(s, { type: 'buyMemo', id: memoId }).ok).toBe(true)
    expect(s.empire.xp).toBeGreaterThan(afterSales)

    const afterMemo = s.empire.xp
    s.ventures.coffee = { level: 1, stored: 12, lifetime: 0, carry: 0 }
    s.menus.ventures = true
    expect(run(s, { type: 'collectVenture', id: 'coffee' }).ok).toBe(true)
    expect(s.empire.xp).toBeGreaterThan(afterMemo)
  })

  it('heat ages produce faster than dairy; rain tilts cans weight', async () => {
    const { agingMul, categoryWeights, weatherSpoil } = await import('./formulas')
    const s = createInitialState(9)
    s.era = 1
    s.categories.produce = true
    s.categories.dairy = true
    s.weather.now = 'heat'
    expect(weatherSpoil(s, 'heat', 'produce')).toBeGreaterThan(weatherSpoil(s, 'heat', 'dairy'))
    expect(agingMul(s, 'shelf', 'produce')).toBeGreaterThan(agingMul(s, 'shelf', 'dairy'))

    s.weather.now = 'rain'
    const weights = categoryWeights(s)
    expect((weights.cans ?? 0)).toBeGreaterThan((weights.dairy ?? 0))
  })
})


import { describe, expect, it } from 'vitest'
import { attentiveBot, badPriceBot, hasProgressOrRecovery } from './bots'
import { sumQty } from './helpers'
import { createInitialState } from './state'

/** Sim-minute budgets (plan: clerk <20m, produce <50m, Attention <90m, lot 3–8h). CI uses dt=1s. */
const CLERK_BUDGET_SEC = 20 * 60
const PRODUCE_BUDGET_SEC = 50 * 60
const ATTENTION_BUDGET_SEC = 90 * 60
/** Generous lot budget — plan says 3–8h for attentive lot-survey / Land. */
const LOT_BUDGET_SEC = 8 * 60 * 60
const PROGRESS_BUDGET_SEC = 30 * 60

describe('Era 0–1 bots (H4 / Q3)', () => {
  it(
    'attentiveBot hits clerk then produce within plan budgets (<120s wall)',
    () => {
      const wall0 = Date.now()
      const r = attentiveBot(42, PRODUCE_BUDGET_SEC, 1)
      const wallMs = Date.now() - wall0
      expect(r.ok).toBe(true)
      expect(r.final).toBeDefined()
      expect(r.gates?.clerkAt).toBeDefined()
      expect(r.gates!.clerkAt!).toBeLessThan(CLERK_BUDGET_SEC)
      expect(r.gates?.produceAt).toBeDefined()
      expect(r.gates!.produceAt!).toBeLessThan(PRODUCE_BUDGET_SEC)
      expect(wallMs).toBeLessThan(120_000)
      // eslint-disable-next-line no-console
      console.log(`[attentive] wall=${wallMs}ms gates=${JSON.stringify(r.gates)} ${r.detail}`)
    },
    120_000,
  )

  it(
    'attentiveBot fills Attention within 90m sim',
    () => {
      const wall0 = Date.now()
      const r = attentiveBot(7, ATTENTION_BUDGET_SEC, 1)
      const wallMs = Date.now() - wall0
      const s = r.final!
      expect(r.gates?.attentionAt).toBeDefined()
      expect(r.gates!.attentionAt!).toBeLessThan(ATTENTION_BUDGET_SEC)
      expect(s.stats.attentionFilled).toBeGreaterThanOrEqual(1)
      expect(s.compute.unlocked).toBe(true)
      // eslint-disable-next-line no-console
      console.log(
        `[attentive-att] wall=${wallMs}ms gates=${JSON.stringify(r.gates)} attFilled=${s.stats.attentionFilled} ${r.detail}`,
      )
    },
    180_000,
  )

  it(
    'attentiveBot hits lot-survey / Land within 8h sim',
    () => {
      const wall0 = Date.now()
      const r = attentiveBot(7, LOT_BUDGET_SEC, 1)
      const wallMs = Date.now() - wall0
      const s = r.final!
      expect(r.gates?.attentionAt).toBeDefined()
      expect(r.gates!.attentionAt!).toBeLessThan(ATTENTION_BUDGET_SEC)
      expect(r.gates?.lotAt).toBeDefined()
      expect(r.gates!.lotAt!).toBeLessThan(LOT_BUDGET_SEC)
      const lotProgress =
        !!s.memos['lot-survey'] || !!s.menus.land || !!s.expansions['side-yard']
      expect(lotProgress).toBe(true)
      // eslint-disable-next-line no-console
      console.log(
        `[attentive-lot] wall=${wallMs}ms gates=${JSON.stringify(r.gates)} lot=${!!s.memos['lot-survey']} land=${!!s.menus.land} yard=${!!s.expansions['side-yard']} ${r.detail}`,
      )
    },
    180_000,
  )

  it(
    'badPriceBot locks $8 but still progresses via sales or recovery',
    () => {
      const wall0 = Date.now()
      const r = badPriceBot(99, PROGRESS_BUDGET_SEC, 1)
      const wallMs = Date.now() - wall0
      expect(r.ok).toBe(true)
      const s = r.final!
      expect(s.price).toBe(8)
      const progressed =
        s.stats.sold > 0 ||
        s.stats.bailouts > 0 ||
        s.stats.helperCrates > 0 ||
        s.stats.interventions > 0 ||
        s.stats.emergencyDeliveries > 0 ||
        s.staff.length > 0
      expect(progressed).toBe(true)
      expect(Number.isFinite(s.cash)).toBe(true)
      expect(hasProgressOrRecovery(s)).toBe(true)
      // eslint-disable-next-line no-console
      console.log(`[badPrice] wall=${wallMs}ms ${r.detail}`)
    },
    90_000,
  )

  it('attentiveBot short run sells and keeps stock path open', () => {
    const r = attentiveBot(5, 60, 1)
    expect(r.ok).toBe(true)
    expect(r.final!.stats.sold).toBeGreaterThan(0)
    expect(Number.isFinite(r.final!.cash)).toBe(true)
  })

  it('fresh state always has a progress or recovery action', () => {
    const s = createInitialState(1)
    expect(hasProgressOrRecovery(s)).toBe(true)
    expect(sumQty(s.backroom)).toBeGreaterThan(0)
  })
})

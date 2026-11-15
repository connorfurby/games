import { describe, expect, it } from 'vitest'
import { runPacing } from './bots'

/**
 * Pacing gate. The campaign bot is a steady, unhurried player;
 * real players beat it. Every balance change must keep these.
 *
 * Plan targets (CI windows) after Phase 2 SAVE 23:
 *   Era 1 at 35–55 min · Era 2 at 3.5–5 h · …
 *
 * Measured bot (seed 1, SAVE 23): Era 1 ≈ 40.5 min · Era 2 ≈ 3.50 h.
 *
 * LONG=1: Era 3–6 plan windows (Phase 3 SAVE 24+).
 * LONG_HORIZON=1: Era 12 in 40–50 h; assert eraAt[12].
 */
const SEEDS = [1, 42]
const MIN = 60
const H = 3600

describe('pacing (campaign bot)', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: Era 1 ≤ 55 min AND > 35 min; Era 2 ≤ 5 h AND > 3.5 h`, () => {
      const r = runPacing(seed, 5 * H)
      expect(r.eraAt[1]).toBeDefined()
      expect(r.eraAt[1]!).toBeLessThanOrEqual(55 * MIN)
      expect(r.eraAt[1]!).toBeGreaterThan(35 * MIN)
      expect(r.eraAt[2]).toBeDefined()
      expect(r.eraAt[2]!).toBeLessThanOrEqual(5 * H)
      expect(r.eraAt[2]!).toBeGreaterThan(3.5 * H)
      expect(Number.isFinite(r.final.cash)).toBe(true)
    }, 420_000)
  }

  // Full campaign. Run with LONG=1 npm test.
  it.runIf(!!import.meta.env.VITE_LONG || !!(globalThis as { process?: { env?: Record<string, string> } }).process?.env?.LONG)(
    'seed 1: Era 3–6 plan windows within 28 h',
    () => {
      const r = runPacing(1, 28 * H, 3600)
      expect(r.eraAt[3]).toBeDefined()
      expect(r.eraAt[3]!).toBeGreaterThan(8 * H)
      expect(r.eraAt[3]!).toBeLessThanOrEqual(11 * H)
      expect(r.eraAt[4]).toBeDefined()
      expect(r.eraAt[4]!).toBeGreaterThan(13 * H)
      expect(r.eraAt[4]!).toBeLessThanOrEqual(16 * H)
      expect(r.eraAt[5]).toBeDefined()
      expect(r.eraAt[5]!).toBeGreaterThan(17 * H)
      expect(r.eraAt[5]!).toBeLessThanOrEqual(21 * H)
      expect(r.eraAt[6]).toBeDefined()
      expect(r.eraAt[6]!).toBeGreaterThan(22 * H)
      expect(r.eraAt[6]!).toBeLessThanOrEqual(27 * H)
      for (let e = 1; e <= 6; e++) expect(r.eraAt[e]).toBeDefined()
    },
    1_200_000,
  )
})

/** Opt-in. LONG_HORIZON=1 npx vitest run sim/pacing.test.ts */
const LONG_HORIZON = !!(globalThis as { process?: { env?: Record<string, string> } }).process?.env
  ?.LONG_HORIZON

describe.runIf(LONG_HORIZON)('LONG_HORIZON pacing', () => {
  // Phase 5: 50h budget; Era 12 >40h ≤50h.
  it('seed 1 reaches Era 12 in 40–50 h', () => {
    const r = runPacing(1, 50 * H, 3600)
    expect(r.eraAt[7]).toBeDefined()
    expect(r.final.endingChoice === 'continue' || r.final.era >= 7).toBe(true)
    expect(r.eraAt[8]).toBeDefined()
    expect(r.final.late.planetFranchises).toBeGreaterThanOrEqual(1)
    expect(r.final.late.unpacked).toBeGreaterThanOrEqual(1)
    expect(Number.isFinite(r.final.cash)).toBe(true)
    expect(Number.isFinite(r.final.horizon.survey)).toBe(true)
    expect(r.eraAt[12]).toBeDefined()
    expect(r.eraAt[12]!).toBeGreaterThan(40 * H)
    expect(r.eraAt[12]!).toBeLessThanOrEqual(50 * H)
  }, 2_400_000)
})

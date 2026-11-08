import { describe, expect, it } from 'vitest'
import { runPacing } from './bots'

/**
 * Pacing gate. Every balance change must keep these. Targets tighten as 2.0 lands
 * (see docs/2.0-plan.md → Economy). Seeds keep it deterministic.
 */
const SEEDS = [1, 42]
const MIN = 60

describe('pacing (greedy bot)', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: reaches Era 1 within 20 min`, () => {
      const r = runPacing(seed, 25 * MIN)
      expect(r.eraAt[1]).toBeDefined()
      expect(r.eraAt[1]!).toBeLessThan(20 * MIN)
      expect(Number.isFinite(r.final.cash)).toBe(true)
    }, 120_000)
  }
})

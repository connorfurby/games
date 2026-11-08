import { describe, expect, it } from 'vitest'
import { runPacing } from './bots'

/**
 * Pacing gate (docs/2.0-plan.md → Pacing targets). The campaign bot is a steady,
 * unhurried player; real players beat it. Every balance change must keep these.
 *
 * Measured 2026-11-08 (seeds 1, 42), with trees, doctrines, rewards, projects and rival chains:
 * Era 1 ≈ 9 min · Era 2 ≈ 85 min · Era 3 ≈ 3–3.2 h · Era 4 ≈ 4.4–4.6 h · Era 5 ≈ 5.7–6 h · Era 6 ≈ 7.8–8 h.
 * After Era 6 the run continues through Rebrand (prestige), which the bot does not use.
 */
const SEEDS = [1, 42]
const MIN = 60
const H = 3600

describe('pacing (campaign bot)', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: Era 1 ≤ 20 min, Era 2 ≤ 2 h, Era 3 ≤ 4.5 h — and not trivially fast`, () => {
      const r = runPacing(seed, 4.5 * H)
      expect(r.eraAt[1]).toBeDefined()
      expect(r.eraAt[1]!).toBeLessThan(20 * MIN)
      expect(r.eraAt[2]).toBeDefined()
      expect(r.eraAt[2]!).toBeLessThan(2 * H)
      expect(r.eraAt[2]!).toBeGreaterThan(45 * MIN)
      expect(r.eraAt[3]).toBeDefined()
      expect(r.eraAt[3]!).toBeLessThan(4.5 * H)
      expect(r.eraAt[3]!).toBeGreaterThan(2 * H)
      expect(Number.isFinite(r.final.cash)).toBe(true)
    }, 300_000)
  }

  // Full campaign (~2 min per seed). Run with LONG=1 npm test.
  it.runIf(!!import.meta.env.VITE_LONG || !!(globalThis as { process?: { env?: Record<string, string> } }).process?.env?.LONG)('seed 1: whole campaign reaches Era 6 in 6–14 h', () => {
    const r = runPacing(1, 14 * H, 3600)
    expect(r.eraAt[6]).toBeDefined()
    expect(r.eraAt[6]!).toBeGreaterThan(6 * H)
    for (let e = 1; e <= 6; e++) expect(r.eraAt[e]).toBeDefined()
  }, 900_000)
})

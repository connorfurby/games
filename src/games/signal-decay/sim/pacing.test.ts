import { describe, expect, it } from 'vitest'
import { runPacing } from './bots'

const MIN = 60
const H = 3600
const SEEDS = [1]

const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env
const SD_LONG = env?.SD_LONG === '1'
const SD_HORIZON = env?.SD_HORIZON === '1'

describe('signal-decay pacing (campaign bot)', () => {
  for (const seed of SEEDS) {
    it(
      `seed ${seed}: Era 1 in 35–55 min, Era 2 in 3.5–5 h`,
      () => {
        const r = runPacing(seed, 5.5 * H)
        expect(r.eraAt[1], 'Era 1 time').toBeGreaterThan(35 * MIN)
        expect(r.eraAt[1], 'Era 1 time').toBeLessThanOrEqual(55 * MIN)
        expect(r.eraAt[2], 'Era 2 time').toBeGreaterThan(3.5 * H)
        expect(r.eraAt[2], 'Era 2 time').toBeLessThanOrEqual(5 * H)
      },
      600_000,
    )
  }

  if (SD_LONG) {
    it(
      'SD_LONG: Eras 3–6 windows',
      () => {
        const r = runPacing(1, 28 * H)
        expect(r.eraAt[3]!).toBeGreaterThan(8 * H)
        expect(r.eraAt[3]!).toBeLessThanOrEqual(11 * H)
        expect(r.eraAt[4]!).toBeGreaterThan(13 * H)
        expect(r.eraAt[4]!).toBeLessThanOrEqual(16 * H)
        expect(r.eraAt[5]!).toBeGreaterThan(17 * H)
        expect(r.eraAt[5]!).toBeLessThanOrEqual(21 * H)
        expect(r.eraAt[6]!).toBeGreaterThan(22 * H)
        expect(r.eraAt[6]!).toBeLessThanOrEqual(27 * H)
      },
      1_800_000,
    )
  }

  if (SD_HORIZON) {
    it(
      'SD_HORIZON: Era 12 in 40–50 h',
      () => {
        const r = runPacing(1, 52 * H)
        expect(r.eraAt[12]!).toBeGreaterThan(40 * H)
        expect(r.eraAt[12]!).toBeLessThanOrEqual(50 * H)
      },
      3_600_000,
    )
  }
})

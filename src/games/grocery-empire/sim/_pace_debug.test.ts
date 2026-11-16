import { describe, it } from 'vitest'
import { runPacing } from './bots'

const PACE_DEBUG = !!(globalThis as { process?: { env?: Record<string, string> } }).process?.env
  ?.PACE_DEBUG

/** Opt-in landings dump — run with: PACE_DEBUG=1 npx vitest run src/games/grocery-empire/sim/_pace_debug.test.ts */
describe.runIf(PACE_DEBUG)('pace debug', () => {
  it('prints seed-1 Era 1–6 landings', () => {
    const H = 3600
    const M = 60
    const r = runPacing(1, 28 * H)
    const fmt = (s: number | undefined) =>
      s == null ? '—' : s < H ? `${(s / M).toFixed(1)} min` : `${(s / H).toFixed(2)} h`
    // eslint-disable-next-line no-console
    console.log(
      'LANDINGS',
      Object.fromEntries([1, 2, 3, 4, 5, 6].map((e) => [e, fmt(r.eraAt[e])])),
    )
  }, 300_000)
})

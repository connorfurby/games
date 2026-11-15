import { describe, it } from 'vitest'
import { runPacing } from './bots'

/** Quarantine: opt-in with PACE_DEBUG=1. Not part of default CI. */
const ON = !!(globalThis as { process?: { env?: Record<string, string> } }).process?.env?.PACE_DEBUG

describe.runIf(ON)('_pace_debug', () => {
  it('print era clocks', () => {
    for (const seed of [1, 42]) {
      const r = runPacing(seed, 5 * 3600)
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          seed,
          era1_s: r.eraAt[1],
          era1_min: r.eraAt[1] != null ? +(r.eraAt[1]! / 60).toFixed(2) : null,
          era2_s: r.eraAt[2],
          era2_h: r.eraAt[2] != null ? +(r.eraAt[2]! / 3600).toFixed(3) : null,
          slips: r.final.depth?.layawaySlips,
          dock: r.final.depth?.dockCheckIns,
        }),
      )
    }
  }, 420_000)
})

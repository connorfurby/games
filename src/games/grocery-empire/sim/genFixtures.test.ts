import { describe, it } from 'vitest'
import { campaignCommands } from './bots'
import { can, run } from './commands'
import { applyTick } from './tick'
import { repair } from './invariants'
import { createInitialState } from './state'
import { serializeState } from '@/shared/save'

/**
 * GEN_FIXTURES=1: plays seed 1 with the campaign bot and writes late-era snapshots for DevMode
 * (eras 8–12 had no dev stage, so nobody looked at them). Not part of the normal suite.
 */
describe.runIf(!!(globalThis as { process?: { env?: Record<string, string> } }).process?.env?.GEN_FIXTURES)('gen fixtures', () => {
  it('writes era 8, 10, 11, 12 snapshots', async () => {
    const fsMod = 'node:fs'
    const { writeFileSync } = (await import(/* @vite-ignore */ fsMod)) as { writeFileSync: (p: URL, d: string) => void }
    const want = new Set([8, 10, 11, 12])
    const s = createInitialState(1, 0)
    s.introSeen = true
    for (let t = 1; t <= 52 * 3600 && want.size > 0; t++) {
      for (const cmd of campaignCommands(s, t)) if (can(s, cmd).ok) run(s, cmd)
      applyTick(s, 1)
      repair(s)
      // Snapshot a few minutes into the era so its first pages have something on them.
      for (const e of [...want]) {
        if (s.era >= e && (s.stats.eraAt?.[e] ?? t) + 600 <= t) {
          writeFileSync(new URL(`./devFixtures/era${e}.json`, import.meta.url), serializeState(s))
          want.delete(e)
        }
      }
    }
  }, 3_600_000)
})

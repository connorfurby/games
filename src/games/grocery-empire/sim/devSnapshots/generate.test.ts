// @ts-nocheck — node-only generator, run on demand: SNAPSHOTS=1 npx vitest run sim/devSnapshots
import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { campaignCommands } from '../bots'
import { can, run } from '../commands'
import { repair } from '../invariants'
import { createInitialState } from '../state'
import { applyTick } from '../tick'

it.runIf(!!process.env.SNAPSHOTS)('regenerate DevMode era snapshots', () => {
  const s = createInitialState(7, 0)
  s.introSeen = true
  const want = [1, 2, 3, 4, 5]
  const at = {}
  for (let t = 1; t <= 16 * 3600 && want.length; t++) {
    for (const cmd of campaignCommands(s, t)) if (can(s, cmd).ok) run(s, cmd)
    applyTick(s, 1)
    repair(s)
    if (at[s.era] === undefined) at[s.era] = t
    const e = want[0]
    if (s.era >= e && t >= at[e] + 600) {
      const c = JSON.parse(JSON.stringify(s))
      c.ledger = c.ledger.slice(-20)
      c.dialogueQueue = []
      c.chapterQueue = []
      c.tutorials.active = null
      c.tutorials.queue = []
      c.offlineReceipt = null
      writeFileSync(new URL(`./era${e}.json`, import.meta.url), JSON.stringify(c))
      want.shift()
    }
  }
}, 900_000)

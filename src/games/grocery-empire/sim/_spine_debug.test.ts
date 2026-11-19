import { describe, it } from 'vitest'
import { goalCash } from '../content/goals'
import { botSpine, campaignCommands, nextGoal } from './bots'
import { can, run } from './commands'
import { repair } from './invariants'
import { migrate } from './migrate'
import { applyTick } from './tick'
import { createInitialState } from './state'
import { deserializeState } from '@/shared/save'

const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env ?? {}

/** SPINE_DEBUG=1 [BOT_SPINE=hud] [SPINE_FROM=era8] [SPINE_HOURS=20]: hourly era + goal from a fixture. */
describe.runIf(!!env.SPINE_DEBUG)('spine debug', () => {
  it('timeline', async () => {
    botSpine.mode = env.BOT_SPINE === 'hud' ? 'hud' : 'inOrder'
    const fsMod = 'node:fs'
    const { readFileSync } = (await import(/* @vite-ignore */ fsMod)) as { readFileSync: (p: URL, e: string) => string }
    const from = env.SPINE_FROM ?? 'era8'
    const s =
      from === 'fresh'
        ? Object.assign(createInitialState(1, 0), { introSeen: true })
        : migrate(deserializeState(readFileSync(new URL(`./devFixtures/${from}.json`, import.meta.url), 'utf8')))
    const t0 = Math.floor(s.time)
    const H = Number(env.SPINE_HOURS ?? 20)
    const lines: string[] = []
    let lastGoal = ''
    for (let t = 1; t <= H * 3600; t++) {
      for (const cmd of campaignCommands(s, t0 + t)) if (can(s, cmd).ok) run(s, cmd)
      applyTick(s, 1)
      repair(s)
      const g = nextGoal(s)
      const id = g?.id ?? 'done'
      if (id !== lastGoal || t % 3600 === 0) {
        lines.push(`${((t0 + t) / 3600).toFixed(2)}h e${s.era} ${id} need=${Math.round(goalCash(s, g))} cash=${Math.round(s.cash)}`)
        lastGoal = id
      }
    }
    // eslint-disable-next-line no-console
    console.log('SPINE\n' + lines.join('\n'))
  }, 1_800_000)
})

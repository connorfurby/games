import { describe, it } from 'vitest'
import { nextGoal } from '../content/goals'
import { campaignCommands } from './bots'
import { can, run } from './commands'
import { repair } from './invariants'
import { createInitialState } from './state'
import { applyTick } from './tick'

const ON = !!(globalThis as { process?: { env?: Record<string, string> } }).process?.env?.WAITS_DEBUG

/**
 * WAITS_DEBUG=1: where does the first stretch of the game go quiet? A "wait" is time with no
 * meaningful command (anything but unpack/price/restock churn) and no goal change. Prints the
 * longest waits with the goal on screen, so pacing work aims at real dead air (P10-02).
 */
describe.runIf(ON)('waits debug', () => {
  it('prints dead air in the first 6 hours', () => {
    const CHURN = new Set(['unpack', 'setPrice', 'restock', 'buyWholesale', 'unpackAll', 'collectVenture', 'dockCheckIn', 'serveRegular', 'walkStore', 'trainStore', 'setFacing', 'focusRegular', 'writeOffInvoice', 'bailout', 'morningWriteOff'])
    const s = createInitialState(1, 0)
    s.introSeen = true
    let last = 0
    let lastGoal = ''
    const counts: Record<string, number> = {}
    const waits: { from: number; len: number; era: number; goal: string }[] = []
    for (let t = 1; t <= 6 * 3600; t++) {
      let acted = false
      for (const cmd of campaignCommands(s, t)) {
        if (can(s, cmd).ok) {
          run(s, cmd)
          counts[cmd.type] = (counts[cmd.type] ?? 0) + 1
          if (!CHURN.has(cmd.type)) acted = true
        }
      }
      applyTick(s, 1)
      repair(s)
      const g = nextGoal(s)?.id ?? 'done'
      if (g !== lastGoal) {
        acted = true
        lastGoal = g
      }
      if (acted) {
        if (t - last > 180) waits.push({ from: last, len: t - last, era: s.era, goal: g })
        last = t
      }
    }
    waits.sort((a, b) => b.len - a.len)
    // eslint-disable-next-line no-console
    console.log('ERA_AT', JSON.stringify(s.stats.eraAt.map((x) => +(x / 60).toFixed(1))))
    // eslint-disable-next-line no-console
    console.log('COUNTS', JSON.stringify(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 25)))
    // eslint-disable-next-line no-console
    console.log(
      'WAITS',
      waits
        .slice(0, 15)
        .map((w) => `${(w.from / 60).toFixed(0)}m +${(w.len / 60).toFixed(1)}m e${w.era} → ${w.goal}`)
        .join('\n'),
    )
  }, 600_000)
})

import { nextGoal } from '../content/goals'
import { UPGRADES } from '../content/upgrades'
import { DEPTH } from './balance'
import { can, run, type Command } from './commands'
import { repair } from './invariants'
import { createInitialState, type GameState } from './state'
import { applyTick } from './tick'

function push(s: GameState, cmds: Command[], cmd: Command) {
  if (can(s, cmd).ok) cmds.push(cmd)
}

/** Campaign bot — slow legal path. Never retunes, never signs off. */
export function campaignCommands(s: GameState, step: number): Command[] {
  const cmds: Command[] = []

  // Core air loop — hold keeps `holding` true so the buffer fills every tick.
  if (!s.air.tuned) push(s, cmds, { type: 'tune' })
  push(s, cmds, { type: 'hold' })
  if (s.air.logFill >= 1) push(s, cmds, { type: 'log' })
  if (s.air.cleanLogs > 0) push(s, cmds, { type: 'air' })
  if (s.era === 0 && s.antenna < 1 && s.depth.cleanLogsLifetime >= 3)
    push(s, cmds, { type: 'buyAntenna' })
  if (s.era === 0 && (s.upgrades['crystal-gain'] ?? 0) < 1)
    push(s, cmds, { type: 'buyUpgrade', id: 'crystal-gain' })

  // Format + callers
  if (!s.depth.featuredFormat) push(s, cmds, { type: 'setFormat', format: 'talk' })
  if (s.depth.activeCaller) {
    if (s.depth.featuredFormat !== s.depth.activeCaller.want) {
      push(s, cmds, { type: 'setFormat', format: s.depth.activeCaller.want })
    }
    push(s, cmds, { type: 'serveCaller' })
  }
  if (
    s.depth.waitingCaller &&
    s.depth.activeCaller &&
    s.depth.featuredFormat === s.depth.waitingCaller.want &&
    s.depth.featuredFormat !== s.depth.activeCaller.want
  ) {
    push(s, cmds, { type: 'focusCaller', which: 'waiting' })
  }
  push(s, cmds, { type: 'checkIn' })

  // Crew / shifts
  if (s.era >= 1 && s.crew.length < 2) push(s, cmds, { type: 'hire', role: 'board' })
  if (s.crew[0] && !s.depth.shifts.dawn)
    push(s, cmds, { type: 'assignShift', slot: 'dawn', crewId: s.crew[0].id })
  if (s.crew[1] && !s.depth.shifts.day)
    push(s, cmds, { type: 'assignShift', slot: 'day', crewId: s.crew[1].id })
  if (s.crew[0] && !s.depth.shifts.night && s.era >= 3)
    push(s, cmds, { type: 'assignShift', slot: 'night', crewId: s.crew[0].id })

  // Economy spends
  for (const u of UPGRADES) {
    if (s.era < u.era) continue
    if ((s.upgrades[u.id] ?? 0) >= 8) continue
    push(s, cmds, { type: 'buyUpgrade', id: u.id })
    break
  }
  if (s.era >= 1 && s.antenna < Math.min(3, s.era + 1)) push(s, cmds, { type: 'buyAntenna' })
  if (s.era >= 2 && s.towers.length < 2) push(s, cmds, { type: 'buyTower' })
  if (s.era >= 2 && s.towers.length >= 2 && s.towers.length < 4) push(s, cmds, { type: 'buyTower' })

  // Invoices — pay earliest unpaid
  for (const inv of s.depth.invoices) {
    if (!inv.paid) {
      push(s, cmds, { type: 'payInvoice', id: inv.id })
      break
    }
  }

  if (s.era >= 2 && !s.depth.formatCredited) push(s, cmds, { type: 'fileFormatClock' })
  if (s.era >= 2) push(s, cmds, { type: 'printPromo', band: 'mid' })
  if (s.era >= 3) {
    push(s, cmds, { type: 'signHeatLog' })
    push(s, cmds, { type: 'walkHotTrait' })
    if (s.skips < 1) push(s, cmds, { type: 'buySkip' })
  }
  if (s.era >= 4) {
    if (s.depth.examHolds < DEPTH.examHoldNeed)
      push(s, cmds, { type: 'fileManifest', kind: 'exam' })
    else if (s.depth.cleanManifests < DEPTH.cleanManifestNeed)
      push(s, cmds, { type: 'fileManifest', kind: 'clean' })
    if (s.regions < 1) push(s, cmds, { type: 'buyRegion' })
  }
  if (s.era >= 5) {
    push(s, cmds, { type: 'finishHaul' })
    if (s.birds < 1) push(s, cmds, { type: 'buyBird' })
  }
  if (s.era >= 6) {
    push(s, cmds, { type: 'stampQuiet' })
    push(s, cmds, { type: 'quietStay' })
  }
  if (s.era >= 7) {
    push(s, cmds, { type: 'serveGuestEar' })
    push(s, cmds, { type: 'hushChoir' })
    if (s.subcarriers < 1) push(s, cmds, { type: 'buySubcarrier' })
  }
  if (s.era >= 8) push(s, cmds, { type: 'settleStop', tax: 'tariff' })
  if (s.era >= 9) push(s, cmds, { type: 'doSeasonChore' })
  if (s.era >= 10) push(s, cmds, { type: 'postHabit', habit: 'talk' })
  // One Dial layer at a time — shared desk cooldown.
  if (s.era === 7) push(s, cmds, { type: 'fileDial', layer: 'reel', clever: false })
  else if (s.era === 8) push(s, cmds, { type: 'fileDial', layer: 'route', clever: false })
  else if (s.era === 9) push(s, cmds, { type: 'fileDial', layer: 'season', clever: false })
  else if (s.era >= 10) push(s, cmds, { type: 'fileDial', layer: 'phrase', clever: false })
  if (s.era >= 11) {
    push(s, cmds, { type: 'seatClause', id: `clause-${s.depth.clauseSeats + 1}` })
    push(s, cmds, { type: 'answerHearing' })
    if (s.depth.clauseSeats >= 4) push(s, cmds, { type: 'signCharter', fork: 'public' })
  }
  if (s.era >= 12) {
    if (s.dial.listLines.some((l) => !l)) push(s, cmds, { type: 'fillLine', line: 'carrier' })
    push(s, cmds, { type: 'rehearseAccept' })
    push(s, cmds, { type: 'acceptLast' })
  }

  // Goal action every few seconds
  if (step % 3 === 0) {
    const goal = nextGoal(s)
    const act = goal?.action?.(s) ?? null
    if (act && can(s, act).ok) cmds.push(act)
  }

  // Era doors
  if (can(s, { type: 'setEra', era: s.era + 1 }).ok) {
    cmds.push({ type: 'setEra', era: s.era + 1 })
  }

  return cmds
}

export type EraTimes = Partial<Record<number, number>>

export interface PacingResult {
  eraAt: EraTimes
  final: GameState
  samples: { t: number; era: number; cash: number; revPerSec: number; goal: string }[]
}

export function runPacing(seed: number, seconds: number, sampleEvery = 600): PacingResult {
  const s = createInitialState(seed, 0)
  s.introSeen = true
  const eraAt: EraTimes = { 0: 0 }
  const samples: PacingResult['samples'] = []
  for (let t = 1; t <= seconds; t++) {
    for (const cmd of campaignCommands(s, t)) {
      if (can(s, cmd).ok) run(s, cmd)
    }
    applyTick(s, 1)
    repair(s)
    if (eraAt[s.era] === undefined) eraAt[s.era] = t
    if (t % sampleEvery === 0) {
      samples.push({
        t,
        era: s.era,
        cash: s.cash,
        revPerSec: s.rates.revenuePerSec,
        goal: nextGoal(s)?.id ?? 'done',
      })
    }
  }
  return { eraAt, final: s, samples }
}

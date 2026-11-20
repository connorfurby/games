import { DEPTH, DIAL } from '../sim/balance'
import type { Command } from '../sim/commands'
import type { GameState } from '../sim/state'

export interface GoalDef {
  id: string
  title: string
  era: number
  opensEra?: number
  done: (s: GameState) => boolean
  action?: (s: GameState) => Command | null
  hint?: string
}

export const GOALS: GoalDef[] = [
  {
    id: 'first-tune',
    title: 'Tune the crystal',
    era: 0,
    done: (s) => s.air.tuned,
    action: () => ({ type: 'tune' }),
    hint: 'Find a carrier.',
  },
  {
    id: 'first-hold',
    title: 'Hold the lock',
    era: 0,
    done: (s) => s.air.lastHoldAt > 0,
    action: () => ({ type: 'hold' }),
  },
  {
    id: 'first-logs',
    title: 'Air three clean copies',
    era: 0,
    done: (s) => s.depth.cleanLogsLifetime >= 3,
    action: (s) => {
      if (s.air.cleanLogs > 0) return { type: 'air' }
      if (s.air.logFill >= 1) return { type: 'log' }
      if (!s.air.tuned) return { type: 'tune' }
      return { type: 'hold' }
    },
    hint: 'Press and hold Lock until the buffer fills, then Log and Air.',
  },
  {
    id: 'first-crystal',
    title: 'Buy Crystal Gain',
    era: 0,
    done: (s) => (s.upgrades['crystal-gain'] ?? 0) >= 1,
    action: () => ({ type: 'buyUpgrade', id: 'crystal-gain' }),
    hint: 'Stronger carrier — the shack changes.',
  },
  {
    id: 'first-antenna',
    title: 'Raise the first antenna',
    era: 0,
    done: (s) => s.antenna >= 1,
    action: () => ({ type: 'buyAntenna' }),
    hint: 'The mast goes up outside the window.',
  },
  {
    id: 'keep-airing',
    title: 'Build a log pile',
    era: 0,
    done: (s) => s.depth.cleanLogsLifetime >= 40,
    action: (s) => {
      if (s.air.cleanLogs > 0) return { type: 'air' }
      if (s.air.logFill >= 1) return { type: 'log' }
      return { type: 'hold' }
    },
  },
  {
    id: 'era0-door',
    title: 'Open the Neighborhood',
    era: 0,
    opensEra: 1,
    done: (s) =>
      s.depth.cleanLogsLifetime >= DEPTH.era0CleanLogs &&
      s.depth.deadAirDips >= DEPTH.era0DeadAirDips &&
      s.antenna >= 1,
    action: () => ({ type: 'setEra', era: 1 }),
  },
  {
    id: 'feature-format',
    title: 'Feature a format',
    era: 1,
    done: (s) => !!s.depth.featuredFormat,
    action: () => ({ type: 'setFormat', format: 'talk' }),
  },
  {
    id: 'serve-callers',
    title: 'Serve callers',
    era: 1,
    done: (s) => s.depth.callersServed >= DEPTH.era1CallersNeed,
    action: () => ({ type: 'serveCaller' }),
  },
  {
    id: 'check-ins',
    title: 'Request check-ins',
    era: 1,
    done: (s) => s.depth.checkIns >= DEPTH.era1CheckInsNeed,
    action: () => ({ type: 'checkIn' }),
  },
  {
    id: 'hire-dawn',
    title: 'Staff dawn',
    era: 1,
    done: (s) => !!s.depth.shifts.dawn,
    action: (s) => {
      if (s.crew.length === 0) return { type: 'hire', role: 'board' }
      return { type: 'assignShift', slot: 'dawn', crewId: s.crew[0]!.id }
    },
  },
  {
    id: 'era1-door',
    title: 'License the Net',
    era: 1,
    opensEra: 2,
    done: (s) =>
      s.depth.callersServed >= DEPTH.era1CallersNeed &&
      s.depth.checkIns >= DEPTH.era1CheckInsNeed &&
      s.depth.stars >= DEPTH.starMinEra1 &&
      !!s.depth.featuredFormat &&
      !!s.depth.shifts.dawn &&
      s.depth.dawnDays >= DEPTH.dawnDaysNeedEra2,
    action: () => ({ type: 'setEra', era: 2 }),
  },
  {
    id: 'first-tower',
    title: 'Raise a tower',
    era: 2,
    done: (s) => s.towers.length >= 1,
    action: () => ({ type: 'buyTower' }),
  },
  {
    id: 'second-tower',
    title: 'Second tower',
    era: 2,
    done: (s) => s.towers.length >= 2,
    action: () => ({ type: 'buyTower' }),
  },
  {
    id: 'format-clock',
    title: 'Credit the format clock',
    era: 2,
    done: (s) => s.depth.formatCredited,
    action: () => ({ type: 'fileFormatClock' }),
  },
  {
    id: 'promo-weeks',
    title: 'Run promo weeks',
    era: 2,
    done: (s) => s.depth.promoWeeks >= 3,
    action: () => ({ type: 'printPromo', band: 'mid' }),
  },
  {
    id: 'era2-door',
    title: 'Open Night Skip',
    era: 2,
    opensEra: 3,
    done: (s) =>
      s.towers.length >= 2 &&
      s.depth.formatCredited &&
      s.depth.invoicesOnTime >= 24 &&
      s.depth.dawnDays >= 32 &&
      s.depth.promoWeeks >= 8,
    action: () => ({ type: 'setEra', era: 3 }),
  },
  {
    id: 'heat-logs',
    title: 'Sign Heat Logs',
    era: 3,
    done: (s) => s.depth.heatLogs >= DEPTH.heatLogNeedEra3,
    action: () => ({ type: 'signHeatLog' }),
  },
  {
    id: 'hot-trait',
    title: 'Walk the hot trait',
    era: 3,
    done: (s) => s.depth.hotTraitWalks >= DEPTH.hotTraitWalkNeed,
    action: () => ({ type: 'walkHotTrait' }),
  },
  {
    id: 'era3-door',
    title: 'Open Band Plan',
    era: 3,
    opensEra: 4,
    done: (s) =>
      s.depth.heatLogs >= DEPTH.heatLogNeedEra3 &&
      s.depth.hotTraitWalks >= DEPTH.hotTraitWalkNeed &&
      s.depth.promoWeeks >= DEPTH.promoWeeksNeedSkip &&
      s.depth.stars >= DEPTH.starMinSkip &&
      s.skips >= 1,
    action: () => ({ type: 'setEra', era: 4 }),
  },
  {
    id: 'buy-skip',
    title: 'Buy a skip window',
    era: 3,
    done: (s) => s.skips >= 1,
    action: () => ({ type: 'buySkip' }),
  },
  {
    id: 'exam-holds',
    title: 'Exam holds',
    era: 4,
    done: (s) => s.depth.examHolds >= DEPTH.examHoldNeed,
    action: () => ({ type: 'fileManifest', kind: 'exam' }),
  },
  {
    id: 'clean-manifests',
    title: 'Clean manifests',
    era: 4,
    done: (s) => s.depth.cleanManifests >= DEPTH.cleanManifestNeed,
    action: () => ({ type: 'fileManifest', kind: 'clean' }),
  },
  {
    id: 'era4-door',
    title: 'Leave the county',
    era: 4,
    opensEra: 5,
    done: (s) =>
      s.depth.examHolds >= DEPTH.examHoldNeed &&
      s.depth.cleanManifests >= DEPTH.cleanManifestNeed &&
      s.depth.heatLogs >= DEPTH.heatLogNeedLeave &&
      s.regions >= 1,
    action: () => ({ type: 'setEra', era: 5 }),
  },
  {
    id: 'buy-region',
    title: 'Open a region',
    era: 4,
    done: (s) => s.regions >= 1,
    action: () => ({ type: 'buyRegion' }),
  },
  {
    id: 'field-hauls',
    title: 'Finish field hauls',
    era: 5,
    done: (s) => s.depth.fieldHaulsDone >= DEPTH.fieldHaulNeed,
    action: () => ({ type: 'finishHaul' }),
  },
  {
    id: 'buy-bird',
    title: 'Berth a bird',
    era: 5,
    done: (s) => s.birds >= 1,
    action: () => ({ type: 'buyBird' }),
  },
  {
    id: 'era5-door',
    title: 'Enter the Quiet',
    era: 5,
    opensEra: 6,
    done: (s) => s.depth.fieldHaulsDone >= DEPTH.fieldHaulNeed && s.birds >= 1,
    action: () => ({ type: 'setEra', era: 6 }),
  },
  {
    id: 'quiet-stamps',
    title: 'Stamp the quiet ledger',
    era: 6,
    done: (s) => s.depth.quietStamps >= DEPTH.quietStampNeed,
    action: () => ({ type: 'stampQuiet' }),
  },
  {
    id: 'era6-door',
    title: 'Stay into Subcarrier',
    era: 6,
    opensEra: 7,
    done: (s) => s.depth.quietStamps >= DEPTH.quietStampNeed,
    action: () => ({ type: 'quietStay' }),
  },
  {
    id: 'guest-ears',
    title: 'Serve guest ears',
    era: 7,
    done: (s) => s.depth.guestEars >= DEPTH.guestEarNeed,
    action: () => ({ type: 'serveGuestEar' }),
  },
  {
    id: 'credit-reels',
    title: 'Credit reels',
    era: 7,
    done: (s) => (s.dial.credited.reel ?? 0) >= DIAL.slowReels,
    action: () => ({ type: 'fileDial', layer: 'reel', clever: false }),
  },
  {
    id: 'era7-door',
    title: 'Open Packet Net',
    era: 7,
    opensEra: 8,
    done: (s) =>
      (s.dial.credited.reel ?? 0) >= DIAL.slowReels && s.depth.guestEars >= DEPTH.guestEarNeed,
    action: () => ({ type: 'setEra', era: 8 }),
  },
  {
    id: 'settles',
    title: 'Settle hops',
    era: 8,
    done: (s) => s.depth.settles >= DEPTH.settleNeed,
    action: () => ({ type: 'settleStop', tax: 'tariff' }),
  },
  {
    id: 'credit-routes',
    title: 'Credit routes',
    era: 8,
    done: (s) => (s.dial.credited.route ?? 0) >= DIAL.slowRoutes,
    action: () => ({ type: 'fileDial', layer: 'route', clever: false }),
  },
  {
    id: 'era8-door',
    title: 'Open Night Garden',
    era: 8,
    opensEra: 9,
    done: (s) =>
      (s.dial.credited.route ?? 0) >= DIAL.slowRoutes && s.depth.settles >= DEPTH.settleNeed,
    action: () => ({ type: 'setEra', era: 9 }),
  },
  {
    id: 'yield-hauls',
    title: 'Season chores',
    era: 9,
    done: (s) => s.depth.yieldHauls >= DEPTH.yieldHaulNeed,
    action: () => ({ type: 'doSeasonChore' }),
  },
  {
    id: 'credit-seasons',
    title: 'Credit seasons',
    era: 9,
    done: (s) => (s.dial.credited.season ?? 0) >= DIAL.slowSeasons,
    action: () => ({ type: 'fileDial', layer: 'season', clever: false }),
  },
  {
    id: 'era9-door',
    title: 'Open Grammar',
    era: 9,
    opensEra: 10,
    done: (s) =>
      (s.dial.credited.season ?? 0) >= DIAL.slowSeasons && s.depth.yieldHauls >= DEPTH.yieldHaulNeed,
    action: () => ({ type: 'setEra', era: 10 }),
  },
  {
    id: 'habit-watches',
    title: 'Post habit watches',
    era: 10,
    done: (s) => s.depth.habitWatches >= DEPTH.habitWatchNeed,
    action: () => ({ type: 'postHabit', habit: 'talk' }),
  },
  {
    id: 'credit-phrases',
    title: 'Credit phrases',
    era: 10,
    done: (s) => (s.dial.credited.phrase ?? 0) >= DIAL.slowPhrases,
    action: () => ({ type: 'fileDial', layer: 'phrase', clever: false }),
  },
  {
    id: 'era10-door',
    title: 'Open Charter',
    era: 10,
    opensEra: 11,
    done: (s) =>
      (s.dial.credited.phrase ?? 0) >= DIAL.slowPhrases &&
      s.depth.habitWatches >= DEPTH.habitWatchNeed,
    action: () => ({ type: 'setEra', era: 11 }),
  },
  {
    id: 'seat-clauses',
    title: 'Seat clauses',
    era: 11,
    done: (s) => s.depth.clauseSeats >= DEPTH.clauseSeatNeed,
    action: (s) => {
      const id = `clause-${s.depth.clauseSeats + 1}`
      return { type: 'seatClause', id }
    },
  },
  {
    id: 'sign-charter',
    title: 'Sign the charter',
    era: 11,
    done: (s) => !!s.depth.charterFork,
    action: () => ({ type: 'signCharter', fork: 'public' }),
  },
  {
    id: 'era11-door',
    title: 'Open Last Carrier',
    era: 11,
    opensEra: 12,
    done: (s) =>
      s.depth.clauseSeats >= DEPTH.clauseSeatNeed &&
      !!s.depth.charterFork &&
      s.depth.hearingSession >= DIAL.hearingSessions,
    action: () => ({ type: 'setEra', era: 12 }),
  },
  {
    id: 'fill-list',
    title: 'Fill the final hour',
    era: 12,
    done: (s) => s.dial.listLines.every(Boolean) && s.dial.listMean >= DIAL.acceptMean,
    action: () => ({ type: 'fillLine', line: 'carrier' }),
  },
  {
    id: 'rehearse',
    title: 'Rehearse Accept',
    era: 12,
    done: (s) => s.depth.rehearseDone,
    action: () => ({ type: 'rehearseAccept' }),
  },
  {
    id: 'accept',
    title: 'Accept the last carrier',
    era: 12,
    done: (s) => s.dial.accepted,
    action: () => ({ type: 'acceptLast' }),
  },
]

export function nextGoal(s: GameState): GoalDef | null {
  for (const g of GOALS) {
    if (g.era > s.era) continue
    if (s.goalsDone[g.id] || g.done(s)) continue
    return g
  }
  return null
}

export function syncGoals(s: GameState) {
  for (const g of GOALS) {
    if (!s.goalsDone[g.id] && g.done(s)) s.goalsDone[g.id] = true
  }
}

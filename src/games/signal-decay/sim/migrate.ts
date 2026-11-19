import { SAVE_VERSION } from './balance'
import { createInitialState, emptyAir, emptyDepth, emptyDial, type Daypart, type GameState, type TowerPolicy } from './state'

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function num(v: unknown, d: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : d
}

function bool(v: unknown, d: boolean): boolean {
  return typeof v === 'boolean' ? v : d
}

function str(v: unknown, d: string): string {
  return typeof v === 'string' ? v : d
}

/** Best-effort migrate. Never throws. */
export function migrate(raw: unknown, now = Date.now()): GameState {
  try {
    if (!isObject(raw)) return createInitialState(undefined, now)
    const seed = num(raw.seed, Date.now() % 2147483647) || 1
    const base = createInitialState(seed, now)
    try {
      base.version = SAVE_VERSION
      base.rng = num(raw.rng, seed) || seed
      base.time = num(raw.time, 0)
      base.createdAt = num(raw.createdAt, now)
      base.lastSavedAt = num(raw.lastSavedAt, now)
      base.paused = bool(raw.paused, false)
      base.speed = num(raw.speed, 1)
      base.era = Math.max(0, Math.min(12, Math.floor(num(raw.era, 0))))
      base.cash = Math.max(0, num(raw.cash, base.cash))
      base.calls = Math.max(0, num(raw.calls, 0))
      base.ear = Math.max(0, num(raw.ear, 0))
      base.lifetimeRevenue = Math.max(0, num(raw.lifetimeRevenue, 0))
      base.antenna = Math.max(0, Math.floor(num(raw.antenna, 0)))
      base.regions = Math.max(0, Math.floor(num(raw.regions, 0)))
      base.skips = Math.max(0, Math.floor(num(raw.skips, 0)))
      base.birds = Math.max(0, Math.floor(num(raw.birds, 0)))
      base.subcarriers = Math.max(0, Math.floor(num(raw.subcarriers, 0)))
      base.hasDepot = bool(raw.hasDepot, false)
      base.introSeen = bool(raw.introSeen, false)
      base.chapterSeen = Math.max(-1, Math.min(12, Math.floor(num(raw.chapterSeen, -1))))
      base.listenerTrust = Math.max(0, num(raw.listenerTrust, 0))
      base.tournamentReadyAt = num(raw.tournamentReadyAt, 0)
      if (Array.isArray(raw.buyouts)) {
        base.buyouts = raw.buyouts.filter((x): x is string => typeof x === 'string')
      }

      if (isObject(raw.archive)) {
        base.archive.level = Math.max(1, Math.floor(num(raw.archive.level, 1)))
        base.archive.xp = Math.max(0, num(raw.archive.xp, 0))
      }
      if (isObject(raw.upgrades)) {
        for (const [k, v] of Object.entries(raw.upgrades)) {
          if (typeof v === 'number' && v > 0) base.upgrades[k] = Math.floor(v)
        }
      }
      if (isObject(raw.memos)) {
        for (const [k, v] of Object.entries(raw.memos)) {
          if (v) base.memos[k] = true
        }
      }
      if (isObject(raw.goalsDone)) {
        for (const [k, v] of Object.entries(raw.goalsDone)) {
          if (v) base.goalsDone[k] = true
        }
      }
      if (isObject(raw.menus)) {
        for (const [k, v] of Object.entries(raw.menus)) {
          if (v) base.menus[k] = true
        }
      }
      if (Array.isArray(raw.doctrines)) {
        base.doctrines = raw.doctrines.filter((d): d is string => typeof d === 'string')
      }
      if (isObject(raw.prestigeCarry)) {
        const kind = raw.prestigeCarry.type
        const id = raw.prestigeCarry.id
        if ((kind === 'doctrine' || kind === 'facing') && typeof id === 'string') {
          base.prestigeCarry = { type: kind, id }
        }
      }
      if (Array.isArray(raw.quietLaws)) {
        base.quietLaws = raw.quietLaws.filter(
          (d): d is GameState['quietLaws'][number] => typeof d === 'string',
        ) as GameState['quietLaws']
      }
      if (Array.isArray(raw.towers)) {
        const policies: TowerPolicy[] = ['match', 'push', 'quiet']
        base.towers = raw.towers
          .filter(isObject)
          .map((t, i) => ({
            id: str(t.id, `t${i}`),
            trait: (['commuter', 'night', 'storm', 'highway'] as const).includes(
              t.trait as 'commuter',
            )
              ? (t.trait as GameState['towers'][number]['trait'])
              : 'commuter',
            policy: policies.includes(t.policy as TowerPolicy) ? (t.policy as TowerPolicy) : null,
          }))
      }
      if (Array.isArray(raw.crew)) {
        base.crew = raw.crew.filter(isObject).map((c, i) => ({
          id: str(c.id, `c${i}`),
          role: str(c.role, 'board'),
          name: str(c.name, 'Operator'),
        }))
      }
      if (Array.isArray(raw.operators)) {
        base.operators = raw.operators.filter(isObject).map((o, i) => ({
          id: str(o.id, `op${i}`),
          name: str(o.name, 'Agent'),
          habit: (['talk', 'log', 'route', 'night'] as const).includes(o.habit as 'talk')
            ? (o.habit as GameState['operators'][number]['habit'])
            : 'talk',
        }))
      }
      if (isObject(raw.rivals)) {
        for (const [k, v] of Object.entries(raw.rivals)) {
          if (!isObject(v)) continue
          base.rivals[k] = {
            stores: Math.max(0, Math.floor(num(v.stores, 0))),
            frozenUntil: num(v.frozenUntil, 0),
          }
        }
      }
      if (isObject(raw.air)) {
        const a = emptyAir()
        a.tuned = bool(raw.air.tuned, false)
        a.frequency = num(raw.air.frequency, 88.1)
        a.carrier = Math.max(0.1, num(raw.air.carrier, 1))
        a.noise = Math.max(0, num(raw.air.noise, 0.2))
        a.heat = Math.max(0, num(raw.air.heat, 0))
        a.focus = num(raw.air.focus, 1)
        a.logFill = num(raw.air.logFill, 0)
        a.cleanLogs = Math.max(0, Math.floor(num(raw.air.cleanLogs, 0)))
        a.airingUntil = num(raw.air.airingUntil, 0)
        a.airReadyAt = num(raw.air.airReadyAt, 0)
        a.tuneReadyAt = num(raw.air.tuneReadyAt, 0)
        a.lastHoldAt = num(raw.air.lastHoldAt, 0)
        a.holding = bool(raw.air.holding, false)
        a.lastBurst = num(raw.air.lastBurst, 0)
        a.lastBurstAt = num(raw.air.lastBurstAt, 0)
        base.air = a
      }
      if (isObject(raw.depth)) {
        const d = emptyDepth()
        Object.assign(d, {
          stars: num(raw.depth.stars, d.stars),
          callersServed: Math.floor(num(raw.depth.callersServed, 0)),
          checkIns: Math.floor(num(raw.depth.checkIns, 0)),
          checkInReadyAt: num(raw.depth.checkInReadyAt, 0),
          deadAirDips: Math.floor(num(raw.depth.deadAirDips, 0)),
          cleanLogsLifetime: Math.floor(num(raw.depth.cleanLogsLifetime, 0)),
          dawnDays: Math.floor(num(raw.depth.dawnDays, 0)),
          shiftDay: Math.floor(num(raw.depth.shiftDay, 0)),
          nextCallerAt: num(raw.depth.nextCallerAt, 30),
          formatPractice: Math.floor(num(raw.depth.formatPractice, 0)),
          formatCredited: bool(raw.depth.formatCredited, false),
          invoicesOnTime: Math.floor(num(raw.depth.invoicesOnTime, 0)),
          promoUntil: num(raw.depth.promoUntil, 0),
          promoWeeks: Math.floor(num(raw.depth.promoWeeks, 0)),
          heatLogs: Math.floor(num(raw.depth.heatLogs, 0)),
          heatLogReadyAt: num(raw.depth.heatLogReadyAt, 0),
          hotTraitWalks: Math.floor(num(raw.depth.hotTraitWalks, 0)),
          examHolds: Math.floor(num(raw.depth.examHolds, 0)),
          cleanManifests: Math.floor(num(raw.depth.cleanManifests, 0)),
          fieldHaulsDone: Math.floor(num(raw.depth.fieldHaulsDone, 0)),
          quietStamps: Math.floor(num(raw.depth.quietStamps, 0)),
          guestEars: Math.floor(num(raw.depth.guestEars, 0)),
          settles: Math.floor(num(raw.depth.settles, 0)),
          yieldHauls: Math.floor(num(raw.depth.yieldHauls, 0)),
          habitWatches: Math.floor(num(raw.depth.habitWatches, 0)),
          clauseSeats: Math.floor(num(raw.depth.clauseSeats, 0)),
          rehearseDone: bool(raw.depth.rehearseDone, false),
          bedLocked: bool(raw.depth.bedLocked, false),
          hearingSession: Math.floor(num(raw.depth.hearingSession, 0)),
          lastMutationAt: num(raw.depth.lastMutationAt, 0),
        })
        if (isObject(raw.depth.shifts)) {
          d.shifts = {
            dawn: typeof raw.depth.shifts.dawn === 'string' ? raw.depth.shifts.dawn : null,
            day: typeof raw.depth.shifts.day === 'string' ? raw.depth.shifts.day : null,
            night: typeof raw.depth.shifts.night === 'string' ? raw.depth.shifts.night : null,
          }
        }
        if (typeof raw.depth.featuredFormat === 'string') {
          d.featuredFormat = raw.depth.featuredFormat as typeof d.featuredFormat
        }
        if (typeof raw.depth.promoBand === 'string') {
          d.promoBand = raw.depth.promoBand as typeof d.promoBand
        }
        if (typeof raw.depth.charterFork === 'string') {
          d.charterFork = raw.depth.charterFork as typeof d.charterFork
        }
        d.choirHushUntil = num(raw.depth.choirHushUntil, 0)
        d.laneOpen = bool(raw.depth.laneOpen, false)
        if (isObject(raw.depth.programs)) {
          const dayparts: Daypart[] = ['talk', 'record', 'night', 'weather', 'pledge', 'static']
          const programs: GameState['depth']['programs'] = {}
          for (const [k, v] of Object.entries(raw.depth.programs)) {
            if (dayparts.includes(k as Daypart) && typeof v === 'string') programs[k as Daypart] = v
          }
          d.programs = programs
        }
        if (Array.isArray(raw.depth.seatedClauses)) {
          d.seatedClauses = raw.depth.seatedClauses.filter((x): x is string => typeof x === 'string')
        }
        if (Array.isArray(raw.depth.heardClauses)) {
          d.heardClauses = raw.depth.heardClauses.filter((x): x is string => typeof x === 'string')
        }
        base.depth = d
      }
      if (isObject(raw.dial)) {
        const dial = emptyDial()
        dial.tape = num(raw.dial.tape, 0)
        dial.packet = num(raw.dial.packet, 0)
        dial.season = num(raw.dial.season, 0)
        dial.phrase = num(raw.dial.phrase, 0)
        dial.seal = num(raw.dial.seal, 0)
        dial.deskReadyAt = num(raw.dial.deskReadyAt, 0)
        dial.lastScore = num(raw.dial.lastScore, 0)
        dial.listMean = num(raw.dial.listMean, 0)
        dial.rehearsalUntil = num(raw.dial.rehearsalUntil, 0)
        dial.accepted = bool(raw.dial.accepted, false)
        dial.rejected = Math.floor(num(raw.dial.rejected, 0))
        if (isObject(raw.dial.practice)) {
          for (const [k, v] of Object.entries(raw.dial.practice)) {
            if (typeof v === 'number') dial.practice[k] = v
          }
        }
        if (isObject(raw.dial.credited)) {
          for (const [k, v] of Object.entries(raw.dial.credited)) {
            if (typeof v === 'number') dial.credited[k] = v
          }
        }
        if (Array.isArray(raw.dial.listLines)) {
          dial.listLines = raw.dial.listLines.map((x) => (typeof x === 'string' ? x : null))
        }
        base.dial = dial
      }
      return base
    } catch {
      return createInitialState(seed, now)
    }
  } catch {
    return createInitialState(undefined, now)
  }
}

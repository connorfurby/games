import { DECAY, DEPTH } from './balance'
import { clamp } from './helpers'
import type { GameState } from './state'

/** Clamp / repair state each tick and after migrate. */
export function repair(s: GameState) {
  s.cash = Math.max(0, s.cash)
  s.calls = Math.max(0, s.calls)
  s.ear = Math.max(0, s.ear)
  s.era = clamp(Math.floor(s.era), 0, 12)
  s.speed = clamp(s.speed, 0, 8)
  s.air.carrier = Math.max(0.05, s.air.carrier)
  s.air.noise = Math.max(0, s.air.noise)
  s.air.heat = clamp(s.air.heat, 0, DECAY.heatMax)
  s.air.focus = clamp(s.air.focus, 0, 1)
  s.air.logFill = clamp(s.air.logFill, 0, 1)
  s.air.cleanLogs = Math.max(0, Math.floor(s.air.cleanLogs))
  s.depth.stars = clamp(s.depth.stars, 1, 5)
  if (!s.depth.shifts) s.depth.shifts = { dawn: null, day: null, night: null }
  if (!Array.isArray(s.depth.formatSlots) || s.depth.formatSlots.length !== DEPTH.formatSlots) {
    s.depth.formatSlots = Array.from({ length: DEPTH.formatSlots }, () => null)
  }
  if (!s.depth.programs || typeof s.depth.programs !== 'object') s.depth.programs = {}
  if (typeof s.depth.choirHushUntil !== 'number') s.depth.choirHushUntil = 0
  if (typeof s.depth.laneOpen !== 'boolean') s.depth.laneOpen = false
  if (typeof s.chapterSeen !== 'number' || !Number.isFinite(s.chapterSeen)) s.chapterSeen = -1
  s.chapterSeen = clamp(Math.floor(s.chapterSeen), -1, 12)
  if (!s.rates) {
    s.rates = { revenuePerSec: 0, listenersPerSec: 0, clarity: 1, bandMul: 1, netMul: 1 }
  }
}

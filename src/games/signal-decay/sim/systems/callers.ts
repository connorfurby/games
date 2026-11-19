import { CALLERS } from '../../content/callers'
import { DEPTH } from '../balance'
import { nextRng, pick } from '../helpers'
import type { GameState } from '../state'

export function tickCallers(s: GameState, dt: number) {
  if (s.era < 1) return
  const d = s.depth

  if (d.activeCaller && s.time > d.activeCaller.patienceUntil) {
    // miss
    d.stars = Math.max(1, d.stars - 0.15)
    d.activeCaller = d.waitingCaller
    d.waitingCaller = null
  }
  if (d.waitingCaller && s.time > d.waitingCaller.patienceUntil) {
    d.stars = Math.max(1, d.stars - 0.1)
    d.waitingCaller = null
  }

  if (s.time >= d.nextCallerAt) {
    const def = pick(s, CALLERS)
    const patience = DEPTH.callerPatienceSec * (1 + (s.upgrades['caller-patience'] ?? 0) * 0.02)
    const caller = {
      id: `${def.id}-${Math.floor(s.time)}`,
      name: def.name,
      want: def.want,
      patienceUntil: s.time + patience,
      layaway: false,
    }
    if (!d.activeCaller) {
      d.activeCaller = caller
      d.nextCallerAt = s.time + DEPTH.callerVisitGapSec
    } else if (!d.waitingCaller) {
      d.waitingCaller = caller
      d.nextCallerAt = s.time + DEPTH.callerVisitGapSec * 1.4
    } else {
      d.nextCallerAt = s.time + DEPTH.callerVisitGapSec * 0.5
    }
  }

  // Shift day rollover
  const day = Math.floor(s.time / DEPTH.shiftDaySec)
  if (day > d.shiftDay) {
    if (d.shifts.dawn) d.dawnDays += day - d.shiftDay
    d.shiftDay = day
    d.bedLocked = false
    if (d.climateFacingBan && s.time >= d.climateFacingBan.until) d.climateFacingBan = null
  }

  void dt
  void nextRng
}

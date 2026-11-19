import { DECAY } from '../balance'
import { clarity } from '../helpers'
import { decayRate, holdPush } from '../formulas'
import type { GameState } from '../state'

export function tickDecay(s: GameState, dt: number) {
  if (!s.air.tuned) {
    s.air.noise = Math.max(0, s.air.noise)
    return
  }
  const rise = decayRate(s) * dt
  // Passive hold from recent hold
  const recentHold = s.time - s.air.lastHoldAt < 3 ? holdPush(s) * dt * 0.35 : 0
  s.air.noise = Math.max(0, s.air.noise + rise - recentHold)
  if (s.air.airingUntil > s.time) {
    s.air.heat = Math.min(DECAY.heatMax, s.air.heat + DECAY.heatRisePerAirSec * dt)
  } else {
    s.air.heat = Math.max(0, s.air.heat - 0.004 * dt)
  }
  const c = clarity(s)
  if (c < DECAY.clarityFloor) {
    // Era 0 is teaching Hold — don't crater Star Board before the player learns the verb.
    const nick = s.era === 0 ? DECAY.underFloorStarNick * 0.2 : DECAY.underFloorStarNick
    const floor = s.era === 0 ? 2.8 : 1
    s.depth.stars = Math.max(floor, s.depth.stars - nick * dt)
    if (s.air.airingUntil > s.time && Math.floor(s.time) !== Math.floor(s.time - dt)) {
      // count a dead-air dip when crossing under floor while airing
      if (c < DECAY.clarityFloor && s.depth.deadAirDips < 99) {
        // only bump occasionally via heat spikes — handled in tickAir
      }
    }
  }
}

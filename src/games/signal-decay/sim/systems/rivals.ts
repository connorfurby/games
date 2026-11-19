import { DEPTH } from '../balance'
import { featuredProgram } from '../../content/programs'
import type { GameState } from '../state'

/** Deterministic rival growth — one chance every 480s from seed+time. */
export function tickRivals(s: GameState, dt: number) {
  const bucket = Math.floor(s.time / 480)
  const prev = Math.floor((s.time - dt) / 480)
  if (bucket === prev) return

  const push = s.towers.filter((t) => t.policy === 'push').length
  const quiet = s.towers.filter((t) => t.policy === 'quiet').length
  if (push) s.air.noise += DEPTH.towerPushNoise * push
  if (quiet) s.air.noise = Math.max(0, s.air.noise - DEPTH.towerQuietNoise * quiet)

  const promoLive = !!s.depth.promoBand && s.time < s.depth.promoUntil
  const bold = featuredProgram(s)?.stance === 'bold'

  for (const [id, r] of Object.entries(s.rivals)) {
    if (s.time < r.frozenUntil) continue
    let threshold = 1
    // A live deep week baits Pirate onto every tick. Mid (the bot) stays the calm 2/3.
    if (id === 'pirate' && promoLive && s.depth.promoBand === 'deep') threshold = 2
    if (id === 'metrowave' && promoLive && s.depth.promoBand === 'soft') {
      s.air.noise += DEPTH.metroSoftNoise
    }
    // The Choir echoes a bold show. An open fast-manifest lane feeds the Choir and Orbital.
    if (id === 'choir' && (bold || s.depth.laneOpen)) threshold = 2
    if (id === 'orbital' && s.depth.laneOpen) threshold = 2
    if ((bucket + s.seed + id.length) % 3 <= threshold) r.stores += 1
  }
}

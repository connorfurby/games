import { DIAL } from '../balance'
import { nextRng, pick } from '../helpers'
import type { GameState } from '../state'

export function tickDial(s: GameState, _dt: number) {
  if (s.era < 7) return

  // Resolve habit watches
  const post = s.depth.postedHabit
  if (post && s.time >= post.until) {
    const holder = post.agentId
      ? s.operators.find((o) => o.id === post.agentId)
      : s.operators.find((o) => o.habit === post.habit)
    if (!holder || holder.habit !== post.habit) {
      // failed watch — nick stars
      s.depth.stars = Math.max(1, s.depth.stars - 0.1)
    }
    s.depth.postedHabit = null
  }

  // Endless mutation post-accept
  if (s.dial.accepted && s.time - s.depth.lastMutationAt >= DIAL.endlessMutateSec) {
    s.depth.lastMutationAt = s.time
    const weak = s.dial.listLines.findIndex((l) => l)
    if (weak >= 0) s.dial.listLines[weak] = null
    const filled = s.dial.listLines.filter(Boolean).length
    s.dial.listMean = filled / s.dial.listLines.length
    if (s.depth.seatedClauses.length > 0) {
      const id = pick(s, s.depth.seatedClauses)
      s.depth.endlessBan = { kind: 'clause', id }
      s.depth.seatedClauses = s.depth.seatedClauses.filter((c) => c !== id)
    }
    void nextRng
  }
}

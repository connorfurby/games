import { MEMO_BY_ID, MEMOS, type MemoDef } from '../content/memos'
import type { GameState } from './state'

/** Office capacity memos — Buy Best leaves these as deliberate desk choices. */
const SWEEP_EXCLUDE = new Set(['back-office', 'extra-archive', 'extra-analyst', 'filing-cabinet'])

export const MEMO_SWEEP_LIMIT = 40

function memoCosts(def: MemoDef, s: GameState) {
  try {
    const c = def.cost(s)
    return {
      cash: c.cash ?? 0,
      attention: c.attention ?? 0,
      ideas: c.ideas ?? 0,
    }
  } catch {
    return { cash: 0, attention: 0, ideas: 0 }
  }
}

/** Lower is better: free first, then cheapest blended cost. */
function cheapScore(def: MemoDef, s: GameState) {
  const c = memoCosts(def, s)
  return c.cash + c.attention * 0.05 + c.ideas * 2
}

/** Rough effect weight from the memo's effect string — unlocks beat flat buffs. */
function effectWeight(def: MemoDef) {
  const e = def.effect.toLowerCase()
  if (e.startsWith('opens') || e.startsWith('unlocks')) return 100
  if (e.includes('×') || e.includes('x0') || e.includes('%')) return 40
  if (e.includes('+')) return 30
  return 12
}

/**
 * Higher is better: effect weight / blended cost, then cheaper wins ties.
 * Buy Best uses this order (was cheapest-only).
 */
function valueScore(def: MemoDef, s: GameState) {
  const cost = Math.max(0.01, cheapScore(def, s))
  return effectWeight(def) / cost
}

function deskEligible(s: GameState, def: MemoDef): boolean {
  if (SWEEP_EXCLUDE.has(def.id)) return false
  if (def.era > s.era) return false
  const owned = s.memos[def.id] ?? 0
  if (owned > 0 && !def.repeatable) return false
  if (def.max != null && owned >= def.max) return false
  if (!s.memoSeen[def.id]) {
    try {
      if (!def.visible(s)) return false
    } catch {
      return false
    }
  }
  if (def.blocked?.(s)) return false
  const cost = memoCosts(def, s)
  if (cost.cash > s.cash) return false
  if (cost.attention > s.compute.attention) return false
  if (cost.ideas > s.compute.ideas) return false
  return true
}

function applyMemoBuy(s: GameState, def: MemoDef) {
  const cost = memoCosts(def, s)
  s.cash -= cost.cash
  s.compute.attention -= cost.attention
  s.compute.ideas -= cost.ideas
  s.memos[def.id] = (s.memos[def.id] ?? 0) + 1
  s.memoSeen[def.id] = true
  try {
    def.run?.(s)
  } catch {
    /* preview drafts may lack later systems */
  }
}

/** The memo Buy Best would file next (same sort as the sweep), without cloning state. */
export function pickBestMemo(s: GameState): { id: string; score: number; value: number; cheap: number } | null {
  let best: { id: string; score: number; value: number; cheap: number } | null = null
  for (const def of MEMOS) {
    if (!deskEligible(s, def)) continue
    const value = valueScore(def, s)
    const cheap = cheapScore(def, s)
    if (
      !best ||
      value > best.value + 1e-12 ||
      (Math.abs(value - best.value) <= 1e-12 && cheap < best.cheap)
    ) {
      best = { id: def.id, score: cheap, value, cheap }
    }
  }
  return best
}

export function planAffordableMemos(s: GameState, limit = MEMO_SWEEP_LIMIT): { id: string; score: number }[] {
  const draft = structuredClone(s)
  const out: { id: string; score: number }[] = []
  for (let n = 0; n < limit; n++) {
    const best = pickBestMemo(draft)
    if (!best) break
    const def = MEMO_BY_ID[best.id]
    if (!def) break
    applyMemoBuy(draft, def)
    out.push({ id: best.id, score: best.score })
  }
  return out
}

export function hasAffordableMemo(s: GameState): boolean {
  for (const def of MEMOS) {
    if (deskEligible(s, def)) return true
  }
  return false
}

export function memoSweepPreview(s: GameState): { count: number; cash: number; attention: number; ideas: number } {
  const plan = planAffordableMemos(s)
  let cash = 0
  let attention = 0
  let ideas = 0
  const draft = structuredClone(s)
  for (const step of plan) {
    const def = MEMO_BY_ID[step.id]
    if (!def) continue
    const c = memoCosts(def, draft)
    cash += c.cash
    attention += c.attention
    ideas += c.ideas
    applyMemoBuy(draft, def)
  }
  return { count: plan.length, cash, attention, ideas }
}

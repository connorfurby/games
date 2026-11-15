import type { CategoryId } from '../categories'

/** Cold-adjacent aisles prefer neighbors; bakery stays clear of household. */
const COLD_CATS: CategoryId[] = ['produce', 'dairy', 'meat', 'frozen']
const BAKERY: CategoryId = 'bakery'
const HOUSEHOLD: CategoryId = 'household'

export type FlagshipSlotCat = CategoryId | ''

export function isColdCat(cat: string): boolean {
  return COLD_CATS.includes(cat as CategoryId)
}

/** Adjacency score contribution for two neighboring slots. */
function adjacencyScore(a: string, b: string): number {
  if (!a || !b) return 0.5
  if (a === b) return 0.85
  const coldA = isColdCat(a)
  const coldB = isColdCat(b)
  if (coldA && coldB) return 1
  if ((a === BAKERY && b === HOUSEHOLD) || (a === HOUSEHOLD && b === BAKERY)) return 0
  if (coldA !== coldB) return 0.55
  return 0.7
}

/**
 * Score 0–1 for a 6-slot flagship layout.
 * Empty slots drag the score; good cold clustering and bakery/household separation lift it.
 */
export function scoreFlagship(slots: string[]): number {
  const n = Math.max(1, slots.length)
  let filled = 0
  let adj = 0
  let adjN = 0
  const cats = new Set<string>()
  for (let i = 0; i < slots.length; i++) {
    const cur = slots[i] ?? ''
    if (cur) {
      filled += 1
      cats.add(cur)
    }
    if (i + 1 < slots.length) {
      adj += adjacencyScore(cur, slots[i + 1] ?? '')
      adjN += 1
    }
  }
  const fillScore = filled / n
  const adjScore = adjN > 0 ? adj / adjN : 0.5
  const variety = Math.min(1, cats.size / Math.min(4, n))
  // Bakery next to household is a hard foul.
  let foul = 0
  for (let i = 0; i < slots.length - 1; i++) {
    const a = slots[i] ?? ''
    const b = slots[i + 1] ?? ''
    if ((a === BAKERY && b === HOUSEHOLD) || (a === HOUSEHOLD && b === BAKERY)) foul += 0.2
  }
  const raw = fillScore * 0.35 + adjScore * 0.45 + variety * 0.2 - foul
  return Math.max(0, Math.min(1, Math.round(raw * 1000) / 1000))
}

/** Safe ~0.72 layout: cold block, cans bridge, household away from bakery. */
export function standardLayout(slotCount = 6): string[] {
  const base = ['produce', 'dairy', 'cans', 'cans', 'household', 'import']
  return base.slice(0, slotCount).concat(Array(Math.max(0, slotCount - base.length)).fill(''))
}

/** Clever cold block + dry wing — targets the fast bar when aisles exist. */
export function cleverLayout(slotCount = 6): string[] {
  const base = ['produce', 'dairy', 'meat', 'frozen', 'cans', 'household']
  return base.slice(0, slotCount).concat(Array(Math.max(0, slotCount - base.length)).fill(''))
}

import type { CategoryId } from '../categories'

export interface RegularDef {
  id: string
  name: string
  /** Aisles they want stocked (any matching shelf unit counts). */
  wants: CategoryId[]
  /** Optional featured facing they notice. */
  facingId?: string
}

/** Neighborhood regulars — early campaign cast (mid-30s). */
export const REGULARS: RegularDef[] = [
  { id: 'mae', name: 'Mae', wants: ['cans'], facingId: 'tomatoes' },
  { id: 'otis', name: 'Otis', wants: ['cans'], facingId: 'beans' },
  { id: 'june', name: 'June', wants: ['cans'], facingId: 'soup' },
  { id: 'hector', name: 'Hector', wants: ['cans'] },
  { id: 'rita', name: 'Rita', wants: ['cans', 'produce'], facingId: 'apples' },
  { id: 'sam', name: 'Sam', wants: ['produce'], facingId: 'greens' },
  { id: 'nora', name: 'Nora', wants: ['produce'], facingId: 'roots' },
  { id: 'cal', name: 'Cal', wants: ['produce'] },
  { id: 'bea', name: 'Bea', wants: ['dairy'], facingId: 'milk' },
  { id: 'len', name: 'Len', wants: ['dairy'], facingId: 'yogurt' },
  { id: 'ivy', name: 'Ivy', wants: ['dairy'], facingId: 'cheese' },
  { id: 'don', name: 'Don', wants: ['cans', 'dairy'] },
  { id: 'paz', name: 'Paz', wants: ['produce', 'dairy'] },
  { id: 'wren', name: 'Wren', wants: ['cans'], facingId: 'tomatoes' },
  { id: 'gus', name: 'Gus', wants: ['cans'], facingId: 'soup' },
  { id: 'ella', name: 'Ella', wants: ['produce'], facingId: 'apples' },
  { id: 'kit', name: 'Kit', wants: ['cans', 'produce'] },
  { id: 'roy', name: 'Roy', wants: ['dairy'] },
  { id: 'ann', name: 'Ann', wants: ['cans'], facingId: 'beans' },
  { id: 'mo', name: 'Mo', wants: ['produce'], facingId: 'greens' },
  { id: 'tess', name: 'Tess', wants: ['cans'] },
  { id: 'vic', name: 'Vic', wants: ['produce', 'cans'] },
  { id: 'zoe', name: 'Zoe', wants: ['dairy', 'cans'] },
  { id: 'ned', name: 'Ned', wants: ['cans', 'produce', 'dairy'] },
  { id: 'pia', name: 'Pia', wants: ['cans'], facingId: 'tomatoes' },
  { id: 'joel', name: 'Joel', wants: ['cans'], facingId: 'beans' },
  { id: 'mira', name: 'Mira', wants: ['produce'], facingId: 'roots' },
  { id: 'ash', name: 'Ash', wants: ['dairy'], facingId: 'milk' },
  { id: 'quin', name: 'Quin', wants: ['cans', 'produce'] },
  { id: 'reed', name: 'Reed', wants: ['produce', 'dairy'] },
  { id: 'sky', name: 'Sky', wants: ['cans'], facingId: 'soup' },
  { id: 'uma', name: 'Uma', wants: ['dairy', 'produce'] },
  { id: 'wes', name: 'Wes', wants: ['cans', 'dairy'] },
  { id: 'yael', name: 'Yael', wants: ['produce'], facingId: 'apples' },
  /** Extra facing-aware guests (~40 cast). */
  { id: 'blair', name: 'Blair', wants: ['household'], facingId: 'soap-bars' },
  { id: 'cole', name: 'Cole', wants: ['household'], facingId: 'paper-goods' },
  { id: 'drew', name: 'Drew', wants: ['privateLabel'], facingId: 'house-cans' },
  { id: 'eden', name: 'Eden', wants: ['privateLabel'], facingId: 'house-staples' },
  { id: 'finn', name: 'Finn', wants: ['meat'], facingId: 'cuts' },
  { id: 'gale', name: 'Gale', wants: ['frozen'], facingId: 'veg' },
]

export const REGULAR_BY_ID: Record<string, RegularDef> = Object.fromEntries(
  REGULARS.map((r) => [r.id, r]),
)

/** Deterministic pick from seed + visit index (time). Prefers unlocked aisle wants. */
export function pickNextRegular(
  seed: number,
  time: number,
  unlocked: Partial<Record<CategoryId, boolean>>,
  seen: Record<string, number>,
): RegularDef {
  const pool = REGULARS.filter((r) => r.wants.every((c) => unlocked[c] || c === 'cans'))
  const list = pool.length > 0 ? pool : REGULARS.filter((r) => r.wants.includes('cans'))
  // Prefer least-seen, then hash pick.
  let best = list[0]!
  let bestScore = Infinity
  for (let i = 0; i < list.length; i++) {
    const r = list[i]!
    const visits = seen[r.id] ?? 0
    const h = ((seed * 1103515245 + Math.floor(time) * 12345 + i * 7919) >>> 0) % 1000
    const score = visits * 1000 + h
    if (score < bestScore) {
      bestScore = score
      best = r
    }
  }
  return best
}

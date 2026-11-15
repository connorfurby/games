/**
 * Era 9 traits, seasons, named cultivars, and the cross.
 * An intense child is a one-element list (two parents of the same trait).
 * Match is the fraction of the season's wanted traits the child has.
 * fileStandardCross is a weak year on purpose (~STANDARD_SCORE).
 */

export type TraitId = 'sweet' | 'sturdy' | 'pretty' | 'lasting' | 'rich' | 'quiet'

export type TasterId = 'quality' | 'volume'

export type SeasonIndex = 0 | 1 | 2 | 3

export const TRAIT_IDS: readonly TraitId[] = ['sweet', 'sturdy', 'pretty', 'lasting', 'rich', 'quiet']

export const SEASON_NAMES = ['Thaw', 'High Sun', 'Harvest', 'Long Dark'] as const

/** Season chores the Season Hand can save. */
export const SEASON_CHORES = ['water', 'cover', 'harvest', 'rest'] as const
export type SeasonChore = (typeof SEASON_CHORES)[number]

/** Thaw sturdy+lasting, High Sun sweet+pretty, Harvest sweet+lasting, Long Dark sturdy+pretty. */
export const SEASON_WANTS: readonly [TraitId, TraitId][] = [
  ['sturdy', 'lasting'],
  ['sweet', 'pretty'],
  ['sweet', 'lasting'],
  ['sturdy', 'pretty'],
]

export interface NamedCultivar {
  id: string
  name: string
  a: TraitId
  b: TraitId
  /** Quality line the fast gate wants. */
  qualityLine: number
}

/** Named cultivars are specific crosses — not “any child.” */
export const NAMED_CULTIVARS: readonly NamedCultivar[] = [
  { id: 'amber-loaf', name: 'Amber Loaf', a: 'sweet', b: 'sturdy', qualityLine: 0.85 },
  { id: 'glass-pear', name: 'Glass Pear', a: 'pretty', b: 'lasting', qualityLine: 0.85 },
  { id: 'quiet-cream', name: 'Quiet Cream', a: 'quiet', b: 'rich', qualityLine: 0.85 },
  { id: 'harvest-reed', name: 'Harvest Reed', a: 'lasting', b: 'rich', qualityLine: 0.85 },
  { id: 'thaw-stone', name: 'Thaw Stone', a: 'sturdy', b: 'quiet', qualityLine: 0.85 },
  { id: 'sun-ribbon', name: 'Sun Ribbon', a: 'sweet', b: 'pretty', qualityLine: 0.85 },
]

export const NAMED_BY_ID: Record<string, NamedCultivar> = Object.fromEntries(
  NAMED_CULTIVARS.map((row) => [row.id, row]),
)

/** Same parents → one trait (intense). Different parents → both, alphabetical. */
export function crossTraits(a: TraitId, b: TraitId): TraitId[] {
  if (a === b) return [a]
  return a < b ? [a, b] : [b, a]
}

/** Child matches a named cultivar recipe (order-insensitive). */
export function namedFromChild(child: readonly TraitId[]): NamedCultivar | null {
  if (child.length === 0) return null
  for (const named of NAMED_CULTIVARS) {
    const want = crossTraits(named.a, named.b)
    if (want.length !== child.length) continue
    if (want.every((t) => child.includes(t))) return named
  }
  return null
}

/**
 * Fraction of wanted traits present on the child.
 * An intense child (one trait) counts as 1 + intenseBonus for that trait.
 * Quality multiplies by 1.25 and caps at 1. Volume multiplies by 0.85.
 */
export function matchScore(
  child: readonly TraitId[],
  season: number,
  taster: TasterId | null,
  intenseBonus = 0,
): number {
  const wanted = SEASON_WANTS[season]
  if (!wanted) return 0
  const intense = child.length === 1
  let hits = 0
  for (const trait of wanted) {
    if (!child.includes(trait)) continue
    hits += intense ? 1 + intenseBonus : 1
  }
  let score = hits / wanted.length
  if (taster === 'quality') score = Math.min(1, score * 1.25)
  else if (taster === 'volume') score *= 0.85
  return score
}

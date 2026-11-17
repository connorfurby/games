/**
 * Era 11 clauses and the Standard / Boutique / Co-op fork.
 * Fair Stamp and Boutique conflict: a boutique charter is refused while fair-stamp is kept.
 * Keep 4 clauses. Some grudges cancel; some stack.
 */

export type CharterId = 'standard' | 'boutique' | 'coop'

export interface ClauseDef {
  id: string
  name: string
  blurb: string
  helpStat: string
  helpAmt: number
  /** What the clause costs you. Shown before the toggle. */
  grudge: string
  /** Clause ids this grudge cancels (pair is soft). */
  cancels?: string[]
  /** Clause ids this grudge stacks with (both hurt). */
  stacksWith?: string[]
}

export const CLAUSES: ClauseDef[] = [
  {
    id: 'open-hours',
    name: 'Open Hours',
    blurb: 'The doors stay open. Demand thickens, and so does Keel.',
    helpStat: 'demand',
    helpAmt: 0.08,
    grudge: 'Keel convoys grow 10% faster.',
    stacksWith: ['night-bell'],
  },
  {
    id: 'cold-law',
    name: 'Cold Law',
    blurb: 'A colder shelf. Seed pays for the frost.',
    helpStat: 'spoilCut',
    helpAmt: 0.1,
    grudge: 'Seed income ×0.92.',
    cancels: ['green-aisle'],
  },
  {
    id: 'fair-stamp',
    name: 'Fair Stamp',
    blurb: 'One fair margin. Clever commits are refused — the tooltip says so before you toggle.',
    helpStat: 'margin',
    helpAmt: 0.06,
    grudge: 'Puzzles only accept the standard answer.',
  },
  {
    id: 'local-shelf',
    name: 'Local Shelf',
    blurb: 'Worlds stock heavier. The planet layer runs at ×1.12, and freight thins.',
    helpStat: 'planet',
    helpAmt: 0.12,
    grudge: 'Freight per planet ×0.9.',
    stacksWith: ['dock-tithe'],
  },
  {
    id: 'night-bell',
    name: 'Night Bell',
    blurb: 'Night sales run at ×1.15. Daytime steps back.',
    helpStat: 'nightSales',
    helpAmt: 0.15,
    grudge: 'Daytime demand ×0.95.',
    stacksWith: ['open-hours'],
  },
  {
    id: 'one-price',
    name: 'One Price',
    blurb: 'Flagship elasticity eases from 1.35 toward 1.2. The tills take a cut.',
    helpStat: 'elasticity',
    helpAmt: -0.15,
    grudge: 'Venture income ×0.92.',
    cancels: ['venture-share'],
  },
  {
    id: 'green-aisle',
    name: 'Green Aisle',
    blurb: 'Named cultivars score warmer. Cold Law softens this clause.',
    helpStat: 'seed',
    helpAmt: 0.08,
    grudge: 'Survey trickle ×0.94.',
    cancels: ['cold-law'],
  },
  {
    id: 'dock-tithe',
    name: 'Dock Tithe',
    blurb: 'Bonded unpack pays more. Freight thins with Local Shelf.',
    helpStat: 'freight',
    helpAmt: 0.1,
    grudge: 'Probe cash floors rise 6%.',
    stacksWith: ['local-shelf'],
  },
  {
    id: 'venture-share',
    name: 'Venture Share',
    blurb: 'Ventures lift. One Price cancels the cut.',
    helpStat: 'venture',
    helpAmt: 0.08,
    grudge: 'Network ×0.96 while kept.',
    cancels: ['one-price'],
  },
  {
    id: 'quiet-floor',
    name: 'Quiet Floor',
    blurb: 'Scrutiny leaks slower when a diplomat sits. Empty seats still drip.',
    helpStat: 'scrutiny',
    helpAmt: -0.1,
    grudge: 'Agent wages ×1.05.',
  },
]

/** Bot charter. Lists A–C only ask for these. */
export const DEFAULT_CLAUSES = ['open-hours', 'local-shelf', 'one-price', 'cold-law'] as const

export const CLAUSE_BY_ID: Record<string, ClauseDef> = Object.fromEntries(CLAUSES.map((clause) => [clause.id, clause]))

export const CHARTERS: Record<CharterId, { id: CharterId; name: string; blurb: string; fork: string }> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    blurb: 'Network ×1.25. Only the ready-made answer is allowed, and scores stay at 72%.',
    fork: 'Network ×1.25 · standard-only puzzles.',
  },
  boutique: {
    id: 'boutique',
    name: 'Boutique',
    blurb: 'No charter network multiplier. Puzzle scores may reach 1. Excess over 0.72 multiplies that layer only, capped at ×1.5.',
    fork: 'Puzzles can score 1.',
  },
  coop: {
    id: 'coop',
    name: 'Co-op',
    blurb: 'Ventures lift ×1.12. Network multiplier cuts to ×0.92. Fair Stamp still blocks Boutique.',
    fork: 'Ventures ×1.12 · network ×0.92.',
  },
}

/** Charter ids in the order the fork offers them. */
export const CHARTER_IDS: readonly CharterId[] = ['standard', 'boutique', 'coop']

/** Active grudges after cancel pairs resolve and Minutes Clerk amendments strike theirs. */
export function activeGrudges(kept: readonly string[], amended: readonly string[] = []): ClauseDef[] {
  const set = new Set(kept)
  const out: ClauseDef[] = []
  for (const id of kept) {
    const def = CLAUSE_BY_ID[id]
    if (!def) continue
    if (amended.includes(id)) continue
    if (def.cancels?.some((other) => set.has(other))) continue
    out.push(def)
  }
  return out
}

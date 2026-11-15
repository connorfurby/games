import type { CategoryId } from '../categories'

export interface FacingDef {
  id: string
  cat: CategoryId
  name: string
  /** Multiplier on aisle pull (category weight). */
  pullMul: number
  /** Multiplier on shelf margin (price side). */
  marginMul: number
  /** Multiplier on aging / spoil speed. */
  spoilMul?: number
  /** Extra cold load when featured (Era 1+ walk-in pressure). */
  coldLoad?: number
  blurb: string
}

export const FACINGS: FacingDef[] = [
  // Era 0 — Cans
  {
    id: 'tomatoes',
    cat: 'cans',
    name: 'Tomatoes',
    pullMul: 1.12,
    marginMul: 0.94,
    blurb: 'Steady movers. More baskets, thinner ticket.',
  },
  {
    id: 'beans',
    cat: 'cans',
    name: 'Beans',
    pullMul: 1,
    marginMul: 1.08,
    blurb: 'Quiet shelf, healthier margin.',
  },
  {
    id: 'soup',
    cat: 'cans',
    name: 'Soup',
    pullMul: 1.06,
    marginMul: 1.02,
    blurb: 'Balanced pull and ticket.',
  },
  // Era 1 — Produce
  {
    id: 'apples',
    cat: 'produce',
    name: 'Apples',
    pullMul: 1.1,
    marginMul: 1,
    spoilMul: 0.95,
    coldLoad: 0.4,
    blurb: 'Reliable fruit. Mild cold load.',
  },
  {
    id: 'greens',
    cat: 'produce',
    name: 'Greens',
    pullMul: 1.2,
    marginMul: 0.92,
    spoilMul: 1.25,
    coldLoad: 0.8,
    blurb: 'Hot pull, wilts fast, wants mist.',
  },
  {
    id: 'roots',
    cat: 'produce',
    name: 'Roots',
    pullMul: 0.9,
    marginMul: 1.12,
    spoilMul: 0.8,
    coldLoad: 0.2,
    blurb: 'Tough stock. Margin over flash.',
  },
  // Era 1 — Dairy
  {
    id: 'milk',
    cat: 'dairy',
    name: 'Milk',
    pullMul: 1.15,
    marginMul: 0.96,
    spoilMul: 1.05,
    coldLoad: 1,
    blurb: 'Everyday gallons. Heavy cooler draw.',
  },
  {
    id: 'yogurt',
    cat: 'dairy',
    name: 'Yogurt',
    pullMul: 1.05,
    marginMul: 1.1,
    spoilMul: 1,
    coldLoad: 0.7,
    blurb: 'Better ticket, steady chill.',
  },
  {
    id: 'cheese',
    cat: 'dairy',
    name: 'Cheese',
    pullMul: 0.88,
    marginMul: 1.18,
    spoilMul: 0.9,
    coldLoad: 0.5,
    blurb: 'Richer margin, quieter pull.',
  },
  // Era 1 — Meat
  {
    id: 'mince',
    cat: 'meat',
    name: 'Mince',
    pullMul: 1.12,
    marginMul: 0.95,
    spoilMul: 1.15,
    coldLoad: 1.2,
    blurb: 'Fast mover. Short life without a butcher.',
  },
  {
    id: 'cuts',
    cat: 'meat',
    name: 'Cuts',
    pullMul: 0.95,
    marginMul: 1.15,
    spoilMul: 1,
    coldLoad: 1,
    blurb: 'Ticket meat. Needs walk-in coverage.',
  },
  {
    id: 'poultry',
    cat: 'meat',
    name: 'Poultry',
    pullMul: 1.05,
    marginMul: 1.05,
    spoilMul: 1.08,
    coldLoad: 1.1,
    blurb: 'Middle ground on pull and life.',
  },
  // Era 2 — Deli
  {
    id: 'sliced',
    cat: 'deli',
    name: 'Sliced',
    pullMul: 1.14,
    marginMul: 0.96,
    spoilMul: 1.2,
    coldLoad: 0.9,
    blurb: 'Fast movers off the slicer.',
  },
  {
    id: 'salads',
    cat: 'deli',
    name: 'Salads',
    pullMul: 1.05,
    marginMul: 1.08,
    spoilMul: 1.1,
    coldLoad: 0.7,
    blurb: 'Better ticket, still perishable.',
  },
  {
    id: 'platters',
    cat: 'deli',
    name: 'Platters',
    pullMul: 0.88,
    marginMul: 1.2,
    spoilMul: 0.95,
    coldLoad: 0.6,
    blurb: 'Party trays. Margin over volume.',
  },
  // Era 2 — Bakery
  {
    id: 'bread',
    cat: 'bakery',
    name: 'Bread',
    pullMul: 1.12,
    marginMul: 0.98,
    blurb: 'Morning loaves. Steady until midday.',
  },
  {
    id: 'pastries',
    cat: 'bakery',
    name: 'Pastries',
    pullMul: 1.18,
    marginMul: 1.05,
    blurb: 'Impulse sweets while the oven is hot.',
  },
  {
    id: 'cakes',
    cat: 'bakery',
    name: 'Cakes',
    pullMul: 0.85,
    marginMul: 1.22,
    blurb: 'Special-order margin, quieter pull.',
  },
  // Era 3 — Frozen
  {
    id: 'pizza',
    cat: 'frozen',
    name: 'Pizza',
    pullMul: 1.1,
    marginMul: 0.97,
    coldLoad: 1.2,
    blurb: 'Everyday freezer pull. Wants tunnel cold.',
  },
  {
    id: 'veg',
    cat: 'frozen',
    name: 'Veg',
    pullMul: 0.95,
    marginMul: 1.08,
    coldLoad: 1,
    blurb: 'Quiet bags, healthier margin.',
  },
  {
    id: 'ice-cream',
    cat: 'frozen',
    name: 'Ice Cream',
    pullMul: 1.05,
    marginMul: 1.12,
    coldLoad: 1.4,
    blurb: 'Ticket treats. Heavy freezer draw.',
  },
  // Era 4 — Import
  {
    id: 'spice',
    cat: 'import',
    name: 'Spice',
    pullMul: 0.85,
    marginMul: 1.35,
    blurb: 'Quiet tickets from far harbors.',
  },
  {
    id: 'tea',
    cat: 'import',
    name: 'Tea',
    pullMul: 0.95,
    marginMul: 1.22,
    blurb: 'Steady import pull, healthy margin.',
  },
  {
    id: 'oil-jars',
    cat: 'import',
    name: 'Oil Jars',
    pullMul: 0.78,
    marginMul: 1.4,
    blurb: 'High ticket, slow movers.',
  },
  // Household
  {
    id: 'soap-bars',
    cat: 'household',
    name: 'Soap Bars',
    pullMul: 1.1,
    marginMul: 0.96,
    blurb: 'Everyday cleaners. Steady baskets.',
  },
  {
    id: 'paper-goods',
    cat: 'household',
    name: 'Paper Goods',
    pullMul: 1,
    marginMul: 1.08,
    blurb: 'Bulky packs, healthier ticket.',
  },
  {
    id: 'lightbulbs',
    cat: 'household',
    name: 'Lightbulbs',
    pullMul: 0.88,
    marginMul: 1.18,
    blurb: 'Slow aisle, fat margin.',
  },
  // Private label
  {
    id: 'house-cans',
    cat: 'privateLabel',
    name: 'House Cans',
    pullMul: 1.12,
    marginMul: 0.95,
    blurb: 'Own-brand pull. Thinner ticket.',
  },
  {
    id: 'house-staples',
    cat: 'privateLabel',
    name: 'House Staples',
    pullMul: 1,
    marginMul: 1.1,
    blurb: 'Quiet own-brand, solid margin.',
  },
  {
    id: 'house-premium',
    cat: 'privateLabel',
    name: 'House Premium',
    pullMul: 0.9,
    marginMul: 1.22,
    blurb: 'Fancy label. Fewer units, richer ring.',
  },
  // Era 5 — Ration packs
  {
    id: 'standard-pack',
    cat: 'ration',
    name: 'Standard Pack',
    pullMul: 1.05,
    marginMul: 1,
    blurb: 'Everyday fleet ration. Medium pull.',
  },
  {
    id: 'fortified',
    cat: 'ration',
    name: 'Fortified',
    pullMul: 0.92,
    marginMul: 1.15,
    blurb: 'Richer ticket, quieter aisle.',
  },
  {
    id: 'field-kit',
    cat: 'ration',
    name: 'Field Kit',
    pullMul: 1.12,
    marginMul: 0.95,
    blurb: 'Featured packs move faster.',
  },
]

export const FACING_BY_ID: Record<string, FacingDef> = Object.fromEntries(
  FACINGS.map((f) => [f.id, f]),
)

export function facingsFor(cat: CategoryId): FacingDef[] {
  return FACINGS.filter((f) => f.cat === cat)
}

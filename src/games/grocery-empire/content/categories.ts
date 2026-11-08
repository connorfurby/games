export const CATEGORY_IDS = ['cans', 'household', 'produce', 'dairy', 'meat', 'privateLabel'] as const
export type CategoryId = (typeof CATEGORY_IDS)[number]

export interface CategoryDef {
  id: CategoryId
  name: string
  short: string
  /** One-line role for Floor / Suppliers. */
  role: string
  /** Wholesale cost relative to a can. */
  costMul: number
  /** Shelf price relative to the can price you set. */
  priceRatio: number
  /** Share of shopper interest. */
  weight: number
  /** Seconds on the shelf before it spoils. null = shelf-stable. */
  life: number | null
}

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  cans: {
    id: 'cans',
    name: 'Cans',
    short: 'CAN',
    role: 'Safe volume — no spoil, baseline margin.',
    costMul: 1,
    priceRatio: 1,
    weight: 1,
    life: null,
  },
  household: {
    id: 'household',
    name: 'Household',
    short: 'HSE',
    role: 'Low pull, no spoil, quiet margin.',
    costMul: 1.1,
    priceRatio: 1.2,
    weight: 0.5,
    life: null,
  },
  produce: {
    id: 'produce',
    name: 'Produce',
    short: 'PRD',
    role: 'High pull, cheap — spoils in about 4 minutes.',
    costMul: 0.75,
    priceRatio: 1.25,
    weight: 1.3,
    life: 240,
  },
  dairy: {
    id: 'dairy',
    name: 'Dairy',
    short: 'DRY',
    role: 'Strong ticket — spoils in about 2.5 minutes; needs a cooler.',
    costMul: 1.1,
    priceRatio: 1.9,
    weight: 0.9,
    life: 150,
  },
  meat: {
    id: 'meat',
    name: 'Meat',
    short: 'MT',
    role: 'Richest ticket, weakest pull — spoils in about 90s; needs a walk-in.',
    costMul: 2.2,
    priceRatio: 3.8,
    weight: 0.6,
    life: 90,
  },
  privateLabel: {
    id: 'privateLabel',
    name: 'Private Label',
    short: 'PL',
    role: 'Best margin, low pull, no spoil.',
    costMul: 0.6,
    priceRatio: 1.4,
    weight: 0.4,
    life: null,
  },
}

export function isPerishable(cat: CategoryId): boolean {
  return CATEGORIES[cat].life !== null
}

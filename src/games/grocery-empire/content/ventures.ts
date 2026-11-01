import type { GameState } from '../sim/state'
import { cateringAvailable, commodityDeskAvailable, ghostKitchenAvailable } from './era2'

export interface VentureDef {
  id: string
  name: string
  blurb: string
  loop: string
  /** Era/story label shown on locked teaser cards. */
  opensAt: string
  openCost: number
  levelBase: number
  levelGrowth: number
  maxLevel: number
  /** Cash per second per level at full efficiency. */
  incomePerLevel: number
  /** Income scales by this per level on top of linear. */
  levelMul: number
  /** Seconds of income the till holds before it stops filling. */
  storeSec: number
  available: (s: GameState) => boolean
  /** Produce units consumed per second per level (meal kits). */
  producePerLevel?: number
}

export const VENTURES: VentureDef[] = [
  {
    id: 'coffee',
    name: 'Coffee Cart',
    blurb: 'A cart by the door. Commuters, steam, small change.',
    loop: 'Steady cash. No stock, no spoilage. Level it whenever you have spare money.',
    opensAt: 'Coffee Cart Permit memo',
    openCost: 120,
    levelBase: 80,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 0.06,
    levelMul: 1.06,
    storeSec: 600,
    available: (s) => !!s.memos['coffee-permit'],
  },
  {
    id: 'mealkits',
    name: 'Meal Kits',
    blurb: 'Box up produce with a recipe card. Uses your oldest produce first.',
    loop: 'Pays well per unit of produce. With no produce in back it still trickles at a quarter rate.',
    opensAt: 'Meal Kit License memo (needs Produce)',
    openCost: 500,
    levelBase: 300,
    levelGrowth: 1.38,
    maxLevel: 20,
    incomePerLevel: 0.22,
    levelMul: 1.07,
    storeSec: 600,
    producePerLevel: 0.05,
    available: (s) => !!s.memos['mealkit-license'] && s.categories.produce,
  },
  {
    id: 'catering',
    name: 'Catering',
    blurb: 'Contract timers, lump payouts.',
    loop: 'Opens with a second store or Catering License. Collect when the till fills.',
    opensAt: 'Era 2',
    openCost: 5000,
    levelBase: 3000,
    levelGrowth: 1.4,
    maxLevel: 20,
    incomePerLevel: 2,
    levelMul: 1.07,
    storeSec: 900,
    available: cateringAvailable,
  },
  {
    id: 'ghost',
    name: 'Ghost Kitchen',
    blurb: 'Delivery-only menu from the depot.',
    loop: 'Needs the depot. Higher income, still a side till.',
    opensAt: 'Era 2 · Depot',
    openCost: 30000,
    levelBase: 15000,
    levelGrowth: 1.4,
    maxLevel: 20,
    incomePerLevel: 8,
    levelMul: 1.07,
    storeSec: 900,
    available: ghostKitchenAvailable,
  },
  { id: 'snacks', name: 'Private-Label Snacks', blurb: 'Your name on a chip bag.', loop: '', opensAt: 'Era 3', openCost: 1e6, levelBase: 5e5, levelGrowth: 1.4, maxLevel: 20, incomePerLevel: 200, levelMul: 1.07, storeSec: 900, available: () => false },
  {
    id: 'commodity',
    name: 'Commodity Desk',
    blurb: 'A small desk that trades flour.',
    loop: 'Opens when the investment engine is online.',
    opensAt: 'Era 2 · Invest book',
    openCost: 1e5,
    levelBase: 5e4,
    levelGrowth: 1.4,
    maxLevel: 20,
    incomePerLevel: 20,
    levelMul: 1.07,
    storeSec: 900,
    available: commodityDeskAvailable,
  },
  { id: 'coldlease', name: 'Cold-Credit Leasing', blurb: 'Rent spare cold to neighbors.', loop: '', opensAt: 'Era 3 · Tanks', openCost: 5e6, levelBase: 2e6, levelGrowth: 1.4, maxLevel: 20, incomePerLevel: 800, levelMul: 1.07, storeSec: 900, available: () => false },
  { id: 'media', name: 'Media Channel', blurb: 'Cooking show. Ideas become Brand.', loop: '', opensAt: 'Ideas gate', openCost: 2e5, levelBase: 1e5, levelGrowth: 1.4, maxLevel: 20, incomePerLevel: 40, levelMul: 1.07, storeSec: 900, available: () => false },
  { id: 'orbital', name: 'Orbital Catering', blurb: 'Feeding the crews.', loop: '', opensAt: 'Era 5', openCost: 1e12, levelBase: 5e11, levelGrowth: 1.4, maxLevel: 20, incomePerLevel: 1e8, levelMul: 1.07, storeSec: 900, available: () => false },
  { id: 'museum', name: 'Museum Shop', blurb: 'Postcards of baskets.', loop: '', opensAt: 'Legacy', openCost: 1e13, levelBase: 5e12, levelGrowth: 1.4, maxLevel: 20, incomePerLevel: 1e9, levelMul: 1.07, storeSec: 900, available: () => false },
]

export const VENTURE_BY_ID: Record<string, VentureDef> = Object.fromEntries(VENTURES.map((v) => [v.id, v]))

export function ventureLevelCost(def: VentureDef, level: number) {
  return Math.ceil(def.levelBase * Math.pow(def.levelGrowth, level - 1))
}

export function ventureIncome(def: VentureDef, level: number) {
  if (level <= 0) return 0
  return def.incomePerLevel * level * Math.pow(def.levelMul, level - 1)
}

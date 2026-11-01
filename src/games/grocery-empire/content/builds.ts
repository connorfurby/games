import type { GameState } from '../sim/state'

export const BUILD_FILTERS = ['storefront', 'storage', 'cold', 'production', 'transit', 'civic'] as const
export type BuildFilter = (typeof BUILD_FILTERS)[number]

export interface BuildTier {
  name: string
  cost: number
  upkeepPerMin: number
  effect: string
  /** Era at which this tier becomes purchasable. Later tiers show as previews. */
  era: number
}

export interface BuildTrack {
  id: BuildFilter
  name: string
  blurb: string
  /** Index 0 is "nothing built" unless startsAt > 0. */
  tiers: BuildTier[]
  visible: (s: GameState) => boolean
}

export const BUILD_TRACKS: BuildTrack[] = [
  {
    id: 'storefront',
    name: 'Storefront',
    blurb: 'The store itself. Each tier draws more shoppers and holds more on the shelf.',
    visible: () => true,
    tiers: [
      { name: 'Empty', cost: 0, upkeepPerMin: 0, effect: '', era: 0 },
      { name: 'Stall', cost: 0, upkeepPerMin: 0, effect: 'Where it starts.', era: 0 },
      { name: 'Corner Store', cost: 600, upkeepPerMin: 1, effect: '+15% demand · +20 shelf', era: 1 },
      { name: 'Standard Store', cost: 12_000, upkeepPerMin: 6, effect: '+25% demand · +60 shelf', era: 2 },
      { name: 'Supermarket', cost: 250_000, upkeepPerMin: 40, effect: '+40% demand · +200 shelf', era: 2 },
      { name: 'Hypermarket', cost: 8e6, upkeepPerMin: 600, effect: '+60% demand', era: 3 },
      { name: 'Megastore', cost: 4e8, upkeepPerMin: 9000, effect: '+80% demand', era: 4 },
      { name: 'Autonomous Hub', cost: 5e10, upkeepPerMin: 0, effect: 'Runs itself', era: 4 },
    ],
  },
  {
    id: 'storage',
    name: 'Storage',
    blurb: 'Room in back. Overfull deliveries are refused at the door, never lost.',
    visible: () => true,
    tiers: [
      { name: 'Empty', cost: 0, upkeepPerMin: 0, effect: '', era: 0 },
      { name: 'Shelf', cost: 0, upkeepPerMin: 0, effect: 'A shelf behind the counter.', era: 0 },
      { name: 'Stockroom', cost: 350, upkeepPerMin: 0.5, effect: '+60 backroom · aging −10%', era: 1 },
      { name: 'Warehouse', cost: 20_000, upkeepPerMin: 8, effect: '+400 backroom', era: 2 },
      { name: 'Regional DC', cost: 1.5e6, upkeepPerMin: 200, effect: '+5k backroom', era: 3 },
      { name: 'Orbital Cache', cost: 1e10, upkeepPerMin: 0, effect: 'Space storage', era: 5 },
    ],
  },
  {
    id: 'cold',
    name: 'Cold',
    blurb: 'Coolers slow spoilage. Dairy needs a cooler; meat needs a walk-in.',
    visible: (s) => !!s.memos['reach-in'],
    tiers: [
      { name: 'None', cost: 0, upkeepPerMin: 0, effect: '', era: 0 },
      { name: 'Reach-in Cooler', cost: 150, upkeepPerMin: 0.6, effect: 'Perishables last 25% longer · allows Dairy', era: 1 },
      { name: 'Walk-in Cooler', cost: 1_500, upkeepPerMin: 2, effect: 'Perishables last 60% longer · allows Meat', era: 1 },
      { name: 'Cold Plant', cost: 2e6, upkeepPerMin: 500, effect: 'Freshness grid', era: 3 },
      { name: 'Tank Farm', cost: 5e7, upkeepPerMin: 2000, effect: 'Cold buffer', era: 3 },
      { name: 'Cryo Hub', cost: 1e11, upkeepPerMin: 0, effect: 'Deep cold', era: 5 },
    ],
  },
  {
    id: 'production',
    name: 'Production',
    blurb: 'Grow your own. Free produce trickles into the backroom.',
    visible: (s) => s.categories.produce,
    tiers: [
      { name: 'None', cost: 0, upkeepPerMin: 0, effect: '', era: 0 },
      { name: 'Garden Plot', cost: 800, upkeepPerMin: 0.4, effect: '+1 produce / 15s', era: 1 },
      { name: 'Farm', cost: 40_000, upkeepPerMin: 10, effect: '+1 produce / s', era: 2 },
      { name: 'Dairy', cost: 300_000, upkeepPerMin: 50, effect: 'Free dairy', era: 2 },
      { name: 'Pack Line', cost: 5e6, upkeepPerMin: 300, effect: 'Packaged goods', era: 3 },
      { name: 'Factory', cost: 8e7, upkeepPerMin: 2000, effect: 'Private label', era: 3 },
    ],
  },
  {
    id: 'transit',
    name: 'Transit',
    blurb: 'Faster deliveries and bigger loads.',
    visible: (s) => s.stats.ordersPlaced >= 5,
    tiers: [
      { name: 'Walking', cost: 0, upkeepPerMin: 0, effect: '', era: 0 },
      { name: 'Cargo Bike', cost: 90, upkeepPerMin: 0.2, effect: 'Deliveries −25% time', era: 1 },
      { name: 'Van', cost: 1_200, upkeepPerMin: 1.5, effect: 'Deliveries −50% time · +12 per crate', era: 1 },
      { name: 'Truck', cost: 30_000, upkeepPerMin: 10, effect: 'Bulk orders', era: 2 },
      { name: 'Rail Slot', cost: 2e6, upkeepPerMin: 300, effect: 'Regional freight', era: 3 },
      { name: 'Freighter', cost: 1e8, upkeepPerMin: 3000, effect: 'Ocean lanes', era: 4 },
      { name: 'Barge Berth', cost: 1e11, upkeepPerMin: 0, effect: 'Seed barges', era: 5 },
    ],
  },
  {
    id: 'civic',
    name: 'Civic',
    blurb: 'Make it a place people like to stop.',
    visible: (s) => s.lifetimeRevenue >= 400,
    tiers: [
      { name: 'None', cost: 0, upkeepPerMin: 0, effect: '', era: 0 },
      { name: 'Parking', cost: 450, upkeepPerMin: 0.4, effect: '+8% demand', era: 1 },
      { name: 'Plaza', cost: 15_000, upkeepPerMin: 4, effect: '+15% demand', era: 2 },
      { name: 'HQ Wing', cost: 500_000, upkeepPerMin: 60, effect: 'Board seats', era: 2 },
      { name: 'Lobby Office', cost: 2e7, upkeepPerMin: 800, effect: 'Political capital', era: 3 },
      { name: 'Museum of Baskets', cost: 1e12, upkeepPerMin: 0, effect: 'Legacy sink', era: 6 },
    ],
  },
]

export const TRACK_BY_ID = Object.fromEntries(BUILD_TRACKS.map((t) => [t.id, t])) as Record<BuildFilter, BuildTrack>

export function buildLevel(s: GameState, id: BuildFilter): number {
  return s.builds[id] ?? 0
}

/** Early-era sell-back refund; plan: partial before Era 3, full from Era 3. */
export function refundFrac(s: GameState) {
  return s.era >= 3 ? 1 : 0.5
}

import type { RivalId } from '../rivals'

/**
 * The stock market. Every rival chain lists when it opens; suppliers and odd little
 * companies list by era. A company grows fast for about an era after it lists, then
 * settles, so the hot stocks keep changing as you climb.
 */
export interface TickerDef {
  id: string
  sym: string
  name: string
  sector: 'Rival' | 'Supplier' | 'Startup' | 'Utility' | 'Space'
  /** Lists in this era (rivals list when they open instead). */
  era: number
  rivalId?: RivalId
  /** Company value at listing, in minutes of your sales then. */
  capMin: number
  /** Price swing per minute (0.03 = calm, 0.12 = wild). */
  vol: number
  /** Dividend paid each minute, as a share of the price. */
  divPerMin: number
  /** Growth per minute while young. */
  growPerMin: number
  blurb: string
}

export const TICKERS: TickerDef[] = [
  // Rivals — list when the chain opens.
  { id: 'penny', sym: 'PNY', name: 'Penny Pantry', sector: 'Rival', era: 2, rivalId: 'penny', capMin: 40, vol: 0.06, divPerMin: 0.00032, growPerMin: 0.00167, blurb: 'Discount chain. Chalkboards and carts.' },
  { id: 'freshway', sym: 'FRW', name: 'FreshWay Markets', sector: 'Rival', era: 3, rivalId: 'freshway', capMin: 50, vol: 0.05, divPerMin: 0.0004, growPerMin: 0.00167, blurb: 'Organic, misted produce, wood floors.' },
  { id: 'megamart', sym: 'MEGA', name: 'MegaMart', sector: 'Rival', era: 4, rivalId: 'megamart', capMin: 70, vol: 0.04, divPerMin: 0.00048, growPerMin: 0.00133, blurb: 'Big box. Bigger parking lot.' },
  { id: 'halo', sym: 'HALO', name: 'Halo Grocers', sector: 'Rival', era: 5, rivalId: 'halo', capMin: 60, vol: 0.07, divPerMin: 0.00024, growPerMin: 0.002, blurb: 'Premium. Everything has a halo on it.' },
  { id: 'drift', sym: 'DRFT', name: 'Drift Markets', sector: 'Rival', era: 6, rivalId: 'drift', capMin: 55, vol: 0.08, divPerMin: 0.0002, growPerMin: 0.002, blurb: 'Floating stores. Literally.' },
  { id: 'keelmark', sym: 'KEEL', name: 'Keelmark', sector: 'Rival', era: 7, rivalId: 'keelmark', capMin: 80, vol: 0.05, divPerMin: 0.00048, growPerMin: 0.0015, blurb: 'Convoys between worlds.' },
  { id: 'verdant', sym: 'VRD', name: 'Verdant', sector: 'Rival', era: 9, rivalId: 'verdant', capMin: 70, vol: 0.07, divPerMin: 0.00032, growPerMin: 0.002, blurb: 'Seed-first grocers.' },
  { id: 'static', sym: 'STAT', name: 'Static Foods', sector: 'Rival', era: 10, rivalId: 'static', capMin: 70, vol: 0.09, divPerMin: 0.00016, growPerMin: 0.00233, blurb: 'Night-shift chain on the frequency.' },
  { id: 'concord', sym: 'CNCD', name: 'Concord', sector: 'Rival', era: 11, rivalId: 'concord', capMin: 90, vol: 0.04, divPerMin: 0.0006, growPerMin: 0.00133, blurb: 'The treaty chain. Polite. Relentless.' },
  { id: 'ration', sym: 'RTN', name: 'Ration Co.', sector: 'Rival', era: 12, rivalId: 'ration', capMin: 100, vol: 0.05, divPerMin: 0.00048, growPerMin: 0.00167, blurb: 'Grey boxes, everywhere.' },
  // Suppliers and utilities.
  { id: 'wobble', sym: 'WBL', name: 'Wobble Cart Co.', sector: 'Startup', era: 1, capMin: 20, vol: 0.1, divPerMin: 0.0, growPerMin: 0.003, blurb: 'Shopping carts. Three of every four wobble.' },
  { id: 'bluecrate', sym: 'BLU', name: 'Blue Crate Wholesale', sector: 'Supplier', era: 1, capMin: 30, vol: 0.03, divPerMin: 0.0006, growPerMin: 0.001, blurb: 'Your first wholesaler. Steady as a pallet.' },
  { id: 'gridco', sym: 'GRID', name: 'City Grid Power', sector: 'Utility', era: 2, capMin: 45, vol: 0.02, divPerMin: 0.0008, growPerMin: 0.00067, blurb: 'Keeps the coolers humming. Pays a fat dividend.' },
  { id: 'frostline', sym: 'FRST', name: 'Frostline Cold Chain', sector: 'Supplier', era: 3, capMin: 50, vol: 0.05, divPerMin: 0.0004, growPerMin: 0.00167, blurb: 'Reefer trucks and cold rooms.' },
  { id: 'adbird', sym: 'ADB', name: 'AdBird Media', sector: 'Startup', era: 4, capMin: 35, vol: 0.12, divPerMin: 0.0, growPerMin: 0.00333, blurb: 'Ads in the sky. Some fall down.' },
  { id: 'saltroute', sym: 'SALT', name: 'Salt Route Shipping', sector: 'Supplier', era: 5, capMin: 60, vol: 0.06, divPerMin: 0.00048, growPerMin: 0.00167, blurb: 'Container lanes across three seas.' },
  { id: 'robohands', sym: 'ROBO', name: 'RoboHands', sector: 'Startup', era: 6, capMin: 45, vol: 0.11, divPerMin: 0.0, growPerMin: 0.00333, blurb: 'Shelf robots. Very polite. Slightly creepy.' },
  { id: 'orbitlift', sym: 'LIFT', name: 'OrbitLift', sector: 'Space', era: 7, capMin: 70, vol: 0.08, divPerMin: 0.00024, growPerMin: 0.0025, blurb: 'Cargo to orbit, twice a minute.' },
  { id: 'galaxygold', sym: 'GGS', name: 'Galaxy Gold Seed', sector: 'Space', era: 9, capMin: 60, vol: 0.13, divPerMin: 0.0, growPerMin: 0.00367, blurb: 'Seed that grows in starlight. Allegedly.' },
  { id: 'nightwire', sym: 'WIRE', name: 'Night Wire Networks', sector: 'Utility', era: 10, capMin: 80, vol: 0.03, divPerMin: 0.0008, growPerMin: 0.001, blurb: 'Every signal between worlds runs on its cable.' },
  { id: 'lastlight', sym: 'LUX', name: 'Last Light Holdings', sector: 'Space', era: 12, capMin: 120, vol: 0.09, divPerMin: 0.0004, growPerMin: 0.00233, blurb: 'Nobody knows what they sell. Everyone buys.' },
]

export const TICKER_BY_ID: Record<string, TickerDef> = Object.fromEntries(TICKERS.map((t) => [t.id, t]))

/** Market news: {n} is the company name. Positive and negative shocks. */
export const NEWS_UP = [
  '{n} beats every forecast this quarter.',
  '{n} lands a huge new contract.',
  'A famous chef swears by {n}.',
  '{n} announces a surprise dividend.',
  'Analysts upgrade {n} to "buy everything".',
  '{n} opens in a town everyone wanted.',
  '{n} invents a cart that does not wobble.',
]
export const NEWS_DOWN = [
  '{n} recalls a whole aisle.',
  '{n} misses its numbers. Again.',
  'The CEO of {n} posts something unwise.',
  'A raccoon was found in a {n} warehouse.',
  '{n} gets a stern letter from the regulator.',
  '{n} loses a big supplier.',
  'Rumours of trouble at {n}.',
]

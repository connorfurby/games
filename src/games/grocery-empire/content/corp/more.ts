/** Stage 6 content: the lab, property, franchising, executives and crises. */

export type Lever = 'demand' | 'wages' | 'crates' | 'ventures' | 'spoil' | 'heat'

// ── Lab ──────────────────────────────────────────────────────────────────
export interface InventionDef {
  id: string
  name: string
  blurb: string
  era: number
  /** Research time at lab level 1. */
  sec: number
  /** Cost in seconds of sales. */
  costSec: number
  lever: Lever
  /** Effect once invented (exclusive). Copied by rivals: half. */
  size: number
  /** Royalties a minute if licensed, in seconds of sales. */
  royaltySec: number
}

export const INVENTIONS: InventionDef[] = [
  { id: 'nowobble', name: 'The cart that doesn’t wobble', blurb: 'Four wheels that agree with each other.', era: 1, sec: 180, costSec: 450, lever: 'demand', size: 0.03, royaltySec: 0.5 },
  { id: 'selfchill', name: 'Self-chilling cans', blurb: 'Pull the tab, it gets cold. Science!', era: 1, sec: 240, costSec: 600, lever: 'spoil', size: 0.1, royaltySec: 0.5 },
  { id: 'flavours', name: 'Twelve new ice-cream flavours', blurb: 'Including “Tuesday”. Nobody knows what it tastes like.', era: 2, sec: 300, costSec: 1000, lever: 'demand', size: 0.03, royaltySec: 0.75 },
  { id: 'robobagger', name: 'Robo-bagger', blurb: 'Puts the eggs on top. Every time.', era: 2, sec: 360, costSec: 1200, lever: 'wages', size: -0.06, royaltySec: 0.75 },
  { id: 'foreverlettuce', name: 'Forever lettuce', blurb: 'Crisp for a month. Slightly smug about it.', era: 3, sec: 420, costSec: 1500, lever: 'spoil', size: 0.15, royaltySec: 1.0 },
  { id: 'smartshelf', name: 'Smart shelves', blurb: 'They order their own crates. Cheaper, too.', era: 4, sec: 480, costSec: 2000, lever: 'crates', size: -0.05, royaltySec: 1.25 },
  { id: 'zerogbread', name: 'Zero-gravity bread', blurb: 'Crumbs that float into the bin by themselves.', era: 6, sec: 540, costSec: 2500, lever: 'ventures', size: 0.15, royaltySec: 1.5 },
  { id: 'mooncheese', name: 'Real moon cheese', blurb: 'It was never cheese. Until now.', era: 7, sec: 600, costSec: 3000, lever: 'demand', size: 0.04, royaltySec: 1.75 },
  { id: 'starsoup', name: 'Starlight soup', blurb: 'Glows faintly. Tastes like optimism.', era: 9, sec: 660, costSec: 3500, lever: 'ventures', size: 0.2, royaltySec: 2.0 },
  { id: 'teleaisle', name: 'The teleporting aisle', blurb: 'Step in at cans, step out at checkout.', era: 11, sec: 720, costSec: 4000, lever: 'demand', size: 0.05, royaltySec: 2.5 },
]

export const INVENTION_BY_ID: Record<string, InventionDef> = Object.fromEntries(INVENTIONS.map((x) => [x.id, x]))

// ── Property ─────────────────────────────────────────────────────────────
export interface LotDef {
  id: string
  name: string
  blurb: string
  era: number
  /** Price in minutes of sales at purchase. */
  priceMin: number
  /** Rent a minute while let, as a share of value. */
  rentPerMin: number
  /** Owning it near the store: shoppers bonus. */
  near: number
}

export const LOTS: LotDef[] = [
  { id: 'corner', name: 'The empty corner lot', blurb: 'Weeds, a shopping cart, potential.', era: 1, priceMin: 15, rentPerMin: 0.00067, near: 0.01 },
  { id: 'mainstreet', name: 'Shops on Main Street', blurb: 'A barber, a florist, a vacant unit.', era: 2, priceMin: 40, rentPerMin: 0.00083, near: 0.015 },
  { id: 'warehouserow', name: 'Warehouse Row', blurb: 'Brick, pallets and good light.', era: 3, priceMin: 80, rentPerMin: 0.001, near: 0.01 },
  { id: 'pier', name: 'The harbour pier', blurb: 'Gulls, fish and tourists.', era: 4, priceMin: 140, rentPerMin: 0.00093, near: 0.015 },
  { id: 'tower', name: 'Downtown tower', blurb: 'Forty floors, one great view.', era: 5, priceMin: 240, rentPerMin: 0.001, near: 0.02 },
  { id: 'ringsegment', name: 'An orbital ring segment', blurb: 'Real estate with a view of everything.', era: 7, priceMin: 400, rentPerMin: 0.00107, near: 0.02 },
  { id: 'moonplaza', name: 'Moon Plaza', blurb: 'Low gravity, high footfall.', era: 9, priceMin: 600, rentPerMin: 0.00113, near: 0.025 },
  { id: 'lastblock', name: 'The last block on Earth', blurb: 'Everyone wants it. You can have it.', era: 12, priceMin: 900, rentPerMin: 0.00117, near: 0.03 },
]

export const LOT_BY_ID: Record<string, LotDef> = Object.fromEntries(LOTS.map((x) => [x.id, x]))

export const TENANTS = [
  { id: 'cafe', name: 'A café', rentMul: 1, note: 'Steady rent. Shoppers stop by after coffee.', demand: 0.005 },
  { id: 'rival', name: 'A rival’s outlet', rentMul: 1.6, note: 'Top rent. They take a few of your shoppers.', demand: -0.01 },
  { id: 'yours', name: 'Your own annex', rentMul: 0, note: 'No rent. More room for your shoppers.', demand: 0.02 },
] as const

// ── Franchising ──────────────────────────────────────────────────────────
export const FRANCHISEE_NAMES = [
  'The Patel family', 'Big Lou', 'Two sisters from Ohio', 'A retired astronaut', 'Mrs. Kowalski', 'The Nguyen brothers',
  'A former rival manager', 'A very enthusiastic teenager', 'Chef Rosa’s cousin', 'A colony co-op', 'A robot named Kevin', 'Dot Mercer’s nephew',
]

export const FRANCHISE_TRAITS = [
  { id: 'steady', name: 'Steady', drift: 0, blurb: 'Does what the manual says.' },
  { id: 'star', name: 'A natural', drift: 0.6, blurb: 'Gets better every week.' },
  { id: 'sloppy', name: 'Sloppy', drift: -0.8, blurb: 'Loses the manual. Twice.' },
  { id: 'greedy', name: 'Greedy', drift: -0.3, blurb: 'Pays royalties late and short.' },
  { id: 'showman', name: 'A showman', drift: 0.2, blurb: 'Big openings, small details.' },
] as const

// ── Executives ───────────────────────────────────────────────────────────
export type ExecRole = 'cfo' | 'cmo' | 'coo' | 'counsel' | 'research' | 'hr'

export const EXEC_ROLES: { id: ExecRole; title: string; does: string }[] = [
  { id: 'cfo', title: 'Chief Financial Officer', does: 'Cheaper bonds, smaller trading fees, bigger dividends' },
  { id: 'cmo', title: 'Chief Marketing Officer', does: 'More shoppers; the press regains credibility faster' },
  { id: 'coo', title: 'Chief Operating Officer', does: 'Cheaper crates and wages' },
  { id: 'counsel', title: 'General Counsel', does: 'Better odds in court' },
  { id: 'research', title: 'Head of Research', does: 'The lab works faster' },
  { id: 'hr', title: 'Head of People', does: 'The union stays calm; fewer strikes' },
]

export const EXEC_TRAITS = [
  { id: 'brilliant', name: 'Brilliant', power: 1.4, salary: 1.5, risk: 0, blurb: 'Excellent. Expensive.' },
  { id: 'solid', name: 'Solid', power: 1, salary: 1, risk: 0, blurb: 'Reliable as a fridge.' },
  { id: 'cheap', name: 'Bargain', power: 0.7, salary: 0.5, risk: 0, blurb: 'Fine. Mostly.' },
  { id: 'loose', name: 'Loose cannon', power: 1.6, salary: 1.1, risk: 0.5, blurb: 'Brilliant ideas, unwise tweets.' },
  { id: 'shady', name: 'Shady', power: 1.3, salary: 0.9, risk: 0.8, blurb: 'Gets results. Don’t ask how.' },
] as const

export const EXEC_NAMES = [
  'Margo Feld', 'Dev Ashworth', 'Priya Lake', 'Tomas Reyes', 'Ingrid Vos', 'Kwame Asante', 'Lena Park', 'Hugo Strand',
  'Bea Oduya', 'Raf Molina', 'Sun Wei', 'Otto Brandt', 'Nell Carver', 'Ade Okafor', 'Yuki Tan', 'Max Holloway',
]

// ── Crises (deck lives in content/corp/crises/) ──────────────────────────
export type { CrisisDef, CrisisKind, CrisisOption } from './crises'
export { CRISES, CRISIS_BY_ID } from './crises'

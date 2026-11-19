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
  { id: 'nowobble', name: 'The cart that doesn’t wobble', blurb: 'Four wheels that agree with each other.', era: 1, sec: 180, costSec: 90, lever: 'demand', size: 0.04, royaltySec: 2 },
  { id: 'selfchill', name: 'Self-chilling cans', blurb: 'Pull the tab, it gets cold. Science!', era: 1, sec: 240, costSec: 120, lever: 'spoil', size: 0.1, royaltySec: 2 },
  { id: 'flavours', name: 'Twelve new ice-cream flavours', blurb: 'Including “Tuesday”. Nobody knows what it tastes like.', era: 2, sec: 300, costSec: 200, lever: 'demand', size: 0.05, royaltySec: 3 },
  { id: 'robobagger', name: 'Robo-bagger', blurb: 'Puts the eggs on top. Every time.', era: 2, sec: 360, costSec: 240, lever: 'wages', size: -0.06, royaltySec: 3 },
  { id: 'foreverlettuce', name: 'Forever lettuce', blurb: 'Crisp for a month. Slightly smug about it.', era: 3, sec: 420, costSec: 300, lever: 'spoil', size: 0.15, royaltySec: 4 },
  { id: 'smartshelf', name: 'Smart shelves', blurb: 'They order their own crates. Cheaper, too.', era: 4, sec: 480, costSec: 400, lever: 'crates', size: -0.05, royaltySec: 5 },
  { id: 'zerogbread', name: 'Zero-gravity bread', blurb: 'Crumbs that float into the bin by themselves.', era: 6, sec: 540, costSec: 500, lever: 'ventures', size: 0.15, royaltySec: 6 },
  { id: 'mooncheese', name: 'Real moon cheese', blurb: 'It was never cheese. Until now.', era: 7, sec: 600, costSec: 600, lever: 'demand', size: 0.06, royaltySec: 7 },
  { id: 'starsoup', name: 'Starlight soup', blurb: 'Glows faintly. Tastes like optimism.', era: 9, sec: 660, costSec: 700, lever: 'ventures', size: 0.2, royaltySec: 8 },
  { id: 'teleaisle', name: 'The teleporting aisle', blurb: 'Step in at cans, step out at checkout.', era: 11, sec: 720, costSec: 800, lever: 'demand', size: 0.08, royaltySec: 10 },
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
  { id: 'corner', name: 'The empty corner lot', blurb: 'Weeds, a shopping cart, potential.', era: 1, priceMin: 15, rentPerMin: 0.002, near: 0.01 },
  { id: 'mainstreet', name: 'Shops on Main Street', blurb: 'A barber, a florist, a vacant unit.', era: 2, priceMin: 40, rentPerMin: 0.0025, near: 0.015 },
  { id: 'warehouserow', name: 'Warehouse Row', blurb: 'Brick, pallets and good light.', era: 3, priceMin: 80, rentPerMin: 0.003, near: 0.01 },
  { id: 'pier', name: 'The harbour pier', blurb: 'Gulls, fish and tourists.', era: 4, priceMin: 140, rentPerMin: 0.0028, near: 0.015 },
  { id: 'tower', name: 'Downtown tower', blurb: 'Forty floors, one great view.', era: 5, priceMin: 240, rentPerMin: 0.003, near: 0.02 },
  { id: 'ringsegment', name: 'An orbital ring segment', blurb: 'Real estate with a view of everything.', era: 7, priceMin: 400, rentPerMin: 0.0032, near: 0.02 },
  { id: 'moonplaza', name: 'Moon Plaza', blurb: 'Low gravity, high footfall.', era: 9, priceMin: 600, rentPerMin: 0.0034, near: 0.025 },
  { id: 'lastblock', name: 'The last block on Earth', blurb: 'Everyone wants it. You can have it.', era: 12, priceMin: 900, rentPerMin: 0.0035, near: 0.03 },
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

// ── Crises ───────────────────────────────────────────────────────────────
export interface CrisisOption {
  label: string
  hint: string
  /** Seconds of sales it costs up front. */
  costSec: number
  /** Odds it works. */
  odds: number
  /** On success / failure: demand multiplier for a while, brand change. */
  win: { demand: number; sec: number; brand: number }
  lose: { demand: number; sec: number; brand: number }
}

export interface CrisisDef {
  id: string
  era: number
  title: string
  body: string
  options: [CrisisOption, CrisisOption, CrisisOption]
  /** If you do nothing. */
  ignore: { demand: number; sec: number; brand: number }
}

const opt = (label: string, hint: string, costSec: number, odds: number, win: CrisisOption['win'], lose: CrisisOption['lose']): CrisisOption => ({ label, hint, costSec, odds, win, lose })

export const CRISES: CrisisDef[] = [
  {
    id: 'rat-video',
    era: 1,
    title: 'A rat in aisle 3 goes viral',
    body: 'Two million views. The rat has a fan page.',
    options: [
      opt('Close for a deep clean', 'Costs a lot; almost always works', 60, 0.95, { demand: 1.04, sec: 300, brand: 0.01 }, { demand: 0.95, sec: 180, brand: 0 }),
      opt('Adopt the rat as mascot', 'Free; the internet decides', 0, 0.5, { demand: 1.12, sec: 300, brand: 0.02 }, { demand: 0.85, sec: 300, brand: -0.03 }),
      opt('Say it was a hamster', 'Free; probably won’t work', 0, 0.25, { demand: 1, sec: 60, brand: 0 }, { demand: 0.8, sec: 300, brand: -0.04 }),
    ],
    ignore: { demand: 0.9, sec: 300, brand: -0.02 },
  },
  {
    id: 'recall',
    era: 2,
    title: 'A batch of yogurt tastes of pennies',
    body: 'Nobody is sick. Everyone is suspicious.',
    options: [
      opt('Full recall, refunds for all', 'Costs plenty; trust holds', 90, 0.9, { demand: 1.03, sec: 300, brand: 0.02 }, { demand: 0.95, sec: 180, brand: 0 }),
      opt('Quiet recall', 'Cheaper; might leak', 30, 0.6, { demand: 1, sec: 60, brand: 0 }, { demand: 0.88, sec: 300, brand: -0.03 }),
      opt('Market it as “mineral yogurt”', 'Free; bold', 0, 0.35, { demand: 1.1, sec: 300, brand: 0.01 }, { demand: 0.82, sec: 300, brand: -0.05 }),
    ],
    ignore: { demand: 0.88, sec: 300, brand: -0.03 },
  },
  {
    id: 'blackout',
    era: 2,
    title: 'Blackout! The freezers are warming',
    body: 'The whole block is dark. Ice cream is melting in real time.',
    options: [
      opt('Rent generators', 'Costs; saves the stock', 45, 0.9, { demand: 1.02, sec: 120, brand: 0.01 }, { demand: 0.95, sec: 120, brand: 0 }),
      opt('Melted ice-cream party, free for all', 'Free; great press or great mess', 0, 0.55, { demand: 1.1, sec: 240, brand: 0.03 }, { demand: 0.9, sec: 180, brand: -0.01 }),
      opt('Wait it out', 'Free; hope it’s short', 0, 0.4, { demand: 1, sec: 60, brand: 0 }, { demand: 0.88, sec: 240, brand: -0.01 }),
    ],
    ignore: { demand: 0.88, sec: 240, brand: -0.01 },
  },
  {
    id: 'cart-stampede',
    era: 3,
    title: 'A runaway cart convoy hits the mayor’s car',
    body: 'Forty carts. One hill. One very shiny car.',
    options: [
      opt('Pay for the car and apologise', 'Costs; smooths it over', 60, 0.9, { demand: 1.02, sec: 120, brand: 0.01 }, { demand: 0.96, sec: 120, brand: 0 }),
      opt('Blame Wobble Cart Co.', 'Free; their stock may suffer', 0, 0.6, { demand: 1.03, sec: 180, brand: 0 }, { demand: 0.9, sec: 240, brand: -0.02 }),
      opt('Offer the mayor free groceries for life', 'Cheap; unusual', 15, 0.5, { demand: 1.06, sec: 300, brand: 0.02 }, { demand: 0.92, sec: 240, brand: -0.02 }),
    ],
    ignore: { demand: 0.9, sec: 240, brand: -0.02 },
  },
  {
    id: 'data-leak',
    era: 4,
    title: 'Loyalty-card data leaks online',
    body: 'Everyone now knows who buys the most pickles. (It’s Gary.)',
    options: [
      opt('Hire security experts', 'Costs; fixes it properly', 90, 0.9, { demand: 1.02, sec: 180, brand: 0.01 }, { demand: 0.94, sec: 180, brand: -0.01 }),
      opt('Give everyone double points', 'Costs a little; wins hearts', 30, 0.7, { demand: 1.08, sec: 300, brand: 0.01 }, { demand: 0.92, sec: 240, brand: -0.02 }),
      opt('Thank Gary publicly', 'Free; Gary may not be pleased', 0, 0.45, { demand: 1.06, sec: 240, brand: 0.01 }, { demand: 0.86, sec: 300, brand: -0.03 }),
    ],
    ignore: { demand: 0.88, sec: 300, brand: -0.03 },
  },
  {
    id: 'ceo-tweet',
    era: 5,
    title: 'Someone tweeted from the company account at 3 a.m.',
    body: '“bananas are just yellow cucumbers. fight me.”',
    options: [
      opt('Fire the intern', 'Free; harsh', 0, 0.6, { demand: 1, sec: 60, brand: 0 }, { demand: 0.92, sec: 240, brand: -0.02 }),
      opt('Double down: sell “cucumber bananas”', 'Cheap; legendary or awful', 15, 0.5, { demand: 1.14, sec: 300, brand: 0.02 }, { demand: 0.85, sec: 300, brand: -0.03 }),
      opt('A sincere apology video', 'Costs; safe', 40, 0.85, { demand: 1.02, sec: 180, brand: 0.01 }, { demand: 0.95, sec: 180, brand: 0 }),
    ],
    ignore: { demand: 0.9, sec: 240, brand: -0.02 },
  },
  {
    id: 'space-bugs',
    era: 7,
    title: 'Alien beetles in the imported produce',
    body: 'They’re harmless. They’re also singing.',
    options: [
      opt('Quarantine every shipment', 'Costs; thorough', 90, 0.9, { demand: 1.02, sec: 180, brand: 0.01 }, { demand: 0.94, sec: 180, brand: 0 }),
      opt('Sell tickets to hear them sing', 'Free; weird', 0, 0.55, { demand: 1.15, sec: 300, brand: 0.02 }, { demand: 0.86, sec: 300, brand: -0.03 }),
      opt('Release them on a rival’s planet', 'Free; Heat +20', 0, 0.7, { demand: 1.05, sec: 240, brand: 0 }, { demand: 0.88, sec: 300, brand: -0.04 }),
    ],
    ignore: { demand: 0.88, sec: 300, brand: -0.03 },
  },
  {
    id: 'gravity',
    era: 10,
    title: 'Gravity fails in the orbital store',
    body: 'The cereal aisle is now the cereal ceiling.',
    options: [
      opt('Emergency engineers', 'Costs; fixes it', 120, 0.9, { demand: 1.02, sec: 180, brand: 0.01 }, { demand: 0.94, sec: 180, brand: 0 }),
      opt('Call it a “float sale”', 'Free; fun or chaos', 0, 0.55, { demand: 1.15, sec: 300, brand: 0.02 }, { demand: 0.86, sec: 300, brand: -0.03 }),
      opt('Hand out magnet boots', 'Cheap; practical', 20, 0.7, { demand: 1.05, sec: 240, brand: 0.01 }, { demand: 0.9, sec: 240, brand: -0.01 }),
    ],
    ignore: { demand: 0.88, sec: 300, brand: -0.03 },
  },
]

export const CRISIS_BY_ID: Record<string, CrisisDef> = Object.fromEntries(CRISES.map((c) => [c.id, c]))

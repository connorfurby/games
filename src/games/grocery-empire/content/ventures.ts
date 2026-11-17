import type { GameState } from '../sim/state'
import { SEASON_WANTS, type TraitId } from './horizon/cultivars'
import { cateringAvailable, commodityDeskAvailable, ghostKitchenAvailable } from './era2'

export interface VenturePolicySide {
  id: string
  name: string
  blurb: string
  /** Flat income multiplier once this side is locked. Omitted sides use a special case. */
  incomeMul?: number
}

export interface VentureDef {
  id: string
  name: string
  blurb: string
  loop: string
  /** Gate label — only used when a venture is already available. */
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
  /** Level-10 fork. `a` and `b` lock after the first choice. */
  policies?: { a: VenturePolicySide; b: VenturePolicySide }
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
    incomePerLevel: 0.05,
    levelMul: 1.025,
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
    incomePerLevel: 0.18,
    levelMul: 1.025,
    storeSec: 600,
    producePerLevel: 0.05,
    available: (s) => !!s.memos['mealkit-license'] && s.categories.produce,
  },
  {
    id: 'catering',
    name: 'Catering',
    blurb: 'Contract timers, lump payouts.',
    loop: 'Opens with a second store or Catering License. Collect when the till fills. Side till — not baskets.',
    opensAt: 'Second store or Catering License',
    openCost: 5000,
    levelBase: 3000,
    levelGrowth: 1.4,
    maxLevel: 20,
    incomePerLevel: 0.22,
    levelMul: 1.025,
    storeSec: 900,
    available: cateringAvailable,
  },
  {
    id: 'ghost',
    name: 'Ghost Kitchen',
    blurb: 'Delivery-only menu from the depot.',
    loop: 'Needs the depot. Higher income, still a side till.',
    opensAt: 'Depot',
    openCost: 30000,
    levelBase: 15000,
    levelGrowth: 1.4,
    maxLevel: 20,
    incomePerLevel: 0.7,
    levelMul: 1.025,
    storeSec: 900,
    available: ghostKitchenAvailable,
  },
  {
    id: 'snacks',
    name: 'Private-Label Snacks',
    blurb: 'Your name on a chip bag.',
    loop: 'Opens after Private-Label Works. Steady brand-adjacent cash beside the aisle.',
    opensAt: 'Private-Label Works',
    openCost: 1e6,
    levelBase: 5e5,
    levelGrowth: 1.4,
    maxLevel: 20,
    incomePerLevel: 18,
    levelMul: 1.025,
    storeSec: 900,
    available: (s) => !!s.memos['private-label-works'] || s.era >= 3,
  },
  {
    id: 'commodity',
    name: 'Commodity Desk',
    blurb: 'A small desk that trades flour.',
    loop: 'Opens when the investment engine is online.',
    opensAt: 'Investment book',
    openCost: 1e5,
    levelBase: 5e4,
    levelGrowth: 1.4,
    maxLevel: 20,
    incomePerLevel: 1.8,
    levelMul: 1.025,
    storeSec: 900,
    available: commodityDeskAvailable,
  },
  {
    id: 'coldlease',
    name: 'Cold-Credit Leasing',
    blurb: 'Rent spare cold to neighbors.',
    loop: 'Needs tanks online. Turns surplus cold into a side till.',
    opensAt: 'Tanks online',
    openCost: 5e6,
    levelBase: 2e6,
    levelGrowth: 1.4,
    maxLevel: 20,
    incomePerLevel: 70,
    levelMul: 1.025,
    storeSec: 900,
    available: (s) => (s.cold?.tanks ?? 0) >= 1 || !!s.memos['tank-farm'],
  },
  {
    id: 'media',
    name: 'Media Channel',
    blurb: 'Cooking show. Ideas become Brand.',
    loop: 'Needs Ideas unlocked. Soft Brand pressure — keep the label honest.',
    opensAt: 'Ideas gate',
    openCost: 2e5,
    levelBase: 1e5,
    levelGrowth: 1.4,
    maxLevel: 20,
    incomePerLevel: 3.5,
    levelMul: 1.025,
    storeSec: 900,
    available: (s) => !!s.compute.ideasUnlocked,
  },
  {
    id: 'orbital',
    name: 'Orbital Catering',
    blurb: 'Feeding the crews.',
    loop: 'Huge numbers, still a till beside the barges.',
    opensAt: 'Fleet',
    openCost: 1e12,
    levelBase: 5e11,
    levelGrowth: 1.4,
    maxLevel: 20,
    incomePerLevel: 8e6,
    levelMul: 1.025,
    storeSec: 900,
    available: (s) => s.era >= 5 || !!s.menus.fleet || !!s.memos['barge-berth'],
  },
  {
    id: 'museum',
    name: 'Museum Shop',
    blurb: 'Postcards of baskets.',
    loop: 'Extra cash on the side. Never required, and it does not count toward memos.',
    opensAt: 'Legacy',
    openCost: 1e13,
    levelBase: 5e12,
    levelGrowth: 1.4,
    maxLevel: 20,
    incomePerLevel: 8e7,
    levelMul: 1.025,
    storeSec: 900,
    available: (s) => (s.fleet?.legacy ?? 0) >= 1 || !!s.endingChoice,
  },
  {
    id: 'dutyfree',
    name: 'Duty-Free Orbit',
    blurb: 'A counter past the airlock. Tourists or crew, not both.',
    loop: 'Opens in Era 7. Level 10 locks tourist demand or crew income.',
    opensAt: 'Era 7',
    openCost: 5e15,
    levelBase: 3e15,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 2e12,
    levelMul: 1.025,
    storeSec: 600,
    available: (s) => s.era >= 7,
  },
  {
    id: 'seedcat',
    name: 'Seed Catalog',
    blurb: 'Pretty or sturdy, printed on the same card.',
    loop: 'Opens once a world is stocked. Before Era 9 both sides pay ×1.1.',
    opensAt: 'Era 7, one planet stocked',
    openCost: 2e16,
    levelBase: 1.2e16,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 8e12,
    levelMul: 1.025,
    storeSec: 600,
    available: (s) => s.era >= 7 && (s.horizon?.planets?.some((p) => p.stocked) ?? false),
  },
  {
    id: 'bonded',
    name: 'Bonded Warehouse',
    blurb: 'A seal on the door, or the door left open for freight.',
    loop: 'Opens in Era 8. Sealed keeps stock. Open moves freight.',
    opensAt: 'Era 8',
    openCost: 1e17,
    levelBase: 6e16,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 4e13,
    levelMul: 1.025,
    storeSec: 600,
    available: (s) => s.era >= 8,
  },
  {
    id: 'courier',
    name: 'Courier Co-op',
    blurb: 'Bicycles with your crates. Keel or your own standing route.',
    loop: 'Opens once a circuit is filed.',
    opensAt: 'Era 8, one circuit',
    openCost: 4e17,
    levelBase: 2.4e17,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 1.5e14,
    levelMul: 1.025,
    storeSec: 600,
    available: (s) => s.era >= 8 && (s.horizon?.circuits?.some((c) => !!c.origin) ?? false),
  },
  {
    id: 'almanac',
    name: 'Almanac',
    blurb: 'The next season, printed early, or a fatter till.',
    loop: 'Opens in Era 9. Early stacks with the season bell, up to 180s.',
    opensAt: 'Era 9',
    openCost: 2e18,
    levelBase: 1.2e18,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 8e14,
    levelMul: 1.025,
    storeSec: 600,
    available: (s) => s.era >= 9,
  },
  {
    id: 'wire',
    name: 'Farmers’ Wire',
    blurb: 'A co-op trickle of seed, or an exclusive till.',
    loop: 'Opens once a plot is planted.',
    opensAt: 'Era 9, one plot',
    openCost: 8e18,
    levelBase: 4.8e18,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 3e15,
    levelMul: 1.025,
    storeSec: 600,
    available: (s) => s.era >= 9 && (s.horizon?.plots?.some((p) => p.child.length > 0) ?? false),
  },
  {
    id: 'phrasebook',
    name: 'Phrasebook Press',
    blurb: 'A primer that helps the standard phrase, or an edition that pays.',
    loop: 'Opens in Era 10.',
    opensAt: 'Era 10',
    openCost: 5e19,
    levelBase: 3e19,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 2e16,
    levelMul: 1.025,
    storeSec: 600,
    available: (s) => s.era >= 10,
  },
  {
    id: 'frequency',
    name: 'Night Frequency',
    blurb: 'A lullaby for agent wages after close, or static that pays.',
    loop: 'Opens once an agent is on the desk.',
    opensAt: 'Era 10, one agent',
    openCost: 2e20,
    levelBase: 1.2e20,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 8e16,
    levelMul: 1.025,
    storeSec: 600,
    available: (s) => s.era >= 10 && (s.horizon?.agents?.length ?? 0) >= 1,
  },
  {
    id: 'embassy-gift',
    name: 'Embassy Gift Shop',
    blurb: 'Tins with a flag on the lid. Every embassy wants its own.',
    loop: 'Opens once an embassy is sealed. Courtesy warms the seal desk; Lavish pays.',
    opensAt: 'Era 11, one embassy',
    openCost: 1e21,
    levelBase: 6e20,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 3e17,
    levelMul: 1.025,
    storeSec: 600,
    available: (s) => s.era >= 11 && (s.horizon?.embassies ?? 0) >= 1,
  },
  {
    id: 'treaty-caterer',
    name: 'Treaty Caterer',
    blurb: 'Lunch for the signing. Nobody leaves before the dessert.',
    loop: 'Opens once the charter is signed. Table eases the next toggle; Banquet pays.',
    opensAt: 'Era 11, charter signed',
    openCost: 5e21,
    levelBase: 3e21,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 1.5e18,
    levelMul: 1.025,
    storeSec: 600,
    available: (s) => s.era >= 11 && !!s.horizon?.charter,
  },
  {
    id: 'ivo-diner',
    name: 'Ivo’s Diner',
    blurb: 'A counter, a stool and a very patient man.',
    loop: 'Opens in Era 12. Counter keeps the desk cheaper; Booth pays.',
    opensAt: 'Era 12',
    openCost: 3e22,
    levelBase: 1.8e22,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 8e18,
    levelMul: 1.025,
    storeSec: 600,
    available: (s) => s.era >= 12,
  },
  {
    id: 'endless-kiosk',
    name: 'Endless Kiosk',
    blurb: 'A stall at the edge of the map. Another world, another sign.',
    loop: 'Opens in Era 12. Always-on pulls the survey along; Cash-only pays.',
    opensAt: 'Era 12',
    openCost: 2e23,
    levelBase: 1.2e23,
    levelGrowth: 1.32,
    maxLevel: 20,
    incomePerLevel: 4e19,
    levelMul: 1.025,
    storeSec: 600,
    available: (s) => s.era >= 12,
  },
]

const VENTURE_FORKS: Record<string, NonNullable<VentureDef['policies']>> = {
  coffee: {
    a: { id: 'dawn', name: 'Dawn', blurb: 'The morning rush. Income ×1.15.', incomeMul: 1.15 },
    b: { id: 'late', name: 'Late', blurb: 'Night trade ×1.2. The day is quieter.', incomeMul: 1.2 },
  },
  mealkits: {
    a: { id: 'hearty', name: 'Hearty', blurb: 'Uses 30% less produce. Income ×0.9.', incomeMul: 0.9 },
    b: { id: 'lean', name: 'Lean', blurb: 'Income ×1.15. Burns 25% more produce.', incomeMul: 1.15 },
  },
  catering: {
    a: { id: 'weekday', name: 'Weekday', blurb: 'A flat ×1.1.', incomeMul: 1.1 },
    b: { id: 'feast', name: 'Feast', blurb: '×1.3 in Harvest. ×0.8 other seasons. ×1.05 before Era 9.' },
  },
  ghost: {
    a: { id: 'quiet', name: 'Quiet', blurb: 'Income ×1.1, wages or not.', incomeMul: 1.1 },
    b: { id: 'rush', name: 'Rush', blurb: 'Income ×1.2. Perishables age 5% faster.', incomeMul: 1.2 },
  },
  commodity: {
    a: { id: 'hedge', name: 'Hedge', blurb: 'A calmer desk. Income ×1.05.', incomeMul: 1.05 },
    b: { id: 'lever', name: 'Lever', blurb: 'Income ×1.2, and about one minute in twenty pays nothing.' },
  },
  media: {
    a: { id: 'local', name: 'Local', blurb: 'A quieter channel. Income ×0.95.', incomeMul: 0.95 },
    b: { id: 'loud', name: 'Loud', blurb: 'Income ×1.15. Rivals move sooner, and more often.', incomeMul: 1.15 },
  },
  snacks: {
    a: { id: 'house', name: 'House', blurb: 'This till’s margin. Income ×1.1.', incomeMul: 1.1 },
    b: { id: 'bulk', name: 'Bulk', blurb: 'Income ×1.2.', incomeMul: 1.2 },
  },
  coldlease: {
    a: { id: 'long', name: 'Long lease', blurb: 'Income ×1.1.', incomeMul: 1.1 },
    b: { id: 'spot', name: 'Spot', blurb: '×1.25 while cold momentum is on, ×0.7 when it is not.' },
  },
  orbital: {
    a: { id: 'crew', name: 'Crew', blurb: 'Income ×1.1.', incomeMul: 1.1 },
    b: { id: 'auto', name: 'Auto', blurb: 'Income ×1.2, and the till collects itself.', incomeMul: 1.2 },
  },
  museum: {
    a: { id: 'tour', name: 'Tour', blurb: 'Income ×1.05. The wing gets a walk-through.', incomeMul: 1.05 },
    b: { id: 'shop', name: 'Shop', blurb: 'Income ×1.2.', incomeMul: 1.2 },
  },
  dutyfree: {
    a: { id: 'tourist', name: 'Tourist', blurb: '+4% shoppers on the flagship. The till itself is unchanged.' },
    b: { id: 'crew', name: 'Crew', blurb: 'Income ×1.15.', incomeMul: 1.15 },
  },
  seedcat: {
    a: { id: 'pretty', name: 'Pretty', blurb: '×1.2 in seasons that want pretty. ×1.1 otherwise, and before Era 9.' },
    b: { id: 'sturdy', name: 'Sturdy', blurb: '×1.2 in seasons that want sturdy. ×1.1 otherwise, and before Era 9.' },
  },
  bonded: {
    a: { id: 'sealed', name: 'Sealed', blurb: 'Backroom stock ages 10% slower. Till income stays flat.' },
    b: { id: 'open', name: 'Open', blurb: 'Freight trickle ×1.1 while the till is open.' },
  },
  courier: {
    a: { id: 'keel', name: 'Keel', blurb: 'Keel’s convoys pull half as many shoppers. The till stays flat.' },
    b: { id: 'own', name: 'Own route', blurb: 'Broker deputies refile the standing route 20% sooner.' },
  },
  almanac: {
    a: { id: 'early', name: 'Early', blurb: 'Forecast lead +60s, stacking with the season bell up to 180s.' },
    b: { id: 'broad', name: 'Broad', blurb: 'Income ×1.2.', incomeMul: 1.2 },
  },
  wire: {
    a: { id: 'co-op', name: 'Co-op', blurb: 'Seed trickle +10%.' },
    b: { id: 'exclusive', name: 'Exclusive', blurb: 'Income ×1.25. Seed trickle −10%.', incomeMul: 1.25 },
  },
  phrasebook: {
    a: { id: 'primer', name: 'Primer', blurb: 'The standard phrase scores +0.05, capped at 1.' },
    b: { id: 'edition', name: 'Edition', blurb: 'Income ×1.2.', incomeMul: 1.2 },
  },
  frequency: {
    a: { id: 'lullaby', name: 'Lullaby', blurb: 'Agent wages ×0.9 while the store is on night hours.' },
    b: { id: 'static', name: 'Static', blurb: 'Income ×1.15.', incomeMul: 1.15 },
  },
  'embassy-gift': {
    a: { id: 'courtesy', name: 'Courtesy', blurb: 'Embassy seal trickle +5%. The till stays flat.' },
    b: { id: 'lavish', name: 'Lavish', blurb: 'Income ×1.2.', incomeMul: 1.2 },
  },
  'treaty-caterer': {
    a: { id: 'table', name: 'Table', blurb: 'Clause toggles cost 10% less seal. The till stays flat.' },
    b: { id: 'banquet', name: 'Banquet', blurb: 'Income ×1.2.', incomeMul: 1.2 },
  },
  'ivo-diner': {
    a: { id: 'counter', name: 'Counter', blurb: 'Agent wages ×0.9, any hour. The till stays flat.' },
    b: { id: 'booth', name: 'Booth', blurb: 'Income ×1.15.', incomeMul: 1.15 },
  },
  'endless-kiosk': {
    a: { id: 'always', name: 'Always on', blurb: 'Survey trickle +10%. The till stays flat.' },
    b: { id: 'cash-only', name: 'Cash only', blurb: 'Income ×1.25.', incomeMul: 1.25 },
  },
}

for (const venture of VENTURES) {
  const fork = VENTURE_FORKS[venture.id]
  if (fork) venture.policies = fork
}

export const VENTURE_BY_ID: Record<string, VentureDef> = Object.fromEntries(VENTURES.map((v) => [v.id, v]))

export function ventureLevelCost(def: VentureDef, level: number) {
  return Math.ceil(def.levelBase * Math.pow(def.levelGrowth, level - 1))
}

export function ventureIncome(def: VentureDef, level: number) {
  if (level <= 0) return 0
  return def.incomePerLevel * level * Math.pow(def.levelMul, level - 1)
}

/** Income multiplier from a locked level-10 policy. 1 before a side is chosen. */
export function venturePolicyIncomeMul(
  s: GameState,
  def: VentureDef,
  policy: 'a' | 'b' | null | undefined,
): number {
  if (policy !== 'a' && policy !== 'b') return 1
  const side = def.policies?.[policy]
  if (!side) return 1
  if (side.id === 'feast') {
    if (s.era < 9) return 1.05
    return s.horizon?.season === 2 ? 1.3 : 0.8
  }
  if (side.id === 'spot') return s.cold?.momentumOn ? 1.25 : 0.7
  if (side.id === 'lever') {
    const minute = Math.floor(s.time / 60)
    const bucket = Math.abs((Math.floor(s.seed) * 17 + minute * 13) % 100)
    return bucket < 5 ? 0 : 1.2
  }
  if (side.id === 'pretty' || side.id === 'sturdy') {
    if (s.era < 9) return 1.1
    const wants = SEASON_WANTS[s.horizon?.season ?? 0]
    return wants?.includes(side.id as TraitId) ? 1.2 : 1.1
  }
  return side.incomeMul ?? 1
}

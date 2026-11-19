/** The Town hub: the foundation, city hall, the union, the press and your customers. */

// ── Foundation ───────────────────────────────────────────────────────────
export type CausePerk = 'spoilRefund' | 'produceCut' | 'wages' | 'demand' | 'brand' | 'ventures' | 'heat' | 'research'

export interface CauseDef {
  id: string
  name: string
  blurb: string
  era: number
  /** Unlocked at level 3. */
  perk: CausePerk
  perkText: string
  /** Size of the perk at level 3 (it grows a little each level after). */
  perkSize: number
}

export const CAUSES: CauseDef[] = [
  { id: 'foodbank', name: 'The Food Bank', blurb: 'Nothing good goes in the bin.', era: 1, perk: 'spoilRefund', perkText: 'Spoiled food is donated: a fifth of its cost comes back', perkSize: 0.2 },
  { id: 'gardens', name: 'School Gardens', blurb: 'Kids, dirt, tomatoes.', era: 1, perk: 'produceCut', perkText: 'Local growers sell you produce cheaper', perkSize: 0.05 },
  { id: 'shelter', name: 'The Animal Shelter', blurb: 'A store dog, eventually.', era: 1, perk: 'demand', perkText: 'A rescued shop dog by the door draws a crowd', perkSize: 0.03 },
  { id: 'nightshelter', name: 'The Night Shelter', blurb: 'A warm bed and a hot meal.', era: 2, perk: 'wages', perkText: 'People who were helped come to work for you', perkSize: -0.04 },
  { id: 'library', name: 'The Library', blurb: 'Books for everyone. Cookbooks, mostly.', era: 2, perk: 'research', perkText: 'The lab works faster', perkSize: 0.15 },
  { id: 'parks', name: 'City Parks', blurb: 'Benches, trees, a pond with ducks.', era: 3, perk: 'heat', perkText: 'Heat cools faster: the city likes you', perkSize: 0.3 },
  { id: 'orphanage', name: 'The Space Orphanage', blurb: 'Every child deserves a window seat.', era: 7, perk: 'brand', perkText: 'Your name shines on every world', perkSize: 0.002 },
  { id: 'seedfund', name: 'The Colony Seed Fund', blurb: 'First harvests on new worlds.', era: 9, perk: 'ventures', perkText: 'Colonists buy from your ventures', perkSize: 0.1 },
]

export const CAUSE_BY_ID: Record<string, CauseDef> = Object.fromEntries(CAUSES.map((c) => [c.id, c]))

// ── City Hall ────────────────────────────────────────────────────────────
export type PlatformLever = 'demand' | 'wages' | 'crates' | 'heat' | 'ventures'

export interface CandidateDef {
  id: string
  name: string
  platform: string
  /** Effect while they hold office. */
  levers: Partial<Record<PlatformLever, number>>
  /** Base share of the vote (0–1). */
  base: number
}

export interface OfficeDef {
  id: string
  title: string
  era: number
  candidates: CandidateDef[]
}

export const OFFICES: OfficeDef[] = [
  {
    id: 'mayor',
    title: 'Mayor',
    era: 2,
    candidates: [
      { id: 'brennan', name: 'Mayor Brennan', platform: 'Business first. Fewer permits, faster everything.', levers: { crates: -0.03, ventures: 0.08 }, base: 0.4 },
      { id: 'osei', name: 'Ama Osei', platform: 'Parks, buses and a living wage.', levers: { demand: 0.04, wages: 0.04 }, base: 0.35 },
      { id: 'grubb', name: 'Hal Grubb', platform: 'Law and order. Every alley lit up.', levers: { heat: -0.5 }, base: 0.25 },
    ],
  },
  {
    id: 'governor',
    title: 'Governor',
    era: 5,
    candidates: [
      { id: 'castellan', name: 'Gov. Castellan', platform: 'Cheap freight and big roads.', levers: { crates: -0.04, demand: 0.02 }, base: 0.45 },
      { id: 'liang', name: 'Mei Liang', platform: 'Clean ports and fair wages.', levers: { wages: 0.03, demand: 0.05 }, base: 0.35 },
      { id: 'tarrow', name: 'Wes Tarrow', platform: 'Tax the big chains.', levers: { crates: 0.04, demand: 0.03 }, base: 0.2 },
    ],
  },
  {
    id: 'senator',
    title: 'Senator',
    era: 8,
    candidates: [
      { id: 'adeyemi', name: 'Sen. Adeyemi', platform: 'Trade between worlds, tariff-free.', levers: { ventures: 0.12, crates: -0.03 }, base: 0.4 },
      { id: 'brask', name: 'Jon Brask', platform: 'Earth first. Earth only.', levers: { demand: 0.04, ventures: -0.06 }, base: 0.35 },
      { id: 'vey', name: 'Ilse Vey', platform: 'Audit every corporation.', levers: { heat: -0.4, wages: -0.02 }, base: 0.25 },
    ],
  },
  {
    id: 'councillor',
    title: 'Galactic Councillor',
    era: 11,
    candidates: [
      { id: 'thren', name: 'Councillor Thren', platform: 'One market, many moons.', levers: { demand: 0.05, ventures: 0.1 }, base: 0.45 },
      { id: 'quill', name: 'Ada Quill', platform: 'Seed for every colony.', levers: { crates: -0.05 }, base: 0.35 },
      { id: 'mox', name: 'Mox the Elder', platform: 'Nobody knows. Mox knows.', levers: { demand: 0.05, heat: 0.3 }, base: 0.2 },
    ],
  },
]

export const OFFICE_BY_ID: Record<string, OfficeDef> = Object.fromEntries(OFFICES.map((o) => [o.id, o]))

export const FAVORS = [
  { id: 'zoning', name: 'A zoning favour', text: '+6% shoppers for 10 minutes', cost: 1 },
  { id: 'paperwork', name: 'Lose some paperwork', text: 'Heat −30', cost: 1 },
  { id: 'permits', name: 'Fast-track permits', text: 'Venture tills 30% faster for 10 minutes', cost: 1 },
] as const

// ── Union ────────────────────────────────────────────────────────────────
export interface DemandDef {
  id: 'pay' | 'benefits' | 'hours'
  title: string
  ask: string
  /** What accepting does, per level. */
  yes: string
}

export const UNION_DEMANDS: DemandDef[] = [
  { id: 'pay', title: 'A raise', ask: '“Prices went up. So should we.”', yes: 'Wages +5%, shoppers +2.5% (better service)' },
  { id: 'benefits', title: 'Health and a pension', ask: '“Look after us and we’ll look after the store.”', yes: 'Wages +3%; the crew ignores rival poaching; +1.5% shoppers' },
  { id: 'hours', title: 'A four-day week', ask: '“Rested people sell more.”', yes: 'Wages −3%, shoppers +2%' },
]

// ── Press ────────────────────────────────────────────────────────────────
export interface OutletDef {
  id: string
  name: string
  kind: string
  era: number
  /** Price in minutes of sales. */
  costMin: number
  /** Always-on shoppers bonus once owned. */
  reach: number
}

export const OUTLETS: OutletDef[] = [
  { id: 'gazette', name: 'The Corner Gazette', kind: 'Newspaper', era: 2, costMin: 30, reach: 0.01 },
  { id: 'radio', name: 'City Radio 88.1', kind: 'Radio', era: 3, costMin: 60, reach: 0.015 },
  { id: 'ch9', name: 'Channel 9', kind: 'Television', era: 5, costMin: 120, reach: 0.02 },
  { id: 'orbital', name: 'Orbital Newsfeed', kind: 'Feed', era: 7, costMin: 200, reach: 0.025 },
  { id: 'galnet', name: 'The Galactic Network', kind: 'Network', era: 10, costMin: 300, reach: 0.03 },
]

export const SPINS = [
  { id: 'puff', name: 'Run a puff piece about you', text: '+shoppers for 5 minutes (bigger with more outlets)', cred: 10 },
  { id: 'attack', name: 'Attack a rival', text: 'Their stock falls and their growth stalls; they hold a grudge', cred: 15 },
  { id: 'bury', name: 'Bury a scandal', text: 'Ends a scandal; Heat −20', cred: 20 },
  { id: 'pump', name: 'Hype a stock', text: 'A listed stock jumps; Heat +15 (it’s a bit illegal)', cred: 15 },
  { id: 'endorse', name: 'Endorse a candidate', text: 'Your candidate gains votes', cred: 10 },
] as const

// ── Customers ────────────────────────────────────────────────────────────
export interface SegmentDef {
  id: string
  name: string
  era: number
  /** Share of shoppers (normalised across open segments). */
  weight: number
  /** What they like: low prices (−1) to premium (+1), and aisles they want. */
  price: number
  aisles: string[]
  likes: string
}

export const SEGMENTS: SegmentDef[] = [
  { id: 'students', name: 'Students', era: 1, weight: 2, price: -1, aisles: ['cans'], likes: 'Cheap cans, late hours, the coffee cart' },
  { id: 'families', name: 'Families', era: 1, weight: 3, price: -0.3, aisles: ['produce', 'dairy'], likes: 'Fresh produce and dairy at fair prices' },
  { id: 'seniors', name: 'Seniors', era: 1, weight: 2, price: 0, aisles: ['cans', 'dairy'], likes: 'Steady prices, a friendly crew, the library' },
  { id: 'foodies', name: 'Foodies', era: 2, weight: 1.5, price: 0.8, aisles: ['produce', 'import'], likes: 'Premium imports and a good name' },
  { id: 'nightowls', name: 'Night owls', era: 3, weight: 1, price: 0, aisles: ['cans', 'frozen'], likes: 'Long hours and frozen pizza' },
  { id: 'colonists', name: 'Colonists', era: 7, weight: 2, price: 0.2, aisles: ['import', 'frozen'], likes: 'Earth food on far worlds' },
  { id: 'synthetics', name: 'Synthetics', era: 9, weight: 1, price: 0.5, aisles: ['privateLabel'], likes: 'Precise labels and private-label goods' },
]

export const SEGMENT_BY_ID: Record<string, SegmentDef> = Object.fromEntries(SEGMENTS.map((x) => [x.id, x]))

import type { GameState } from '../sim/state'

/**
 * The Back Alley: optional shady schemes. Every scheme pays now and adds Heat; the more Heat,
 * the likelier the law turns up. Nothing here is required — the clean path stays the main road.
 */
export type SchemeEffect =
  | { kind: 'demand'; mul: number; sec: number }
  | { kind: 'wages'; mul: number; sec: number }
  | { kind: 'ventures'; mul: number; sec: number }
  /** Instant cash: this many seconds of current revenue. */
  | { kind: 'cash'; revenueSec: number }
  /** Free stock into the backroom: this share of backroom room. */
  | { kind: 'stock'; capShare: number }
  /** Every open venture till fills to the top. */
  | { kind: 'tills' }
  /** Ends the rival's current move and adds a short demand bump. */
  | { kind: 'rival'; mul: number; sec: number }

export interface SchemeDef {
  id: string
  name: string
  /** One-line pitch, in the voice of whoever suggests it. */
  pitch: string
  /** Who whispers it. */
  from: string
  era: number
  heat: number
  cooldownSec: number
  effect: SchemeEffect
  /** What it does, in plain words, for the button hint. */
  pays: string
  available?: (s: GameState) => boolean
  /** What is missing when `available` says no. */
  needs?: string
}

const hasVenture = (id: string) => (s: GameState) => (s.ventures[id]?.level ?? 0) > 0

export const SCHEMES: SchemeDef[] = [
  {
    id: 'relabel',
    name: 'Relabel the dates',
    pitch: 'Tuesday’s yogurt, Friday’s sticker. Nobody reads the small print.',
    from: 'Dale from the back',
    era: 1,
    heat: 16,
    cooldownSec: 120,
    effect: { kind: 'demand', mul: 1.12, sec: 90 },
    pays: '+12% shoppers for 1:30',
  },
  {
    id: 'charity-jar',
    name: 'Borrow from the charity jar',
    pitch: 'It’s a loan. You’ll put it back. Probably.',
    from: 'Your own bad idea',
    era: 1,
    heat: 22,
    cooldownSec: 240,
    effect: { kind: 'cash', revenueSec: 45 },
    pays: '45 seconds of sales, now',
  },
  {
    id: 'weak-coffee',
    name: 'Water down the coffee',
    pitch: 'Half the beans, same price. The commuters are half asleep anyway.',
    from: 'The cart barista',
    era: 1,
    heat: 12,
    cooldownSec: 180,
    effect: { kind: 'ventures', mul: 1.6, sec: 180 },
    pays: 'Venture tills fill 60% faster for 3:00',
    available: hasVenture('coffee'),
    needs: 'Needs the Coffee Cart open.',
  },
  {
    id: 'knockoffs',
    name: 'Stock knockoff brands',
    pitch: 'Cola-Kola. Doritoes. Oreoh. Same crunch, a third of the cost.',
    from: 'A man with a van',
    era: 2,
    heat: 24,
    cooldownSec: 240,
    effect: { kind: 'demand', mul: 1.16, sec: 180 },
    pays: '+16% shoppers for 3:00',
  },
  {
    id: 'cook-books',
    name: 'Cook the books',
    pitch: 'Some of the crew can be “volunteers” this week. On paper.',
    from: 'Your accountant, nervously',
    era: 2,
    heat: 28,
    cooldownSec: 300,
    effect: { kind: 'wages', mul: 0.6, sec: 240 },
    pays: 'Wages −40% for 4:00',
  },
  {
    id: 'ghost-menu',
    name: 'Unlicensed ghost menu',
    pitch: 'Sushi from the deli slicer. What could go wrong?',
    from: 'The night cook',
    era: 2,
    heat: 24,
    cooldownSec: 300,
    effect: { kind: 'ventures', mul: 1.8, sec: 240 },
    pays: 'Venture tills fill 80% faster for 4:00',
    available: (s) => Object.values(s.ventures).filter((v) => v.level > 0).length >= 2,
    needs: 'Needs two ventures open.',
  },
  {
    id: 'parking-tickets',
    name: 'Fake parking tickets',
    pitch: 'Print them on the receipt roll. Fifteen bucks a windshield.',
    from: 'Dale from the back',
    era: 3,
    heat: 30,
    cooldownSec: 300,
    effect: { kind: 'cash', revenueSec: 90 },
    pays: '1:30 of sales, now',
  },
  {
    id: 'swap-tags',
    name: 'Swap the rival’s price tags',
    pitch: 'Ten minutes in their aisle with a label gun. In and out.',
    from: 'Your cousin Vic',
    era: 3,
    heat: 30,
    cooldownSec: 360,
    effect: { kind: 'rival', mul: 1.08, sec: 180 },
    pays: 'Ends the rival’s move · +8% shoppers for 3:00',
  },
  {
    id: 'price-fixing',
    name: 'Price-fixing lunch',
    pitch: 'You, the other chains, a private room, a handshake on milk.',
    from: 'Penny, surprisingly',
    era: 4,
    heat: 36,
    cooldownSec: 420,
    effect: { kind: 'demand', mul: 1.2, sec: 300 },
    pays: '+20% shoppers for 5:00',
  },
  {
    id: 'loyalty-fraud',
    name: 'Double-dip the loyalty points',
    pitch: 'Every card scanned twice. The system never checks. Probably.',
    from: 'The kid who fixes the tills',
    era: 5,
    heat: 34,
    cooldownSec: 420,
    effect: { kind: 'cash', revenueSec: 120 },
    pays: '2:00 of sales, now',
  },
  {
    id: 'smuggled-crates',
    name: 'Smuggled crates',
    pitch: 'They fell off a ship. Several ships. Don’t ask which.',
    from: 'A harbour contact',
    era: 6,
    heat: 32,
    cooldownSec: 420,
    effect: { kind: 'stock', capShare: 0.3 },
    pays: 'Free stock: 30% of the backroom’s free room',
  },
  {
    id: 'shell-company',
    name: 'Run it through a shell company',
    pitch: 'Grocery Holdings (Cayman) Ltd. Very real. Has a fax machine.',
    from: 'A lawyer who bills in cash',
    era: 6,
    heat: 38,
    cooldownSec: 480,
    effect: { kind: 'ventures', mul: 2, sec: 300 },
    pays: 'Venture tills fill twice as fast for 5:00',
  },
  {
    id: 'drone-skim',
    name: 'Skim the drone deliveries',
    pitch: 'One crate in ten “lost in the wind”. Into your backroom.',
    from: 'A drone pilot with debts',
    era: 7,
    heat: 36,
    cooldownSec: 480,
    effect: { kind: 'stock', capShare: 0.25 },
    pays: 'Free stock: 25% of the backroom’s free room',
  },
  {
    id: 'insider-tip',
    name: 'Insider tip on the commodity desk',
    pitch: 'A friend at the port says wheat moves Thursday. It is Wednesday.',
    from: 'Someone at the yacht club',
    era: 8,
    heat: 44,
    cooldownSec: 540,
    effect: { kind: 'cash', revenueSec: 180 },
    pays: '3:00 of sales, now',
  },
  {
    id: 'vault-keeper',
    name: 'Slip the vault keeper a crate',
    pitch: 'He looks the other way. Your tills look the right way.',
    from: 'Someone at the seed vault',
    era: 9,
    heat: 42,
    cooldownSec: 540,
    effect: { kind: 'ventures', mul: 2.2, sec: 300 },
    pays: 'Venture tills fill 2.2× as fast for 5:00',
  },
  {
    id: 'counterfeit-seed',
    name: 'Counterfeit Galaxy Gold',
    pitch: 'Same sticker, ordinary seed. The colonists can’t tell. Mostly.',
    from: 'A smuggler with a nice hat',
    era: 10,
    heat: 44,
    cooldownSec: 540,
    effect: { kind: 'demand', mul: 1.25, sec: 300 },
    pays: '+25% shoppers for 5:00',
  },
  {
    id: 'orbital-laundry',
    name: 'Launder it through the orbital till',
    pitch: 'Money goes up, money comes down, cleaner. Physics.',
    from: 'Your shell company’s shell company',
    era: 11,
    heat: 50,
    cooldownSec: 600,
    effect: { kind: 'tills' },
    pays: 'Every venture till fills to the top',
  },
  {
    id: 'last-heist',
    name: 'The Last Aisle heist',
    pitch: 'One night. Every till in the empire. A getaway cart with a bad wheel.',
    from: 'Your cousin Vic, one last time',
    era: 12,
    heat: 60,
    cooldownSec: 900,
    effect: { kind: 'cash', revenueSec: 300 },
    pays: '5:00 of sales, now',
  },
]

export const SCHEME_BY_ID: Record<string, SchemeDef> = Object.fromEntries(SCHEMES.map((d) => [d.id, d]))

export type PunishmentId = 'warning' | 'fine' | 'padlock' | 'scandal' | 'frozen' | 'probation'

export const PUNISHMENTS: Record<PunishmentId, { name: string; line: string }> = {
  warning: { name: 'Warning letter', line: 'A stern letter, a small fine and a long look from the inspector.' },
  fine: { name: 'Fined', line: 'The fine stings and the scheme is shut down on the spot.' },
  padlock: { name: 'Padlocked', line: 'Closed for inspection. Only the regulars squeeze past the tape.' },
  scandal: { name: 'Front-page scandal', line: 'Your face is on the front page. Shoppers stay away for a while.' },
  frozen: { name: 'Assets frozen', line: 'The ventures’ tills are sealed while the auditors count.' },
  probation: { name: 'Probation', line: 'A judge says no more funny business for a while. The alley is closed to you.' },
}

/** Badges for the rap sheet, by schemes pulled. */
export const ALLEY_RANKS: { at: number; name: string }[] = [
  { at: 0, name: 'Honest grocer' },
  { at: 1, name: 'Corner cutter' },
  { at: 5, name: 'Small-time hustler' },
  { at: 15, name: 'Known to the inspector' },
  { at: 35, name: 'Produce kingpin' },
  { at: 75, name: 'Legend of the back alley' },
]

export function alleyRank(pulled: number): string {
  let name = ALLEY_RANKS[0].name
  for (const r of ALLEY_RANKS) if (pulled >= r.at) name = r.name
  return name
}

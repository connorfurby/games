/**
 * 2.0 named rival chains. One opens each era from Era 2 on. While a rival is
 * independent its stores pull shoppers away (a demand cut that grows with its
 * store count). A price war knocks it back; a buyout folds its stores into
 * your network for good.
 */
export const RIVAL_IDS = ['penny', 'freshway', 'megamart', 'halo'] as const
export type RivalId = (typeof RIVAL_IDS)[number]

export interface RivalDef {
  id: RivalId
  name: string
  founder: string
  /** Founder's title, shown under the portrait. */
  title: string
  /** One-line pitch shown on the card. */
  tagline: string
  era: number
  /** Portrait colors: face background and accent. */
  color: string
  accent: string
  /** Two-letter monogram on the portrait. */
  initials: string
  startStores: number
  maxStores: number
  /** Seconds between new stores while unchecked. */
  growSec: number
  /** Buyout price at zero stores; each store adds BUYOUT.perStore of it. */
  buyoutBase: number
  /** Said when a new store opens (every few stores). */
  taunts: string[]
  /** Said when you win a price war. */
  flinch: string
  /** Said when you buy them out. */
  farewell: string
}

export const RIVALS: RivalDef[] = [
  {
    id: 'penny',
    name: 'Penny Pantry',
    founder: 'Dot Mercer',
    title: 'Founder, discount grocer',
    tagline: 'Chalkboard prices and a parking lot full of shopping carts.',
    era: 2,
    color: '#c2563a',
    accent: '#ffd9a8',
    initials: 'DM',
    startStores: 2,
    maxStores: 10,
    growSec: 330,
    buyoutBase: 3.5e5,
    taunts: [
      'Dot Mercer chalks a lower can price two blocks over.',
      'Penny Pantry opens another lot. Their carts are everywhere.',
      'Dot Mercer: "Cheap is a feeling, not a price."',
    ],
    flinch: 'Dot Mercer pulls the chalkboard in for the week.',
    farewell: 'Dot Mercer hands over the keys: "Keep the chalkboards. People like them."',
  },
  {
    id: 'freshway',
    name: 'FreshWay Markets',
    founder: 'Ines Okafor',
    title: 'CEO, organic chain',
    tagline: 'Misted produce, wood floors and a farm on every bag.',
    era: 3,
    color: '#3f7d58',
    accent: '#d8f3c4',
    initials: 'IO',
    startStores: 3,
    maxStores: 12,
    growSec: 420,
    buyoutBase: 6e7,
    taunts: [
      'FreshWay opens a market with a juice bar by the door.',
      'Ines Okafor buys a farm and puts it on a billboard.',
      'FreshWay: "Your lettuce has a passport. Ours has a name."',
    ],
    flinch: 'FreshWay quietly takes the billboard down.',
    farewell: 'Ines Okafor signs: "Keep the misters on. That part was real."',
  },
  {
    id: 'megamart',
    name: 'MegaMart Global',
    founder: 'Conrad Vale',
    title: 'Chairman, big-box empire',
    tagline: 'Forty acres of aisle and a loyalty card that never expires.',
    era: 4,
    color: '#2f5d9e',
    accent: '#cfe0ff',
    initials: 'CV',
    startStores: 4,
    maxStores: 14,
    growSec: 480,
    buyoutBase: 1.5e10,
    taunts: [
      'MegaMart Global opens a supercenter by the interchange.',
      'Conrad Vale on the evening news: "Scale is a kindness."',
      'MegaMart doubles loyalty points for a month.',
    ],
    flinch: 'MegaMart freezes new sites "pending review".',
    farewell: 'Conrad Vale, at the signing: "I always meant to sell to someone who cared."',
  },
  {
    id: 'halo',
    name: 'Halo Provisions',
    founder: 'Sera Lindqvist',
    title: 'Founder, orbital grocer',
    tagline: 'Drone drops from a ring of warehouses in low orbit.',
    era: 5,
    color: '#6b4fa8',
    accent: '#e6dcff',
    initials: 'SL',
    startStores: 4,
    maxStores: 16,
    growSec: 540,
    buyoutBase: 4e12,
    taunts: [
      'Halo Provisions parks another warehouse in orbit.',
      'Sera Lindqvist: "Groceries should fall from the sky, gently."',
      'Halo drones are seen over your harbor at dusk.',
    ],
    flinch: 'Halo pauses launches for a maintenance window.',
    farewell: 'Sera Lindqvist sends a note down by drone: "Look up sometimes."',
  },
]

export const RIVAL_BY_ID: Record<RivalId, RivalDef> = Object.fromEntries(RIVALS.map((r) => [r.id, r])) as Record<
  RivalId,
  RivalDef
>

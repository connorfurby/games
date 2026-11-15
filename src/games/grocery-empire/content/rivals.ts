/**
 * 2.0 named rival chains. One opens each era from Era 2 on (Penny … Halo), then the four
 * Horizon chains open in Eras 9–12 (Verdant, Static, Concord, Ration). While a rival is
 * independent its stores pull shoppers away (a demand cut that grows with its
 * store count). A price war knocks it back; a buyout folds its stores into
 * your network for good.
 */
export const RIVAL_IDS = [
  'penny',
  'freshway',
  'megamart',
  'halo',
  'drift',
  'keelmark',
  'verdant',
  'static',
  'concord',
  'ration',
] as const
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
  {
    id: 'drift',
    name: 'Drift Provisions',
    founder: 'Nia Vale',
    title: 'Surveyor-turned-grocer',
    tagline: 'Probe crates sold as pantry stock before the map is even filed.',
    era: 7,
    color: '#3a6a8a',
    accent: '#cfe8f4',
    initials: 'NV',
    startStores: 4,
    maxStores: 16,
    growSec: 560,
    buyoutBase: 4e14,
    taunts: [
      'Drift Provisions parks a probe crate outside your survey office.',
      'Nia Vale: "I surveyed it first. The can is just the receipt."',
      'Drift opens another outpost on a world you have not stocked yet.',
    ],
    flinch: 'Drift recalls a crate and calls it a survey error.',
    farewell: 'Nia Vale hands over the chalk: "Keep the probe yard honest."',
  },
  {
    id: 'keelmark',
    name: 'Keelmark Freight Foods',
    founder: 'Maris Keel',
    title: 'Manifest grocer',
    tagline: 'Your fonts on their crates, selling the route as a shelf.',
    era: 8,
    color: '#8a3c2e',
    accent: '#f2d2c4',
    initials: 'MK',
    startStores: 5,
    maxStores: 17,
    growSec: 580,
    buyoutBase: 6e15,
    taunts: [
      'Keelmark stamps your house font on a rival dock.',
      'Maris Keel: "A convoy is a store that moves. I prefer mine."',
      'Keelmark opens a bonded cage next to yours.',
    ],
    flinch: 'Keelmark freezes a bay "for paperwork".',
    farewell: 'Maris Keel signs the last manifest: "Keep the fonts. They already trust them."',
  },
  {
    id: 'verdant',
    name: 'Verdant Commons',
    founder: 'Marit Solheim',
    title: 'Steward, seed co-op',
    tagline: 'Heirloom seeds on a lending shelf, and every bed has a name.',
    era: 9,
    color: '#4a8f3c',
    accent: '#e3f6c8',
    initials: 'MS',
    startStores: 5,
    maxStores: 18,
    growSec: 600,
    buyoutBase: 2e17,
    taunts: [
      'Verdant Commons opens a seed library next to the greenhouse road.',
      'Marit Solheim: "You do not own a cultivar. You borrow it from the season."',
      'Verdant hands out free packets at the shuttle gate.',
    ],
    flinch: 'Verdant closes the lending shelf for a rainy week.',
    farewell: 'Marit Solheim signs: "Keep the beds named. A name is half the harvest."',
  },
  {
    id: 'static',
    name: 'Static FM Foods',
    founder: 'Jonah Pike',
    title: 'Host, call-in grocer',
    tagline: 'A late-night wire show that sells groceries between the songs.',
    era: 10,
    color: '#c0457a',
    accent: '#ffd3e6',
    initials: 'JP',
    startStores: 5,
    maxStores: 18,
    growSec: 660,
    buyoutBase: 1.2e18,
    taunts: [
      'Static FM Foods reads your price on air, then reads theirs.',
      'Jonah Pike: "Folks, the wire does not sleep, and neither do my deals."',
      'Static FM opens a booth under every relay mast.',
    ],
    flinch: 'Static FM goes to a long break of dead air.',
    farewell: 'Jonah Pike, off air: "Keep the dial warm. Somebody is always listening."',
  },
  {
    id: 'concord',
    name: 'Concord Provisioning',
    founder: 'Amara Teixeira',
    title: 'Secretary-General, treaty grocer',
    tagline: 'Same can, same price, every signatory. Footnotes extra.',
    era: 11,
    color: '#2a8c9a',
    accent: '#cdf3f7',
    initials: 'AT',
    startStores: 6,
    maxStores: 20,
    growSec: 720,
    buyoutBase: 8e18,
    taunts: [
      'Concord Provisioning opens a counter inside every embassy.',
      'Amara Teixeira: "A treaty is just a very long receipt."',
      'Concord files an amendment that happens to include a shelf.',
    ],
    flinch: 'Concord sends the matter to a committee that does not meet.',
    farewell: 'Amara Teixeira initials the last page: "Keep the footnotes. They hold the roof up."',
  },
  {
    id: 'ration',
    name: 'The Ration Board',
    founder: 'Ward Okonkwo',
    title: 'Chair, last-aisle ration board',
    tagline: 'One shelf, one list, one queue. Everyone eats the same.',
    era: 12,
    color: '#8a8478',
    accent: '#efe9dc',
    initials: 'WO',
    startStores: 6,
    maxStores: 20,
    growSec: 780,
    buyoutBase: 5e19,
    taunts: [
      'The Ration Board posts a list on the door of the last aisle.',
      'Ward Okonkwo: "Fairness is a queue nobody skips."',
      'The Ration Board stamps another shelf "Allotted".',
    ],
    flinch: 'The Ration Board declares a fast day and opens nothing.',
    farewell: 'Ward Okonkwo folds the list: "Keep the queue. It was the only kind thing we built."',
  },
]

export const RIVAL_BY_ID: Record<RivalId, RivalDef> = Object.fromEntries(RIVALS.map((r) => [r.id, r])) as Record<
  RivalId,
  RivalDef
>

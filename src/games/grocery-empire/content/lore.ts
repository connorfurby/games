import type { MenuId } from './menus'

/** Spoken when an era chapter opens (ledger + chapter card). */
export const ERA_STORY: Record<
  number,
  { title: string; line: string; epigraph: string }
> = {
  0: {
    title: 'The Counter',
    line: 'Era 0 — one shelf, one price, and a soft rent clock. Everything later remembers this room.',
    epigraph: 'Every empire begins as a shelf someone kept stocked.',
  },
  1: {
    title: 'Corner Store',
    line: 'Era 1 — the neighborhood learns your hours. Staff, produce, and a desk that fills with Attention.',
    epigraph: 'The block knows which door stays lit after dark.',
  },
  2: {
    title: 'Chain',
    line: 'Era 2 — more than one door. Attention splits. The book learns to grow money while you sleep.',
    epigraph: 'A second keyring is heavier than the first.',
  },
  3: {
    title: 'Cold Chain',
    line: 'Era 3 — freshness becomes infrastructure. Plants hum. Politics arrives with the tanks.',
    epigraph: 'Cold is a promise you pay for twice.',
  },
  4: {
    title: 'Autonomous Globe',
    line: 'Era 4 — stores that stock themselves. Ocean lanes. Fuel. Control. The brand drifts if you look away.',
    epigraph: 'Distance is just another aisle.',
  },
  5: {
    title: 'Seed Barges',
    line: 'Era 5 — orbit and drift. Guardians. The last ration question waits at the edge of the ledger.',
    epigraph: 'Someone still has to name what gets filled.',
  },
  6: {
    title: 'Hungry Universe',
    line: 'Era 6 — Accept or Reject. The hungry universe continues either way; only the laws change.',
    epigraph: 'The counter outlives the clerk who opened it.',
  },
}

/** First-time department unlock — short story for the ledger. */
export const MENU_LORE: Partial<Record<MenuId, string>> = {
  floor: 'Floor — the heartbeat. Unpack, price, sell.',
  backroom: 'Backroom opened — crates age here until Unpack puts them on offer.',
  suppliers: 'Suppliers — the walking wholesale price is a river. Learn when to step in.',
  staff: 'Staff — hands that unpack while you watch the needle.',
  marketing: 'Marketing — paper and promises that pull feet through the door.',
  books: 'Books — the tape remembers what the day tried to forget.',
  invest: 'Invest — park cash where rent cannot see it.',
  build: 'Build — wood, steel, cold, and civic ink. The shell grows around the counter.',
  upgrades: 'Upgrades — small permanent edges. Always something sized for your wallet.',
  ventures: 'Ventures — side doors that earn while the main aisle runs.',
  land: 'Land — lots, yards, and the next footprint.',
  strategy: 'Strategy — doctrines and tournaments. Read before you swing.',
  cold: 'Cold — plants and tanks. Freshness with a fuel bill.',
  politics: 'Politics — capital, lobby, leave. Regions have teeth.',
  logistics: 'Logistics — lanes, fuel, Control. Brand drift is a quiet thief.',
  fleet: 'Fleet — barges and guardians. The shelf reaches orbit.',
  empire: 'Empire — levels and perks. Baskets become a title.',
  coach: 'Coach — replay any lesson. Skip is always allowed.',
  more: 'More — shop, guide, settings, the soft edges of the run.',
}

/** Basket milestones — story ticks as the score climbs. */
export const BASKET_MILESTONES: { at: number; line: string }[] = [
  { at: 5, line: 'Five baskets. The register has a rhythm now.' },
  { at: 25, line: 'Twenty-five baskets. Regulars start recognizing the chalkboard.' },
  { at: 100, line: 'A hundred baskets. The neighborhood treats the door like weather.' },
  { at: 400, line: 'Four hundred baskets. Era pressure gathers — the corner wants a name.' },
  { at: 1000, line: 'A thousand baskets. Somewhere a clerk tells a story that starts here.' },
  { at: 5000, line: 'Five thousand. The ledger stops feeling like a hobby.' },
  { at: 25000, line: 'Twenty-five thousand. Cold air and politics start to make sense.' },
  { at: 100000, line: 'A hundred thousand baskets. The empire has a shadow.' },
]

/** Flavor blurbs shown atop department panels. */
export const PANEL_LORE: Partial<Record<MenuId, string>> = {
  floor: 'The sales floor is the thesis. Everything else is a department that feeds this aisle.',
  backroom: 'Storage is patient. Spoilage is not. Rotate, cool, and leave room for the next truck.',
  suppliers: 'Wholesale walks a sine wave. Buy the dips; unpack the arrivals; never worship a single index.',
  staff: 'People unpack, sell, and guard. Morale is a soft meter that still breaks the day if ignored.',
  marketing: 'Ads buy glances. Loyalty buys returns. Celebrity buys a loud week.',
  books: 'Revenue in, rent out, arrears when you slip. The tape does not judge — it only totals.',
  invest: 'The passbook is a quiet second store. Risk grows the pile; panic empties it.',
  build: 'Buildings change the mul. Choose the track that matches the bottleneck you feel.',
  upgrades: 'Leveled trees fill the gaps between memos. Buy small. Buy often.',
  ventures: 'Side businesses drip cash. Collect before the jar overflows into nowhere.',
  land: 'Footprint is destiny. Expand when the flagship feels small, not when you are bored.',
  strategy: 'Doctrines are opinions with teeth. Tournaments are opinions with brackets.',
  cold: 'Cold plants buy time for perishables. Momentum rewards the disciplined and punishes the greedy.',
  politics: 'Capital buys hearings. Leaving a region is also a kind of win.',
  logistics: 'Fuel and Control keep autonomous stores honest. Drift means the brand forgot its face.',
  fleet: 'Barges carry seed and question. Guardians answer with force or with patience.',
  empire: 'Empire level is a soft prestige of baskets. Perks are permanent habits.',
  coach: 'Every spotlight can play again. The game never locks the door behind a skipped tip.',
  more: 'Settings, cosmetics, guide, daily corner — the meta shelf beside the sim.',
}

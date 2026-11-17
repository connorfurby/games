import type { MenuId } from './menus'

/** Spoken when an era chapter opens (ledger + chapter card). */
export const ERA_STORY: Record<
  number,
  { title: string; line: string; epigraph: string }
> = {
  0: {
    title: 'The Counter',
    line: 'Era 0 — feature cans, serve regulars, buy on three price dips, staff the opening shift. Your next step always sits in Next goal at the top.',
    epigraph: 'Every empire begins as a shelf someone kept stocked.',
  },
  1: {
    title: 'Corner Store',
    line: 'Era 1 — Shift Board, invoice book, flagship planogram practice, then the side yard.',
    epigraph: 'The block knows which door stays lit after dark.',
  },
  2: {
    title: 'Chain',
    line: 'Era 2 — Flyer Desk weeks, matched stores, Star Board ≥ 3.7 before the cold permit.',
    epigraph: 'A second keyring is heavier than the first.',
  },
  3: {
    title: 'Cold Chain',
    line: 'Era 3 — Cooler Log signs, blast + tunnel, Fresh+Cold on the board, then leave.',
    epigraph: 'Cold is a promise you pay for twice.',
  },
  4: {
    title: 'Autonomous Globe',
    line: 'Era 4 — Dispatch Board clean manifests, win back a defection, then the berth.',
    epigraph: 'Distance is just another aisle.',
  },
  5: {
    title: 'Seed Barges',
    line: 'Era 5 — haulers clear pockets, staff the middle shift, hold off Off-Brand, feature ration packs.',
    epigraph: 'Someone still has to name what gets filled.',
  },
  6: {
    title: 'Hungry Universe',
    line: 'Era 6 — ration week freezes the Star Board. Continue, Accept, or Reject. The aisle stays.',
    epigraph: 'The counter outlives the clerk who opened it.',
  },
  7: {
    title: 'Pantry of Worlds',
    line: 'Era 7 — practise two shelf layouts, put a surveyor on a shift, then file one for credit (72% or 85%).',
    epigraph: 'A planet is a shelf that learned a climate.',
  },
  8: {
    title: 'The Exchange',
    line: 'Era 8 — pack a convoy. Leaving the awkward crate out gets 72%; a stevedore helps you reach 85%.',
    epigraph: 'A route is a promise with a middle.',
  },
  9: {
    title: 'Cultivars',
    line: 'Era 9 — named crosses and season chores on the Shift Board. A weak year is still a gate.',
    epigraph: 'Seed pays rent in traits.',
  },
  10: {
    title: 'The Signal',
    line: 'Era 10 — phrases on the wire. 3 of 4 right gets 72%; a perfect phrase is the quick way.',
    epigraph: 'Someone was hired to hear the orders.',
  },
  11: {
    title: 'Charter of Groceries',
    line: 'Era 11 — keep four clauses, clear Concord’s hearing docket (2–3 sessions), then stamp.',
    epigraph: 'A stamp is a small law.',
  },
  12: {
    title: 'The Last Aisle',
    line: 'Era 12 — Ivo’s list. Staffed departments make lines kinder. Accepting needs 85%.',
    epigraph: 'One can, and then the plaque or the standing order.',
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
  build: 'Build — pay once for more room. Capacity, not habits.',
  upgrades: 'Upgrades — layered cash trees. Empire rank opens the next band.',
  ventures: 'Ventures — side doors that earn while the main aisle runs.',
  land: 'Land — lots, yards, and the next footprint.',
  strategy: 'Strategy: spend Attention to earn Read, spend Read on strategies.',
  cold: 'Cold — plants and tanks. Freshness with a fuel bill.',
  politics: 'Politics — capital, lobby, leave. Regions have teeth.',
  logistics: 'Logistics — lanes, fuel, Control. Brand drift is a quiet thief.',
  fleet: 'Fleet — barges and guardians. The shelf reaches orbit.',
  empire: 'Empire — baskets become a rank. Rank opens upgrade bands; trait points buy perks.',
  planets: 'Planets — six shelves for a world that wanted three tags.',
  exchange: 'Exchange — three worlds, one good, and a convoy that has to fit.',
  cultivars: 'Cultivars — plant ahead of the season. Forgetting is a weak year, not a loss.',
  signal: 'Signal — four marks on the wire. File the modal and three of four will hold.',
  charter: 'Charter — keep four clauses, then a fork. The grudge is on the card.',
  lastaisle: 'Last aisle — Ivo’s list. Staffed departments soften the hard lines.',
  coach: 'Coach opened — replay a lesson when the aisle feels loud again.',
  more: 'More — shop, guide, settings, the soft edges of the run.',
}

/** Basket milestones — story ticks as the score climbs. */
export const BASKET_MILESTONES: { at: number; line: string }[] = [
  { at: 5, line: 'Five baskets. The register has a rhythm now.' },
  { at: 25, line: 'Twenty-five baskets. Regulars start recognizing the chalkboard.' },
  { at: 100, line: 'A hundred baskets. The neighborhood treats the door like weather.' },
  { at: 400, line: 'Four hundred baskets. The corner wants a name.' },
  { at: 1000, line: 'A thousand baskets. Somewhere a clerk tells a story that starts here.' },
  { at: 5000, line: 'Five thousand. The ledger stops feeling like a hobby.' },
  { at: 25000, line: 'Twenty-five thousand. The neighborhood feels small.' },
  { at: 100000, line: 'A hundred thousand baskets. The empire has a shadow.' },
]

/** Flavor blurbs shown atop department panels. */
export const PANEL_LORE: Partial<Record<MenuId, string>> = {
  floor: 'The sales floor is the thesis. Everything else is a department that feeds this aisle.',
  backroom: 'Storage is patient. Spoilage is not. Rotate, cool, and leave room for the next truck.',
  suppliers: 'Wholesale walks a sine wave. Buy the dips; unpack when crates land.',
  staff: 'Shift Board first: Open / Mid / Close. People unpack, sell, and guard.',
  marketing: 'Flyer Desk prints weeks. Ads buy glances. Celebrity buys a loud week.',
  books: 'Invoice book + tape. Revenue in, rent out; late fees hit stars.',
  invest: 'The passbook is a quiet second store. Risk grows the pile; panic empties it.',
  build: 'One-time capacity buys. If the shelf is full or seats are gone, you are here.',
  upgrades: 'Layered cash ranks with prereqs and capstone forks. Empire trait points buy perks.',
  ventures: 'Side businesses drip cash. Collect before the jar overflows into nowhere.',
  land: 'Footprint is destiny. Expand when the flagship feels small, not when you are bored.',
  strategy: 'Spend Attention on a tournament, earn Read, buy the next strategy.',
  cold: 'Cooler Log signs buy leave. Plants buy time. Momentum punishes neglect.',
  politics: 'Capital buys hearings. Leaving a region is also a kind of win.',
  logistics: 'Dispatch Board matches cargo. Fuel and Control keep doors honest.',
  fleet: 'Pocket Ops hauler ETAs clear biomass. Guardians answer with force or patience.',
  empire: 'Rank from baskets opens upgrade bands and invest caps. Trait points buy perks.',
  planets: 'Practice two shelves, then credit. Survey on a shift opens the gate.',
  exchange: 'Practice convoys, then credit. Freight buys a circuit.',
  cultivars: 'Practice crosses, then seasons. The year tells you which child it wants.',
  signal: 'Practice phrases, then credit. A relay pays before the first file.',
  charter: 'Keep four. Clear Concord’s hearing docket, then stamp.',
  lastaisle: 'The list is pinned to this save. Departments you staffed make lines kinder.',
  coach: 'Every spotlight can play again. Skip when the counter already makes sense.',
  more: 'Settings, looks, the guide and today’s corner.',
}

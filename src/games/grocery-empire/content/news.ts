/**
 * Player-facing news desk. Always update this when shipping visible changes.
 * Do NOT use SAVE_VERSION here — that is save-format only.
 *
 * Protocol: bump GAME_VERSION (patch/minor), prepend a NEWS article, keep newest first.
 */

export const GAME_VERSION = '1.0.10'

/** Era bands the News filter offers. `meta` is shell/site news that isn't about an era. */
export type NewsBand = 'e01' | 'e23' | 'e46' | 'e712' | 'meta'

export const NEWS_BANDS: { id: NewsBand; label: string }[] = [
  { id: 'e01', label: 'Eras 0–1' },
  { id: 'e23', label: 'Eras 2–3' },
  { id: 'e46', label: 'Eras 4–6' },
  { id: 'e712', label: 'Eras 7–12' },
  { id: 'meta', label: 'Meta' },
]

export interface NewsArticle {
  id: string
  /** ISO date YYYY-MM-DD */
  date: string
  headline: string
  /** Display version this article ships with */
  version: string
  /** Era bands this article touches (a sweeping release lists several). */
  bands: NewsBand[]
  /** One-line dek under the headline */
  dek: string
  /** Short paragraphs */
  body: string[]
  /** Section label above the headline (Release, Feature, Guide, Desk). */
  kicker?: string
  /** "In this edition" cards: one change each, optionally pointing at a wiki page. */
  highlights?: { label: string; text: string; band?: NewsBand; wiki?: string }[]
  /** Wiki pages to read next. */
  wiki?: string[]
  /** Header art. Defaults from the first band. */
  art?: NewsArt
  /** Who filed it (cast portrait). Defaults to Operations. */
  by?: 'operations' | 'clerk' | 'cold' | 'lobbyist' | 'guardian'
}

export type NewsArt = 'counter' | 'corner' | 'cold' | 'fleet' | 'worlds' | 'desk'

export function newsArt(a: NewsArticle): NewsArt {
  if (a.art) return a.art
  const b = a.bands[0]
  return b === 'e01' ? 'counter' : b === 'e23' ? 'corner' : b === 'e46' ? 'fleet' : b === 'e712' ? 'worlds' : 'desk'
}

/** Newest first. Agents: prepend — never bury the latest bulletin. */
export const NEWS: NewsArticle[] = [
  {
    id: '2026-11-20-crew-and-dock',
    bands: ['e01', 'e23'],
    date: '2026-11-20',
    version: '1.0.10',
    kicker: 'Desk',
    art: 'counter',
    headline: 'Longer hire list, and the dock closes when the count is in',
    dek: 'New hires keep their own names. Dock check-in leaves once the side yard has its twenty-eight. Auto-restock buys the mix.',
    body: [
      'The floor used to run out of names and start numbering people. The list is much longer now. The next three hires are Connor, Luke, and Jonas if those names are not already on the clock. People already hired keep the names they have.',
      'Dock check-in was the side-yard count, then it stayed on the desk and kept handing out free crates. Once you have checked in twenty-eight trucks, that card and the Autopilot row go away. Ordering is the wholesaler’s job after that.',
      'Auto-restock was giving the spare crate to the aisle you already had the most of, which kept filling the back with cans. It now buys whichever unlocked aisle is furthest under your restock mix.',
    ],
  },
  {
    id: '2026-11-20-crisis-deck',
    bands: ['e01', 'e23', 'e46', 'e712'],
    date: '2026-11-20',
    version: '1.0.9',
    kicker: 'Desk',
    art: 'desk',
    headline: 'Hundreds of crises, not the same rat',
    dek: 'When your company is in the public eye, the corner card draws from a deep deck — press, shelf, payroll, alley, and more.',
    body: [
      'The viral rat still exists, and it retires after Era 3. About two hundred and forty hand-written crises now span Eras 1–12, each with three answers and a type on the card (Press, Cash, Shelf, Payroll, Side door, Alley, Spectacle, Ticker).',
      'The desk remembers what you have already seen and prefers fresh trouble. Walking away stays mild; the buttons are where the shake-ups live.',
    ],
  },
  {
    id: '2026-11-20-smooth-arrivals',
    bands: ['e01', 'e23', 'e46', 'e712'],
    date: '2026-11-20',
    version: '1.0.8',
    kicker: 'Desk',
    art: 'corner',
    headline: 'New rooms arrive one list at a time',
    dek: 'Era doors and department dumps show what opened, then wait for Stay here or Show me.',
    body: [
      'When a chapter opens — or a hub unlocks several rooms at once — you get one list of what just arrived. Stay here puts the tabs on the rail and leaves you where you were. Show me walks you to the one new lesson.',
      'The coach no longer starts under the chapter card, and the rail does not jump until you choose. A single new room can appear quietly with a short notice and the same two choices.',
    ],
  },
  {
    id: '2026-11-20-depot-on-the-block',
    bands: ['e23'],
    date: '2026-11-20',
    version: '1.0.7',
    kicker: 'Desk',
    art: 'corner',
    headline: 'The depot has a lot',
    dek: 'It sits on the left of your block, with a card that says what it still needs.',
    body: [
      'The depot was easy to miss. The tip asked for it, and the buy button only appeared after you already had the Read.',
      'Land now keeps a warehouse at the left of the block. The card under your stores shows the price, how much Read you still need, and a way to Strategy when that is the holdup.',
    ],
  },
  {
    id: '2026-11-20-auto-restock-fill',
    bands: ['e01'],
    date: '2026-11-20',
    version: '1.0.6',
    kicker: 'Desk',
    art: 'counter',
    headline: 'The clipboard fills the backroom',
    dek: 'Auto-restock buys at today’s price until the dock is full — no min/max dials.',
    body: [
      'With the Auto-Order Clipboard on, the desk keeps ordering at the live wholesale price until on-hand stock and trucks on the road fill the backroom. Emptiest aisle first. You can still tap Buy by hand.',
      'The old max-cost and keep-in-back dials are gone. Restock Smarts no longer waits for a dip — the clipboard buys through spikes so the shelf does not run dry.',
    ],
  },
  {
    id: '2026-11-20-road-and-chores',
    bands: ['e01', 'e23'],
    date: '2026-11-20',
    version: '1.0.5',
    kicker: 'Desk',
    art: 'corner',
    headline: 'The road lists every part of the door',
    dek: 'Dock trucks after three choices, and the next-goal button names the verb.',
    body: [
      'Road ahead shows a status on every step, and the side-yard door expands into a checklist (write-offs, Fresh lead, dairy, regulars, invoices, dock, planogram, Open days, cash) even while you are still on an earlier step. The next-chapter card keeps the title and the quote.',
      'The first three dock check-ins are yours to aim. After that, a receiver on shift finishes the twenty-eight. Matching neighbours after the eight layaway slips leave happy on their own. The top button says Check in or Serve when it will work, shows the wait when the truck is still out, and stays quiet while a chore is running itself.',
    ],
  },
  {
    id: '2026-11-20-corner-store-line',
    bands: ['e01'],
    date: '2026-11-20',
    version: '1.0.4',
    kicker: 'Desk',
    art: 'corner',
    headline: 'The corner store says what is left',
    dek: 'After the slips, the next goal still names the baskets you have to sell.',
    body: [
      'Clearing the layaway slips does not change the sign. The corner store opens on its own once cans are featured, three low prices are bought, the regulars are served, the slips are cleared, the stars hold, and enough baskets have sold. A clerk on the Open shift lowers that basket number.',
      'The next-goal line keeps that list, including baskets. Do it only appears when the click will take the next step. If it cannot, the card says why — feature the can they asked for, or stock the shelf — instead of a button that does nothing.',
    ],
  },
  {
    id: '2026-11-20-back-office-card',
    bands: ['e01'],
    date: '2026-11-20',
    version: '1.0.3',
    kicker: 'Desk',
    art: 'counter',
    headline: 'The back office has a desk',
    dek: 'Attention and Reputation stay on the card, even when the desk is folded.',
    body: [
      'The back office was a thin line in the memo column, and it hid itself. The numbers beside it were cut off.',
      'It now sits at the top of Memos. The header names the office and shows Attention and Reputation. Open it to hire an Analyst or open an Archive.',
    ],
  },
  {
    id: '2026-11-20-layaway-shorter',
    bands: ['e01'],
    date: '2026-11-20',
    version: '1.0.2',
    kicker: 'Desk',
    art: 'counter',
    headline: 'Layaway is a short lesson',
    dek: 'Eight slips, and the next neighbor comes back sooner.',
    body: [
      'Clearing sixteen layaway slips was a long wait after the rest of the opening was already done. You now need eight, and the next neighbor shows up sooner.',
      'A slip still will not clear itself. The stack finishes while you are stocking and hiring. The corner-store door waits on baskets.',
    ],
  },
  {
    id: '2026-11-20-pause-clock',
    bands: ['meta'],
    date: '2026-11-20',
    version: '1.0.1',
    kicker: 'Desk',
    art: 'desk',
    headline: 'A paused store tells you',
    dek: 'The store opens running. Leave it paused and a clock offers Resume.',
    body: [
      'Opening the store starts the day moving, even if you had paused before you left. Time you were away while paused stays where you left it.',
      'If you pause and stay there, a small clock appears after half a minute, with a Resume button.',
    ],
  },
  {
    id: '2026-11-16-grocery-empire-1-0',
    bands: ['meta', 'e01', 'e23', 'e46', 'e712'],
    date: '2026-11-16',
    version: '1.0',
    kicker: 'Release',
    art: 'corner',
    headline: 'Grocery Empire: the doors are open',
    dek: 'One counter, one price and a stack of crates. The rest is up to you.',
    wiki: ['start-what', 'start-controls', 'start-first-hour'],
    highlights: [
      { label: 'Start at the counter', text: 'Ring up baskets by hand, hire your first clerk, and let the store start running itself.', band: 'e01', wiki: 'start-what' },
      { label: 'A store you can see grow', text: 'Your storefront sits over the Store rooms and changes with everything you build, from a stall to a flagship street.', band: 'e01' },
      { label: 'Name it', text: 'Put your own name on the sign. It shows on the storefront and the top bar.', band: 'e01' },
      { label: 'Thirteen eras', text: 'Each era opens new rooms and ends with a door to the next. Later eras stay sealed until you reach them.', band: 'meta' },
      { label: 'Regulars', text: 'The neighbours who keep coming back have a page of their own: who they are, what they come for, how well you know them.', band: 'e01' },
      { label: 'A museum of your run', text: 'Chests turn into relics, relics fill wings, and full wings pay small bonuses. It stays with you between runs.', band: 'meta' },
      { label: 'Help when you want it', text: 'Tap ? in any room for a short page about it. Lessons can be replayed any time.', band: 'meta', wiki: 'start-controls' },
      { label: "Today's corner", text: 'One fresh start a day, the same for everyone. Keep a streak going on the home page.', band: 'meta' },
      { label: 'Everything on the page', text: 'Each room lays its tools out in plain view: hiring, shifts, invoices, strategies. No hunting through little buttons, and nothing to press until it can be pressed.', band: 'meta' },
      { label: 'A twist every day', text: 'Today’s corner now comes with a rule of the day, like Payday or Delivery day: one thing gets easier, one gets harder.', band: 'meta' },
      { label: 'An awards wall', text: 'Awards hang on shelves by theme, with plaques for what you have done and what is still to come.', band: 'meta' },
      { label: 'Music and sound, if you like', text: 'A quiet score that changes with each era and settles down late at night, plus a till that sings while you sell. Off until you turn it on.', band: 'meta' },
      { label: 'Plays on a phone', text: 'Every room is laid out for a small screen, and the main button stays under your thumb.', band: 'meta' },
    ],
    body: [
      'Grocery Empire starts with one counter and one job: ring up a basket. Everything after that is a way to sell more baskets without pressing the button yourself.',
      'A short opening lesson walks you through the floor: unpack, sell, set a price, restock. After that the store is yours.',
      'There are thirteen eras. Each one opens new rooms and ends with a door to the next. The atlas in the guide shows the whole road and keeps what you have not reached under wraps.',
      'Your storefront is always on screen over the Store rooms. Build something and it shows up on the street. Give the store a name and it goes on the sign.',
      'Relics, awards and shop purchases belong to you, not to one run. Starting a new game asks whether to keep them or begin with nothing at all.',
      'If something is unclear, tap ? in the room you are in.',
    ],
  },
]

export function latestNews(): NewsArticle {
  return NEWS[0]!
}

export function newsById(id: string): NewsArticle | undefined {
  return NEWS.find((a) => a.id === id)
}

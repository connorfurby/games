/**
 * Player-facing news desk. Always update this when shipping visible changes.
 * Do NOT use SAVE_VERSION here — that is save-format only.
 *
 * Protocol: bump GAME_VERSION (patch/minor), prepend a NEWS article, keep newest first.
 */

export const GAME_VERSION = '1.0.5'

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

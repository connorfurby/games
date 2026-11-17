/**
 * Player-facing news desk. Always update this when shipping visible changes.
 * Do NOT use SAVE_VERSION here — that is save-format only.
 *
 * Protocol: bump GAME_VERSION (patch/minor), prepend a NEWS article, keep newest first.
 */

export const GAME_VERSION = '1.0'

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
    id: '2026-11-16-grocery-empire-1-0',
    bands: ['meta', 'e01', 'e23', 'e46', 'e712'],
    date: '2026-11-16',
    version: '1.0',
    kicker: 'Release',
    art: 'corner',
    headline: 'Grocery Empire 1.0: the doors are open',
    dek: 'One counter, thirteen eras, and a wiki that explains every one of them. This is edition one.',
    wiki: ['start-what', 'start-controls', 'start-first-hour'],
    highlights: [
      { label: 'Start at the counter', text: 'Ring up baskets by hand, hire your first clerk, and let the store start running itself.', band: 'e01', wiki: 'start-what' },
      { label: 'Opening tour', text: 'One continuous floor lesson after the intro — Unpack, Baskets, Price, Restock — instead of a pile of tips.', band: 'e01', wiki: 'start-first-hour' },
      { label: 'Thirteen eras', text: 'Each era opens new departments and one door out. The era atlas keeps later ones sealed until you reach them.', band: 'meta' },
      { label: 'Ops Wiki', text: 'Steps, checklists, diagrams and a glossary, on the site or inside the Menu without leaving your run.', band: 'meta', wiki: 'start-controls' },
      { label: 'Lessons', text: 'Every Coach lesson in one place. Play this lesson opens the game and points at the button.', band: 'e01', wiki: 'start-first-hour' },
      { label: 'Fits your phone', text: 'Rooms re-lay for small screens, numbers stay readable, and the main button rides the bottom edge in thumb reach.', band: 'meta' },
      { label: 'Help in the room', text: 'Tap ? on any department for its wiki page. Tips show inside the room they are about.', band: 'meta', wiki: 'start-controls' },
      { label: 'One button system', text: 'Tomato is the free verb, tag yellow spends, quiet is navigation.', band: 'meta', wiki: 'start-controls' },
      { label: 'Your store on the street', text: 'A living banner over the Store hub shows your storefront growing from a stall to a flagship. Expand it for the whole skyline.', band: 'e01' },
      { label: 'Reset what you choose', text: 'Settings can now clear the run, save slots, museum, shop tokens or achievements, each on its own.', band: 'meta' },
      { label: 'Museum by wing', text: 'The Museum opens on a card per wing. Tap one to walk its wall.', band: 'meta' },
    ],
    body: [
      'Grocery Empire starts with one counter and one free verb: ring up a basket. Everything after that is a way to sell more baskets without pressing the button yourself.',
      'A new corner store gets one opening tour after the intro — Unpack, Baskets, Price, Restock — so the first hour is one lesson instead of staggered tips.',
      'There are thirteen eras. Each one opens new departments and ends with a door to the next. The era atlas in the Ops Wiki shows the whole road and keeps the eras you have not reached sealed unless you turn on spoilers.',
      'If something is unclear, the wiki is one tap away. Menu → Wiki opens it inside your run, and its Open buttons jump straight to the department it is describing. Lessons replays any Coach tour.',
      'Buttons mean the same thing everywhere: tomato is free, tag yellow spends, quiet moves you around. Notices stay out of the way of the top bar and the main button.',
      'Your save from earlier builds carries over. The bulletin starts fresh from this edition.',
    ],
  },
]

export function latestNews(): NewsArticle {
  return NEWS[0]!
}

export function newsById(id: string): NewsArticle | undefined {
  return NEWS.find((a) => a.id === id)
}

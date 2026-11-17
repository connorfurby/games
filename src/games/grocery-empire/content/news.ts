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
      { label: 'Sound, if you like', text: 'A soft till chime, a purchase ring and a sting for each new era. Off until you turn it on.', band: 'meta' },
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

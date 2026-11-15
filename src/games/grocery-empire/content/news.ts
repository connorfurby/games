/**
 * Player-facing news desk. Always update this when shipping visible changes.
 * Do NOT use SAVE_VERSION here — that is save-format only.
 *
 * Protocol: bump GAME_VERSION (patch/minor), prepend a NEWS article, keep newest first.
 */

export const GAME_VERSION = '3.0'

export interface NewsArticle {
  id: string
  /** ISO date YYYY-MM-DD */
  date: string
  headline: string
  /** Display version this article ships with */
  version: string
  /** One-line dek under the headline */
  dek: string
  /** Short paragraphs */
  body: string[]
}

/** Newest first. Agents: prepend — never bury the latest bulletin. */
export const NEWS: NewsArticle[] = [
  {
    id: '2026-11-14-feel-3',
    date: '2026-11-14',
    version: '3.0',
    headline: 'Feel overhaul — the aisle shows up',
    dek: 'One frame. One verb. Choices you can see.',
    body: [
      'Every department uses the same PlayFrame: purpose, room, one primary verb, up to four secondaries. Yellow spends; tomato is the free verb; Done is quiet ghost.',
      'Phone bar keeps Money when Worlds unlocks — Empire and Worlds sit behind Hubs. Next Goal is the only coach on screen when it already names the tip.',
      'Climate neighbors need a matching world and pull shelf stock. Habit watches fail if the agent drifts. Dock check-ins put crates into a chosen aisle. Close and Mid shifts finally do something.',
    ],
  },
  {
    id: '2026-11-14-after-hours',
    date: '2026-11-14',
    version: '2.0',
    headline: 'After Hours on the Floor',
    dek: 'One aisle. One verb. Yellow spends; tomato is free.',
    body: [
      'The Floor is quieter: Unpack or Serve as the main free verb, with Facing, Price, Restock, and Bay in the desk sheets.',
      'Yellow buttons spend cash. Tomato buttons are free — exams, ledgers, stops, cooler logs.',
      'Coach tours wait their turn. One lesson at a time, a short calm between them, and Suggested buys stay quiet while Operations is talking.',
    ],
  },
  {
    id: '2026-11-14-first-hour',
    date: '2026-11-14',
    version: '2.0',
    headline: 'Your first hour on the block',
    dek: 'Unpack → baskets → price → truck → rent.',
    body: [
      'Press Unpack until the shelf has cans. Baskets (top-left) are the score; cash pays rent and the next crate.',
      'Nudge shelf price near $1.50. Buy wholesale on a soft index, wait for the truck, Unpack again.',
      'Rent is soft pressure — arrears, not game over. When Help Wanted lands, hire a clerk and staff the Open shift.',
    ],
  },
  {
    id: '2026-11-14-news-desk',
    date: '2026-11-14',
    version: '2.0',
    headline: 'This bulletin board stays open',
    dek: 'A short article whenever the aisle changes for players.',
    body: [
      'Grocery Empire shows a display version (v3.0) separate from save migrations. When something changes for players, it shows up here.',
      'Open News from Home, the top bar, or More inside a run.',
    ],
  },
]

export function latestNews(): NewsArticle {
  return NEWS[0]!
}

export function newsById(id: string): NewsArticle | undefined {
  return NEWS.find((a) => a.id === id)
}

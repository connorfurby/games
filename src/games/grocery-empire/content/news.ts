/**
 * Player-facing news desk. Always update this when shipping visible changes.
 * Do NOT use SAVE_VERSION here — that is save-format only.
 *
 * Protocol: bump GAME_VERSION (patch/minor), prepend a NEWS article, keep newest first.
 */

export const GAME_VERSION = '40.0'

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
}

/** Newest first. Agents: prepend — never bury the latest bulletin. */
export const NEWS: NewsArticle[] = [
  {
    id: '2026-11-15-ship-40',
    bands: ['e01', 'e23', 'e46', 'e712'],
    date: '2026-11-15',
    version: '40.0',
    headline: "What's new in 40.0 — every aisle asks you something",
    dek: 'Nine phases of receipts: two regulars, three stances, a harder Accept, and an aisle with no last page.',
    body: [
      'The frame got tidier first. Floor, Suppliers, Cold, and Logistics share one frame and one sentence of purpose, the phone bar lights up when Empire, Worlds, or the Museum have something waiting, and the dialogue sits above the hub bar instead of on top of your thumb.',
      'Small kindnesses followed. The command palette finds upgrades, memos, and roles; Undo says what it undid and how long you have; Suppliers can order by the minimum, by five, or to fill; hidden tabs raise the same alert the HUD does; and the blocked buttons now point at the room that unblocks them.',
      'Two regulars can wait at once. A second shopper arrives while the first is unserved, both keep their own patience, and you can switch between them. The Facing sheet tells you what each one wants and which facing they notice. Invoices now ask whether to float the bill or hire the clerk, with both prices on the slip.',
      'Rivals answer your marketing. A deep flyer makes Penny lock your aisles sooner; a soft one lets FreshWay spoil your produce faster; a mid week keeps the peace. Powering the blast freezer costs you the tunnel until you sign the Cooler log, and every department now shows all its policies on Staff.',
      'Manifests take a stance: clean, exam-ready, or fast. One filing, one stance, and a note under each button saying why it is blocked. Two open pockets can want two rations on one hauler; Second Berth is how you feed both. Eras 5 and 6 add build facings, and Accept now rebuilds the store the way Rebrand does, keeping your Empire, museum, and Goodwill.',
      'Worlds stopped being a staircase. A climate guest — Pilar, Ansel, Orla, Tamsin, Bram, or Ismay — bans your strongest facing until the shift turns, and Guest Patience (or the Guest Awning) softens the bite. Each settled stop taxes its circuit with spoil, tariff, or delay. A season chore locks the bed until the turn; Bed Lock Pad and the Bed Glass project open the last stretch of the season. File the standard is always on the tray.',
      'The wire and the charter ask for choices too. A filed phrase posts its habit and holds that agent until the watch resolves. Concord hears the clause you actually seated, and the Minutes Clerk can amend a grudge away — more of them with Clause Amend Pad or the Embassy Chair. Standard, Boutique, or Co-op is a fork on your Next Goal. A rehearsal at 0.85 can still miss and scratch a line.',
      'Past the last page: Accept is a rebuild, Reject is still silence, and Continue is still a door. Endless worlds keep mutating the standing order; Endless Edit Pad slows it, Mutation Clear Pad restores a line when you ease the Ration Board, and the Museum keeps the chests you earn on the way.',
      'Ration week has a clipboard now. Stamp the ledger each shift day, or the Board quietly skims a slice of your demand until you do. It costs nothing to stamp and a little to forget.',
    ],
  },
  {
    id: '2026-11-15-ship-4',
    bands: ['e01', 'e23', 'e46'],
    date: '2026-11-15',
    version: '4.0',
    headline: '4.0 — Departments that finish, goals that fit',
    dek: 'Next Goal free CTA. Strategy ladder. Build facings. Real PlayFrame rooms.',
    body: [
      'Free Next Goals use a tomato button — no shelf-tag punch-hole — and the alert sits on its own row so 390px stays readable.',
      'Strategy shows the full doctrine ladder. Build picks facings across eras 1–4. Fleet, Empire, Planets, Memos, and Upgrades are living rooms with one primary verb.',
      'Upgrade Best and Buy Best still sweep; Buy Best ranks by effect per cost. Tournaments cool down. Bulletin stays on News, More, and Settings only.',
    ],
  },
  {
    id: '2026-11-14-feel-3',
    bands: ['e01', 'e46', 'e712'],
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
    bands: ['e01'],
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
    bands: ['e01'],
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
    bands: ['meta'],
    date: '2026-11-14',
    version: '2.0',
    headline: 'This bulletin board stays open',
    dek: 'A short article whenever the aisle changes for players.',
    body: [
      'Grocery Empire shows a display version separate from save migrations. When something changes for players, it shows up here.',
      'Open News from Home or More inside a run.',
    ],
  },
]

export function latestNews(): NewsArticle {
  return NEWS[0]!
}

export function newsById(id: string): NewsArticle | undefined {
  return NEWS.find((a) => a.id === id)
}

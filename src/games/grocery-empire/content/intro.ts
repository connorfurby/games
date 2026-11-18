import type { PlateId, SpeakerId } from '../art/cast'

/** Opening cutscene — shown once per save before any coach tour. */

export interface IntroBeat {
  speaker: SpeakerId
  plate?: PlateId
  kicker: string
  title: string
  body: string
  /** Ledger line written when the player advances past this beat. */
  ledger?: string
}

export const INTRO_BEATS: IntroBeat[] = [
  {
    speaker: 'operations',
    plate: 'counter',
    kicker: 'Operations',
    title: 'Keys on the counter',
    body: 'The neighborhood already knows this door. You keep the shelf honest. I keep the lights from lying. Welcome to Grocery Empire.',
    ledger: 'Grocery Empire — one counter, then everything that grows from it.',
  },
  {
    speaker: 'clerk',
    plate: 'corner',
    kicker: 'You',
    title: 'Day one',
    body: 'A shelf of cans and cheap rent. Unpack cans onto the shelf, people buy them, and when you have the cash you order more. New parts of the store explain themselves when they open.',
    ledger: 'Keys on the counter. The sign still says OPEN.',
  },
  {
    speaker: 'operations',
    plate: 'corner',
    kicker: 'The tally',
    title: 'Baskets and cash',
    body: 'Every sale is a basket, and baskets are your score. Cash pays rent and buys more stock. Keep an eye on both.',
    ledger: 'A basket is a trip that finished. Count those.',
  },
  {
    speaker: 'clerk',
    plate: 'counter',
    kicker: 'The loop',
    title: 'Three jobs',
    body: 'Unpack the shelf. Set a fair price. Order more stock. That loop runs the whole empire; everything else is built on top of it.',
    ledger: 'Three verbs. Everything else is a department.',
  },
  {
    speaker: 'operations',
    plate: 'corner',
    kicker: 'Begin',
    title: 'Open the door',
    body: 'I’ll show you each of those once. Skip whenever you’d rather figure it out yourself.',
    ledger: 'Coach on standby. Unpack when you are ready.',
  },
]

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
    title: 'Era 0 starts here',
    body: 'Cans. Soft rent. Unpack onto the shelf, take baskets, call a truck when the till allows. Departments teach themselves when they arrive.',
    ledger: 'Keys on the counter. The sign still says OPEN.',
  },
  {
    speaker: 'operations',
    plate: 'corner',
    kicker: 'The tally',
    title: 'Baskets and cash',
    body: 'Baskets are the neighborhood’s memory of you. Cash beside them pays rent and crates. Watch both — they argue different points.',
    ledger: 'A basket is a trip that finished. Count those.',
  },
  {
    speaker: 'clerk',
    plate: 'counter',
    kicker: 'The loop',
    title: 'Three verbs',
    body: 'Unpack. Price. Wholesale. That heartbeat runs the whole empire. Everything else is a department stacked on top.',
    ledger: 'Three verbs. Everything else is a department.',
  },
  {
    speaker: 'operations',
    plate: 'corner',
    kicker: 'Begin',
    title: 'Open the door',
    body: 'I’ll point at Unpack, price, wholesale, and rent once. Skip whenever the aisle feels loud enough on its own.',
    ledger: 'Coach on standby. Unpack when you are ready.',
  },
]

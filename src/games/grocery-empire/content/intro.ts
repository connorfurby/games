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
    body: 'You keep the shelf stocked. I keep you from deleting the save. Welcome to Grocery Empire — one corner store that outgrows the block.',
    ledger: 'Grocery Empire — one counter, then everything that grows from it.',
  },
  {
    speaker: 'clerk',
    plate: 'corner',
    kicker: 'You',
    title: 'Era 0 starts here',
    body: 'Cans. A soft rent clock. Unpack onto the shelf, sell baskets, buy a truck when cash allows. Later departments teach themselves when they arrive.',
    ledger: 'Keys on the counter. The sign still says OPEN.',
  },
  {
    speaker: 'operations',
    plate: 'corner',
    kicker: 'The score',
    title: 'Baskets never spend',
    body: 'Baskets are progress — they unlock memos and chapters. Cash (beside them) pays rent and crates. Watch the big number top-left.',
    ledger: 'A basket is a trip that finished. Count those.',
  },
  {
    speaker: 'clerk',
    plate: 'counter',
    kicker: 'The loop',
    title: 'Three verbs',
    body: 'Unpack. Price. Wholesale. That heartbeat runs the whole empire. Everything else is a department on top.',
    ledger: 'Three verbs. Everything else is a department.',
  },
  {
    speaker: 'operations',
    plate: 'corner',
    kicker: 'Begin',
    title: 'You cannot lose',
    body: 'Bad weeks only slow you. I will spotlight Unpack, baskets, price, wholesale, and rent once. Skip anytime. Open the counter when ready.',
    ledger: 'Coach on standby. Unpack when you are ready.',
  },
]

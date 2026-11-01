/** Opening cutscene — shown once per save before any coach tour. */

export interface IntroBeat {
  kicker: string
  title: string
  body: string
  /** Ledger line written when the player advances past this beat. */
  ledger?: string
}

export const INTRO_BEATS: IntroBeat[] = [
  {
    kicker: 'Grocery Empire',
    title: 'A corner store that outgrows the block',
    body: 'Grocery Empire is the long story of one counter. You start with cans and a soft rent clock. Eras later you run cold plants, barges, and ration networks that feed a hungry universe. The name is the joke and the thesis: every empire begins as a shelf someone kept stocked.',
    ledger: 'Grocery Empire — one counter, then everything that grows from it.',
  },
  {
    kicker: 'You run the counter',
    title: 'Today is Era 0',
    body: 'Right now you are the clerk, the buyer, and the pricing board. Get cans onto the shelf and sell them. Later departments appear as memos and menus — Staff, Suppliers, Cold, Fleet — each teaching itself when it arrives. You do not need those yet.',
    ledger: 'Keys on the counter. The sign still says OPEN.',
  },
  {
    kicker: 'The score',
    title: 'Baskets are progress',
    body: 'Every completed sale fills a basket. Baskets never spend — they are how the game measures how far you have come. Cash (next to baskets) pays rent and crates. Baskets unlock memos, menus, and the next chapter of the story. Watch the big number top-left.',
    ledger: 'A basket is a trip that finished. Count those.',
  },
  {
    kicker: 'The floor',
    title: 'Shelf vs backroom',
    body: 'Crates live in the backroom (storage). Unpack moves stock onto the shelf where shoppers can reach it. Empty shelf means no sales. Full backroom means trucks refuse delivery until you clear space. Those two piles are the whole early game.',
    ledger: 'Backroom holds the crates. Shelf holds the offer.',
  },
  {
    kicker: 'The loop',
    title: 'Three verbs',
    body: 'Unpack. Set a price. Buy wholesale when the truck looks cheap. That heartbeat — wholesale → stock → baskets → cash — runs the whole empire. Everything else is a department layered on top of those three verbs.',
    ledger: 'Three verbs. Everything else is a department.',
  },
  {
    kicker: 'You cannot lose',
    title: 'Bad weeks only slow you',
    body: 'There is no game over, no bankruptcy wipe, no unwinnable death spiral. Empty shelves, rent arrears, and mistakes cost time. Helpers and bailouts always exist. Play badly for an hour and you are behind — not stuck.',
    ledger: 'Operations does not delete the save. It only intervenes.',
  },
  {
    kicker: 'Begin',
    title: 'Open the counter',
    body: 'A short coach will spotlight each control once — Unpack, baskets, price, wholesale, rent. Skip anytime. Replay from Coach later. Your first goal: unpack cans, sell a basket, and buy a crate before rent makes you nervous. Story lines keep writing at the bottom of the screen.',
    ledger: 'Coach on standby. Unpack when you are ready.',
  },
]

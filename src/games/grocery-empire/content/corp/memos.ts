import { CREDIT } from '../../sim/balance'
import { log } from '../../sim/helpers'
import type { GameState } from '../../sim/state'
import type { MemoDef } from '../memos'

/**
 * Company memos: one page per company or town system, filed once you have used it.
 * Priced in seconds of your best sales rate, so they cost the same share of a run in
 * any era. Reads live next to the system (`s.memos[id]`) or the memo acts on file.
 */

const c = (s: GameState) => s.corp
const sec = (n: number) => (s: GameState) => ({ cash: Math.ceil(Math.max(c(s)?.econ ?? 0, 0.5) * n), attention: 0, ideas: 0 })

export const COMPANY_MEMOS: MemoDef[] = [
  {
    id: 'giving-charter',
    name: 'Giving Charter',
    voice: 'Write down why the store gives. The town reads it twice.',
    effect: 'Goodwill pulls 15% more shoppers, and the most it can pull rises.',
    era: 1,
    cost: sec(240),
    visible: (s) => (c(s)?.town.donated ?? 0) > 0,
    done: 'Charter framed in the window. People stop to read it.',
  },
  {
    id: 'shareholder-letter',
    name: 'Letter to Owners',
    voice: 'Two pages, plain words, signed by hand.',
    effect: 'Your share price jumps 6%, and owners take 10% less of each sale.',
    era: 2,
    cost: sec(300),
    visible: (s) => Object.keys(c(s)?.co.owners ?? {}).length > 0 || !!c(s)?.co.listed,
    run: (s) => {
      const co = c(s)?.co
      if (co) co.walk = Math.min(3, co.walk * 1.06)
    },
    done: 'The letter went out. The phone rang with good news.',
  },
  {
    id: 'trading-rules',
    name: 'Trading Rules',
    voice: 'No bets after midnight. No bets angry.',
    effect: 'Winning futures pay 10% more.',
    era: 2,
    cost: sec(300),
    visible: (s) => (c(s)?.futuresWon ?? 0) > 0 || (c(s)?.futures.length ?? 0) > 0,
    done: 'Rules taped to the trading screen.',
  },
  {
    id: 'retainer-letter',
    name: 'Retainer Letter',
    voice: 'One firm on call. They answer on the first ring.',
    effect: 'Lawyers cost 20% less.',
    era: 2,
    cost: sec(300),
    visible: (s) => (c(s)?.settled ?? 0) + (c(s)?.suitsWon ?? 0) > 0 || (c(s)?.suits ?? []).some((x) => x.lawyer > 0),
    done: 'A firm on retainer. Their card is on the desk.',
  },
  {
    id: 'campaign-office',
    name: 'Campaign Office',
    voice: 'A back room with phones and a map of the wards.',
    effect: 'Banks one favour from City Hall now.',
    era: 2,
    cost: sec(360),
    visible: (s) => (c(s)?.town.wins ?? 0) > 0,
    run: (s) => {
      const t = c(s)?.town
      if (t) t.favors += 1
    },
    done: 'The office is open. City Hall owes you one.',
  },
  {
    id: 'open-books',
    name: 'Open Books',
    voice: 'Print the store’s numbers in your own paper. Even the bad ones.',
    effect: 'Your papers win back trust twice as fast after a story.',
    era: 2,
    cost: sec(300),
    visible: (s) => (c(s)?.town.outlets.length ?? 0) > 0,
    done: 'Numbers in print. Readers trust the paper more.',
  },
  {
    id: 'patent-pool',
    name: 'Patent Pool',
    voice: 'One clerk files all of it, in one queue.',
    effect: 'Patents cost 30% less.',
    era: 2,
    cost: sec(360),
    visible: (s) => Object.keys(c(s)?.more.lab.invented ?? {}).length > 0,
    done: 'Patents run through one desk now.',
  },
  {
    id: 'credit-policy',
    name: 'Credit Policy',
    voice: 'Pay the bank on the first of the month, every month.',
    effect: 'Your credit score rises by 40.',
    era: 3,
    cost: sec(360),
    visible: (s) => (c(s)?.bonds.length ?? 0) > 0 || (c(s)?.bondsRepaid ?? 0) > 0,
    run: (s) => {
      const k = c(s)
      if (k) k.credit = Math.min(CREDIT.max, k.credit + 40)
    },
    done: 'The bank moved you up a grade.',
  },
  {
    id: 'standard-lease',
    name: 'Standard Lease',
    voice: 'One lease for every tenant. No side deals.',
    effect: 'Rent from your buildings rises 10%.',
    era: 3,
    cost: sec(420),
    visible: (s) => Object.keys(c(s)?.more.lots ?? {}).length > 0,
    done: 'Every tenant signed the same lease.',
  },
  {
    id: 'crisis-playbook',
    name: 'Crisis Playbook',
    voice: 'Who calls whom, in what order, before breakfast.',
    effect: 'Answering a crisis costs 25% less.',
    era: 3,
    cost: sec(420),
    visible: (s) => (c(s)?.more.crisesHandled ?? 0) > 0,
    done: 'The playbook is in every manager’s drawer.',
  },
  {
    id: 'franchise-manual',
    name: 'Licensee Manual',
    voice: 'Three hundred pages on how to stack a shelf your way.',
    effect: 'Every licensee gains 10 quality now.',
    era: 4,
    cost: sec(600),
    visible: (s) => (c(s)?.more.franchises.length ?? 0) > 0,
    run: (s) => {
      for (const f of c(s)?.more.franchises ?? []) f.quality = Math.min(100, f.quality + 10)
      log(s, 'Licensee manual shipped. Their shelves look like yours now.', 'good')
    },
    done: 'Manual shipped to every licensee.',
  },
]

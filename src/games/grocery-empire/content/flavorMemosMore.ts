/**
 * Content firehose — more decorative memos across Eras 0–6. Pure flavor: each grants at most
 * +1 Empire XP or a sliver of Brand, never touches the economy, and never gates progress.
 * Merged into MEMOS via memos.ts (after FLAVOR_MEMOS).
 */

import type { MemoCost, MemoDef } from './memos'
import type { GameState } from '../sim/state'

const c = (cash = 0, attention = 0, ideas = 0) => (): MemoCost => ({ cash, attention, ideas })
const xp1 = (s: GameState) => {
  s.empire.xp = (s.empire.xp ?? 0) + 1
}
const brand = (amt: number) => (s: GameState) => {
  s.brand = Math.min(1, s.brand + amt)
}

export const FLAVOR_MEMOS_MORE: MemoDef[] = [
  // ── Era 0 · the counter ─────────────────────────────────────────────────
  {
    id: 'lost-and-found',
    name: 'Lost & Found Box',
    voice: 'A shoebox of gloves, keys, and one very loyal umbrella.',
    effect: '+1 Empire XP.',
    era: 0,
    cost: c(5),
    visible: (s) => s.baskets >= 40,
    run: xp1,
    done: 'Lost & found box placed under the counter. People come back for things.',
  },
  {
    id: 'first-dollar-frame',
    name: 'First-Dollar Frame',
    voice: 'The first bill, taped inside a frame. It is slightly crooked on purpose.',
    effect: '+1 Empire XP.',
    era: 0,
    cost: c(8),
    visible: (s) => s.lifetimeRevenue >= 50,
    run: xp1,
    done: 'First dollar framed. It watches the register like a saint.',
  },
  {
    id: 'neighbor-wave',
    name: 'Neighbor Wave',
    voice: 'Nod at everyone who passes. It costs nothing and gets noticed anyway.',
    effect: '+1 Empire XP.',
    era: 0,
    cost: c(0),
    visible: (s) => s.baskets >= 20,
    run: xp1,
    done: 'You started waving. The block waves back, mostly.',
  },
  {
    id: 'shelf-radio',
    name: 'Shelf Radio',
    voice: 'A small radio between the sponges and the soup. Hold music for the aisle.',
    effect: '+1 Empire XP.',
    era: 0,
    cost: c(10),
    visible: (s) => s.stats.sold >= 150,
    run: xp1,
    done: 'Radio tuned to oldies. Customers hum along and buy a little slower.',
  },

  // ── Era 1 · corner store ────────────────────────────────────────────────
  {
    id: 'umbrella-bucket',
    name: 'Umbrella Bucket',
    voice: 'A tin pail by the door. Rain days turn it into a tiny landmark.',
    effect: '+1 Empire XP.',
    era: 1,
    cost: c(15),
    visible: (s) => s.era >= 1 && s.stats.weatherDays >= 1,
    run: xp1,
    done: 'Umbrella bucket set out. The first loaned umbrella comes back dry.',
  },
  {
    id: 'driver-wave',
    name: 'Driver’s Wave',
    voice: 'The wholesale driver knows your name and your good side of the dock.',
    effect: '+1 Empire XP.',
    era: 1,
    cost: c(20),
    visible: (s) => s.era >= 1 && s.stats.ordersPlaced >= 10,
    run: xp1,
    done: 'Driver gets a coffee every Thursday. Crates arrive upright.',
  },
  {
    id: 'thermos-night',
    name: 'Night Thermos',
    voice: 'Hot coffee in a steel flask by the latch. The second shift is a person now.',
    effect: '+1 Empire XP.',
    era: 1,
    cost: c(25),
    visible: (s) => s.era >= 1 && s.staff.length >= 2,
    run: xp1,
    done: 'Thermos refilled before close. Somebody stays awake because of it.',
  },
  {
    id: 'receipt-spike',
    name: 'Receipt Spike',
    voice: 'An iron spike for paper slips. The old way of doing a ledger.',
    effect: '+1 Empire XP.',
    era: 1,
    cost: c(12),
    visible: (s) => s.era >= 1 && s.baskets >= 500,
    run: xp1,
    done: 'Spike by the register. It fills quickly and satisfyingly.',
  },

  // ── Era 2 · chain ───────────────────────────────────────────────────────
  {
    id: 'store-name-sign',
    name: 'Matching Signage',
    voice: 'One font, one palette, three doors. The block starts calling it “the chain.”',
    effect: 'Brand +1%.',
    era: 2,
    cost: c(150),
    visible: (s) => s.era >= 2 && s.stores.length >= 2,
    run: brand(0.01),
    done: 'Signs match. Strangers recognize the second door from the first.',
  },
  {
    id: 'district-lanyard',
    name: 'District Lanyard',
    voice: 'A lanyard that says REGIONAL. Nobody checks what the region is.',
    effect: '+1 Empire XP.',
    era: 2,
    cost: c(200, 300),
    visible: (s) => s.era >= 2 && s.stores.length >= 3,
    run: xp1,
    done: 'Lanyard worn. Doors open a little faster.',
  },
  {
    id: 'rival-scrapbook',
    name: 'Rival Scrapbook',
    voice: 'Every undercut, flyer, and rumor, clipped and dated. Patterns are a defense.',
    effect: '+1 Empire XP.',
    era: 2,
    cost: c(100, 200),
    visible: (s) => s.era >= 2 && (s.stats.rivalAnswers ?? 0) >= 1,
    run: xp1,
    done: 'Scrapbook started. Rival moves look smaller on paper.',
  },
  {
    id: 'coupon-shredder',
    name: 'Coupon Shredder',
    voice: 'Rival circulars, in confetti. Morale improves immediately.',
    effect: 'Brand +0.5%.',
    era: 2,
    cost: c(80),
    visible: (s) => s.era >= 2 && (s.stats.couponMatches ?? 0) >= 1,
    run: brand(0.005),
    done: 'Shredder humming. The rival never learns how many times they lost.',
  },

  // ── Era 3 · cold chain & state ──────────────────────────────────────────
  {
    id: 'cold-chain-poster',
    name: 'Cold-Chain Poster',
    voice: 'A diagram of a leaf that never gets old. Staff stare at it on breaks.',
    effect: '+1 Empire XP.',
    era: 3,
    cost: c(700, 300),
    visible: (s) => s.era >= 3 && (s.cold?.plants ?? 0) >= 1,
    run: xp1,
    done: 'Poster hung by the compressors. Freshness has a face.',
  },
  {
    id: 'committee-basket',
    name: 'Committee Gift Basket',
    voice: 'Local jam, local cheese, a card that says “thinking of you.”',
    effect: 'Brand +1%.',
    era: 3,
    cost: c(900),
    visible: (s) => s.era >= 3 && (s.politics?.acquisitions ?? 0) >= 1,
    run: brand(0.01),
    done: 'Baskets delivered. The committee’s memory improves by exactly one cheese.',
  },

  // ── Era 4 · globe ───────────────────────────────────────────────────────
  {
    id: 'harbor-postcards',
    name: 'Harbor Postcards',
    voice: 'One from every lane, stuck above the Control Tower’s coffee machine.',
    effect: '+1 Empire XP.',
    era: 4,
    cost: c(2200, 500),
    visible: (s) => s.era >= 4 && (s.fleet?.lanes ?? 0) >= 1,
    run: xp1,
    done: 'Postcards pinned. The ocean has handwriting.',
  },
  {
    id: 'customs-pad',
    name: 'Customs Stamp Pad',
    voice: 'Blue ink, steady hand. The stamp that makes every crate feel official.',
    effect: '+1 Empire XP.',
    era: 4,
    cost: c(3000),
    visible: (s) => s.era >= 4 && (s.fleet?.lanes ?? 0) >= 2,
    run: xp1,
    done: 'Customs stamp pad inked. Paperwork starts to sing.',
  },

  // ── Era 5 · barges ──────────────────────────────────────────────────────
  {
    id: 'hull-registry',
    name: 'Hull Name Registry',
    voice: 'Every barge gets a name. Nobody ever names the last one lightly.',
    effect: '+1 Empire XP.',
    era: 5,
    cost: c(9000, 2000),
    visible: (s) => s.era >= 5 && (s.fleet?.barges ?? 0) >= 1,
    run: xp1,
    done: 'Registry opened. Names outlast hulls.',
  },
  {
    id: 'seed-vault-key',
    name: 'Seed Vault Key',
    voice: 'A small brass key to a cold room that holds the first can.',
    effect: '+1 Empire XP.',
    era: 5,
    cost: c(15_000, 3000),
    visible: (s) => s.era >= 5 && s.fleet.launched,
    run: xp1,
    done: 'Key issued. The first can is still on the shelf, somewhere.',
  },

  // ── Era 6 · ending ──────────────────────────────────────────────────────
  {
    id: 'last-receipt-frame',
    name: 'Last Receipt Frame',
    voice: 'The final slip of paper, matted and signed. Nothing printed on it yet.',
    effect: '+1 Empire XP.',
    era: 6,
    cost: c(6000),
    visible: (s) => s.era >= 6,
    run: xp1,
    done: 'Last receipt framed. The wall has a quiet spot.',
  },
  {
    id: 'chalkboard-copy',
    name: 'Chalkboard Copy',
    voice: '“CANS. CHEAP. INSIDE.” Copied by hand for whoever comes next.',
    effect: '+1 Empire XP.',
    era: 6,
    cost: c(1000),
    visible: (s) => s.era >= 6 && s.endingChoice === 'accept',
    run: xp1,
    done: 'Chalkboard copy packed. The next universe starts with a sentence.',
  },
]

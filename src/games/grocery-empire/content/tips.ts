import type { GameState } from '../sim/state'

/** First-unlock tip whispers — one visible at a time, dismissible forever per save. */
export interface TipDef {
  id: string
  text: string
  /** Fire once when true and not yet in tipsSeen. */
  when: (s: GameState) => boolean
}

export const TIPS: TipDef[] = [
  {
    id: 'first-unpack',
    text: 'Unpack is free: backroom → shelf. Shoppers only buy the shelf. Wholesale is the bill that fills the backroom again.',
    when: (s) => s.stats.unpackedManual >= 1,
  },
  {
    id: 'first-basket',
    text: 'That top-left number is baskets — the score that unlocks story. Cash beside it pays rent and trucks. Baskets never spend.',
    when: (s) => s.baskets >= 1,
  },
  {
    id: 'first-price',
    text: 'Shelf price is what shoppers pay. Stock climbing → nudge down. Selling out → raise or unpack harder. Ads come much later.',
    when: (s) => s.stats.priceChanges >= 1,
  },
  {
    id: 'first-wholesale',
    text: 'Trucks land in the backroom after a short delay. Buy the walking dips (under ~$0.85 is a win). Then Unpack again.',
    when: (s) => s.stats.ordersPlaced >= 1,
  },
  {
    id: 'first-memo',
    text: 'Memos are the story spine — each one is a door with a voice. Affordable ones breathe; buy when the next chapter matters.',
    when: (s) => s.stats.memosDone >= 1,
  },
  {
    id: 'first-staff',
    text: 'A clerk unpacks while you watch price and wholesale. Wages should stay well under revenue — over-hire only slows you.',
    when: (s) => s.staff.length >= 1,
  },
  {
    id: 'produce',
    text: 'Produce spoils on a clock. Oldest crate first. A stocker and a cooler turn panic into rotation.',
    when: (s) => !!s.categories.produce,
  },
  {
    id: 'attention',
    text: 'The back office fills with Attention. Spend Reputation on Archives before Analysts until the next memo fits.',
    when: (s) => s.compute.unlocked,
  },
  {
    id: 'cold',
    text: 'Cold plants buy time for perishables. Brownouts pause Momentum but floor at 25% — delay, never doom.',
    when: (s) => !!s.menus.cold || (s.cold?.plants ?? 0) > 0,
  },
  {
    id: 'fleet',
    text: 'Charter points shape barges. Guardians appear under pressure. Orbit is just a taller backroom.',
    when: (s) => !!s.menus.fleet || (s.fleet?.barges ?? 0) > 0,
  },
  {
    id: 'recovery',
    text: 'Bailouts, mentor crates, and emergency trucks only slow you. There is no game-over screen in Grocery Empire.',
    when: (s) => s.stats.helperCrates + s.stats.bailouts + s.stats.emergencyDeliveries >= 1,
  },
  {
    id: 'ventures',
    text: 'Ventures drip beside the main heartbeat. Collect when full — side doors cannot bankrupt the aisle.',
    when: (s) => !!s.menus.ventures,
  },
  {
    id: 'upgrades',
    text: 'Upgrade trees are the always-something-to-buy layer. Mild permanent edges; era memos own the big multipliers.',
    when: (s) => !!s.menus.upgrades,
  },
  {
    id: 'scanner',
    text: 'Scanner Array dumps Attention with wobble. Click for joy — never required for progress.',
    when: (s) => !!s.compute.scanner,
  },
]

export const TIP_BY_ID: Record<string, TipDef> = Object.fromEntries(TIPS.map((t) => [t.id, t]))

/** Next unseen tip ready to whisper, or null. */
export function pendingTip(s: GameState): TipDef | null {
  for (const tip of TIPS) {
    if (s.tipsSeen[tip.id]) continue
    try {
      if (tip.when(s)) return tip
    } catch {
      /* ignore bad predicates */
    }
  }
  return null
}

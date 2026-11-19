/** Lawsuits, judges and insurance policies. */
export interface SuitKind {
  id: string
  title: string
  /** Who files it: a rival boss, a customer, a regulator. */
  by: 'rival' | 'customer' | 'regulator' | 'you'
  /** Claim size in seconds of your sales. */
  claimSec: number
  /** Your odds at trial before lawyers and judges. */
  odds: number
  blurb: string
}

export const SUIT_KINDS: SuitKind[] = [
  { id: 'cart-patent', title: 'The shopping-cart patent', by: 'rival', claimSec: 150, odds: 0.55, blurb: 'They claim to own the idea of a cart with four wheels.' },
  { id: 'false-ads', title: 'False advertising', by: 'rival', claimSec: 120, odds: 0.5, blurb: 'Your “freshest in town” sign is under oath now.' },
  { id: 'poached', title: 'Stolen trade secrets', by: 'rival', claimSec: 200, odds: 0.4, blurb: 'They say your crew walked out with their recipes.' },
  { id: 'trademark', title: 'Trademark squabble', by: 'rival', claimSec: 100, odds: 0.6, blurb: 'Your logo looks a little like theirs. If you squint.' },
  { id: 'slip', title: 'Slip-and-fall in aisle 3', by: 'customer', claimSec: 80, odds: 0.55, blurb: 'A banana peel, a dramatic fall and a very good lawyer.' },
  { id: 'hot-coffee', title: 'The coffee was too hot', by: 'customer', claimSec: 60, odds: 0.6, blurb: 'Coffee. Hot. A shocking discovery.' },
  { id: 'spying', title: 'Corporate espionage', by: 'rival', claimSec: 260, odds: 0.3, blurb: 'Your mole was caught. Their lawyers are delighted.' },
  { id: 'price-fixing', title: 'Price fixing', by: 'regulator', claimSec: 240, odds: 0.35, blurb: 'The regulator heard about a certain lunch.' },
]

export const SUIT_BY_ID: Record<string, SuitKind> = Object.fromEntries(SUIT_KINDS.map((k) => [k.id, k]))

/** Suits you can file against a rival who has wronged you. */
export const YOUR_SUITS: SuitKind[] = [
  { id: 'smear-libel', title: 'Libel over the smear ads', by: 'you', claimSec: 120, odds: 0.55, blurb: 'Their ads said things. Untrue things. Expensive things.' },
  { id: 'unfair-poach', title: 'Unfair poaching', by: 'you', claimSec: 90, odds: 0.5, blurb: 'They lured your crew with snacks and lies.' },
]

export interface JudgeDef {
  id: string
  name: string
  /** Odds shift for you. */
  lean: number
  quirk: string
}

export const JUDGES: JudgeDef[] = [
  { id: 'haddock', name: 'Judge Haddock', lean: -0.08, quirk: 'Distrusts anyone with more than ten stores.' },
  { id: 'okoro', name: 'Judge Okoro', lean: 0.05, quirk: 'Rewards good lawyers more than good stories.' },
  { id: 'pemberton', name: 'Judge Pemberton', lean: 0, quirk: 'Falls asleep. Flips a coin when he wakes up.' },
  { id: 'reyes', name: 'Judge Reyes', lean: 0.08, quirk: 'Shops at a corner store. Likes the little guy.' },
  { id: 'vantablack', name: 'Judge Vantablack', lean: -0.12, quirk: 'Has never ruled for a grocer. Ever.' },
]

export const JUDGE_BY_ID: Record<string, JudgeDef> = Object.fromEntries(JUDGES.map((j) => [j.id, j]))

export const LAWYERS = [
  { name: 'Your cousin with a law degree', odds: 0, costSec: 0 },
  { name: 'A storefront law office', odds: 0.1, costSec: 30 },
  { name: 'Hargrove & Lyle', odds: 0.18, costSec: 90 },
  { name: 'The Shark (she bills by the minute)', odds: 0.26, costSec: 220 },
] as const

export interface PolicyDef {
  id: string
  name: string
  covers: string
  /** Premium per minute, in seconds of sales. */
  premiumSec: number
  /** Share of a loss it pays back. */
  share: number
  era: number
}

export const POLICIES: PolicyDef[] = [
  { id: 'spoil', name: 'Spoilage cover', covers: 'Pays back half the cost of food that spoils.', premiumSec: 1.2, share: 0.5, era: 1 },
  { id: 'weather', name: 'Weather cover', covers: 'Pays a little during rain, heat and cold snaps.', premiumSec: 1.5, share: 0.04, era: 1 },
  { id: 'fines', name: 'Legal-fees cover', covers: 'Pays back half of any fine from the back alley.', premiumSec: 2.5, share: 0.5, era: 2 },
  { id: 'liability', name: 'Liability cover', covers: 'Pays 60% of a lawsuit you lose.', premiumSec: 3, share: 0.6, era: 2 },
]

export const POLICY_BY_ID: Record<string, PolicyDef> = Object.fromEntries(POLICIES.map((p) => [p.id, p]))

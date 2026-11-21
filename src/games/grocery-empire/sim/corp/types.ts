/**
 * The company layer (SAVE 44+): markets, your listing, owners, rivals' bosses, the courts,
 * the community and the lab. It runs on its own random stream (`rng`) so the base game's
 * rolls — and its pacing — are untouched. Resets on Rebrand like the rest of a run.
 */
export interface TickerState {
  listed: boolean
  /** Company value scale at listing (cash). */
  anchor: number
  /** Fundamental growth since listing (starts at 1). */
  fund: number
  /** Random walk around 1. */
  walk: number
  price: number
  /** One sample every 10 s, newest last (max 90). */
  hist: number[]
  /** Shares you hold (out of 1000). */
  owned: number
  /** Total paid for the shares you hold. */
  basis: number
  /** Last news line and when. */
  news?: { text: string; up: boolean; t: number }
}

export interface FutureState {
  id: number
  kind: 'hedge' | 'rise' | 'fall'
  /** Wholesale index when the contract was struck. */
  strike: number
  /** Cash staked (bets) or premium paid (hedge). */
  stake: number
  expiresAt: number
}

export interface CorpBoost {
  kind: 'demand' | 'wages' | 'ventures'
  mul: number
  until: number
  label: string
}

export interface CompanyState {
  listed: boolean
  /** Shares you hold (of 1000). */
  you: number
  /** Owner id → shares. */
  owners: Record<string, number>
  /** Shares held by the public (after the IPO). */
  float: number
  walk: number
  price: number
  hist: number[]
  quarter: { n: number; endsAt: number; base: number; sum: number; samples: number; target: number }
  streak: number
  beats: number
  misses: number
  meeting: { at: number; base: number; target: number; got: number } | null
  /** Extra target growth promised at the last meeting. */
  promise: number
  vote: { id: string; until: number; lobbied: string[] } | null
  lastVote: string
  nextVoteAt: number
  votesWon: number
  votesLost: number
  offer: { owner: string; shares: number; price: number; until: number } | null
  nextOfferAt: number
  raised: number
  lastScandal: number
  /** Dividends paid out to everyone who owns a slice that isn't you. */
  paidOut: number
}

export interface CeoState {
  grudge: number
  nextMoveAt: number
  truceUntil: number
  mole: { cover: number; nextIntelAt: number } | null
  war: { round: number; you: number; them: number; next: 'undercut' | 'match' | 'hold'; log: { you: string; them: string; win: boolean | null }[] } | null
  warReadyAt: number
  /** Shares of YOUR company this rival has bought. */
  stakeInYou: number
  /** Your stake in them last seen (to notice you buying in). */
  seenOwned: number
  lastPillAt: number
  wins: number
  losses: number
  lastLine: string
}

export interface SuitState {
  id: number
  kind: string
  /** Rival id, a customer's name, or 'regulator'. */
  by: string
  /** You are suing them. */
  yours: boolean
  claim: number
  judge: string
  lawyer: number
  answerBy: number
}

export interface BondState {
  id: number
  principal: number
  interest: number
  nextCouponAt: number
  dueAt: number
  coupons: number
}

export interface TownState {
  // Foundation
  goodwill: number
  donated: number
  causes: Record<string, number>
  causeGiven: Record<string, number>
  awards: number
  nextAwardAt: number
  witnesses: number
  // City hall
  election: { office: string; dayAt: number; sway: Record<string, number>; backed: Record<string, number> } | null
  officeHolders: Record<string, { cand: string; until: number }>
  favors: number
  wins: number
  // Union
  union: { formed: boolean; pay: number; benefits: number; hours: number; refusals: number; demand: { id: string; until: number } | null; nextDemandAt: number; strikeUntil: number }
  // Press
  outlets: string[]
  cred: number
  spinReadyAt: number
  // Customers
  segmentsOn: boolean
  focus: string | null
  loyalty: Record<string, number>
}

export interface Stage6State {
  lab: { level: number; project: string | null; progress: number; invented: Record<string, { at: number; patented: boolean; licensed: boolean; copied: boolean }> }
  lots: Record<string, { value: number; tenant: string | null; boughtAt: number; paid: number }>
  rentEarned: number
  franchises: { id: number; name: string; trait: string; quality: number; openedAt: number; paid: number }[]
  royalties: number
  execs: Partial<Record<string, { name: string; trait: string; level: number; hiredAt: number }>>
  pool: { role: string; name: string; trait: string }[]
  nextPoolAt: number
  crisis: { id: string; until: number } | null
  lastCrisis: { id: string; win: boolean; pick: number; t: number } | null
  nextCrisisAt: number
  crisesHandled: number
  /** How many times each crisis id has appeared (marked on spawn). */
  seen: Record<string, number>
}

export interface CorpState {
  rng: number
  /** Seconds not yet ticked (the company layer ticks once a second). */
  acc: number
  /** Company-layer clock: whole seconds ticked this run. */
  clock: number
  /** Economy size: the highest sales rate seen this run (cash per second). */
  econ: number
  nextId: number
  // Market
  tickers: Record<string, TickerState>
  nextNewsAt: number
  tape: { text: string; up: boolean; t: number }[]
  tradeProfit: number
  dividends: number
  futures: FutureState[]
  futuresWon: number
  // Your company
  co: CompanyState
  /** Timed effects from meetings, votes and deals. */
  boosts: CorpBoost[]
  /** Rival bosses, keyed by rival id. */
  ceo: Record<string, CeoState>
  takeovers: number
  // Courthouse
  suits: SuitState[]
  nextCustomerSuitAt: number
  suitsWon: number
  suitsLost: number
  settled: number
  sueReadyAt: number
  // Treasury
  credit: number
  bonds: BondState[]
  /** Debt in default, paid off by garnished sales. */
  arrears: number
  bondsRepaid: number
  missed: number
  // Insurance
  policies: Record<string, { bump: number; since: number }>
  claimsPaid: number
  premiumsPaid: number
  seenSpoiled: number
  town: TownState
  more: Stage6State
  /** Ambition id → company clock when it paid out. */
  ambitions: Record<string, number>
  /** Cash paid by ambitions this run. */
  ambitionCash: number
}

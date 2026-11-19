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
}

import type { GameState } from '../state'
import type { CorpState } from './types'

export function emptyCorp(seed = 1): CorpState {
  return {
    rng: (seed * 2654435761) | 0,
    acc: 0,
    clock: 0,
    econ: 0,
    nextId: 1,
    tickers: {},
    nextNewsAt: 60,
    tape: [],
    tradeProfit: 0,
    dividends: 0,
    futures: [],
    futuresWon: 0,
    co: {
      listed: false,
      you: 1000,
      owners: {},
      float: 0,
      walk: 1,
      price: 0,
      hist: [],
      quarter: { n: 0, endsAt: 0, base: 0, sum: 0, samples: 0, target: 0 },
      streak: 0,
      beats: 0,
      misses: 0,
      meeting: null,
      promise: 0,
      vote: null,
      lastVote: '',
      nextVoteAt: 0,
      votesWon: 0,
      votesLost: 0,
      offer: null,
      nextOfferAt: 0,
      raised: 0,
      lastScandal: 0,
    },
    boosts: [],
    ceo: {},
    takeovers: 0,
    suits: [],
    nextCustomerSuitAt: 1200,
    suitsWon: 0,
    suitsLost: 0,
    settled: 0,
    sueReadyAt: 0,
    credit: 650,
    bonds: [],
    arrears: 0,
    bondsRepaid: 0,
    missed: 0,
    policies: {},
    claimsPaid: 0,
    premiumsPaid: 0,
    seenSpoiled: -1,
  }
}

export function corpOf(s: GameState): CorpState {
  if (!s.corp) s.corp = emptyCorp(s.seed)
  return s.corp
}

/** The company layer's own random stream (mulberry32), so base-game rolls are untouched. */
export function crand(s: GameState): number {
  const c = corpOf(s)
  let t = (c.rng = (c.rng + 0x6d2b79f5) | 0)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function cpick<T>(s: GameState, items: readonly T[]): T {
  return items[Math.floor(crand(s) * items.length) % items.length]!
}

/** Roughly normal (sum of three uniforms), mean 0, sd ~1. */
export function cnorm(s: GameState): number {
  return (crand(s) + crand(s) + crand(s) - 1.5) * 2
}

/** Sales per second right now (never zero, for scaling prices and fines). */
export function salesRate(s: GameState): number {
  return Math.max(0.05, s.rates?.revenuePerSec ?? 0)
}

/** Economy size used to price new companies, fees and deals. Never falls inside a run. */
export function econ(s: GameState): number {
  return Math.max(corpOf(s).econ, salesRate(s), 0.5)
}

export function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** Deep-fill a saved slice onto defaults: keeps saved values of the right type, drops junk. */
export function fillDefaults<T>(def: T, raw: unknown): T {
  if (raw === undefined || raw === null) return def
  if (Array.isArray(def)) return (Array.isArray(raw) ? raw : def) as T
  if (typeof def === 'number') return (typeof raw === 'number' && Number.isFinite(raw) ? raw : def) as T
  if (typeof def === 'string' || typeof def === 'boolean') return (typeof raw === typeof def ? raw : def) as T
  if (typeof def === 'object' && def) {
    if (typeof raw !== 'object' || Array.isArray(raw)) return def
    const out: Record<string, unknown> = { ...(def as Record<string, unknown>) }
    const r = raw as Record<string, unknown>
    for (const k of Object.keys(r)) {
      if (k in out) {
        const d = out[k]
        // Records with no default keys (maps) keep whatever objects were saved.
        if (d && typeof d === 'object' && !Array.isArray(d) && Object.keys(d).length === 0) {
          out[k] = typeof r[k] === 'object' && r[k] && !Array.isArray(r[k]) ? r[k] : d
        } else if (d === null) {
          out[k] = r[k] ?? null
        } else {
          out[k] = fillDefaults(d, r[k])
        }
      }
    }
    return out as T
  }
  return def
}

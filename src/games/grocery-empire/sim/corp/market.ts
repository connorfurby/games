import { cashLabel } from '@/shared/bn'
import { NEWS_DOWN, NEWS_UP, TICKER_BY_ID, TICKERS, type TickerDef } from '../../content/corp/tickers'
import { RIVAL_BY_ID } from '../../content/rivals'
import { CORP } from '../balance'
import { log } from '../helpers'
import type { GameState } from '../state'
import { cnorm, corpOf, cpick, crand, econ, round2, salesRate } from './core'
import type { TickerState } from './types'

const N = () => CORP.sharesPerCompany

export function tickerListed(s: GameState, def: TickerDef): boolean {
  if (def.rivalId) {
    const st = s.rivals?.[def.rivalId]
    return !!st && !st.bought
  }
  return s.era >= def.era
}

function listEra(def: TickerDef, s: GameState): number {
  return def.rivalId ? Math.max(def.era, RIVAL_BY_ID[def.rivalId]?.era ?? def.era) : def.era
}

function rivalMul(s: GameState, def: TickerDef): number {
  if (!def.rivalId) return 1
  const st = s.rivals?.[def.rivalId]
  const start = RIVAL_BY_ID[def.rivalId]?.startStores ?? 1
  const stores = st ? st.stores : start
  return (1 + CORP.rivalStoreWeight * stores) / (1 + CORP.rivalStoreWeight * start)
}

/** Value of the whole company (all 1000 shares). */
export function companyValue(s: GameState, id: string): number {
  const t = corpOf(s).tickers[id]
  return t ? t.price * N() : 0
}

function priceOf(s: GameState, def: TickerDef, t: TickerState): number {
  return (t.anchor * t.fund * t.walk * rivalMul(s, def)) / N()
}

function list(s: GameState, def: TickerDef) {
  const c = corpOf(s)
  const anchor = econ(s) * 60 * def.capMin
  const t: TickerState = { listed: true, anchor, fund: 1, walk: 1, price: 0, hist: [], owned: 0, basis: 0 }
  t.price = priceOf(s, def, t)
  t.hist.push(t.price)
  c.tickers[def.id] = t
  pushTape(s, `${def.name} (${def.sym}) lists on the exchange.`, true)
}

/** A listed company leaves the exchange (a rival bought out for cash): holders are paid out. */
function delist(s: GameState, def: TickerDef, t: TickerState) {
  if (t.owned > 0) {
    const pay = round2(t.owned * t.price)
    s.cash = round2(s.cash + pay)
    corpOf(s).tradeProfit = round2(corpOf(s).tradeProfit + pay - t.basis)
    log(s, `${def.name} left the exchange. Your ${t.owned} shares were bought for ${cashLabel(pay)}.`, 'good')
  }
  t.listed = false
  t.owned = 0
  t.basis = 0
}

export function pushTape(s: GameState, text: string, up: boolean) {
  const c = corpOf(s)
  c.tape.push({ text, up, t: s.time })
  if (c.tape.length > CORP.tapeMax) c.tape.splice(0, c.tape.length - CORP.tapeMax)
}

/** Nudge a ticker's walk (news, scandals, takeovers). */
export function shockTicker(s: GameState, id: string, mul: number, text?: string) {
  const t = corpOf(s).tickers[id]
  if (!t?.listed) return
  t.walk = Math.max(CORP.walkMin, Math.min(CORP.walkMax, t.walk * mul))
  if (text) {
    t.news = { text, up: mul >= 1, t: s.time }
    pushTape(s, text, mul >= 1)
  }
}

export function tickMarket(s: GameState) {
  const c = corpOf(s)
  for (const def of TICKERS) {
    const t = c.tickers[def.id]
    const want = tickerListed(s, def)
    if (want && !t?.listed) {
      if (!t) list(s, def)
      continue
    }
    if (!t?.listed) continue
    if (!want) {
      delist(s, def, t)
      continue
    }
    const young = s.era <= listEra(def, s) + CORP.youngEras
    t.fund *= 1 + (young ? def.growPerMin : def.growPerMin * 0.1) / 60
    const sd = def.vol / Math.sqrt(60)
    t.walk += (CORP.revertPerMin / 60) * (1 - t.walk) + sd * cnorm(s) * t.walk
    t.walk = Math.max(CORP.walkMin, Math.min(CORP.walkMax, t.walk))
    t.price = priceOf(s, def, t)
    if (c.clock % CORP.histEverySec === 0) {
      t.hist.push(t.price)
      if (t.hist.length > CORP.histMax) t.hist.splice(0, t.hist.length - CORP.histMax)
    }
  }
  // Dividends once a minute.
  if (c.clock % 60 === 0) {
    let pay = 0
    for (const def of TICKERS) {
      const t = c.tickers[def.id]
      if (t?.listed && t.owned > 0 && def.divPerMin > 0) pay += t.owned * t.price * def.divPerMin
    }
    if (pay > 0) {
      s.cash = round2(s.cash + pay)
      c.dividends = round2(c.dividends + pay)
    }
  }
  // News.
  if (s.time >= c.nextNewsAt) {
    const listed = TICKERS.filter((d) => c.tickers[d.id]?.listed)
    if (listed.length) {
      const def = cpick(s, listed)
      const up = crand(s) < 0.5
      const size = CORP.newsShockMin + crand(s) * (CORP.newsShockMax - CORP.newsShockMin)
      const line = cpick(s, up ? NEWS_UP : NEWS_DOWN).replace('{n}', def.name)
      shockTicker(s, def.id, up ? 1 + size : 1 - size, line)
    }
    c.nextNewsAt = s.time + CORP.newsGapMin + crand(s) * (CORP.newsGapMax - CORP.newsGapMin)
  }
  tickFutures(s)
}

// ── Trading ───────────────────────────────────────────────────────────────

/** Shares not held by you (or, later, by other owners) — what you can still buy. */
export function sharesFree(s: GameState, id: string): number {
  const t = corpOf(s).tickers[id]
  return t?.listed ? N() - t.owned : 0
}

export function sharesFor(s: GameState, id: string, cash: number): number {
  const t = corpOf(s).tickers[id]
  if (!t?.listed || t.price <= 0) return 0
  return Math.max(0, Math.min(sharesFree(s, id), Math.floor(cash / (t.price * (1 + CORP.tradeFee)))))
}

export function buyShares(s: GameState, id: string, shares: number): number {
  const t = corpOf(s).tickers[id]!
  const n = Math.min(shares, sharesFree(s, id))
  const cost = round2(n * t.price * (1 + CORP.tradeFee))
  s.cash = round2(s.cash - cost)
  t.owned += n
  t.basis = round2(t.basis + cost)
  // Buying moves the price a little (a big order moves it more).
  t.walk = Math.min(CORP.walkMax, t.walk * (1 + 0.04 * (n / N())))
  return cost
}

export function sellShares(s: GameState, id: string, shares: number): number {
  const c = corpOf(s)
  const t = c.tickers[id]!
  const n = Math.min(shares, t.owned)
  const got = round2(n * t.price * (1 - CORP.tradeFee))
  const basisOut = t.owned > 0 ? (t.basis * n) / t.owned : 0
  s.cash = round2(s.cash + got)
  t.owned -= n
  t.basis = round2(Math.max(0, t.basis - basisOut))
  c.tradeProfit = round2(c.tradeProfit + got - basisOut)
  t.walk = Math.max(CORP.walkMin, t.walk * (1 - 0.04 * (n / N())))
  return got
}

export function portfolioValue(s: GameState): number {
  const c = corpOf(s)
  let v = 0
  for (const t of Object.values(c.tickers)) if (t.listed) v += t.owned * t.price
  return v
}

export function portfolioBasis(s: GameState): number {
  let v = 0
  for (const t of Object.values(corpOf(s).tickers)) if (t.listed) v += t.basis
  return v
}

/** Dividends per minute across your holdings. */
export function dividendRate(s: GameState): number {
  let v = 0
  for (const def of TICKERS) {
    const t = corpOf(s).tickers[def.id]
    if (t?.listed && t.owned > 0) v += t.owned * t.price * def.divPerMin
  }
  return v
}

// ── Futures on the wholesale crate price ──────────────────────────────────

export function hedgePremium(s: GameState): number {
  return round2(salesRate(s) * CORP.hedgePremiumSec)
}

export function activeHedge(s: GameState) {
  return corpOf(s).futures.find((f) => f.kind === 'hedge' && f.expiresAt > s.time) ?? null
}

/** Crate prices under a hedge: never above the price you locked. */
export function hedgeCrateMul(s: GameState): number {
  const h = s.corp ? activeHedge(s) : null
  if (!h) return 1
  const idx = s.wholesale?.index ?? 1
  return idx > h.strike ? h.strike / idx : 1
}

export function openFuture(s: GameState, kind: 'hedge' | 'rise' | 'fall', stake: number) {
  const c = corpOf(s)
  const cost = kind === 'hedge' ? hedgePremium(s) : round2(stake)
  s.cash = round2(s.cash - cost)
  c.futures.push({
    id: c.nextId++,
    kind,
    strike: s.wholesale?.index ?? 1,
    stake: cost,
    expiresAt: s.time + (kind === 'hedge' ? CORP.hedgeSec : CORP.betSec),
  })
}

export function betPayout(s: GameState, f: { kind: string; strike: number; stake: number }): number {
  const move = (s.wholesale?.index ?? 1) / f.strike - 1
  const signed = f.kind === 'rise' ? move : -move
  return round2(Math.max(0, Math.min(CORP.betMaxPayout, 1 + CORP.betLeverage * signed)) * f.stake)
}

function tickFutures(s: GameState) {
  const c = corpOf(s)
  if (!c.futures.length) return
  const keep = []
  for (const f of c.futures) {
    if (f.expiresAt > s.time) {
      keep.push(f)
      continue
    }
    if (f.kind === 'hedge') continue
    const pay = betPayout(s, f)
    s.cash = round2(s.cash + pay)
    if (pay > f.stake) c.futuresWon += 1
    log(
      s,
      `Crate-price bet settled: ${f.kind === 'rise' ? 'up' : 'down'} at ${f.strike.toFixed(2)}, now ${(s.wholesale?.index ?? 1).toFixed(2)}. Paid ${cashLabel(pay)}.`,
      pay >= f.stake ? 'good' : 'warn',
    )
  }
  c.futures = keep
}

export { TICKER_BY_ID }

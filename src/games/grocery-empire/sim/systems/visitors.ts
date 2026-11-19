import { cashLabel } from '@/shared/bn'
import { CATEGORY_IDS } from '../../content/categories'
import { VISITOR_BY_ID, VISITORS, type VisitorEffect } from '../../content/visitors'
import { CRIME, VISITOR } from '../balance'
import { backroomCap } from '../formulas'
import { addBatch, log, round2, sumQty } from '../helpers'
import { nextRng } from '../rng'
import type { GameState, VisitorsState } from '../state'
import { crimeOf } from './crime'
import { companyAction } from '../corp/actions'

export function emptyVisitors(): VisitorsState {
  return { current: null, nextAt: VISITOR.firstAfterSec, boosts: [], met: {}, answered: 0 }
}

export function visitorsOf(s: GameState): VisitorsState {
  if (!s.visitors) s.visitors = emptyVisitors()
  return s.visitors
}

type BoostKind = 'demand' | 'ventures' | 'wages'

/** Running visitor boosts for one kind, multiplied. */
export function visitorMul(s: GameState, kind: BoostKind): number {
  const v = s.visitors
  if (!v) return 1
  let m = 1
  for (const b of v.boosts) if (b.kind === kind && b.until > s.time) m *= b.mul
  return m
}

function revenueRate(s: GameState) {
  return Math.max(0.05, s.rates?.revenuePerSec ?? 0)
}

/** What a choice costs up front (its negative cash effects). */
export function choiceCost(s: GameState, effects: VisitorEffect[]): number {
  let c = 0
  for (const e of effects) if (e.kind === 'cash' && e.revenueSec < 0) c += -e.revenueSec * revenueRate(s)
  return round2(c)
}

function pickVisitor(s: GameState): string | null {
  const v = visitorsOf(s)
  const pool = VISITORS.filter((d) => s.era >= d.era && (d.lastEra == null || s.era <= d.lastEra))
  if (!pool.length) return null
  // New faces first; then whoever you have seen least.
  const least = Math.min(...pool.map((d) => v.met[d.id] ?? 0))
  const fresh = pool.filter((d) => (v.met[d.id] ?? 0) === least)
  return fresh[Math.floor(nextRng(s) * fresh.length) % fresh.length]!.id
}

export function tickVisitors(s: GameState) {
  const v = visitorsOf(s)
  if (v.boosts.length) v.boosts = v.boosts.filter((b) => b.until > s.time)
  if (v.current && v.current.until <= s.time) {
    // They wander off quietly (no log line: offline catch-up would fill the ledger).
    v.current = null
    v.nextAt = s.time + VISITOR.gapSec * (0.6 + nextRng(s) * 0.8)
  }
  if (v.current || s.time < v.nextAt) return
  if (!s.introSeen || s.lifetimeRevenue < VISITOR.minRevenue) {
    v.nextAt = s.time + 30
    return
  }
  const id = pickVisitor(s)
  if (!id) {
    v.nextAt = s.time + VISITOR.gapSec
    return
  }
  v.current = { id, until: s.time + VISITOR.waitSec }
  v.met[id] = (v.met[id] ?? 0) + 1
}

function apply(s: GameState, e: VisitorEffect): string | null {
  const v = visitorsOf(s)
  switch (e.kind) {
    case 'demand':
    case 'ventures':
    case 'wages':
      v.boosts.push({ kind: e.kind, mul: e.mul, until: s.time + e.sec })
      return null
    case 'cash': {
      const amt = round2(e.revenueSec * revenueRate(s))
      s.cash = round2(s.cash + amt)
      return null
    }
    case 'brand':
      s.brand = Math.max(0, Math.min(1, s.brand + e.delta))
      return null
    case 'heat': {
      const c = crimeOf(s)
      c.heat = Math.max(0, Math.min(CRIME.heatMax, c.heat + e.delta))
      return null
    }
    case 'stock': {
      const cats = CATEGORY_IDS.filter((k) => s.categories[k])
      const room = Math.max(0, backroomCap(s) - sumQty(s.backroom))
      const total = Math.floor(room * e.capShare)
      if (total > 0 && cats.length) {
        const each = Math.max(1, Math.floor(total / cats.length))
        for (const k of cats) addBatch(s.backroom, k, each, 0)
      }
      return null
    }
    case 'gamble': {
      const win = nextRng(s) < e.odds
      const amt = round2((win ? e.winSec : -e.loseSec) * revenueRate(s))
      s.cash = round2(Math.max(0, s.cash + amt))
      return win ? `You won ${cashLabel(Math.abs(amt))}!` : `You lost ${cashLabel(Math.abs(amt))}.`
    }
    case 'company':
      return companyAction(s, e.action)
    case 'bribe': {
      const c = crimeOf(s)
      if (nextRng(s) < e.odds) {
        c.heat = Math.max(0, c.heat - e.cut)
        return 'The basket was gratefully received. Heat fell.'
      }
      c.heat = Math.min(CRIME.heatMax, c.heat + e.backfire)
      return 'She logged the basket as evidence. Heat rose.'
    }
  }
}

export function answerVisitor(s: GameState, pick: 'a' | 'b') {
  const v = visitorsOf(s)
  const def = v.current ? VISITOR_BY_ID[v.current.id] : undefined
  if (!def) return
  const choice = def[pick]
  const extra: string[] = []
  for (const e of choice.effects) {
    const line = apply(s, e)
    if (line) extra.push(line)
  }
  v.current = null
  v.answered += 1
  v.nextAt = s.time + VISITOR.gapSec * (0.6 + nextRng(s) * 0.8)
  log(s, `${def.who}: ${[choice.result, ...extra].filter(Boolean).join(' ')}`, 'story')
}

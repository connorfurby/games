/**
 * Next-best progression suggestions for the tip strip + rail mark.
 * Intentional buys only — no restock / unpack / price chores.
 */

import { BUILD_TRACKS, buildLevel } from '../content/builds'
import { MEMOS } from '../content/memos'
import type { MenuId } from '../content/menus'
import { DOCTRINES } from '../content/era2'
import { UPGRADES } from '../content/upgrades'
import { CAPITAL } from './balance'
import { can, type Command } from './commands'
import {
  attentionCap,
  backroomCap,
  hireCost,
  investBookCap,
  investOutgrown,
  nextUpgradeCost,
  perk,
  salesBottleneck,
  up,
} from './formulas'
import { sumQty } from './helpers'
import type { GameState } from './state'
import { doctrineCost, tournamentReadPayout } from './systems/capital'
import { openStoreCost } from './systems/chain'

export type SuggestKind = 'memo' | 'upgrade' | 'build' | 'office' | 'growth'

/** Where the suggestion lives — department rail or the always-on memos column. */
export type SuggestChannel = MenuId | 'memos'

export interface Suggestion {
  id: string
  channel: SuggestChannel
  kind: SuggestKind
  /** Short label for the tip. */
  title: string
  /** One-line why. */
  blurb: string
  /** Higher = better. */
  score: number
  /** data-suggest-id / coach target for scroll-to. */
  target?: string
  /** Optional one-tap from the tip strip. */
  action?: Command
  /** Primary button label when action exists. */
  cta?: string
}

export const SPINE_MEMOS = [
  'box-cutter',
  'hand-truck',
  'help-wanted',
  'chalkboard',
  'upgrades-binder',
  'produce-crates',
  'reach-in',
  'back-office',
  'ledger-tape',
  'lot-survey',
  'coffee-permit',
  'passbook',
  'dairy-case',
  'cold-plant-permit',
  'articles-of-inc',
]

function push(out: Suggestion[], s: Suggestion) {
  if (s.score <= 0) return
  out.push(s)
}

function memoAffordable(s: GameState, id: string) {
  return can(s, { type: 'buyMemo', id }).ok
}

function collectOffice(s: GameState, out: Suggestion[]) {
  if (!s.compute.unlocked) return
  const cap = attentionCap(s)
  let needsArchive = false
  let needsAnalyst = s.compute.analysts < 2 && s.compute.attention < cap * 0.35
  for (const m of MEMOS) {
    if ((s.memos[m.id] ?? 0) > 0 && !m.repeatable) continue
    try {
      if (!m.visible(s) && !s.memoSeen?.[m.id]) continue
      const c = m.cost(s)
      const att = c.attention ?? 0
      if (att > cap + 1e-9) needsArchive = true
      if (att > s.compute.attention + 1 && att <= cap) needsAnalyst = true
    } catch {
      /* skip */
    }
  }
  // Archive First perk: a nearly full bar means the ceiling — not another Analyst — is the limit.
  const archiveFirst = perk(s, 'archive-first-suggest') > 0
  if (archiveFirst && cap > 0 && s.compute.attention >= cap * 0.9) {
    needsArchive = true
    needsAnalyst = false
  }
  if (needsArchive && can(s, { type: 'buyArchive' }).ok) {
    push(out, {
      id: 'buy-archive',
      channel: 'memos',
      kind: 'office',
      title: 'Open Archive',
      blurb: archiveFirst
        ? 'Attention is nearly full — raise the ceiling first.'
        : 'Raise the Attention ceiling for the next memo.',
      score: archiveFirst ? 940 : 860,
      target: 'buy-archive',
      action: { type: 'buyArchive' },
      cta: 'Open',
    })
  } else if (needsAnalyst && can(s, { type: 'buyAnalyst' }).ok) {
    push(out, {
      id: 'buy-analyst',
      channel: 'memos',
      kind: 'office',
      title: 'Hire Analyst',
      blurb: 'Fill Attention faster toward the next memo.',
      score: 700,
      target: 'hire-analyst',
      action: { type: 'buyAnalyst' },
      cta: 'Hire',
    })
  }
}

function collectMemos(s: GameState, out: Suggestion[]) {
  for (const m of MEMOS) {
    if ((s.memos[m.id] ?? 0) > 0 && !m.repeatable) continue
    if (!memoAffordable(s, m.id)) continue
    let cash = 0
    let att = 0
    try {
      const c = m.cost(s)
      cash = c.cash ?? 0
      att = c.attention ?? 0
    } catch {
      continue
    }
    const spine = SPINE_MEMOS.indexOf(m.id)
    const spineBoost = spine >= 0 ? 220 - spine * 8 : 0
    const score = 780 + spineBoost - cash * 0.02 - att * 0.01
    push(out, {
      id: `memo-${m.id}`,
      channel: 'memos',
      kind: 'memo',
      title: m.name,
      blurb: m.effect,
      score,
      target: `memo-${m.id}`,
      action: { type: 'buyMemo', id: m.id },
      cta: 'Buy',
    })
  }
}

function collectUpgrades(s: GameState, out: Suggestion[]) {
  if (!s.menus.upgrades) return
  const early = s.era <= 1 && s.baskets < 5000
  for (const def of UPGRADES) {
    if (def.visible) {
      try {
        if (!def.visible(s)) continue
      } catch {
        continue
      }
    }
    const lvl = up(s, def.id)
    if (lvl >= def.max) continue
    const cost = nextUpgradeCost(s, def.id)
    if (cost > s.cash) continue
    if (!can(s, { type: 'buyUpgrade', id: def.id, count: 1 }).ok) continue
    let score = 400 + Math.min(200, 8000 / Math.max(8, cost))
    if (early && def.tree === 'floor') score += 120
    if (def.id === 'hold-unpack' || def.id === 'quick-hands' || def.id === 'price-iq') score += 90
    if (def.tree === 'supply' && s.stats.ordersPlaced >= 3) score += 40
    push(out, {
      id: `upgrade-${def.id}`,
      channel: 'upgrades',
      kind: 'upgrade',
      title: def.name,
      blurb: def.per,
      score,
      target: `upgrade-${def.id}`,
      action: { type: 'buyUpgrade', id: def.id, count: 1 },
      cta: 'Buy',
    })
  }
}

function collectBuilds(s: GameState, out: Suggestion[]) {
  if (!s.menus.build) return
  for (const track of BUILD_TRACKS) {
    try {
      if (!track.visible(s)) continue
    } catch {
      continue
    }
    const lvl = buildLevel(s, track.id)
    const next = track.tiers[lvl + 1]
    if (!next || s.era < next.era || s.cash < next.cost) continue
    if (!can(s, { type: 'buyBuild', id: track.id }).ok) continue
    let score = 380 + Math.min(160, 12000 / Math.max(20, next.cost))
    if (track.id === 'storage' && sumQty(s.backroom) > backroomCap(s) * 0.85) score += 80
    if (track.id === 'cold' && s.categories.dairy && lvl < 2) score += 140
    if (track.id === 'cold' && lvl === 1) score += 100
    if (track.id === 'storefront' && lvl < 2) score += 50
    push(out, {
      id: `build-${track.id}`,
      channel: 'build',
      kind: 'build',
      title: next.name,
      blurb: next.effect || track.blurb,
      score,
      target: `build-${track.id}`,
      action: { type: 'buyBuild', id: track.id },
      cta: 'Build',
    })
  }
}

function collectStaff(s: GameState, out: Suggestion[]) {
  if (!s.menus.staff) return
  if (s.staff.length === 0 && can(s, { type: 'hire', role: 'clerk' }).ok) {
    const cost = hireCost(s, 'clerk')
    push(out, {
      id: 'hire-clerk',
      channel: 'staff',
      kind: 'growth',
      title: 'Hire first clerk',
      blurb: cost < 1000 ? `Hands on Unpack · $${cost}` : 'Hands on Unpack — see Staff.',
      score: 750,
      target: 'staff-hire-clerk',
      action: { type: 'hire', role: 'clerk' },
      cta: 'Hire',
    })
  }
  // Hire IQ: name the hire that actually clears the current bottleneck.
  if (up(s, 'hire-iq') > 0 && s.staff.length > 0) {
    const kind = salesBottleneck(s).kind
    const role = kind === 'unpack' ? 'clerk' : kind === 'checkout' ? 'cashier' : null
    if (role && can(s, { type: 'hire', role }).ok) {
      const cost = hireCost(s, role)
      push(out, {
        id: `hire-iq-${role}`,
        channel: 'staff',
        kind: 'growth',
        title: role === 'clerk' ? 'Hire a clerk' : 'Hire a cashier',
        blurb:
          role === 'clerk'
            ? `Unpack is behind demand · $${cost}`
            : `Checkout is the line · $${cost}`,
        score: 730,
        action: { type: 'hire', role },
        cta: 'Hire',
      })
    }
  }
}

function collectLand(s: GameState, out: Suggestion[]) {
  if (!s.menus.land) return
  if (can(s, { type: 'expandLot', id: 'side-yard' }).ok) {
    push(out, {
      id: 'side-yard',
      channel: 'land',
      kind: 'growth',
      title: 'Side Yard',
      blurb: 'Extra shelf and backroom on the lot.',
      score: 820,
      target: 'land-side-yard',
      action: { type: 'expandLot', id: 'side-yard' },
      cta: 'Buy',
    })
  } else if (can(s, { type: 'expandLot', id: 'lot' }).ok) {
    push(out, {
      id: 'lot',
      channel: 'land',
      kind: 'growth',
      title: 'The Lot',
      blurb: 'Buy the parcel next door.',
      score: 800,
      target: 'expand-lot',
      action: { type: 'expandLot', id: 'lot' },
      cta: 'Buy',
    })
  }
}

function collectVentures(s: GameState, out: Suggestion[]) {
  if (!s.menus.ventures) return
  let waiting = 0
  for (const v of Object.values(s.ventures ?? {})) {
    if ((v?.stored ?? 0) > 0) waiting += 1
  }
  if (waiting <= 0) return
  push(out, {
    id: 'collect-ventures',
    channel: 'ventures',
    kind: 'growth',
    title: 'Collect venture tills',
    blurb: `${waiting} side till${waiting === 1 ? '' : 's'} ready to claim.`,
    score: 520 + Math.min(80, waiting * 20),
    target: 'ventures-collect',
    cta: 'Collect',
  })
}

/** Era 2+ chain / capital / strategy collectors. */
function collectEra2(s: GameState, out: Suggestion[]) {
  if (s.era < 2) return

  // Board meeting due — ignoring it drains Reputation.
  if (can(s, { type: 'resolveBoard' }).ok) {
    push(out, {
      id: 'resolve-board',
      channel: 'books',
      kind: 'growth',
      title: 'Board meeting due',
      blurb: 'Pick an agenda before the board drains Reputation.',
      score: 900,
      target: 'books-board',
      action: { type: 'resolveBoard' },
      cta: 'Resolve',
    })
  }

  // Walk the most-drifted store.
  if (s.menus.land) {
    let worst: GameState['stores'][number] | null = null
    for (const st of s.stores) {
      if (!worst || (st.drift ?? 0) > (worst.drift ?? 0)) worst = st
    }
    const drift = worst?.drift ?? 0
    if (worst && drift >= 0.5 && can(s, { type: 'walkStore', storeId: worst.id }).ok) {
      push(out, {
        id: `walk-${worst.id}`,
        channel: 'land',
        kind: 'growth',
        title: `Walk ${worst.name}`,
        blurb: `Drift ${Math.round(drift * 100)}% — spend Attention to clear it.`,
        score: drift >= 0.7 ? 840 : 600,
        target: `walk-${worst.id}`,
        action: { type: 'walkStore', storeId: worst.id },
        cta: 'Walk',
      })
    }
  }

  // Open a store.
  if (s.menus.land && can(s, { type: 'openStore' }).ok) {
    push(out, {
      id: 'open-store',
      channel: 'land',
      kind: 'growth',
      title: 'Open a store',
      blurb: `Another door for the chain · $${openStoreCost(s)}.`,
      score: 790,
      target: 'land-open-store',
      action: { type: 'openStore' },
      cta: 'Open',
    })
  }

  // Build the depot.
  if (s.menus.land && can(s, { type: 'buildDepot' }).ok) {
    push(out, {
      id: 'build-depot',
      channel: 'land',
      kind: 'growth',
      title: 'Build the depot',
      blurb: 'Tighten routes before the chain outgrows your Attention.',
      score: s.stores.length >= 5 ? 850 : 770,
      target: 'land-depot',
      action: { type: 'buildDepot' },
      cta: 'Build',
    })
  }

  // Store policy — a mild nudge once the chain has 2+ doors that all still run Standard.
  if (
    s.menus.land &&
    s.stores.length >= 2 &&
    s.stores.every((st) => st.policy === 'standard') &&
    salesBottleneck(s).kind === 'demand'
  ) {
    const st = s.stores[0]!
    if (can(s, { type: 'setPolicy', storeId: st.id, policy: 'local' }).ok) {
      push(out, {
        id: 'store-policy',
        channel: 'land',
        kind: 'growth',
        title: `Set ${st.name} to Local`,
        blurb: 'Demand is the limit — Local policy pulls more traffic.',
        score: 450,
        target: 'land-policy',
        action: { type: 'setPolicy', storeId: st.id, policy: 'local' },
        cta: 'Set',
      })
    }
  }

  // Next doctrine in order.
  if (s.menus.strategy) {
    const owned = DOCTRINES.filter((d) => (s.doctrines[d.id] ?? 0) > 0).length
    const next = DOCTRINES.find((d) => d.order === owned)
    if (next && can(s, { type: 'buyDoctrine', id: next.id }).ok) {
      push(out, {
        id: `doctrine-${next.id}`,
        channel: 'strategy',
        kind: 'growth',
        title: next.name,
        blurb: `${next.blurb} · ${doctrineCost(s, owned)} Read.`,
        score: 610,
        target: `doctrine-${next.id}`,
        action: { type: 'buyDoctrine', id: next.id },
        cta: 'Learn',
      })
    }
  }

  // Tournament banks Read.
  if (s.menus.strategy && can(s, { type: 'runTournament' }).ok) {
    push(out, {
      id: 'run-tournament',
      channel: 'strategy',
      kind: 'growth',
      title: 'Run a tournament',
      blurb: `+${tournamentReadPayout(s)} Read for ${CAPITAL.tournamentAttention} Attention.`,
      score: 540,
      target: 'strategy-tournament',
      action: { type: 'runTournament' },
      cta: 'Run',
    })
  }

  // Park idle cash in the invest book.
  if (s.menus.invest && s.invest.unlocked && !s.invest.circuitBreaker && !investOutgrown(s)) {
    const reserve = Math.max(25, s.rates.costPerSec * 300)
    const surplus = Math.max(0, s.cash - reserve)
    const room = Math.max(0, investBookCap(s) - s.invest.balance)
    const amount = Math.floor(Math.min(surplus, room) * 100) / 100
    if (amount >= Math.max(10, room * 0.05) && can(s, { type: 'depositInvest', amount }).ok) {
      push(out, {
        id: 'invest-deposit',
        channel: 'invest',
        kind: 'growth',
        title: 'Park idle cash',
        blurb: `$${amount.toLocaleString()} of surplus can earn in the book.`,
        score: 500,
        target: 'invest-book-deposit',
        action: { type: 'depositInvest', amount },
        cta: 'Deposit',
      })
    }
  }

  // Ads — only when demand is the bottleneck and cash is comfortable.
  if (s.menus.marketing && s.cash >= s.adCost * 2 && can(s, { type: 'buyAd' }).ok) {
    if (salesBottleneck(s).kind === 'demand') {
      push(out, {
        id: 'buy-ad',
        channel: 'marketing',
        kind: 'growth',
        title: 'Buy an ad',
        blurb: `Demand is the bottleneck · $${s.adCost}.`,
        score: 430,
        target: 'marketing-ads',
        action: { type: 'buyAd' },
        cta: 'Buy',
      })
    }
  }
}

/** Ranked progression suggestions (best first). */
export function getSuggestions(s: GameState, limit = 8): Suggestion[] {
  const out: Suggestion[] = []
  collectOffice(s, out)
  collectMemos(s, out)
  collectUpgrades(s, out)
  collectBuilds(s, out)
  collectStaff(s, out)
  collectLand(s, out)
  collectVentures(s, out)
  collectEra2(s, out)
  out.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
  const seen = new Set<string>()
  const ranked: Suggestion[] = []
  for (const g of out) {
    if (seen.has(g.id)) continue
    seen.add(g.id)
    ranked.push(g)
    if (ranked.length >= limit) break
  }
  return ranked
}

export function topSuggestionFor(
  suggestions: Suggestion[],
  channel: SuggestChannel,
): Suggestion | null {
  return suggestions.find((g) => g.channel === channel) ?? null
}

/** Only the #1 suggestion’s channel gets a rail mark. */
export function suggestedChannels(suggestions: Suggestion[]): Set<SuggestChannel> {
  const top = suggestions[0]
  return top ? new Set<SuggestChannel>([top.channel]) : new Set()
}

export function isSuggestedTarget(suggestions: Suggestion[], target: string | undefined): boolean {
  if (!target || !suggestions[0]) return false
  const g = suggestions[0]
  return g.target === target || g.id === target
}

import { chainAttentionDrainPerSec } from './chain'
import { COMPUTE, OFFICE_REBALANCE, SCANNER_PULSE } from '../balance'
import { attentionCap, attentionPerSec, ideasPerSec } from '../formulas'
import { log } from '../helpers'
import { basketRepEarned, nextRepThreshold } from '../reputation'
import { nextRng } from '../rng'
import type { GameState } from '../state'

export type OfficeRebalanceToward = 'archive' | 'analyst'

export function officeRebalanceCost(s: GameState) {
  return Math.ceil(OFFICE_REBALANCE.baseCash * Math.pow(OFFICE_REBALANCE.growth, s.compute.officeMoves ?? 0))
}

/** Fill Attention, spill into Ideas when full, climb the Reputation fib ladder off baskets. */
export function tickOffice(s: GameState, dt: number) {
  if (!s.compute.unlocked) return
  const c = s.compute
  const cap = attentionCap(s)
  const before = c.attention
  const net = attentionPerSec(s) - chainAttentionDrainPerSec(s)
  c.attention = Math.max(0, Math.min(cap, c.attention + net * dt))
  if (before < cap && c.attention >= cap) s.stats.attentionFilled += 1

  if (c.ideasUnlocked && c.ideasOn && c.attention >= cap - 1e-9) {
    const gained = ideasPerSec(s) * dt
    if (gained > 0) {
      c.ideas += gained
      s.stats.ideasEarned += gained
    }
  }

  while (s.baskets >= c.nextRepAt) {
    c.reputation += 1
    c.repEarned += 1
    // Keep fib fields in sync for old UI/tests; ladder itself uses geometric gaps.
    const next = c.fibA + c.fibB
    c.fibA = c.fibB
    c.fibB = next
    c.nextRepAt = nextRepThreshold(basketRepEarned(c.repEarned))
    log(s, `Reputation +1. Next at ${Math.floor(c.nextRepAt)} baskets.`, 'good')
  }
}

export function canBuyAnalyst(s: GameState): string | null {
  if (!s.compute.unlocked) return 'Back office is not open yet.'
  if (s.compute.reputation < 1) return 'Need 1 Reputation.'
  return null
}

export function buyAnalyst(s: GameState) {
  s.compute.reputation -= 1
  s.repSpent = (s.repSpent ?? 0) + 1
  s.compute.analysts += 1
  log(s, `Hired an Analyst (${s.compute.analysts}). Attention flows faster.`, 'memo')
}

export function canBuyArchive(s: GameState): string | null {
  if (!s.compute.unlocked) return 'Back office is not open yet.'
  if (s.compute.reputation < 1) return 'Need 1 Reputation.'
  return null
}

export function buyArchive(s: GameState) {
  s.compute.reputation -= 1
  s.repSpent = (s.repSpent ?? 0) + 1
  s.compute.archives += 1
  log(s, `Opened an Archive (${s.compute.archives}). Cap now ${attentionCap(s)}.`, 'memo')
}

export function toggleIdeas(s: GameState) {
  if (!s.compute.ideasUnlocked) return
  s.compute.ideasOn = !s.compute.ideasOn
}

/** Move one spent Reputation between Analyst and Archive for cash. Keeps ≥1 of each. */
export function canRebalanceOffice(s: GameState, toward: OfficeRebalanceToward): string | null {
  if (!s.compute.unlocked) return 'Back office is not open yet.'
  const cost = officeRebalanceCost(s)
  if (s.cash < cost) return `Need $${cost.toFixed(0)}.`
  if (toward === 'archive') {
    if (s.compute.analysts < 2) return 'Need a spare Analyst (keep at least one).'
  } else if (s.compute.archives < 2) {
    return 'Need a spare Archive (keep at least one).'
  }
  return null
}

export function rebalanceOffice(s: GameState, toward: OfficeRebalanceToward) {
  const blocked = canRebalanceOffice(s, toward)
  if (blocked) return
  const cost = officeRebalanceCost(s)
  s.cash -= cost
  s.compute.officeMoves = (s.compute.officeMoves ?? 0) + 1
  if (toward === 'archive') {
    s.compute.analysts -= 1
    s.compute.archives += 1
    log(
      s,
      `Rebalanced office (−$${cost.toFixed(0)}): Analyst → Archive. Cap now ${attentionCap(s)}.`,
      'memo',
    )
  } else {
    s.compute.archives -= 1
    s.compute.analysts += 1
    const cap = attentionCap(s)
    if (s.compute.attention > cap) s.compute.attention = cap
    log(
      s,
      `Rebalanced office (−$${cost.toFixed(0)}): Archive → Analyst. Cap now ${cap}.`,
      'memo',
    )
  }
}

export function canPulseScanner(s: GameState): string | null {
  if (!s.compute.scanner) return 'Scanner Array not installed.'
  if (s.time < s.compute.scannerReadyAt) {
    const wait = Math.ceil(s.compute.scannerReadyAt - s.time)
    return `Cooling down (${wait}s).`
  }
  return null
}

/**
 * Measure the array: unstable Attention burst.
 * Wobble can skim or spike; wallets never go negative; Attention stays ≤ cap.
 */
export function pulseScanner(s: GameState) {
  const blocked = canPulseScanner(s)
  if (blocked) return
  const c = s.compute
  const p = SCANNER_PULSE
  const base = p.baseBurst + c.analysts * p.perAnalyst
  const t = nextRng(s)
  const wobble = p.wobbleMin + t * (p.wobbleMax - p.wobbleMin)
  const raw = Math.max(0, Math.floor(base * wobble))
  const cap = attentionCap(s)
  const before = c.attention
  const room = Math.max(0, cap - before)
  const gained = Math.min(raw, room)
  c.attention = Math.max(0, Math.min(cap, before + gained))
  if (before < cap && c.attention >= cap) s.stats.attentionFilled += 1

  const cd = p.cooldownMinSec + nextRng(s) * (p.cooldownMaxSec - p.cooldownMinSec)
  c.scannerReadyAt = s.time + cd

  const vibe =
    wobble < 0.7 ? 'skimpy reading' : wobble > 1.6 ? 'bright collapse' : 'stable enough'
  log(
    s,
    `Scanner Array pulsed — ${gained} Attention (${vibe}${raw > gained ? ', Archives full' : ''}).`,
    gained > 0 ? 'good' : 'info',
  )
}

/** Unlock gate used by unlocks.ts — Attention desk opens via memo, but baskets gate is a soft fallback. */
export function computeBasketsGate(s: GameState) {
  return s.baskets >= COMPUTE.unlockBaskets
}

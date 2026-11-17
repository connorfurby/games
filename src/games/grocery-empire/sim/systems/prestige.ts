import { BUILD_VARIANT_BY_ID, variantSlotKey } from '../../content/builds'
import { DOCTRINE_BY_ID } from '../../content/era2'
import { HORIZON, REBRAND } from '../balance'
import { log } from '../helpers'
import { createInitialState, type GameState } from '../state'
import { manifestCrumb } from './lateHubs'

/**
 * Rebrand — the 2.0 prestige loop. From Era 3 you can start a fresh store under a
 * new sign. You keep your Empire (rank, trait points, doctrines), your lessons and
 * your Goodwill; the store, chain, upgrades and cash start over. Goodwill is earned
 * from lifetime revenue this run (cube-root scaled) and permanently lifts basket
 * value and shoppers through the stat engine.
 */
export function goodwillFor(lifetimeRevenue: number): number {
  if (lifetimeRevenue <= 0) return 0
  return Math.floor(Math.cbrt(lifetimeRevenue / REBRAND.revenuePerGoodwillCube))
}

/** Goodwill you'd gain by rebranding now (beyond what this run already banked). */
export function pendingGoodwill(s: GameState): number {
  return Math.max(0, goodwillFor(s.lifetimeRevenue) - (s.rebrand?.bankedThisRun ?? 0))
}

export function canRebrand(s: GameState): string | null {
  if (s.era < REBRAND.minEra) return `Rebrand opens in Era ${REBRAND.minEra}.`
  if (pendingGoodwill(s) < 1) return 'Earn more revenue to gain Goodwill.'
  return null
}

/**
 * SAVE 36: the one thing a Rebrand or Accept carries across on top of the standard keep-list.
 * Exactly one doctrine OR exactly one build facing — never both. Null carries nothing extra.
 */
export type RebrandCarry =
  | { type: 'doctrine'; id: string }
  | { type: 'facing'; track: string; variantId: string }
  | null

export interface CarryOption {
  carry: Exclude<RebrandCarry, null>
  name: string
  blurb: string
}

/** Every doctrine you own and every facing you chose — the menu the "what you keep" sheet offers. */
export function carryOptions(s: GameState): { doctrines: CarryOption[]; facings: CarryOption[] } {
  const doctrines: CarryOption[] = []
  for (const [id, n] of Object.entries(s.doctrines ?? {})) {
    const def = DOCTRINE_BY_ID[id]
    if (!def || (n ?? 0) <= 0) continue
    doctrines.push({ carry: { type: 'doctrine', id }, name: def.name, blurb: def.blurb })
  }
  doctrines.sort((a, b) => (DOCTRINE_BY_ID[(a.carry as { id: string }).id]?.order ?? 0) - (DOCTRINE_BY_ID[(b.carry as { id: string }).id]?.order ?? 0))
  const facings: CarryOption[] = []
  const seen = new Set<string>()
  for (const variantId of Object.values(s.buildVariants ?? {})) {
    const def = BUILD_VARIANT_BY_ID[variantId]
    if (!def || seen.has(variantId)) continue
    seen.add(variantId)
    facings.push({ carry: { type: 'facing', track: def.track, variantId }, name: def.name, blurb: def.blurb })
  }
  return { doctrines, facings }
}

/** Why this carry is not allowed (null when it is, or when nothing is carried). One doctrine OR one facing. */
export function canCarry(s: GameState, carry: RebrandCarry | undefined): string | null {
  if (carry == null) return null
  const raw = carry as unknown as Record<string, unknown>
  if (carry.type === 'doctrine') {
    if ('track' in raw || 'variantId' in raw) return 'Carry one strategy or one facing, not both.'
    if (!DOCTRINE_BY_ID[carry.id] || (s.doctrines?.[carry.id] ?? 0) <= 0) return 'You do not own that strategy.'
    return null
  }
  if (carry.type === 'facing') {
    if ('id' in raw) return 'Carry one strategy or one facing, not both.'
    const def = BUILD_VARIANT_BY_ID[carry.variantId]
    if (!def || def.track !== carry.track) return 'Unknown facing.'
    if (!Object.values(s.buildVariants ?? {}).includes(carry.variantId)) return 'You have not chosen that facing.'
    return null
  }
  return 'Carry one strategy or one facing.'
}

/** Short name for the log and the sheet. */
export function carryName(carry: RebrandCarry): string {
  if (!carry) return 'nothing extra'
  if (carry.type === 'doctrine') return DOCTRINE_BY_ID[carry.id]?.name ?? carry.id
  return BUILD_VARIANT_BY_ID[carry.variantId]?.name ?? carry.variantId
}

/** Put the carried piece into the fresh run. A facing sits dormant until its tier is rebuilt. */
function applyCarry(fresh: GameState, carry: Exclude<RebrandCarry, null>) {
  if (carry.type === 'doctrine') {
    fresh.doctrines[carry.id] = 1
    return
  }
  const def = BUILD_VARIANT_BY_ID[carry.variantId]
  if (def) fresh.buildVariants[variantSlotKey(def.track, def.minTier)] = carry.variantId
}

/**
 * The Rebrand keep-list, shared by `rebrand()` (Engine.rebrand) and Era 6 Accept.
 * Keeps: Empire (rank / trait points / perks), prestigeCarry (appetite, tipSharpness, universe, mutators),
 * Goodwill (+ whatever this run banked), tutorials / seen lines / tips, museum, speed, and the filed Worlds
 * standing route. Everything else — store, staff, depth board, upgrades, cash — is a fresh run.
 */
export function freshRunKeepingMeta(
  s: GameState,
  now = Date.now(),
  carry: RebrandCarry = null,
): { fresh: GameState; gain: number } {
  const gain = pendingGoodwill(s)
  const fresh = createInitialState((s.seed * 7919 + s.rebrand.count + 1) % 2147483647, now)
  // Keep the meta layer.
  fresh.empire = { ...s.empire, perks: { ...s.empire.perks } }
  fresh.rebrand = { goodwill: s.rebrand.goodwill + gain, count: s.rebrand.count + 1, bankedThisRun: 0 }
  fresh.prestigeCarry = { ...s.prestigeCarry, mutators: [...s.prestigeCarry.mutators] }
  fresh.tutorials = { done: { ...s.tutorials.done }, queue: [], active: null, calmUntil: 0 }
  fresh.seenLines = { ...s.seenLines }
  fresh.tipsSeen = { ...s.tipsSeen }
  fresh.introSeen = true
  // A new sign over the same door keeps the name the player gave it, and a daily run keeps its rule.
  fresh.storeName = s.storeName
  fresh.dailyRule = s.dailyRule
  fresh.museum = s.museum
  fresh.speed = s.speed
  fresh.cash = Math.round(fresh.cash * (1 + fresh.rebrand.goodwill * REBRAND.startCashPerGoodwill))
  if (s.projects?.done?.['pj-manifest'] && s.horizon?.standingRoute) {
    const route = s.horizon.standingRoute
    fresh.horizon.standingRoute = { ...route, load: [...route.load] }
    fresh.projects.done['pj-manifest'] = true
    // The filed manifest also carries a crumb of freight across the sign change.
    fresh.horizon.freight = Math.min(HORIZON.freightCap, fresh.horizon.freight + manifestCrumb(s))
  }
  // SAVE 36: one doctrine OR one facing rides along. An invalid or doubled carry is dropped, never half-applied.
  if (carry && !canCarry(s, carry)) applyCarry(fresh, carry)
  return { fresh, gain }
}

export function rebrand(s: GameState, now = Date.now(), carry: RebrandCarry = null): GameState {
  const { fresh, gain } = freshRunKeepingMeta(s, now, carry)
  log(
    fresh,
    `Rebrand #${fresh.rebrand.count}: a new sign over the same door. +${gain} Goodwill (${fresh.rebrand.goodwill} total).`,
    'era',
  )
  if (carry && !canCarry(s, carry)) log(fresh, `Carried across: ${carryName(carry)}.`, 'good')
  return fresh
}

/** Command handlers mutate state in place — swap every field for the fresh run's. */
export function replaceStateInPlace(s: GameState, next: GameState): void {
  for (const key of Object.keys(s)) delete (s as unknown as Record<string, unknown>)[key]
  Object.assign(s, next)
}

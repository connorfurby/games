import type { GameState } from '../sim/state'

export const BUILD_FILTERS = ['storefront', 'storage', 'cold', 'production', 'transit', 'civic'] as const
export type BuildFilter = (typeof BUILD_FILTERS)[number]

export interface BuildTier {
  name: string
  cost: number
  upkeepPerMin: number
  effect: string
  /** Era at which this tier becomes purchasable. Earlier eras hide locked next tiers. */
  era: number
}

export interface BuildTrack {
  id: BuildFilter
  name: string
  blurb: string
  /** Index 0 is "nothing built" unless startsAt > 0. */
  tiers: BuildTier[]
  visible: (s: GameState) => boolean
}

export const BUILD_TRACKS: BuildTrack[] = [
  {
    id: 'storefront',
    name: 'Storefront',
    blurb: 'The store itself. Each tier draws more shoppers, holds more shelf, and adds staff seats.',
    visible: () => true,
    tiers: [
      { name: 'Empty', cost: 0, upkeepPerMin: 0, effect: '', era: 0 },
      { name: 'Stall', cost: 0, upkeepPerMin: 0, effect: 'Where it starts.', era: 0 },
      { name: 'Corner Store', cost: 600, upkeepPerMin: 1, effect: '+15% demand · +20 shelf', era: 1 },
      { name: 'Standard Store', cost: 12_000, upkeepPerMin: 6, effect: '+25% demand · +60 shelf', era: 2 },
      { name: 'Supermarket', cost: 250_000, upkeepPerMin: 40, effect: '+40% demand · +200 shelf', era: 2 },
      { name: 'Hypermarket', cost: 8e6, upkeepPerMin: 600, effect: '+60% demand', era: 3 },
      { name: 'Megastore', cost: 4e8, upkeepPerMin: 9000, effect: '+80% demand', era: 4 },
      { name: 'Autonomous Hub', cost: 5e10, upkeepPerMin: 0, effect: 'Runs itself', era: 4 },
      { name: 'Probe Plaza', cost: 2e14, upkeepPerMin: 0, effect: 'Probe launches cheaper · +1 survey slot', era: 7 },
      { name: 'Greenhouse Atrium', cost: 5e16, upkeepPerMin: 0, effect: 'Greenhouse plots yield more', era: 9 },
      { name: 'The Last Aisle', cost: 2e19, upkeepPerMin: 0, effect: 'The aisle that closes the list', era: 12 },
    ],
  },
  {
    id: 'storage',
    name: 'Storage',
    blurb: 'Room in back. Overfull deliveries are refused at the door, never lost.',
    visible: () => true,
    tiers: [
      { name: 'Empty', cost: 0, upkeepPerMin: 0, effect: '', era: 0 },
      { name: 'Shelf', cost: 0, upkeepPerMin: 0, effect: 'A shelf behind the counter.', era: 0 },
      { name: 'Stockroom', cost: 350, upkeepPerMin: 0.5, effect: '+60 backroom · aging −10%', era: 1 },
      { name: 'Warehouse', cost: 20_000, upkeepPerMin: 8, effect: '+400 backroom', era: 2 },
      { name: 'Regional DC', cost: 1.5e6, upkeepPerMin: 200, effect: '+5k backroom', era: 3 },
      { name: 'Orbital Cache', cost: 1e10, upkeepPerMin: 0, effect: 'Space storage', era: 5 },
      { name: 'Bonded Warehouse', cost: 8e14, upkeepPerMin: 0, effect: '+bonded crate room · imports keep', era: 8 },
      { name: 'Seed Vault', cost: 3e16, upkeepPerMin: 0, effect: 'Vaulted seed never decays', era: 9 },
    ],
  },
  {
    id: 'cold',
    name: 'Cold',
    blurb: 'Coolers slow spoilage. Dairy needs a cooler; meat needs a walk-in.',
    visible: (s) => !!s.memos['reach-in'],
    tiers: [
      { name: 'None', cost: 0, upkeepPerMin: 0, effect: '', era: 0 },
      { name: 'Reach-in Cooler', cost: 150, upkeepPerMin: 0.6, effect: 'Perishables last 25% longer · allows Dairy', era: 1 },
      { name: 'Walk-in Cooler', cost: 1_500, upkeepPerMin: 2, effect: 'Perishables last 60% longer · allows Meat', era: 1 },
      { name: 'Cold Plant', cost: 2e6, upkeepPerMin: 500, effect: 'Freshness grid', era: 3 },
      { name: 'Tank Farm', cost: 5e7, upkeepPerMin: 2000, effect: 'Cold buffer', era: 3 },
      { name: 'Cryo Hub', cost: 1e11, upkeepPerMin: 0, effect: 'Deep cold', era: 5 },
      { name: 'Cryo Ark', cost: 4e16, upkeepPerMin: 0, effect: 'Seed decay far slower', era: 9 },
    ],
  },
  {
    id: 'production',
    name: 'Production',
    blurb: 'Grow your own. Free produce trickles into the backroom.',
    visible: (s) => s.categories.produce,
    tiers: [
      { name: 'None', cost: 0, upkeepPerMin: 0, effect: '', era: 0 },
      { name: 'Garden Plot', cost: 800, upkeepPerMin: 0.4, effect: '+1 produce / 15s', era: 1 },
      { name: 'Farm', cost: 40_000, upkeepPerMin: 10, effect: '+1 produce / s', era: 2 },
      { name: 'Dairy', cost: 300_000, upkeepPerMin: 50, effect: 'Free dairy', era: 2 },
      { name: 'Pack Line', cost: 5e6, upkeepPerMin: 300, effect: 'Packaged goods', era: 3 },
      { name: 'Factory', cost: 8e7, upkeepPerMin: 2000, effect: 'Private label', era: 3 },
      { name: 'Orbital Mill', cost: 3e14, upkeepPerMin: 0, effect: 'Off-world sales +10%', era: 7 },
      { name: 'Relay Foundry', cost: 8e17, upkeepPerMin: 0, effect: 'Relay stations cast further', era: 10 },
    ],
  },
  {
    id: 'transit',
    name: 'Transit',
    blurb: 'Faster deliveries and bigger loads.',
    visible: (s) => s.stats.ordersPlaced >= 5,
    tiers: [
      { name: 'Walking', cost: 0, upkeepPerMin: 0, effect: '', era: 1 },
      { name: 'Cargo Bike', cost: 90, upkeepPerMin: 0.2, effect: 'Deliveries −25% time', era: 1 },
      { name: 'Van', cost: 1_200, upkeepPerMin: 1.5, effect: 'Deliveries −50% time · +12 per crate', era: 1 },
      { name: 'Truck', cost: 30_000, upkeepPerMin: 10, effect: 'Bulk orders', era: 2 },
      { name: 'Rail Slot', cost: 2e6, upkeepPerMin: 300, effect: 'Regional freight', era: 3 },
      { name: 'Freighter', cost: 1e8, upkeepPerMin: 3000, effect: 'Ocean lanes', era: 4 },
      { name: 'Barge Berth', cost: 1e11, upkeepPerMin: 0, effect: 'Seed barges', era: 5 },
      { name: 'Convoy Gantry', cost: 1e15, upkeepPerMin: 0, effect: '+1 crate on the last convoy bay', era: 8 },
      { name: 'Jump Berth', cost: 6e17, upkeepPerMin: 0, effect: 'Jump lanes haul more freight', era: 10 },
    ],
  },
  {
    id: 'civic',
    name: 'Civic',
    blurb: 'Make it a place people like to stop.',
    visible: (s) => s.lifetimeRevenue >= 400,
    tiers: [
      { name: 'None', cost: 0, upkeepPerMin: 0, effect: '', era: 0 },
      { name: 'Parking', cost: 450, upkeepPerMin: 0.4, effect: '+8% demand', era: 1 },
      { name: 'Plaza', cost: 15_000, upkeepPerMin: 4, effect: '+15% demand', era: 2 },
      { name: 'HQ Wing', cost: 500_000, upkeepPerMin: 60, effect: 'Board seats', era: 2 },
      { name: 'Lobby Office', cost: 2e7, upkeepPerMin: 800, effect: 'Political capital', era: 3 },
      { name: 'Museum of Baskets', cost: 1e12, upkeepPerMin: 0, effect: 'Legacy sink', era: 6 },
      { name: 'Embassy Annex', cost: 2e18, upkeepPerMin: 0, effect: 'Embassy seats count double', era: 11 },
      { name: "Ivo's Plaque", cost: 5e19, upkeepPerMin: 0, effect: 'A name on the wall', era: 12 },
    ],
  },
]

export const TRACK_BY_ID = Object.fromEntries(BUILD_TRACKS.map((t) => [t.id, t])) as Record<BuildFilter, BuildTrack>

export function buildLevel(s: GameState, id: BuildFilter): number {
  return s.builds[id] ?? 0
}

/** Early-era sell-back refund; plan: partial before Era 3, full from Era 3. */
export function refundFrac(s: GameState) {
  return s.era >= 3 ? 1 : 0.5
}

export type BuildVariantStat = 'demand' | 'shelf' | 'backroom' | 'spoilCut'

export interface BuildVariantDef {
  id: string
  track: BuildFilter
  /** Minimum owned tier before this facing can be chosen. */
  minTier: number
  name: string
  blurb: string
  /** Bot picks the slow/safe option. */
  safe: boolean
  effect: { stat: BuildVariantStat; mul: number }
}

/** Slot key for a facing decision at a given track + tier gate. */
export function variantSlotKey(track: BuildFilter, minTier: number) {
  return `${track}:${minTier}`
}

/**
 * Facing choices across eras 1–4 — meaningful tradeoffs, soft-capped in formulas.
 * One choice per (track, minTier); bot always picks `safe: true`.
 */
export const BUILD_VARIANTS: BuildVariantDef[] = [
  // Storefront · Corner Store (era 1)
  {
    id: 'wide-glass',
    track: 'storefront',
    minTier: 2,
    name: 'Wide glass',
    blurb: 'Passers-by see the aisle. More foot traffic.',
    safe: false,
    effect: { stat: 'demand', mul: 1.12 },
  },
  {
    id: 'deep-counter',
    track: 'storefront',
    minTier: 2,
    name: 'Deep counter',
    blurb: 'Extra shelf behind the glass. Safer stock.',
    safe: true,
    effect: { stat: 'shelf', mul: 1.14 },
  },
  // Storefront · Standard Store (era 2)
  {
    id: 'open-aisle',
    track: 'storefront',
    minTier: 3,
    name: 'Open aisle',
    blurb: 'Wide lanes pull shoppers deeper.',
    safe: false,
    effect: { stat: 'demand', mul: 1.1 },
  },
  {
    id: 'endcap-bay',
    track: 'storefront',
    minTier: 3,
    name: 'Endcap bay',
    blurb: 'Built-in display wall — more shelf faces.',
    safe: true,
    effect: { stat: 'shelf', mul: 1.12 },
  },
  // Storefront · Supermarket (era 2–3)
  {
    id: 'gallery-front',
    track: 'storefront',
    minTier: 4,
    name: 'Gallery front',
    blurb: 'Glass atrium that draws the block.',
    safe: false,
    effect: { stat: 'demand', mul: 1.12 },
  },
  {
    id: 'stock-spine',
    track: 'storefront',
    minTier: 4,
    name: 'Stock spine',
    blurb: 'Central spine shelves double the facing.',
    safe: true,
    effect: { stat: 'shelf', mul: 1.15 },
  },
  // Storage · Stockroom (era 1)
  {
    id: 'dry-racks',
    track: 'storage',
    minTier: 2,
    name: 'Dry racks',
    blurb: 'More backroom cubes, dry goods first.',
    safe: true,
    effect: { stat: 'backroom', mul: 1.14 },
  },
  {
    id: 'cold-corner',
    track: 'storage',
    minTier: 2,
    name: 'Cold corner',
    blurb: 'A chill nook slows spoil on the edge.',
    safe: false,
    effect: { stat: 'spoilCut', mul: 1.12 },
  },
  // Storage · Warehouse (era 2)
  {
    id: 'high-bay',
    track: 'storage',
    minTier: 3,
    name: 'High bay',
    blurb: 'Tall racks — maximum cube.',
    safe: true,
    effect: { stat: 'backroom', mul: 1.15 },
  },
  {
    id: 'climate-zone',
    track: 'storage',
    minTier: 3,
    name: 'Climate zone',
    blurb: 'Zoned cool aisle cuts spoil.',
    safe: false,
    effect: { stat: 'spoilCut', mul: 1.12 },
  },
  // Cold · Walk-in (era 1–2)
  {
    id: 'deep-shelves',
    track: 'cold',
    minTier: 2,
    name: 'Deep shelves',
    blurb: 'Cooler holds more SKUs safely.',
    safe: true,
    effect: { stat: 'shelf', mul: 1.1 },
  },
  {
    id: 'blast-ready',
    track: 'cold',
    minTier: 2,
    name: 'Blast-ready bay',
    blurb: 'Preps the plant path — demand when cold is online.',
    safe: false,
    effect: { stat: 'demand', mul: 1.1 },
  },
  // Cold · Cold Plant (era 3)
  {
    id: 'tunnel-feed',
    track: 'cold',
    minTier: 3,
    name: 'Tunnel feed',
    blurb: 'Feeds freshness into the store — spoil eases.',
    safe: true,
    effect: { stat: 'spoilCut', mul: 1.14 },
  },
  {
    id: 'display-frost',
    track: 'cold',
    minTier: 3,
    name: 'Display frost',
    blurb: 'Frosted cases that pull the aisle.',
    safe: false,
    effect: { stat: 'demand', mul: 1.1 },
  },
  // Production · Farm (era 2)
  {
    id: 'row-crops',
    track: 'production',
    minTier: 2,
    name: 'Row crops',
    blurb: 'A steady trickle of produce that uses supply more gently.',
    safe: true,
    effect: { stat: 'backroom', mul: 1.1 },
  },
  {
    id: 'market-plot',
    track: 'production',
    minTier: 2,
    name: 'Market plot',
    blurb: 'Show garden that draws shoppers.',
    safe: false,
    effect: { stat: 'demand', mul: 1.1 },
  },
  // Transit · Van (era 1–2)
  {
    id: 'reefer-kit',
    track: 'transit',
    minTier: 2,
    name: 'Reefer kit',
    blurb: 'Chilled cargo — spoil eases on the road.',
    safe: true,
    effect: { stat: 'spoilCut', mul: 1.1 },
  },
  {
    id: 'billboard-van',
    track: 'transit',
    minTier: 2,
    name: 'Billboard van',
    blurb: 'Rolling ads pull demand.',
    safe: false,
    effect: { stat: 'demand', mul: 1.1 },
  },
  // ── SAVE 33 · Era 5–6 facings: one binary slot on Storefront, Cold, Transit (Civic stays a pure ladder).
  // Storefront has no tier that opens in Era 5–6, so its slot sits on the last tier before Probe Plaza
  // (Autonomous Hub, index 7). Same shape as above: one safe, one bold; buildVariantMul soft-caps at 1.35.
  // Storefront · Autonomous Hub (Era 4 → carries through Eras 5–6)
  {
    id: 'hub-beacon',
    track: 'storefront',
    minTier: 7,
    name: 'Beacon facade',
    blurb: 'The hub lights the whole block. More shoppers, thinner stock.',
    safe: false,
    effect: { stat: 'demand', mul: 1.08 },
  },
  {
    id: 'hub-stacks',
    track: 'storefront',
    minTier: 7,
    name: 'Autonomous stacks',
    blurb: 'Self-sorting shelves hold more facings.',
    safe: true,
    effect: { stat: 'shelf', mul: 1.1 },
  },
  // Cold · Cryo Hub (Era 5)
  {
    id: 'cryo-showcase',
    track: 'cold',
    minTier: 5,
    name: 'Cryo showcase',
    blurb: 'Frosted ration cases that pull the aisle.',
    safe: false,
    effect: { stat: 'demand', mul: 1.08 },
  },
  {
    id: 'cryo-bays',
    track: 'cold',
    minTier: 5,
    name: 'Deep-cold bays',
    blurb: 'Colder racks — spoil eases everywhere.',
    safe: true,
    effect: { stat: 'spoilCut', mul: 1.1 },
  },
  // Transit · Barge Berth (Era 5)
  {
    id: 'berth-flags',
    track: 'transit',
    minTier: 6,
    name: 'Berth flags',
    blurb: 'Harbor-side banners draw a crowd from the dock.',
    safe: false,
    effect: { stat: 'demand', mul: 1.08 },
  },
  {
    id: 'berth-reefer',
    track: 'transit',
    minTier: 6,
    name: 'Berth reefer rack',
    blurb: 'Chilled loading rack — cargo spoils less in the dark.',
    safe: true,
    effect: { stat: 'spoilCut', mul: 1.1 },
  },
]

export const BUILD_VARIANT_BY_ID = Object.fromEntries(BUILD_VARIANTS.map((v) => [v.id, v])) as Record<
  string,
  BuildVariantDef
>

export function variantsAtSlot(track: BuildFilter, minTier: number): BuildVariantDef[] {
  return BUILD_VARIANTS.filter((v) => v.track === track && v.minTier === minTier)
}

/** Choice tiers for a track that are unlocked at this build level, ascending. */
export function unlockedVariantTiers(track: BuildFilter, tier: number): number[] {
  const set = new Set<number>()
  for (const v of BUILD_VARIANTS) {
    if (v.track === track && tier >= v.minTier) set.add(v.minTier)
  }
  return [...set].sort((a, b) => a - b)
}

export function variantsForTrack(track: BuildFilter, tier: number): BuildVariantDef[] {
  return BUILD_VARIANTS.filter((v) => v.track === track && tier >= v.minTier)
}

/** First unlocked facing slot on this track that has no choice yet. */
export function pendingVariantChoice(s: GameState, track: BuildFilter): BuildVariantDef[] | null {
  const lvl = buildLevel(s, track)
  for (const t of unlockedVariantTiers(track, lvl)) {
    const key = variantSlotKey(track, t)
    const legacy = s.buildVariants?.[track]
    const picked = s.buildVariants?.[key] ?? (t === 2 && legacy && BUILD_VARIANT_BY_ID[legacy]?.minTier === 2 ? legacy : null)
    if (!picked) return variantsAtSlot(track, t)
  }
  return null
}

export function safeVariantId(track: BuildFilter, tier: number): string | null {
  const pending = pendingVariantChoice(
    { builds: { [track]: tier }, buildVariants: {} } as GameState,
    track,
  )
  // Prefer safe among the pending slot at this exact level
  const slots = unlockedVariantTiers(track, tier)
  for (const t of slots) {
    const opts = variantsAtSlot(track, t)
    if (opts.length) return opts.find((v) => v.safe)?.id ?? opts[0]?.id ?? null
  }
  return null
}

/** Safe pick for the first pending slot given live state. */
export function safePendingVariantId(s: GameState, track: BuildFilter): string | null {
  const pending = pendingVariantChoice(s, track)
  if (!pending?.length) return null
  return pending.find((v) => v.safe)?.id ?? pending[0]?.id ?? null
}

/** Soft-capped product of owned facing multipliers for one stat (~1.35 feel cap). */
export function buildVariantMul(s: GameState, stat: BuildVariantStat): number {
  let m = 1
  const seen = new Set<string>()
  for (const [key, id] of Object.entries(s.buildVariants ?? {})) {
    const def = BUILD_VARIANT_BY_ID[id]
    if (!def) continue
    // Support legacy track-only keys and slot keys.
    const slot = key.includes(':') ? key : variantSlotKey(def.track, def.minTier)
    if (seen.has(slot)) continue
    seen.add(slot)
    if (buildLevel(s, def.track) < def.minTier) continue
    if (def.effect.stat !== stat) continue
    m *= def.effect.mul
  }
  return Math.min(1.35, m)
}

/** Owned facing defs for a track (legacy + slot keys). */
export function ownedVariantsForTrack(s: GameState, track: BuildFilter): BuildVariantDef[] {
  const out: BuildVariantDef[] = []
  const seen = new Set<string>()
  for (const [key, id] of Object.entries(s.buildVariants ?? {})) {
    const def = BUILD_VARIANT_BY_ID[id]
    if (!def || def.track !== track) continue
    const slot = key.includes(':') ? key : variantSlotKey(def.track, def.minTier)
    if (seen.has(slot)) continue
    seen.add(slot)
    if (buildLevel(s, track) < def.minTier) continue
    out.push(def)
  }
  return out.sort((a, b) => a.minTier - b.minTier)
}

/** Migrate legacy `storefront` → `storefront:2` keys in place. */
export function normalizeBuildVariants(raw: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw) return out
  for (const id of Object.values(raw)) {
    const def = BUILD_VARIANT_BY_ID[id]
    if (!def) continue
    // SAVE 33: always re-key to the def's own slot so a stale/foreign slot key can't shadow a real one.
    out[variantSlotKey(def.track, def.minTier)] = id
  }
  return out
}

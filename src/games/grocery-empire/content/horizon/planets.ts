/**
 * Era 7 planets, the SKU tray, and the endless-name table.
 * Score is matched slots / 6. A slot matches when any of its tags is wanted.
 * File the standard is intentionally mediocre (~0.72 = 4–5/6 with bans).
 * Clever shelves can clear FAST_SCORE (0.85).
 */

export type PlanetClimate = 'quiet' | 'heat' | 'orchard' | 'tide' | 'night' | 'ash' | 'ice' | 'market'

export type SlotSix = [string, string, string, string, string, string]

export interface PlanetSku {
  id: string
  name: string
  tags: string[]
  /** Climate cluster the good was bred for. */
  climate: PlanetClimate
}

export interface PlanetDef {
  id: string
  name: string
  climate: PlanetClimate
  wanted: string[]
  /** Tag this world refuses on the shelf. */
  banned?: string
  standardSlots: SlotSix
}

export const PLANET_SKUS: PlanetSku[] = [
  // quiet
  { id: 'can', name: 'Can', tags: ['canned', 'stable'], climate: 'quiet' },
  { id: 'oats', name: 'Oats', tags: ['staple', 'quiet'], climate: 'quiet' },
  { id: 'tea', name: 'Tea', tags: ['quiet', 'dry'], climate: 'quiet' },
  // heat
  { id: 'spice', name: 'Spice', tags: ['spice', 'dry'], climate: 'heat' },
  { id: 'chili', name: 'Chili', tags: ['spice', 'heat'], climate: 'heat' },
  { id: 'jerky', name: 'Jerky', tags: ['canned', 'heat'], climate: 'heat' },
  // orchard
  { id: 'apple', name: 'Apple', tags: ['fresh', 'sweet'], climate: 'orchard' },
  { id: 'bread', name: 'Bread', tags: ['staple', 'fresh'], climate: 'orchard' },
  { id: 'jam', name: 'Jam', tags: ['sweet', 'orchard'], climate: 'orchard' },
  // tide
  { id: 'salt', name: 'Salt', tags: ['salt', 'bulk'], climate: 'tide' },
  { id: 'kelp', name: 'Kelp', tags: ['salt', 'tide'], climate: 'tide' },
  { id: 'rice', name: 'Rice', tags: ['staple', 'bulk'], climate: 'tide' },
  // night
  { id: 'lamp', name: 'Lamp', tags: ['night', 'quiet'], climate: 'night' },
  { id: 'ink', name: 'Ink', tags: ['night', 'brand'], climate: 'night' },
  { id: 'soap', name: 'Soap', tags: ['small', 'brand'], climate: 'night' },
  // ash
  { id: 'flour', name: 'Flour', tags: ['cheap', 'hardy'], climate: 'ash' },
  { id: 'coal', name: 'Coal soap', tags: ['cheap', 'ash'], climate: 'ash' },
  { id: 'seed', name: 'Seed', tags: ['fresh', 'hardy'], climate: 'ash' },
  // ice
  { id: 'milk', name: 'Milk', tags: ['dairy', 'fragile'], climate: 'ice' },
  { id: 'ice', name: 'Ice', tags: ['cold', 'fragile'], climate: 'ice' },
  { id: 'cream', name: 'Cream', tags: ['dairy', 'cold'], climate: 'ice' },
  // market
  { id: 'trinket', name: 'Trinket', tags: ['small', 'brand'], climate: 'market' },
  { id: 'ribbon', name: 'Ribbon', tags: ['small', 'market'], climate: 'market' },
  { id: 'pepper', name: 'Pepper', tags: ['spice', 'market'], climate: 'market' },
]

export const SKU_BY_ID: Record<string, PlanetSku> = Object.fromEntries(PLANET_SKUS.map((sku) => [sku.id, sku]))

/** Reveal order. Index 0 is the first probe. */
export const CLIMATES: readonly PlanetClimate[] = [
  'quiet',
  'heat',
  'orchard',
  'tide',
  'night',
  'ash',
  'ice',
  'market',
]

const CLIMATE_MUL: Record<PlanetClimate, number> = {
  heat: 0.9,
  orchard: 1.1,
  tide: 1,
  night: 0.85,
  ash: 0.8,
  ice: 1.05,
  market: 1.15,
  quiet: 1,
}

/** Local-price climate multiplier. The flagship's best price does not move. */
export function climateMul(climate: PlanetClimate): number {
  return CLIMATE_MUL[climate]
}

export function climateForIndex(i: number): PlanetClimate {
  const n = CLIMATES.length
  const k = ((Math.floor(i) % n) + n) % n
  return CLIMATES[k] ?? 'quiet'
}

/**
 * Slow / file-the-standard bar. Fast clever play aims at FAST_SCORE.
 * Compared with `>=`, not equality.
 */
export const STANDARD_SCORE = 0.72
export const FAST_SCORE = 0.85

/** Slot matches wanted tags and is not banned. */
export function slotMatches(planet: PlanetDef, skuId: string, bannedExtra?: string | null): boolean {
  const sku = SKU_BY_ID[skuId]
  if (!sku) return false
  const banned = bannedExtra || planet.banned
  if (banned && sku.tags.includes(banned)) return false
  const wanted = new Set(planet.wanted)
  return sku.tags.some((tag) => wanted.has(tag))
}

export function scorePlanogram(
  planet: PlanetDef,
  slots: readonly string[],
  bannedExtra?: string | null,
): number {
  let matched = 0
  for (let i = 0; i < 6; i++) {
    if (slotMatches(planet, slots[i] ?? '', bannedExtra)) matched++
  }
  return matched / 6
}

/**
 * Authored standard layouts land near STANDARD_SCORE (4/6 ≈ 0.667, nudged by
 * the file helper). Clever shelves can hit 5–6/6 for the fast gate.
 */
export const PLANETS: PlanetDef[] = [
  {
    id: 'pantry',
    name: 'The Pantry',
    climate: 'quiet',
    wanted: ['stable', 'canned', 'staple'],
    banned: 'heat',
    // 4 matches; flour + tea miss (tea is quiet, not wanted).
    standardSlots: ['can', 'rice', 'bread', 'oats', 'tea', 'flour'],
  },
  {
    id: 'cinder',
    name: 'Cinder Market',
    climate: 'heat',
    wanted: ['dry', 'spice', 'canned'],
    banned: 'fresh',
    standardSlots: ['can', 'spice', 'chili', 'jerky', 'rice', 'apple'],
  },
  {
    id: 'orchard',
    name: 'Glass Orchard',
    climate: 'orchard',
    wanted: ['fresh', 'sweet', 'fragile'],
    banned: 'ash',
    standardSlots: ['apple', 'bread', 'jam', 'milk', 'lamp', 'coal'],
  },
  {
    id: 'brine',
    name: 'Brine Station',
    climate: 'tide',
    wanted: ['salt', 'cold', 'bulk'],
    banned: 'sweet',
    standardSlots: ['salt', 'ice', 'kelp', 'rice', 'can', 'jam'],
  },
  {
    id: 'mercy',
    name: 'Quiet Mercy',
    climate: 'night',
    wanted: ['stable', 'quiet', 'night'],
    banned: 'spice',
    standardSlots: ['lamp', 'can', 'ink', 'oats', 'soap', 'spice'],
  },
  {
    id: 'ash',
    name: 'Ash Dock',
    climate: 'ash',
    wanted: ['bulk', 'cheap', 'hardy'],
    banned: 'dairy',
    standardSlots: ['rice', 'flour', 'salt', 'seed', 'coal', 'milk'],
  },
  {
    id: 'snow',
    name: 'Milk Snow',
    climate: 'ice',
    wanted: ['cold', 'dairy', 'fragile'],
    banned: 'heat',
    standardSlots: ['milk', 'ice', 'cream', 'apple', 'flour', 'chili'],
  },
  {
    id: 'bazaar',
    name: 'Lantern Bazaar',
    climate: 'market',
    wanted: ['spice', 'brand', 'small'],
    banned: 'staple',
    standardSlots: ['soap', 'spice', 'trinket', 'ribbon', 'pepper', 'rice'],
  },
]

export const PLANET_BY_ID: Record<string, PlanetDef> = Object.fromEntries(PLANETS.map((planet) => [planet.id, planet]))

/** Sixteen words. Endless titles read `${name} ${index}` outside this table. */
export const ENDLESS_NAMES = [
  'Cinder',
  'Glass',
  'Brine',
  'Mercy',
  'Ash',
  'Snow',
  'Lantern',
  'Pantry',
  'Kiln',
  'Pear',
  'Tide',
  'Vespers',
  'Soot',
  'Cream',
  'Wick',
  'Larder',
] as const

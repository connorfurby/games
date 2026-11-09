import type { GameState, WeatherId } from '../sim/state'
import { RELIC_BY_ID, relicSeed, type Glyph, type Rarity, type RelicDef } from './relics'
import { STAT_INFO, type StatId } from './upgrades/stats'

/**
 * Every relic carries its own perk. The stat comes from what the relic *is* (a truck
 * speeds unpacking, a snowflake helps the cold chain); the shape — flat, weather-bound,
 * era-scaling or stacking with duplicates — and the size come from its id and rarity,
 * so no two read the same. Perks apply in every run; they live with the museum.
 */

export type PerkShape = 'flat' | 'weather' | 'era' | 'copies' | 'twin'

export interface RelicPerk {
  stat: StatId
  per: number
  shape: PerkShape
  weather?: WeatherId
  era?: number
  /** Secondary stat at half strength (epic and above). */
  also?: StatId
}

const POWER: Record<Rarity, number> = {
  common: 0.006,
  uncommon: 0.01,
  rare: 0.018,
  epic: 0.03,
  legendary: 0.05,
  mythic: 0.09,
}

const GLYPH_STATS: Record<Glyph, StatId[]> = {
  can: ['shelf', 'value'], jar: ['shelf', 'margin'], bottle: ['shelf', 'cold'], coin: ['margin', 'value'],
  receipt: ['margin', 'checkout'], bell: ['demand', 'checkout'], key: ['store', 'network'], crate: ['backroom', 'unpack'],
  truck: ['unpack', 'crateCut'], cart: ['demand', 'checkout'], basket: ['demand', 'value'], apple: ['spoilCut', 'value'],
  carrot: ['spoilCut', 'demand'], banana: ['spoilCut', 'margin'], egg: ['spoilCut', 'shelf'], milk: ['cold', 'spoilCut'],
  cheese: ['spoilCut', 'value'], bread: ['spoilCut', 'demand'], fish: ['spoilCut', 'lane'], snowflake: ['cold', 'plantIncome'],
  thermo: ['cold', 'spoilCut'], ice: ['cold', 'plantIncome'], moon: ['xp', 'attention'], lamp: ['xp', 'demand'],
  mug: ['attention', 'wageCut'], star: ['value', 'xp'], crown: ['value', 'network'], trophy: ['value', 'store'],
  gavel: ['district', 'dealCut'], case: ['dealCut', 'margin'], chart: ['network', 'margin'], scroll: ['ideas', 'attention'],
  anchor: ['lane', 'network'], compass: ['lane', 'store'], ship: ['lane', 'crateCut'], globe: ['network', 'lane'],
  rocket: ['barge', 'harvest'], planet: ['harvest', 'barge'], satellite: ['harvest', 'ideas'], hourglass: ['xp', 'ideas'],
  laurel: ['value', 'xp'], gem: ['value', 'margin'], ghost: ['rivalCut', 'spoilCut'], eye: ['rivalCut', 'demand'],
  flame: ['plantIncome', 'cold'], clock: ['xp', 'unpack'], magnet: ['unpack', 'backroom'], tag: ['demand', 'margin'],
  scale: ['crateCut', 'margin'], chalk: ['demand', 'rivalCut'], broom: ['spoilCut', 'checkout'], hat: ['wageCut', 'unpack'],
  ticket: ['checkout', 'demand'], die: ['network', 'value'], feather: ['wageCut', 'ideas'], mask: ['rivalCut', 'demand'],
  map: ['network', 'store'],
}

const WEATHERS: WeatherId[] = ['rain', 'heat', 'cold', 'fair']
const SHAPES: PerkShape[] = ['flat', 'weather', 'era', 'copies', 'twin']

const cache = new Map<string, RelicPerk>()

export function relicPerk(r: RelicDef): RelicPerk {
  const hit = cache.get(r.id)
  if (hit) return hit
  const seed = relicSeed(r.id)
  const stats = GLYPH_STATS[r.glyph] ?? ['demand', 'value']
  const stat = stats[(seed >>> 3) % stats.length]!
  const other = stats.find((x) => x !== stat) ?? 'value'
  const shape: PerkShape = r.feat ? 'flat' : SHAPES[seed % SHAPES.length]!
  const p: RelicPerk = { stat, per: POWER[r.rarity], shape }
  if (shape === 'weather') p.weather = WEATHERS[(seed >>> 5) % 4]
  if (shape === 'era') p.era = 2 + ((seed >>> 7) % 4)
  if (['epic', 'legendary', 'mythic'].includes(r.rarity) || r.feat) p.also = other
  cache.set(r.id, p)
  return p
}

const WEATHER_WORD: Record<WeatherId, string> = { rain: 'it rains', heat: 'it’s hot', cold: 'it’s cold', fair: 'skies are fair' }

function pctText(n: number) {
  return `${(n * 100).toFixed(n < 0.01 ? 1 : n < 0.1 ? 1 : 0)}%`
}

function statWord(stat: StatId) {
  const info = STAT_INFO[stat]
  return info.kind === 'cut' ? `cheaper ${info.label}` : info.label
}

/** One sentence: what this relic does. */
export function perkText(r: RelicDef): string {
  const p = relicPerk(r)
  const main = `+${pctText(p.per)} ${statWord(p.stat)}`
  const tail = p.also ? `, +${pctText(p.per / 2)} ${statWord(p.also)}` : ''
  switch (p.shape) {
    case 'weather':
      return `${main}${tail}; triple while ${WEATHER_WORD[p.weather!]}.`
    case 'era':
      return `${main}${tail}; doubles from Era ${p.era} on.`
    case 'copies':
      return `${main}${tail} per copy you own (up to 5).`
    case 'twin':
      return `${main}${tail}; double with another ${r.glyph} relic on the wall.`
    default:
      return `${main}${tail}.`
  }
}

/** How many times the perk counts right now (0 = owned but dormant isn't possible; min 1). */
export function perkStrength(r: RelicDef, s: GameState, copies: number, glyphCount: number): number {
  const p = relicPerk(r)
  switch (p.shape) {
    case 'weather':
      return s.weather?.now === p.weather ? 3 : 1
    case 'era':
      return s.era >= (p.era ?? 99) ? 2 : 1
    case 'copies':
      return Math.max(1, Math.min(5, copies))
    case 'twin':
      return glyphCount >= 2 ? 2 : 1
    default:
      return 1
  }
}

/** Effects for stats.ts from the relics on the wall. */
export function relicEffects(s: GameState, owned: Record<string, number>): { effects: { stat: StatId; per: number }[]; rank: number }[] {
  const glyphs: Record<string, number> = {}
  for (const id of Object.keys(owned)) {
    const r = RELIC_BY_ID[id]
    if (r) glyphs[r.glyph] = (glyphs[r.glyph] ?? 0) + 1
  }
  const out: { effects: { stat: StatId; per: number }[]; rank: number }[] = []
  for (const [id, n] of Object.entries(owned)) {
    const r = RELIC_BY_ID[id]
    if (!r) continue
    const p = relicPerk(r)
    const effects = [{ stat: p.stat, per: p.per }]
    if (p.also) effects.push({ stat: p.also, per: p.per / 2 })
    out.push({ effects, rank: perkStrength(r, s, n, glyphs[r.glyph] ?? 0) })
  }
  return out
}

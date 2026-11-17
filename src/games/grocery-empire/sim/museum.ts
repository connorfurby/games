/**
 * Relic Museum logic. Pure functions over a MuseumSave, which lives in its own
 * storage key (ui/museum/store.ts) — never in a run — so relics outlast New Game,
 * Rebrand and hard reset. The run's GameState is only read, to decide which chests
 * have been earned; the run learns the results through the syncRelics command.
 */
import { CATEGORIES, CATEGORY_IDS } from '../content/categories'
import { GOALS } from '../content/goals'
import { PROJECTS } from '../content/projects'
import {
  RARITIES,
  RARITY_INFO,
  RELICS,
  RELIC_BY_ID,
  WINGS,
  relicsInWing,
  type Rarity,
  type RelicDef,
  type WingId,
} from '../content/relics'
import { effectiveLitWings, wingLightBlock } from '../content/relicPerks'
import { HORIZON, PRICE } from './balance'
import type { GameState } from './state'

export interface Chest {
  id: string
  rarity: Rarity
  /** The wing this chest leans toward (70% of its relics), or null for any. */
  wing: WingId | null
  source: string
  at: number
}

export interface RelicRecord {
  at: number
  n: number
  level: number
}

export interface MuseumSave {
  v: 2
  unlocked: boolean
  relics: Record<string, RelicRecord>
  /** Socketed relic ids. Length is at most the socket cap. */
  sockets: string[]
  /**
   * SAVE 36: wings whose bonus is lit. At most the socket cap; lighting one at full means leaving
   * another dark. Null (default) = the first `cap` finished wings.
   */
  litWings: WingId[] | null
  /** Dust new pulls at or below this rarity. Null is off. */
  autoDust: Rarity | null
  chests: Chest[]
  dust: number
  /** Hint level bought per relic: 1 = where it comes from, 2 = most of the name. */
  hints: Record<string, 1 | 2>
  /** Chest grants already paid out, keyed by source (and run). */
  claims: Record<string, 1>
  opened: number
  /** Seconds of play banked toward the next drip chest. */
  playClock: number
  drips: number
  /** Highest era ever reached — gates which wings chests may draw from. */
  maxEra: number
  nextChestId: number
}

export function emptyMuseum(): MuseumSave {
  return {
    v: 2,
    unlocked: false,
    relics: {},
    sockets: [],
    litWings: null,
    autoDust: null,
    chests: [],
    dust: 0,
    hints: {},
    claims: {},
    opened: 0,
    playClock: 0,
    drips: 0,
    maxEra: 0,
    nextChestId: 1,
  }
}

/** Defensive load: anything malformed falls back to defaults. */
export function normalizeMuseum(raw: unknown): MuseumSave {
  const d = emptyMuseum()
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Partial<MuseumSave>
  const num = (v: unknown, f: number) => (typeof v === 'number' && Number.isFinite(v) ? v : f)
  const relics: MuseumSave['relics'] = {}
  if (r.relics && typeof r.relics === 'object') {
    for (const [id, v] of Object.entries(r.relics)) {
      if (!RELIC_BY_ID[id] || !v || typeof v !== 'object') continue
      const row = v as { at?: unknown; n?: unknown; level?: unknown }
      relics[id] = {
        at: num(row.at, Date.now()),
        n: Math.max(1, Math.floor(num(row.n, 1))),
        level: Math.min(HORIZON.relicLevelCap, Math.max(1, Math.floor(num(row.level, 1)))),
      }
    }
  }
  const chests: Chest[] = Array.isArray(r.chests)
    ? r.chests
        .filter((c): c is Chest => !!c && typeof c === 'object' && RARITIES.includes((c as Chest).rarity))
        .map((c) => ({
          id: String(c.id),
          rarity: c.rarity,
          wing: WINGS.some((w) => w.id === c.wing) ? c.wing : null,
          source: String(c.source ?? ''),
          at: num(c.at, Date.now()),
        }))
    : []
  const hints: MuseumSave['hints'] = {}
  if (r.hints && typeof r.hints === 'object') {
    for (const [id, v] of Object.entries(r.hints)) if (RELIC_BY_ID[id] && (v === 1 || v === 2)) hints[id] = v
  }
  const sockets = Array.isArray((r as { sockets?: unknown }).sockets)
    ? (r as { sockets: unknown[] }).sockets.filter((id): id is string => typeof id === 'string' && !!relics[id])
    : []
  const rawLit = (r as { litWings?: unknown }).litWings
  const litWings = Array.isArray(rawLit)
    ? rawLit.filter((w, i, a): w is WingId => WINGS.some((x) => x.id === w) && a.indexOf(w) === i)
    : null
  const rawDust = (r as { autoDust?: unknown }).autoDust
  const autoDust = RARITIES.includes(rawDust as Rarity) ? (rawDust as Rarity) : null
  return {
    v: 2,
    unlocked: !!r.unlocked,
    relics,
    sockets,
    litWings,
    autoDust,
    chests,
    dust: Math.max(0, Math.floor(num(r.dust, 0))),
    hints,
    claims: r.claims && typeof r.claims === 'object' ? (r.claims as MuseumSave['claims']) : {},
    opened: Math.max(0, Math.floor(num(r.opened, 0))),
    playClock: Math.max(0, num(r.playClock, 0)),
    drips: Math.max(0, Math.floor(num(r.drips, 0))),
    maxEra: Math.max(0, Math.floor(num(r.maxEra, 0))),
    nextChestId: Math.max(1, Math.floor(num(r.nextChestId, chests.length + 1))),
  }
}

export const MUSEUM = {
  /** Seconds of unpaused play per drip chest. */
  dripSec: 480,
  /** Share of a wing-leaning chest's relics that come from that wing. */
  wingLean: 0.7,
  /** Chance a roll prefers a relic you don't have yet (rises with chests opened). */
  newBias: 0.72,
  newBiasPerOpen: 0.002,
  /** Dust shop: chest price by rarity. */
  shop: { uncommon: 25, rare: 60, epic: 160, legendary: 420 } as Partial<Record<Rarity, number>>,
  /** Hint prices: level 1 base, level 2 multiplier, scaled by rarity index. */
  hint1: 6,
  hint2Mul: 4,
  /** demand bonus per relic owned (soft-capped like every stat). */
  demandPerRelic: 0.001,
}

/** Relic rarity odds by chest rarity. */
const ODDS: Record<Rarity, Partial<Record<Rarity, number>>> = {
  common: { common: 0.72, uncommon: 0.24, rare: 0.04 },
  uncommon: { common: 0.4, uncommon: 0.45, rare: 0.13, epic: 0.02 },
  rare: { uncommon: 0.35, rare: 0.5, epic: 0.13, legendary: 0.02 },
  epic: { rare: 0.45, epic: 0.45, legendary: 0.09, mythic: 0.01 },
  legendary: { epic: 0.45, legendary: 0.45, mythic: 0.1 },
  mythic: { legendary: 0.5, mythic: 0.5 },
}

export function chestOdds(r: Rarity): Partial<Record<Rarity, number>> {
  return ODDS[r]
}

/** Wings each era opens to chests (Oddities never drop). */
const WING_ERA: Record<Exclude<WingId, 'oddities'>, number> = {
  corner: 0,
  night: 0,
  produce: 1,
  backroom: 0,
  chain: 2,
  rivals: 2,
  cold: 3,
  boardroom: 2,
  lanes: 4,
  orbit: 5,
  legacy: 3,
  staff: 0,
  marketing: 0,
  weather: 1,
  seasonal: 0,
  archive: 0,
  lab: 0,
  ventures: 1,
  works: 0,
  horizon: 7,
}

export function wingOpen(m: MuseumSave, wing: WingId): boolean {
  if (wing === 'oddities') return true
  return m.maxEra >= WING_ERA[wing]
}

export function eraWing(era: number): WingId {
  if (era >= 7) return 'horizon'
  return (['backroom', 'corner', 'chain', 'cold', 'lanes', 'orbit', 'legacy'] as const)[Math.max(0, Math.min(6, era))]!
}

function add(m: MuseumSave, key: string | null, rarity: Rarity, wing: WingId | null, source: string, out: Chest[]) {
  if (key) {
    if (m.claims[key]) return
    m.claims[key] = 1
  }
  const c: Chest = { id: `c${m.nextChestId++}`, rarity, wing, source, at: Date.now() }
  m.chests.push(c)
  out.push(c)
}

export function hasRelic(m: MuseumSave, id: string): boolean {
  return !!m.relics[id]
}

export function relicCount(m: MuseumSave): number {
  return Object.keys(m.relics).length
}

export function completedWings(m: MuseumSave): WingId[] {
  return WINGS.filter((w) => relicsInWing(w.id).every((r) => m.relics[r.id])).map((w) => w.id)
}

// ── Feats (Oddities) ─────────────────────────────────────────────────────────

export const FEATS: Record<string, { text: string; vague: string; test: (s: GameState, m: MuseumSave) => boolean }> = {
  thrift: { vague: 'Something about the cheapest possible price.', text: 'Set the price to the minimum after selling 100 baskets this run.', test: (s) => s.price <= PRICE.min + 1e-9 && s.baskets >= 100 },
  markup: { vague: 'Something about the highest possible price.', text: 'Set the price to the maximum.', test: (s) => s.price >= PRICE.max - 1e-9 },
  bare: { vague: 'Empty, completely, at the wrong moment.', text: 'Have nothing on the shelf or in the backroom after 1,000 baskets.', test: (s) => s.baskets >= 1000 && s.shelf.length === 0 && s.backroom.length === 0 },
  broke: { vague: 'Rich enough to own a chain, poor enough to count coins.', text: 'Have under $1 in cash in Era 2 or later.', test: (s) => s.era >= 2 && s.cash < 1 },
  speed: { vague: 'Faster. Faster than that.', text: 'Run the game at 8× speed.', test: (s) => s.speed >= 8 },
  owl: { vague: 'Open the store when everyone else is asleep.', text: 'Play between midnight and 4 a.m. (your local time).', test: (s) => !s.paused && new Date().getHours() < 4 },
  rot: { vague: 'An exhibition nobody wanted.', text: 'Collect 10 spoilage exhibits in one run.', test: (s) => (s.museum?.exhibits?.length ?? 0) >= 10 },
  doors: { vague: 'Every door you are allowed to open.', text: 'Own 12 stores.', test: (s) => s.stores.length >= 12 },
  attend: { vague: 'A big chain where nobody feels forgotten.', text: 'Have 8+ stores with none more than 5% slipping.', test: (s) => s.stores.length >= 8 && s.stores.every((st) => (st.drift ?? 0) < 0.05) },
  neglect: { vague: 'Forget someone completely.', text: 'Let a store slip all the way to 100%.', test: (s) => s.stores.some((st) => (st.drift ?? 0) >= 1) },
  facing: {
    vague: 'Glass or counter — you chose the face of the store.',
    text: 'Pick a build facing on any track.',
    test: (s) => Object.keys(s.buildVariants ?? {}).length >= 1,
  },
  brownout: { vague: 'The cold goes out, again and again.', text: 'Survive 3 cold brownouts in one run.', test: (s) => (s.cold?.brownouts ?? 0) >= 3 },
  plants: { vague: 'A lot of cold, all at once.', text: 'Run 20 cold plants at once.', test: (s) => (s.cold?.plants ?? 0) >= 20 },
  seas: { vague: 'A lane for every sea.', text: 'Open 7 sea routes.', test: (s) => (s.fleet?.lanes ?? 0) >= 7 },
  armada: { vague: 'The sky, crowded.', text: 'Have 100 barges.', test: (s) => (s.fleet?.barges ?? 0) >= 100 },
  fullhouse: { vague: 'Nobody left to compete with.', text: 'Buy out all four rivals in one run.', test: (s) => ['penny', 'freshway', 'megamart', 'halo'].every((id) => s.rivals?.[id]?.bought) },
  peace: { vague: 'Win without fighting.', text: 'Reach Era 4 without a single price war.', test: (s) => s.era >= 4 && Object.values(s.rivals ?? {}).every((r) => (r.wars ?? 0) === 0) },
  million: { vague: 'A very round number of baskets.', text: 'Sell 1,000,000 baskets in one run.', test: (s) => s.baskets >= 1e6 },
  billion: { vague: 'An absurdly round number of baskets.', text: 'Sell 1,000,000,000 baskets in one run.', test: (s) => s.baskets >= 1e9 },
  hoard: { vague: 'Sit on a mountain of money.', text: 'Hold $1 trillion in cash.', test: (s) => s.cash >= 1e12 },
  rank50: { vague: 'Climb the Empire ranks, far.', text: 'Reach Empire rank 50.', test: (s) => s.empire.level >= 50 },
  phoenix: { vague: 'Change your name, and again, and again.', text: 'Rebrand 3 times.', test: (s) => (s.rebrand?.count ?? 0) >= 3 },
  collect100: { vague: 'A wall that is starting to look full.', text: 'Own 100 relics.', test: (_s, m) => relicCount(m) >= 100 },
  chests100: { vague: 'Open, open, open.', text: 'Open 100 chests.', test: (_s, m) => m.opened >= 100 },
  universe: { vague: 'Finish the job in orbit.', text: 'Clear the biomass and reach Era 6.', test: (s) => s.era >= 6 },
  collect250: { vague: 'Almost everything.', text: 'Own 250 relics.', test: (_s, m) => relicCount(m) >= 250 },
  'hz-ration': {
    vague: 'A board that counted every mouth, and then signed.',
    text: 'Buy out the Ration Board.',
    test: (s) => !!s.rivals?.ration?.bought,
  },
  'hz-eight': {
    vague: 'Eight worlds, all of them stocked.',
    text: 'Stock all 8 named planets.',
    test: (s) => (s.horizon?.planets?.filter((p) => p.stocked).length ?? 0) >= 8,
  },
  'hz-year': {
    vague: 'A dozen turns of the season.',
    text: 'See 12 seasons.',
    test: (s) => (s.horizon?.seasonsSeen ?? 0) >= 12,
  },
  'hz-phrases': {
    vague: 'The wire, cleared again and again.',
    text: 'Clear 40 phrases.',
    test: (s) => (s.horizon?.phrasesCleared ?? 0) >= 40,
  },
  'hz-charter': {
    vague: 'A charter with your name on it.',
    text: 'Sign a charter.',
    test: (s) => !!s.horizon?.charter,
  },
  'hz-list': {
    vague: 'The last list, finished.',
    text: 'Finish the last list.',
    test: (s) => (s.horizon?.listScore ?? 0) + 1e-9 >= 0.8,
  },
  'hz-plaque': {
    vague: 'A name on the wall, and a second silence.',
    text: "Raise Ivo's Plaque or refuse the list twice.",
    test: (s) => (s.builds.civic ?? 0) >= 7 || (s.memos['plaque-copy'] ?? 0) > 0 || s.horizon?.ending === 'reject',
  },
  'hz-route': {
    vague: 'A route pinned so it can be filed again.',
    text: 'Set a standing route.',
    test: (s) => !!s.horizon?.standingRoute,
  },
  'hz-cluster': {
    vague: 'A name you gave the sky.',
    text: 'Name a cluster of worlds.',
    test: (s) => !!s.horizon?.cluster,
  },
  'hz-desk': {
    vague: 'A desk with no empty chair.',
    text: 'Seat 3 agents at once.',
    test: (s) => (s.horizon?.agents?.length ?? 0) >= 3,
  },
  'hz-seals': {
    vague: 'Seals lifted, and pressed again.',
    text: 'Swap charter clauses 4 times.',
    test: (s) => (s.horizon?.clauseToggles ?? 0) >= 4,
  },
}

// ── Earning ─────────────────────────────────────────────────────────────────

/** Extra Horizon chests for reaching each late era: [era, rarity, source flavor]. */
export const HORIZON_MILESTONES: readonly (readonly [number, Rarity, string])[] = [
  [7, 'rare', 'The first world on the shelf'],
  [8, 'rare', 'Freight that arrived on its own'],
  [9, 'epic', 'A season in the beds'],
  [10, 'epic', 'The wire heard you back'],
  [11, 'epic', 'The fork, tasted twice'],
  [12, 'legendary', 'The last aisle, swept'],
]

export interface EarnResult {
  chests: Chest[]
  feats: RelicDef[]
  unlockedNow: boolean
}

function localDay(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * Pay out every chest the run has earned so far (idempotent per source key) and
 * any feats now true. `playDelta` is unpaused seconds since the last check.
 */
export function earn(m: MuseumSave, s: GameState, playDelta: number): EarnResult {
  const out: Chest[] = []
  const feats: RelicDef[] = []
  let unlockedNow = false
  const run = String(s.createdAt ?? 0)

  m.maxEra = Math.max(m.maxEra, s.era)

  if (!m.unlocked) {
    if (s.era >= 1 || s.baskets >= 500) {
      m.unlocked = true
      unlockedNow = true
      add(m, 'welcome', 'rare', 'corner', 'The Curator’s welcome', out)
      add(m, 'welcome-2', 'common', 'backroom', 'The Curator’s welcome', out)
    } else {
      return { chests: out, feats, unlockedNow }
    }
  }

  // Play time drip.
  m.playClock += Math.max(0, Math.min(10, playDelta))
  while (m.playClock >= MUSEUM.dripSec) {
    m.playClock -= MUSEUM.dripSec
    m.drips += 1
    const fourth = m.drips % 4 === 0
    // Once the Horizon has been reached, every third drip is a Horizon chest instead.
    if (m.maxEra >= 7 && !fourth && m.drips % 3 === 0) {
      add(m, null, 'uncommon', 'horizon', 'Time at the listening desk', out)
    } else {
      add(m, null, fourth ? 'uncommon' : 'common', fourth ? 'night' : 'corner', 'Time on the floor', out)
    }
  }

  // Coming back after a while away (the welcome-back receipt).
  const away = s.offlineReceipt?.cappedSeconds ?? 0
  if (away >= 1800) {
    add(m, `away:${run}:${Math.round(s.offlineReceipt!.seconds)}`, away >= 4 * 3600 ? 'rare' : 'uncommon', 'night', 'Welcome back', out)
  }

  add(m, `day:${localDay()}`, 'rare', 'seasonal', 'First visit today', out)

  // Goals on the campaign spine.
  GOALS.forEach((g, i) => {
    let done = false
    try {
      done = g.done(s)
    } catch {
      done = false
    }
    if (!done) return
    const rarity: Rarity = i < 4 ? 'common' : i < 8 ? 'uncommon' : i < 13 ? 'rare' : 'epic'
    add(m, `goal:${run}:${g.id}`, rarity, i < 5 ? 'backroom' : g.era >= 7 ? 'horizon' : eraWing(Math.min(6, Math.floor(i / 3))), `Goal: ${g.title}`, out)
  })

  for (let e = 1; e <= s.era; e++) {
    add(m, `era:${run}:${e}`, e >= 6 ? 'legendary' : e >= 3 ? 'epic' : 'rare', eraWing(e), `Reached Era ${e}`, out)
  }

  // Era 7–12 milestone chests: one Horizon chest per era, with a source line of its own.
  for (const [e, rarity, source] of HORIZON_MILESTONES) {
    if (s.era >= e) add(m, `hzm:${run}:${e}`, rarity, 'horizon', source, out)
  }

  const bk: [number, Rarity][] = [[1e3, 'common'], [1e4, 'common'], [1e5, 'uncommon'], [1e6, 'rare'], [1e7, 'rare'], [1e8, 'epic'], [1e9, 'legendary']]
  for (const [n, r] of bk) if (s.baskets >= n) add(m, `bk:${run}:${n}`, r, 'corner', `${n.toLocaleString()} baskets`, out)

  // Produce: each perishable aisle, and the run's spoilage exhibits.
  for (const c of CATEGORY_IDS) {
    if (s.categories[c] && CATEGORIES[c].life != null) add(m, `fresh:${run}:${c}`, 'uncommon', 'produce', `Opened ${CATEGORIES[c].name}`, out)
  }
  const rot = Math.min(10, s.museum?.exhibits?.length ?? 0)
  for (let n = 1; n <= rot; n++) add(m, `rot:${run}:${n}`, 'common', 'produce', 'Spoilage exhibit', out)

  // Chain.
  for (let n = 2; n <= Math.min(12, s.stores.length); n++) add(m, `st:${run}:${n}`, 'uncommon', 'chain', `Opened store ${n}`, out)
  if (s.depot) add(m, `depot:${run}`, 'rare', 'chain', 'Built the depot', out)

  // Rivals.
  for (const [id, r] of Object.entries(s.rivals ?? {})) {
    if (r.bought) add(m, `rv:${run}:${id}`, 'epic', 'rivals', 'Bought out a rival', out)
    for (let n = 1; n <= Math.min(3, r.wars ?? 0); n++) add(m, `pw:${run}:${id}:${n}`, 'uncommon', 'rivals', 'Won a price war', out)
  }

  // Boardroom.
  for (const pj of PROJECTS) if (s.projects?.done?.[pj.id]) add(m, `pj:${run}:${pj.id}`, 'rare', 'boardroom', `Project: ${pj.name}`, out)
  for (let L = 5; L <= s.empire.level; L += 5) {
    add(m, `rank:${run}:${L}`, L % 25 === 0 ? 'epic' : 'uncommon', 'boardroom', `Empire rank ${L}`, out)
  }

  // Cold, lanes, orbit.
  for (let n = 5; n <= Math.min(40, s.cold?.plants ?? 0); n += 5) add(m, `cp:${run}:${n}`, 'uncommon', 'cold', `${n} cold plants`, out)
  for (let n = 1; n <= Math.min(10, s.fleet?.lanes ?? 0); n++) add(m, `ln:${run}:${n}`, 'uncommon', 'lanes', `Ocean lane ${n}`, out)
  for (let n = 1; n <= Math.min(5, s.fleet?.franchises ?? 0); n++) add(m, `fr:${run}:${n}`, 'rare', 'lanes', `Franchise ${n}`, out)
  for (let n = 10; n <= Math.min(100, s.fleet?.barges ?? 0); n += 10) add(m, `bg:${run}:${n}`, 'rare', 'orbit', `${n} barges`, out)
  const bmax = s.fleet?.biomassMax ?? 0
  if (bmax > 0 && s.fleet.launched) {
    const cleared = 1 - (s.fleet.biomass ?? bmax) / bmax
    for (const q of [0.25, 0.5, 0.75, 1]) if (cleared >= q - 1e-9) add(m, `bio:${run}:${q}`, q >= 1 ? 'legendary' : 'epic', 'orbit', `Biomass ${q * 100}% cleared`, out)
  }

  // Systems: every few hires, ads, weather days, memos, upgrades, collections, builds, orders.
  const steps: [WingId, string, number, number, number, string][] = [
    ['staff', 'hire', s.stats.hires ?? 0, 5, 12, 'hires'],
    ['marketing', 'ad', s.stats.adsBought ?? 0, 5, 12, 'ads bought'],
    ['weather', 'wx', s.stats.weatherDays ?? 0, 3, 15, 'weather days'],
    ['archive', 'memo', s.stats.memosDone ?? 0, 6, 15, 'memos filed'],
    ['lab', 'up', s.stats.upgradesBought ?? 0, 15, 20, 'upgrades bought'],
    ['ventures', 'vc', s.stats.ventureCollects ?? 0, 10, 12, 'venture collections'],
    ['works', 'build', s.stats.buildsBought ?? 0, 3, 15, 'builds'],
    ['works', 'order', s.stats.ordersPlaced ?? 0, 40, 10, 'wholesale orders'],
  ]
  for (const [wing, tag, have, every, cap, label] of steps) {
    const n = Math.min(cap, Math.floor(have / every))
    for (let i = 1; i <= n; i++) {
      const rarity: Rarity = i % 6 === 0 ? 'rare' : i % 2 === 0 ? 'uncommon' : 'common'
      add(m, `${tag}:${run}:${i}`, rarity, wing, `${i * every} ${label}`, out)
    }
  }

  // Legacy.
  if ((s.rebrand?.count ?? 0) > 0) add(m, `rb:${run}`, 'legendary', 'legacy', 'Rebranded', out)
  if (s.endingChoice) add(m, `end:${run}`, 'mythic', 'legacy', 'Reached the ending', out)

  // Feats.
  for (const r of RELICS) {
    if (!r.feat || m.relics[r.id]) continue
    const f = FEATS[r.feat]
    let ok = false
    try {
      ok = !!f && f.test(s, m)
    } catch {
      ok = false
    }
    if (ok) {
      m.relics[r.id] = { at: Date.now(), n: 1, level: 1 }
      feats.push(r)
    }
  }

  // Collection milestones (global, once ever).
  const count = relicCount(m)
  const ms: [number, Rarity][] = [[10, 'rare'], [25, 'epic'], [50, 'epic'], [100, 'legendary'], [150, 'legendary'], [200, 'mythic'], [250, 'mythic']]
  for (const [n, r] of ms) if (count >= n) add(m, `rc:${n}`, r, null, `${n} relics on the wall`, out)

  return { chests: out, feats, unlockedNow }
}

// ── Opening ─────────────────────────────────────────────────────────────────

export interface OpenResult {
  relic: RelicDef
  isNew: boolean
  dust: number
  chest: Chest
}

function rollRarity(chest: Rarity, rand: () => number): Rarity {
  const odds = ODDS[chest]
  let x = rand()
  for (const r of RARITIES) {
    const p = odds[r] ?? 0
    if (x < p) return r
    x -= p
  }
  return chest
}

/** Open one chest. Mutates `m`; returns what came out. */
export function openChest(m: MuseumSave, chestId: string, rand: () => number = Math.random): OpenResult | null {
  const idx = m.chests.findIndex((c) => c.id === chestId)
  if (idx < 0) return null
  const chest = m.chests[idx]!
  m.chests.splice(idx, 1)
  m.opened += 1

  const rarity = rollRarity(chest.rarity, rand)
  const openWings = WINGS.filter((w) => w.id !== 'oddities' && wingOpen(m, w.id)).map((w) => w.id)
  const wing: WingId =
    chest.wing && rand() < MUSEUM.wingLean ? chest.wing : openWings[Math.floor(rand() * openWings.length)] ?? 'corner'

  let pool = RELICS.filter((r) => r.wing === wing && r.rarity === rarity && !r.feat)
  if (pool.length === 0) pool = RELICS.filter((r) => r.rarity === rarity && !r.feat && openWings.includes(r.wing))
  if (pool.length === 0) pool = RELICS.filter((r) => !r.feat)

  const fresh = pool.filter((r) => !m.relics[r.id])
  const preferNew = rand() < Math.min(0.95, MUSEUM.newBias + m.opened * MUSEUM.newBiasPerOpen)
  const from = fresh.length > 0 && preferNew ? fresh : pool
  const relic = from[Math.floor(rand() * from.length)]!

  const dusted = m.autoDust != null && RARITIES.indexOf(relic.rarity) <= RARITIES.indexOf(m.autoDust)
  if (dusted) {
    const dust = RARITY_INFO[relic.rarity].dust
    m.dust += dust
    return { relic, isNew: false, dust, chest }
  }
  const isNew = !m.relics[relic.id]
  let dust = 0
  if (isNew) m.relics[relic.id] = { at: Date.now(), n: 1, level: 1 }
  else {
    m.relics[relic.id]!.n += 1
    dust = RARITY_INFO[relic.rarity].dust
    m.dust += dust
  }
  return { relic, isNew, dust, chest }
}

const LEVEL_MUL: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.4,
  rare: 2,
  epic: 3.2,
  legendary: 5,
  mythic: 8,
}

/** Dust to go from `level` to `level + 1`. */
export function relicLevelCost(rarity: Rarity, level: number): number {
  return Math.round(8 * LEVEL_MUL[rarity] * Math.pow(Math.max(1, level), 1.6))
}

export function relicLevelPower(level: number): number {
  const lv = Math.max(1, Math.min(HORIZON.relicLevelCap, Math.floor(level) || 1))
  return 1 + 0.8 * Math.pow((lv - 1) / 9, 0.7)
}

function copiesOk(n: number, nextLevel: number): boolean {
  if (nextLevel <= 3) return true
  return n >= nextLevel - 2
}

/** Spend dust to raise a relic. `count` levels as far as dust and copies allow. */
export function levelRelic(m: MuseumSave, id: string, count = 1): boolean {
  const rec = m.relics[id]
  const def = RELIC_BY_ID[id]
  if (!rec || !def) return false
  let stepped = 0
  const times = Math.max(1, Math.floor(count) || 1)
  for (let i = 0; i < times; i++) {
    if (rec.level >= HORIZON.relicLevelCap) break
    const next = rec.level + 1
    if (!copiesOk(rec.n, next)) break
    const cost = relicLevelCost(def.rarity, rec.level)
    if (m.dust < cost) break
    m.dust -= cost
    rec.level = next
    stepped++
  }
  return stepped > 0
}

export function socketCapFor(projectDone: boolean): number {
  return projectDone ? HORIZON.relicSocketsLater : HORIZON.relicSockets
}

export function socketRelic(m: MuseumSave, id: string, cap: number = HORIZON.relicSockets): boolean {
  if (!m.relics[id]) return false
  if (m.sockets.includes(id)) return false
  if (m.sockets.length >= cap) return false
  m.sockets.push(id)
  return true
}

export function unsocketRelic(m: MuseumSave, id: string): boolean {
  const i = m.sockets.indexOf(id)
  if (i < 0) return false
  m.sockets.splice(i, 1)
  return true
}

/** Wings whose bonus is on right now (finished AND holding a socket). */
export function litWingsOf(m: MuseumSave, cap: number): WingId[] {
  return effectiveLitWings(completedWings(m), m.litWings, cap) as WingId[]
}

/** Why `wing` cannot be lit (null when it can). Full sockets need another wing left dark first. */
export function canLightWing(m: MuseumSave, wing: WingId, cap: number): string | null {
  return wingLightBlock(completedWings(m), m.litWings, cap, wing)
}

/**
 * Light `wing`. With every socket lit, name the wing to leave dark in `swapOut`; without it the
 * call fails. Never lights two wings by darkening none.
 */
export function lightWing(m: MuseumSave, wing: WingId, cap: number, swapOut?: WingId): boolean {
  let lit: WingId[] = litWingsOf(m, cap)
  if (swapOut) {
    if (swapOut === wing || !lit.includes(swapOut)) return false
    lit = lit.filter((w) => w !== swapOut)
  }
  if (wingLightBlock(completedWings(m), lit, cap, wing)) return false
  m.litWings = [...lit, wing]
  return true
}

export function darkenWing(m: MuseumSave, wing: WingId, cap: number): boolean {
  const lit = litWingsOf(m, cap)
  if (!lit.includes(wing)) return false
  m.litWings = lit.filter((w) => w !== wing)
  return true
}

export function setAutoDust(m: MuseumSave, rarity: Rarity | null): void {
  m.autoDust = rarity && RARITIES.includes(rarity) ? rarity : null
}

/** Turn one extra copy into dust. The last copy stays on the wall. */
export function dustRelic(m: MuseumSave, id: string): boolean {
  const rec = m.relics[id]
  const def = RELIC_BY_ID[id]
  if (!rec || !def || rec.n <= 1) return false
  rec.n -= 1
  m.dust += RARITY_INFO[def.rarity].dust
  return true
}

/** Highest wing-rank multiplier when every relic in the wing is owned. */
export function wingRankMul(m: MuseumSave, wing: WingId): number {
  const rows = relicsInWing(wing)
  if (rows.length === 0 || rows.some((r) => !m.relics[r.id])) return 1
  let min: number = HORIZON.relicLevelCap
  for (const r of rows) min = Math.min(min, m.relics[r.id]!.level)
  if (min >= 10) return 1.5
  if (min >= 6) return 1.25
  if (min >= 3) return 1.1
  return 1
}

// ── Dust: hints and the shop ────────────────────────────────────────────────

export function hintCost(relic: RelicDef, level: 1 | 2): number {
  const base = MUSEUM.hint1 * (1 + RARITIES.indexOf(relic.rarity))
  return level === 1 ? base : base * MUSEUM.hint2Mul
}

export function buyHint(m: MuseumSave, id: string): boolean {
  const r = RELIC_BY_ID[id]
  if (!r || m.relics[id]) return false
  const next = ((m.hints[id] ?? 0) + 1) as 1 | 2
  if (next > 2) return false
  const cost = hintCost(r, next)
  if (m.dust < cost) return false
  m.dust -= cost
  m.hints[id] = next
  return true
}

/** "T__ G_____ C__": first letter of each word plus punctuation. */
export function partialName(name: string): string {
  return name
    .split(' ')
    .map((w) => w.replace(/[A-Za-z0-9]/g, (ch, i) => (i === 0 ? ch : '_')))
    .join(' ')
}

export function buyChest(m: MuseumSave, rarity: Rarity, wing: WingId | null): Chest | null {
  const price = MUSEUM.shop[rarity]
  if (price == null || m.dust < price) return null
  if (wing && !wingOpen(m, wing)) return null
  m.dust -= price
  const out: Chest[] = []
  add(m, null, rarity, wing, 'Bought with dust', out)
  return out[0] ?? null
}

/** Stat bonus the run gets from the museum (read by sim/systems/stats.ts via state.relics). */
export function museumSync(m: MuseumSave): {
  wings: string[]
  count: number
  unlocked: boolean
  owned: Record<string, number>
  levels: Record<string, number>
  sockets: string[]
  litWings: string[] | null
  dust: number
} {
  const owned: Record<string, number> = {}
  const levels: Record<string, number> = {}
  for (const [id, v] of Object.entries(m.relics)) {
    owned[id] = v.n
    levels[id] = v.level
  }
  return {
    wings: completedWings(m),
    count: relicCount(m),
    unlocked: m.unlocked,
    owned,
    levels,
    sockets: [...m.sockets],
    litWings: m.litWings ? [...m.litWings] : null,
    dust: m.dust,
  }
}

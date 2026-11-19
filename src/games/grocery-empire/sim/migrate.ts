import { DAILY_RULE_ORDER, type DailyRuleId } from './balance'
import { normalizeBuildVariants } from '../content/builds'
import { CATEGORY_IDS, type CategoryId } from '../content/categories'
import {
  emptyBlockEvent,
  emptyCooler,
  emptyDepth,
  emptyDispatch,
  emptyFlagship,
  emptyHearing,
  emptyLeadsOnBoard,
  emptyPractice,
  emptyRegulars,
  emptyShifts,
  isManifestStance,
  PRACTICE_LAYERS,
  type ManifestStance,
  type BlockEventKind,
  type DepthInvoice,
  type DepthState,
  type DeptRuntime,
  type FlyerDiscount,
  type FlyerPromise,
} from '../content/depth'
import { MENU_IDS } from '../content/menus'
import {
  CLAUSE_BY_ID,
  emptyHorizon,
  PLANET_BY_ID,
  SEASON_CHORES,
  SKU_BY_ID,
  type HorizonState,
  type LastLine,
  type StopPersonality,
} from '../content/horizon'
import { COMPUTE, DEPTH, FLEET, HISTORY, HORIZON, SAVE_VERSION, VISITOR } from './balance'
import { log, skipOpeningDialogue } from './helpers'
import { repair } from './invariants'
import { basketRepEarned, deservedRepEarned, nextRepThreshold } from './reputation'
import {
  createInitialState,
  emptyCold,
  emptyCrime,
  type CrimeState,
  emptyFleet,
  emptyPolitics,
  emptyPrestigeCarry,
  emptyRateAvg,
  emptyStats,
  isRivalKind,
  type GameState,
  type OfflineReceipt,
  type PrestigeMutatorId,
  type Stats,
  cleanStoreName,
} from './state'

const MUTATOR_IDS: readonly PrestigeMutatorId[] = [
  'fasterSpoil',
  'richerYield',
  'weirdElasticity',
  'expensiveAds',
]

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function isStopKind(v: unknown): v is StopPersonality {
  return v === 'spoil' || v === 'tariff' || v === 'delay'
}

function isHabit(v: unknown): v is 'price' | 'stock' | 'route' | 'taste' {
  return v === 'price' || v === 'stock' || v === 'route' || v === 'taste'
}

/** Unique known clause ids, order kept. */
function clauseIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const v of raw) {
    if (typeof v === 'string' && CLAUSE_BY_ID[v] && !out.includes(v)) out.push(v)
  }
  return out
}

function slotSix(raw: unknown): string[] {
  const src = Array.isArray(raw) ? raw : []
  const out: string[] = []
  for (let i = 0; i < 6; i++) {
    const id = str(src[i])
    out.push(SKU_BY_ID[id] ? id : '')
  }
  return out
}

function numRecord(raw: unknown): Record<number, number> {
  const out: Record<number, number> = {}
  if (!isObject(raw)) return out
  for (const [k, v] of Object.entries(raw)) {
    const id = Number(k)
    if (!Number.isInteger(id) || typeof v !== 'number' || !Number.isFinite(v)) continue
    out[id] = v
  }
  return out
}

function boolRecord(raw: unknown): Record<number, boolean> {
  const out: Record<number, boolean> = {}
  if (!isObject(raw)) return out
  for (const [k, v] of Object.entries(raw)) {
    const id = Number(k)
    if (!Number.isInteger(id) || typeof v !== 'boolean') continue
    out[id] = v
  }
  return out
}

/** v8 horizon slice. Missing saves get an empty layer; partial objects keep what is safe. */
function mergeHorizon(raw: unknown): HorizonState {
  const base = emptyHorizon()
  if (!isObject(raw)) return base
  const h = raw
  base.continued = bool(h.continued, false)
  base.unsealed = bool(h.unsealed, false)
  base.survey = Math.max(0, num(h.survey, 0))
  base.probes = Math.max(0, Math.floor(num(h.probes, 0)))
  base.freight = Math.max(0, num(h.freight, 0))
  base.seed = Math.max(0, num(h.seed, 0))
  base.season = ([0, 1, 2, 3].includes(num(h.season, 0)) ? num(h.season, 0) : 0) as HorizonState['season']
  base.seasonT = Math.max(0, num(h.seasonT, 0))
  base.seasonsSeen = Math.max(0, Math.floor(num(h.seasonsSeen, 0)))
  base.weakYears = Math.max(0, Math.floor(num(h.weakYears, 0)))
  base.seasonHandSaves = Math.max(0, Math.floor(num(h.seasonHandSaves, 0)))
  base.namedBest = Math.max(0, Math.min(1, num(h.namedBest, 0)))
  base.perfectPhrases = Math.max(0, Math.floor(num(h.perfectPhrases, 0)))
  base.phraseHabitMatch = bool(h.phraseHabitMatch, false)
  base.listMutations = Math.max(0, Math.floor(num(h.listMutations, 0)))
  base.minutesAmends = Math.max(0, Math.floor(num(h.minutesAmends, 0)))
  base.hearingClause = typeof h.hearingClause === 'string' ? h.hearingClause : null
  base.seasonChore = typeof h.seasonChore === 'string' ? (h.seasonChore as HorizonState['seasonChore']) : null
  base.climateServed = Math.max(0, Math.floor(num(h.climateServed, 0)))
  base.nextClimateAt = Math.max(0, num(h.nextClimateAt, 0))
  base.climateGuest =
    typeof h.climateGuest === 'string' ? (h.climateGuest as HorizonState['climateGuest']) : null
  base.settlements = Math.max(0, Math.floor(num(h.settlements, 0)))
  base.settlementUntil = Math.max(0, num(h.settlementUntil, 0))
  // SAVE 34: pending stop personality + season bed lock. Pre-34 saves start clear.
  const pend = h.pendingStop
  base.pendingStop =
    isObject(pend) && isStopKind(pend.kind)
      ? { index: Math.max(0, Math.floor(num(pend.index, 0))), kind: pend.kind }
      : null
  base.bedLockedChore =
    typeof h.bedLockedChore === 'string' && (SEASON_CHORES as readonly string[]).includes(h.bedLockedChore)
      ? (h.bedLockedChore as HorizonState['bedLockedChore'])
      : null
  base.haulsDone = Math.max(0, Math.floor(num(h.haulsDone, 0)))
  base.haulUntil = Math.max(0, num(h.haulUntil, 0))
  base.watchedPhrases = Math.max(0, Math.floor(num(h.watchedPhrases, 0)))
  base.watchUntil = Math.max(0, num(h.watchUntil, 0))
  base.seatingsDone = Math.max(0, Math.floor(num(h.seatingsDone, 0)))
  base.seatingUntil = Math.max(0, num(h.seatingUntil, 0))
  base.seatingGapUntil = Math.max(0, num(h.seatingGapUntil, 0))
  // SAVE 35: posted habit, seated / heard / amended clauses, rehearsal scratch. Pre-35 saves start clear.
  const posted = h.postedHabit
  base.postedHabit =
    isObject(posted) && isHabit(posted.habit)
      ? {
          habit: posted.habit,
          until: Math.max(0, num(posted.until, 0)),
          agentId: Number.isInteger(posted.agentId) ? (posted.agentId as number) : null,
        }
      : null
  base.seatingClause = typeof h.seatingClause === 'string' && CLAUSE_BY_ID[h.seatingClause] ? h.seatingClause : null
  base.seatedClauses = clauseIds(h.seatedClauses)
  base.heardClauses = clauseIds(h.heardClauses)
  base.amendedClauses = clauseIds(h.amendedClauses)
  base.rehearsalScratch = Number.isInteger(h.rehearsalScratch) ? Math.max(-1, h.rehearsalScratch as number) : -1
  // SAVE 36: the endless mutation's ban. Pre-36 saves start clear; junk or an unknown id is dropped.
  const ban = h.endlessBan
  base.endlessBan =
    isObject(ban) &&
    ((ban.kind === 'clause' && typeof ban.id === 'string' && !!CLAUSE_BY_ID[ban.id]) ||
      (ban.kind === 'ventureFork' && typeof ban.id === 'string' && ban.id.length > 0))
      ? { kind: ban.kind as 'clause' | 'ventureFork', id: ban.id as string }
      : null
  base.acceptRehearsal = bool(h.acceptRehearsal, false)
  base.acceptRehearsalUntil = Math.max(0, num(h.acceptRehearsalUntil, 0))
  base.signal = Math.max(0, num(h.signal, 0))
  base.phrasesCleared = Math.max(0, Math.floor(num(h.phrasesCleared, 0)))
  base.seal = Math.max(0, num(h.seal, 0))
  base.embassies = Math.max(0, Math.floor(num(h.embassies, 0)))
  base.greenhouses = Math.max(0, Math.floor(num(h.greenhouses, 0)))
  base.relays = Math.max(0, Math.floor(num(h.relays, 0)))
  base.clauseToggles = Math.max(0, Math.floor(num(h.clauseToggles, 0)))
  base.listScore = Math.max(0, num(h.listScore, 0))
  base.endless = bool(h.endless, false)
  base.endlessPlanets = Math.max(0, Math.floor(num(h.endlessPlanets, 0)))
  base.headlineUntil = Math.max(0, num(h.headlineUntil, 0))
  base.socketsUnlocked = Math.max(0, Math.floor(num(h.socketsUnlocked, 3)))
  base.nextPhraseAt = Math.max(0, num(h.nextPhraseAt, 0))
  base.nextHeadlineAt = Math.max(0, num(h.nextHeadlineAt, 0))
  base.nextKeelAt = Math.max(0, num(h.nextKeelAt, 0))
  base.buildQueue = typeof h.buildQueue === 'string' && h.buildQueue ? h.buildQueue : null
  base.headlineId = typeof h.headlineId === 'string' ? h.headlineId : null
  base.ending = h.ending === 'accept' || h.ending === 'reject' ? h.ending : null
  base.charter = h.charter === 'standard' || h.charter === 'boutique' || h.charter === 'coop' ? h.charter : null
  base.taster = h.taster === 'quality' || h.taster === 'volume' ? h.taster : null
  base.deputy = boolRecord(h.deputy)
  base.deputyAt = numRecord(h.deputyAt)
  base.agentAt = numRecord(h.agentAt)
  if (Array.isArray(h.seenHeadlines)) {
    base.seenHeadlines = h.seenHeadlines.filter((id): id is string => typeof id === 'string').slice(0, 80)
  }
  if (Array.isArray(h.aids)) {
    const kinds = ['tag', 'layer', 'night']
    for (const row of h.aids) {
      if (!isObject(row) || typeof row.planetId !== 'string' || !row.planetId) continue
      if (typeof row.kind !== 'string' || !kinds.includes(row.kind)) continue
      const mul = num(row.mul, 0)
      if (!(mul > 0)) continue
      base.aids.push({
        planetId: row.planetId,
        kind: row.kind as 'tag' | 'layer' | 'night',
        tag: str(row.tag).toLowerCase(),
        mul,
        untilTime: Math.max(0, num(row.untilTime, 0)),
      })
      if (base.aids.length >= 8) break
    }
  }
  if (Array.isArray(h.phraseScores)) {
    base.phraseScores = h.phraseScores
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
      .slice(-8)
  }
  if (Array.isArray(h.clauses)) {
    base.clauses = h.clauses.filter((id): id is string => typeof id === 'string' && !!CLAUSE_BY_ID[id]).slice(0, 4)
  }
  if (isObject(h.cluster)) {
    const policy = h.cluster.policy
    const name = str(h.cluster.name).trim().slice(0, 12)
    if (name && (policy === 'volume' || policy === 'margin' || policy === 'fresh')) {
      base.cluster = { name, policy }
    }
  }
  if (isObject(h.keel)) {
    base.keel = {
      convoys: Math.max(0, Math.floor(num(h.keel.convoys, 0))),
      frozenUntil: Math.max(0, num(h.keel.frozenUntil, 0)),
      bought: bool(h.keel.bought, false),
    }
  }
  if (Array.isArray(h.planets)) {
    for (const row of h.planets) {
      if (!isObject(row) || typeof row.id !== 'string') continue
      if (!PLANET_BY_ID[row.id] && !/^e\d+$/.test(row.id)) continue
      base.planets.push({
        id: row.id,
        revealed: bool(row.revealed, true),
        stocked: bool(row.stocked, false),
        slots: slotSix(row.slots),
        score: Math.max(0, Math.min(1, num(row.score, 0))),
        localPrice: typeof row.localPrice === 'number' && Number.isFinite(row.localPrice) ? row.localPrice : null,
        banTag: typeof row.banTag === 'string' ? row.banTag : null,
        lockedSku: typeof row.lockedSku === 'string' ? row.lockedSku : null,
      })
    }
  }
  const circuitOf = (row: Record<string, unknown>) => ({
    origin: str(row.origin),
    stop: str(row.stop),
    dest: str(row.dest),
    good: str(row.good),
    load: Array.isArray(row.load)
      ? row.load.filter((id): id is string => {
          if (typeof id !== 'string') return false
          if (SKU_BY_ID[id]) return true
          const at = id.indexOf('@')
          if (at < 0) return false
          const sku = id.slice(0, at)
          const size = Number(id.slice(at + 1))
          return !!SKU_BY_ID[sku] && [1, 2, 3].includes(size)
        })
      : [],
    score: Math.max(0, Math.min(1, num(row.score, 0))),
    stopKind: isStopKind(row.stopKind) ? row.stopKind : null,
    settledKind: isStopKind(row.settledKind) ? row.settledKind : null,
  })
  if (Array.isArray(h.circuits)) {
    for (const row of h.circuits) {
      if (!isObject(row)) continue
      base.circuits.push(circuitOf(row))
      if (base.circuits.length >= 6) break
    }
  }
  if (isObject(h.standingRoute)) base.standingRoute = circuitOf(h.standingRoute)
  if (Array.isArray(h.plots)) {
    for (const row of h.plots) {
      if (!isObject(row)) continue
      const traits = ['sweet', 'sturdy', 'pretty', 'lasting', 'rich', 'quiet']
      const trait = (v: unknown) => (typeof v === 'string' && traits.includes(v) ? v : null)
      const child = Array.isArray(row.child)
        ? row.child.filter((id): id is 'sweet' | 'sturdy' | 'pretty' | 'lasting' | 'rich' | 'quiet' => typeof id === 'string' && traits.includes(id)).slice(0, 2)
        : []
      base.plots.push({
        a: trait(row.a) as HorizonState['plots'][number]['a'],
        b: trait(row.b) as HorizonState['plots'][number]['b'],
        child,
        plantedSeason: Math.max(0, Math.floor(num(row.plantedSeason, 0))),
        namedId: typeof row.namedId === 'string' ? row.namedId : null,
      })
      if (base.plots.length >= 16) break
    }
  }
  if (Array.isArray(h.agents)) {
    const habits = ['price', 'stock', 'route', 'taste']
    for (const row of h.agents) {
      if (!isObject(row) || typeof row.name !== 'string') continue
      const habit = habits.includes(str(row.habit)) ? (row.habit as HorizonState['agents'][number]['habit']) : 'price'
      base.agents.push({
        id: Math.max(1, Math.floor(num(row.id, base.agents.length + 1))),
        name: row.name.slice(0, 24),
        habit,
        xp: Math.max(0, num(row.xp, 0)),
      })
      if (base.agents.length >= 8) break
    }
  }
  if (Array.isArray(h.agentLog)) {
    base.agentLog = h.agentLog.filter((line): line is string => typeof line === 'string' && line.length > 0).slice(-8)
  }
  if (isObject(h.phrase) && Array.isArray(h.phrase.symbols) && Array.isArray(h.phrase.revealed)) {
    const symbols = h.phrase.symbols.map((id) => str(id)).slice(0, 4)
    const revealed = h.phrase.revealed.map((n) => Math.floor(num(n, 0))).slice(0, 2)
    if (symbols.length === 4 && revealed.length === 2 && typeof h.phrase.planetId === 'string') {
      base.phrase = {
        symbols: [symbols[0] ?? '', symbols[1] ?? '', symbols[2] ?? '', symbols[3] ?? ''],
        revealed: [revealed[0] ?? 0, revealed[1] ?? 1],
        planetId: h.phrase.planetId,
        nightOnly: bool(h.phrase.nightOnly, false),
        habit:
          h.phrase.habit === 'price' ||
          h.phrase.habit === 'stock' ||
          h.phrase.habit === 'route' ||
          h.phrase.habit === 'taste'
            ? h.phrase.habit
            : undefined,
      }
    }
  }
  if (Array.isArray(h.list)) {
    const kinds = ['shelf', 'route', 'crop', 'phrase', 'clause']
    const lines: LastLine[] = []
    for (const row of h.list) {
      if (!isObject(row) || !kinds.includes(str(row.kind))) continue
      lines.push({
        kind: row.kind as LastLine['kind'],
        want: str(row.want),
        filled: str(row.filled),
        score: Math.max(0, Math.min(1, num(row.score, 0))),
      })
    }
    if (lines.length === 5) base.list = lines as NonNullable<HorizonState['list']>
  }
  return base
}

/** v13+ depth slice. Missing saves get emptyDepth(); partial objects keep what is safe. */
function mergeDepth(raw: unknown): DepthState {
  const base = emptyDepth()
  if (!isObject(raw)) return base
  if (isObject(raw.facings)) {
    const facings: DepthState['facings'] = {}
    for (const c of CATEGORY_IDS) {
      const id = raw.facings[c]
      if (typeof id === 'string' && id) facings[c as CategoryId] = id
    }
    base.facings = facings
  }
  if (isObject(raw.departments)) {
    for (const [id, slot] of Object.entries(raw.departments)) {
      if (!isObject(slot)) continue
      const next: DeptRuntime = {
        leadId: typeof slot.leadId === 'number' && Number.isFinite(slot.leadId) ? slot.leadId : null,
        specialistIds: Array.isArray(slot.specialistIds)
          ? slot.specialistIds.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
          : [],
        policy: typeof slot.policy === 'string' ? slot.policy : null,
      }
      base.departments[id] = next
    }
  }
  if (isObject(raw.contracts)) {
    for (const [id, on] of Object.entries(raw.contracts)) {
      if (typeof on === 'boolean') base.contracts[id] = on
    }
  }
  if (isObject(raw.placeTraits)) {
    for (const [id, trait] of Object.entries(raw.placeTraits)) {
      if (typeof trait === 'string') base.placeTraits[id] = trait
    }
  }
  base.open = bool(raw.open, true)
  base.marketBellDipAt = Math.max(0, num(raw.marketBellDipAt, 0))
  base.marketBellDips = Math.max(0, Math.floor(num(raw.marketBellDips, 0)))
  // Legacy saves: one recorded dip timestamp counts as one dip.
  if (base.marketBellDips <= 0 && base.marketBellDipAt > 0) base.marketBellDips = 1
  base.stars = Math.max(
    DEPTH.starsMin,
    Math.min(DEPTH.starsMax, num(raw.stars, DEPTH.starsStart)),
  )
  base.regularSatisfied = Math.max(0, Math.floor(num(raw.regularSatisfied, 0)))
  base.layawaySlips = Math.max(0, Math.floor(num(raw.layawaySlips, 0)))
  base.regularMissUntil = Math.max(0, num(raw.regularMissUntil, 0))
  base.nextInvoiceId = Math.max(1, Math.floor(num(raw.nextInvoiceId, 1)))
  base.invoicesOnTime = Math.max(0, Math.floor(num(raw.invoicesOnTime, 0)))
  // SAVE 39: auto-pay invoices; older saves get it on so the chore goes away.
  base.autoPayInvoices = typeof raw.autoPayInvoices === 'boolean' ? raw.autoPayInvoices : true
  // SAVE 40: auto dock check-in (only acts once the check-in gate is earned).
  base.autoDock = typeof raw.autoDock === 'boolean' ? raw.autoDock : true
  base.dockCheckIns = Math.max(0, Math.floor(num(raw.dockCheckIns, 0)))
  base.nextDockAt = Math.max(0, num(raw.nextDockAt, 0))
  base.lastDockAisle = typeof raw.lastDockAisle === 'string' ? raw.lastDockAisle : null
  if (raw.produceGrade === 'good' || raw.produceGrade === 'bruised') {
    base.produceGrade = raw.produceGrade
  } else {
    base.produceGrade = null
  }
  if (isObject(raw.regulars)) {
    const seen: Record<string, number> = {}
    if (isObject(raw.regulars.seen)) {
      for (const [id, n] of Object.entries(raw.regulars.seen)) {
        if (typeof n === 'number' && Number.isFinite(n)) seen[id] = Math.max(0, Math.floor(n))
      }
    }
    base.regulars = {
      activeId: typeof raw.regulars.activeId === 'string' ? raw.regulars.activeId : null,
      arrivesAt: Math.max(0, num(raw.regulars.arrivesAt, 0)),
      patienceUntil: Math.max(0, num(raw.regulars.patienceUntil, 0)),
      seen,
      layaway: bool(raw.regulars.layaway, false),
      waitingId: typeof raw.regulars.waitingId === 'string' ? raw.regulars.waitingId : null,
      waitingPatienceUntil: Math.max(0, num(raw.regulars.waitingPatienceUntil, 0)),
      waitingLayaway: bool(raw.regulars.waitingLayaway, false),
    }
    // A waiting shopper needs a primary and must be a different person.
    if (
      base.regulars.waitingId &&
      (!base.regulars.activeId || base.regulars.waitingId === base.regulars.activeId)
    ) {
      base.regulars.waitingId = null
      base.regulars.waitingPatienceUntil = 0
      base.regulars.waitingLayaway = false
    }
  } else {
    base.regulars = emptyRegulars()
  }
  if (isObject(raw.shifts)) {
    const ids = (v: unknown) =>
      Array.isArray(v)
        ? v.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
        : []
    base.shifts = {
      open: ids(raw.shifts.open),
      mid: ids(raw.shifts.mid),
      close: ids(raw.shifts.close),
      daysCoveredOpen: Math.max(0, Math.floor(num(raw.shifts.daysCoveredOpen, 0))),
      daysCoveredMidOrbit: Math.max(0, Math.floor(num(raw.shifts.daysCoveredMidOrbit, 0))),
      lastRolloverDay: Math.max(0, Math.floor(num(raw.shifts.lastRolloverDay, 0))),
    }
  } else {
    base.shifts = emptyShifts()
  }
  if (Array.isArray(raw.invoices)) {
    const invoices: DepthInvoice[] = []
    for (const inv of raw.invoices) {
      if (!isObject(inv)) continue
      const cat = inv.cat
      if (typeof cat !== 'string' || !CATEGORY_IDS.includes(cat as CategoryId)) continue
      invoices.push({
        id: Math.max(0, Math.floor(num(inv.id, 0))),
        cat: cat as CategoryId,
        amount: Math.max(0, num(inv.amount, 0)),
        dueAt: Math.max(0, num(inv.dueAt, 0)),
        paid: bool(inv.paid, false),
        onTime: bool(inv.onTime, false),
      })
    }
    base.invoices = invoices
  } else {
    base.invoices = []
  }
  if (isObject(raw.flagship)) {
    const slots = Array.isArray(raw.flagship.slots)
      ? (raw.flagship.slots as unknown[]).map((x) => (typeof x === 'string' ? x : '')).slice(0, DEPTH.flagshipSlots)
      : []
    while (slots.length < DEPTH.flagshipSlots) slots.push('')
    base.flagship = {
      slots,
      score: Math.max(0, Math.min(1, num(raw.flagship.score, 0))),
      filings: Math.max(0, Math.floor(num(raw.flagship.filings, 0))),
      practiceLeft: Math.max(0, Math.floor(num(raw.flagship.practiceLeft, DEPTH.flagshipPracticePerEra))),
      credited: bool(raw.flagship.credited, false),
      chainCredited: bool(raw.flagship.chainCredited, false),
      globeCredited: bool(raw.flagship.globeCredited, false),
    }
  } else {
    base.flagship = emptyFlagship()
  }
  base.writeOffAt = Math.max(0, num(raw.writeOffAt, 0))
  base.writeOffs = Math.max(0, Math.floor(num(raw.writeOffs, 0)))
  base.promotions = Math.max(0, Math.floor(num(raw.promotions, 0)))
  base.circularsRun = Math.max(0, Math.floor(num(raw.circularsRun, 0)))
  base.flyerWeeks = Math.max(0, Math.floor(num(raw.flyerWeeks, 0)))
  // Legacy circulars count toward flyer weeks so old saves aren't soft-locked.
  if (base.flyerWeeks <= 0 && base.circularsRun > 0) {
    base.flyerWeeks = Math.min(DEPTH.flyerWeeksNeed, base.circularsRun)
  }
  base.hotTraitWalks = Math.max(0, Math.floor(num(raw.hotTraitWalks, 0)))
  base.counterFlyerNeeded = bool(raw.counterFlyerNeeded, false)
  base.counterFlyerAt = Math.max(0, num(raw.counterFlyerAt, 0))
  base.blockEventAt = Math.max(0, num(raw.blockEventAt, 0))
  if (isObject(raw.flyer) && Array.isArray(raw.flyer.aisles)) {
    const aisles = (raw.flyer.aisles as unknown[])
      .filter((c): c is CategoryId => typeof c === 'string' && CATEGORY_IDS.includes(c as CategoryId))
      .slice(0, 3)
    const discount: FlyerDiscount =
      raw.flyer.discount === 'mid' || raw.flyer.discount === 'deep' ? raw.flyer.discount : 'soft'
    const promise: FlyerPromise = raw.flyer.promise === 'facing' ? 'facing' : 'hours'
    base.flyer =
      aisles.length >= 2
        ? {
            aisles,
            discount,
            promise,
            until: Math.max(0, num(raw.flyer.until, 0)),
            weeksCompleted: Math.max(0, Math.floor(num(raw.flyer.weeksCompleted, 0))),
            cooldownUntil: Math.max(0, num(raw.flyer.cooldownUntil, 0)),
            bandHeld: bool(raw.flyer.bandHeld, true),
          }
        : null
  } else {
    base.flyer = null
  }
  if (isObject(raw.blockEvent)) {
    const kindRaw = raw.blockEvent.kind
    const kind: BlockEventKind | null =
      kindRaw === 'parade' || kindRaw === 'payday' || kindRaw === 'rain' ? kindRaw : null
    base.blockEvent = {
      kind,
      until: Math.max(0, num(raw.blockEvent.until, 0)),
      traitBias: typeof raw.blockEvent.traitBias === 'string' ? raw.blockEvent.traitBias : null,
    }
  } else {
    base.blockEvent = emptyBlockEvent()
  }
  base.rivalLockAt = Math.max(0, num(raw.rivalLockAt, 0))
  base.brownoutDrillAt = Math.max(0, num(raw.brownoutDrillAt, 0))
  base.drillsRun = Math.max(0, Math.floor(num(raw.drillsRun, 0)))
  if (isObject(raw.cooler)) {
    base.cooler = {
      logsSigned: Math.max(0, Math.floor(num(raw.cooler.logsSigned, 0))),
      nextDueAt: Math.max(0, num(raw.cooler.nextDueAt, 0)),
      missed: Math.max(0, Math.floor(num(raw.cooler.missed, 0))),
      lastSignedAt: Math.max(0, num(raw.cooler.lastSignedAt, 0)),
    }
  } else {
    base.cooler = emptyCooler()
  }
  if (isObject(raw.leadsOnBoard)) {
    base.leadsOnBoard = {
      fresh: bool(raw.leadsOnBoard.fresh, false),
      cold: bool(raw.leadsOnBoard.cold, false),
    }
  } else {
    base.leadsOnBoard = emptyLeadsOnBoard()
  }
  if (isObject(raw.dispatch)) {
    base.dispatch = {
      cleanManifests: Math.max(0, Math.floor(num(raw.dispatch.cleanManifests, 0))),
      lastCycleAt: Math.max(0, num(raw.dispatch.lastCycleAt, 0)),
      // SAVE 33: separate clean clock. Pre-33 saves credited clean + exam on one swear, so seed it
      // from the exam clock instead of handing out a free early clean.
      lastCleanAt: Math.max(0, num(raw.dispatch.lastCleanAt, num(raw.dispatch.lastCycleAt, 0))),
      laneStances: sanitizeLaneStances(raw.dispatch.laneStances),
      fastFiled: Math.max(0, Math.floor(num(raw.dispatch.fastFiled, 0))),
      examLaneId: typeof raw.dispatch.examLaneId === 'string' ? raw.dispatch.examLaneId : null,
      examMix: typeof raw.dispatch.examMix === 'string' ? raw.dispatch.examMix : null,
      examUntil: Math.max(0, num(raw.dispatch.examUntil, 0)),
      examsHeld: Math.max(0, Math.floor(num(raw.dispatch.examsHeld, 0))),
    }
  } else {
    base.dispatch = emptyDispatch()
  }
  base.manifestsRun = Math.max(0, Math.floor(num(raw.manifestsRun, 0)))
  base.defectionsHandled = Math.max(0, Math.floor(num(raw.defectionsHandled, 0)))
  base.megaMartUntil = Math.max(0, num(raw.megaMartUntil, 0))
  base.megaMartTarget = typeof raw.megaMartTarget === 'string' ? raw.megaMartTarget : null
  base.orbitMidOnce = bool(raw.orbitMidOnce, false)
  base.surveyShiftOnce = bool(raw.surveyShiftOnce, false)
  base.lastStandardFileAt = Math.max(0, num(raw.lastStandardFileAt, 0))
  if (isObject(raw.practice)) {
    const practice = emptyPractice()
    for (const layer of PRACTICE_LAYERS) {
      const row = raw.practice[layer]
      if (isObject(row)) {
        practice[layer] = {
          left: Math.max(0, Math.floor(num(row.left, HORIZON.practicePerLayer))),
          credited: Math.max(0, Math.floor(num(row.credited, 0))),
        }
      }
    }
    base.practice = practice
  } else {
    base.practice = emptyPractice()
  }
  base.starsFrozenAt =
    typeof raw.starsFrozenAt === 'number' && Number.isFinite(raw.starsFrozenAt)
      ? Math.max(DEPTH.starsMin, Math.min(DEPTH.starsMax, raw.starsFrozenAt))
      : null
  base.rationWeekUntil = Math.max(0, num(raw.rationWeekUntil, 0))
  base.ledgerStamps = Math.max(0, Math.floor(num(raw.ledgerStamps, 0)))
  base.lastLedgerDay = Math.floor(num(raw.lastLedgerDay, -1))
  base.berthTurnarounds = Math.max(0, Math.floor(num(raw.berthTurnarounds, 0)))
  base.stewardId =
    typeof raw.stewardId === 'number' && Number.isFinite(raw.stewardId) ? raw.stewardId : null
  base.stewardKept = bool(raw.stewardKept, false)
  base.driftLockPlanet = typeof raw.driftLockPlanet === 'string' ? raw.driftLockPlanet : null
  base.stolenBay = Math.floor(num(raw.stolenBay, -1))
  base.stolenBayCircuit = Math.floor(num(raw.stolenBayCircuit, -1))
  base.verdantTrait = typeof raw.verdantTrait === 'string' ? raw.verdantTrait : null
  base.jammedSymbol = typeof raw.jammedSymbol === 'string' ? raw.jammedSymbol : null
  base.hearingAnswered = bool(raw.hearingAnswered, false)
  if (isObject(raw.hearing)) {
    const neededRaw = Math.floor(num(raw.hearing.needed, HORIZON.hearingNeededMax))
    const needed: 2 | 3 = neededRaw <= 2 ? 2 : 3
    base.hearing = {
      sessions: Math.max(0, Math.floor(num(raw.hearing.sessions, 0))),
      needed,
      answered: Math.max(0, Math.floor(num(raw.hearing.answered, 0))),
      pendingClause: typeof raw.hearing.pendingClause === 'string' ? raw.hearing.pendingClause : null,
    }
    if (base.hearingAnswered && base.hearing.answered < base.hearing.needed) {
      base.hearing.answered = base.hearing.needed
    }
  } else {
    base.hearing = emptyHearing(base.hearingAnswered ? 2 : 3)
    if (base.hearingAnswered) base.hearing.answered = base.hearing.needed
  }
  base.hearingAnswered = base.hearing.answered >= base.hearing.needed
  base.rationLine = Math.floor(num(raw.rationLine, -1))
  base.hzRivalAt = Math.max(0, num(raw.hzRivalAt, 0))
  base.blastSuppressesTunnelUntilLog = bool(raw.blastSuppressesTunnelUntilLog, false)
  // SAVE 34: climate guest facing ban. Pre-34 saves start clear.
  const ban = raw.climateFacingBan
  base.climateFacingBan =
    isObject(ban) &&
    typeof ban.tag === 'string' &&
    typeof ban.cat === 'string' &&
    CATEGORY_IDS.includes(ban.cat as CategoryId)
      ? { tag: ban.tag, cat: ban.cat as CategoryId, until: Math.max(0, num(ban.until, 0)) }
      : null
  if (isObject(raw.deptEverStaffed)) {
    for (const [id, on] of Object.entries(raw.deptEverStaffed)) {
      if (typeof on === 'boolean') base.deptEverStaffed[id] = on
    }
  }
  if (isObject(raw.manifests)) {
    for (const [id, mix] of Object.entries(raw.manifests)) {
      if (typeof mix === 'string' && CATEGORY_IDS.includes(mix as CategoryId)) {
        base.manifests[id] = mix as CategoryId
      }
    }
  }
  if (isObject(raw.driftWar)) {
    const step = Math.floor(num(raw.driftWar.step, 0))
    base.driftWar = { step: (step <= 0 ? 0 : step >= 3 ? 3 : step) as 0 | 1 | 2 | 3 }
  }
  if (typeof raw.rivalLockCat === 'string' && CATEGORY_IDS.includes(raw.rivalLockCat as CategoryId)) {
    base.rivalLockCat = raw.rivalLockCat as CategoryId
  } else {
    base.rivalLockCat = null
  }
  if (isObject(raw.circular) && Array.isArray(raw.circular.aisles)) {
    const aisles = (raw.circular.aisles as unknown[])
      .filter((c): c is CategoryId => typeof c === 'string' && CATEGORY_IDS.includes(c as CategoryId))
      .slice(0, 2)
    const until = num(raw.circular.until, 0)
    base.circular = aisles.length === 2 ? { aisles: aisles as CategoryId[], until } : null
  } else {
    base.circular = null
  }
  return base
}

/** SAVE 33: keep only well-formed lane → stance rows. */
function sanitizeLaneStances(raw: unknown): Record<string, ManifestStance> {
  const out: Record<string, ManifestStance> = {}
  if (!isObject(raw)) return out
  for (const [laneId, stance] of Object.entries(raw)) {
    if (isManifestStance(stance)) out[laneId] = stance
  }
  return out
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function num(v: unknown, fallback: number) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/** Copy an optional object slice; missing/invalid raw uses `fallback` (never wipe with undefined). */
export function migrateSlice<T extends object>(
  raw: unknown,
  fallback: T,
  copy: (rawObj: Record<string, unknown>, fb: T) => T,
): T {
  if (!isObject(raw)) return fallback
  return copy(raw, fallback)
}

function bool(v: unknown, fallback: boolean) {
  return typeof v === 'boolean' ? v : fallback
}

function mergeStats(raw: unknown, base: Stats): Stats {
  if (!isObject(raw)) return base
  const out = { ...base }
  for (const k of Object.keys(base) as (keyof Stats)[]) {
    if (k === 'eraAt') {
      // SAVE 41: era start times; older saves only know Era 0 began at 0.
      const arr = Array.isArray(raw.eraAt) ? raw.eraAt : [0]
      out.eraAt = arr.map((v) => Math.max(0, num(v, 0)))
      continue
    }
    if (k === 'soldByCat' || k === 'revenueByCat' || k === 'spoiledByCat') {
      const nested = isObject(raw[k]) ? raw[k] : {}
      for (const c of CATEGORY_IDS) {
        out[k][c] = num((nested as Record<string, unknown>)[c], 0)
      }
      continue
    }
    ;(out as unknown as Record<string, number>)[k] = num(raw[k], base[k] as number)
  }
  return out
}

function resetNote(s: GameState, why: string) {
  log(s, why, 'warn')
  return repair(s)
}

/**
 * NEVER throws. Accepts unknown. Version &lt; 2 or unrecognizable → fresh state
 * with a ledger note, or best-effort field merge when the shape is close.
 */
export function migrate(raw: unknown, now = Date.now()): GameState {
  try {
    if (!isObject(raw)) {
      return resetNote(createInitialState(undefined, now), 'Save missing or unreadable — started a fresh counter.')
    }

    const version = num(raw.version, 0)
    if (version < 2) {
      // Best-effort: if it already looks like v2 shape (has shelf batches), merge.
      if (!Array.isArray(raw.shelf) || !isObject(raw.stats) || !isObject(raw.compute)) {
        return resetNote(
          createInitialState(num(raw.seed, now % 2147483647), now),
          'Old save (pre-v2) was reset. The counter opens again.',
        )
      }
    }

    const seed = Math.max(1, Math.floor(num(raw.seed, now % 2147483647)))
    const base = createInitialState(seed, now)

    try {
      base.rng = Math.floor(num(raw.rng, seed)) || seed
      base.time = Math.max(0, num(raw.time, 0))
      base.createdAt = num(raw.createdAt, now)
      base.lastSavedAt = num(raw.lastSavedAt, now)
      base.paused = bool(raw.paused, false)
      base.speed = 1 // speed-ups were removed; every save runs at 1×
      base.era = Math.max(0, Math.floor(num(raw.era, 0)))

      base.baskets = Math.max(0, num(raw.baskets, 0))
      base.cash = Math.max(0, num(raw.cash, base.cash))
      base.lifetimeRevenue = Math.max(0, num(raw.lifetimeRevenue, 0))
      base.arrears = Math.max(0, num(raw.arrears, 0))
      base.arrearsForgiven = Math.max(0, num(raw.arrearsForgiven, 0))
      if (isObject(raw.debt)) {
        base.debt.owed = Math.max(0, num(raw.debt.owed, 0))
        base.debt.taken = Math.max(0, num(raw.debt.taken, 0))
      }
      base.price = num(raw.price, base.price)

      if (isObject(raw.categories)) {
        for (const c of CATEGORY_IDS) base.categories[c] = bool(raw.categories[c], c === 'cans')
      }
      if (isObject(raw.mix)) {
        for (const c of CATEGORY_IDS) base.mix[c] = num(raw.mix[c], base.mix[c])
      }
      if (typeof raw.orderCat === 'string' && CATEGORY_IDS.includes(raw.orderCat as (typeof CATEGORY_IDS)[number])) {
        base.orderCat = raw.orderCat as GameState['orderCat']
      }

      if (Array.isArray(raw.shelf)) base.shelf = raw.shelf as GameState['shelf']
      if (Array.isArray(raw.backroom)) base.backroom = raw.backroom as GameState['backroom']
      if (Array.isArray(raw.orders)) base.orders = raw.orders as GameState['orders']
      base.nextOrderId = Math.max(1, Math.floor(num(raw.nextOrderId, 1)))

      if (isObject(raw.wholesale)) {
        base.wholesale = {
          index: num(raw.wholesale.index, base.wholesale.index),
          phase: num(raw.wholesale.phase, 0),
          drift: num(raw.wholesale.drift, 1),
          idleSec: num(raw.wholesale.idleSec, 0),
          history: Array.isArray(raw.wholesale.history)
            ? (raw.wholesale.history as unknown[])
                .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
                .slice(-HISTORY.keep)
            : [],
          tipIndex: num(raw.wholesale.tipIndex, num(raw.wholesale.index, base.wholesale.index)),
        }
      }
      base.supplier = raw.supplier === 'b' ? 'b' : 'a'
      if (isObject(raw.autoRestock)) {
        base.autoRestock.enabled = bool(raw.autoRestock.enabled, false)
        base.autoRestock.maxCost = num(raw.autoRestock.maxCost, base.autoRestock.maxCost)
        base.autoRestock.minUnits = num(raw.autoRestock.minUnits, base.autoRestock.minUnits)
      }

      base.ads = Math.max(1, Math.floor(num(raw.ads, 1)))
      base.adCost = Math.max(1, num(raw.adCost, 20))
      base.lastAdAt = num(raw.lastAdAt, -1)
      base.lastAdSpend = num(raw.lastAdSpend, 0)
      {
        const posture = raw.marketingPosture
        base.marketingPosture =
          posture === 'circular' || posture === 'houseBrand' || posture === 'neighborhood'
            ? posture
            : 'neighborhood'
      }
      base.priceLockUntil = Math.max(0, num(raw.priceLockUntil, 0))
      base.priceLockIndex = Math.max(0.01, num(raw.priceLockIndex, base.wholesale.index))
      base.hours = num(raw.hours, 1)
      if (isObject(raw.weather)) {
        const nowW = raw.weather.now
        const nextW = raw.weather.next
        base.weather.now =
          nowW === 'rain' || nowW === 'heat' || nowW === 'cold' || nowW === 'fair' ? nowW : 'fair'
        base.weather.next =
          nextW === 'rain' || nextW === 'heat' || nextW === 'cold' || nextW === 'fair' ? nextW : 'fair'
        base.weather.timer = num(raw.weather.timer, 0)
      }

      if (Array.isArray(raw.staff)) {
        base.staff = raw.staff as GameState['staff']
        for (const member of base.staff) {
          if (member && typeof member.deputy !== 'boolean') delete member.deputy
        }
      }
      base.nextStaffId = Math.max(1, Math.floor(num(raw.nextStaffId, 1)))
      base.morale = num(raw.morale, 1)
      base.pizzaUntil = num(raw.pizzaUntil, 0)
      base.lastPizzaAt = num(raw.lastPizzaAt, -1e9)

      if (isObject(raw.inspection)) {
        base.inspection.meter = num(raw.inspection.meter, 0)
        base.inspection.penaltyUntil = num(raw.inspection.penaltyUntil, 0)
        base.inspection.lastInspectorAt = num(raw.inspection.lastInspectorAt, -1e9)
      }
      if (isObject(raw.loyalty)) {
        base.loyalty.tier = Math.max(0, Math.floor(num(raw.loyalty.tier, 0)))
        base.loyalty.liability = Math.max(0, num(raw.loyalty.liability, 0))
      }
      if (isObject(raw.events) && isObject(raw.events.couponWar)) {
        const cw = raw.events.couponWar
        const rv = isObject(raw.events.rival) ? raw.events.rival : null
        const kind = rv?.kind
        base.events = {
          couponWar: {
            active: bool(cw.active, false),
            endsAt: num(cw.endsAt, 0),
            lastAt: num(cw.lastAt, -1e9),
          },
          rival: {
            kind: isRivalKind(kind) ? kind : null,
            endsAt: Math.max(0, num(rv?.endsAt, 0)),
            lastAt: num(rv?.lastAt, -1e9),
          },
        }
      } else {
        base.events = {
          couponWar: { active: false, endsAt: 0, lastAt: -1e9 },
          rival: { kind: null, endsAt: 0, lastAt: -1e9 },
        }
      }
      if (isObject(raw.campaigns)) {
        base.campaigns = {
          celebrityUntil: Math.max(0, num(raw.campaigns.celebrityUntil, 0)),
        }
      } else {
        base.campaigns = { celebrityUntil: 0 }
      }

      if (isObject(raw.compute)) {
        const c = raw.compute
        base.compute = {
          unlocked: bool(c.unlocked, false),
          analysts: Math.max(1, Math.floor(num(c.analysts, 1))),
          archives: Math.max(1, Math.floor(num(c.archives, 1))),
          attention: Math.max(0, num(c.attention, 0)),
          ideasUnlocked: bool(c.ideasUnlocked, false),
          ideasOn: bool(c.ideasOn, true),
          autoTourney: bool(c.autoTourney, true),
          nextAutoTourneyAt: Math.max(0, num(c.nextAutoTourneyAt, 0)),
          nextTournamentAt: Math.max(0, num(c.nextTournamentAt, 0)),
          ideas: Math.max(0, num(c.ideas, 0)),
          reputation: Math.max(0, Math.floor(num(c.reputation, 2))),
          repEarned: Math.max(0, Math.floor(num(c.repEarned, 2))),
          nextRepAt: Math.max(1, num(c.nextRepAt, base.compute.nextRepAt)),
          fibA: Math.max(1, Math.floor(num(c.fibA, 2))),
          fibB: Math.max(1, Math.floor(num(c.fibB, 3))),
          retrains: Math.max(0, Math.floor(num(c.retrains, 0))),
          perkRespecs: Math.max(0, Math.floor(num(c.perkRespecs, 0))),
          officeMoves: Math.max(0, Math.floor(num(c.officeMoves, 0))),
          scanner: bool(c.scanner, false) || Boolean(raw.memos && (raw.memos as Record<string, number>)['scanner-array']),
          scannerReadyAt: Math.max(0, num(c.scannerReadyAt, 0)),
        }
      }

      if (isObject(raw.memos)) {
        base.memos = raw.memos as Record<string, number>
        // Legacy barometer → weather-radio (Era 1 forecast memo).
        if (base.memos.barometer && !base.memos['weather-radio']) {
          base.memos['weather-radio'] = base.memos.barometer
        }
      }
      if (isObject(raw.memoSeen)) {
        base.memoSeen = raw.memoSeen as Record<string, boolean>
        if (base.memoSeen.barometer && !base.memoSeen['weather-radio']) {
          base.memoSeen['weather-radio'] = true
        }
      }
      if (isObject(raw.memoFavorites)) base.memoFavorites = raw.memoFavorites as Record<string, boolean>
      if (isObject(raw.upgrades)) base.upgrades = raw.upgrades as Record<string, number>
      base.upgradeSpend = Math.max(0, num(raw.upgradeSpend, 0))
      if (isObject(raw.builds)) base.builds = { ...base.builds, ...(raw.builds as Record<string, number>) }
      if (isObject(raw.buildVariants)) {
        // Normalize legacy track-only keys (storefront → storefront:2).
        base.buildVariants = normalizeBuildVariants(raw.buildVariants as Record<string, string>)
      } else {
        base.buildVariants = {}
      }
      if (isObject(raw.buildHibernated)) {
        base.buildHibernated = { ...(raw.buildHibernated as Record<string, boolean>) }
      } else {
        base.buildHibernated = {}
      }
      base.endcaps = Math.max(0, Math.floor(num(raw.endcaps, 0)))
      if (isObject(raw.ventures)) {
        base.ventures = raw.ventures as GameState['ventures']
        for (const venture of Object.values(base.ventures)) {
          if (!venture) continue
          if (venture.policy !== 'a' && venture.policy !== 'b') venture.policy = undefined
        }
      }
      if (isObject(raw.passbook)) base.passbook.balance = Math.max(0, num(raw.passbook.balance, 0))
      if (isObject(raw.empire)) {
        base.empire.xp = Math.max(0, num(raw.empire.xp, 0))
        base.empire.level = Math.max(1, Math.floor(num(raw.empire.level, 1)))
        base.empire.points = Math.max(0, Math.floor(num(raw.empire.points, 0)))
        if (isObject(raw.empire.perks)) base.empire.perks = raw.empire.perks as Record<string, number>
      }
      if (isObject(raw.expansions)) base.expansions = raw.expansions as Record<string, boolean>

      // Era 2 fields — deep-merge from createInitialState defaults
      if (Array.isArray(raw.stores)) {
        base.stores = (raw.stores as GameState['stores']).map((st, i) => ({
          id: typeof st?.id === 'string' ? st.id : `s${i + 1}`,
          name: typeof st?.name === 'string' ? st.name : `Store ${i + 1}`,
          level: Math.max(1, Math.floor(num(st?.level, 1))),
          xp: Math.max(0, num(st?.xp, 0)),
          policy:
            st?.policy === 'local' || st?.policy === 'premium' || st?.policy === 'standard'
              ? st.policy
              : 'standard',
          attentionShare: Math.max(0, Math.min(1, num(st?.attentionShare, 0))),
          drift: Math.max(0, Math.min(1, num((st as { drift?: number })?.drift, 0))),
        }))
      }
      base.nextStoreId = Math.max(1, Math.floor(num(raw.nextStoreId, base.stores.length + 1)))
      base.incorporated = bool(raw.incorporated, false)
      base.equity = Math.max(0, num(raw.equity, 0))
      if (isObject(raw.invest)) {
        const risk = raw.invest.risk
        base.invest = {
          unlocked: bool(raw.invest.unlocked, false),
          engineLevel: Math.max(0, Math.floor(num(raw.invest.engineLevel, 0))),
          risk: risk === 'mid' || risk === 'high' || risk === 'low' ? risk : 'low',
          balance: Math.max(0, num(raw.invest.balance, 0)),
          peak: Math.max(0, num(raw.invest.peak, 0)),
          circuitBreaker: bool(raw.invest.circuitBreaker, false),
          tickAcc: Math.max(0, num(raw.invest.tickAcc, 0)),
        }
      }
      base.read = Math.max(0, num(raw.read, 0))
      if (isObject(raw.doctrines)) base.doctrines = raw.doctrines as Record<string, number>
      base.depot = bool(raw.depot, false)
      base.autonomous = bool(raw.autonomous, false)
      {
        const h = typeof raw.autonomousHabit === 'string' ? raw.autonomousHabit : 'balanced'
        base.autonomousHabit =
          h === 'price' || h === 'attention' || h === 'collect' || h === 'balanced' ? h : 'balanced'
      }
      if (isObject(raw.board)) {
        base.board.seats = Math.max(1, Math.floor(num(raw.board.seats, 3)))
        base.board.nextMeetingAt = Math.max(0, num(raw.board.nextMeetingAt, 0))
        base.board.lastResolvedAt = Math.max(0, num(raw.board.lastResolvedAt, 0))
        base.board.pendingAgenda = null
        base.board.expandDiscount = Math.max(0.5, Math.min(1, num(raw.board.expandDiscount, 1)))
        base.board.rndUntil = Math.max(0, num(raw.board.rndUntil, 0))
        base.board.cutHoursUntil = Math.max(0, num(raw.board.cutHoursUntil, 0))
      }
      base.repSpent = Math.max(0, Math.floor(num(raw.repSpent, 0)))

      // Eras 3–6 — merge onto empty defaults
      if (isObject(raw.cold)) {
        const d = emptyCold()
        const c = raw.cold
        const plantN = Math.max(0, Math.floor(num(c.plants, d.plants)))
        let plantList = d.plantList
        if (Array.isArray(c.plantList)) {
          plantList = (c.plantList as unknown[])
            .filter((p): p is Record<string, unknown> => isObject(p))
            .map((p, i) => ({
              id: typeof p.id === 'string' ? p.id : `p${i + 1}`,
              kind:
                p.kind === 'tunnel' || p.kind === 'blast' || p.kind === 'compressor'
                  ? p.kind
                  : ('compressor' as const),
            }))
        } else if (plantN > 0) {
          // v13 → v14: anonymous plants become compressors
          plantList = Array.from({ length: plantN }, (_, i) => ({
            id: `p${i + 1}`,
            kind: 'compressor' as const,
          }))
        }
        const offlineN = Math.max(0, Math.floor(num(c.offline, d.offline)))
        let offlineList = d.offlineList
        if (Array.isArray(c.offlineList)) {
          offlineList = (c.offlineList as unknown[])
            .filter((p): p is Record<string, unknown> => isObject(p))
            .map((p, i) => ({
              id: typeof p.id === 'string' ? p.id : `o${i + 1}`,
              kind:
                p.kind === 'tunnel' || p.kind === 'blast' || p.kind === 'compressor'
                  ? p.kind
                  : ('compressor' as const),
            }))
        } else if (offlineN > 0) {
          offlineList = Array.from({ length: offlineN }, (_, i) => ({
            id: `o${i + 1}`,
            kind: 'compressor' as const,
          }))
        }
        let poweredKinds = d.poweredKinds
        if (Array.isArray(c.poweredKinds)) {
          poweredKinds = (c.poweredKinds as unknown[])
            .filter((k): k is 'compressor' | 'tunnel' | 'blast' =>
              k === 'compressor' || k === 'tunnel' || k === 'blast',
            )
            .slice(0, DEPTH.plantPowerSlots)
        }
        base.cold = {
          plants: plantList.length,
          plantList,
          poweredKinds,
          tanks: Math.max(0, Math.floor(num(c.tanks, d.tanks))),
          freshness: Math.max(0, num(c.freshness, d.freshness)),
          momentum: Math.max(1, num(c.momentum, d.momentum)),
          surplus: num(c.surplus, d.surplus),
          yieldLeft: Math.max(0, num(c.yieldLeft, d.yieldLeft)),
          yieldMax: Math.max(0, num(c.yieldMax, d.yieldMax)),
          momentumOn: bool(c.momentumOn, d.momentumOn),
          browned: bool(c.browned, d.browned),
          brownouts: Math.max(0, Math.floor(num(c.brownouts, d.brownouts))),
          autoSheds: Math.max(0, Math.floor(num(c.autoSheds, d.autoSheds))),
          offline: offlineList.length,
          offlineList,
          momentumHoldSec: Math.max(0, num(c.momentumHoldSec, d.momentumHoldSec)),
          quadratic: bool(c.quadratic, d.quadratic),
          lastBrownoutLogAt: num(c.lastBrownoutLogAt, d.lastBrownoutLogAt),
          nextPlantId: Math.max(plantList.length + 1, Math.floor(num(c.nextPlantId, plantList.length + 1))),
        }
      }
      if (isObject(raw.politics)) {
        const d = emptyPolitics()
        const p = raw.politics
        const bills = { ...d.bills }
        if (isObject(p.bills)) {
          for (const id of ['hours', 'waste', 'labor', 'tax'] as const) {
            bills[id] = bool(p.bills[id], false)
          }
        }
        base.politics = {
          capital: Math.max(0, num(p.capital, d.capital)),
          lobby: Math.max(0, Math.floor(num(p.lobby, d.lobby))),
          monopolyRisk: Math.max(0, Math.min(1, num(p.monopolyRisk, d.monopolyRisk))),
          acquisitions: Math.max(0, Math.floor(num(p.acquisitions, d.acquisitions))),
          leftRegion: bool(p.leftRegion, d.leftRegion),
          bills,
        }
      }
      base.fuel = Math.max(0, num(raw.fuel, 0))
      base.control = Math.max(0, num(raw.control, 0))
      base.brand = Math.max(0, Math.min(1, num(raw.brand, 1)))
      if (isObject(raw.fleet)) {
        const d = emptyFleet()
        const f = raw.fleet
        const charter = { ...d.charter }
        if (isObject(f.charter)) {
          for (const k of Object.keys(charter)) {
            charter[k] = Math.max(0, Math.floor(num((f.charter as Record<string, unknown>)[k], 0)))
          }
        }
        const lanesN = Math.max(0, Math.floor(num(f.lanes, d.lanes)))
        let laneList = d.laneList
        if (Array.isArray(f.laneList)) {
          laneList = (f.laneList as unknown[])
            .filter((l): l is Record<string, unknown> => isObject(l))
            .map((l, i) => ({
              id: typeof l.id === 'string' ? l.id : `lane-${i + 1}`,
              route: typeof l.route === 'string' ? l.route : 'spice-route',
              fuel: Math.max(0, num(l.fuel, 20)),
            }))
        } else if (lanesN > 0) {
          // v14 → v15: anonymous lanes become generic spice-route slots
          laneList = Array.from({ length: lanesN }, (_, i) => ({
            id: `lane-${i + 1}`,
            route: 'spice-route',
            fuel: 20,
          }))
        }
        const franchisesN = Math.max(0, Math.floor(num(f.franchises, d.franchises)))
        let franchiseList = d.franchiseList
        if (Array.isArray(f.franchiseList)) {
          franchiseList = (f.franchiseList as unknown[])
            .filter((fr): fr is Record<string, unknown> => isObject(fr))
            .map((fr, i) => ({
              id: typeof fr.id === 'string' ? fr.id : `fr-${i + 1}`,
              name: typeof fr.name === 'string' ? fr.name : `Franchise ${i + 1}`,
              loyalty: Math.max(0, Math.min(1, num(fr.loyalty, 0.7))),
              defected: bool(fr.defected, false),
            }))
        } else if (franchisesN > 0) {
          franchiseList = Array.from({ length: franchisesN }, (_, i) => ({
            id: `fr-${i + 1}`,
            name: `Franchise ${i + 1}`,
            loyalty: 0.7,
            defected: false,
          }))
        }
        const bargesN = Math.max(0, Math.floor(num(f.barges, d.barges)))
        let bargeList = d.bargeList
        if (Array.isArray(f.bargeList)) {
          bargeList = (f.bargeList as unknown[])
            .filter((b): b is Record<string, unknown> => isObject(b))
            .map((b, i) => ({
              id: typeof b.id === 'string' ? b.id : `bg-${i + 1}`,
              class:
                b.class === 'replicator' || b.class === 'ark' || b.class === 'hauler'
                  ? b.class
                  : ('hauler' as const),
              ration: typeof b.ration === 'string' ? b.ration : undefined,
            }))
        } else if (bargesN > 0) {
          bargeList = Array.from({ length: bargesN }, (_, i) => ({
            id: `bg-${i + 1}`,
            class: 'hauler' as const,
            ration: d.pockets[i % d.pockets.length]?.ration,
          }))
        }
        let pockets = d.pockets
        if (Array.isArray(f.pockets) && f.pockets.length > 0) {
          pockets = (f.pockets as unknown[])
            .filter((p): p is Record<string, unknown> => isObject(p))
            .map((p, i) => ({
              id: typeof p.id === 'string' ? p.id : `pk${i + 1}`,
              left: Math.max(0, num(p.left, d.pockets[i]?.max ?? FLEET.pocketMax)),
              max: Math.max(0, num(p.max, d.pockets[i]?.max ?? FLEET.pocketMax)),
              ration: typeof p.ration === 'string' ? p.ration : d.pockets[i]?.ration ?? 'grain',
            }))
        } else {
          // Distribute old single biomass bar across pockets
          const oldBio = Math.max(0, num(f.biomass, d.biomass))
          const oldMax = Math.max(oldBio, num(f.biomassMax, d.biomassMax))
          const n = Math.max(1, pockets.length)
          pockets = pockets.map((p, i) => {
            const share = oldBio / n
            const maxShare = oldMax / n
            return { ...p, left: share, max: Math.max(p.max, maxShare) }
          })
        }
        const biomass = pockets.reduce((a, p) => a + p.left, 0)
        const biomassMax = Math.max(
          pockets.reduce((a, p) => a + p.max, 0),
          num(f.biomassMax, biomass),
        )
        base.fleet = {
          barges: bargeList.length,
          launches: Math.max(0, Math.floor(num(f.launches, Math.min(bargesN, 12)))),
          biomass,
          biomassMax,
          pockets,
          bargeList,
          charter,
          charterPool: Math.max(0, Math.floor(num(f.charterPool, d.charterPool))),
          charterCap: Math.max(0, Math.floor(num(f.charterCap, d.charterCap))),
          legacy: Math.max(0, num(f.legacy, d.legacy)),
          warOn: bool(f.warOn, d.warOn),
          guardianUsed: bool(f.guardianUsed, d.guardianUsed),
          lanes: laneList.length,
          laneList,
          franchises: franchiseList.length,
          franchiseList,
          driftWins: Math.max(0, Math.floor(num(f.driftWins, d.driftWins))),
          launched: bool(f.launched, d.launched),
          nextLaneId: Math.max(laneList.length + 1, Math.floor(num(f.nextLaneId, laneList.length + 1))),
          nextFranchiseId: Math.max(
            franchiseList.length + 1,
            Math.floor(num(f.nextFranchiseId, franchiseList.length + 1)),
          ),
          nextBargeId: Math.max(
            bargeList.length + 1,
            Math.floor(num(f.nextBargeId, bargeList.length + 1)),
          ),
          lastManifestAt: num(f.lastManifestAt, -1e9),
          trips: Array.isArray(f.trips)
            ? (f.trips as unknown[])
                .filter((t): t is Record<string, unknown> => isObject(t))
                .map((t) => {
                  const status =
                    t.status === 'enroute' || t.status === 'done' || t.status === 'wasted'
                      ? (t.status as 'enroute' | 'done' | 'wasted')
                      : ('done' as const)
                  return {
                    bargeId: typeof t.bargeId === 'string' ? t.bargeId : '',
                    pocketId: typeof t.pocketId === 'string' ? t.pocketId : '',
                    ration: typeof t.ration === 'string' ? t.ration : 'grain',
                    departAt: Math.max(0, num(t.departAt, 0)),
                    arriveAt: Math.max(0, num(t.arriveAt, 0)),
                    status,
                  }
                })
                .filter((t) => t.bargeId && t.pocketId)
            : [],
        }
      }
      base.endingChoice =
        raw.endingChoice === 'accept' || raw.endingChoice === 'reject' || raw.endingChoice === 'continue'
          ? raw.endingChoice
          : null
      base.depth = mergeDepth(raw.depth)
      base.horizon = mergeHorizon(raw.horizon)
      // Sync Concord docket with legacy horizon.hearingClause.
      if (base.horizon.hearingClause && !base.depth.hearing.pendingClause) {
        base.depth.hearing.pendingClause = base.horizon.hearingClause
        base.depth.hearing.sessions = Math.max(1, base.depth.hearing.sessions)
      } else if (base.depth.hearing.pendingClause && !base.horizon.hearingClause) {
        base.horizon.hearingClause = base.depth.hearing.pendingClause
      }
      base.depth.hearingAnswered = base.depth.hearing.answered >= base.depth.hearing.needed
      if (isObject(raw.offworld)) {
        base.offworld = {
          bay: Array.isArray(raw.offworld.bay)
            ? raw.offworld.bay.filter((id): id is string => typeof id === 'string').slice(0, 12)
            : [],
          sold: Math.max(0, num(raw.offworld.sold, 0)),
        }
      }
      if (isObject(raw.bonded)) {
        base.bonded = {
          crates: Math.max(0, num(raw.bonded.crates, 0)),
          cap: Math.max(0, num(raw.bonded.cap, 8)),
        }
      }
      if (isObject(raw.seedVault)) {
        base.seedVault = {
          held: Math.max(0, num(raw.seedVault.held, 0)),
          cap: Math.max(0, num(raw.seedVault.cap, 20)),
        }
      }
      if (isObject(raw.late)) {
        const broadcasts: Record<string, number> = {}
        if (isObject(raw.late.broadcasts)) {
          for (const [k, v] of Object.entries(raw.late.broadcasts)) {
            if (typeof v === 'number' && v > 0) broadcasts[k] = v
          }
        }
        const instruments: Record<string, number> = {}
        if (isObject(raw.late.instruments)) {
          for (const [k, v] of Object.entries(raw.late.instruments)) {
            if (typeof v === 'number' && v > 0) instruments[k] = Math.min(8, Math.floor(v))
          }
        }
        base.late = {
          broadcasts,
          wireAdsUntil: Math.max(0, num(raw.late.wireAdsUntil, 0)),
          cryoImmuneUntil: Math.max(0, num(raw.late.cryoImmuneUntil, 0)),
          jumpFreightAcc: Math.max(0, num(raw.late.jumpFreightAcc, 0)),
          planetFranchises: Math.max(0, Math.floor(num(raw.late.planetFranchises, 0))),
          futuresUntil: Math.max(0, num(raw.late.futuresUntil, 0)),
          futuresSku: typeof raw.late.futuresSku === 'string' ? raw.late.futuresSku : null,
          scrutiny: Math.min(1, Math.max(0, num(raw.late.scrutiny, 0))),
          instruments,
          unpacked: Math.max(0, Math.floor(num(raw.late.unpacked, 0))),
        }
      }
      base.pendingAccept = bool(raw.pendingAccept, false)
      // 40.0+ optional slices: use migrateSlice (never wipe with undefined).
      base.prestigeCarry = migrateSlice(raw.prestigeCarry, base.prestigeCarry, (rc) => {
        const d = emptyPrestigeCarry()
        const rawMuts = Array.isArray(rc.mutators) ? (rc.mutators as unknown[]) : []
        const mutators = rawMuts
          .filter((id): id is PrestigeMutatorId =>
            typeof id === 'string' && (MUTATOR_IDS as readonly string[]).includes(id),
          )
          .slice(0, 2)
        return {
          appetite: Math.max(0, num(rc.appetite, d.appetite)),
          tipSharpness: Math.max(0, num(rc.tipSharpness, d.tipSharpness)),
          universeIndex: Math.max(0, Math.floor(num(rc.universeIndex, d.universeIndex))),
          mutators,
        }
      })

      if (isObject(raw.rebrand)) {
        base.rebrand = {
          goodwill: Math.max(0, Math.floor(num(raw.rebrand.goodwill, 0))),
          count: Math.max(0, Math.floor(num(raw.rebrand.count, 0))),
          bankedThisRun: Math.max(0, Math.floor(num(raw.rebrand.bankedThisRun, 0))),
        }
      }
      if (isObject(raw.projects)) {
        const done: Record<string, true> = {}
        if (isObject(raw.projects.done)) {
          for (const [k, v] of Object.entries(raw.projects.done)) if (v) done[k] = true
        }
        const active = Array.isArray(raw.projects.active)
          ? (raw.projects.active as unknown[])
              .filter((a): a is { id: string; endsAt: number } =>
                isObject(a) && typeof a.id === 'string' && typeof a.endsAt === 'number',
              )
              .map((a) => ({ id: a.id, endsAt: a.endsAt }))
          : []
        base.projects = { done, active }
      }
      if (isObject(raw.relics)) {
        const rl = raw.relics as {
          wings?: unknown
          count?: unknown
          owned?: unknown
          levels?: unknown
          sockets?: unknown
          litWings?: unknown
          dust?: unknown
          autoDust?: unknown
        }
        const owned: Record<string, number> = {}
        if (isObject(rl.owned)) for (const [k, v] of Object.entries(rl.owned)) owned[k] = Math.max(1, Math.floor(num(v, 1)))
        const levels: Record<string, number> = {}
        if (isObject(rl.levels)) {
          for (const [k, v] of Object.entries(rl.levels)) levels[k] = Math.min(10, Math.max(1, Math.floor(num(v, 1))))
        }
        base.relics = {
          owned,
          levels,
          sockets: Array.isArray(rl.sockets) ? rl.sockets.filter((id): id is string => typeof id === 'string') : [],
          // SAVE 36: lit wings. Pre-36 saves are null (the first `cap` finished wings stay lit).
          litWings: Array.isArray(rl.litWings)
            ? rl.litWings.filter((w, i, a): w is string => typeof w === 'string' && a.indexOf(w) === i)
            : null,
          dust: Math.max(0, Math.floor(num(rl.dust, 0))),
          autoDust: typeof rl.autoDust === 'string' ? rl.autoDust : null,
          wings: Array.isArray(rl.wings) ? rl.wings.filter((w): w is string => typeof w === 'string') : [],
          count: Math.max(0, Math.floor(num(rl.count, 0))),
        }
      }
      if (isObject(raw.rivals)) {
        const rivals: GameState['rivals'] = {}
        for (const [k, v] of Object.entries(raw.rivals)) {
          if (!isObject(v)) continue
          rivals[k] = {
            stores: Math.max(1, Math.floor(num(v.stores, 1))),
            bought: bool(v.bought, false),
            boughtStores: Math.max(0, Math.floor(num(v.boughtStores, 0))),
            nextGrowAt: num(v.nextGrowAt, 0),
            frozenUntil: num(v.frozenUntil, 0),
            warReadyAt: num(v.warReadyAt, 0),
            grown: Math.max(0, Math.floor(num(v.grown, 0))),
            wars: Math.max(0, Math.floor(num(v.wars, 0))),
          }
        }
        base.rivals = rivals
      }

      if (isObject(raw.menus)) {
        for (const id of MENU_IDS) base.menus[id] = bool(raw.menus[id], base.menus[id])
      }
      if (isObject(raw.seenMenus)) base.seenMenus = raw.seenMenus as Record<string, boolean>
      if (isObject(raw.tutorials)) {
        base.tutorials.done = isObject(raw.tutorials.done)
          ? (raw.tutorials.done as Record<string, boolean>)
          : {}
        base.tutorials.queue = Array.isArray(raw.tutorials.queue) ? (raw.tutorials.queue as string[]) : []
        base.tutorials.active = (raw.tutorials.active as GameState['tutorials']['active']) ?? null
        base.tutorials.calmUntil = Math.max(0, num(raw.tutorials.calmUntil, 0))
      } else {
        base.tutorials.calmUntil = 0
      }
      base.menuStamp = Math.max(0, Math.floor(num(raw.menuStamp, 0)))
      base.lastMenu = typeof raw.lastMenu === 'string' && raw.lastMenu ? raw.lastMenu : 'floor'
      if (Array.isArray(raw.chapterQueue)) base.chapterQueue = raw.chapterQueue as number[]

      if (Array.isArray(raw.ledger)) base.ledger = raw.ledger as GameState['ledger']
      base.nextLedgerId = Math.max(1, Math.floor(num(raw.nextLedgerId, 1)))

      if (isObject(raw.recovery)) {
        const legacyHelper = num(
          raw.recovery.lastEmptyShelfAt ?? raw.recovery.lastHelperAt,
          -1e9,
        )
        base.recovery = {
          emptySec: num(raw.recovery.emptySec, 0),
          brokeSec: num(raw.recovery.brokeSec, 0),
          stallSec: num(raw.recovery.stallSec, 0),
          lastEmptyShelfAt: legacyHelper,
          lastBailoutAt: num(raw.recovery.lastBailoutAt, -1e9),
          lastMentorAt: num(raw.recovery.lastMentorAt, -1e9),
          lastInterventionAt: num(raw.recovery.lastInterventionAt, -1e9),
          watchdogTimer: num(raw.recovery.watchdogTimer, 0),
          lastProgress: num(raw.recovery.lastProgress, 0),
        }
      }

      // v37: store name (display only). Older saves simply have none yet.
      base.storeName = cleanStoreName(raw.storeName)

      // v38: daily twist. Only a known rule survives; anything else is a normal run.
      base.dailyRule =
        typeof raw.dailyRule === 'string' && (DAILY_RULE_ORDER as readonly string[]).includes(raw.dailyRule)
          ? (raw.dailyRule as DailyRuleId)
          : null

      if (isObject(raw.tipsSeen)) {
        const seen: Record<string, true> = {}
        for (const [k, v] of Object.entries(raw.tipsSeen)) {
          if (v) seen[k] = true
        }
        base.tipsSeen = seen
      }

      if (isObject(raw.seenLines)) {
        const lines: Record<string, true> = {}
        for (const [k, v] of Object.entries(raw.seenLines)) {
          if (v) lines[k] = true
        }
        base.seenLines = lines
      }
      if (Array.isArray(raw.dialogueQueue)) {
        base.dialogueQueue = (raw.dialogueQueue as unknown[])
          .filter((id): id is string => typeof id === 'string')
          .slice(0, 40)
      }

      // SAVE 43: the Back Alley.
      base.crime = migrateCrime(raw.crime)
      if (isObject(raw.visitors)) {
        const rv = raw.visitors
        const v = base.visitors
        v.nextAt = typeof rv.nextAt === 'number' && Number.isFinite(rv.nextAt) ? rv.nextAt : v.nextAt
        v.answered = typeof rv.answered === 'number' ? Math.max(0, rv.answered) : 0
        if (isObject(rv.current) && typeof rv.current.id === 'string' && typeof rv.current.until === 'number') {
          v.current = { id: rv.current.id, until: rv.current.until }
        }
        if (isObject(rv.met)) for (const [k, n] of Object.entries(rv.met)) if (typeof n === 'number') v.met[k] = n
        if (Array.isArray(rv.boosts)) {
          v.boosts = (rv.boosts as unknown[])
            .filter((b): b is Record<string, unknown> => isObject(b))
            .filter((b) => (b.kind === 'demand' || b.kind === 'ventures' || b.kind === 'wages') && typeof b.mul === 'number' && typeof b.until === 'number')
            .map((b) => ({ kind: b.kind as 'demand' | 'ventures' | 'wages', mul: b.mul as number, until: b.until as number }))
            .slice(0, 20)
        }
      }
      // Nobody knocks the moment a save loads: the first visitor comes a few minutes in.
      if (!base.visitors.current) base.visitors.nextAt = Math.max(base.visitors.nextAt, base.time + VISITOR.firstAfterSec)
      base.ventureRush =
        isObject(raw.ventureRush) && typeof raw.ventureRush.id === 'string' && typeof raw.ventureRush.until === 'number'
          ? { id: raw.ventureRush.id, until: raw.ventureRush.until }
          : null

      // SAVE 42: sticky goal completions.
      base.goalsDone = {}
      if (isObject(raw.goalsDone)) {
        for (const [k, v] of Object.entries(raw.goalsDone)) if (v === true) base.goalsDone[k] = true
      }

      // Existing saves skip the opening cutscene; brand-new runs keep introSeen false.
      base.introSeen = bool(raw.introSeen, raw != null)
      // Migrated / resumed runs already past the strip opener — do not block coach.
      if (base.introSeen) skipOpeningDialogue(base)

      if (isObject(raw.museum) && Array.isArray(raw.museum.exhibits)) {
        base.museum = {
          exhibits: (raw.museum.exhibits as unknown[])
            .filter((e): e is Record<string, unknown> => isObject(e))
            .map((e) => ({
              t: num(e.t, 0),
              qty: Math.max(0, num(e.qty, 0)),
              note: typeof e.note === 'string' ? e.note : 'Spoiled goods',
            }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 12),
        }
      } else {
        base.museum = { exhibits: [] }
      }

      base.stats = mergeStats(raw.stats, emptyStats())
      if (isObject(raw.rates)) {
        base.rates.soldPerSec = num(raw.rates.soldPerSec, 0)
        base.rates.revenuePerSec = num(raw.rates.revenuePerSec, 0)
        base.rates.costPerSec = num(raw.rates.costPerSec, 0)
        base.rates.spoilPerSec = num(raw.rates.spoilPerSec, 0)
        base.rates.demandPerSec = num(raw.rates.demandPerSec, 0)
        base.rates.venturePerSec = num(raw.rates.venturePerSec, 0)
        base.rates.investYieldPerSec = num(raw.rates.investYieldPerSec, 0)
        base.rates.cashPerSec = num(raw.rates.cashPerSec, 0)
      }
      if (isObject(raw.history)) {
        base.history.cash = Array.isArray(raw.history.cash) ? (raw.history.cash as number[]) : []
        base.history.sold = Array.isArray(raw.history.sold) ? (raw.history.sold as number[]) : []
        base.history.revenue = Array.isArray(raw.history.revenue) ? (raw.history.revenue as number[]) : []
        base.history.timer = num(raw.history.timer, 0)
        base.history.lastSold = num(raw.history.lastSold, 0)
        base.history.lastRevenue = num(raw.history.lastRevenue, 0)
      }
      if (isObject(raw.acc)) {
        if (isObject(raw.acc.cat)) {
          for (const c of CATEGORY_IDS) base.acc.cat[c] = num((raw.acc.cat as Record<string, unknown>)[c], 0)
        }
        base.acc.unpack = num(raw.acc.unpack, 0)
        base.acc.shrink = num(raw.acc.shrink, 0)
        base.acc.garden = num(raw.acc.garden, 0)
        base.acc.secTimer = num(raw.acc.secTimer, 0)
        base.acc.revWindow = num(raw.acc.revWindow, 0)
        base.acc.costWindow = num(raw.acc.costWindow, 0)
        base.acc.soldWindow = num(raw.acc.soldWindow, 0)
        base.acc.spoilWindow = num(raw.acc.spoilWindow, 0)
        base.acc.cashWindow = num(raw.acc.cashWindow, 0)
        base.acc.lastSpoilLogAt = num(raw.acc.lastSpoilLogAt, -1e9)
        base.acc.lastShrinkLogAt = num(raw.acc.lastShrinkLogAt, -1e9)
        base.acc.lastPoetryAt = num(raw.acc.lastPoetryAt, -1e9)
        base.acc.lastDipLogAt = num(raw.acc.lastDipLogAt, -1e9)
        base.acc.lastCloneAt = num(raw.acc.lastCloneAt, -1e9)
      }
      if (isObject(raw.rateAvg)) {
        const ra = emptyRateAvg()
        ra.t = num(raw.rateAvg.t, 0)
        ra.curSold = num(raw.rateAvg.curSold, 0)
        ra.curRev = num(raw.rateAvg.curRev, 0)
        ra.curCost = num(raw.rateAvg.curCost, 0)
        ra.curSpoil = num(raw.rateAvg.curSpoil, 0)
        ra.curCash = num(raw.rateAvg.curCash, 0)
        ra.sold = Array.isArray(raw.rateAvg.sold)
          ? (raw.rateAvg.sold as unknown[]).map((v) => num(v, 0)).filter((v) => v >= 0)
          : []
        ra.rev = Array.isArray(raw.rateAvg.rev)
          ? (raw.rateAvg.rev as unknown[]).map((v) => num(v, 0)).filter((v) => v >= 0)
          : []
        ra.cost = Array.isArray(raw.rateAvg.cost)
          ? (raw.rateAvg.cost as unknown[]).map((v) => num(v, 0)).filter((v) => v >= 0)
          : []
        ra.spoil = Array.isArray(raw.rateAvg.spoil)
          ? (raw.rateAvg.spoil as unknown[]).map((v) => num(v, 0)).filter((v) => v >= 0)
          : []
        ra.cash = Array.isArray(raw.rateAvg.cash)
          ? (raw.rateAvg.cash as unknown[]).map((v) => num(v, 0))
          : []
        base.rateAvg = ra
      } else {
        base.rateAvg = emptyRateAvg()
      }
      if (raw.offlineReceipt === null) base.offlineReceipt = null
      else if (isObject(raw.offlineReceipt)) base.offlineReceipt = raw.offlineReceipt as unknown as OfflineReceipt

      base.version = SAVE_VERSION
      if (version < 3) {
        // Balanced aisle economy: recompute Reputation from baskets; leave cash piles.
        const deserved = deservedRepEarned(base.baskets)
        if (deserved > base.compute.repEarned) {
          const gain = deserved - base.compute.repEarned
          base.compute.reputation += gain
          base.compute.repEarned = deserved
        }
        base.compute.nextRepAt = nextRepThreshold(basketRepEarned(base.compute.repEarned))
        // Starter free Rep still counts even before first basket milestone.
        if (base.compute.repEarned < COMPUTE.freeRep) {
          base.compute.repEarned = COMPUTE.freeRep
          base.compute.reputation = Math.max(base.compute.reputation, COMPUTE.freeRep)
        }
        if (!base.marketingPosture) base.marketingPosture = 'neighborhood'
        log(
          base,
          'Save migrated to v3 — the book no longer compounds a fortune; Reputation was brought in line with baskets.',
          'era',
        )
      }
      if (version < 4) {
        // v4 (Grocery Empire 2.0): Board, per-store drift, Brand demand. All additive — never wipes progress.
        for (const st of base.stores) st.drift = Math.max(0, Math.min(1, num(st.drift, 0)))
        base.board.expandDiscount = Math.max(0.5, Math.min(1, num(base.board.expandDiscount, 1)))
        base.board.rndUntil = Math.max(0, num(base.board.rndUntil, 0))
        base.board.cutHoursUntil = Math.max(0, num(base.board.cutHoursUntil, 0))
        base.board.seats = Math.max(1, Math.floor(num(base.board.seats, 3)))
        base.brand = Math.max(0.05, Math.min(1, num(raw.brand, num(base.brand, 1))))
        base.repSpent = Math.max(0, Math.floor(num(base.repSpent, 0)))
        if (version >= 3) log(base, `Save migrated to v${SAVE_VERSION}.`, 'info')
      } else if (version < SAVE_VERSION) {
        log(base, `Save migrated to v${SAVE_VERSION}.`, 'info')
      }
      return repair(base)
    } catch {
      return resetNote(
        createInitialState(seed, now),
        'Save looked damaged — started a fresh counter. Old progress was not kept.',
      )
    }
  } catch {
    return resetNote(createInitialState(undefined, now), 'Save recovery failed — fresh counter.')
  }
}

function migrateCrime(raw: unknown): CrimeState {
  const c = emptyCrime()
  if (!isObject(raw)) return c
  const n = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  const rec = (v: unknown) => {
    const out: Record<string, number> = {}
    if (isObject(v)) for (const [k, x] of Object.entries(v)) if (typeof x === 'number' && Number.isFinite(x)) out[k] = x
    return out
  }
  c.heat = Math.max(0, Math.min(100, n(raw.heat)))
  c.cooldowns = rec(raw.cooldowns)
  c.active = rec(raw.active)
  for (const k of ['lieLowUntil', 'padlockUntil', 'scandalUntil', 'frozenUntil', 'probationUntil', 'bribeReadyAt', 'pulled', 'caught', 'finesPaid'] as const) {
    c[k] = Math.max(0, n(raw[k]))
  }
  if (Array.isArray(raw.sheet)) {
    c.sheet = (raw.sheet as unknown[])
      .filter((e): e is Record<string, unknown> => isObject(e))
      .map((e) => ({ t: n(e.t), scheme: String(e.scheme ?? ''), outcome: String(e.outcome ?? 'clean'), fine: n(e.fine) }))
      .slice(-12)
  }
  return c
}

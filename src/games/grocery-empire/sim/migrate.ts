import { CATEGORY_IDS } from '../content/categories'
import { MENU_IDS } from '../content/menus'
import { SAVE_VERSION } from './balance'
import { log } from './helpers'
import { repair } from './invariants'
import {
  createInitialState,
  emptyCold,
  emptyFleet,
  emptyPolitics,
  emptyPrestigeCarry,
  emptyStats,
  type GameState,
  type OfflineReceipt,
  type PrestigeMutatorId,
  type Stats,
} from './state'

const MUTATOR_IDS: readonly PrestigeMutatorId[] = [
  'fasterSpoil',
  'richerYield',
  'weirdElasticity',
  'expensiveAds',
]

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function num(v: unknown, fallback: number) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function bool(v: unknown, fallback: boolean) {
  return typeof v === 'boolean' ? v : fallback
}

function mergeStats(raw: unknown, base: Stats): Stats {
  if (!isObject(raw)) return base
  const out = { ...base }
  for (const k of Object.keys(base) as (keyof Stats)[]) {
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
      base.speed = [1, 2, 4].includes(num(raw.speed, 1)) ? num(raw.speed, 1) : 1
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
          history: Array.isArray(raw.wholesale.history) ? (raw.wholesale.history as number[]) : [],
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

      if (Array.isArray(raw.staff)) base.staff = raw.staff as GameState['staff']
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
        base.events = {
          couponWar: {
            active: bool(cw.active, false),
            endsAt: num(cw.endsAt, 0),
            lastAt: num(cw.lastAt, -1e9),
          },
        }
      } else {
        base.events = { couponWar: { active: false, endsAt: 0, lastAt: -1e9 } }
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
          ideas: Math.max(0, num(c.ideas, 0)),
          reputation: Math.max(0, Math.floor(num(c.reputation, 2))),
          repEarned: Math.max(0, Math.floor(num(c.repEarned, 2))),
          nextRepAt: Math.max(1, num(c.nextRepAt, base.compute.nextRepAt)),
          fibA: Math.max(1, Math.floor(num(c.fibA, 2))),
          fibB: Math.max(1, Math.floor(num(c.fibB, 3))),
          retrains: Math.max(0, Math.floor(num(c.retrains, 0))),
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
      base.endcaps = Math.max(0, Math.floor(num(raw.endcaps, 0)))
      if (isObject(raw.ventures)) base.ventures = raw.ventures as GameState['ventures']
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
      if (isObject(raw.board)) {
        base.board.seats = Math.max(1, Math.floor(num(raw.board.seats, 3)))
        base.board.nextMeetingAt = Math.max(0, num(raw.board.nextMeetingAt, 0))
        base.board.lastResolvedAt = Math.max(0, num(raw.board.lastResolvedAt, 0))
      }
      base.repSpent = Math.max(0, Math.floor(num(raw.repSpent, 0)))

      // Eras 3–6 — merge onto empty defaults
      if (isObject(raw.cold)) {
        const d = emptyCold()
        const c = raw.cold
        base.cold = {
          plants: Math.max(0, Math.floor(num(c.plants, d.plants))),
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
          momentumHoldSec: Math.max(0, num(c.momentumHoldSec, d.momentumHoldSec)),
          quadratic: bool(c.quadratic, d.quadratic),
          lastBrownoutLogAt: num(c.lastBrownoutLogAt, d.lastBrownoutLogAt),
        }
      }
      if (isObject(raw.politics)) {
        const d = emptyPolitics()
        const p = raw.politics
        base.politics = {
          capital: Math.max(0, num(p.capital, d.capital)),
          lobby: Math.max(0, Math.floor(num(p.lobby, d.lobby))),
          monopolyRisk: Math.max(0, Math.min(1, num(p.monopolyRisk, d.monopolyRisk))),
          acquisitions: Math.max(0, Math.floor(num(p.acquisitions, d.acquisitions))),
          leftRegion: bool(p.leftRegion, d.leftRegion),
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
        base.fleet = {
          barges: Math.max(0, Math.floor(num(f.barges, d.barges))),
          biomass: Math.max(0, num(f.biomass, d.biomass)),
          biomassMax: Math.max(0, num(f.biomassMax, d.biomassMax)),
          charter,
          charterPool: Math.max(0, Math.floor(num(f.charterPool, d.charterPool))),
          charterCap: Math.max(0, Math.floor(num(f.charterCap, d.charterCap))),
          legacy: Math.max(0, num(f.legacy, d.legacy)),
          warOn: bool(f.warOn, d.warOn),
          guardianUsed: bool(f.guardianUsed, d.guardianUsed),
          lanes: Math.max(0, Math.floor(num(f.lanes, d.lanes))),
          franchises: Math.max(0, Math.floor(num(f.franchises, d.franchises))),
          driftWins: Math.max(0, Math.floor(num(f.driftWins, d.driftWins))),
          launched: bool(f.launched, d.launched),
        }
      }
      base.endingChoice =
        raw.endingChoice === 'accept' || raw.endingChoice === 'reject' ? raw.endingChoice : null
      base.pendingAccept = bool(raw.pendingAccept, false)
      if (isObject(raw.prestigeCarry)) {
        const d = emptyPrestigeCarry()
        const rawMuts = Array.isArray(raw.prestigeCarry.mutators)
          ? (raw.prestigeCarry.mutators as unknown[])
          : []
        const mutators = rawMuts
          .filter((id): id is PrestigeMutatorId =>
            typeof id === 'string' && (MUTATOR_IDS as readonly string[]).includes(id),
          )
          .slice(0, 2)
        base.prestigeCarry = {
          appetite: Math.max(0, num(raw.prestigeCarry.appetite, d.appetite)),
          tipSharpness: Math.max(0, num(raw.prestigeCarry.tipSharpness, d.tipSharpness)),
          universeIndex: Math.max(0, Math.floor(num(raw.prestigeCarry.universeIndex, d.universeIndex))),
          mutators,
        }
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
      }
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
          lastInterventionAt: num(raw.recovery.lastInterventionAt, -1e9),
          watchdogTimer: num(raw.recovery.watchdogTimer, 0),
          lastProgress: num(raw.recovery.lastProgress, 0),
        }
      }

      if (isObject(raw.tipsSeen)) {
        const seen: Record<string, true> = {}
        for (const [k, v] of Object.entries(raw.tipsSeen)) {
          if (v) seen[k] = true
        }
        base.tipsSeen = seen
      }

      // Existing saves skip the opening cutscene; brand-new runs keep introSeen false.
      base.introSeen = bool(raw.introSeen, raw != null)

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
        base.acc.lastSpoilLogAt = num(raw.acc.lastSpoilLogAt, -1e9)
        base.acc.lastShrinkLogAt = num(raw.acc.lastShrinkLogAt, -1e9)
        base.acc.lastPoetryAt = num(raw.acc.lastPoetryAt, -1e9)
      }
      if (raw.offlineReceipt === null) base.offlineReceipt = null
      else if (isObject(raw.offlineReceipt)) base.offlineReceipt = raw.offlineReceipt as unknown as OfflineReceipt

      base.version = SAVE_VERSION
      if (version < SAVE_VERSION) {
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

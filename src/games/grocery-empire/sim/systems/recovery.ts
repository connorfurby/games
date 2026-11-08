import { isPerishable, type CategoryId } from '../../content/categories'
import { INSPECTION, RECOVERY } from '../balance'
import { bailoutCooldownSec, cheapestCrate, crateSize, inspectionGainMul, up } from '../formulas'
import { addBatch, compact, log, sumQty } from '../helpers'
import type { GameState } from '../state'

export function progressMetric(s: GameState): number {
  return (
    s.baskets +
    s.stats.sold +
    s.stats.memosDone * 10 +
    s.stats.upgradesBought * 5 +
    s.staff.length * 20 +
    sumQty(s.shelf) +
    sumQty(s.backroom) +
    s.cash
  )
}

/** Eligible for empty-shelf starter crate (manual ignores the 30s wait). */
export function canEmptyShelfHelper(s: GameState, opts?: { ignoreWait?: boolean }): string | null {
  if (sumQty(s.shelf) > 0) return 'Shelf still has stock.'
  if (sumQty(s.backroom) > 0) return 'Unpack the backroom first.'
  if (s.orders.length > 0) return 'A delivery is already on the way.'
  if (s.time - s.recovery.lastEmptyShelfAt < RECOVERY.helperCooldownSec) {
    return 'Starter crate cooling down.'
  }
  if (!opts?.ignoreWait && s.recovery.emptySec < RECOVERY.helperAfterSec) {
    return 'Wait a bit longer — help is coming.'
  }
  return null
}

/** Free starter crates after 30s empty shelf, once per hour. */
export function applyEmptyShelfHelper(s: GameState, opts?: { ignoreWait?: boolean }): boolean {
  if (canEmptyShelfHelper(s, opts) != null) return false
  addBatch(s.backroom, 'cans', RECOVERY.helperCrates, 0)
  s.recovery.lastEmptyShelfAt = s.time
  s.recovery.emptySec = 0
  s.stats.helperCrates += RECOVERY.helperCrates
  log(s, 'Empty shelves — starter crate arrived.', 'recovery')
  return true
}

/** Why a bailout is refused right now (null = eligible). Single source for can() and apply. */
export function canBailout(s: GameState): string | null {
  const wait = bailoutCooldownSec(s) - (s.time - s.recovery.lastBailoutAt)
  if (wait > 0) return `Bailout cooling down (${Math.ceil(wait)}s).`
  const broke = s.cash < cheapestCrate(s) && sumQty(s.backroom) + sumQty(s.shelf) <= 0
  if (!broke && s.cash > 2) return 'Not broke enough.'
  return null
}

/** Tiny cash + crates when broke. */
export function applyBailout(s: GameState): boolean {
  if (canBailout(s) != null) return false
  const cash = RECOVERY.bailoutCash + up(s, 'cash-drawer') * 5
  s.cash += cash
  addBatch(s.backroom, 'cans', RECOVERY.bailoutCrates, 0)
  s.recovery.lastBailoutAt = s.time
  s.stats.bailouts += 1
  s.stats.helperCrates += RECOVERY.bailoutCrates
  if (s.cash > s.stats.peakCash) s.stats.peakCash = s.cash
  log(s, `Bailout: +$${cash.toFixed(0)} and ${RECOVERY.bailoutCrates} cans. Delay, not doom.`, 'recovery')
  return true
}

/** Why an emergency delivery is refused right now (null = eligible). Single source for can() and apply. */
export function canEmergencyDelivery(s: GameState): string | null {
  const stock = sumQty(s.shelf) + sumQty(s.backroom)
  if (stock > crateSize(s)) return 'Stock is not critically low.'
  return null
}

/**
 * Emergency truck: free rush crates into the backroom when dry.
 * It costs 1 Reputation once Compute is unlocked and you have some — never cash.
 */
export function applyEmergencyDelivery(s: GameState): boolean {
  if (canEmergencyDelivery(s) != null) return false
  const cat = s.categories[s.orderCat] ? s.orderCat : 'cans'
  addBatch(s.backroom, cat, RECOVERY.emergencyCrates, 0)
  s.stats.emergencyDeliveries += 1
  if (s.compute.unlocked && s.compute.reputation >= 1) {
    s.compute.reputation -= 1
    log(s, `Emergency delivery (${RECOVERY.emergencyCrates} units). Cost −1 Reputation, no cash.`, 'recovery')
  } else {
    log(s, `Emergency delivery (${RECOVERY.emergencyCrates} units). On the house — no cash taken.`, 'recovery')
  }
  return true
}

/** Why a mentor restock is refused right now (null = eligible). */
export function canMentorRestock(s: GameState): string | null {
  if (s.era > 0 && s.stats.playSec > 1200) return 'Mentor has moved on.'
  if (sumQty(s.shelf) + sumQty(s.backroom) > 0) return 'You still have stock.'
  const wait = RECOVERY.mentorCooldownSec - (s.time - s.recovery.lastMentorAt)
  if (wait > 0) return `Mentor is busy (${Math.ceil(wait)}s).`
  return null
}

/** Early-run free crate while tutorials are still teaching the loop. */
export function applyMentorRestock(s: GameState): boolean {
  if (canMentorRestock(s) != null) return false
  addBatch(s.backroom, 'cans', crateSize(s), 0)
  s.stats.helperCrates += crateSize(s)
  s.recovery.lastMentorAt = s.time
  log(s, 'Mentor restocked a crate. Unpack when you are ready.', 'recovery')
  return true
}

function cheapestRecovery(s: GameState): boolean {
  if (applyEmptyShelfHelper(s)) return true
  if (applyMentorRestock(s)) return true
  if (applyBailout(s)) return true
  if (applyEmergencyDelivery(s)) return true
  return false
}

export function tickRecovery(s: GameState, dt: number) {
  // Empty-shelf timer: shelves only (backroom stock is an unpack problem, not a grant).
  if (sumQty(s.shelf) <= 0) s.recovery.emptySec += dt
  else s.recovery.emptySec = 0

  const stock = sumQty(s.shelf) + sumQty(s.backroom)
  if (s.cash < 1 && stock <= 0) s.recovery.brokeSec += dt
  else s.recovery.brokeSec = 0

  applyEmptyShelfHelper(s)
  if (s.recovery.brokeSec >= 20) applyBailout(s)

  const metric = progressMetric(s)
  if (metric > s.recovery.lastProgress + 0.01) {
    s.recovery.lastProgress = metric
    s.recovery.stallSec = 0
  } else {
    s.recovery.stallSec += dt
  }

  s.recovery.watchdogTimer += dt
  if (s.recovery.watchdogTimer < 5) return
  s.recovery.watchdogTimer = 0

  if (s.recovery.stallSec < RECOVERY.interventionAfterSec) return
  if (s.time - s.recovery.lastInterventionAt < 60) return

  if (cheapestRecovery(s)) {
    s.recovery.lastInterventionAt = s.time
    s.recovery.stallSec = 0
    s.recovery.lastProgress = progressMetric(s)
    s.stats.interventions += 1
    log(s, 'Operations intervened.', 'recovery')
  }
}

export type DumpWhere = 'backroom' | 'shelf'

/** Perishable units currently on the shelf / in the backroom (optionally one aisle). */
export function perishableQty(s: GameState, where: DumpWhere, cat?: CategoryId): number {
  const list = where === 'shelf' ? s.shelf : s.backroom
  let n = 0
  for (const b of list) if (b.qty > 0 && isPerishable(b.cat) && (!cat || b.cat === cat)) n += b.qty
  return n
}

/**
 * Bin up to `limit` perishable units from one list, oldest (closest to spoiling) first.
 * Counts as spoilage and nudges the inspection meter a little.
 */
function dumpFrom(s: GameState, where: DumpWhere, limit: number, cat?: CategoryId): number {
  const list = where === 'shelf' ? s.shelf : s.backroom
  const picks = list
    .filter((b) => b.qty > 0 && isPerishable(b.cat) && (!cat || b.cat === cat))
    .sort((a, b) => b.age - a.age)
  let need = Math.max(0, Math.floor(limit))
  let dumped = 0
  for (const b of picks) {
    if (need <= 0) break
    const n = Math.min(b.qty, need)
    b.qty -= n
    need -= n
    dumped += n
    s.stats.spoiledByCat[b.cat] += n
  }
  compact(list)
  if (dumped > 0) {
    s.stats.dumps += 1
    s.stats.spoiled += dumped
    s.inspection.meter = Math.min(
      2,
      s.inspection.meter + dumped * INSPECTION.inspectionPerUnit * inspectionGainMul(s) * RECOVERY.dumpInspectionFrac,
    )
    const label = where === 'shelf' ? 'shelf' : 'backroom'
    log(s, `Dumped ${dumped} perishable unit${dumped === 1 ? '' : 's'} from the ${label}.`, 'warn')
  }
  return dumped
}

/** Dump every perishable in the backroom (default spoil cleanup — never touches the sales floor). */
export function dumpBackroom(s: GameState): number {
  return dumpFrom(s, 'backroom', Infinity)
}

/** Dump every perishable on the shelf. Only reachable via an explicit command flag. */
export function dumpShelf(s: GameState): number {
  return dumpFrom(s, 'shelf', Infinity)
}

/** Dump a few units of one aisle from the backroom or shelf. */
export function dumpCoolerPartial(s: GameState, cat: CategoryId, n: number, where: DumpWhere = 'backroom'): number {
  return dumpFrom(s, where, n, cat)
}

/**
 * Dump perishables. Backroom only unless `includeShelf` is set — a shelf dump can empty the sales floor.
 */
export function dumpCooler(s: GameState, includeShelf = false): number {
  const back = dumpBackroom(s)
  return back + (includeShelf ? dumpShelf(s) : 0)
}

import { isPerishable } from '../../content/categories'
import { RECOVERY } from '../balance'
import { cheapestCrate, crateSize, up } from '../formulas'
import { addBatch, log, sumQty } from '../helpers'
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

/** Tiny cash + crates when broke. */
export function applyBailout(s: GameState): boolean {
  if (s.time - s.recovery.lastBailoutAt < RECOVERY.bailoutCooldownSec) return false
  const broke = s.cash < cheapestCrate(s) && sumQty(s.backroom) + sumQty(s.shelf) <= 0
  if (!broke && s.cash > 2) return false
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

/** Emergency truck: dump crates into backroom when dry. */
export function applyEmergencyDelivery(s: GameState): boolean {
  const stock = sumQty(s.shelf) + sumQty(s.backroom)
  if (stock > crateSize(s)) return false
  const cat = s.categories[s.orderCat] ? s.orderCat : 'cans'
  addBatch(s.backroom, cat, RECOVERY.emergencyCrates, 0)
  s.stats.emergencyDeliveries += 1
  if (s.compute.unlocked && s.compute.reputation >= 1) {
    s.compute.reputation -= 1
    log(s, `Emergency delivery (${RECOVERY.emergencyCrates} units). −1 Reputation.`, 'recovery')
  } else {
    log(s, `Emergency delivery (${RECOVERY.emergencyCrates} units).`, 'recovery')
  }
  return true
}

/** Early-run free crate while tutorials are still teaching the loop. */
export function applyMentorRestock(s: GameState): boolean {
  if (s.era > 0 && s.stats.playSec > 1200) return false
  if (sumQty(s.shelf) + sumQty(s.backroom) > 0) return false
  addBatch(s.backroom, 'cans', crateSize(s), 0)
  s.stats.helperCrates += crateSize(s)
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

/** Dump perishables from shelf + backroom (spoil cleanup / panic button). */
export function dumpCooler(s: GameState): number {
  let dumped = 0
  for (const list of [s.shelf, s.backroom]) {
    for (const b of list) {
      if (!isPerishable(b.cat)) continue
      dumped += b.qty
      b.qty = 0
    }
  }
  s.shelf = s.shelf.filter((b) => b.qty > 0)
  s.backroom = s.backroom.filter((b) => b.qty > 0)
  if (dumped > 0) {
    s.stats.dumps += 1
    s.stats.spoiled += dumped
    log(s, `Dumped ${dumped} perishable unit${dumped === 1 ? '' : 's'} from coolers.`, 'warn')
  }
  return dumped
}

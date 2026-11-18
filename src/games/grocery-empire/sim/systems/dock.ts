import { CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { upgradeEffect } from '../../content/upgrades'
import { DEPTH } from '../balance'
import { crateSize } from '../formulas'
import { addBatch, log } from '../helpers'
import type { GameState } from '../state'

/** Why a dock check-in can't happen right now (null when it can). */
export function dockCheckInBlock(s: GameState): string | null {
  if (!s.depth) return 'Dock check-in opens in Era 1.'
  if (s.era < 1) return 'Dock check-in opens in Era 1.'
  const onBoard = DEPTH.shiftSlots.some((slot) =>
    (s.depth.shifts?.[slot] ?? []).some((id) => s.staff.find((x) => x.id === id)?.role === 'receiver'),
  )
  if (!onBoard) return 'Put a receiver on a shift board first.'
  if (s.time < (s.depth.nextDockAt ?? 0)) {
    return `Next dock check-in in ${Math.ceil((s.depth.nextDockAt ?? 0) - s.time)}s.`
  }
  return null
}

export function runDockCheckIn(s: GameState, aisle: CategoryId, short: boolean, quiet = false) {
  const units = short ? Math.max(2, Math.floor(crateSize(s) * 0.55)) : crateSize(s)
  addBatch(s.backroom, aisle, units, 0)
  s.depth.dockCheckIns = (s.depth.dockCheckIns ?? 0) + 1
  s.depth.lastDockAisle = aisle
  const pad = Math.min(0.4, upgradeEffect(s, 'dock-check-pad'))
  const cd = DEPTH.dockCheckInCooldownSec * (1 - pad) * (short ? 0.7 : 1)
  s.depth.nextDockAt = s.time + cd
  if (s.depth.dockCheckIns === DEPTH.dockAutoAfter) {
    log(s, 'Your receiver has the routine down: trucks now check in on their own. Switch it in Menu → Autopilot.', 'good')
  }
  if (!quiet) {
    log(
      s,
      `Dock check-in ${s.depth.dockCheckIns}/${DEPTH.dockCheckInNeed} → ${aisle}${short ? ' (short)' : ''}. Next in ${Math.ceil(cd)}s.`,
      'good',
    )
  }
}

/** The aisle with the least stock on the shelf and in the back. */
export function lowestStockAisle(s: GameState): CategoryId | null {
  const open = CATEGORY_IDS.filter((c) => s.categories[c])
  if (open.length === 0) return null
  const stock = (cat: CategoryId) =>
    s.backroom.filter((b) => b.cat === cat).reduce((n, b) => n + b.qty, 0) +
    s.shelf.filter((b) => b.cat === cat).reduce((n, b) => n + b.qty, 0)
  return [...open].sort((a, b) => stock(a) - stock(b))[0] ?? null
}

/**
 * After a few check-ins by hand, the receiver checks trucks in on their own (lowest-stock aisle),
 * at the same rhythm. The 28-check-in gate still takes the same time; it just isn't a tap every
 * two minutes for an hour (waits debug: 13–18 min stretches of nothing else to do in Era 1).
 */
export function tickAutoDock(s: GameState) {
  if (!s.depth?.autoDock) return
  if ((s.depth.dockCheckIns ?? 0) < DEPTH.dockAutoAfter) return
  if (dockCheckInBlock(s)) return
  const aisle = lowestStockAisle(s)
  if (aisle) runDockCheckIn(s, aisle, false, true)
}

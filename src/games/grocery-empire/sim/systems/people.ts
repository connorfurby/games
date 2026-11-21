import { CATEGORY_IDS, type CategoryId } from '../../content/categories'
import { ROLES, STAFF_NAMES } from '../../content/staff'
import { MORALE, STAFF_POWER, STAFF_XP } from '../balance'
import { crewStrength } from '../staffPower'
import {
  memo,
  moraleTarget,
  restockWeight,
  shelfCap,
  staffLevelCap,
  standingOrderMagnitude,
  unpackPerSec,
  up,
  upgradeMagnitude,
  xpToLevel,
} from '../formulas'
import { addBatch, log, sumQty, takeUnits } from '../helpers'
import type { GameState } from '../state'

/**
 * Move up to n units backroom → shelf. Picks the category whose shelf share is
 * furthest below its demand weight, oldest crate first. Returns units moved.
 */
export function unpackUnits(s: GameState, n: number): number {
  const room = Math.max(0, shelfCap(s) - sumQty(s.shelf))
  let left = Math.min(n, room)
  let moved = 0
  while (left > 0) {
    const shelfTotal = sumQty(s.shelf) + 1
    let best: CategoryId | null = null
    let bestGap = -Infinity
    let weightSum = 0
    for (const c of CATEGORY_IDS) {
      if (s.categories[c] && sumQty(s.backroom, c) > 0) weightSum += restockWeight(s, c)
    }
    if (weightSum === 0) break
    for (const c of CATEGORY_IDS) {
      if (!s.categories[c] || sumQty(s.backroom, c) <= 0) continue
      const target = restockWeight(s, c) / weightSum
      const gap = target - sumQty(s.shelf, c) / shelfTotal
      if (gap > bestGap) {
        bestGap = gap
        best = c
      }
    }
    if (!best) break
    const chunk = Math.min(left, Math.max(1, Math.ceil(left / 3)), sumQty(s.backroom, best))
    const taken = takeUnits(s.backroom, chunk, true, best)
    for (const b of taken) addBatch(s.shelf, b.cat, b.qty, b.age)
    const got = taken.reduce((a, b) => a + b.qty, 0)
    if (got <= 0) break
    left -= got
    moved += got
  }
  return moved
}

export function tickStaffUnpack(s: GameState, dt: number) {
  const rate = unpackPerSec(s)
  if (rate <= 0) return
  s.acc.unpack = Math.min(5 + rate, s.acc.unpack + rate * dt)
  const n = Math.floor(s.acc.unpack)
  if (n <= 0) return
  const moved = unpackUnits(s, n)
  s.acc.unpack -= moved
  if (moved < n) s.acc.unpack = Math.min(s.acc.unpack, 1)
  s.stats.unpackedStaff += moved
}

export function tickStaffXp(s: GameState, dt: number) {
  if (!s.staff.length) return
  const cap = staffLevelCap(s)
  const nightXp =
    s.hours > 1 ? upgradeMagnitude(s, 'closer') + upgradeMagnitude(s, 'traveling-team') * 0.5 : 0
  const gain =
    STAFF_XP.perSec *
    dt *
    (1 + up(s, 'xp-gain') * STAFF_XP.trainingBonusPerLevel + nightXp + crewStrength(s, 'trainer') * STAFF_POWER.trainerXp)
  for (const m of s.staff) {
    if (m.level >= cap) continue
    m.xp += gain
    const need = xpToLevel(m.level)
    if (m.xp >= need) {
      m.xp -= need
      m.level += 1
      log(s, `${m.name} reached ${ROLES[m.role].name} level ${m.level}.`, 'staff')
    }
  }
}

export function tickMorale(s: GameState, dt: number) {
  if (!s.staff.length) {
    s.morale = 1
    return
  }
  const target = moraleTarget(s)
  const travelingCut = up(s, 'traveling-team') > 0 ? 0.7 : 1
  const regen =
    MORALE.regenPerSec *
    (1 + up(s, 'morale-regen') * 0.2 + standingOrderMagnitude(s, 'break-extension', 0.35)) *
    travelingCut *
    (memo(s, 'staff-room') ? 1.5 : 1)
  if (s.morale < target) s.morale = Math.min(target, s.morale + regen * dt)
  else s.morale = Math.max(target, s.morale - regen * 0.5 * dt)
}

const PINNED_NAMES = ['Connor', 'Luke', 'Jonas'] as const

/** Name for a staff id. The stride hits every name once before anyone is numbered. */
export function staffName(id: number) {
  const n = STAFF_NAMES.length
  const name = STAFF_NAMES[(Math.floor(id) * 7) % n]!
  return id > n ? `${name} ${Math.ceil(id / n)}` : name
}

/** Next hire. Connor, Luke, and Jonas come first while they are not already on the clock. */
export function hireName(s: GameState, id: number) {
  const used = new Set(s.staff.map((m) => m.name))
  for (const name of PINNED_NAMES) {
    if (!used.has(name)) return name
  }
  const n = STAFF_NAMES.length
  for (let k = 0; k < n; k++) {
    const name = STAFF_NAMES[((Math.floor(id) + k) * 7) % n]!
    if (!used.has(name)) return name
  }
  return staffName(id)
}

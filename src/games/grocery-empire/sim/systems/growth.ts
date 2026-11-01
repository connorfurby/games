import { VENTURE_BY_ID, ventureIncome } from '../../content/ventures'
import { EMPIRE } from '../balance'
import { backroomCap, empireXpToNext, up } from '../formulas'
import { addBatch, log, sumQty, takeUnits } from '../helpers'
import { chance } from '../rng'
import type { GameState } from '../state'

/** Garden / production trickle into the backroom. */
export function tickGarden(s: GameState, dt: number) {
  const prod = s.builds.production ?? 0
  if (prod <= 0) return
  let room = Math.max(0, backroomCap(s) - sumQty(s.backroom))
  if (room <= 0) return

  if (s.categories.produce) {
    const rate = prod >= 2 ? 1 : 1 / 15
    s.acc.garden += rate * dt
    const n = Math.min(room, Math.floor(s.acc.garden))
    if (n > 0) {
      s.acc.garden -= n
      addBatch(s.backroom, 'produce', n, 0)
      room -= n
    }
  }

  // Dairy trickle uses rng instead of acc.cat (reserved for sales demand fractions).
  if (prod >= 3 && s.categories.dairy && room > 0) {
    const rate = prod >= 5 ? 0.8 : prod >= 4 ? 0.35 : 0.08
    if (chance(s, Math.min(1, rate * dt))) {
      addBatch(s.backroom, 'dairy', 1, 0)
    }
  }
}

export function tickVentures(s: GameState, dt: number) {
  for (const id of Object.keys(s.ventures)) {
    const vs = s.ventures[id]
    if (!vs || vs.level <= 0) continue
    const def = VENTURE_BY_ID[id]
    if (!def) continue

    let efficiency = 1
    if (def.producePerLevel) {
      const need = def.producePerLevel * vs.level * dt
      vs.carry += need
      const want = Math.floor(vs.carry)
      if (want > 0) {
        const have = sumQty(s.backroom, 'produce')
        const take = Math.min(have, want)
        if (take > 0) {
          takeUnits(s.backroom, take, true, 'produce')
          vs.carry -= take
        }
        if (take < want) {
          vs.carry -= want - take
          if (vs.carry < 0) vs.carry = 0
          efficiency = 0.25
        }
      }
    }

    const income = ventureIncome(def, vs.level) * efficiency
    const cap = income * def.storeSec
    if (cap <= 0) continue
    vs.stored = Math.min(cap, vs.stored + income * dt)

    if (up(s, 'auto-collect') >= 1 && vs.stored >= cap * 0.95) {
      collectVenture(s, id)
    }
  }
}

export function collectVenture(s: GameState, id: string): number {
  const vs = s.ventures[id]
  if (!vs || vs.stored <= 0) return 0
  const got = vs.stored
  vs.stored = 0
  vs.lifetime += got
  s.cash += got
  s.lifetimeRevenue += got
  s.stats.ventureCollected += got
  s.stats.ventureCollects += 1
  s.empire.xp += EMPIRE.xpPerVentureCollect
  if (s.cash > s.stats.peakCash) s.stats.peakCash = s.cash
  return got
}

export function tickEmpire(s: GameState) {
  while (s.empire.level < EMPIRE.maxLevel) {
    const need = empireXpToNext(s.empire.level)
    if (s.empire.xp < need) break
    s.empire.xp -= need
    s.empire.level += 1
    s.empire.points += 1
    log(s, `Empire level ${s.empire.level}. +1 perk point.`, 'era')
  }
}

export function tickGrowth(s: GameState, dt: number) {
  tickGarden(s, dt)
  tickVentures(s, dt)
  tickEmpire(s)
}

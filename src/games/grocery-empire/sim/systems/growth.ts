import { PROJECT_BY_ID } from '../../content/projects'
import { EMPIRE_REWARDS, EMPIRE_REWARD_POINTS } from '../../content/empireRewards'
import { VENTURE_BY_ID, ventureIncome } from '../../content/ventures'
import { EMPIRE } from '../balance'
import { backroomCap, empireXpToNext, perk, up } from '../formulas'
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
  let ventureRate = 0
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
    const before = vs.stored
    vs.stored = Math.min(cap, vs.stored + income * dt)
    // Only count filling rate (not when capped).
    if (vs.stored > before) ventureRate += income

    // Outgrown tills (under 0.5% of income) collect themselves: small change shouldn't be a chore.
    const outgrown = income < ventureOutgrownBelow(s)
    if ((outgrown || up(s, 'auto-collect') >= 1 || perk(s, 'venture-auto') > 0) && vs.stored >= cap * 0.95) {
      collectVenture(s, id)
    }
  }
  s.rates.venturePerSec = ventureRate
}

/** A venture earning less than this per second has been outgrown by the store. */
export function ventureOutgrownBelow(s: GameState): number {
  return Math.max(0, s.rates.revenuePerSec) * 0.005
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
  s.empire.xp += EMPIRE.xpPerVentureCollect + got * EMPIRE.xpPerVentureCash
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
    const reward = EMPIRE_REWARDS.find((r) => r.level === s.empire.level)
    if (reward) {
      s.empire.points += EMPIRE_REWARD_POINTS
      log(s, `Empire ${s.empire.level}: ${reward.name}. ${reward.blurb} +${1 + EMPIRE_REWARD_POINTS} trait points.`, 'era')
    } else {
      log(s, `Empire level ${s.empire.level}. +1 trait point.`, 'era')
    }
  }
}

/** Finish Empire Projects whose timers have run out (works offline too). */
export function tickProjects(s: GameState) {
  const pj = s.projects
  if (!pj || pj.active.length === 0) return
  const still: typeof pj.active = []
  for (const a of pj.active) {
    if (s.time >= a.endsAt) {
      pj.done[a.id] = true
      const def = PROJECT_BY_ID[a.id]
      log(s, `Project finished: ${def?.name ?? a.id}.`, 'era')
    } else {
      still.push(a)
    }
  }
  pj.active = still
}

export function tickGrowth(s: GameState, dt: number) {
  tickProjects(s)
  tickGarden(s, dt)
  tickVentures(s, dt)
  tickEmpire(s)
}

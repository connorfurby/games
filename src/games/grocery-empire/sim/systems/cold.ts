import { COLD, HUNGRY_LAWS } from '../balance'
import { hasMutator } from '../formulas'
import { log, round2, unlockMenu } from '../helpers'
import type { GameState } from '../state'

export function plantCost(s: GameState): number {
  return Math.ceil(COLD.plantCost * Math.pow(COLD.plantGrowth, s.cold.plants))
}

export function tankCost(s: GameState): number {
  return Math.ceil(COLD.tankCost * Math.pow(COLD.tankGrowth, s.cold.tanks))
}

export function coldSupply(s: GameState): number {
  const plants = s.cold.plants
  const quadratic = s.cold.quadratic ? plants * plants : plants
  return COLD.plantSupply * quadratic + COLD.tankBuffer * s.cold.tanks
}

export function coldDemand(s: GameState): number {
  if (s.cold.plants <= 0 && s.cold.tanks <= 0) return 0
  return COLD.baseDemand + COLD.demandPerPlant * Math.max(1, s.cold.plants)
}

export function canBuyPlant(s: GameState): string | null {
  if (s.era < 3 && !(s.memos['cold-plant-permit'] > 0)) return 'Need Cold Plant Permit (Era 3).'
  if (s.cold.yieldLeft <= 0) return 'Regional yield is empty.'
  const cost = plantCost(s)
  if (s.cash < cost) return `Need $${cost.toFixed(0)}.`
  return null
}

export function buyPlant(s: GameState) {
  const cost = plantCost(s)
  s.cash = round2(s.cash - cost)
  s.cold.plants += 1
  s.stats.buildsBought += 1
  unlockMenu(s, 'cold')
  log(s, `Cold plant #${s.cold.plants} online. Compressors hum.`, 'good')
}

export function canBuyTank(s: GameState): string | null {
  if (s.cold.plants < 1 && !(s.memos['tank-farm'] > 0)) return 'Need a plant (or Tank Farm memo).'
  const cost = tankCost(s)
  if (s.cash < cost) return `Need $${cost.toFixed(0)}.`
  return null
}

export function buyTank(s: GameState) {
  const cost = tankCost(s)
  s.cash = round2(s.cash - cost)
  s.cold.tanks += 1
  s.stats.buildsBought += 1
  log(s, `Tank farm unit #${s.cold.tanks} pressurized.`, 'good')
}

/** Full-refund decommission of newest plant (never required; experiment freely). */
export function canDecommissionPlant(s: GameState): string | null {
  if (s.cold.plants <= 0) return 'No plants to shed.'
  return null
}

export function decommissionPlant(s: GameState) {
  if (s.cold.plants <= 0) return
  const refund = Math.floor(plantCost(s) / COLD.plantGrowth)
  s.cold.plants -= 1
  s.cash = round2(s.cash + refund)
  log(s, `Decommissioned a plant. $${refund} refunded.`, 'info')
}

function autoShedNewestPlant(s: GameState) {
  if (s.cold.plants <= 0) return false
  // Never wipe all plants if tanks still hold the line — keep at least 0 is ok
  // when browned; rule is never wipe *all* in one shed if multiple exist.
  if (s.cold.plants === 1 && s.cold.tanks > 0) {
    // Shed is allowed down to 0 plants but leave tanks — "never wipe all" means
    // don't zero plants and tanks together. Keep tanks.
  }
  s.cold.plants -= 1
  s.cold.autoSheds += 1
  log(s, 'Auto-shed: newest cold plant taken offline until surplus returns.', 'warn')
  return true
}

/** Freshness, Momentum, brownout floor, yield drain, mild plant income. */
export function tickCold(s: GameState, dt: number) {
  if (s.era < 3) return

  const supply = coldSupply(s)
  const demand = coldDemand(s)
  s.cold.surplus = supply - demand

  if (demand <= 0 && s.cold.plants <= 0 && s.cold.tanks <= 0) {
    s.cold.freshness = 1
    return
  }

  const ratio = demand > 0 ? supply / demand : 1
  let freshness = ratio
  if (s.cold.browned) {
    freshness = Math.max(COLD.freshnessFloor, Math.min(freshness, 0.95))
  }

  if (ratio < 1) {
    // Brownout path
    if (!s.cold.browned) {
      s.cold.browned = true
      s.cold.brownouts += 1
      if (s.time - s.cold.lastBrownoutLogAt >= COLD.brownoutLogCooldown) {
        s.cold.lastBrownoutLogAt = s.time
        log(s, 'Brownout: freshness floored at 25%. Momentum paused. Auto-shed engaged.', 'warn')
      }
    }
    freshness = Math.max(COLD.freshnessFloor, freshness)
    // Momentum pauses — do not erase permanently
    autoShedNewestPlant(s)
  } else {
    if (s.cold.browned && ratio >= 1) {
      s.cold.browned = false
      log(s, 'Cold line recovered. Freshness climbing; Momentum may resume.', 'good')
    }
    if (s.cold.momentumOn && freshness >= 1) {
      s.cold.momentum = Math.min(
        COLD.momentumMax,
        s.cold.momentum + COLD.momentumGainPerSec * dt * Math.max(0, ratio - 0.99),
      )
      s.cold.momentumHoldSec += dt
    }
  }

  if (s.cold.browned || !s.cold.momentumOn || freshness < 1) {
    // Soft decay toward 1 while paused — never wipe below 1 once earned above
    if (s.cold.momentum > 1) {
      s.cold.momentum = Math.max(1, s.cold.momentum - COLD.momentumDecayPerSec * dt * 0.25)
    }
  }

  s.cold.freshness = freshness * (s.cold.momentumOn && !s.cold.browned ? Math.max(1, s.cold.momentum) : 1)
  s.cold.freshness = Math.max(COLD.freshnessFloor, s.cold.freshness)

  // Yield drain
  if (s.cold.plants > 0 && s.cold.yieldLeft > 0) {
    const mul = s.cold.quadratic ? COLD.quadraticYieldMul : 1
    const drain = COLD.yieldDrainPerPlant * s.cold.plants * mul * dt
    s.cold.yieldLeft = Math.max(0, s.cold.yieldLeft - drain)
    if (s.cold.yieldLeft <= 0) {
      log(s, 'County yield emptied. Leave the Region is on the table.', 'era')
    }
  }

  // Mild income from cold infrastructure (momentum multiplies when healthy)
  if (s.cold.plants > 0) {
    const mom = s.cold.momentumOn && !s.cold.browned && s.cold.freshness >= 1 ? s.cold.momentum : 1
    const income = COLD.plantCashIncome * s.cold.plants * mom * dt
    const bonus = Math.max(0, s.cold.surplus) * COLD.surplusCashMul * dt
    const yieldLaw = hasMutator(s, 'richerYield') ? HUNGRY_LAWS.richerYieldMul : 1
    const gain = (income + bonus) * (1 + s.prestigeCarry.appetite) * yieldLaw
    s.cash = round2(s.cash + gain)
    s.lifetimeRevenue += gain
  }
}

export function enableMomentum(s: GameState) {
  s.cold.momentumOn = true
  unlockMenu(s, 'cold')
  log(s, 'Momentum Clause active. Hold freshness ≥100% to compound.', 'memo')
}

export function enableQuadratic(s: GameState) {
  s.cold.quadratic = true
  log(s, 'County Emptying: every plant counts twice. Yield will vanish fast.', 'memo')
}

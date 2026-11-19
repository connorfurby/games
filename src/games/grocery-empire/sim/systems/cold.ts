import { cashLabel } from '@/shared/bn'
import { statMul } from './stats'
import { COLD, DEPTH, HUNGRY_LAWS, NETWORK } from '../balance'
import { log, round2, unlockMenu } from '../helpers'
import type { GameState, PlantEntry, PlantKind } from '../state'
import type { RoleId } from '../../content/staff'
import { freshWaySoftFlyerMul } from './flyerStance'
import { currentShiftSlot, shiftStaffIds } from './regulars'

function roleCount(s: GameState, role: RoleId) {
  let n = 0
  for (const m of s.staff) if (m.role === role) n++
  return n
}

function hasMutator(s: GameState, id: string) {
  return (s.prestigeCarry?.mutators ?? []).includes(id as never)
}

export function syncPlantCount(s: GameState) {
  if (!s.cold.plantList) s.cold.plantList = []
  if (!s.cold.offlineList) s.cold.offlineList = []
  if (!s.cold.poweredKinds) s.cold.poweredKinds = []
  s.cold.plants = s.cold.plantList.length
  s.cold.offline = s.cold.offlineList.length
  // Drop powered kinds that are no longer owned.
  const owned = new Set((s.cold.plantList ?? []).map((p) => p.kind))
  s.cold.poweredKinds = s.cold.poweredKinds.filter((k) => owned.has(k)).slice(0, DEPTH.plantPowerSlots)
  if (s.cold.poweredKinds.length === 0 && owned.size > 0) {
    // Default: blast + tunnel when present (leave-region path), else first owned.
    const prefer: PlantKind[] = ['blast', 'tunnel', 'compressor']
    for (const k of prefer) {
      if (!owned.has(k)) continue
      if (s.cold.poweredKinds.length >= DEPTH.plantPowerSlots) break
      s.cold.poweredKinds.push(k)
    }
  }
}

export function plantCountOf(s: GameState, kind: PlantKind): number {
  return (s.cold.plantList ?? []).filter((p) => p.kind === kind).length
}

/** Plants that currently draw power (dark plants still owned, do not supply/drain). */
export function poweredPlantCountOf(s: GameState, kind: PlantKind): number {
  syncPlantCount(s)
  if (!(s.cold.poweredKinds ?? []).includes(kind)) return 0
  return plantCountOf(s, kind)
}

export function poweredPlantTotal(s: GameState): number {
  syncPlantCount(s)
  let n = 0
  for (const k of s.cold.poweredKinds ?? []) n += plantCountOf(s, k)
  return n
}

export function canSetPlantPower(s: GameState, kinds: PlantKind[]): string | null {
  if (s.era < 3 && !(s.memos['cold-plant-permit'] > 0)) return 'Need Cold Plant Permit.'
  const uniq = [...new Set(kinds.filter((k) => k === 'compressor' || k === 'tunnel' || k === 'blast'))]
  if (uniq.length === 0) return 'Pick at least one plant to power.'
  if (uniq.length > DEPTH.plantPowerSlots) return `Power at most ${DEPTH.plantPowerSlots} kinds.`
  for (const k of uniq) {
    if (plantCountOf(s, k) < 1) return `No ${k} online.`
  }
  return null
}

export function setPlantPower(s: GameState, kinds: PlantKind[]) {
  const uniq = [...new Set(kinds)].slice(0, DEPTH.plantPowerSlots) as PlantKind[]
  s.cold.poweredKinds = uniq
  syncPlantCount(s)
  if (s.depth && uniq.includes('blast') && plantCountOf(s, 'blast') > 0) {
    s.depth.blastSuppressesTunnelUntilLog = true
  }
  const dark = (['compressor', 'tunnel', 'blast'] as PlantKind[]).filter(
    (k) => plantCountOf(s, k) > 0 && !uniq.includes(k),
  )
  log(
    s,
    `Powering ${uniq.join(' + ')}${dark.length ? `; ${dark.join(', ')} dark` : ''}.`,
    'info',
  )
}

export function plantCost(s: GameState): number {
  const n = s.cold.plantList.length + (s.cold.offlineList?.length ?? 0)
  let cost = COLD.plantCost * Math.pow(COLD.plantGrowth, n)
  // After ocean lanes exist, further plants get steeper.
  if ((s.fleet?.lanes ?? 0) > 0) {
    const extras = Math.max(0, n - NETWORK.oldLayer.softAfter.plants)
    if (extras > 0) cost *= Math.pow(NETWORK.oldLayer.costSteepen, extras)
  }
  return Math.ceil(cost)
}

export function tankCost(s: GameState): number {
  return Math.ceil(COLD.tankCost * Math.pow(COLD.tankGrowth, s.cold.tanks))
}

export function coldSupply(s: GameState): number {
  const plants = Math.max(0, poweredPlantTotal(s))
  const quadratic = s.cold.quadratic ? plants * plants : plants
  let supply = COLD.plantSupply * quadratic + COLD.tankBuffer * s.cold.tanks
  if (roleCount(s, 'plantOperator') > 0) supply *= 1.05
  return supply
}

export function coldDemand(s: GameState): number {
  const powered = poweredPlantTotal(s)
  if (powered <= 0 && s.cold.tanks <= 0) return 0
  const missed = s.depth?.cooler?.missed ?? 0
  const missMul = 1 + missed * DEPTH.coolerMissedBrownoutMul
  return (COLD.baseDemand + COLD.demandPerPlant * Math.max(1, powered)) * missMul
}

export function canBuyPlant(s: GameState, kind: PlantKind = 'compressor'): string | null {
  if (s.era < 3 && !(s.memos['cold-plant-permit'] > 0)) return 'Need Cold Plant Permit (Era 3).'
  if (kind !== 'compressor' && kind !== 'tunnel' && kind !== 'blast') return 'Unknown plant kind.'
  if (s.cold.yieldLeft <= 0 && kind === 'blast') return 'The region’s supply is empty.'
  const cost = plantCost(s)
  if (s.cash < cost) return `Need ${cashLabel(cost)}.`
  return null
}

export function buyPlant(s: GameState, kind: PlantKind = 'compressor') {
  const cost = plantCost(s)
  s.cash = round2(s.cash - cost)
  if (!s.cold.plantList) s.cold.plantList = []
  if (!s.cold.nextPlantId) s.cold.nextPlantId = 1
  const entry: PlantEntry = { id: `p${s.cold.nextPlantId++}`, kind }
  s.cold.plantList.push(entry)
  if (!s.cold.poweredKinds) s.cold.poweredKinds = []
  if (
    s.cold.poweredKinds.length < DEPTH.plantPowerSlots &&
    !s.cold.poweredKinds.includes(kind)
  ) {
    s.cold.poweredKinds.push(kind)
  }
  syncPlantCount(s)
  if (s.depth && kind === 'blast' && s.cold.poweredKinds.includes('blast')) {
    s.depth.blastSuppressesTunnelUntilLog = true
  }
  s.stats.buildsBought += 1
  unlockMenu(s, 'cold')
  const label = kind === 'blast' ? 'Blast freezer' : kind === 'tunnel' ? 'Tunnel cold' : 'Compressor'
  log(s, `${label} #${s.cold.plants} online.`, 'good')
}

export function canBuyTank(s: GameState): string | null {
  if (s.cold.plants < 1 && !(s.memos['tank-farm'] > 0)) return 'Need a plant (or Tank Farm memo).'
  const cost = tankCost(s)
  if (s.cash < cost) return `Need ${cashLabel(cost)}.`
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
  if (s.cold.plants <= 0 || !s.cold.plantList?.length) return
  const refund = Math.floor(plantCost(s) / COLD.plantGrowth)
  s.cold.plantList.pop()
  syncPlantCount(s)
  s.cash = round2(s.cash + refund)
  log(s, `Decommissioned a plant. ${cashLabel(refund)} refunded.`, 'info')
}

function autoShedNewestPlant(s: GameState) {
  if (s.cold.plants <= 0 || !s.cold.plantList?.length) return false
  const entry = s.cold.plantList.pop()!
  if (!s.cold.offlineList) s.cold.offlineList = []
  s.cold.offlineList.push(entry)
  syncPlantCount(s)
  s.cold.autoSheds += 1
  log(s, 'Auto-shed: newest cold plant taken offline until surplus returns.', 'warn')
  return true
}

/** Bring one shed plant back when the line has room for it (with a 5% margin). */
function restoreOfflinePlant(s: GameState) {
  if (!s.cold.offlineList?.length) return
  const entry = s.cold.offlineList[s.cold.offlineList.length - 1]!
  s.cold.plantList.push(entry)
  syncPlantCount(s)
  const ok = coldSupply(s) >= coldDemand(s) * 1.05
  s.cold.plantList.pop()
  syncPlantCount(s)
  if (!ok) return
  s.cold.offlineList.pop()
  s.cold.plantList.push(entry)
  syncPlantCount(s)
  log(s, 'Cold plant back online.', 'good')
}

/** Tunnel coverage: at least one tunnel plant online. */
export function hasTunnelCoverage(s: GameState): boolean {
  return plantCountOf(s, 'tunnel') > 0
}

/** True when a cooler log was signed within the recent window. */
export function coolerLogRecent(s: GameState): boolean {
  const c = s.depth?.cooler
  if (!c || c.lastSignedAt <= 0) return false
  return s.time - c.lastSignedAt <= DEPTH.coolerRecentLogSec
}

/**
 * FreshWay spoil pressure unless tunnel + recent signed log.
 * Callers gate on featured fresh facings. Missed logs raise the mul.
 */
export function freshWaySpoilMul(s: GameState): number {
  const fw = s.rivals?.freshway
  if (!fw || fw.bought) return 1
  // SAVE 32: a live soft flyer feeds FreshWay even when tunnel + log would otherwise hold it off.
  const soft = freshWaySoftFlyerMul(s)
  if (hasTunnelCoverage(s) && coolerLogRecent(s)) return soft
  const missed = s.depth?.cooler?.missed ?? 0
  return DEPTH.freshWaySpoilMul * (1 + missed * DEPTH.coolerMissedFreshWayMul) * soft
}

function ensureCooler(s: GameState) {
  if (!s.depth) return null
  if (!s.depth.cooler) {
    s.depth.cooler = { logsSigned: 0, nextDueAt: 0, missed: 0, lastSignedAt: 0 }
  }
  return s.depth.cooler
}

/** Plant Operator on the current Shift Board slot can auto-sign. */
export function plantOperatorOnCurrentShift(s: GameState): boolean {
  const ids = shiftStaffIds(s, currentShiftSlot(s))
  for (const id of ids) {
    const m = s.staff.find((x) => x.id === id)
    if (m?.role === 'plantOperator') return true
  }
  return false
}

export function signCoolerLog(s: GameState) {
  const c = ensureCooler(s)
  if (!c) return
  c.logsSigned += 1
  c.lastSignedAt = s.time
  c.nextDueAt = s.time + DEPTH.coolerLogGapSec
  if (s.depth) s.depth.blastSuppressesTunnelUntilLog = false
  log(s, `Cooler log signed (${c.logsSigned}/${DEPTH.coolerLogNeed}).`, 'good')
}

export function canSignCoolerLog(s: GameState): string | null {
  if (s.era < 3) return 'Cooler Log opens in Era 3.'
  if (s.cold.plants <= 0) return 'Need a plant online.'
  const c = s.depth?.cooler
  if (c && c.nextDueAt > 0 && s.time < c.nextDueAt) {
    return `Next log due in ${Math.ceil((c.nextDueAt - s.time) / 60)}m.`
  }
  return null
}

/** Schedule / auto-sign / miss cooler logs. */
export function tickCoolerLog(s: GameState, _dt: number) {
  if (s.era < 3 || s.cold.plants <= 0) return
  const c = ensureCooler(s)
  if (!c) return
  if (c.nextDueAt <= 0) {
    c.nextDueAt = s.time + DEPTH.coolerLogGapSec * 0.35
    return
  }
  if (s.time < c.nextDueAt) return
  // Due: plant operator on current shift auto-signs.
  if (plantOperatorOnCurrentShift(s)) {
    signCoolerLog(s)
    return
  }
  // Grace: one drill window, then miss.
  const grace = DEPTH.brownoutDrillDurationSec * 2
  if (s.time < c.nextDueAt + grace) return
  c.missed += 1
  c.nextDueAt = s.time + DEPTH.coolerLogGapSec
  s.cold.freshness = Math.max(COLD.freshnessFloor, s.cold.freshness * 0.85)
  log(s, `Cooler log missed (${c.missed}). Power dips get likelier and FreshWay spoils more produce.`, 'warn')
}

/**
 * SAVE 32: powered blast drains yield and suppresses the tunnel spoil cut until the next
 * signed Cooler log. Effective only while blast is still powered.
 */
export function blastSuppressesTunnel(s: GameState): boolean {
  if (!s.depth?.blastSuppressesTunnelUntilLog) return false
  return (s.cold.poweredKinds ?? []).includes('blast') && plantCountOf(s, 'blast') > 0
}

/** Fresh aisle age cut from tunnel + cold driver / staffed Fresh. */
export function tunnelFreshAgeMul(s: GameState): number {
  if (!hasTunnelCoverage(s)) return 1
  if (blastSuppressesTunnel(s)) return 1
  const freshStaffed = (s.depth?.departments?.fresh?.leadId ?? null) != null || roleCount(s, 'produceLead') > 0
  const driver = roleCount(s, 'coldDriver') > 0
  if (!freshStaffed && !driver) return 1
  return DEPTH.tunnelFreshAgeMul
}

/** Brownout drill: plantOperator clears; otherwise freshness dips. */
export function tickBrownoutDrill(s: GameState, dt: number) {
  if (s.era < 3 || s.cold.plants <= 0) return
  if (!s.depth) return
  if (s.depth.brownoutDrillAt <= 0) {
    s.depth.brownoutDrillAt = s.time + DEPTH.brownoutDrillGapSec
    return
  }
  if (s.time < s.depth.brownoutDrillAt) return
  // Drill active window
  const ends = s.depth.brownoutDrillAt + DEPTH.brownoutDrillDurationSec
  if (roleCount(s, 'plantOperator') > 0) {
    s.depth.drillsRun += 1
    s.depth.brownoutDrillAt = s.time + DEPTH.brownoutDrillGapSec
    log(s, 'Brownout drill cleared — plant operator on duty.', 'good')
    return
  }
  if (s.time >= ends) {
    s.depth.brownoutDrillAt = s.time + DEPTH.brownoutDrillGapSec
    s.cold.freshness = Math.max(COLD.freshnessFloor, s.cold.freshness * 0.7)
    log(s, 'Brownout drill failed — freshness dipped. Hire a plant operator.', 'warn')
    return
  }
  // Soft pressure during the window
  s.cold.freshness = Math.max(COLD.freshnessFloor, s.cold.freshness - 0.02 * dt)
}

export function canRunBrownoutDrill(s: GameState): string | null {
  if (s.era < 3) return 'Cold drills open in Era 3.'
  if (s.cold.plants <= 0) return 'Need a plant online.'
  return null
}

export function runBrownoutDrill(s: GameState) {
  if (!s.depth) return
  if (roleCount(s, 'plantOperator') > 0) {
    s.depth.drillsRun += 1
    s.depth.brownoutDrillAt = s.time + DEPTH.brownoutDrillGapSec
    log(s, 'Manual brownout drill survived.', 'good')
  } else {
    s.cold.freshness = Math.max(COLD.freshnessFloor, s.cold.freshness * 0.75)
    s.depth.brownoutDrillAt = s.time + DEPTH.brownoutDrillGapSec
    log(s, 'Drill without an operator — freshness took a hit.', 'warn')
  }
}

/** Freshness, Momentum, brownout floor, yield drain (blast only), mild plant income. */
export function tickCold(s: GameState, dt: number) {
  if (s.era < 3) return
  syncPlantCount(s)

  const supply = coldSupply(s)
  const demand = coldDemand(s)
  s.cold.surplus = supply - demand

  if (demand <= 0 && s.cold.plants <= 0 && s.cold.tanks <= 0) {
    s.cold.freshness = 1
    return
  }

  const immune = (s.late?.cryoImmuneUntil ?? 0) > s.time
  // plantOperator prevents brownout while on duty
  const operatorShield = roleCount(s, 'plantOperator') > 0
  const ratio = demand > 0 ? (immune || operatorShield ? Math.max(1, supply / demand) : supply / demand) : 1
  let freshness = ratio
  if (s.cold.browned) {
    freshness = Math.max(COLD.freshnessFloor, Math.min(freshness, 0.95))
  }

  if (ratio < 1) {
    if (!s.cold.browned) {
      s.cold.browned = true
      s.cold.brownouts += 1
      if (s.time - s.cold.lastBrownoutLogAt >= COLD.brownoutLogCooldown) {
        s.cold.lastBrownoutLogAt = s.time
        log(s, 'Power dip: freshness dropped to 25% and your cold bonus paused. A plant was switched off to cope.', 'warn')
      }
    }
    freshness = Math.max(COLD.freshnessFloor, freshness)
    autoShedNewestPlant(s)
  } else {
    restoreOfflinePlant(s)
    if (s.cold.browned && ratio >= 1) {
      s.cold.browned = false
      log(s, 'Power is back. Freshness is climbing and your cold bonus can resume.', 'good')
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
    if (s.cold.momentum > 1) {
      s.cold.momentum = Math.max(1, s.cold.momentum - COLD.momentumDecayPerSec * dt * 0.25)
    }
  }

  s.cold.freshness = freshness * (s.cold.momentumOn && !s.cold.browned ? Math.max(1, s.cold.momentum) : 1)
  s.cold.freshness = Math.max(COLD.freshnessFloor, s.cold.freshness)

  // Yield drain — powered blast plants only
  const blasts = poweredPlantCountOf(s, 'blast')
  if (blasts > 0 && s.cold.yieldLeft > 0) {
    const mul = s.cold.quadratic ? COLD.quadraticYieldMul : 1
    const policyMul =
      s.depth?.departments?.cold?.policy === 'blast' ? 1.15 : 1
    const drain = COLD.yieldDrainPerBlast * blasts * mul * policyMul * dt
    s.cold.yieldLeft = Math.max(0, s.cold.yieldLeft - drain)
    if (s.cold.yieldLeft <= 0) {
      log(s, 'The region’s supply is used up. You can now leave the region from Politics.', 'era')
    }
  }

  // Compressor income; tunnel/blast pay a lesser share — powered only
  const powered = poweredPlantTotal(s)
  if (powered > 0) {
    const mom = s.cold.momentumOn && !s.cold.browned && s.cold.freshness >= 1 ? s.cold.momentum : 1
    const compressors = poweredPlantCountOf(s, 'compressor')
    const other = powered - compressors
    const income =
      (COLD.plantCashIncome * compressors + COLD.plantCashIncome * 0.35 * other) *
      mom *
      statMul(s, 'plantIncome') *
      dt
    const bonus = Math.max(0, s.cold.surplus) * COLD.surplusCashMul * dt
    const yieldLaw = hasMutator(s, 'richerYield') ? HUNGRY_LAWS.richerYieldMul : 1
    const gain = (income + bonus) * (1 + s.prestigeCarry.appetite) * yieldLaw
    s.cash = round2(s.cash + gain)
    s.lifetimeRevenue += gain
  }

  tickBrownoutDrill(s, dt)
  tickCoolerLog(s, dt)
}

export function enableMomentum(s: GameState) {
  s.cold.momentumOn = true
  unlockMenu(s, 'cold')
  log(s, 'Momentum Clause active. Keep food fully fresh to grow your cold bonus.', 'memo')
}

export function enableQuadratic(s: GameState) {
  s.cold.quadratic = true
  log(s, 'County Emptying: each blast freezer uses supply twice as fast.', 'memo')
}

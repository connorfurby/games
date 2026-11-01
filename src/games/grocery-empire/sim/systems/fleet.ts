import { CHARTER_AXES, CHARTER_OPENER } from '../../content/lateEras'
import { FLEET, LOGISTICS } from '../balance'
import { clamp, log, round2, setEra, unlockMenu } from '../helpers'
import { chance } from '../rng'
import type { GameState } from '../state'

export function canOpenLane(s: GameState): string | null {
  if (s.era < 4 && !s.politics.leftRegion) return 'Leave the region first (Era 4).'
  const cash = LOGISTICS.laneCash * Math.pow(1.35, s.fleet.lanes)
  const ctl = LOGISTICS.laneControl * (1 + s.fleet.lanes)
  if (s.cash < cash && s.control < ctl) return `Need $${Math.ceil(cash)} or ${Math.ceil(ctl)} Control.`
  if (s.fuel < LOGISTICS.laneFuel * 0.5) return 'Fuel buffer too low to launch a lane.'
  return null
}

export function openLane(s: GameState) {
  const cash = Math.ceil(LOGISTICS.laneCash * Math.pow(1.35, s.fleet.lanes))
  const ctl = Math.ceil(LOGISTICS.laneControl * (1 + s.fleet.lanes))
  if (s.control >= ctl) s.control = round2(s.control - ctl)
  else s.cash = round2(s.cash - cash)
  s.fleet.lanes += 1
  unlockMenu(s, 'logistics')
  log(s, `Ocean lane #${s.fleet.lanes} chartered.`, 'good')
}

export function canBuyFuel(s: GameState): string | null {
  if (s.era < 4 && s.fleet.lanes <= 0 && !s.politics.leftRegion) return 'Logistics locked.'
  if (s.cash < LOGISTICS.fuelBuyCash) return `Need $${LOGISTICS.fuelBuyCash}.`
  return null
}

export function buyFuel(s: GameState) {
  s.cash = round2(s.cash - LOGISTICS.fuelBuyCash)
  const cap = LOGISTICS.fuelCapBase + (s.memos['fuel-buffer'] ? LOGISTICS.fuelCapPerBuffer : 0)
  s.fuel = Math.min(cap, s.fuel + LOGISTICS.fuelBuyUnit)
  log(s, `Fuel topped up to ${Math.floor(s.fuel)}.`, 'info')
}

export function canFranchise(s: GameState): string | null {
  if (s.fleet.lanes < 1) return 'Open a lane first.'
  if (s.cash < LOGISTICS.franchiseCash) return `Need $${LOGISTICS.franchiseCash}.`
  return null
}

export function openFranchise(s: GameState) {
  s.cash = round2(s.cash - LOGISTICS.franchiseCash)
  s.fleet.franchises += 1
  s.brand = clamp(s.brand - LOGISTICS.franchiseBrandHit, 0.05, 1)
  log(s, `Franchise #${s.fleet.franchises} signed. Brand drifts unless sealed.`, 'warn')
}

export function canLaunchBarge(s: GameState): string | null {
  if (s.era < 5 && !(s.memos['barge-berth'] > 0)) return 'Seed Barge Berth required.'
  if (s.cash < FLEET.bargeLaunchCash) return `Need $${FLEET.bargeLaunchCash}.`
  if (s.read < FLEET.bargeLaunchRead && !s.fleet.launched) {
    return `Need ${FLEET.bargeLaunchRead} Read to launch the first barge.`
  }
  return null
}

export function launchBarge(s: GameState) {
  s.cash = round2(s.cash - FLEET.bargeLaunchCash)
  if (!s.fleet.launched) {
    s.read = Math.max(0, s.read - FLEET.bargeLaunchRead)
    s.fleet.launched = true
  }
  s.fleet.barges += 1
  unlockMenu(s, 'fleet')
  if (s.era < 5) setEra(s, 5)
  log(s, `Seed barge #${s.fleet.barges} launched into the dark.`, 'era')
}

export function charterSpent(s: GameState): number {
  return Object.values(s.fleet.charter).reduce((a, n) => a + Math.max(0, n), 0)
}

export function refreshCharterCap(s: GameState) {
  s.fleet.charterCap = Math.floor(
    FLEET.charterBaseCap + s.fleet.legacy * FLEET.charterPerLegacy + s.read * 0.02,
  )
}

export function canBuyCharterPoint(s: GameState): string | null {
  if (!s.fleet.launched && s.fleet.barges <= 0) return 'Launch a barge first.'
  refreshCharterCap(s)
  const spent = charterSpent(s) + s.fleet.charterPool
  if (spent >= s.fleet.charterCap) return 'Charter cap reached. Earn Legacy or Read.'
  if (s.read < FLEET.readPerCharterPoint) return `Need ${FLEET.readPerCharterPoint} Read.`
  return null
}

export function buyCharterPoint(s: GameState) {
  s.read = Math.max(0, s.read - FLEET.readPerCharterPoint)
  s.fleet.charterPool += 1
  refreshCharterCap(s)
  log(s, `Charter pool +1 (cap ${s.fleet.charterCap}).`, 'info')
}

export function canAllocateCharter(s: GameState, axis: string, delta: number): string | null {
  if (!CHARTER_AXES.some((a) => a.id === axis)) return 'Unknown Charter axis.'
  const cur = s.fleet.charter[axis] ?? 0
  if (delta > 0) {
    if (s.fleet.charterPool < delta) return 'No unspent Charter points.'
  } else if (delta < 0) {
    if (cur + delta < 0) return 'Axis already at 0.'
  } else return 'No change.'
  return null
}

export function allocateCharter(s: GameState, axis: string, delta: number) {
  const cur = s.fleet.charter[axis] ?? 0
  if (delta > 0) {
    s.fleet.charterPool -= delta
    s.fleet.charter[axis] = cur + delta
  } else {
    s.fleet.charter[axis] = cur + delta
    s.fleet.charterPool -= delta // delta negative → pool increases
  }
  log(s, `Charter ${axis}: ${s.fleet.charter[axis]} (pool ${s.fleet.charterPool}).`, 'info')
}

/** Guardian safety preset — shell-heavy opener; one soft use path before extinction. */
export function canGuardianPreset(s: GameState): string | null {
  if (s.fleet.barges <= 0 && !s.fleet.launched) return 'No fleet.'
  if (s.fleet.guardianUsed && s.fleet.barges > FLEET.bargeSoftFloor) {
    return 'Guardian already applied this pressure cycle.'
  }
  return null
}

export function applyGuardianPreset(s: GameState) {
  refreshCharterCap(s)
  const total = Object.values(CHARTER_OPENER).reduce((a, n) => a + n, 0)
  // Refund current allocation into pool, then apply opener (clamped to cap)
  let refund = 0
  for (const a of CHARTER_AXES) {
    refund += s.fleet.charter[a.id] ?? 0
    s.fleet.charter[a.id] = 0
  }
  s.fleet.charterPool += refund
  let need = Math.min(total, s.fleet.charterCap)
  if (s.fleet.charterPool < need) {
    // Grant enough pool once under pressure (Guardian Shell spirit)
    s.fleet.charterPool = need
  }
  for (const a of CHARTER_AXES) {
    const want = CHARTER_OPENER[a.id] ?? 0
    const give = Math.min(want, s.fleet.charterPool, need)
    s.fleet.charter[a.id] = give
    s.fleet.charterPool -= give
    need -= give
  }
  // Soft-floor barges
  if (s.fleet.barges < FLEET.bargeSoftFloor && s.fleet.biomass > 0) {
    s.fleet.barges = FLEET.bargeSoftFloor
  }
  s.fleet.guardianUsed = true
  log(s, 'Guardian preset locked in. Last barge protected while biomass remains.', 'recovery')
}

export function canRebootFleet(s: GameState): string | null {
  if (!s.fleet.launched) return 'Fleet not launched.'
  const fee = Math.max(1000, s.cash * FLEET.rebootCashFrac)
  if (s.cash < fee) return `Need $${Math.ceil(fee)} reboot fee.`
  return null
}

export function rebootFleet(s: GameState) {
  const fee = round2(Math.max(1000, s.cash * FLEET.rebootCashFrac))
  s.cash = round2(s.cash - fee)
  let refund = 0
  for (const a of CHARTER_AXES) {
    refund += s.fleet.charter[a.id] ?? 0
    s.fleet.charter[a.id] = 0
  }
  s.fleet.charterPool += refund
  s.fleet.guardianUsed = false
  log(s, `Reboot Fleet: Charter refunded (${refund} pts). Fee $${fee.toFixed(0)}.`, 'memo')
}

export function startDriftWar(s: GameState) {
  s.fleet.warOn = true
  log(s, 'Off-Brand contact. Drift war started. Legacy is on the table.', 'era')
}

/** Logistics fuel burn + fleet harvest / replication / war. */
export function tickLogistics(s: GameState, dt: number) {
  if (s.era < 4 && s.fleet.lanes <= 0) return

  const cap = LOGISTICS.fuelCapBase + (s.memos['fuel-buffer'] ? LOGISTICS.fuelCapPerBuffer : 0)
  if (s.fleet.lanes > 0) {
    const burn = LOGISTICS.fuelBurnPerLanePerSec * s.fleet.lanes * dt
    s.fuel = Math.max(0, s.fuel - burn)
    if (s.fuel <= 0) {
      // Dry lanes idle — no brick
    } else {
      s.control = round2(s.control + s.fleet.lanes * 0.02 * dt)
      s.cash = round2(s.cash + s.fleet.lanes * 15 * dt * (0.5 + s.fuel / Math.max(1, cap)))
    }
  }

  // Control trickle from empire cash (very mild)
  if (s.era >= 4) {
    s.control = round2(s.control + s.cash * LOGISTICS.controlFromCash * dt)
  }

  if (s.fleet.franchises > 0) {
    s.brand = clamp(
      s.brand - LOGISTICS.brandDriftPerFranchise * s.fleet.franchises * dt,
      0.05,
      1,
    )
  }

  s.fuel = Math.min(cap, s.fuel)
}

export function tickFleet(s: GameState, dt: number) {
  if (s.era < 5 && !s.fleet.launched) return

  refreshCharterCap(s)

  const shell = s.fleet.charter.shell ?? 0
  const replication = s.fleet.charter.replication ?? 0
  const survey = s.fleet.charter.survey ?? 0
  const brandSeal = s.fleet.charter['brand-seal'] ?? 0

  // Harvest biomass → cash/rations analogue
  if (s.fleet.barges > 0 && s.fleet.biomass > 0) {
    const rate =
      FLEET.harvestPerBargePerSec *
      s.fleet.barges *
      (1 + survey * 0.08) *
      (1 + (s.fleet.charter.transit ?? 0) * 0.05) *
      dt
    const took = Math.min(s.fleet.biomass, rate)
    s.fleet.biomass = Math.max(0, s.fleet.biomass - took)
    s.cash = round2(s.cash + took * 2)
    s.lifetimeRevenue += took * 2
  }

  // Soft replication growth
  if (s.fleet.barges > 0 && replication > 0 && s.fleet.biomass > 0) {
    if (chance(s, Math.min(0.2, FLEET.replicationPerSec * replication * dt))) {
      s.fleet.barges += 1
      log(s, `Replication: barge count ${s.fleet.barges}.`, 'info')
    }
  }

  // Soft-floor: never delete last barge while biomass remains
  if (s.fleet.biomass > 0 && s.fleet.barges < FLEET.bargeSoftFloor) {
    s.fleet.barges = FLEET.bargeSoftFloor
  }

  if (s.fleet.warOn && s.fleet.barges > 0) {
    const resist = 1 + shell * 0.1 + brandSeal * 0.12
    s.fleet.legacy = round2(s.fleet.legacy + (FLEET.warLegacyGainPerSec / resist) * dt)
    if (chance(s, (FLEET.warBargeLossChance / resist) * dt * 60)) {
      if (s.fleet.barges > FLEET.bargeSoftFloor || s.fleet.biomass <= 0) {
        s.fleet.barges = Math.max(
          s.fleet.biomass > 0 ? FLEET.bargeSoftFloor : 0,
          s.fleet.barges - 1,
        )
        s.fleet.legacy = Math.max(0, round2(s.fleet.legacy - FLEET.warLegacyLossOnHit))
        log(s, `Drift hit. Barges ${s.fleet.barges}. Legacy nicked.`, 'warn')
        if (s.fleet.barges <= FLEET.bargeSoftFloor + 1 && !s.fleet.guardianUsed) {
          log(s, 'Fleet under pressure — Guardian preset available.', 'recovery')
        }
      } else {
        // Protected last barge
        s.fleet.legacy = round2(s.fleet.legacy + FLEET.driftWinLegacy * 0.05)
      }
    }
  }

  // Brand seal resists franchise drift
  if (brandSeal > 0 && s.brand < 1) {
    s.brand = clamp(s.brand + brandSeal * 0.002 * dt, 0, 1)
  }

  if (s.fleet.biomass <= 0 && s.fleet.launched) {
    if (s.era < 6) {
      setEra(s, 6)
      log(s, 'Universe biomass cleared. Universal Ration is waiting.', 'era')
    }
  }
}

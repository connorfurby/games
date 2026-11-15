import type { BillId } from '../content/depth'
import { isBargeClass, isLaneRouteId } from '../content/depth'
import type { Command, Check } from './commands'
import type { GameState, PlantKind } from './state'
import {
  buyPlant,
  buyTank,
  canBuyPlant,
  canBuyTank,
  canDecommissionPlant,
  canSetPlantPower,
  decommissionPlant,
  setPlantPower,
} from './systems/cold'
import {
  acquireRegion,
  canAcquire,
  canHireLobby,
  canLeaveRegion,
  canPassBill,
  hireLobby,
  leaveRegion,
  passBill,
} from './systems/politics'
import {
  allocateCharter,
  applyGuardianPreset,
  advanceDriftWar,
  buyCharterPoint,
  buyFuel,
  canAllocateCharter,
  canAdvanceDriftWar,
  canBuyCharterPoint,
  canBuyFuel,
  canFranchise,
  canGuardianPreset,
  canDispatchHauler,
  canLaunchBarge,
  canOpenLane,
  canPromoteSteward,
  canRebootFleet,
  canSetManifest,
  canSwearExam,
  canStampLedger,
  canWinBackFranchise,
  dispatchHauler,
  launchBarge,
  openFranchise,
  openLane,
  promoteSteward,
  rebootFleet,
  setManifest,
  stampLedger,
  startDriftWar,
  swearExam,
  winBackFranchise,
} from './systems/fleet'
import {
  acceptEnding,
  canAcceptEnding,
  canRejectEnding,
  rejectEnding,
} from './systems/endings'
import { HUNGRY_LAWS } from './balance'
import { isHungryMutatorId } from '../content/lateEras'
import type { PrestigeMutatorId } from './state'
import { log } from './helpers'

const ok: Check = { ok: true }
const no = (reason: string): Check => ({ ok: false, reason })

function sanitizeMutators(raw: unknown): PrestigeMutatorId[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: PrestigeMutatorId[] = []
  for (const id of raw) {
    if (typeof id !== 'string' || !isHungryMutatorId(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= HUNGRY_LAWS.maxMutators) break
  }
  return out
}

type EraLateCmd =
  | Extract<Command, { type: 'buyPlant' }>
  | Extract<Command, { type: 'setPlantPower' }>
  | Extract<Command, { type: 'buyTank' }>
  | Extract<Command, { type: 'decommissionPlant' }>
  | Extract<Command, { type: 'hireLobby' }>
  | Extract<Command, { type: 'acquireRegion' }>
  | Extract<Command, { type: 'leaveRegion' }>
  | Extract<Command, { type: 'passBill' }>
  | Extract<Command, { type: 'openLane' }>
  | Extract<Command, { type: 'buyFuel' }>
  | Extract<Command, { type: 'openFranchise' }>
  | Extract<Command, { type: 'winBackFranchise' }>
  | Extract<Command, { type: 'setManifest' }>
  | Extract<Command, { type: 'swearExam' }>
  | Extract<Command, { type: 'stampLedger' }>
  | Extract<Command, { type: 'launchBarge' }>
  | Extract<Command, { type: 'dispatchHauler' }>
  | Extract<Command, { type: 'buyCharter' }>
  | Extract<Command, { type: 'setCharterAxis' }>
  | Extract<Command, { type: 'applyGuardian' }>
  | Extract<Command, { type: 'rebootFleet' }>
  | Extract<Command, { type: 'startDriftWar' }>
  | Extract<Command, { type: 'advanceDriftWar' }>
  | Extract<Command, { type: 'promoteSteward' }>
  | Extract<Command, { type: 'acceptEnding' }>
  | Extract<Command, { type: 'rejectEnding' }>
  | Extract<Command, { type: 'clearPendingAccept' }>
  | Extract<Command, { type: 'confirmHungryLaws' }>

type EraLateHandler<C extends EraLateCmd = EraLateCmd> = {
  can: (s: GameState, cmd: C) => Check
  run: (s: GameState, cmd: C) => void
}

export const eraLateHandlers: {
  [K in EraLateCmd['type']]: EraLateHandler<Extract<EraLateCmd, { type: K }>>
} = {
  buyPlant: {
    can: (s, cmd) => {
      const kind = (cmd.kind ?? 'compressor') as PlantKind
      const r = canBuyPlant(s, kind)
      return r ? no(r) : ok
    },
    run: (s, cmd) => buyPlant(s, (cmd.kind ?? 'compressor') as PlantKind),
  },
  setPlantPower: {
    can: (s, cmd) => {
      const r = canSetPlantPower(s, cmd.kinds ?? [])
      return r ? no(r) : ok
    },
    run: (s, cmd) => setPlantPower(s, cmd.kinds ?? []),
  },
  passBill: {
    can: (s, cmd) => {
      const r = canPassBill(s, cmd.id as BillId)
      return r ? no(r) : ok
    },
    run: (s, cmd) => passBill(s, cmd.id as BillId),
  },
  buyTank: {
    can: (s) => {
      const r = canBuyTank(s)
      return r ? no(r) : ok
    },
    run: (s) => buyTank(s),
  },
  decommissionPlant: {
    can: (s) => {
      const r = canDecommissionPlant(s)
      return r ? no(r) : ok
    },
    run: (s) => decommissionPlant(s),
  },
  hireLobby: {
    can: (s) => {
      const r = canHireLobby(s)
      return r ? no(r) : ok
    },
    run: (s) => hireLobby(s),
  },
  acquireRegion: {
    can: (s) => {
      const r = canAcquire(s)
      return r ? no(r) : ok
    },
    run: (s) => acquireRegion(s),
  },
  leaveRegion: {
    can: (s) => {
      const r = canLeaveRegion(s)
      return r ? no(r) : ok
    },
    run: (s) => leaveRegion(s),
  },
  openLane: {
    can: (s, cmd) => {
      const route = cmd.route && isLaneRouteId(cmd.route) ? cmd.route : 'spice-route'
      const r = canOpenLane(s, route)
      return r ? no(r) : ok
    },
    run: (s, cmd) => {
      const route = cmd.route && isLaneRouteId(cmd.route) ? cmd.route : 'spice-route'
      openLane(s, route)
    },
  },
  buyFuel: {
    can: (s) => {
      const r = canBuyFuel(s)
      return r ? no(r) : ok
    },
    run: (s) => buyFuel(s),
  },
  openFranchise: {
    can: (s) => {
      const r = canFranchise(s)
      return r ? no(r) : ok
    },
    run: (s) => openFranchise(s),
  },
  winBackFranchise: {
    can: (s, cmd) => {
      const r = canWinBackFranchise(s, cmd.franchiseId)
      return r ? no(r) : ok
    },
    run: (s, cmd) => winBackFranchise(s, cmd.franchiseId),
  },
  setManifest: {
    can: (s, cmd) => {
      const r = canSetManifest(s, cmd.laneId, cmd.mix)
      return r ? no(r) : ok
    },
    run: (s, cmd) => setManifest(s, cmd.laneId, cmd.mix),
  },
  swearExam: {
    can: (s) => {
      const r = canSwearExam(s)
      return r ? no(r) : ok
    },
    run: (s) => swearExam(s),
  },
  stampLedger: {
    can: (s) => {
      const r = canStampLedger(s)
      return r ? no(r) : ok
    },
    run: (s) => stampLedger(s),
  },
  launchBarge: {
    can: (s, cmd) => {
      const cls = cmd.class && isBargeClass(cmd.class) ? cmd.class : 'hauler'
      const r = canLaunchBarge(s, cls)
      return r ? no(r) : ok
    },
    run: (s, cmd) => {
      const cls = cmd.class && isBargeClass(cmd.class) ? cmd.class : 'hauler'
      launchBarge(s, cls)
    },
  },
  dispatchHauler: {
    can: (s, cmd) => {
      const r = canDispatchHauler(s, {
        bargeId: cmd.bargeId,
        pocketId: cmd.pocketId,
        class: cmd.class,
        loadRation: cmd.loadRation,
      })
      return r ? no(r) : ok
    },
    run: (s, cmd) =>
      dispatchHauler(s, {
        bargeId: cmd.bargeId,
        pocketId: cmd.pocketId,
        class: cmd.class,
        loadRation: cmd.loadRation,
      }),
  },
  buyCharter: {
    can: (s) => {
      const r = canBuyCharterPoint(s)
      return r ? no(r) : ok
    },
    run: (s) => buyCharterPoint(s),
  },
  setCharterAxis: {
    can: (s, cmd) => {
      const delta = Math.trunc(cmd.delta)
      const r = canAllocateCharter(s, cmd.axis, delta)
      return r ? no(r) : ok
    },
    run: (s, cmd) => allocateCharter(s, cmd.axis, Math.trunc(cmd.delta)),
  },
  applyGuardian: {
    can: (s) => {
      const r = canGuardianPreset(s)
      return r ? no(r) : ok
    },
    run: (s) => applyGuardianPreset(s),
  },
  rebootFleet: {
    can: (s) => {
      const r = canRebootFleet(s)
      return r ? no(r) : ok
    },
    run: (s) => rebootFleet(s),
  },
  startDriftWar: {
    can: (s) => {
      if (!s.fleet.launched && s.fleet.barges <= 0) return no('Launch a barge first.')
      if (s.fleet.warOn && (s.depth?.driftWar?.step ?? 0) >= 1) return no('Drift war already on.')
      return ok
    },
    run: (s) => startDriftWar(s),
  },
  advanceDriftWar: {
    can: (s) => {
      const r = canAdvanceDriftWar(s)
      return r ? no(r) : ok
    },
    run: (s) => advanceDriftWar(s),
  },
  promoteSteward: {
    can: (s, cmd) => {
      const r = canPromoteSteward(s, cmd.staffId)
      return r ? no(r) : ok
    },
    run: (s, cmd) => promoteSteward(s, cmd.staffId),
  },
  acceptEnding: {
    can: (s) => {
      const r = canAcceptEnding(s)
      return r ? no(r) : ok
    },
    run: (s) => acceptEnding(s),
  },
  rejectEnding: {
    can: (s) => {
      const r = canRejectEnding(s)
      return r ? no(r) : ok
    },
    run: (s) => rejectEnding(s),
  },
  clearPendingAccept: {
    can: (s) => (s.pendingAccept ? ok : no('Nothing pending.')),
    run: (s) => {
      s.pendingAccept = false
    },
  },
  confirmHungryLaws: {
    can: (s) => (s.pendingAccept ? ok : no('Nothing pending.')),
    run: (s, cmd) => {
      const mutators = sanitizeMutators(cmd.mutators)
      s.prestigeCarry.mutators = mutators
      s.pendingAccept = false
      if (mutators.length === 0) {
        log(s, 'Hungry laws: none. Universe opens under default physics.', 'era')
      } else {
        log(s, `Hungry laws locked: ${mutators.join(', ')}.`, 'era')
      }
    },
  },
}

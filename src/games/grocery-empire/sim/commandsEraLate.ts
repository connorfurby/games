import type { Command, Check } from './commands'
import type { GameState } from './state'
import {
  buyPlant,
  buyTank,
  canBuyPlant,
  canBuyTank,
  canDecommissionPlant,
  decommissionPlant,
} from './systems/cold'
import {
  acquireRegion,
  canAcquire,
  canHireLobby,
  canLeaveRegion,
  hireLobby,
  leaveRegion,
} from './systems/politics'
import {
  allocateCharter,
  applyGuardianPreset,
  buyCharterPoint,
  buyFuel,
  canAllocateCharter,
  canBuyCharterPoint,
  canBuyFuel,
  canFranchise,
  canGuardianPreset,
  canLaunchBarge,
  canOpenLane,
  canRebootFleet,
  launchBarge,
  openFranchise,
  openLane,
  rebootFleet,
  startDriftWar,
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
  | Extract<Command, { type: 'buyTank' }>
  | Extract<Command, { type: 'decommissionPlant' }>
  | Extract<Command, { type: 'hireLobby' }>
  | Extract<Command, { type: 'acquireRegion' }>
  | Extract<Command, { type: 'leaveRegion' }>
  | Extract<Command, { type: 'openLane' }>
  | Extract<Command, { type: 'buyFuel' }>
  | Extract<Command, { type: 'openFranchise' }>
  | Extract<Command, { type: 'launchBarge' }>
  | Extract<Command, { type: 'buyCharter' }>
  | Extract<Command, { type: 'setCharterAxis' }>
  | Extract<Command, { type: 'applyGuardian' }>
  | Extract<Command, { type: 'rebootFleet' }>
  | Extract<Command, { type: 'startDriftWar' }>
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
    can: (s) => {
      const r = canBuyPlant(s)
      return r ? no(r) : ok
    },
    run: (s) => buyPlant(s),
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
    can: (s) => {
      const r = canOpenLane(s)
      return r ? no(r) : ok
    },
    run: (s) => openLane(s),
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
  launchBarge: {
    can: (s) => {
      const r = canLaunchBarge(s)
      return r ? no(r) : ok
    },
    run: (s) => launchBarge(s),
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
      if (s.fleet.warOn) return no('Drift war already on.')
      return ok
    },
    run: (s) => startDriftWar(s),
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

import { can, type Command } from './commands'
import { DEPTH } from './balance'
import { roleCount } from './formulas'
import type { ManifestStance } from '../content/depth'
import { cleanCycleReady, examCycleReady, lanePreferMix } from './systems/fleet'
import type { GameState } from './state'

/** Era 4–6 campaign depth pushes: manifests, logistics hires, pockets, steward, board. */
export function pushFleetCampaign(s: GameState, cmds: Command[]): void {
  // Era 4–6 depth: manifests, logistics hires, win-backs, pockets, steward.
  if (s.era >= 4) {
    // SAVE 33 manifest stance — one filing is clean OR exam-ready OR fast (bot never files fast).
    // Prefer exam-ready while examHoldNeed is unmet and its clock is ready; otherwise clean while
    // cleans are short and the clean clock is ready. Each stance ticks its own 70-min clock, so
    // the bot files exam then clean inside the same cycle window and both gates keep pace.
    const d = s.depth?.dispatch
    const examNeeded = (d?.examsHeld ?? 0) < DEPTH.examHoldNeed
    const cleanNeeded = (d?.cleanManifests ?? 0) < DEPTH.cleanManifestsNeed
    const holdLive = !!d?.examLaneId && (d.examUntil ?? 0) > s.time
    if (can(s, { type: 'swearExam' }).ok) cmds.push({ type: 'swearExam' })
    let filed = false
    for (const lane of s.fleet.laneList ?? []) {
      if (filed) break
      const prefer = lanePreferMix(lane)
      if (!prefer) continue
      const matched = s.depth?.manifests?.[lane.id] === prefer
      const wantExam = examNeeded && examCycleReady(s) && !holdLive
      const wantClean = cleanNeeded && cleanCycleReady(s)
      const stance: ManifestStance | null = wantExam
        ? 'exam'
        : wantClean
          ? 'clean'
          : !matched && !holdLive
            ? 'exam' // just re-match the lane; the hold may slip harmlessly
            : null
      if (!stance) continue
      const c: Command = { type: 'setManifestStance', laneId: lane.id, stance }
      if (can(s, c).ok) {
        cmds.push(c)
        filed = true
      }
    }
    if (can(s, { type: 'stampLedger' }).ok) cmds.push({ type: 'stampLedger' })
    if (roleCount(s, 'dispatcher') < 1 && can(s, { type: 'hire', role: 'dispatcher' }).ok) {
      cmds.push({ type: 'hire', role: 'dispatcher' })
    } else if (roleCount(s, 'purser') < 1 && can(s, { type: 'hire', role: 'purser' }).ok) {
      cmds.push({ type: 'hire', role: 'purser' })
    }
    const defected = s.fleet.franchiseList?.find((f) => f.defected)
    if (defected && can(s, { type: 'winBackFranchise', franchiseId: defected.id }).ok) {
      cmds.push({ type: 'winBackFranchise', franchiseId: defected.id })
    }
    if (!(s.depth?.contracts && 'portBroker' in s.depth.contracts)) {
      if (can(s, { type: 'unlockContract', id: 'portBroker' }).ok) {
        cmds.push({ type: 'unlockContract', id: 'portBroker' })
      }
    } else if (!s.depth.contracts.portBroker && can(s, { type: 'setContract', id: 'portBroker', on: true }).ok) {
      cmds.push({ type: 'setContract', id: 'portBroker', on: true })
    }
    if (
      s.categories.import &&
      !s.depth?.flagship?.globeCredited &&
      can(s, { type: 'fileStandardFlagship' }).ok
    ) {
      cmds.push({ type: 'fileStandardFlagship' })
    }
    if ((s.fleet.franchiseList?.length ?? 0) < 1 && can(s, { type: 'openFranchise' }).ok) {
      cmds.push({ type: 'openFranchise' })
    }
  }
  if (s.era >= 5) {
    if (roleCount(s, 'pilot') < 1 && can(s, { type: 'hire', role: 'pilot' }).ok) {
      cmds.push({ type: 'hire', role: 'pilot' })
    }
    // Orbit on Mid — Era 6 gate.
    const orbitStaff =
      s.staff.find((m) => m.role === 'pilot') ??
      s.staff.find((m) => m.role === 'steward') ??
      s.staff.find((m) => m.role === 'hullTech')
    if (
      orbitStaff &&
      !s.depth?.orbitMidOnce &&
      !(s.depth?.shifts?.mid ?? []).includes(orbitStaff.id) &&
      can(s, { type: 'assignShift', slot: 'mid', staffId: orbitStaff.id }).ok
    ) {
      cmds.push({ type: 'assignShift', slot: 'mid', staffId: orbitStaff.id })
    }
    if (s.categories.ration && !s.depth?.facings?.ration) {
      const c: Command = { type: 'setFacing', cat: 'ration', facingId: 'standard-pack' }
      if (can(s, c).ok) cmds.push(c)
    }
    if ((s.depth?.driftWar?.step ?? 0) < 3 && s.fleet.warOn) {
      if (can(s, { type: 'advanceDriftWar' }).ok) cmds.push({ type: 'advanceDriftWar' })
    } else if (s.fleet.launched && !s.fleet.warOn && can(s, { type: 'startDriftWar' }).ok) {
      cmds.push({ type: 'startDriftWar' })
    }
    // Pocket Ops: one en-route trip at a time (human parallel path is faster).
    const enroute = (s.fleet.trips ?? []).filter((t) => t.status === 'enroute')
    if (enroute.length === 0) {
      const openPockets = (s.fleet.pockets ?? []).filter((p) => p.left > 0)
      const busy = new Set(enroute.map((t) => t.bargeId))
      const h = (s.fleet.bargeList ?? []).find((b) => b.class === 'hauler' && !busy.has(b.id))
      const pocket =
        (h?.ration ? openPockets.find((p) => p.ration === h.ration) : undefined) ?? openPockets[0]
      if (h && pocket) {
        const c: Command = {
          type: 'dispatchHauler',
          bargeId: h.id,
          pocketId: pocket.id,
          loadRation: pocket.ration,
        }
        if (can(s, c).ok) cmds.push(c)
      }
    }
  }
  if (s.era >= 6) {
    if (s.depth?.stewardId == null) {
      const lead =
        s.staff.find((m) => m.role === 'steward') ??
        s.staff.find((m) => m.role === 'pilot') ??
        s.staff.find((m) => m.role === 'storeManager')
      if (lead && can(s, { type: 'promoteSteward', staffId: lead.id }).ok) {
        cmds.push({ type: 'promoteSteward', staffId: lead.id })
      } else if (can(s, { type: 'hire', role: 'steward' }).ok) {
        cmds.push({ type: 'hire', role: 'steward' })
      }
    }
    // Continue Horizon needs Incorporate → board agenda → steward.
    if (!s.incorporated && can(s, { type: 'incorporate' }).ok) {
      cmds.push({ type: 'incorporate' })
    }
    if (
      s.incorporated &&
      (s.stats.boardMeetings ?? 0) < 1 &&
      !(s.board.lastResolvedAt > 0) &&
      can(s, { type: 'resolveBoard', agenda: 'expand' }).ok
    ) {
      cmds.push({ type: 'resolveBoard', agenda: 'expand' })
    }
  }
}

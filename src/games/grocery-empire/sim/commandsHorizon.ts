import { RARITIES, RARITY_INFO, RELIC_BY_ID, type Rarity } from '../content/relics'
import { effectiveLitWings, socketCapOf, wingLightBlock } from '../content/relicPerks'
import { HORIZON } from './balance'
import type { Check, Command } from './commands'
import { relicLevelCost } from './museum'
import type { GameState } from './state'
import {
  acceptLastAisle,
  buyGreenhouse,
  buyRelay,
  buyoutKeel,
  canAcceptLastAisle,
  canBuyGreenhouse,
  canBuyRelay,
  canBuyoutKeel,
  canClearCircuit,
  canCommitPhrase,
  canContinueHorizon,
  canFileStandardConvoy,
  canFileStandardCross,
  canFileStandardList,
  canFileStandardPhrase,
  canFileStandardPlanogram,
  canFillLastLine,
  canFireAgent,
  canHarvestPlot,
  canHelpHeadline,
  canHireAgent,
  canIgnoreHeadline,
  canLaunchProbe,
  canNameCluster,
  canOpenCircuit,
  canOpenEmbassy,
  canPlantCross,
  canPriceWarKeel,
  canRejectLastAisle,
  canSetAgentHabit,
  canSetCharter,
  canSetConvoy,
  canSetDeputy,
  canSetPlanetPrice,
  canSetPlanogram,
  canSetStandingRoute,
  canSetTaster,
  canSetVenturePolicy,
  canToggleClause,
  canUnsealHorizon,
  cancelQueue,
  clearCircuit,
  commitPhrase,
  continueHorizon,
  fileStandardConvoy,
  fileStandardCross,
  fileStandardList,
  fileStandardPhrase,
  fileStandardPlanogram,
  fillLastLine,
  fireAgent,
  harvestPlot,
  helpHeadline,
  hireAgent,
  ignoreHeadline,
  launchProbe,
  nameCluster,
  openCircuit,
  openEmbassy,
  plantCross,
  priceWarKeel,
  queueBuild,
  rejectLastAisle,
  setAgentHabit,
  setCharter,
  setConvoy,
  setDeputy,
  setPlanetPrice,
  setPlanogram,
  setStandingRoute,
  setTaster,
  setVenturePolicy,
  toggleClause,
  unsealHorizon,
  canDoSeasonChore,
  doSeasonChore,
  canServeClimateNeighbor,
  serveClimateNeighbor,
  canSettleStop,
  settleStop,
  canHaulYield,
  haulYield,
  canSeatClause,
  seatClause,
  canRehearseAccept,
  rehearseAccept,
  canAnswerHearing,
  answerHearing,
  canClearHorizonRival,
  clearHorizonRival,
  proposePlanogram,
} from './systems/horizon'
import {
  canCoopOrder,
  canCryoTreaty,
  canJumpLane,
  coopOrder,
  cryoTreaty,
  broadcast,
  wireAd,
  canBroadcast,
  canWireAd,
  canOpenPlanetFranchise,
  canRestockOffworld,
  canUnpackBonded,
  canVaultSeed,
  jumpLane,
  openPlanetFranchise,
  restockOffworld,
  unpackBonded,
  vaultSeed,
} from './systems/late'
import { buyInstrument, canBuyInstrument } from './systems/lateHubs'

const ok: Check = { ok: true }
const no = (reason: string): Check => ({ ok: false, reason })
const gate = (reason: string | null): Check => (reason ? no(reason) : ok)

type HorizonCmd =
  | Extract<Command, { type: 'continueHorizon' }>
  | Extract<Command, { type: 'unsealHorizon' }>
  | Extract<Command, { type: 'launchProbe' }>
  | Extract<Command, { type: 'setPlanogram' }>
  | Extract<Command, { type: 'fileStandardPlanogram' }>
  | Extract<Command, { type: 'setPlanetPrice' }>
  | Extract<Command, { type: 'nameCluster' }>
  | Extract<Command, { type: 'openCircuit' }>
  | Extract<Command, { type: 'setConvoy' }>
  | Extract<Command, { type: 'fileStandardConvoy' }>
  | Extract<Command, { type: 'setStandingRoute' }>
  | Extract<Command, { type: 'clearCircuit' }>
  | Extract<Command, { type: 'priceWarKeel' }>
  | Extract<Command, { type: 'buyoutKeel' }>
  | Extract<Command, { type: 'buyGreenhouse' }>
  | Extract<Command, { type: 'plantCross' }>
  | Extract<Command, { type: 'fileStandardCross' }>
  | Extract<Command, { type: 'harvestPlot' }>
  | Extract<Command, { type: 'setTaster' }>
  | Extract<Command, { type: 'buyRelay' }>
  | Extract<Command, { type: 'commitPhrase' }>
  | Extract<Command, { type: 'fileStandardPhrase' }>
  | Extract<Command, { type: 'hireAgent' }>
  | Extract<Command, { type: 'setAgentHabit' }>
  | Extract<Command, { type: 'fireAgent' }>
  | Extract<Command, { type: 'toggleClause' }>
  | Extract<Command, { type: 'setCharter' }>
  | Extract<Command, { type: 'openEmbassy' }>
  | Extract<Command, { type: 'fillLastLine' }>
  | Extract<Command, { type: 'fileStandardList' }>
  | Extract<Command, { type: 'acceptLastAisle' }>
  | Extract<Command, { type: 'rejectLastAisle' }>
  | Extract<Command, { type: 'helpHeadline' }>
  | Extract<Command, { type: 'ignoreHeadline' }>
  | Extract<Command, { type: 'setVenturePolicy' }>
  | Extract<Command, { type: 'setDeputy' }>
  | Extract<Command, { type: 'queueBuild' }>
  | Extract<Command, { type: 'cancelQueue' }>
  | Extract<Command, { type: 'socketRelic' }>
  | Extract<Command, { type: 'unsocketRelic' }>
  | Extract<Command, { type: 'setWingSocket' }>
  | Extract<Command, { type: 'dustRelic' }>
  | Extract<Command, { type: 'setAutoDust' }>
  | Extract<Command, { type: 'levelRelic' }>
  | Extract<Command, { type: 'restockOffworld' }>
  | Extract<Command, { type: 'unpackBonded' }>
  | Extract<Command, { type: 'vaultSeed' }>
  | Extract<Command, { type: 'jumpLane' }>
  | Extract<Command, { type: 'openPlanetFranchise' }>
  | Extract<Command, { type: 'buyInstrument' }>
  | Extract<Command, { type: 'coopOrder' }>
  | Extract<Command, { type: 'cryoTreaty' }>
  | Extract<Command, { type: 'broadcast' }>
  | Extract<Command, { type: 'wireAd' }>
  | Extract<Command, { type: 'doSeasonChore' }>
  | Extract<Command, { type: 'serveClimateNeighbor' }>
  | Extract<Command, { type: 'settleStop' }>
  | Extract<Command, { type: 'haulYield' }>
  | Extract<Command, { type: 'seatClause' }>
  | Extract<Command, { type: 'rehearseAccept' }>
  | Extract<Command, { type: 'answerHearing' }>
  | Extract<Command, { type: 'clearHorizonRival' }>
  | Extract<Command, { type: 'proposePlanogram' }>

type HorizonHandler<C extends HorizonCmd = HorizonCmd> = {
  can: (s: GameState, cmd: C) => Check
  run: (s: GameState, cmd: C) => void
}

function socketCap(s: GameState): number {
  return socketCapOf(s)
}

/** Materialise the lit list (null = the first `cap` finished wings) so an edit has something to edit. */
function litList(s: GameState): string[] {
  return effectiveLitWings(s.relics.wings, s.relics.litWings, socketCap(s))
}

function levelBlock(s: GameState, id: string): string | null {
  const n = s.relics.owned[id] ?? 0
  const def = RELIC_BY_ID[id]
  if (!def || n <= 0) return 'That relic is not on the wall.'
  const level = s.relics.levels[id] ?? 1
  if (level >= HORIZON.relicLevelCap) return 'That relic is finished.'
  const next = level + 1
  if (next >= 4 && n < next - 2) return 'Needs another copy on the wall.'
  const cost = relicLevelCost(def.rarity, level)
  if (s.relics.dust < cost) return `Need ${cost} dust.`
  return null
}

export const horizonHandlers: {
  [K in HorizonCmd['type']]: HorizonHandler<Extract<HorizonCmd, { type: K }>>
} = {
  continueHorizon: {
    can: (s) => gate(canContinueHorizon(s)),
    run: (s) => {
      continueHorizon(s)
    },
  },
  unsealHorizon: {
    can: (s) => gate(canUnsealHorizon(s)),
    run: (s) => {
      unsealHorizon(s)
    },
  },
  launchProbe: {
    can: (s) => gate(canLaunchProbe(s)),
    run: (s) => {
      launchProbe(s)
    },
  },
  setPlanogram: {
    can: (s, cmd) => gate(canSetPlanogram(s, cmd.planetId, cmd.slots)),
    run: (s, cmd) => {
      setPlanogram(s, cmd.planetId, cmd.slots)
    },
  },
  fileStandardPlanogram: {
    can: (s, cmd) => gate(canFileStandardPlanogram(s, cmd.planetId)),
    run: (s, cmd) => {
      fileStandardPlanogram(s, cmd.planetId)
    },
  },
  setPlanetPrice: {
    can: (s, cmd) => gate(canSetPlanetPrice(s, cmd.planetId, cmd.price)),
    run: (s, cmd) => {
      setPlanetPrice(s, cmd.planetId, cmd.price)
    },
  },
  nameCluster: {
    can: (s, cmd) => gate(canNameCluster(s, cmd.name, cmd.policy)),
    run: (s, cmd) => {
      nameCluster(s, cmd.name, cmd.policy)
    },
  },
  openCircuit: {
    can: (s) => gate(canOpenCircuit(s)),
    run: (s) => {
      openCircuit(s)
    },
  },
  setConvoy: {
    can: (s, cmd) => gate(canSetConvoy(s, cmd.origin, cmd.stop, cmd.dest, cmd.good, cmd.load ?? [])),
    run: (s, cmd) => {
      setConvoy(s, cmd.origin, cmd.stop, cmd.dest, cmd.good, cmd.load ?? [], cmd.index)
    },
  },
  fileStandardConvoy: {
    can: (s) => gate(canFileStandardConvoy(s)),
    run: (s, cmd) => {
      fileStandardConvoy(s, cmd)
    },
  },
  setStandingRoute: {
    can: (s, cmd) => gate(canSetStandingRoute(s, cmd.index)),
    run: (s, cmd) => {
      setStandingRoute(s, cmd.index)
    },
  },
  clearCircuit: {
    can: (s, cmd) => gate(canClearCircuit(s, cmd.index)),
    run: (s, cmd) => {
      clearCircuit(s, cmd.index)
    },
  },
  priceWarKeel: {
    can: (s) => gate(canPriceWarKeel(s)),
    run: (s) => {
      priceWarKeel(s)
    },
  },
  buyoutKeel: {
    can: (s) => gate(canBuyoutKeel(s)),
    run: (s) => {
      buyoutKeel(s)
    },
  },
  buyGreenhouse: {
    can: (s) => gate(canBuyGreenhouse(s)),
    run: (s) => {
      buyGreenhouse(s)
    },
  },
  plantCross: {
    can: (s, cmd) => gate(canPlantCross(s, cmd.index, cmd.a, cmd.b)),
    run: (s, cmd) => {
      plantCross(s, cmd.index, cmd.a, cmd.b)
    },
  },
  fileStandardCross: {
    can: (s, cmd) => gate(canFileStandardCross(s, cmd.index)),
    run: (s, cmd) => {
      fileStandardCross(s, cmd.index)
    },
  },
  harvestPlot: {
    can: (s, cmd) => gate(canHarvestPlot(s, cmd.index)),
    run: (s, cmd) => {
      harvestPlot(s, cmd.index)
    },
  },
  setTaster: {
    can: (s, cmd) => gate(canSetTaster(s, cmd.taster)),
    run: (s, cmd) => {
      setTaster(s, cmd.taster)
    },
  },
  buyRelay: {
    can: (s) => gate(canBuyRelay(s)),
    run: (s) => {
      buyRelay(s)
    },
  },
  commitPhrase: {
    can: (s, cmd) => gate(canCommitPhrase(s, cmd.symbols)),
    run: (s, cmd) => {
      commitPhrase(s, cmd.symbols)
    },
  },
  fileStandardPhrase: {
    can: (s) => gate(canFileStandardPhrase(s)),
    run: (s) => {
      fileStandardPhrase(s)
    },
  },
  hireAgent: {
    can: (s, cmd) => gate(canHireAgent(s, cmd.habit ?? 'price')),
    run: (s, cmd) => {
      hireAgent(s, cmd.habit ?? 'price')
    },
  },
  setAgentHabit: {
    can: (s, cmd) => gate(canSetAgentHabit(s, cmd.id, cmd.habit)),
    run: (s, cmd) => {
      setAgentHabit(s, cmd.id, cmd.habit)
    },
  },
  fireAgent: {
    can: (s, cmd) => gate(canFireAgent(s, cmd.id)),
    run: (s, cmd) => {
      fireAgent(s, cmd.id)
    },
  },
  toggleClause: {
    can: (s, cmd) => gate(canToggleClause(s, cmd.id)),
    run: (s, cmd) => {
      toggleClause(s, cmd.id)
    },
  },
  setCharter: {
    can: (s, cmd) => gate(canSetCharter(s, cmd.charter)),
    run: (s, cmd) => {
      setCharter(s, cmd.charter)
    },
  },
  openEmbassy: {
    can: (s) => gate(canOpenEmbassy(s)),
    run: (s) => {
      openEmbassy(s)
    },
  },
  fillLastLine: {
    can: (s, cmd) => gate(canFillLastLine(s, cmd.index, cmd.filled)),
    run: (s, cmd) => {
      fillLastLine(s, cmd.index, cmd.filled)
    },
  },
  fileStandardList: {
    can: (s) => gate(canFileStandardList(s)),
    run: (s) => {
      fileStandardList(s)
    },
  },
  acceptLastAisle: {
    can: (s) => gate(canAcceptLastAisle(s)),
    run: (s) => {
      acceptLastAisle(s)
    },
  },
  rejectLastAisle: {
    can: (s) => gate(canRejectLastAisle(s)),
    run: (s) => {
      rejectLastAisle(s)
    },
  },
  helpHeadline: {
    can: (s) => gate(canHelpHeadline(s)),
    run: (s) => {
      helpHeadline(s)
    },
  },
  ignoreHeadline: {
    can: (s) => gate(canIgnoreHeadline(s)),
    run: (s) => {
      ignoreHeadline(s)
    },
  },
  setVenturePolicy: {
    can: (s, cmd) => gate(canSetVenturePolicy(s, cmd.id, cmd.policy)),
    run: (s, cmd) => {
      setVenturePolicy(s, cmd.id, cmd.policy)
    },
  },
  setDeputy: {
    can: (s, cmd) => gate(canSetDeputy(s, cmd.staffId)),
    run: (s, cmd) => {
      setDeputy(s, cmd.staffId, cmd.on)
    },
  },
  queueBuild: {
    can: (_s, cmd) => gate(cmd.id.trim() ? null : 'Name the build.'),
    run: (s, cmd) => {
      queueBuild(s, cmd.id)
    },
  },
  cancelQueue: {
    can: () => ok,
    run: (s) => {
      cancelQueue(s)
    },
  },
  socketRelic: {
    can: (s, cmd) => {
      if (!(s.relics.owned[cmd.id] > 0)) return no('That relic is not on the wall.')
      if (s.relics.sockets.includes(cmd.id)) return no('Already socketed.')
      if (s.relics.sockets.length >= socketCap(s)) return no('Every socket is full.')
      return ok
    },
    run: (s, cmd) => {
      s.relics.sockets.push(cmd.id)
    },
  },
  unsocketRelic: {
    can: (s, cmd) => (s.relics.sockets.includes(cmd.id) ? ok : no('That relic is not socketed.')),
    run: (s, cmd) => {
      s.relics.sockets = s.relics.sockets.filter((id) => id !== cmd.id)
    },
  },
  setWingSocket: {
    can: (s, cmd) => {
      const cap = socketCap(s)
      if (!cmd.on) {
        if (!litList(s).includes(cmd.wing)) return no('That wing is already dark.')
        return ok
      }
      // Lighting a wing at full needs another wing left dark: name it with `swapOut`.
      const lit = litList(s)
      if (cmd.swapOut) {
        if (cmd.swapOut === cmd.wing) return no('Leave a different wing dark.')
        if (!lit.includes(cmd.swapOut)) return no('That wing is already dark.')
        const after = lit.filter((w) => w !== cmd.swapOut)
        const why = wingLightBlock(s.relics.wings, after, cap, cmd.wing)
        return why ? no(why) : ok
      }
      const why = wingLightBlock(s.relics.wings, lit, cap, cmd.wing)
      return why ? no(why) : ok
    },
    run: (s, cmd) => {
      let lit = litList(s)
      if (!cmd.on) lit = lit.filter((w) => w !== cmd.wing)
      else {
        if (cmd.swapOut) lit = lit.filter((w) => w !== cmd.swapOut)
        lit = [...lit, cmd.wing]
      }
      s.relics.litWings = lit
    },
  },
  dustRelic: {
    can: (s, cmd) => {
      const n = s.relics.owned[cmd.id] ?? 0
      if (n <= 1) return no('Keep the last copy.')
      return ok
    },
    run: (s, cmd) => {
      const def = RELIC_BY_ID[cmd.id]
      s.relics.owned[cmd.id] = (s.relics.owned[cmd.id] ?? 1) - 1
      if (def) s.relics.dust += RARITY_INFO[def.rarity].dust
    },
  },
  setAutoDust: {
    can: (_s, cmd) => {
      if (cmd.rarityCeiling == null) return ok
      if (!RARITIES.includes(cmd.rarityCeiling as Rarity)) return no('Unknown rarity.')
      return ok
    },
    run: (s, cmd) => {
      s.relics.autoDust = cmd.rarityCeiling
    },
  },
  levelRelic: {
    can: (s, cmd) => {
      const why = levelBlock(s, cmd.id)
      if (why) return no(why)
      return ok
    },
    run: (s, cmd) => {
      const times = Math.max(1, Math.floor(cmd.count ?? 1))
      for (let i = 0; i < times; i++) {
        if (levelBlock(s, cmd.id)) break
        const def = RELIC_BY_ID[cmd.id]
        if (!def) break
        const level = s.relics.levels[cmd.id] ?? 1
        s.relics.dust -= relicLevelCost(def.rarity, level)
        s.relics.levels[cmd.id] = level + 1
      }
    },
  },
  restockOffworld: {
    can: (s) => gate(canRestockOffworld(s)),
    run: (s) => {
      restockOffworld(s)
    },
  },
  unpackBonded: {
    can: (s, cmd) =>
      gate(canUnpackBonded(s, Math.max(1, Math.floor(cmd.count ?? 1)), cmd.kind)),
    run: (s, cmd) => {
      unpackBonded(s, Math.max(1, Math.floor(cmd.count ?? 1)), cmd.kind ?? 'dry')
    },
  },
  doSeasonChore: {
    can: (s, cmd) => gate(canDoSeasonChore(s, cmd.chore)),
    run: (s, cmd) => {
      doSeasonChore(s, cmd.chore)
    },
  },
  serveClimateNeighbor: {
    can: (s) => gate(canServeClimateNeighbor(s)),
    run: (s) => {
      serveClimateNeighbor(s)
    },
  },
  settleStop: {
    can: (s) => gate(canSettleStop(s)),
    run: (s) => {
      settleStop(s)
    },
  },
  haulYield: {
    can: (s) => gate(canHaulYield(s)),
    run: (s) => {
      haulYield(s)
    },
  },
  seatClause: {
    can: (s) => gate(canSeatClause(s)),
    run: (s) => {
      seatClause(s)
    },
  },
  rehearseAccept: {
    can: (s) => gate(canRehearseAccept(s)),
    run: (s) => {
      rehearseAccept(s)
    },
  },
  answerHearing: {
    can: (s) => gate(canAnswerHearing(s)),
    run: (s) => {
      answerHearing(s)
    },
  },
  clearHorizonRival: {
    can: (s, cmd) => gate(canClearHorizonRival(s, cmd.kind)),
    run: (s, cmd) => {
      clearHorizonRival(s, cmd.kind)
    },
  },
  proposePlanogram: {
    can: (s, cmd) => {
      if (!s.staff.some((m) => m.role === 'planogramClerk')) return no('Hire a Planogram Clerk first.')
      return gate(canSetPlanogram(s, cmd.planetId, ['can', 'can', 'can', 'can', 'can', 'can']))
    },
    run: (s, cmd) => {
      proposePlanogram(s, cmd.planetId)
    },
  },
  vaultSeed: {
    can: (s, cmd) => gate(canVaultSeed(s, cmd.amount)),
    run: (s, cmd) => {
      vaultSeed(s, cmd.amount)
    },
  },
  jumpLane: {
    can: (s) => gate(canJumpLane(s)),
    run: (s) => {
      jumpLane(s)
    },
  },
  openPlanetFranchise: {
    can: (s) => gate(canOpenPlanetFranchise(s)),
    run: (s) => {
      openPlanetFranchise(s)
    },
  },
  buyInstrument: {
    can: (s, cmd) => gate(canBuyInstrument(s, cmd.id)),
    run: (s, cmd) => {
      buyInstrument(s, cmd.id)
    },
  },
  coopOrder: {
    can: (s, cmd) => gate(canCoopOrder(s, cmd.cat ?? s.orderCat)),
    run: (s, cmd) => {
      coopOrder(s, cmd.cat ?? s.orderCat)
    },
  },
  cryoTreaty: {
    can: (s) => gate(canCryoTreaty(s)),
    run: (s) => {
      cryoTreaty(s)
    },
  },
  broadcast: {
    can: (s, cmd) => gate(canBroadcast(s, cmd.climate)),
    run: (s, cmd) => {
      broadcast(s, cmd.climate)
    },
  },
  wireAd: {
    can: (s) => gate(canWireAd(s)),
    run: (s) => {
      wireAd(s)
    },
  },
}

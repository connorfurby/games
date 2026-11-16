import type { MenuId } from '../../content/menus'
import type { Command } from '../../sim/commands'

/** Where a goal's one-click action lives. 'memos' = the Memos drawer. */
export type GoalDest = MenuId | 'memos'

const DEST: Record<string, GoalDest> = {
  unpack: 'floor',
  setFacing: 'floor',
  serveRegular: 'floor',
  fileStandardFlagship: 'floor',
  fileFlagshipPlanogram: 'floor',
  morningWriteOff: 'floor',
  setOpen: 'floor',
  hire: 'staff',
  assignShift: 'staff',
  buyBuild: 'build',
  expandLot: 'land',
  openStore: 'land',
  buyPlant: 'cold',
  cryoTreaty: 'cold',
  signCoolerLog: 'cold',
  acquireRegion: 'politics',
  openLane: 'logistics',
  setManifest: 'logistics',
  setManifestStance: 'logistics',
  swearExam: 'logistics',
  stampLedger: 'fleet',
  launchBarge: 'fleet',
  dispatchHauler: 'fleet',
  continueHorizon: 'fleet',
  buyMemo: 'memos',
  buyWholesale: 'suppliers',
  payInvoice: 'suppliers',
  dockCheckIn: 'suppliers',
  vaultSeed: 'backroom',
  unpackBonded: 'backroom',
  buyInstrument: 'invest',
  broadcast: 'marketing',
  wireAd: 'marketing',
  buyRelay: 'marketing',
  printFlyerWeek: 'marketing',
  buyAd: 'marketing',
  launchProbe: 'planets',
  fileStandardPlanogram: 'planets',
  serveClimateNeighbor: 'planets',
  openPlanetFranchise: 'land',
  fileStandardConvoy: 'exchange',
  settleStop: 'exchange',
  fileStandardCross: 'cultivars',
  doSeasonChore: 'cultivars',
  haulYield: 'cultivars',
  fileStandardPhrase: 'signal',
  hireAgent: 'signal',
  toggleClause: 'charter',
  seatClause: 'charter',
  setCharter: 'charter',
  answerHearing: 'charter',
  fileStandardList: 'lastaisle',
  rehearseAccept: 'lastaisle',
  acceptLastAisle: 'lastaisle',
}

export function goalDest(act: Command | null): GoalDest | null {
  if (!act) return null
  return DEST[act.type] ?? null
}

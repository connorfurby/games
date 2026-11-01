import { CATEGORY_IDS } from '../content/categories'
import { MENU_IDS, type MenuId } from '../content/menus'
import { TUTORIALS } from '../content/tutorials'
import {
  createInitialState,
  emptyCold,
  emptyFleet,
  emptyPolitics,
  type GameState,
} from './state'

export interface DevStageDef {
  id: string
  label: string
  blurb: string
  era: number
  build: () => GameState
}

function openMenus(s: GameState, ids: MenuId[]) {
  for (const id of ids) s.menus[id] = true
}

function markTutorialsDone(s: GameState, upToEra: number) {
  for (const t of TUTORIALS) {
    if (t.era <= upToEra) s.tutorials.done[t.id] = true
  }
  s.tutorials.queue = []
  s.tutorials.active = null
}

function stock(s: GameState, backroom: number, shelf: number) {
  s.backroom = [{ cat: 'cans', qty: backroom, age: 0 }]
  s.shelf = shelf > 0 ? [{ cat: 'cans', qty: shelf, age: 0 }] : []
}

function base(seed = 42_424): GameState {
  const s = createInitialState(seed)
  s.introSeen = true
  s.paused = false
  s.offlineReceipt = null
  s.chapterQueue = []
  s.ledger = []
  s.nextLedgerId = 1
  return s
}

function unlockCats(s: GameState, cats: Array<(typeof CATEGORY_IDS)[number]>) {
  for (const c of CATEGORY_IDS) s.categories[c] = false
  for (const c of cats) s.categories[c] = true
}

function era1Corner(): GameState {
  const s = base(42_100)
  s.era = 1
  markTutorialsDone(s, 1)
  openMenus(s, [
    'floor',
    'more',
    'suppliers',
    'books',
    'staff',
    'marketing',
    'backroom',
    'build',
    'upgrades',
    'coach',
    'empire',
  ])
  unlockCats(s, ['cans', 'produce'])
  s.baskets = 520
  s.cash = 400
  s.stats.sold = 520
  s.stats.hires = 1
  s.stats.adsBought = 2
  s.stats.memosDone = 8
  s.ads = 3
  s.adCost = 80
  s.staff = [{ id: 1, name: 'Dev Clerk', role: 'clerk', level: 2, xp: 10, hiredAt: 0 }]
  s.nextStaffId = 2
  s.compute.unlocked = true
  s.compute.attention = 1200
  s.compute.archives = 2
  s.compute.analysts = 1
  s.compute.reputation = 3
  s.memos['help-wanted'] = 1
  s.memos['flyer'] = 1
  s.memos['upgrades-binder'] = 1
  s.memos['back-office'] = 1
  s.memos['produce-cooler'] = 1
  stock(s, 120, 40)
  s.backroom.push({ cat: 'produce', qty: 30, age: 20 })
  s.builds.storefront = 2
  s.builds.storage = 2
  s.builds.cold = 1
  return s
}

function era2Chain(): GameState {
  const s = era1Corner()
  s.seed = 42_200
  s.rng = 42_200
  s.era = 2
  markTutorialsDone(s, 2)
  openMenus(s, ['invest', 'ventures', 'land', 'strategy'])
  unlockCats(s, ['cans', 'produce', 'dairy'])
  s.baskets = 2500
  s.cash = 5000
  s.lifetimeRevenue = 40_000
  s.stores = [
    {
      id: 's1',
      name: 'Flagship',
      level: 2,
      xp: 40,
      policy: 'standard',
      attentionShare: 0.6,
    },
    {
      id: 's2',
      name: 'Side Door',
      level: 1,
      xp: 5,
      policy: 'local',
      attentionShare: 0.4,
    },
  ]
  s.nextStoreId = 3
  s.stats.storesOpened = 2
  s.invest.unlocked = true
  s.invest.engineLevel = 2
  s.invest.balance = 800
  s.depot = true
  s.expansions['side-yard'] = 1
  s.memos['lot-survey'] = 1
  s.memos['passbook'] = 1
  s.memos['trading-desk'] = 1
  s.passbook.balance = 200
  s.compute.ideasUnlocked = true
  s.compute.ideas = 4
  return s
}

function era3Cold(): GameState {
  const s = era2Chain()
  s.seed = 42_300
  s.era = 3
  markTutorialsDone(s, 3)
  openMenus(s, ['cold', 'politics'])
  s.baskets = 12_000
  s.cash = 50_000
  s.cold = {
    ...emptyCold(),
    plants: 3,
    tanks: 4,
    freshness: 0.85,
    momentumOn: true,
    surplus: 200,
  }
  s.politics = {
    ...emptyPolitics(),
    capital: 12,
    lobby: 1,
  }
  s.memos['cold-plant-permit'] = 1
  s.memos['tank-farm'] = 1
  s.memos['momentum'] = 1
  s.memos['lobby-office'] = 1
  s.builds.cold = 3
  return s
}

function era4Globe(): GameState {
  const s = era3Cold()
  s.seed = 42_400
  s.era = 4
  markTutorialsDone(s, 4)
  openMenus(s, ['logistics'])
  s.baskets = 80_000
  s.cash = 250_000
  s.fuel = 40
  s.control = 8
  s.brand = 0.92
  s.politics.leftRegion = true
  s.memos['leave-region'] = 1
  s.memos['ocean-lane'] = 1
  s.memos['fuel-buffer'] = 1
  s.memos['control-tower'] = 1
  s.read = 40
  s.autonomous = true
  return s
}

function era5Fleet(): GameState {
  const s = era4Globe()
  s.seed = 42_500
  s.era = 5
  markTutorialsDone(s, 5)
  openMenus(s, ['fleet'])
  s.baskets = 400_000
  s.cash = 1_000_000
  s.fleet = {
    ...emptyFleet(),
    barges: 6,
    launched: true,
    legacy: 12,
    biomass: 40_000,
    biomassMax: 100_000,
    charterPool: 4,
    charterCap: 20,
    charter: {
      shell: 5,
      replication: 4,
      survey: 2,
      transit: 1,
      'brand-seal': 1,
    },
  }
  s.memos['barge-berth'] = 1
  s.memos['charter-opener'] = 1
  return s
}

export const DEV_STAGES: DevStageDef[] = [
  {
    id: 'fresh',
    label: 'Fresh New Game',
    blurb: 'Brand-new counter — intro cutscene still waiting.',
    era: 0,
    build: () => {
      const s = createInitialState(42_001)
      s.introSeen = false
      return s
    },
  },
  {
    id: 'era0-mid',
    label: 'Era 0 · Mid counter',
    blurb: 'Intro done, early tutorials cleared, ~80 baskets.',
    era: 0,
    build: () => {
      const s = base(42_010)
      markTutorialsDone(s, 0)
      openMenus(s, ['floor', 'more', 'suppliers', 'books', 'coach'])
      s.baskets = 80
      s.cash = 120
      s.stats.sold = 80
      s.stats.unpackedManual = 40
      s.stats.ordersPlaced = 6
      s.stats.ordersBelow85 = 2
      s.stats.priceChanges = 4
      s.stats.rentPaid = 1
      s.memos['ledger-tape'] = 1
      s.memos['box-cutter'] = 1
      s.memos['chalkboard'] = 1
      s.memoSeen['ledger-tape'] = true
      s.memoSeen['box-cutter'] = true
      s.memoSeen['chalkboard'] = true
      s.memoSeen['help-wanted'] = true
      s.memoSeen['hand-truck'] = true
      stock(s, 60, 24)
      s.upgrades['quick-hands'] = 1
      return s
    },
  },
  {
    id: 'era1-corner',
    label: 'Era 1 · Corner store',
    blurb: 'Staff, produce, ads, back office Attention.',
    era: 1,
    build: era1Corner,
  },
  {
    id: 'era2-chain',
    label: 'Era 2 · Chain',
    blurb: 'Second door energy — stores, invest, strategy unlocked.',
    era: 2,
    build: era2Chain,
  },
  {
    id: 'era3-cold',
    label: 'Era 3 · Cold chain',
    blurb: 'Plants, tanks, politics desk.',
    era: 3,
    build: era3Cold,
  },
  {
    id: 'era4-globe',
    label: 'Era 4 · Globe',
    blurb: 'Lanes, fuel, Control — autonomous pressure.',
    era: 4,
    build: era4Globe,
  },
  {
    id: 'era5-fleet',
    label: 'Era 5 · Seed barges',
    blurb: 'Fleet live with Charter points and Legacy.',
    era: 5,
    build: era5Fleet,
  },
  {
    id: 'era6-ending',
    label: 'Era 6 · Ending ready',
    blurb: 'Universal Ration open — Accept / Reject testable.',
    era: 6,
    build: () => {
      const s = era5Fleet()
      s.seed = 42_600
      s.era = 6
      markTutorialsDone(s, 6)
      s.baskets = 1_000_000
      s.fleet.biomass = s.fleet.biomassMax
      s.memos['universal-ration'] = 1
      s.endingChoice = null
      s.pendingAccept = false
      return s
    },
  },
  {
    id: 'cash-rich',
    label: 'Sandbox · Cash rich',
    blurb: 'Era 1 tools + huge cash to buy memos/upgrades freely.',
    era: 1,
    build: () => {
      const s = era1Corner()
      s.seed = 42_777
      s.cash = 1_000_000
      s.compute.attention = 50_000
      s.compute.ideas = 50
      s.compute.reputation = 20
      return s
    },
  },
  {
    id: 'recovery',
    label: 'Sandbox · Recovery rails',
    blurb: 'Empty shelf, low cash — test bailouts / emergency / mentor.',
    era: 0,
    build: () => {
      const s = base(42_666)
      markTutorialsDone(s, 0)
      openMenus(s, ['floor', 'more', 'suppliers', 'coach'])
      s.baskets = 30
      s.cash = 1.5
      s.arrears = 40
      stock(s, 0, 0)
      s.stats.sold = 30
      return s
    },
  },
]

export function listDevStages(): DevStageDef[] {
  return DEV_STAGES
}

export function buildDevStage(id: string): GameState | null {
  const def = DEV_STAGES.find((d) => d.id === id)
  return def ? def.build() : null
}

/** Open every department menu (debug). */
export function unlockAllMenus(s: GameState) {
  for (const id of MENU_IDS) s.menus[id] = true
}

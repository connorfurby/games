import type { GameState } from '../sim/state'

/** Live player checklist drawer (plan Part H2). */

export interface ChecklistItem {
  id: string
  era: number
  label: string
  test: (s: GameState) => boolean
}

const floorUpgradeBought = (s: GameState) =>
  ['quick-hands', 'basket-size', 'shelf-depth', 'price-iq', 'hold-unpack', 'endcap-design'].some(
    (id) => (s.upgrades[id] ?? 0) > 0,
  )

export const PLAYER_CHECKLIST: ChecklistItem[] = [
  // ── Era 0 ────────────────────────────────────────────────────────────────
  {
    id: 'e0-unpack-tut',
    era: 0,
    label: 'Finish Unpack tutorial',
    test: (s) => !!s.tutorials.done['unpack'],
  },
  {
    id: 'e0-price-tut',
    era: 0,
    label: 'Finish Price tutorial',
    test: (s) => !!s.tutorials.done['price'],
  },
  {
    id: 'e0-first-basket',
    era: 0,
    label: 'Sell first basket',
    test: (s) => s.baskets >= 1 || s.stats.sold >= 1,
  },
  {
    id: 'e0-wholesale-85',
    era: 0,
    label: 'Buy wholesale below $0.85',
    test: (s) => s.stats.ordersBelow85 >= 1,
  },
  {
    id: 'e0-hire-clerk',
    era: 0,
    label: 'Hire clerk',
    test: (s) => s.staff.some((m) => m.role === 'clerk') || s.stats.hires >= 1,
  },

  // ── Era 1 ────────────────────────────────────────────────────────────────
  {
    id: 'e1-build-menu',
    era: 1,
    label: 'Open Build menu (tutorial)',
    test: (s) => !!s.menus.build || !!s.tutorials.done['build'],
  },
  {
    id: 'e1-floor-upgrade',
    era: 1,
    label: 'Open Upgrades menu; buy one Floor upgrade',
    test: (s) => !!s.menus.upgrades && floorUpgradeBought(s),
  },
  {
    id: 'e1-produce',
    era: 1,
    label: 'Unlock produce without panic (recovery OK)',
    test: (s) => s.categories.produce,
  },
  {
    id: 'e1-coffee',
    era: 1,
    label: 'Start coffee-cart venture',
    test: (s) => (s.ventures.coffee?.level ?? 0) >= 1,
  },
  {
    id: 'e1-ledger-tape',
    era: 1,
    label: 'Buy Ledger tape',
    test: (s) => (s.memos['ledger-tape'] ?? 0) > 0,
  },
  {
    id: 'e1-archives',
    era: 1,
    label: 'Fill Archives once',
    test: (s) => s.stats.attentionFilled >= 1,
  },
  {
    id: 'e1-inspection',
    era: 1,
    label: 'Clear or wait out an inspection',
    test: (s) => s.stats.inspections + s.stats.inspectionsFailed + s.stats.inspectorCalls >= 1,
  },
  {
    id: 'e1-passbook',
    era: 1,
    label: 'Open passbook',
    test: (s) => !!s.menus.invest || (s.memos['passbook'] ?? 0) > 0,
  },
  {
    id: 'e1-lot',
    era: 1,
    label: 'Buy the lot expansion',
    test: (s) => !!s.expansions['side-yard'],
  },

  // ── Era 2 ────────────────────────────────────────────────────────────────
  {
    id: 'e2-second-store',
    era: 2,
    label: 'Open second store',
    test: (s) => s.stores.length >= 2,
  },
  {
    id: 'e2-policy',
    era: 2,
    label: 'Set a chain policy',
    test: (s) => s.stores.some((st) => st.policy !== 'standard'),
  },
  {
    id: 'e2-depot',
    era: 2,
    label: 'Build depot',
    test: (s) => s.depot,
  },
  {
    id: 'e2-level-store',
    era: 2,
    label: 'Level a store once',
    test: (s) => s.stores.some((st) => st.level >= 2),
  },
  {
    id: 'e2-catering',
    era: 2,
    label: 'Launch catering venture',
    test: (s) => (s.ventures.catering?.level ?? 0) >= 1,
  },
  {
    id: 'e2-incorporate',
    era: 2,
    label: 'Incorporate',
    test: (s) => s.incorporated,
  },
  {
    id: 'e2-tournament',
    era: 2,
    label: 'Run one tournament',
    test: (s) => s.stats.tournamentsRun >= 1,
  },
  {
    id: 'e2-invest-book',
    era: 2,
    label: 'Deposit into investment book',
    test: (s) => s.stats.investDeposits >= 1 || s.invest.balance > 0,
  },
  {
    id: 'e2-district',
    era: 2,
    label: 'Buy a metro/district expansion',
    test: (s) => !!s.expansions['metro-slot'] || !!s.expansions['corner-parcel'],
  },
  {
    id: 'e2-autonomous',
    era: 2,
    label: 'Release Autonomous fulfillment',
    test: (s) => s.autonomous,
  },

  // ── Era 3 ────────────────────────────────────────────────────────────────
  {
    id: 'e3-cold-tut',
    era: 3,
    label: 'Finish Cold tutorial / open Cold menu',
    test: (s) => !!s.tutorials.done['cold'] || !!s.tutorials.done['e3-cold'] || !!s.menus.cold || s.cold.plants >= 1,
  },
  {
    id: 'e3-plant-tank',
    era: 3,
    label: 'Build cold plant + tank',
    test: (s) => s.cold.plants >= 1 && s.cold.tanks >= 1,
  },
  {
    id: 'e3-momentum',
    era: 3,
    label: 'See auto-shed or hold Momentum ≥100% for 10 min',
    test: (s) => s.cold.autoSheds >= 1 || s.cold.momentumHoldSec >= 600 || s.cold.momentum > 1.05,
  },
  {
    id: 'e3-quadratic',
    era: 3,
    label: 'Take quadratic plant memo',
    test: (s) => !!s.memos['quadratic-plants'] || s.cold.quadratic,
  },
  {
    id: 'e3-yield',
    era: 3,
    label: 'Empty regional yield',
    test: (s) => s.cold.yieldLeft <= 0 && s.cold.plants + s.cold.tanks > 0,
  },
  {
    id: 'e3-leave',
    era: 3,
    label: 'Leave region',
    test: (s) => s.politics.leftRegion || s.era >= 4,
  },

  // ── Era 4–6 ──────────────────────────────────────────────────────────────
  {
    id: 'e4-ocean-lane',
    era: 4,
    label: 'Open first ocean lane with fuel buffer',
    test: (s) => s.fleet.lanes >= 1 || !!s.memos['ocean-lane'],
  },
  {
    id: 'e5-charter',
    era: 5,
    label: 'Finish Charter tutorial; launch seed barge',
    test: (s) => s.fleet.launched || s.fleet.barges >= 1,
  },
  {
    id: 'e5-guardian',
    era: 5,
    label: 'Use Guardian preset or win a drift battle',
    test: (s) => s.fleet.guardianUsed || (s.fleet.warOn && s.fleet.legacy > 0) || s.fleet.biomass <= 0,
  },
  {
    id: 'e6-biomass',
    era: 6,
    label: 'Clear universe biomass',
    test: (s) => s.fleet.launched && s.fleet.biomass <= 0,
  },
  {
    id: 'e6-ending',
    era: 6,
    label: 'Accept or Reject',
    test: (s) => s.endingChoice === 'accept' || s.endingChoice === 'reject',
  },
]

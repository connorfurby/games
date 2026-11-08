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
    id: 'e1-weather',
    era: 1,
    label: 'Live through a weather day',
    test: (s) => s.stats.weatherDays >= 1,
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
  {
    id: 'e2-board-meeting',
    era: 2,
    label: 'Resolve a board meeting',
    test: (s) => s.stats.boardMeetings >= 1,
  },
  {
    id: 'e2-rival-answer',
    era: 2,
    label: 'Answer a rival move or match a coupon war',
    test: (s) => s.stats.rivalAnswers + s.stats.couponMatches >= 1,
  },
  {
    id: 'e2-doctrine',
    era: 2,
    label: 'Buy a doctrine',
    test: (s) => s.stats.doctrinesBought >= 1,
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
  {
    id: 'e3-lobby',
    era: 3,
    label: 'Sign the Lobby Retainer',
    test: (s) => (s.memos['lobby-office'] ?? 0) > 0 || (s.politics?.lobby ?? 0) > 0,
  },
  {
    id: 'e3-acquisition',
    era: 3,
    label: 'Make one acquisition',
    test: (s) => (s.politics?.acquisitions ?? 0) >= 1,
  },
  {
    id: 'e3-brownout-survive',
    era: 3,
    label: 'Weather a brownout (tanks help)',
    test: (s) => (s.cold?.brownouts ?? 0) >= 1,
  },

  // ── Era 4 · Autonomous Globe ─────────────────────────────────────────────
  {
    id: 'e4-logistics-menu',
    era: 4,
    label: 'Open Logistics',
    test: (s) => !!s.menus.logistics,
  },
  {
    id: 'e4-ocean-lane',
    era: 4,
    label: 'Open first ocean lane with fuel buffer',
    test: (s) => s.fleet.lanes >= 1 || !!s.memos['ocean-lane'],
  },
  {
    id: 'e4-fuel-buffer',
    era: 4,
    label: 'Take the Fuel Buffer Policy',
    test: (s) => (s.memos['fuel-buffer'] ?? 0) > 0,
  },
  {
    id: 'e4-lanes-3',
    era: 4,
    label: 'Run three ocean lanes',
    test: (s) => s.fleet.lanes >= 3,
  },
  {
    id: 'e4-control-tower',
    era: 4,
    label: 'Staff the Control Tower',
    test: (s) => (s.memos['control-tower'] ?? 0) > 0,
  },
  {
    id: 'e4-control-10',
    era: 4,
    label: 'Bank 10 Control',
    test: (s) => s.control >= 10,
  },
  {
    id: 'e4-franchise',
    era: 4,
    label: 'Open a franchise (Brand will drift)',
    test: (s) => s.fleet.franchises >= 1 || (s.memos['franchise-kit'] ?? 0) > 0,
  },
  {
    id: 'e4-brand-steady',
    era: 4,
    label: 'Hold Brand above 80%',
    test: (s) => s.brand >= 0.8,
  },

  // ── Era 5 ────────────────────────────────────────────────────────────────
  {
    id: 'e5-berth',
    era: 5,
    label: 'Build the Seed Barge Berth',
    test: (s) => (s.memos['barge-berth'] ?? 0) > 0,
  },
  {
    id: 'e5-fleet-menu',
    era: 5,
    label: 'Open Fleet',
    test: (s) => !!s.menus.fleet,
  },
  {
    id: 'e5-charter-opener',
    era: 5,
    label: 'Fund the Charter opener',
    test: (s) => (s.memos['charter-opener'] ?? 0) > 0,
  },
  {
    id: 'e5-allocate',
    era: 5,
    label: 'Allocate six Charter points',
    test: (s) => Object.values(s.fleet.charter).reduce((a, n) => a + Math.max(0, n), 0) >= 6,
  },
  {
    id: 'e5-charter',
    era: 5,
    label: 'Finish Charter tutorial; launch seed barge',
    test: (s) => s.fleet.launched || s.fleet.barges >= 1,
  },
  {
    id: 'e5-barges-3',
    era: 5,
    label: 'Field three barges',
    test: (s) => s.fleet.barges >= 3,
  },
  {
    id: 'e5-drift-war',
    era: 5,
    label: 'Meet Off-Brand in a drift war',
    test: (s) => s.fleet.warOn || s.fleet.legacy > 0 || (s.memos['off-brand-war'] ?? 0) > 0,
  },
  {
    id: 'e5-barges-10',
    era: 5,
    label: 'Field ten barges',
    test: (s) => s.fleet.barges >= 10,
  },
  {
    id: 'e5-guardian',
    era: 5,
    label: 'Use Guardian preset or win a drift battle',
    test: (s) => s.fleet.guardianUsed || (s.fleet.warOn && s.fleet.legacy > 0) || s.fleet.biomass <= 0,
  },

  // ── Era 6 ────────────────────────────────────────────────────────────────
  {
    id: 'e6-era',
    era: 6,
    label: 'Reach the Hungry Universe',
    test: (s) => s.era >= 6,
  },
  {
    id: 'e6-legacy-5',
    era: 6,
    label: 'Bank 5 Legacy',
    test: (s) => s.fleet.legacy >= 5,
  },
  {
    id: 'e6-read-25',
    era: 6,
    label: 'Hold 25 Read',
    test: (s) => s.read >= 25,
  },
  {
    id: 'e6-biomass',
    era: 6,
    label: 'Clear universe biomass',
    test: (s) => s.fleet.launched && s.fleet.biomass <= 0,
  },
  {
    id: 'e6-ration',
    era: 6,
    label: 'Stamp the Universal Ration',
    test: (s) => (s.memos['universal-ration'] ?? 0) > 0,
  },
  {
    id: 'e6-hungry-law',
    era: 6,
    label: 'Pick a Hungry law for the next universe',
    test: (s) => (s.prestigeCarry?.mutators?.length ?? 0) >= 1,
  },
  {
    id: 'e6-ending',
    era: 6,
    label: 'Accept or Reject',
    test: (s) => s.endingChoice === 'accept' || s.endingChoice === 'reject',
  },
]

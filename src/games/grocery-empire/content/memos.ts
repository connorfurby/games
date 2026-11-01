import { DOCTRINES, LATE_MEMOS } from './lateEras'
import { RETRAIN } from '../sim/balance'
import { log, queueTutorial, setEra, unlockMenu } from '../sim/helpers'
import type { GameState } from '../sim/state'
import { enableMomentum, enableQuadratic } from '../sim/systems/cold'
import { acceptEnding, rejectEnding } from '../sim/systems/endings'
import { applyGuardianPreset, rebootFleet, startDriftWar } from '../sim/systems/fleet'
import { leaveRegion, openPolitics } from '../sim/systems/politics'
import { ERA2_MEMOS } from './era2'

export interface MemoCost {
  cash?: number
  attention?: number
  ideas?: number
}

export interface MemoDef {
  id: string
  name: string
  /** Dry operations-log voice. */
  voice: string
  effect: string
  era: number
  cost: (s: GameState) => MemoCost
  visible: (s: GameState) => boolean
  /** Extra precondition beyond cost; returns a reason when blocked. */
  blocked?: (s: GameState) => string | null
  run?: (s: GameState) => void
  repeatable?: boolean
  /** Written to the ledger after the memo completes. */
  done: string
}

const c = (cash = 0, attention = 0, ideas = 0) => () => ({ cash, attention, ideas })
const had = (s: GameState, id: string) => (s.memos[id] ?? 0) > 0

export const MEMOS: MemoDef[] = [
  // ── Era 0: the counter (cash only) ───────────────────────────────────────
  {
    id: 'ledger-tape',
    name: 'Ledger Tape',
    voice: 'A roll of register tape and a pencil. Write down what sold — the day forgets; the tape does not.',
    effect: 'Opens Books: revenue, costs, and sales per minute.',
    era: 0,
    cost: c(10),
    visible: (s) => s.stats.sold >= 20,
    run: (s) => unlockMenu(s, 'books'),
    done: 'Ledger tape installed. Numbers now have a home.',
  },
  {
    id: 'box-cutter',
    name: 'Box Cutter',
    voice: 'Tearing tape with fingernails is not a business plan. Edge is a habit.',
    effect: '+1 unit per Unpack click.',
    era: 0,
    cost: c(8),
    visible: (s) => s.stats.unpackedManual >= 10,
    done: 'Box cutter acquired. Crates open faster.',
  },
  {
    id: 'chalkboard',
    name: 'Chalkboard Sign',
    voice: '“CANS. CHEAP. INSIDE.” Spelling optional. The sidewalk is your first ad network.',
    effect: '+10% demand.',
    era: 0,
    cost: c(15),
    visible: (s) => s.stats.sold >= 40,
    done: 'Chalkboard on the sidewalk. Foot traffic glances over.',
  },
  {
    id: 'hand-truck',
    name: 'Hand Truck',
    voice: 'Two wheels and a lever. Crates get bigger when you are not carrying them on your spine.',
    effect: '+12 units per wholesale crate.',
    era: 0,
    cost: c(35),
    visible: (s) => s.stats.ordersPlaced >= 3,
    done: 'Hand truck parked by the door. Crates arrive fuller.',
  },
  {
    id: 'dock-plate',
    name: 'Dock Plate',
    voice: 'A steel bridge between truck and threshold. Faster unload, more room just inside.',
    effect: 'Deliveries −40% time · +20 backroom capacity.',
    era: 1,
    cost: c(90, 800),
    visible: (s) => s.compute.unlocked && s.stats.ordersPlaced >= 8,
    done: 'Dock plate bolted down. Trucks leave sooner; the backroom breathes.',
  },
  {
    id: 'help-wanted',
    name: 'Help Wanted Sign',
    voice: 'You cannot unpack and ring up at the same time forever.',
    effect: 'Opens Staff. Hire your first clerk.',
    era: 0,
    cost: c(15),
    visible: (s) => s.baskets >= 120,
    run: (s) => unlockMenu(s, 'staff'),
    done: 'Help wanted sign taped to the glass.',
  },

  // ── Era 1: corner store (cash) ───────────────────────────────────────────
  {
    id: 'flyer',
    name: 'Neighborhood Flyer',
    voice: 'Photocopied. Slightly crooked. Effective.',
    effect: 'Opens Marketing: ads and later, loyalty.',
    era: 1,
    cost: c(25),
    visible: (s) => s.era >= 1,
    run: (s) => unlockMenu(s, 'marketing'),
    done: 'Flyers stapled to every pole on the block.',
  },
  {
    id: 'upgrades-binder',
    name: 'Upgrades Binder',
    voice: 'A three-ring binder of small improvements. Tabs by department.',
    effect: 'Opens Upgrades: leveled trees with something to buy at every budget.',
    era: 1,
    cost: c(30),
    visible: (s) => s.era >= 1,
    run: (s) => unlockMenu(s, 'upgrades'),
    done: 'Upgrades binder on the shelf under the register.',
  },
  {
    id: 'produce-crates',
    name: 'Produce Crates',
    voice: 'Fruit sells itself until it does not. Then it sells to the compost bin.',
    effect: 'Unlocks Produce. Higher demand, spoils in about 4 minutes.',
    era: 1,
    cost: c(40),
    visible: (s) => s.era >= 1 && s.baskets >= 350,
    run: (s) => {
      s.categories.produce = true
      unlockMenu(s, 'backroom')
      queueTutorial(s, 'categories')
    },
    done: 'Produce crates stacked by the window. Watch the dates.',
  },
  {
    id: 'household-aisle',
    name: 'Household Aisle',
    voice: 'Sponges, batteries, bin bags. Nobody gets excited; everybody needs them.',
    effect: 'Unlocks Household. Never spoils, steady low demand.',
    era: 1,
    cost: c(60),
    visible: (s) => s.era >= 1 && s.baskets >= 700,
    run: (s) => {
      s.categories.household = true
    },
    done: 'One aisle of things that never go bad.',
  },
  {
    id: 'security-mirror',
    name: 'Security Mirror',
    voice: 'Convex. Slightly judgmental.',
    effect: 'Shrink ×0.7.',
    era: 1,
    cost: c(45),
    visible: (s) => s.stats.shrunk >= 4,
    done: 'Mirror up in the corner. People stand up straighter.',
  },
  {
    id: 'pizza-friday',
    name: 'Pizza Friday',
    voice: 'Morale problems have a cheese-based solution.',
    effect: 'Unlocks Order Pizza on Staff: +15% morale for 3 minutes.',
    era: 1,
    cost: c(20),
    visible: (s) => s.staff.length >= 2 && s.morale < 0.97,
    done: 'Pizza Friday approved. Fridays are any day you choose.',
  },
  {
    id: 'punch-card',
    name: 'Punch Card',
    voice: 'Ten punches, one free can. Costs you later, brings them back now.',
    effect: 'Loyalty tier 1: +8% demand, 3% of revenue owed back as rewards.',
    era: 1,
    cost: c(80),
    visible: (s) => s.menus.marketing && s.baskets >= 1000,
    run: (s) => {
      s.loyalty.tier = Math.max(1, s.loyalty.tier)
      queueTutorial(s, 'loyalty')
    },
    done: 'Punch cards printed. Regulars start keeping them in wallets.',
  },
  {
    id: 'reach-in',
    name: 'Reach-in Cooler Permit',
    voice: 'The city wants a form for anything with a compressor.',
    effect: 'Opens the Cold track in Build. Coolers slow spoilage and allow Dairy.',
    era: 1,
    cost: c(60),
    visible: (s) => s.categories.produce && s.stats.spoiled >= 3,
    run: (s) => {
      unlockMenu(s, 'build')
    },
    done: 'Cooler permit filed. Cold track open in Build.',
  },
  {
    id: 'dairy-case',
    name: 'Dairy Case',
    voice: 'Milk is a margin with a countdown.',
    effect: 'Unlocks Dairy. High margin, spoils in about 2.5 minutes.',
    era: 1,
    cost: c(150),
    visible: (s) => had(s, 'reach-in'),
    blocked: (s) => ((s.builds.cold ?? 0) >= 1 ? null : 'Needs a Reach-in Cooler (Build → Cold).'),
    run: (s) => {
      s.categories.dairy = true
      queueTutorial(s, 'dairy')
    },
    done: 'Dairy case plugged in and humming.',
  },
  {
    id: 'staff-room',
    name: 'Staff Room',
    voice: 'A chair, a kettle, a door that closes.',
    effect: '+5% morale ceiling.',
    era: 1,
    cost: c(150),
    visible: (s) => s.staff.length >= 3,
    done: 'Staff room cleared out. The kettle is already overused.',
  },
  {
    id: 'coffee-permit',
    name: 'Coffee Cart Permit',
    voice: 'Commuters walk past at 7am holding money.',
    effect: 'Opens Ventures and the Coffee Cart.',
    era: 1,
    cost: c(120),
    visible: (s) => s.era >= 1 && s.baskets >= 1500,
    run: (s) => {
      unlockMenu(s, 'ventures')
    },
    done: 'Cart permit approved. Ventures open.',
  },
  {
    id: 'passbook',
    name: 'Passbook Savings',
    voice: 'A little blue book. The bank pays you to leave money alone.',
    effect: 'Opens Invest. Deposit spare cash for slow, safe interest.',
    era: 1,
    cost: c(50),
    visible: (s) => s.lifetimeRevenue >= 1500,
    run: (s) => unlockMenu(s, 'invest'),
    done: 'Passbook opened at the branch on the corner.',
  },
  {
    id: 'nephew-float',
    name: 'Nephew’s Float',
    voice: 'Your nephew offers eighty dollars. He wants a hundred and twenty back. He is very patient.',
    effect: '+$80 now. $120 owed, repaid from 10% of revenue. No interest beyond that.',
    era: 1,
    cost: c(0),
    visible: (s) => s.era >= 1 && s.debt.taken === 0 && s.staff.length >= 1 && s.cash < 30,
    run: (s) => {
      s.cash += 80
      s.debt.owed += 120
      s.debt.taken += 1
      unlockMenu(s, 'books')
    },
    done: 'Nephew’s float accepted. He sends a thumbs-up emoji.',
  },
  {
    id: 'back-office',
    name: 'Back-Office Desk',
    voice: 'Somebody needs to think about the store instead of standing in it.',
    effect: 'Opens the back office: Analysts make Attention, Archives hold it. Memos start costing Attention.',
    era: 1,
    cost: c(80),
    visible: (s) => s.era >= 1 && s.baskets >= 1200,
    run: (s) => {
      s.compute.unlocked = true
      s.compute.archives += s.empire.perks['extra-archive'] ?? 0
      queueTutorial(s, 'compute')
    },
    done: 'Desk assembled in the back. One analyst, one filing cabinet.',
  },

  // ── Era 1: attention memos ────────────────────────────────────────────────
  {
    id: 'pallet-jack',
    name: 'Pallet Jack',
    voice: 'Hydraulic. Squeaks. Moves a week of stock in one pull.',
    effect: 'Staff unpack +25%.',
    era: 1,
    cost: c(50, 750),
    visible: (s) => s.compute.unlocked && s.staff.length >= 1,
    done: 'Pallet jack in service. Clerks look relieved.',
  },
  {
    id: 'second-wholesaler',
    name: 'Second Wholesaler',
    voice: 'Cheaper, slower, and sometimes the truck is lighter than the invoice.',
    effect: 'Supplier B: 15% cheaper, 30s delivery, 2-crate minimum, sometimes short-ships.',
    era: 1,
    cost: c(40, 1000),
    visible: (s) => s.compute.unlocked,
    run: (s) => {
      unlockMenu(s, 'suppliers')
      queueTutorial(s, 'suppliers')
    },
    done: 'Second wholesaler added to the speed dial.',
  },
  {
    id: 'weekly-circular',
    name: 'Weekly Circular',
    voice: 'Same ads, but on a schedule people expect.',
    effect: 'Each ad level is worth +4% more.',
    era: 1,
    cost: c(100, 1200),
    visible: (s) => s.compute.unlocked && s.ads >= 3,
    done: 'Weekly circular in every mailbox on Thursdays.',
  },
  {
    id: 'weather-radio',
    name: 'Weather Radio',
    voice: 'AM band, static, and a man who says “partly.”',
    effect: 'Shows tomorrow’s weather on the Floor.',
    era: 1,
    cost: c(30, 500),
    visible: (s) => s.compute.unlocked && s.stats.weatherDays >= 1,
    done: 'Weather radio taped to the register. Tomorrow has a forecast.',
  },
  {
    id: 'inspector-prep',
    name: 'Prep for the Inspector',
    voice: 'Wipe-down checklist, laminated. Initial every hour.',
    effect: 'Inspection meter fills 40% slower.',
    era: 1,
    cost: c(60, 1500),
    visible: (s) => s.compute.unlocked && (s.inspection.meter > 0.2 || s.stats.inspections > 0),
    done: 'Inspection prep binder in place.',
  },
  {
    id: 'misting-bar',
    name: 'Misting Bar',
    voice: 'A fine spray over the lettuce. It looks fresh because it stays fresh.',
    effect: 'Produce lasts 40% longer.',
    era: 1,
    cost: c(120, 1500),
    visible: (s) => s.compute.unlocked && s.categories.produce,
    done: 'Misting bar installed. The greens glisten.',
  },
  {
    id: 'radio-spot',
    name: 'Radio Spot',
    voice: 'Thirty seconds between traffic and weather.',
    effect: '+15% demand.',
    era: 1,
    cost: c(250, 2500),
    visible: (s) => s.compute.unlocked && s.menus.marketing,
    done: 'Radio spot running on the morning show.',
  },
  {
    id: 'night-latch',
    name: 'Night Latch',
    voice: 'A lock that opens late. Somebody has to be awake behind it.',
    effect: 'Unlocks Night Clerks. Hours can go up to 2.0×.',
    era: 1,
    cost: c(250, 3000),
    visible: (s) => s.compute.unlocked && s.hours >= 1.3,
    run: (s) => queueTutorial(s, 'night'),
    done: 'Night latch fitted. Late hours possible.',
  },
  {
    id: 'pallet-chain',
    name: 'Pallet Jack Chain',
    voice: 'Three pallet jacks in a train. The stockroom sounds like a freight yard.',
    effect: 'Staff unpack +50%.',
    era: 1,
    cost: c(300, 4000),
    visible: (s) => had(s, 'pallet-jack') && s.staff.length >= 3,
    done: 'Pallet chain rolling. Crates empty themselves, almost.',
  },
  {
    id: 'express-lane',
    name: 'Express Lane',
    voice: '“10 items or fewer.” Enforced by a cashier with a look.',
    effect: 'Checkout capacity ×1.4.',
    era: 1,
    cost: c(300, 3000),
    visible: (s) => s.compute.unlocked && s.staff.some((m) => m.role === 'cashier'),
    done: 'Express lane opened. The line moves.',
  },
  {
    id: 'gold-punch',
    name: 'Gold Punch Card',
    voice: 'Shinier card, deeper discount, more loyal regulars.',
    effect: 'Loyalty tier 2: +14% demand, 6% of revenue owed back as rewards.',
    era: 1,
    cost: c(300, 3000),
    visible: (s) => had(s, 'punch-card') && s.compute.unlocked,
    run: (s) => {
      s.loyalty.tier = 2
    },
    done: 'Gold cards issued to the regulars.',
  },
  {
    id: 'big-ideas',
    name: 'Big Ideas Jack',
    voice: 'When the filing cabinet is full, thoughts spill onto napkins. Keep the napkins.',
    effect: 'While Attention is full, Analysts produce Ideas.',
    era: 1,
    cost: c(0, 1000),
    visible: (s) => s.compute.unlocked && s.stats.attentionFilled >= 1,
    run: (s) => {
      s.compute.ideasUnlocked = true
      queueTutorial(s, 'ideas')
    },
    done: 'Napkin drawer installed. Ideas now accumulate when Attention is full.',
  },
  {
    id: 'scanner-array',
    name: 'Scanner Array',
    voice: 'A grid of diodes behind the desk. Measure once — Attention arrives in a burst. Unstable. Never negative.',
    effect: 'Unlocks Scanner Array: click to pulse Attention with a wobble (2–4s cooldown).',
    era: 1,
    /** Ideas 5 when you have them; otherwise mid cash so the desk still opens. */
    cost: (s) => (s.compute.ideas >= 5 ? { ideas: 5 } : { cash: 120 }),
    visible: (s) => s.compute.unlocked && s.compute.ideasUnlocked,
    run: (s) => {
      s.compute.scanner = true
      queueTutorial(s, 'scanner')
    },
    done: 'Scanner Array humming. Backroom has the big pulse button.',
  },
  {
    id: 'clipboard-rounds',
    name: 'Clipboard Rounds',
    voice: 'Walk the store every hour with a clipboard. Fix what you see.',
    effect: 'Inspection meter drains twice as fast.',
    era: 1,
    cost: c(80, 4000),
    visible: (s) => had(s, 'inspector-prep'),
    done: 'Clipboard rounds on the schedule.',
  },
  {
    id: 'rain-plan',
    name: 'Rain Plan',
    voice: 'Umbrellas by the door, soup on the endcap, fans on the produce.',
    effect: 'Rain bonus doubled; heat spoilage penalty halved.',
    era: 1,
    cost: c(100, 2500),
    visible: (s) => had(s, 'weather-radio') || had(s, 'barometer'),
    done: 'Rain plan pinned to the corkboard.',
  },
  {
    id: 'mealkit-license',
    name: 'Meal Kit License',
    voice: 'A recipe card and four vegetables is a product now.',
    effect: 'Unlocks the Meal Kits venture. Turns produce into cash.',
    era: 1,
    cost: c(400, 3000),
    visible: (s) => had(s, 'coffee-permit') && s.categories.produce && s.compute.unlocked,
    done: 'Meal kit license framed above the prep table.',
  },
  {
    id: 'auto-order',
    name: 'Auto-Order Clipboard',
    voice: 'A clipboard by the phone with a number circled: call when below this.',
    effect: 'Unlocks auto-restock: buys crates when the backroom runs low and cost is under your limit.',
    era: 1,
    cost: c(200, 6000),
    visible: (s) => s.compute.unlocked && s.stats.ordersPlaced >= 30,
    run: (s) => {
      unlockMenu(s, 'suppliers')
      queueTutorial(s, 'autorestock')
    },
    done: 'Auto-order clipboard hanging by the phone.',
  },
  {
    id: 'buying-club',
    name: 'Buying Club',
    voice: 'Six corner stores, one phone call, better prices for all of you.',
    effect: 'Wholesale −10%.',
    era: 1,
    cost: c(500, 5000),
    visible: (s) => had(s, 'second-wholesaler') && s.stats.ordersPlaced >= 50,
    done: 'Joined the buying club. Invoices shrink.',
  },
  {
    id: 'butcher-block',
    name: 'Butcher Block',
    voice: 'Sharp knives, cold room, expensive mistakes.',
    effect: 'Unlocks Meat. Highest margin, spoils in about 90 seconds. Needs a Walk-in.',
    era: 1,
    cost: c(500, 3000),
    visible: (s) => s.categories.dairy && s.compute.unlocked,
    blocked: (s) => ((s.builds.cold ?? 0) >= 2 ? null : 'Needs a Walk-in Cooler (Build → Cold).'),
    run: (s) => {
      s.categories.meat = true
    },
    done: 'Butcher block installed. Meat counter open.',
  },

  // ── Era 1: ideas memos ────────────────────────────────────────────────────
  {
    id: 'slogan',
    name: 'Slogan Contest',
    voice: 'Customers vote. “Fresher than yesterday” wins.',
    effect: '+10% demand.',
    era: 1,
    cost: c(0, 0, 10),
    visible: (s) => s.compute.ideasUnlocked,
    done: 'New slogan painted over the door.',
  },
  {
    id: 'market-almanac',
    name: 'Market Almanac',
    voice: 'Ten years of wholesale prices in a spiral notebook.',
    effect: 'Wholesale index dips lower and shows its median.',
    era: 1,
    cost: c(0, 2000, 25),
    visible: (s) => s.compute.ideasUnlocked,
    done: 'Almanac open on the desk. Prices have patterns.',
  },
  {
    id: 'window-lettering',
    name: 'Window Lettering',
    voice: 'Gold leaf, hand-painted. The store has a name now.',
    effect: '+8% demand.',
    era: 1,
    cost: c(200, 0, 35),
    visible: (s) => s.compute.ideasUnlocked && s.stats.ideasEarned >= 20,
    done: 'Window lettered. People photograph it.',
  },
  {
    id: 'planogram',
    name: 'Planogram',
    voice: 'A map of every shelf. Things go where hands reach.',
    effect: '+25% demand.',
    era: 1,
    cost: c(0, 6000, 60),
    visible: (s) => had(s, 'slogan'),
    done: 'Planogram taped to the backroom door. Every facing has a reason.',
  },
  {
    id: 'retraining',
    name: 'Retraining Seminar',
    voice: 'A weekend course. Everyone forgets the old way and learns the new one.',
    effect: 'Refunds every upgrade level you bought, in full cash. Cost doubles each time.',
    era: 1,
    cost: (s) => ({
      cash: 0,
      attention: RETRAIN.baseAttention * Math.pow(RETRAIN.growth, s.compute.retrains),
      ideas: RETRAIN.ideas * Math.pow(RETRAIN.growth, s.compute.retrains),
    }),
    visible: (s) => s.compute.ideasUnlocked && s.stats.upgradesBought >= 5,
    blocked: (s) => (s.upgradeSpend > 0 ? null : 'No upgrade levels to refund yet.'),
    run: (s) => {
      const refund = s.upgradeSpend
      s.cash += refund
      s.upgrades = {}
      s.upgradeSpend = 0
      s.compute.retrains += 1
      log(s, `Retraining refunded $${refund.toFixed(2)} of upgrades. Rebuild however you like.`, 'good')
    },
    repeatable: true,
    done: 'Retraining seminar complete.',
  },
  {
    id: 'private-label-sku',
    name: 'Private Label SKU',
    voice: 'Your name on a can. Cheaper to buy, better margin, a hint of what comes later.',
    effect: 'Unlocks Private Label stock.',
    era: 1,
    cost: c(1500, 9000, 100),
    visible: (s) => had(s, 'planogram'),
    run: (s) => {
      s.categories.privateLabel = true
    },
    done: 'First private-label can rolls off someone else’s line.',
  },
  {
    id: 'lot-survey',
    name: 'Survey the Lot',
    voice: 'The empty lot next door has a For Sale sign and a phone number.',
    effect: 'Opens Land: expansions, including buying the lot.',
    era: 1,
    cost: c(500, 5000),
    visible: (s) => s.compute.unlocked && s.lifetimeRevenue >= 8000,
    run: (s) => {
      unlockMenu(s, 'land')
      queueTutorial(s, 'land')
    },
    done: 'Surveyor’s report on file. Land menu open.',
  },

  // Era 2 memos (chain, capital, doctrines, ventures)
  ...ERA2_MEMOS,

  // ── Eras 3–6 (from LATE_MEMOS spine) ─────────────────────────────────────
  {
    id: 'cold-plant-permit',
    name: 'Cold Plant Permit',
    voice: 'Compressors the size of trucks. The county wants forms.',
    effect: 'Unlock Cold menu and plant builds. Enter Era 3.',
    era: 3,
    cost: c(8000, 4000),
    visible: (s) => s.era >= 2 || (s.builds.cold ?? 0) >= 2 || s.autonomous,
    run: (s) => {
      setEra(s, 3)
      unlockMenu(s, 'cold')
      queueTutorial(s, 'cold')
    },
    done: 'Cold Plant Permit stamped. The line needs plants.',
  },
  {
    id: 'tank-farm',
    name: 'Tank Farm Spec',
    voice: 'Insurance in steel cylinders.',
    effect: 'Unlock Tank Farm builds; +cold buffer.',
    era: 3,
    cost: c(12_000, 2000),
    visible: (s) => had(s, 'cold-plant-permit') && s.cold.plants >= 1,
    run: (s) => unlockMenu(s, 'cold'),
    done: 'Tank Farm spec on the wall. Buffer the line.',
  },
  {
    id: 'momentum',
    name: 'Momentum Clause',
    voice: 'While freshness holds, everything compounds. When it slips, auto-shed.',
    effect: 'Enable Momentum; freshness floor 25% on brownout.',
    era: 3,
    cost: c(20_000, 5000, 40),
    visible: (s) => had(s, 'tank-farm') && s.cold.tanks >= 1,
    run: (s) => {
      enableMomentum(s)
      queueTutorial(s, 'momentum')
    },
    done: 'Momentum Clause filed. Babysit surplus.',
  },
  {
    id: 'quadratic-plants',
    name: 'County Emptying',
    voice: 'One memo. Every plant counts twice. The region notices.',
    effect: 'Quadratic plant multiplier (once).',
    era: 3,
    cost: c(50_000, 8000, 80),
    visible: (s) => had(s, 'momentum') && s.cold.plants >= 3,
    run: (s) => enableQuadratic(s),
    done: 'County Emptying: plants count twice. Yield will vanish.',
  },
  {
    id: 'lobby-office',
    name: 'Lobby Retainer',
    voice: 'A polite person who knows zoning.',
    effect: 'Open Politics; Political Capital wallet.',
    era: 3,
    cost: c(15_000, 3000),
    visible: (s) => had(s, 'cold-plant-permit') && ((s.builds.civic ?? 0) >= 1 || s.empire.level >= 3),
    run: (s) => {
      openPolitics(s)
      queueTutorial(s, 'politics')
    },
    done: 'Lobby retainer signed. Politics open.',
  },
  {
    id: 'monopoly-watch',
    name: 'Acquisition Desk',
    voice: 'Buy neighbors before they form a committee.',
    effect: 'Region acquisition actions.',
    era: 3,
    cost: c(30_000, 4000, 20),
    visible: (s) => had(s, 'lobby-office'),
    run: (s) => unlockMenu(s, 'politics'),
    done: 'Acquisition Desk staffed.',
  },
  {
    id: 'leave-region',
    name: 'Leave the Region',
    voice: 'Pack the brand. The map gets bigger.',
    effect: 'Era 4 unlock when yield is empty.',
    era: 3,
    cost: c(100_000, 10_000, 50),
    visible: (s) => had(s, 'monopoly-watch') && s.cold.yieldLeft <= 0,
    blocked: (s) => (s.politics.capital >= 15 ? null : 'Need 15 Political Capital.'),
    run: (s) => leaveRegion(s),
    done: 'Left the region. Era 4 — the globe.',
  },
  {
    id: 'private-label-works',
    name: 'Private-Label Works',
    voice: 'Your name on the line, not just the can.',
    effect: 'Factory production path (+production build lean).',
    era: 3,
    cost: c(40_000, 6000, 60),
    visible: (s) => had(s, 'cold-plant-permit') && s.categories.privateLabel,
    run: (s) => {
      s.builds.production = Math.max(s.builds.production ?? 0, 2)
      s.brand = Math.min(1, s.brand + 0.05)
    },
    done: 'Private-label works humming. Brand on every line.',
  },
  {
    id: 'ocean-lane',
    name: 'Ocean Lane Charter',
    voice: 'Fuel, weather, and a schedule that lies.',
    effect: 'Open Logistics; first freighter lane.',
    era: 4,
    cost: c(80_000, 5000),
    visible: (s) => s.era >= 4 || s.politics.leftRegion,
    run: (s) => {
      unlockMenu(s, 'logistics')
      if (s.fleet.lanes < 1) {
        s.fleet.lanes = 1
        s.fuel = Math.max(s.fuel, 60)
      }
      queueTutorial(s, 'logistics')
    },
    done: 'First ocean lane on the board. Keep fuel wet.',
  },
  {
    id: 'franchise-kit',
    name: 'Franchise Kit',
    voice: 'Partners grow faster. Brand drifts unless sealed.',
    effect: 'Franchise expansion (Brand risk, recoverable).',
    era: 4,
    cost: c(60_000, 4000, 30),
    visible: (s) => had(s, 'ocean-lane') || s.fleet.lanes >= 1,
    run: (s) => unlockMenu(s, 'logistics'),
    done: 'Franchise kit printed. Brand will drift — it regenerates.',
  },
  {
    id: 'fuel-buffer',
    name: 'Fuel Buffer Policy',
    voice: 'Never launch empty.',
    effect: '+fuel capacity; lane reliability.',
    era: 4,
    cost: c(25_000, 2000),
    visible: (s) => had(s, 'ocean-lane') || !!s.menus.logistics,
    done: 'Fuel buffer policy posted. Never launch empty.',
  },
  {
    id: 'control-tower',
    name: 'Control Tower',
    voice: 'Someone has to say which ocean matters today.',
    effect: 'Control currency; route priorities.',
    era: 4,
    cost: c(90_000, 8000, 40),
    visible: (s) => s.fleet.lanes >= 3 || (had(s, 'ocean-lane') && s.fleet.lanes >= 1),
    run: (s) => {
      s.control = Math.max(s.control, 10)
      unlockMenu(s, 'logistics')
    },
    done: 'Control Tower staffed. Control ticks with wet lanes.',
  },
  {
    id: 'barge-berth',
    name: 'Seed Barge Berth',
    voice: 'A dock that points at the dark.',
    effect: 'Unlock Fleet / Charter. Enter Era 5.',
    era: 5,
    cost: c(200_000, 12_000, 100),
    visible: (s) => s.era >= 4 && (s.autonomous || s.fleet.lanes >= 1 || s.control >= 5),
    run: (s) => {
      setEra(s, 5)
      unlockMenu(s, 'fleet')
      queueTutorial(s, 'charter')
    },
    done: 'Berth built. The dark has a dock number.',
  },
  {
    id: 'charter-opener',
    name: 'Charter Opener',
    voice: 'Shell, replication, survey, transit. Allocate carefully.',
    effect: 'Charter point budget (+6 pool).',
    era: 5,
    cost: c(0, 0, 0),
    visible: (s) => had(s, 'barge-berth') || s.fleet.launched,
    blocked: (s) => (s.read >= 10 ? null : 'Need 10 Read.'),
    run: (s) => {
      s.read = Math.max(0, s.read - 10)
      s.fleet.charterPool += 6
      queueTutorial(s, 'charter')
    },
    done: 'Charter opener funded. Allocate before you launch hard.',
  },
  {
    id: 'guardian-shell',
    name: 'Guardian Shell',
    voice: 'Cheap. One-time. Keeps the last barge alive.',
    effect: 'Emergency Guardian preset before extinction.',
    era: 5,
    cost: c(5000),
    visible: (s) =>
      (s.fleet.launched || s.fleet.barges > 0) &&
      (s.fleet.barges <= 2 || s.fleet.warOn || !s.fleet.guardianUsed),
    run: (s) => {
      applyGuardianPreset(s)
      queueTutorial(s, 'guardian')
    },
    done: 'Guardian Shell applied. Last barge protected.',
  },
  {
    id: 'elliptic-hull',
    name: 'Elliptic Hull',
    voice: 'Less shell, more replication, then survey.',
    effect: 'Hull efficiency: +2 replication bias on next allocate.',
    era: 5,
    cost: c(40_000, 5000, 20),
    visible: (s) =>
      had(s, 'charter-opener') &&
      Object.values(s.fleet.charter).reduce((a, n) => a + Math.max(0, n), 0) >= 6,
    run: (s) => {
      s.fleet.charter.replication = (s.fleet.charter.replication ?? 0) + 2
    },
    done: 'Elliptic hull: replication leans forward.',
  },
  {
    id: 'reboot-fleet',
    name: 'Reboot Fleet',
    voice: 'Refund Charter. Respec. No shame.',
    effect: 'Respec Charter points (small cash fee).',
    era: 5,
    cost: c(0),
    visible: (s) => s.fleet.launched,
    run: (s) => rebootFleet(s),
    repeatable: true,
    done: 'Fleet rebooted. Charter refunded.',
  },
  {
    id: 'off-brand-war',
    name: 'Off-Brand Contact',
    voice: 'Someone else is stocking the void.',
    effect: 'Start drift war; Legacy currency.',
    era: 5,
    cost: c(10_000, 2000),
    visible: (s) => s.fleet.launched && s.fleet.biomass < s.fleet.biomassMax * 0.7,
    run: (s) => startDriftWar(s),
    done: 'Off-Brand on the scope. Drift war is live.',
  },
  {
    id: 'universal-ration',
    name: 'Universal Ration',
    voice: 'Every basket that can be filled has been named.',
    effect: 'Open ending choice.',
    era: 6,
    cost: c(0),
    visible: (s) => s.era >= 6 || (s.fleet.biomass <= 0 && s.fleet.launched),
    run: (s) => {
      if (s.era < 6) setEra(s, 6)
      queueTutorial(s, 'endings')
      unlockMenu(s, 'fleet')
    },
    done: 'Universal Ration filed. Accept or Reject.',
  },
  {
    id: 'accept-exile',
    name: 'Accept Exile',
    voice: 'Another universe. Cosmetics keep. Appetite resets.',
    effect: 'Prestige Accept — bumps groceryUniverses.',
    era: 6,
    cost: c(0),
    visible: (s) => had(s, 'universal-ration') || (s.era >= 6 && s.fleet.biomass <= 0),
    blocked: (s) => (s.endingChoice ? 'Ending already chosen.' : null),
    run: (s) => acceptEnding(s),
    done: 'Accept Exile — hungry universe queued.',
  },
  {
    id: 'reject-silence',
    name: 'Reject',
    voice: 'Disassemble. Gallery mythic. Silence.',
    effect: 'Ending Reject — no prestige.',
    era: 6,
    cost: c(0),
    visible: (s) => had(s, 'universal-ration') || (s.era >= 6 && s.fleet.biomass <= 0),
    blocked: (s) => (s.endingChoice ? 'Ending already chosen.' : null),
    run: (s) => rejectEnding(s),
    done: 'Reject — silence and a plaque.',
  },
]

// Soft doctrine unlocks if Era 2 catalog did not already define them.
for (const d of DOCTRINES) {
  const id = `doctrine-${d.id}`
  if (MEMOS.some((m) => m.id === id)) continue
  MEMOS.push({
    id,
    name: d.name,
    voice: d.blurb,
    effect: `Doctrine: ${d.blurb}`,
    era: 2,
    cost: (s) => ({ attention: 500, ideas: 5 + (s.stats.doctrinesBought || 0) * 2 }),
    visible: (s) => s.era >= 2 && s.read >= 1,
    blocked: (s) => ((s.doctrines[d.id] ?? 0) > 0 ? 'Already owned.' : null),
    run: (s) => {
      s.doctrines[d.id] = 1
      s.stats.doctrinesBought += 1
      s.read += 1
    },
    done: `Doctrine ${d.name} on the shelf.`,
  })
}

void LATE_MEMOS

export const MEMO_BY_ID: Record<string, MemoDef> = Object.fromEntries(MEMOS.map((m) => [m.id, m]))

/**
 * Era 0–1 flavor memos — small, cheap, dry. Each nudges one axis by a few percent
 * through a formulas.ts hook; none gate progress. Merged into MEMOS via memos.ts.
 */

import type { MemoCost, MemoDef } from './memos'

const c = (cash = 0, attention = 0, ideas = 0) => (): MemoCost => ({ cash, attention, ideas })

export const FLAVOR_MEMOS: MemoDef[] = [
  // ── Era 0 ────────────────────────────────────────────────────────────────
  {
    id: 'price-gun',
    name: 'Price Gun',
    voice: 'Click, click, click. Every tag straight. Nobody trusts a crooked sticker.',
    effect: '+1% revenue per basket.',
    era: 0,
    cost: c(12),
    visible: (s) => s.stats.priceChanges >= 4,
    done: 'Price gun loaded. The shelf edge looks like a plan.',
  },
  {
    id: 'bag-station',
    name: 'Bag Station',
    voice: 'A hook, a stack of paper bags, a sign that says “Take two.”',
    effect: '+3% units per basket.',
    era: 0,
    cost: c(18),
    visible: (s) => s.stats.sold >= 60,
    done: 'Bag station set up by the door. Baskets get a little fuller.',
  },
  {
    id: 'bike-rack',
    name: 'Bike Rack',
    voice: 'Two hoops and a chain. Kids lock up, then come inside for gum.',
    effect: '+2% demand.',
    era: 0,
    cost: c(22),
    visible: (s) => s.baskets >= 150,
    done: 'Bike rack bolted to the curb. The sidewalk has a parking lot.',
  },
  {
    id: 'wet-floor-cone',
    name: 'Wet-Floor Cone',
    voice: 'Bright yellow. Admits to the problem before the inspector does.',
    effect: 'Inspection meter fills 5% slower.',
    era: 0,
    cost: c(12),
    visible: (s) => s.inspection.meter > 0.1 || s.stats.inspections >= 1,
    done: 'Cone placed by the cooler. The floor is officially honest.',
  },
  {
    id: 'crate-chisel',
    name: 'Crate Chisel',
    voice: 'A flat bar for stubborn lids. Saves a thumbnail per shift.',
    effect: '+2 units per wholesale crate.',
    era: 0,
    cost: c(15),
    visible: (s) => s.stats.unpackedManual >= 30,
    done: 'Chisel hung on the nail by the dock. Crates open cleanly.',
  },

  // ── Era 1 ────────────────────────────────────────────────────────────────
  {
    id: 'community-board',
    name: 'Community Board',
    voice: 'Cork, pushpins, a lost cat, a guitar lesson. Your phone number is somewhere in the middle.',
    effect: '+3% demand.',
    era: 1,
    cost: c(25),
    visible: (s) => s.era >= 1 && s.baskets >= 300,
    done: 'Community board up by the door. The block reads it twice.',
  },
  {
    id: 'spoil-log',
    name: 'Spoil Log',
    voice: 'A clipboard of what died and when. The pattern is the lesson.',
    effect: 'Perishables last 3% longer.',
    era: 1,
    cost: c(20),
    visible: (s) => s.stats.spoiled >= 5,
    done: 'Spoil log opened. Every wilted crate gets a date and a reason.',
  },
  {
    id: 'corner-watch',
    name: 'Corner Watch',
    voice: 'Two neighbors with a window view and a grudge. Free, mostly.',
    effect: 'Shrink ×0.95.',
    era: 1,
    cost: c(30),
    visible: (s) => s.stats.shrunk >= 2,
    done: 'Corner watch agreed. A curtain moves when a hand lingers.',
  },
  {
    id: 'smell-of-bread',
    name: 'Smell of Bread',
    voice: 'A toaster oven by the register. Morale and foot traffic both follow the scent.',
    effect: '+2% morale ceiling.',
    era: 1,
    cost: c(45),
    visible: (s) => s.era >= 1 && s.staff.length >= 1,
    done: 'Bread in the oven. Nobody can leave the store in a bad mood.',
  },
  {
    id: 'sunday-hours',
    name: 'Sunday Hours',
    voice: 'Open Sunday afternoon. The church crowd wants milk before dinner.',
    effect: 'Hours above 1.0× pull 2% more.',
    era: 1,
    cost: c(40),
    visible: (s) => s.era >= 1 && s.hours >= 1.1,
    done: 'Sunday hours posted. The door stays unlocked a little longer.',
  },
  {
    id: 'open-book-accounting',
    name: 'Open-Book Accounting',
    voice: 'Show the crew the numbers. Surprisingly few ask for more than they earn.',
    effect: 'Wages −2%.',
    era: 1,
    cost: c(30, 400),
    visible: (s) => s.compute.unlocked && s.staff.length >= 2,
    done: 'Books open on the break-room table. Complaints get more specific.',
  },
  {
    id: 'two-way-radio-memo',
    name: 'Two-Way Radios',
    voice: 'Handheld, scratchy, loud on channel three. “Register two, need a hand.”',
    effect: 'Checkout capacity +3%.',
    era: 1,
    cost: c(35, 300),
    visible: (s) => s.compute.unlocked && s.staff.length >= 2,
    done: 'Radios charged on the dock. The line hears you coming.',
  },

  // ── Era 2 flavor (decorative + Empire XP) ────────────────────────────────
  {
    id: 'key-cabinet',
    name: 'Key Cabinet',
    voice: 'Every door gets a hook. Labels in Sharpie. Nobody invents a spare.',
    effect: '+1 Empire XP.',
    era: 2,
    cost: c(80, 200),
    visible: (s) => s.era >= 2 && s.stores.length >= 2,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Key cabinet hung. The second door has a name.',
  },
  {
    id: 'uniform-aprons',
    name: 'Uniform Aprons',
    voice: 'Same color, same pocket. Regulars start calling the crew “y’all.”',
    effect: 'Brand +1%.',
    era: 2,
    cost: c(120),
    visible: (s) => s.era >= 2 && s.staff.length >= 3,
    run: (s) => {
      s.brand = Math.min(1, s.brand + 0.01)
    },
    done: 'Aprons issued. The aisle looks like a team.',
  },
  {
    id: 'shift-huddle',
    name: 'Shift Huddle Card',
    voice: 'Two minutes before open: spoil, price, who walks which door.',
    effect: '+1 Empire XP.',
    era: 2,
    cost: c(60, 150),
    visible: (s) => s.era >= 2,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Huddle card laminated. Drift hears its name.',
  },
  {
    id: 'circular-proof',
    name: 'Circular Proof Desk',
    voice: 'Every coupon claim gets a stamp. Rival ink stops inventing discounts.',
    effect: 'Brand +1%.',
    era: 2,
    cost: c(200, 400),
    visible: (s) => s.era >= 2 && (s.stats.couponMatches ?? 0) + (s.stats.rivalAnswers ?? 0) >= 1,
    run: (s) => {
      s.brand = Math.min(1, s.brand + 0.01)
    },
    done: 'Proof desk live. Circulars get answered with receipts.',
  },
  {
    id: 'soft-open-kit',
    name: 'Soft-Open Kit',
    voice: 'Tape, balloons, a “soft open” sign that means half the hours.',
    effect: '+1 Empire XP.',
    era: 2,
    cost: c(90),
    visible: (s) => s.era >= 2 && s.stores.some((st) => st.policy === 'local'),
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Soft-open kit used once. The new key breathes before it sprints.',
  },
  {
    id: 'walk-clipboard',
    name: 'Walk Clipboard',
    voice: 'Date, store, smell notes. Drift hates paperwork.',
    effect: '+1 Empire XP.',
    era: 2,
    cost: c(50, 100),
    visible: (s) => s.era >= 2 && s.stores.length >= 2,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Clipboard lives in the car. Walks get a stamp.',
  },
  {
    id: 'train-binder',
    name: 'Train Binder',
    voice: 'Three pages: price, FIFO, “call HQ before dump.”',
    effect: '+1 Empire XP.',
    era: 2,
    cost: c(75, 250),
    visible: (s) => s.era >= 2 && s.stores.length >= 2,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Train binder copied. Policies stop being oral history.',
  },
  {
    id: 'equity-stamp',
    name: 'Equity Stamp',
    voice: 'A rubber stamp that says AUTHORIZED. Lawyers love the sound.',
    effect: '+1 Empire XP.',
    era: 2,
    cost: c(150),
    visible: (s) => s.incorporated,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Equity stamp inked. Expansion feels slightly less illegal.',
  },
  {
    id: 'read-shelf',
    name: 'Read Shelf Label',
    voice: 'Binders labeled READ — DO NOT FILE UNDER “MISC.”',
    effect: '+0.5 Read.',
    era: 2,
    cost: c(100, 500),
    visible: (s) => s.era >= 2 && !!s.menus.strategy,
    run: (s) => {
      s.read += 0.5
    },
    done: 'Read shelf labeled. Opinions have a home.',
  },
  {
    id: 'depot-map',
    name: 'Depot Wall Map',
    voice: 'Pins for every door. String for routes that do not exist yet.',
    effect: '+1 Empire XP.',
    era: 2,
    cost: c(180, 600),
    visible: (s) => s.depot,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Depot map hung. Softcaps feel less personal.',
  },
  {
    id: 'att-even-card',
    name: 'Even-Att Card',
    voice: 'A laminated reminder: vanity focus is how second doors rot.',
    effect: '+1 Empire XP.',
    era: 2,
    cost: c(40, 200),
    visible: (s) => s.era >= 2 && s.stores.length >= 3,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Even-Att card taped to the Analysts screen.',
  },
  {
    id: 'board-packet',
    name: 'Board Packet Template',
    voice: 'Four agendas, one page each. No improvising in the hallway.',
    effect: '+1 Empire XP.',
    era: 2,
    cost: c(110, 300),
    visible: (s) => s.incorporated,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Board packets printed. Meetings get verbs.',
  },

  // ── Era 3–6 flavor ───────────────────────────────────────────────────────
  {
    id: 'frost-log',
    name: 'Frost Log',
    voice: 'Every brownout gets a line. Freshness stops being a vibe.',
    effect: '+1 Empire XP.',
    era: 3,
    cost: c(400, 800),
    visible: (s) => s.era >= 3 && (s.cold?.plants ?? 0) >= 1,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Frost log started. Brownouts get obituaries.',
  },
  {
    id: 'tank-dipstick',
    name: 'Tank Dipstick',
    voice: 'A stick with numbers. Surplus becomes a measurement.',
    effect: '+1 Empire XP.',
    era: 3,
    cost: c(250, 500),
    visible: (s) => s.era >= 3 && (s.cold?.tanks ?? 0) >= 1,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Dipstick hung by the tanks. Buffer has a language.',
  },
  {
    id: 'lobby-coffee',
    name: 'Lobby Coffee Fund',
    voice: 'Bad coffee, good introductions. Capital regenerates slightly faster in conversation.',
    effect: 'Brand +1%.',
    era: 3,
    cost: c(600),
    visible: (s) => s.era >= 3 && !!s.menus.politics,
    run: (s) => {
      s.brand = Math.min(1, s.brand + 0.01)
    },
    done: 'Coffee fund open. The committee smiles with caffeine.',
  },
  {
    id: 'heat-thermometer',
    name: 'Heat Thermometer',
    voice: 'Monopoly risk on a dial. Red means call the lobbyist.',
    effect: '+1 Empire XP.',
    era: 3,
    cost: c(350, 700),
    visible: (s) => s.era >= 3 && (s.politics?.lobby ?? 0) >= 1,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Heat dial mounted. Risk has a color.',
  },
  {
    id: 'yield-countdown',
    name: 'Yield Countdown Board',
    voice: 'Chalk numbers for regional yield left. Panic becomes planning.',
    effect: '+1 Empire XP.',
    era: 3,
    cost: c(300, 600),
    visible: (s) => s.era >= 3 && (s.cold?.plants ?? 0) >= 1,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Yield board chalked. The county has an ETA.',
  },
  {
    id: 'lane-logbook',
    name: 'Lane Logbook',
    voice: 'Fuel in, Control out, weather noted. Wet lanes stop surprising you.',
    effect: '+1 Empire XP.',
    era: 4,
    cost: c(2000, 1000),
    visible: (s) => s.era >= 4 && (s.fleet?.lanes ?? 0) >= 1,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Lane logbook opened. Distance gets receipts.',
  },
  {
    id: 'fuel-gauge-plaque',
    name: 'Fuel Gauge Plaque',
    voice: 'Never let the tank look empty on the StatusBand.',
    effect: '+1 Empire XP.',
    era: 4,
    cost: c(1500, 800),
    visible: (s) => s.era >= 4,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Fuel plaque hung. Dry tanks are a choice, not a surprise.',
  },
  {
    id: 'control-nameplate',
    name: 'Control Nameplate',
    voice: 'A brass plate that says TOWER. Ego is a renewable resource.',
    effect: 'Brand +1%.',
    era: 4,
    cost: c(2500),
    visible: (s) => s.era >= 4 && s.control >= 1,
    run: (s) => {
      s.brand = Math.min(1, s.brand + 0.01)
    },
    done: 'Nameplate screwed on. Control looks official.',
  },
  {
    id: 'franchise-seal-kit',
    name: 'Franchise Seal Kit',
    voice: 'Stickers, templates, a letter that says “we are still us.”',
    effect: 'Brand +2%.',
    era: 4,
    cost: c(4000, 1200),
    visible: (s) => (s.fleet?.franchises ?? 0) >= 1,
    run: (s) => {
      s.brand = Math.min(1, s.brand + 0.02)
    },
    done: 'Seal kit used. Lookalikes feel slightly less convincing.',
  },
  {
    id: 'wet-lane-boots',
    name: 'Wet-Lane Boots',
    voice: 'Rubber, tall, ridiculous. Ocean spray stops soaking the paperwork.',
    effect: '+1 Empire XP.',
    era: 4,
    cost: c(1800, 900),
    visible: (s) => s.era >= 4 && (s.fleet?.lanes ?? 0) >= 2,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Boots by the dock. Wet lanes get respect.',
  },
  {
    id: 'charter-chalk',
    name: 'Charter Chalkboard',
    voice: 'Replication / Survey / Shell columns. Points stop living in someone’s head.',
    effect: '+1 Empire XP.',
    era: 5,
    cost: c(8000, 2000),
    visible: (s) => s.era >= 5 || s.fleet.launched,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Charter chalk hung. Allocation is public.',
  },
  {
    id: 'guardian-plaque',
    name: 'Guardian Plaque',
    voice: 'A small plate for the last barge that kept its name.',
    effect: '+1 Empire XP.',
    era: 5,
    cost: c(12_000, 3000),
    visible: (s) => !!s.fleet?.guardianUsed || (s.fleet?.barges ?? 0) >= 1,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Guardian plaque filed. Legacy gets a noun.',
  },
  {
    id: 'orbit-sketch',
    name: 'Orbit Sketch Pad',
    voice: 'Circles that pretend gravity is optional.',
    effect: '+1 Empire XP.',
    era: 5,
    cost: c(10_000, 2500),
    visible: (s) => s.fleet.launched,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Orbit sketched. The taller backroom has a doodle.',
  },
  {
    id: 'legacy-ledger',
    name: 'Legacy Ledger',
    voice: 'Plaques, wars, barges lost. Score becomes a museum.',
    effect: '+1 Empire XP.',
    era: 6,
    cost: c(20_000, 4000),
    visible: (s) => s.era >= 6 || (s.fleet?.legacy ?? 0) > 0,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Legacy ledger opened. Silence gets an index.',
  },
  {
    id: 'ration-stamp',
    name: 'Ration Stamp',
    voice: 'The last stamp before Accept or Reject.',
    effect: '+1 Empire XP.',
    era: 6,
    cost: c(5000),
    visible: (s) => !!s.memos['universal-ration'] || s.era >= 6,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Ration stamp inked. The ending has stationery.',
  },
  {
    id: 'exile-map',
    name: 'Exile Map Corner',
    voice: 'A pin for the next universe, blank on purpose.',
    effect: '+1 Empire XP.',
    era: 6,
    cost: c(8000, 1000),
    visible: (s) => s.era >= 6,
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Exile corner marked. Appetite has a place to point.',
  },
  {
    id: 'gallery-quiet',
    name: 'Gallery Quiet Sign',
    voice: 'NO FLASH. Mythic plaques prefer silence.',
    effect: '+1 Empire XP.',
    era: 6,
    cost: c(3000),
    visible: (s) => s.endingChoice === 'reject' || !!s.memos['reject-silence'],
    run: (s) => {
      s.empire.xp = (s.empire.xp ?? 0) + 1
    },
    done: 'Quiet sign hung. Reject keeps its manners.',
  },
]

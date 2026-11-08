/** Ops Wiki — strategy + walkthroughs. Spoiler-gated by `era`; GuidePage opens to save era (or spoilers). */

export interface GuideSection {
  id: string
  title: string
  /** Lowest era required to show (0–1 always open for new players via Math.max(1, playEra)). */
  era: number
  topic: string
  blurb: string
  body: string
}

export const GUIDE_TOPICS: { id: string; label: string }[] = [
  { id: 'start', label: 'Start here' },
  { id: 'walk', label: 'Walkthroughs' },
  { id: 'faq', label: 'How do I…' },
  { id: 'systems', label: 'Systems' },
  { id: 'ops', label: 'Standing orders' },
  { id: 'era2', label: 'Chain & capital' },
  { id: 'era3', label: 'Cold & politics' },
  { id: 'late', label: 'Globe & beyond' },
]

export const GUIDE_SECTIONS: GuideSection[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // START HERE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'start-what',
    title: 'What is Grocery Empire?',
    era: 0,
    topic: 'start',
    blurb: 'One counter that outgrows the block.',
    body: `THE PITCH
  You run a neighborhood grocery that becomes an empire. Eras add departments;
  memos open doors; baskets are how the block remembers you; cash pays rent and trucks.

TWO SCORES
  Baskets — the only progress score. Reputation and Empire climb from baskets.
  Cash — fuel. Rent, wages, crates, builds, and memos spend it. Parked cash
  only yields inside an Empire-scaled cap; surplus sits idle until you withdraw.

HOW YOU WIN A SESSION
  Keep the shelf stocked, clear the bottleneck (shelf / unpack / checkout / demand),
  stamp the era’s gate memos, and spend cash to raise baskets — not to print more cash.

WHERE TO LOOK
  Floor — heartbeat (Unpack, price, buy crates).
  Memos — permanent projects.
  Coach — spotlight tours (replay anytime).
  More → Ops Wiki — this document.
  Checklist (More) — era-scoped goals only.`,
  },
  {
    id: 'start-controls',
    title: 'UI map · where everything lives',
    era: 0,
    topic: 'start',
    blurb: 'Menus, meters, and what not to ignore.',
    body: `TOP BAR
  Baskets · Cash · Era title · Live/Paused · Sold / Rev / Net rates · Undo.
  After the back office opens, Baskets shows “Rep @ N” — your next Reputation +1.

FLOOR
  Unpack (backroom → shelf), Price, Stock aisle chips + Buy crate.
  Shoppers only buy shelf stock. Starter crate / Mentor / Bailout appear on tight weeks.

MEMOS
  Search, Ready, Cheap first. Back office: Att bar, Reputation (+ next milestone),
  Analyst / Archive buttons.

OTHER EARLY MENUS
  Backroom — crates waiting; restock priority lives here.
  Suppliers — aisle + truck + auto-restock; restock priority also here.
  Staff · Marketing · Books · Invest · Build · Upgrades · Ventures · Land —
  unlock via memos as you go.

COACH
  Chapters by era. Open / Done / All filters. Skip is always allowed mid-tour.`,
  },
  {
    id: 'start-first-hour',
    title: 'First hour · do this',
    era: 0,
    topic: 'start',
    blurb: 'A concrete opener from empty counter to corner store.',
    body: `MINUTE 0–5
  1. Unpack until the shelf has stock.
  2. Leave price near $1.50 unless Best ≈ appears (Price IQ).
  3. Buy a cans crate when the backroom thins — watch the wholesale index.
  4. Follow Coach spotlights; Skip if you already know the control.

MINUTE 5–20
  5. Stamp early memos: Box Cutter / Hand Truck / Help Wanted when they fit.
  6. Hire a clerk when wages feel affordable (~under 40% of revenue).
  7. Unlock Produce when ready — buy PRD crates separately; mix does not order them.
  8. Buy Steady Rhythm / Quick Hands on Upgrades when the menu opens.

MINUTE 20–60
  9. Open Back-Office Desk (~1,200 baskets). Spend Reputation on Archives first.
  10. Raise Att cap before chasing 1.2k+ Att memos.
  11. Coolers → dairy/meat when permits land.
  12. Coffee cart for side cash. Passbook for idle till money.
  13. Lot / side yard when cash is calm — that ends Era 1.`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WALKTHROUGHS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'walk-e0',
    title: 'Walkthrough · Era 0 · The Counter',
    era: 0,
    topic: 'walk',
    blurb: 'One shelf, one price, soft rent.',
    body: `GOAL
  Learn Unpack → sell → wholesale → rent. Stamp basic memos. Reach a stable till.

LOOP
  Cash buys crates → truck fills backroom → Unpack fills shelf → shoppers buy →
  baskets + cash. Empty shelf = no sales. Full backroom with empty shelf = click Unpack.

PRICE
  Start ~$1.50. Climbing stock → lower. Stockouts → raise or Unpack harder.
  Price IQ “Best ≈” is a slow truck average snapped to 10¢ — Match sets it in one tap.
  Do not chase max margin while the shelf is empty.

WHOLESALE
  Index walks. Buys under ~$0.85 are wins early. One crate at a time is fine.
  Floor Stock chips pick the aisle (CAN / HSE / PRD…).

RENT
  Soft. Arrears hurt but recovery rails exist. Keep selling.

MEMOS TO PRIORITIZE
  Unpack throughput (Box Cutter), crate size (Hand Truck), Help Wanted,
  chalkboard / flyers lightly, then categories and the Back-Office Desk.

EXIT TO ERA 1
  Soft — staff, produce, Attention desk, and neighborhood systems layer in.
  You do not “beat” Era 0; you outgrow it.`,
  },
  {
    id: 'walk-e1',
    title: 'Walkthrough · Era 1 · Corner Store',
    era: 1,
    topic: 'walk',
    blurb: 'Staff, produce, Attention, lot.',
    body: `GOAL
  Run a real corner: perishables, payroll, back office, and buy the lot.

ATTENTION DESK (CRITICAL)
  Cap = Archives × 1,000. Buy Archive (+1k cap) with 1 Reputation before Analysts
  when memos cost more Att than you can hold. Baskets shows Rep @ next milestone.

PRODUCE / SPOIL
  Buy PRD crates on purpose. FIFO: oldest first. Dump Cooler if rot chokes the shelf.
  Mist / cooler memos buy time — they do not replace buying cans for stable fill.

STAFF
  Clerk for Unpack. Stocker for produce. Cashier for checkout cap. Security vs shrink.
  Morale is soft; fix wages / staff room rather than panic-firing.

MARKETING
  A few ad levels early, then stop. Cost doubles; pull rises slowly.

LAND
  Survey memo → Land menu → Side Yard / Lot when cash + calm allow.
  Side yard / lot gate Era 2.

CHECKPOINTS
  □ Back office open · Archives ≥ 2 before fat Att memos
  □ Produce without constant dump panic
  □ Coffee or meal kits for side cash
  □ Passbook parking idle cash
  □ Lot / side yard bought`,
  },
  {
    id: 'walk-e2',
    title: 'Walkthrough · Era 2 · Chain',
    era: 2,
    topic: 'walk',
    blurb: 'Second door, depot, book, Read, Autonomous.',
    body: `GOAL
  Operate more than one keyring without starving Attention or the till.

STORES
  Flagship seeds automatically. Open Store 2+ from Land when cash allows.
  Split Attention shares. Neglected stores drift (spoil / shrink / inspection heat).
  Policies: Local (traffic), Standard, Premium (richer tickets).

DEPOT
  Build before store five. Unlocks Ghost Kitchen and the Autonomous gate.

CAPITAL
  Incorporate when expansion cash is the bottleneck (cash + Reputation).
  Board meetings: resolve them; neglect taxes Reputation slowly.
  Debt covenant blocks vanity expansion when leverage is high — repay / buffer.

INVEST BOOK
  Trading Desk memo. Park cash. Mid after engine L2. High only with calm debt.
  Circuit breaker at −40% from peak — withdraw or force Low to reset.

STRATEGY / READ
  Tournaments spend Attention for Read. Buy doctrines in order.
  Bank Read; later eras eat it. Early engine L2–L4 is enough.

GATE OUT — AUTONOMOUS
  Depot + Read threshold + Reputation spent on Analysts/Archives.
  Release zeros unspent Reputation; keeps office, Ideas, Read, and the book.`,
  },
  {
    id: 'walk-e3',
    title: 'Walkthrough · Era 3 · Cold Chain',
    era: 3,
    topic: 'walk',
    blurb: 'Plants, tanks, Momentum, leave region.',
    body: `GOAL
  Keep cold surplus positive while draining county yield to zero, then leave.

COLD
  Cold Plant Permit stamps Era 3. Plants add supply and drain yield. Tanks buffer.
  Surplus = plant supply (+quadratic later) + tanks − demand.
  Brownout floors freshness at 25% and pauses Momentum — delay, not doom.

MOMENTUM
  After tanks. Compounds while freshness ≥ 100%. Crash → auto-shed newest plant.
  Prefer not to brown out; rebuild + refill is the recovery.

POLITICS
  Lobby Retainer → Political Capital (leaky). Lobbyists trickle it back.
  Acquisition Desk buys neighbors (cash + PC). Heat rises; fines are soft-capped.
  Leave the Region when yield empty and Capital ≥ 15 — Era 4 gate.

CHECKPOINTS
  □ Plant + tank online · Momentum stamped
  □ Quadratic only when ready to leave
  □ Leave Region stamped`,
  },
  {
    id: 'walk-e45',
    title: 'Walkthrough · Era 4–5 · Globe & Charter',
    era: 4,
    topic: 'walk',
    blurb: 'Lanes, fuel, barges, drift.',
    body: `ERA 4 — LOGISTICS
  Fuel buffer before vanity lanes. Dry lanes idle; they do not brick.
  Control Tower + wet lanes tick Control. Franchises buy footprint but hit Brand.

ERA 5 — FLEET
  Seed Barge Berth. First launch costs cash + Read; later barges cash only.
  Charter axes: shell, replication, survey, transit, brand-seal.
  Suggested opener: Shell 5 · Replication 4 · Survey 1 · Transit 1.
  Guardian soft-floors the last barge under pressure. Reboot refunds points.
  Drift war → Legacy (raises Charter cap). Clear biomass → Era 6.`,
  },
  {
    id: 'walk-e6',
    title: 'Walkthrough · Era 6 · Ending',
    era: 6,
    topic: 'walk',
    blurb: 'Accept or Reject.',
    body: `GATE
  Universe biomass hits 0 after launch. Universal Ration opens Accept / Reject on Fleet.

ACCEPT
  Prestige loop. Soft-reset counter. Cosmetics / Shelf Tokens / meta carry.
  Hungry laws (mild mutators) optional for the next universe.

REJECT
  Ordered silence. No prestige loop. Gallery / Last Ration path.

Neither is failure. Pick the story you want filed.`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FAQ
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'faq-attention',
    title: 'How do I raise Attention past 1,000?',
    era: 0,
    topic: 'faq',
    blurb: 'Archives raise the cap. Analysts only fill it.',
    body: `YOUR CAP IS FULL — THAT IS NORMAL
  Att 1.00K / 1.00K means the tank is full. Cap = Archives × 1,000.

RAISE THE CAP
  Memos → Back office → Archive · +1k cap (costs 1 Reputation).
  Buy Archives until the next memo’s Att cost fits, then hire Analysts to refill.

GET REPUTATION
  Climbs with Baskets after the desk opens. Top bar shows “Rep @ N”.
  Memos shows unspent Rep and baskets remaining to the next +1.

FILL
  Analysts +8 Att/sec each (Ledger Tape +10%). Scanner Array = click bursts ≤ cap.
  Ideas mint only while Att is full and Ideas are on.

STUCK MEMOS AT 1.2k / 1.5k ATT
  You need another Archive first. Physically cannot hold that much with one cabinet.

WRONG SPEND?
  Back office → Rebalance (cash). Move one Analyst ↔ Archive. Keeps ≥1 of each.
  Cost rises each move. Confirm dialog before it lands.`,
  },
  {
    id: 'faq-reputation',
    title: 'Where is my next Reputation?',
    era: 0,
    topic: 'faq',
    blurb: 'Basket milestones — shown on Baskets and Memos.',
    body: `WHERE TO LOOK
  Top bar under Baskets: “Rep @ 12.0K” (example) after back office unlocks.
  Memos → Reputation line: unspent count + next +1 at N baskets + baskets to go.

HOW IT WORKS
  Hitting nextRepAt grants +1 Reputation and pushes the milestone farther
  (geometric gaps from 1,500 baskets). First milestone is around 1,500 baskets
  after the desk is live (exact number is on your save).

SPEND ORDER
  Archives (cap) → Analysts (fill) → later incorporate / emergencies / board tax.`,
  },
  {
    id: 'faq-shelf-mix',
    title: 'Why is my shelf only one aisle?',
    era: 0,
    topic: 'faq',
    blurb: 'Buy crates per aisle. Mix never orders.',
    body: `BUY = ONE AISLE
  Floor Stock chips (CAN / HSE / PRD…) then Buy. Each crate is that aisle only.

RESTOCK PRIORITY
  Lives on Backroom / Suppliers. Chooses which waiting crates Unpack pulls first.
  Empty cans in back → empty cans on shelf, no matter the slider.

STARTER CRATE
  Free recovery is cans. Mentor / bailout also lean cans.`,
  },
  {
    id: 'faq-broke',
    title: 'I’m broke / empty shelf',
    era: 0,
    topic: 'faq',
    blurb: 'Use recovery rails — they are intended.',
    body: `FLOOR · TIGHT WEEK
  Starter crate · Mentor · Bailout · Emergency delivery.

ALSO
  Unpack before buying more. Lower price toward Best ≈. Dump Cooler if produce rots.
  Passbook withdraw. Sell a build tier. Pause ads. Cut vanity upgrades.`,
  },
  {
    id: 'faq-spoil',
    title: 'Everything is rotting',
    era: 1,
    topic: 'faq',
    blurb: 'Buy less perishable, cool more, dump when stuck.',
    body: `SHORT TERM
  Dump Cooler. Prefer cans/household buys until the shelf breathes.
  Unpack stables first via restock priority (Prefer cans).

MEDIUM
  Reach-in / walk-in / misting memos. Hire a stocker. Lower produce mix weight.
  Do not fill the entire shelf with PRD at max price.`,
  },
  {
    id: 'faq-inspection',
    title: 'Inspection heat',
    era: 1,
    topic: 'faq',
    blurb: 'Prep memos and low spoil beat panic.',
    body: `Prep for the Inspector / Clipboard Rounds slow the meter.
  Keep spoil and shrink down. Failures sting; they do not delete the save.
  Dairy/meat increase heat pressure — coolers before vanity protein.`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEMS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'sys-floor',
    title: 'System · Floor & wholesale',
    era: 0,
    topic: 'systems',
    blurb: 'Heartbeat economics.',
    body: `UNPACK
  Moves backroom → shelf up to shelf cap. Manual click (+hold with Steady Rhythm).
  Staff unpack continuously when hired.

PRICE
  One shelf price scaled per category. Demand falls as price rises vs cost.

WHOLESALE
  Walking index. Supplier A fast; B cheaper, slower, 2-crate min, occasional shorts.
  Auto-restock: buys when backroom < min and unit cost ≤ your max.

CATEGORIES
  Unlock via memos. Each adds demand variety (+12% per extra) but shares the pool.
  Always buy the aisle you want — unlock ≠ free stock.`,
  },
  {
    id: 'sys-office',
    title: 'System · Back office',
    era: 0,
    topic: 'systems',
    blurb: 'Attention, Archives, Ideas, Reputation, Scanner.',
    body: `UNLOCK
  Back-Office Desk memo. Opens Analyst / Archive and Att costs on memos.

ATTENTION
  Soft currency. Cap = Archives × 1,000. Income = Analysts × 8/sec (± Ledger Tape).

ARCHIVES
  +1k cap each. Buy with Reputation. Priority when Att costs exceed the bar.

ANALYSTS
  Faster fill. Useless if the tank is already full and you never spend Att.

IDEAS
  Big Ideas Jack / napkin path: mint while Att full + Ideas on. Separate memo sink.

SCANNER
  Click pulse. Wobble skim/spike. Capped. “Archives full” = burst wasted — buy Archive.

REPUTATION
  Basket ladder. UI shows next milestone. Spend it; unspent is not a trophy.

REBALANCE
  Paid cash move between Analyst and Archive if you spent Rep the wrong way.
  Escalating cost. Always keep at least one of each.`,
  },
  {
    id: 'sys-memos',
    title: 'System · Memos',
    era: 0,
    topic: 'systems',
    blurb: 'Permanent projects, not a shop.',
    body: `VOICE VS EFFECT
  Voice is story. Effect is mechanical truth. Buy gates that open menus you need.

COSTS
  Cash early. Attention after the desk. Ideas for a parallel track.
  If Att cost > cap, buy Archive — do not grind Analysts into a full tiny tank.

FILTERS
  Ready = affordable now. Cheap first = sort by cash. Favorites pin to top.
  Seen memos stay listed even if reveal conditions wobble.

ORDER OF OPERATIONS (EARLY)
  Throughput → desk → Archives → categories/coolers → Land → lot.`,
  },
  {
    id: 'sys-staff',
    title: 'System · Staff & morale',
    era: 1,
    topic: 'systems',
    blurb: 'Hands, wages, soft meters.',
    body: `ROLES
  Clerk — Unpack. Cashier — checkout cap. Stocker — perishables. Security — shrink.
  Hire when wage share fits revenue. Overstaffing idles cash.

XP / LEVELS
  Staff level with time on the job. Training upgrades accelerate.

MORALE
  Soft target from wages / room / pizza. Low morale frays the day; recover, don’t reset.

TRAITS
  Some hires carry a soft trait: Quick (+5% pace), Dreamy (−5% pace), Frugal (−5% wage),
  Picky (+5% wage). Shown on the roster. Never worth firing over.`,
  },
  {
    id: 'sys-build-up',
    title: 'System · Build & Upgrades',
    era: 1,
    topic: 'systems',
    blurb: 'Shell vs leveled trees.',
    body: `BUILD
  Tracks: storefront, storage, cold, production, transit, civic.
  Buy the bottleneck you feel. Era-locked next tiers stay hidden until reachable.
  Sell refunds the last tier.

UPGRADES
  Trees: Floor, Supply, Brand, later Space.
  Small frequent buys when memos are gated. Floor = unpack/baskets; Supply = crates.`,
  },
  {
    id: 'sys-ventures',
    title: 'System · Ventures',
    era: 1,
    topic: 'systems',
    blurb: 'Side tills beside the aisle.',
    body: `Open with permits / gates. Collect before the store cap fills — overflow stops stacking.
  Level with spare cash. Optional forever; never required to clear an era.
  Coffee early. Meal kits eat produce. Later ventures unlock with their doors.`,
  },
  {
    id: 'sys-invest',
    title: 'System · Passbook & Invest',
    era: 1,
    topic: 'systems',
    blurb: 'Park surplus inside a cap — surplus above the cap earns nothing.',
    body: `PASSBOOK
  Slow safe interest (~0.8%/hr). Only the balance inside the Empire-scaled cap earns.
  Better Passbook / Vault Clerk / Float Discipline raise the cap.

RISK BOOK (ERA 2+)
  Trading Desk unlocks. Low ~3%/hr, Mid ~7%, High ~14% — on the yielding slice only.
  Engine raises the cap and a little of the mean. Circuit breaker after −40% from peak.
  Withdraw surplus to spend on baskets; parked fortunes stop climbing.`,
  },
  {
    id: 'sys-weather',
    title: 'System · Weather',
    era: 1,
    topic: 'systems',
    blurb: 'Rain, heat, cold — a few minutes each.',
    body: `ROTATION
  Weather changes every few minutes from Era 1. Weather Radio shows tomorrow on the Floor.

EFFECTS
  Rain — +12% demand, cans pull harder. Heat — slightly more demand, dairy pulls harder,
  produce wilts faster. Cold snap — fewer shoppers, spoil slows.

PREP
  Rain Plan doubles the rain bonus and halves the heat penalty. Weather Window
  (Upgrades) scales the bonuses. Nothing here is ever required — it is texture with numbers.`,
  },
  {
    id: 'sys-coupon-war',
    title: 'System · Coupon wars & rivals',
    era: 2,
    topic: 'systems',
    blurb: 'Mild pressure with a verb attached.',
    body: `COUPON WAR (ERA 2+)
  A rival circular cuts demand about 8% for ~90s. Marketing shows Match — it costs about
  half your next ad. Ends early, restores demand, and nudges Brand up. War Matcher (Upgrades) can auto-answer.

OTHER RIVAL MOVES
  Price undercut (−6% demand), Staff poach (morale dips), Health smear (−5% demand).
  One at a time, ~80s each, ~10+ minutes apart. Marketing offers an Answer button for the
  price; each ends early. Never stacks on a coupon war. Never bricks.

RULE OF THUMB
  If the war is young and cash is flush, answer. If it is nearly over, let it fade.`,
  },
  {
    id: 'sys-celebrity',
    title: 'System · Celebrity endcap',
    era: 2,
    topic: 'systems',
    blurb: 'A loud two minutes of demand.',
    body: `WHAT IT DOES
  +25% demand for 120s (Campaign Kit adds a little). Costs cash plus Ideas — a real Ideas sink.

THE CATCH
  When the cameras leave there is a ~40% chance of a small Brand nick. It regenerates.

WHEN TO BOOK
  Book it when the shelf and checkout can keep up — a demand spike into an empty
  shelf buys nothing.`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ops-principles',
    title: 'Standing orders',
    era: 0,
    topic: 'ops',
    blurb: 'Throughput, Archives-first, recovery rails.',
    body: `1. Optimize throughput, not margin.
2. Buy marketing early, then stop.
3. Archives before Analysts.
4. Hoard the era’s true sink (Archives → Read → cold reserve → Charter).
5. Prefer not to brown out after Momentum — crash is delay.
6. Use recovery rails freely.
7. Buy upgrades/ventures steadily when memos are gated.
8. Spend Reputation; do not museum it.`,
  },
  {
    id: 'ops-speed-idle',
    title: 'Speedrun vs idle',
    era: 1,
    topic: 'ops',
    blurb: 'Same eras, different clock.',
    body: `SPEEDRUN
  Steady Rhythm. Speed multipliers after unlock. Skip flavor memos.
  Rush Archives → Analysts → Att memos → lot.

IDLE
  Auto-restock with a sane max unit cost. Policies set and left.
  Tournaments when Att is flush. Offline 8h: produce dies; cans do not.`,
  },
  {
    id: 'ops-mistakes',
    title: 'Common mistakes',
    era: 0,
    topic: 'ops',
    blurb: 'What burns early runs.',
    body: `· Treating Restock priority as an order form.
  · Stacking Analysts at 1 Archive while 1.5k Att memos sit locked.
  · Filling the shelf with produce only.
  · Infinite ads.
  · Buying the lot while broke and in arrears.
  · Ignoring Unpack while the backroom is full.
  · Hoarding Reputation “for later” while Att-capped.`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ERA 2+ DETAIL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'era2-detail',
    title: 'Era 2 systems detail',
    era: 2,
    topic: 'era2',
    blurb: 'Stores, depot, board, Read, Autonomous.',
    body: `ATTENTION SPLIT
  Each store wants share. Drift raises spoil/shrink/inspection on neglected doors.
  Store XP from sales share softens the tax.

DEPOT
  Before five stores. Demand buff, Ghost Kitchen, Autonomous prerequisite.

BOARD / INCORPORATE
  Flip when cash for expansion is the bottleneck. Resolve meetings.

READ
  Tournament currency. Doctrines in order. Bank for Charter later.

AUTONOMOUS
  End of Era 2 spine. Spend Rep into the office first; release zeros the wallet.`,
  },
  {
    id: 'era3-detail',
    title: 'Era 3 systems detail',
    era: 3,
    topic: 'era3',
    blurb: 'Cold math and politics pressure.',
    body: `SURPLUS
  Plants (+quadratic) + tanks − demand. Negative → brownout floor + Momentum pause.

AUTO-SHED
  Dumps newest plant. Tanks stay. Rebuild deliberately.

POLITICAL CAPITAL
  Leaky. Lobbyists refill. Acquisitions spend cash+PC and raise monopoly heat.
  Leave Region is the map-expansion button when yield is empty.`,
  },
  {
    id: 'late-detail',
    title: 'Era 4–6 systems detail',
    era: 4,
    topic: 'late',
    blurb: 'Fuel, Charter, endings.',
    body: `LANES / FUEL / CONTROL
  Wet lanes work. Dry lanes idle. Control spends like late-game cash.

CHARTER
  Allocate before hard launches. Guardian once per pressure cycle. Reboot to respec.
  Legacy from drift war raises Charter cap.

ENDINGS
  Accept = prestige soft-reset. Reject = ordered silence. Both are valid closings.`,
  },
]

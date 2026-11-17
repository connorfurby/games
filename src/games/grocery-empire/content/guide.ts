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
  { id: 'choices', label: 'Decisions' },
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
  Crate prices move. Restock tells you when they are low. One crate at a time is fine.
  Floor Stock chips pick the aisle (CAN / HSE / PRD…).

RENT
  Soft. Arrears hurt but recovery rails exist. Keep selling.

MEMOS TO PRIORITIZE
  Unpack throughput (Box Cutter), crate size (Hand Truck), Help Wanted,
  chalkboard / flyers lightly, then categories and the Back-Office Desk.

EXIT TO ERA 1
  Feature cans · satisfy regulars · buy on three price dips · staff the opening shift (or 800+ baskets)
  · Star Board ≥ 3.5. You do not “beat” Era 0; you outgrow it.`,
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

STAFF · SHIFT BOARD
  Clerk for Unpack. Assign Open / Mid / Close. Unstaffed Open hurts spoil.
  Produce Lead on the board feeds the side-yard gate.

INVOICE BOOK · PLANOGRAM
  Pay invoices on time (Suppliers / Books). Practice the flagship planogram twice,
  then file at 72% or better for credit before the side yard.

LAND
  Survey memo → Land menu → Side Yard when regulars, invoices, Open days, and planogram clear.
  Side yard / lot gate Era 2.

CHECKPOINTS
  □ Back office open · Archives ≥ 2 before fat Att memos
  □ Regulars + Open days + on-time invoices
  □ Flagship planogram credited
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
  Split Attention between stores. A store you never visit slowly slips (more spoilage, theft and inspections).
  Policies: Local (traffic), Standard, Premium (richer tickets).

DEPOT
  Build before store five. Unlocks Ghost Kitchen and the Autonomous gate.

CAPITAL
  Incorporate when expansion cash is the bottleneck (cash + Reputation).
  Board meetings: resolve them; neglect taxes Reputation slowly.
  If you owe too much, the bank blocks new stores until you pay some back.

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
    blurb: 'Plants, tanks, the cold bonus, leaving the region.',
    body: `GOAL
  Keep cold supply ahead of demand while you use up the region’s supply, then leave.

COLD
  Cold Plant Permit stamps Era 3. Plants add cold supply and use up the region’s supply. Tanks keep you going in a power dip.
  Surplus = plant supply (+quadratic later) + tanks − demand.
  A power dip drops freshness to 25% and pauses the cold bonus: a delay, not a disaster.

MOMENTUM
  After tanks. Compounds while freshness ≥ 100%. Crash → auto-shed newest plant.
  Prefer not to brown out; rebuild + refill is the recovery.

POLITICS
  Lobby Retainer → Political Capital (leaky). Lobbyists trickle it back.
  Acquisition Desk buys neighbors (cash + PC). Heat rises; fines are soft-capped.
  Leave the region once its supply is used up and you have 15 Capital. That opens Era 4.

CHECKPOINTS
  □ Plant + tank online · cold bonus running
  □ Quadratic only when ready to leave
  □ Leave Region stamped`,
  },
  {
    id: 'walk-e45',
    title: 'Walkthrough · Era 4–5 · Globe & Charter',
    era: 4,
    topic: 'walk',
    blurb: 'Routes, fuel, barges and Off-Brand.',
    body: `ERA 4 — LOGISTICS
  Fuel buffer before vanity lanes. Dry lanes idle; they do not brick.
  The Control Tower and fuelled routes earn Control. Franchises grow fast but wear on Brand.

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
  Department roles (Fresh, Chain, Cold…) sit in their own seat pools — they do not
  eat floor seats. Wages soft-cap near 30% of recent revenue.

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
5. Try not to let the power dip once the cold bonus is running; a dip only delays you.
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
  // DEPTH LOOPS (eight systems)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'sys-depth-eight',
    title: 'Eight depth systems',
    era: 0,
    topic: 'systems',
    blurb: 'Regulars → Shift Board → Planogram → Invoices → Stars → Flyer → Cooler/Dispatch → Pocket/Hearing.',
    body: `REGULARS (Floor)
  Named shoppers with facing wants and patience. Serve for stars; miss and demand dips.
  Era 1 and the side yard need counted satisfies — not one visit.

SHIFT BOARD (Staff)
  Open / Mid / Close. Unstaffed Open hurts spoil. Side yard wants Open days;
  cold wants opening and closing shifts; barges want the middle shift.

FLAGSHIP PLANOGRAM (Floor)
  Practise twice, then file at 72% or better. Redo it after new aisles open.

INVOICE BOOK (Suppliers / Books)
  Due timers, early-pay discount, late fees that hit stars. Lot Survey and leave care.

STAR BOARD (top bar chip)
  1.0–5.0 next to Next-goal. Soft-caps demand and franchise loyalty; freezes in ration week.

FLYER DESK (Marketing)
  Weekly craft with cooldown. Cold permit wants three completed weeks, not one Circular.

COOLER LOG + DISPATCH (Cold / Logistics)
  Sign timed logs for leave. Match lane cargo for clean manifests before the barge.

POCKET OPS + HEARING DOCKET (Fleet / Charter)
  Hauler ETAs clear pockets (trips open Era 6). Concord hearings (3 sessions) before the stamp.

FORKS
  Facings, stances, and the charter each have an entry under Decisions.`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DECISIONS (40.0) — one entry per fork the game asks you to make
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'choice-facing',
    title: 'Safe or Bold facing',
    era: 1,
    topic: 'choices',
    blurb: 'Build raises ask for a facing: the steady card or the sharper one.',
    body: `Storefront, cold and transit raises open a facing slot at certain tiers (Build panel). Each slot is
a pick between two cards: Safe (the steadier effect, usually shelf, backroom or spoil) or Bold (the sharper one,
often demand). The pick is permanent for that slot. Facing bonuses soft-cap at ×1.35 across the whole store.

If a raise is blocked, the Build panel says "Pick a facing" — choose before the next tier.
SEE ALSO  Systems · Build ladder.`,
  },
  {
    id: 'choice-regulars',
    title: 'Two regulars and the invoice fork',
    era: 1,
    topic: 'choices',
    blurb: 'Who to serve first, and whether to float the bill.',
    body: `Two regulars can wait at once. Each keeps its own patience; switch between them on the Floor. The Facing
sheet says what each wants and which facing they notice.

Invoices (Suppliers) ask: pay now for the early discount, float the bill (late fee, stars suffer), or hire the
clerk. The slip shows both prices. A floated bill ages and its late fee hits your stars.
SEE ALSO  Eight depth systems.`,
  },
  {
    id: 'choice-flyer',
    title: 'Flyer discounts: deep, mid, soft',
    era: 2,
    topic: 'choices',
    blurb: 'Your weekly flyer is how you answer Penny and FreshWay.',
    body: `Deep pulls Penny in: she locks your aisles sooner. Soft lets FreshWay spoil your produce faster.
Mid keeps the peace. The choice lasts only while the week runs; finished weeks still count toward the cold
permit whatever you chose. Print deep when you can afford a lock, soft when your cooler is signed.
SEE ALSO  Era 2 systems detail · Flyer Desk.`,
  },
  {
    id: 'choice-manifest',
    title: 'Filing a run: clean, for inspection, fast',
    era: 4,
    topic: 'choices',
    blurb: 'Each run is filed one way. The choices never stack.',
    body: `Clean counts as a clean run right away (you need these for the barge berth). For inspection starts an
inspection; pass it in time and it counts as an inspection instead. Fast spends the route for a quick burst of
cash, counts as neither, and leaves the route open to MegaMart. The note under each choice says why it is blocked.
SEE ALSO  Era 4–6 systems detail · Dispatch.`,
  },
  {
    id: 'choice-charter',
    title: 'Charter fork: Standard, Boutique, Co-op',
    era: 12,
    topic: 'choices',
    blurb: 'Sign one before the Last Aisle. It reshapes your multipliers.',
    body: `Standard: network ×1.25, but you can only use the ready-made answer on puzzles and scores stay at 72%.
Boutique: no network bonus, puzzle scores may reach 100%, and anything over 72% boosts that puzzle’s bonus (up to ×1.5).
Co-op: ventures ×1.12, network ×0.92. The fork sits on your Next Goal until you sign.
SEE ALSO  Eras 7–12 · Worlds puzzles (charter → Last Aisle).`,
  },
  {
    id: 'choice-endless',
    title: 'Endless mutations',
    era: 12,
    topic: 'choices',
    blurb: 'After Accept the standing order keeps changing. Ease the Ration Board to restore.',
    body: `Each mutation scratches a line and may ban a clause or fork. Toggle another clause (or set another venture's
fork) to lift a ban. Endless Edit Pad slows mutations; Mutation Clear Pad restores a scarred line.
SEE ALSO  After Accept · the standing order.`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ERA 2+ DETAIL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'era2-detail',
    title: 'Era 2 systems detail',
    era: 2,
    topic: 'era2',
    blurb: 'Stores, Flyer Desk, depot, board, Autonomous.',
    body: `ATTENTION SPLIT
  Each store wants share. Drift raises spoil/shrink/inspection on neglected doors.
  Store XP from sales share softens the tax.

FLYER DESK
  Print a week (2 aisles + promise). Wait it out, cool down, repeat ×3 for the cold permit.
  Penny can force a counter-flyer — clear it from the desk.

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
    blurb: 'Cooler Log, cold math, and politics pressure.',
    body: `COOLER LOG
  Temp checks on a timer. Plant Operator on the current shift auto-signs.
  Leaving the region needs signed logs, a blast freezer and tunnel, and bills, not just used-up supply.

SURPLUS
  Supply is plants plus tanks minus demand. Below zero, the power dips and the cold bonus pauses.

AUTO-SHED
  Dumps newest plant. Tanks stay. Rebuild deliberately.

POLITICAL CAPITAL
  Leaky. Lobbyists refill. Acquisitions spend cash+PC and raise monopoly heat.
  Leaving the region opens the bigger map once its supply is used up.`,
  },
  {
    id: 'late-detail',
    title: 'Era 4–6 systems detail',
    era: 4,
    topic: 'late',
    blurb: 'Dispatch, Pocket Ops, endings.',
    body: `DISPATCH BOARD
  Match the cargo to a fuelled route, then pass the inspection before it closes. Clean runs and passed
  inspections open the barge berth.
  MegaMart snipes unassigned lanes.

LANES / FUEL / CONTROL
  Wet lanes work. Dry lanes idle. Control spends like late-game cash.

POCKET OPS
  Haulers travel on ETAs and rest at the berth after arrival — turnarounds count toward Era 6.
  Wrong ration wastes the trip. Four cleared pockets + Orbit Mid + Hold + ration facing open Era 6.

ENDINGS
  Ration week freezes the Star Board. Stamp the ration ledger once per shift-day before Continue —
  a day left unstamped lets the Ration Board skim a slice of demand until you do.
  Accept = prestige soft-reset. Reject = ordered silence.`,
  },
  {
    id: 'late-worlds',
    title: 'Eras 7–12 · Worlds puzzles',
    era: 7,
    topic: 'late',
    blurb: 'Practice filings, climate/settlement/haul, seating, rehearsal.',
    body: `PRACTICE THEN CREDIT
  Your first two tries at each puzzle are practice: they count for stock but do not open the next era.
  The safe answer (about 72%) is the slow way through; a clever one (about 85%) is the fast way.

ERA LOOPS
  Serve climate neighbors on stocked worlds (Era 8). Settle each credited stop (Era 9).
  Locking a bed for the season gives a harvest; bring it in before the season ends (Era 10).
  Each credited phrase posts its habit: that agent is locked to it (off their own job) until the watch resolves (Era 11).
  Seat each kept clause, then wait the gap (Era 12).

CHARTER → LAST AISLE
  Keep four clauses (serial seating). Concord puts each clause you seat to a hearing (3 sessions); a Minutes Clerk can amend one grudge away.
  Sign Standard, Boutique or Co-op. Finish list practice, practise to an 85% average (a miss crosses out a line), then Accept — Reject is unchanged.`,
  },
  {
    id: 'late-worlds-guests',
    title: 'Climate guests',
    era: 7,
    topic: 'late',
    blurb: 'Who walks in, and what they ban.',
    body: `A guest walks in for the climate of a world you stock. Serving them bans your strongest featured facing
until the shift turns — swap the facing to dodge it. Guest Patience (Pantry) softens the cut; the Guest Awning
project softens it further.`,
  },
  {
    id: 'late-worlds-bed',
    title: 'The bed lock',
    era: 9,
    topic: 'late',
    blurb: 'A chore holds the bed until the turn.',
    body: `A season chore locks the bed to that chore until the season turns. Bed Lock Pad (Cultivar) lifts the lock for the
last stretch of the season; the Bed Glass project lifts it a little earlier. The standard cross always files.`,
  },
  {
    id: 'late-worlds-table',
    title: 'The hearing table',
    era: 11,
    topic: 'late',
    blurb: 'How many grudges the clerk can strike.',
    body: `The Minutes Clerk strikes one grudge per docket. Clause Amend Pad and the Embassy Chair each add one more.`,
  },
  {
    id: 'late-worlds-endless',
    title: 'After Accept · the standing order',
    era: 12,
    topic: 'late',
    blurb: 'Mutations and the pads that help.',
    body: `Past the named worlds the list mutates a line every few worlds, and the Ration Board leans on it. Clear the
pressure from the Last Aisle. Endless Edit Pad stretches the gap between mutations; Mutation Clear Pad
restores a scarred line when you clear it. More under Decisions.`,
  },
]

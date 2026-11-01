/** In-game strategy guide (plan Part G). Spoiler-gated by `era`; GuidePage hides era>1 unless spoilers on. */

export interface GuideSection {
  id: string
  title: string
  era: number
  /** Plain text; GuidePage renders inside <pre>. */
  body: string
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'g1',
    title: 'G1 · Universal principles',
    era: 0,
    body: `OPS LOG — STANDING ORDERS

LORE
  Grocery Empire is one counter that outgrows the block. Baskets are the score
  (never spend). Cash pays rent and trucks. Eras layer departments; memos open doors.
  You cannot lose — bad weeks only slow you.

1. Optimize throughput, not margin.
   Cheap empty shelves beat expensive idle stock. Move units.

2. Buy marketing early, then stop.
   Ad cost doubles while pull rises ~8% per level. After a few buys, price and stock are the levers.

3. Archives before Analysts.
   Fill cabinets until the next memo fits. Overflow without Ideas is waste.

4. Hoard the era's true sink.
   Archives → Read (later) → cold reserve → Charter. Ignore bait sinks: infinite ads, max leverage, max replication.

5. Prefer not to brown out after Momentum.
   Compound is nice. Auto-shed and the freshness floor mean a crash is delay, not doom.

6. Use recovery rails freely.
   Emergency delivery, bailouts, Guardian presets — bad weeks stay playable.

7. Read is for later.
   Early investment engine L2–L4 is enough. Charter will eat Read.

8. Buy upgrades and ventures steadily.
   When memos are gated, leveled trees and side businesses keep the session moving.`,
  },
  {
    id: 'g2',
    title: 'G2 · Era 0–1 · Counter & corner',
    era: 0,
    body: `OPS LOG — ERA 0–1

WHOLESALE
  Watch the index. Buy below median. Hold auto-restock until mid Era 1 when you know a fair ceiling.

PRICE
  Open near $1.50. Stock climbing → lower. Stockouts → raise or unpack harder.

REPUTATION / ATTENTION
  First Reputation spends toward Archives, then cooler and pallet memos. Attention memos unlock after the back-office desk.

STAFF
  Hire a clerk when wages sit under ~40% of revenue. Produce wants a stocker or active FIFO babysitting.

DEBT
  Avoid the nephew float unless you are learning the books. If taken, repay before any mortgage talk.

INSPECTION
  Prep before dairy. Clipboard rounds and low spoil keep the meter honest.

LOT
  Buy when cash is solid, debt is calm, and Reputation has spare. Side yard ends Era 1.`,
  },
  {
    id: 'g3',
    title: 'G3 · Era 2 · Chain & capital',
    era: 2,
    body: `OPS LOG — ERA 2 [SPOILER]

QUESTION
  Where does scarce management Attention go, and what is money doing when it is not in the register?

STORES
  Lot / side yard flips Era 2 and seeds the Flagship. Open Store 2+ from Land.
  Policies: Local (traffic, more shrink), Standard (balanced), Premium (richer tickets, fewer trips).
  Split Attention across stores. Neglected stores drift — spoil, shrink, and inspection heat rise.
  Store XP levels from sales share; higher level softens the Attention tax.

DEPOT
  Build before store five. +chain demand, unlocks Ghost Kitchen, enables Autonomous gate.
  Catering opens with a second store or its memo; Ghost needs the depot.

INCORPORATE
  Flip when expansion cash is the bottleneck — not for flavor.
  Costs cash + Reputation. Opens equity float and the board calendar on Books.
  Ignoring board meetings slowly spends Reputation. Resolve them; never a brick.

DEBT COVENANT
  High leverage vs cash+book+equity blocks new stores, High-risk book, and metro expansion.
  Repay nephew float / keep cash buffer. Bailouts still exist.

INVESTMENT BOOK
  Trading Desk memo unlocks Invest. Deposit / withdraw, Low Mid High, buy engine levels.
  Book ticks every 2.5s. Fat left tail on High. Circuit breaker at −40% from peak —
  withdraw, deposit back above the line, or force Low to reset.

TOURNAMENT / READ
  Strategy menu: spend Attention, earn Read. Buy 8 doctrines in order; each sweetens payout.
  Bank Read. Early engine L2–L4 is enough; Charter (later) will eat Read.

LAND PORTFOLIO
  Parking, corner parcel, metro slot (needs depot + incorporate). Covenant applies.

AUTONOMOUS (ERA 2 GATE OUT)
  Need depot + Read threshold + Reputation spent on Analysts/Archives.
  Release zeros unspent Reputation; keeps Analysts, Archives, Ideas, Read, and the book.
  Hold a Read buffer for Era 5 Charter — or accept a slower climb to space.`,
  },
  {
    id: 'g4',
    title: 'G4 · Era 3 · Cold & state',
    era: 3,
    body: `OPS LOG — ERA 3 [SPOILER]

QUESTION
  Can you keep cold surplus positive while draining the county to zero?

COLD
  Cold Plant Permit stamps Era 3 and opens the Cold menu.
  Plants add supply and drain regional yield. Tanks are cheap buffer.
  Surplus = plant supply (+quadratic) + tank buffer − demand.
  Brownout floors freshness at 25% and pauses Momentum — delay, not doom.

MOMENTUM
  Momentum Clause after tanks are online. Compounds while freshness holds ≥100%.
  When surplus flips negative, auto-shed dumps the newest plant (tanks stay).
  Prefer not to brown out, but recovery is rebuild + refill — never a wipe.

DECOMMISSION
  Refund the newest plant anytime. Reshape plant/tank mix freely.

QUADRATIC
  County Emptying (memo after ≥3 plants): every plant counts twice for supply
  and multiplies yield drain. Take it when you are ready to Leave the Region.

POLITICS
  Lobby Retainer opens Political Capital — a leaky wallet; lobbyists trickle it back.
  Acquisition Desk: buy neighbors with cash + Capital. Monopoly risk rises;
  soft capped fines only — never bricks the run.
  Leave the Region when yield is empty and Capital ≥15 (memo gated).
  Leave is the Era 4 gate — Logistics unlocks.`,
  },
  {
    id: 'g5',
    title: 'G5 · Era 4–5 · Globe & charter',
    era: 4,
    body: `OPS LOG — ERA 4–5 [SPOILER]

ERA 4 — LANES
  After Leave the Region: Logistics menu — fuel, ocean lanes, Control, franchises.
  Open Lane costs cash (or Control) and needs a wet fuel buffer; dry lanes idle, never brick.
  Fuel Buffer memo raises cap. Buy fuel before stacking vanity lanes.
  Control Tower + wet lanes tick Control; empire cash also trickles Control slowly.

FRANCHISE VS LANES
  Franchises buy footprint for cash but hit Brand on sign and drift over time.
  Brand regenerates on its own; brand-seal Charter later accelerates recovery.
  Skip franchises (lanes only) if you want Brand intact before space.

ERA 5 — CHARTER
  Seed Barge Berth enters Era 5. First barge launch costs cash + Read; later barges cash only.
  Buy Charter points with Read; allocate among shell, replication, survey, transit, brand-seal.
  Recommended opener: Shell 5 · Replication 4 · Survey 1 · Transit 1 (brand-seal optional).
  Elliptic Hull memo: +2 replication bias after you have ~6 points allocated.
  Survey / transit speed biomass harvest; replication soft-grows barge count;
  shell + brand-seal resist Off-Brand drift war hits.
  Guardian preset (once per pressure cycle) locks a shell-heavy mix and soft-floors
  the last barge while biomass remains.
  Reboot Fleet refunds Charter into the pool for a small cash fee — respec freely.
  Off-Brand Contact starts drift war → Legacy (raises Charter cap). Soft-floor = 1 barge.
  Clear universe biomass → Era 6 Universal Ration.`,
  },
  {
    id: 'g6',
    title: 'G6 · Endings',
    era: 6,
    body: `OPS LOG — TERMINAL CHOICE [SPOILER]

GATE
  Era 6 opens when fleet biomass hits 0 after launch. Universal Ration memo
  opens the choice on Fleet (Accept Exile / Reject). Either choice is final for the run.

ACCEPT
  Prestige: hungry universe continues. Soft-resets the counter (era 0, starter cash).
  Shelf Tokens / cosmetics / meta remember you. Appetite and tip sharpness tick up.
  groceryUniverses increments. Continue from a fresh chalkboard.

REJECT
  Ordered disassembly. No prestige loop. Run pauses. Last Ration plaque /
  Mythic gallery path. Silence — the Off-Brand never gets your recipes.

Neither path is a failure state. Pick the story you want filed.`,
  },
  {
    id: 'g7',
    title: 'G7 · Speedrun vs idle',
    era: 1,
    body: `OPS LOG — SESSION PROFILES

SPEEDRUN
  Buy Steady Rhythm (hold-unpack). Abuse 2×/4×/8× after speed unlock.
  Skip flavor memos. Rush Archives → Analysts → Attention memos → lot / side yard.

IDLE
  Enable auto-restock on Suppliers (max unit cost + min backroom floor).
  Set store policies and leave them. Toggle notifications in Settings.
  When Strategy unlocks, run tournaments whenever Attention is flush.
  Offline cap is 8h: produce dies in the dark; cans do not.

Both profiles clear the same eras. Only the clock changes.`,
  },
]

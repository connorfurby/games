/**
 * Coach tours for Era 0–1 (plan Part O2).
 *
 * Step completion uses TutorialRun.baseline counters captured when the step
 * starts. Kind `stat` compares GameState.stats[key] (or a documented counter)
 * against baseline[key] + (min ?? 1). Other kinds read live state.
 *
 * Documented counter keys (baseline / doneWhen):
 *   stats.unpackedManual, stats.sold, stats.ordersPlaced, stats.ordersBelow85,
 *   stats.wholesaleSpent, stats.rentPaid, stats.priceChanges, stats.hires,
 *   stats.adsBought, stats.memosDone, stats.attentionFilled, stats.ideasEarned,
 *   stats.inspections, stats.inspectionsFailed, stats.upgradesBought,
 *   stats.buildsBought, stats.ventureCollects, stats.shrunk, stats.spoiled,
 *   baskets, compute.archives, compute.reputation, compute.ideas,
 *   passbook.balance, menus.*, memos.*, expansions.*, ventures.*, autoRestock.enabled
 */

export interface TutorialStep {
  id: string
  /** Matches data-coach-id in UI. */
  coachId: string
  title: string
  /** 2–4 short sentences. */
  body: string
  /** One line: if wrong, only slows you. */
  recovery: string
  action?: { type: string; params?: Record<string, unknown> }
  doneWhen: { kind: 'stat' | 'flag' | 'menu' | 'memo' | 'always'; key?: string; min?: number }
}

export interface TutorialDef {
  id: string
  name: string
  era: number
  steps: TutorialStep[]
}

export const TUTORIALS: TutorialDef[] = [
  // ── Era 0 ────────────────────────────────────────────────────────────────
  {
    id: 'unpack',
    name: 'Unpack',
    era: 0,
    steps: [
      {
        id: 'unpack-spot',
        coachId: 'floor-unpack',
        title: 'Unpack onto the shelf',
        body: 'Your starter cans sit in the backroom — that is storage, not the sales floor. Shoppers only buy what is on the shelf. Press Unpack once. It is free. It moves stock from back → front. That is the first half of the heartbeat.',
        recovery: 'If the shelf fills up, sales clear it; you only wait. Empty shelf = no sales.',
        action: { type: 'unpack', params: { n: 1 } },
        doneWhen: { kind: 'stat', key: 'unpackedManual', min: 1 },
      },
    ],
  },
  {
    id: 'baskets',
    name: 'Baskets',
    era: 0,
    steps: [
      {
        id: 'baskets-spot',
        coachId: 'floor-baskets',
        title: 'Baskets are the score',
        body: 'Wait a moment — when a shopper buys, you earn cash and a basket. Baskets never spend. They unlock memos, menus, and the story. The big number top-left is baskets. Cash beside it pays rent and trucks. Story lines also write along the bottom of the screen.',
        recovery: 'Slow sales only delay unlocks. Helpers keep you from soft-locking.',
        action: { type: 'openMenu', params: { menu: 'floor' } },
        doneWhen: { kind: 'stat', key: 'sold', min: 1 },
      },
    ],
  },
  {
    id: 'price',
    name: 'Price',
    era: 0,
    steps: [
      {
        id: 'price-spot',
        coachId: 'floor-price',
        title: 'Your shelf price',
        body: 'One price for the aisle — what shoppers pay per unit. Start near $1.50. Shelf piling up → nudge price down. Selling out constantly → raise price or unpack more. Price is the main early lever; ads come much later.',
        recovery: 'A bad price only slows cash. Wholesale and recovery crates still work.',
        action: { type: 'setPrice', params: { delta: -0.05 } },
        doneWhen: { kind: 'stat', key: 'priceChanges', min: 1 },
      },
    ],
  },
  {
    id: 'wholesale',
    name: 'Wholesale',
    era: 0,
    steps: [
      {
        id: 'wholesale-spot',
        coachId: 'floor-wholesale',
        title: 'Buy more stock',
        body: 'Buy wholesale spends cash and sends a truck. After a short delay, crates land in the backroom — then you Unpack to the shelf again. The walking cost dips and rises; buying below about $0.85 is a win. This is the other half of the heartbeat.',
        recovery: 'Overpaying only burns cash; wait for the next dip. You cannot go bankrupt.',
        action: { type: 'buyWholesale', params: { qty: 1 } },
        doneWhen: { kind: 'stat', key: 'ordersPlaced', min: 1 },
      },
    ],
  },
  {
    id: 'rent',
    name: 'Rent',
    era: 0,
    steps: [
      {
        id: 'rent-spot',
        coachId: 'floor-rent',
        title: 'Rent is a soft pressure',
        body: 'Rent ticks quietly while you sell. Short on cash → arrears pile up, then pay down from future sales. No interest death spiral, no game over. Keep a small float when you can; bailouts and starter crates exist if you go broke.',
        recovery: 'Falling behind only slows upgrades. You never get a game-over screen.',
        doneWhen: { kind: 'stat', key: 'rentPaid', min: 1 },
      },
    ],
  },

  // ── Era 1 ────────────────────────────────────────────────────────────────
  {
    id: 'staff',
    name: 'Staff Hire',
    era: 1,
    steps: [
      {
        id: 'staff-open',
        coachId: 'menu-staff',
        title: 'Open Staff',
        body: 'The Help Wanted memo opens Staff. A clerk unpacks while you handle price and wholesale. Hire when wages look small next to revenue.',
        recovery: 'Over-hiring just eats cash; fire or wait — morale recovers.',
        action: { type: 'openMenu', params: { menu: 'staff' } },
        doneWhen: { kind: 'menu', key: 'staff' },
      },
      {
        id: 'staff-hire',
        coachId: 'staff-hire-clerk',
        title: 'Hire a clerk',
        body: 'Clerks move stock to the shelf on a timer. One early hire frees your hands. Watch wages vs sales; pizza and breaks fix morale later.',
        recovery: 'A pricey hire only slows you — revenue still grows.',
        action: { type: 'hire', params: { role: 'clerk' } },
        doneWhen: { kind: 'stat', key: 'hires', min: 1 },
      },
    ],
  },
  {
    id: 'categories',
    name: 'Categories',
    era: 1,
    steps: [
      {
        id: 'categories-spot',
        coachId: 'backroom-categories',
        title: 'New categories',
        body: 'Produce and household join cans. Each category has its own demand and cost. Mix weights decide what restock prefers. Start small — one perishable line is enough.',
        recovery: 'Wrong mix only idles cash in the wrong crates; switch weights anytime.',
        action: { type: 'openMenu', params: { menu: 'backroom' } },
        doneWhen: { kind: 'flag', key: 'categories.produce' },
      },
    ],
  },
  {
    id: 'spoilage',
    name: 'Spoilage / FIFO',
    era: 1,
    steps: [
      {
        id: 'spoilage-spot',
        coachId: 'backroom-fifo',
        title: 'Oldest first',
        body: 'Perishables age on the shelf and in back. Sales pull the oldest batch first. Stockers slow spoilage; coolers stretch life. Dump only when the meter forces your hand.',
        recovery: 'Spoil writes off stock — painful, not fatal; emergency delivery covers gaps.',
        action: { type: 'openMenu', params: { menu: 'backroom' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'ads',
    name: 'Ads',
    era: 1,
    steps: [
      {
        id: 'ads-spot',
        coachId: 'marketing-ads',
        title: 'Buy an ad',
        body: 'Marketing multiplies foot traffic. Early ads pay; costs rise fast. Buy a few levels, then lean on price and stock. Ads are not the late-game sink.',
        recovery: 'Overspending on ads only slows other buys — demand still ticks.',
        action: { type: 'buyAd' },
        doneWhen: { kind: 'stat', key: 'adsBought', min: 1 },
      },
    ],
  },
  {
    id: 'memos',
    name: 'Memos',
    era: 1,
    steps: [
      {
        id: 'memos-spot',
        coachId: 'floor-memos',
        title: 'Read the memos',
        body: 'Memos are projects: pay cash (and later Attention) for permanent unlocks. Buy what opens a menu you need. Flavor can wait; gates cannot.',
        recovery: 'Skipping a memo only delays that path — nothing locks forever.',
        action: { type: 'buyMemo', params: { id: 'ledger-tape' } },
        doneWhen: { kind: 'stat', key: 'memosDone', min: 1 },
      },
    ],
  },
  {
    id: 'compute',
    name: 'Attention / Archives',
    era: 1,
    steps: [
      {
        id: 'compute-spot',
        coachId: 'compute-attention',
        title: 'Attention fills Archives',
        body: 'Analysts generate Attention into Archives. When Archives are full, Attention spills — buy more cabinets before more Analysts. Memos start costing Attention next.',
        recovery: 'Overflow wastes Attention only; buy Archives when you can and keep going.',
        action: { type: 'buyArchives' },
        doneWhen: { kind: 'flag', key: 'compute.unlocked' },
      },
    ],
  },
  {
    id: 'ideas',
    name: 'Ideas',
    era: 1,
    steps: [
      {
        id: 'ideas-spot',
        coachId: 'compute-ideas',
        title: 'Ideas from overflow',
        body: 'With Big Ideas unlocked, full Archives convert Analyst time into Ideas. Ideas buy the heavier memos. Fill Archives once so you see the loop.',
        recovery: 'Turning Ideas off only pauses that currency — Attention still works.',
        doneWhen: { kind: 'flag', key: 'compute.ideasUnlocked' },
      },
    ],
  },
  {
    id: 'scanner',
    name: 'Scanner Array',
    era: 1,
    steps: [
      {
        id: 'scanner-spot',
        coachId: 'scanner-pulse',
        title: 'Pulse the Scanner',
        body: 'The Scanner Array dumps Attention in unstable bursts. Click when you need a spike — sometimes skimpy, sometimes generous. Cool-down is a few seconds. Archives still cap how much you can hold.',
        recovery: 'A skimpy pulse only slows you; wait for cooldown and try again. Never drains wallets.',
        action: { type: 'pulseScanner' },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'reputation',
    name: 'Reputation Spend',
    era: 1,
    steps: [
      {
        id: 'reputation-spot',
        coachId: 'compute-reputation',
        title: 'Spend Reputation',
        body: 'Reputation arrives on a schedule. Spend it on demand bumps and story gates — Archives and cooler paths first. Hoard only when a memo asks for a reserve.',
        recovery: 'A soft spend only delays a later gate; Reputation keeps earning.',
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    era: 1,
    steps: [
      {
        id: 'loyalty-spot',
        coachId: 'marketing-loyalty',
        title: 'Punch cards',
        body: 'Loyalty raises demand and banks a small reward liability. Regulars return; you owe a slice of revenue later. Tier up when Marketing is humming.',
        recovery: 'Liability only trims cash — never a wipe.',
        action: { type: 'openMenu', params: { menu: 'marketing' } },
        doneWhen: { kind: 'flag', key: 'loyalty.tier' },
      },
    ],
  },
  {
    id: 'shrink',
    name: 'Shrink / Security',
    era: 1,
    steps: [
      {
        id: 'shrink-spot',
        coachId: 'staff-security',
        title: 'Shrink happens',
        body: 'A little stock walks out unpaid. Security and cashiers cut the rate; mirrors help. Shrink is a tax, not a crisis — hire security when numbers itch.',
        recovery: 'Heavy shrink only slows profit; stock and sales continue.',
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'inspection',
    name: 'Inspection',
    era: 1,
    steps: [
      {
        id: 'inspection-spot',
        coachId: 'floor-inspection',
        title: 'The meter climbs',
        body: 'Spoil and dirt fill the inspection meter. Prep memos and clipboard rounds drain it. Fines are capped — call the inspector when you are ready, or wait it out.',
        recovery: 'A failed inspection costs cash and time, never the store.',
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'passbook',
    name: 'Passbook',
    era: 1,
    steps: [
      {
        id: 'passbook-spot',
        coachId: 'invest-passbook',
        title: 'Park spare cash',
        body: 'Invest opens a passbook. Deposit money you will not need this minute. Interest is slow and safe — better than idle cash once bills are covered.',
        recovery: 'Under-saving only delays interest; withdraw anytime.',
        action: { type: 'openMenu', params: { menu: 'invest' } },
        doneWhen: { kind: 'menu', key: 'invest' },
      },
    ],
  },
  {
    id: 'build',
    name: 'Build',
    era: 1,
    steps: [
      {
        id: 'build-spot',
        coachId: 'menu-build',
        title: 'Open Build',
        body: 'Build tracks raise storefront, storage, and cold. Coolers unlock dairy; stockrooms hold more crates. Tier up when cash is fat — upkeep is mild.',
        recovery: 'A tall build only raises upkeep; refunds arrive later eras.',
        action: { type: 'openMenu', params: { menu: 'build' } },
        doneWhen: { kind: 'menu', key: 'build' },
      },
    ],
  },
  {
    id: 'upgrades',
    name: 'Upgrades',
    era: 1,
    steps: [
      {
        id: 'upgrades-open',
        coachId: 'menu-upgrades',
        title: 'Open Upgrades',
        body: 'Leveled trees fill gaps between memos. Floor helps unpack and baskets; Supply helps crates. Buy something small on Floor so the habit sticks.',
        recovery: 'Wrong tree only shifts pace — Retraining refunds levels later.',
        action: { type: 'openMenu', params: { menu: 'upgrades' } },
        doneWhen: { kind: 'menu', key: 'upgrades' },
      },
      {
        id: 'upgrades-buy',
        coachId: 'upgrades-floor',
        title: 'Buy a Floor upgrade',
        body: 'Quick Hands or Bigger Baskets are fine first picks. Each level posts a clear next cost. Keep one eye on cash for rent and wholesale.',
        recovery: 'A weak upgrade still helps something; respec exists later.',
        action: { type: 'buyUpgrade', params: { id: 'quick-hands' } },
        doneWhen: { kind: 'stat', key: 'upgradesBought', min: 1 },
      },
    ],
  },
  {
    id: 'venture',
    name: 'First Venture',
    era: 1,
    steps: [
      {
        id: 'venture-spot',
        coachId: 'menu-ventures',
        title: 'Coffee cart',
        body: 'Ventures sit beside the main loop. The coffee cart pays steady cash with no spoilage. Open it, then collect the till when it fills.',
        recovery: 'Ignoring a venture only skips free cash — the store still runs.',
        action: { type: 'openMenu', params: { menu: 'ventures' } },
        doneWhen: { kind: 'menu', key: 'ventures' },
      },
      {
        id: 'venture-open',
        coachId: 'ventures-coffee',
        title: 'Start the cart',
        body: 'Pay the open cost once. Levels raise income. Collect stored cash from the venture card when you walk by.',
        recovery: 'Leaving cash in the till only pauses growth at the store cap.',
        action: { type: 'openVenture', params: { id: 'coffee' } },
        doneWhen: { kind: 'flag', key: 'ventures.coffee' },
      },
    ],
  },
  {
    id: 'lot',
    name: 'Buy the Lot',
    era: 1,
    steps: [
      {
        id: 'lot-spot',
        coachId: 'land-side-yard',
        title: 'Buy the side yard',
        body: 'The empty lot next door adds shelf and backroom, plus a little rent. Need cash, calm debt, and spare Reputation when the Land card asks. This is the Era 1 finale.',
        recovery: 'Waiting only delays Era 2 — covenants protect you from a ruinous buy.',
        action: { type: 'buyExpansion', params: { id: 'side-yard' } },
        doneWhen: { kind: 'flag', key: 'expansions.side-yard' },
      },
    ],
  },
  {
    id: 'suppliers',
    name: 'Suppliers',
    era: 1,
    steps: [
      {
        id: 'suppliers-spot',
        coachId: 'menu-suppliers',
        title: 'Second wholesaler',
        body: 'Supplier B is cheaper and slower, with a two-crate minimum and occasional short ships. Use A for urgency, B for fat discounts. Switch from Suppliers anytime.',
        recovery: 'A short ship refunds unpaid units — you only wait longer.',
        action: { type: 'openMenu', params: { menu: 'suppliers' } },
        doneWhen: { kind: 'menu', key: 'suppliers' },
      },
    ],
  },
  {
    id: 'night',
    name: 'Night',
    era: 1,
    steps: [
      {
        id: 'night-spot',
        coachId: 'staff-night',
        title: 'Late hours',
        body: 'Night latch unlocks night clerks and higher hours. More hours mean more demand and more wages. Raise hours when stock and staff can keep up.',
        recovery: 'Too many hours only burns wages — slide hours back down.',
        action: { type: 'openMenu', params: { menu: 'staff' } },
        doneWhen: { kind: 'memo', key: 'night-latch' },
      },
    ],
  },
  {
    id: 'dairy',
    name: 'Dairy',
    era: 1,
    steps: [
      {
        id: 'dairy-spot',
        coachId: 'backroom-dairy',
        title: 'Dairy case',
        body: 'Dairy needs a reach-in cooler first. High margin, short life — keep FIFO tight and the inspection meter low before you load the case.',
        recovery: 'Spoil and fines only slow you; dump cooler and prep memos exist.',
        action: { type: 'openMenu', params: { menu: 'backroom' } },
        doneWhen: { kind: 'flag', key: 'categories.dairy' },
      },
    ],
  },
  {
    id: 'autorestock',
    name: 'Auto-Restock',
    era: 1,
    steps: [
      {
        id: 'autorestock-spot',
        coachId: 'suppliers-autorestock',
        title: 'Clipboard orders',
        body: 'Auto-restock buys when backroom is low and wholesale is under your max cost. Set a ceiling near a good deal. You can still order by hand.',
        recovery: 'A loose limit only overbuys — turn it off or lower max cost.',
        action: { type: 'setAutoRestock', params: { enabled: true } },
        doneWhen: { kind: 'flag', key: 'autoRestock.enabled' },
      },
    ],
  },
  {
    id: 'land',
    name: 'Land',
    era: 1,
    steps: [
      {
        id: 'land-spot',
        coachId: 'menu-land',
        title: 'Open Land',
        body: 'Land lists expansions. Prerequisites show on each card. Survey the Lot opens this menu; buying the side yard is the first real expansion.',
        recovery: 'Skipping Land only delays footprint — the corner store still pays.',
        action: { type: 'openMenu', params: { menu: 'land' } },
        doneWhen: { kind: 'menu', key: 'land' },
      },
    ],
  },

  // ── Meta teasers ─────────────────────────────────────────────────────────
  {
    id: 'empire',
    name: 'Empire Level',
    era: 1,
    steps: [
      {
        id: 'empire-spot',
        coachId: 'menu-empire',
        title: 'Empire XP',
        body: 'Baskets, memos, and ventures feed Empire level. Perk points are mild QoL — never required. Open Empire when you want a permanent nudge.',
        recovery: 'Ignoring perks only skips comfort; the sim does not need them.',
        action: { type: 'openMenu', params: { menu: 'empire' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'meta-shelf',
    name: 'Library Shelf',
    era: 0,
    steps: [
      {
        id: 'meta-shelf-spot',
        coachId: 'meta-shelf',
        title: 'The library shelf',
        body: 'Outside the store, the Shelf holds every game and your cosmetics. Texture packs and achievements live in Shop and Achievements. Coach replays any tour from inside the run.',
        recovery: 'Meta buys never change sim fairness — skip them freely.',
        doneWhen: { kind: 'always' },
      },
    ],
  },

  // ── Era 2 ────────────────────────────────────────────────────────────────
  {
    id: 'e2-second-store',
    name: 'Second Store',
    era: 2,
    steps: [
      {
        id: 'e2-store-spot',
        coachId: 'land-open-store',
        title: 'Open a second storefront',
        body: 'Era 2 is a chain. The flagship is automatic. Open Store 2 from Land when cash allows. Each store wants Attention or it drifts — spoil and shrink creep up.',
        recovery: 'Waiting only delays footprint. Bailouts still catch empty shelves.',
        action: { type: 'openMenu', params: { menu: 'land' } },
        doneWhen: { kind: 'flag', key: 'stores.1' },
      },
    ],
  },
  {
    id: 'e2-policies',
    name: 'Store Policies',
    era: 2,
    steps: [
      {
        id: 'e2-policy-spot',
        coachId: 'land-policy',
        title: 'Pick a policy',
        body: 'Local pulls more traffic with more shrink. Premium fewer trips, richer tickets. Standard is the safe middle. Set one voice per store from Land.',
        recovery: 'A mismatched policy only slows cash — switch anytime.',
        action: { type: 'openMenu', params: { menu: 'land' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'e2-depot',
    name: 'Depot',
    era: 2,
    steps: [
      {
        id: 'e2-depot-spot',
        coachId: 'land-depot',
        title: 'Build the depot',
        body: 'Build the depot before store five. It boosts chain demand and unlocks catering / ghost kitchen. Spend cash from Land.',
        recovery: 'Skipping the depot only makes later stores hungrier for Attention.',
        action: { type: 'buildDepot' },
        doneWhen: { kind: 'flag', key: 'depot' },
      },
    ],
  },
  {
    id: 'e2-incorporate',
    name: 'Incorporate',
    era: 2,
    steps: [
      {
        id: 'e2-inc-spot',
        coachId: 'books-incorporate',
        title: 'Flip the corporate switch',
        body: 'Incorporate when expansion cash is the bottleneck — not for flavor. Costs cash and Reputation; opens equity float and the board calendar on Books.',
        recovery: 'Delaying only keeps you private. Debt covenants still protect ruinous buys.',
        action: { type: 'incorporate' },
        doneWhen: { kind: 'flag', key: 'incorporated' },
      },
    ],
  },
  {
    id: 'e2-invest',
    name: 'Investment Book',
    era: 2,
    steps: [
      {
        id: 'e2-invest-spot',
        coachId: 'invest-book',
        title: 'Open the risk book',
        body: 'Beside the passbook sits the investment book. Deposit cash, pick Low/Mid/High, buy engine levels. A −40% drop from peak trips the circuit breaker — withdraw or cut risk to reset.',
        recovery: 'A tripped breaker only pauses returns. Cash in the book is still yours.',
        action: { type: 'openMenu', params: { menu: 'invest' } },
        doneWhen: { kind: 'flag', key: 'invest.unlocked' },
      },
    ],
  },
  {
    id: 'e2-tournament',
    name: 'Strategy Tournament',
    era: 2,
    steps: [
      {
        id: 'e2-tourney-spot',
        coachId: 'strategy-tournament',
        title: 'Run a tournament',
        body: 'Strategy spends Attention and pays Read. Buy doctrines in order — each one sweetens the payout. Bank Read; later eras eat it.',
        recovery: 'A lean tournament still pays something. Attention refills from Archives.',
        action: { type: 'openMenu', params: { menu: 'strategy' } },
        doneWhen: { kind: 'stat', key: 'tournamentsRun', min: 1 },
      },
    ],
  },
  {
    id: 'e2-board',
    name: 'Board Meeting',
    era: 2,
    steps: [
      {
        id: 'e2-board-spot',
        coachId: 'books-board',
        title: 'Face the board',
        body: 'After incorporate, meetings land on a timer. Resolve them from Books. Ignoring the agenda slowly spends Reputation — never bricks the run.',
        recovery: 'Missed meetings only nick Reputation. Resolve when you next open Books.',
        action: { type: 'resolveBoard' },
        doneWhen: { kind: 'stat', key: 'boardMeetings', min: 1 },
      },
    ],
  },
  {
    id: 'e2-expansions',
    name: 'Land Portfolio',
    era: 2,
    steps: [
      {
        id: 'e2-exp-spot',
        coachId: 'land-expansions',
        title: 'Era 2 parcels',
        body: 'Parking, corner parcel, and metro slot sit on Land after the lot. High debt blocks aggressive buys via covenant. Expand when the chain can digest it.',
        recovery: 'Skipping a parcel only delays density — the stores still sell.',
        action: { type: 'openMenu', params: { menu: 'land' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'e2-ventures',
    name: 'Era 2 Ventures',
    era: 2,
    steps: [
      {
        id: 'e2-ventures-spot',
        coachId: 'menu-ventures',
        title: 'Catering and ghost kitchen',
        body: 'Catering opens with a second store or its memo. Ghost kitchen needs the depot. Commodity desk wants the investment engine. Collect tills like Era 1.',
        recovery: 'Ignoring a venture only skips side cash.',
        action: { type: 'openMenu', params: { menu: 'ventures' } },
        doneWhen: { kind: 'menu', key: 'ventures' },
      },
    ],
  },
  {
    id: 'e2-autonomous',
    name: 'Autonomous',
    era: 2,
    steps: [
      {
        id: 'e2-auto-spot',
        coachId: 'empire-autonomous',
        title: 'Release Autonomous',
        body: 'Gate out of Era 2: depot built, enough Read, and Reputation spent on Analysts/Archives. Release from Empire. Unspent Reputation zeros; the book and Read stay.',
        recovery: 'Releasing early only slows later Charter — the run continues.',
        action: { type: 'releaseAutonomous' },
        doneWhen: { kind: 'flag', key: 'autonomous' },
      },
    ],
  },

  // ── Eras 3–6 ─────────────────────────────────────────────────────────────
  {
    id: 'cold',
    name: 'Cold Plants',
    era: 3,
    steps: [
      {
        id: 'cold-open',
        coachId: 'menu-cold',
        title: 'Open Cold',
        body: 'Era 3 is a cold chain. Plants make supply; tanks buffer brownouts. Open Cold from the rail when the plant permit lands.',
        recovery: 'Skipping Cold only delays freshness — stores still sell.',
        action: { type: 'openMenu', params: { menu: 'cold' } },
        doneWhen: { kind: 'menu', key: 'cold' },
      },
      {
        id: 'cold-plant',
        coachId: 'cold-buy-plant',
        title: 'Buy a plant',
        body: 'Each plant adds cold supply and drains regional yield. Buy one to start the line. Decommission refunds if you overbuild.',
        recovery: 'An extra plant only burns cash and yield — shed it anytime.',
        action: { type: 'buyPlant' },
        doneWhen: { kind: 'flag', key: 'cold.plants' },
      },
    ],
  },
  {
    id: 'momentum',
    name: 'Momentum',
    era: 3,
    steps: [
      {
        id: 'momentum-spot',
        coachId: 'cold-momentum',
        title: 'Babysit surplus',
        body: 'Momentum compounds while freshness holds. When surplus flips negative, brownout pauses the multiplier and auto-shed can dump a plant. Keep tanks ahead of demand.',
        recovery: 'A brownout only pauses Momentum — refill tanks and rebuild.',
        action: { type: 'openMenu', params: { menu: 'cold' } },
        doneWhen: { kind: 'flag', key: 'cold.momentumOn' },
      },
    ],
  },
  {
    id: 'politics',
    name: 'Politics',
    era: 3,
    steps: [
      {
        id: 'politics-open',
        coachId: 'menu-politics',
        title: 'Open Politics',
        body: 'Lobby opens a Political Capital wallet. Capital funds acquisitions and the leave-region gate. Open Politics when the retainer lands.',
        recovery: 'Ignoring Politics only delays Era 4 — the cold line still runs.',
        action: { type: 'openMenu', params: { menu: 'politics' } },
        doneWhen: { kind: 'menu', key: 'politics' },
      },
      {
        id: 'politics-lobby',
        coachId: 'politics-lobby',
        title: 'Hire lobby',
        body: 'Lobbyists trickle Capital. Soft monopoly fines can appear on acquisitions — never a wipe. Bank Capital before yield hits zero.',
        recovery: 'Over-hiring lobby only costs cash; Capital keeps ticking.',
        action: { type: 'hireLobby' },
        doneWhen: { kind: 'flag', key: 'politics.lobby' },
      },
    ],
  },
  {
    id: 'logistics',
    name: 'Ocean Logistics',
    era: 4,
    steps: [
      {
        id: 'logistics-open',
        coachId: 'menu-logistics',
        title: 'Open Logistics',
        body: 'Leaving the region unlocks the globe. Fuel, ocean lanes, Control, and franchises live here. Keep a wet fuel buffer before you open lanes.',
        recovery: 'Skipping a lane only slows footprint — Control still ticks.',
        action: { type: 'openMenu', params: { menu: 'logistics' } },
        doneWhen: { kind: 'menu', key: 'logistics' },
      },
      {
        id: 'logistics-lane',
        coachId: 'logistics-lane',
        title: 'Open a lane',
        body: 'Pay cash or Control for each ocean lane. Franchises grow faster but drift Brand unless Fleet seals it later. Top up fuel first.',
        recovery: 'A dry launch only waits on fuel — buy a buffer and retry.',
        action: { type: 'openLane' },
        doneWhen: { kind: 'flag', key: 'fleet.lanes' },
      },
    ],
  },
  {
    id: 'charter',
    name: 'Fleet Charter',
    era: 5,
    steps: [
      {
        id: 'charter-open',
        coachId: 'menu-fleet',
        title: 'Open Fleet',
        body: 'Era 5 is seed barges. Charter points allocate shell, replication, survey, transit, and brand seal. Open Fleet when the berth is built.',
        recovery: 'Delaying launch only pauses Legacy — Logistics still pays.',
        action: { type: 'openMenu', params: { menu: 'fleet' } },
        doneWhen: { kind: 'menu', key: 'fleet' },
      },
      {
        id: 'charter-launch',
        coachId: 'fleet-launch',
        title: 'Launch a barge',
        body: 'First launch costs cash and Read. Allocate Charter before you push hard. Reboot refunds points if the mix is wrong.',
        recovery: 'A bad Charter only slows biomass — reboot and respec.',
        action: { type: 'launchBarge' },
        doneWhen: { kind: 'flag', key: 'fleet.launched' },
      },
    ],
  },
  {
    id: 'guardian',
    name: 'Guardian Shell',
    era: 5,
    steps: [
      {
        id: 'guardian-spot',
        coachId: 'fleet-guardian',
        title: 'Emergency shell',
        body: 'Guardian is a one-time preset that protects the last barge. Use it when drift war or biomass pressure hits the floor — cheap insurance, not a win condition.',
        recovery: 'Skipping Guardian only risks a soft barge floor — reboot still works.',
        action: { type: 'openMenu', params: { menu: 'fleet' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'endings',
    name: 'Universal Ration',
    era: 6,
    steps: [
      {
        id: 'endings-spot',
        coachId: 'ending-accept',
        title: 'Accept or Reject',
        body: 'When biomass clears, choose from Fleet. Accept starts another hungry universe (prestige). Reject ends in silence with a gallery plaque — no prestige.',
        recovery: 'Either choice is final for this run — pick when ready.',
        action: { type: 'openMenu', params: { menu: 'fleet' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
]

export const TUTORIAL_BY_ID: Record<string, TutorialDef> = Object.fromEntries(
  TUTORIALS.map((t) => [t.id, t]),
)

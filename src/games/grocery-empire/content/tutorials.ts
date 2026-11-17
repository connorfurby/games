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
 *   stats.buildsBought, stats.ventureCollects, stats.shrunk, stats.spoiled, stats.dumps,
 *   baskets, compute.archives, compute.reputation, compute.ideas,
 *   passbook.balance, menus.*, memos.*, expansions.*, ventures.*, autoRestock.enabled
 */

export interface TutorialStep {
  id: string
  /** Matches data-coach-id in UI. */
  coachId: string
  /**
   * When this node is in the DOM (e.g. a Sheet control), the spotlight follows it
   * instead of coachId. Used so Price / Restock teach the real control.
   */
  followCoachId?: string
  /**
   * `act` soft-pauses and veils the store; `look` leaves the floor clickable.
   * Default `act`.
   */
  present?: 'act' | 'look'
  /** Mark this catalog tour done when the step completes (opening → unpack, …). */
  legacyId?: string
  /** Whisper tips / dialogue lines this step already taught — never re-queue them. */
  silence?: { tips?: string[]; lines?: string[] }
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

/** Eras 7–12: meet the panel, try the standard, check the score. */
function horizonTour(
  id: string,
  name: string,
  era: number,
  menu: string,
  openId: string,
  fileId: string,
  scoreId: string,
  fileAction: TutorialStep['action'],
  fileBody: string,
  scoreBody: string,
): TutorialDef {
  return {
    id,
    name,
    era,
    steps: [
      {
        id: `${id}-open`,
        coachId: openId,
        title: `Meet ${name}`,
        body: `${name} is new this era. Everything for it lives on this page.`,
        recovery: 'Looking costs nothing. You only spend when you choose to.',
        action: { type: 'openMenu', params: { menu } },
        doneWhen: { kind: 'menu', key: menu },
      },
      {
        id: `${id}-file`,
        coachId: fileId,
        title: 'Try the standard',
        body: fileBody,
        recovery: 'No rush. The standard option stays on the page until you use it.',
        action: fileAction,
        doneWhen: { kind: 'always' },
      },
      {
        id: `${id}-score`,
        coachId: scoreId,
        title: 'Check the score',
        body: scoreBody,
        recovery: 'A low score just grows things more slowly. You can try again any time.',
        doneWhen: { kind: 'always' },
      },
    ],
  }
}

const HORIZON_TOURS: TutorialDef[] = [
  horizonTour(
    'hz-worlds',
    'Worlds',
    7,
    'planets',
    'planets-survey',
    'planets-shelf',
    'planets-survey',
    { type: 'fileStandardPlanogram' },
    'Use the standard shelf on the open world. It matches five of the six things that world wants, which is plenty to start.',
    'The score shows how well your shelf fits. Survey keeps coming in while you do other things.',
  ),
  horizonTour(
    'hz-probe',
    'Probe yard',
    7,
    'planets',
    'planets-launch',
    'planets-launch',
    'planets-survey',
    { type: 'launchProbe' },
    'Launch a probe. When a world answers, stock it with the standard shelf.',
    'The Pantry answers first. Its score comes from the shelf you stock, not the probe.',
  ),
  horizonTour(
    'hz-exchange',
    'Exchange',
    8,
    'exchange',
    'exchange-freight',
    'exchange-circuit',
    'exchange-freight',
    { type: 'fileStandardConvoy' },
    'Send the standard convoy. When both ends want the good you get a full score; one end is a little over half.',
    'Freight pays for new routes. Each route’s score is what keeps lifting your sales.',
  ),
  horizonTour(
    'hz-keel',
    'Keel dock',
    8,
    'exchange',
    'exchange-keel',
    'exchange-circuit',
    'exchange-freight',
    { type: 'fileStandardConvoy' },
    'Send another standard convoy. Keel & Sons share your routes, but your score is still yours.',
    'Keep an eye on freight. A Keel convoy on your route is a rival, not a loss.',
  ),
  horizonTour(
    'hz-greenhouse',
    'Greenhouse',
    9,
    'cultivars',
    'cultivars-seed',
    'cultivars-bed',
    'cultivars-seed',
    { type: 'fileStandardCross' },
    'Plant the standard cross for this season: the two traits it asks for.',
    'Seed pays for more beds. The bed score shows how well the crop fits the season.',
  ),
  horizonTour(
    'hz-season',
    'Season strip',
    9,
    'cultivars',
    'cultivars-bed',
    'cultivars-bed',
    'cultivars-seed',
    { type: 'fileStandardCross' },
    'Plant the standard cross before the season turns.',
    'If you forget, the bed keeps its score. A missed season is a weak year, not a loss.',
  ),
  horizonTour(
    'hz-phrase',
    'Phrase desk',
    10,
    'signal',
    'signal-currency',
    'signal-phrase',
    'signal-currency',
    { type: 'fileStandardPhrase' },
    'Send the standard phrase. Three of four marks is enough; a miss just clears the line.',
    'Signal pays for agents. Your recent phrase scores decide how much they lift sales.',
  ),
  horizonTour(
    'hz-agent',
    'Agents',
    10,
    'signal',
    'signal-agents',
    'signal-phrase',
    'signal-currency',
    { type: 'fileStandardPhrase' },
    'Send the standard phrase, then hand it to an agent. Agents price, stock, resend and plant for you.',
    'Agents cost a wage in signal. They keep things running, but the ending is still your call.',
  ),
  horizonTour(
    'hz-clauses',
    'Clauses',
    11,
    'charter',
    'charter-seal',
    'charter-clauses',
    'charter-seal',
    { type: 'toggleClause', params: { id: 'open-hours' } },
    'Keep a clause. Your first three changes are free. Each clause helps, but read the downside first.',
    'Seal pays for more changes. You can keep up to four clauses.',
  ),
  horizonTour(
    'hz-charter-sign',
    'Charter',
    11,
    'charter',
    'charter-fork',
    'charter-fork',
    'charter-seal',
    { type: 'setCharter', params: { charter: 'standard' } },
    'Sign the Standard charter. It lifts your whole network and keeps your scores where they are.',
    'Boutique and Co-op trade that network lift for something else. Standard is the safe pick.',
  ),
  horizonTour(
    'hz-list',
    'Last list',
    12,
    'lastaisle',
    'lastaisle-list',
    'lastaisle-list',
    'lastaisle-score',
    { type: 'fileStandardList' },
    'Use the standard on every line. An average of 0.8 is enough to finish.',
    'The score is the average of the five lines. The list stays the same until you finish.',
  ),
  horizonTour(
    'hz-ending',
    'Last aisle',
    12,
    'lastaisle',
    'lastaisle-ending',
    'lastaisle-list',
    'lastaisle-score',
    { type: 'fileStandardList' },
    'Fill the list once more, then give your answer. Accepting keeps going; refusing ends the story here.',
    'An average of 0.8 completes it. Ivo is not asking for perfect.',
  ),
]

/** Legacy Era 0 spine tours folded into `opening` — kept for Coach catalog replay. */
export const OPENING_LEGACY_IDS = ['unpack', 'baskets', 'price', 'wholesale'] as const

export const TUTORIALS: TutorialDef[] = [
  // ── Era 0 ────────────────────────────────────────────────────────────────
  {
    id: 'opening',
    name: 'Opening',
    era: 0,
    steps: [
      {
        id: 'opening-unpack',
        coachId: 'floor-unpack',
        present: 'act',
        legacyId: 'unpack',
        silence: { tips: ['first-unpack'], lines: ['first-unpack'] },
        title: 'Unpack onto the shelf',
        body: 'Shelf is what shoppers buy. Backroom is crates waiting. Press Unpack — free — to move stock onto the shelf.',
        recovery: 'Empty shelf = no sales.',
        action: { type: 'unpack', params: { n: 1 } },
        doneWhen: { kind: 'stat', key: 'unpackedManual', min: 1 },
      },
      {
        id: 'opening-baskets',
        coachId: 'floor-baskets',
        present: 'look',
        legacyId: 'baskets',
        silence: { tips: ['first-basket'], lines: ['first-sale'] },
        title: 'Baskets are the score',
        body: 'Baskets (top-left) count every sale you make: that is your score. Cash beside them pays for rent and trucks.',
        recovery: 'Slow sales only delay the next memo.',
        doneWhen: { kind: 'stat', key: 'sold', min: 1 },
      },
      {
        id: 'opening-price',
        coachId: 'floor-price',
        followCoachId: 'floor-price-step',
        present: 'act',
        legacyId: 'price',
        silence: { tips: ['first-price'] },
        title: 'Your shelf price',
        body: 'Set your price with − and + in Shelf price below. Start near $1.50. Stock piling up → go lower. Selling out → go higher, or Unpack more.',
        recovery: 'A bad price only bleeds cash — nudge it.',
        action: { type: 'setPrice', params: { delta: -0.05 } },
        doneWhen: { kind: 'stat', key: 'priceChanges', min: 1 },
      },
      {
        id: 'opening-restock',
        coachId: 'floor-wholesale',
        followCoachId: 'floor-wholesale-buy',
        present: 'act',
        legacyId: 'wholesale',
        silence: { tips: ['first-wholesale'], lines: ['first-wholesale'] },
        title: 'Buy more stock',
        body: 'In Restock below, buy a crate. A truck brings it to the backroom, then you Unpack it onto the shelf. Restock tells you when the price is low.',
        recovery: 'Overpaying only burns cash.',
        action: { type: 'buyWholesale', params: { qty: 1 } },
        doneWhen: { kind: 'stat', key: 'ordersPlaced', min: 1 },
      },
    ],
  },
  {
    id: 'unpack',
    name: 'Unpack',
    era: 0,
    steps: [
      {
        id: 'unpack-spot',
        coachId: 'floor-unpack',
        title: 'Unpack onto the shelf',
        body: 'Press Unpack. Free. Shoppers only buy what’s on the shelf.',
        recovery: 'Empty shelf = no sales.',
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
        body: 'Baskets (top-left) are the score. Cash beside them pays rent and trucks.',
        recovery: 'Slow sales only delay the next memo.',
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
        followCoachId: 'floor-price-step',
        title: 'Your shelf price',
        body: 'Start near $1.50. Stock climbing → lower. Selling out → raise or Unpack.',
        recovery: 'A bad price only bleeds cash — nudge it.',
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
        followCoachId: 'floor-wholesale-buy',
        title: 'Buy more stock',
        body: 'Buy a crate → truck → backroom → Unpack. Dips under ~$0.85 are wins.',
        recovery: 'Overpaying only burns cash.',
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
        title: 'Rent',
        body: 'Rent is taken a little at a time. If you run short, it becomes unpaid rent that sales pay off later. There is no game over.',
        recovery: 'If cash runs out, a free crate or a bailout gets you going again.',
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
        body: 'Help Wanted opens Staff. A clerk unpacks while you handle price and trucks.',
        recovery: 'Over-hiring just eats cash.',
        action: { type: 'openMenu', params: { menu: 'staff' } },
        doneWhen: { kind: 'menu', key: 'staff' },
      },
      {
        id: 'staff-hire',
        coachId: 'staff-hire-clerk',
        title: 'Hire a clerk',
        body: 'Clerks unpack on a timer. One early hire frees your hands — watch wages vs sales.',
        recovery: 'A pricey hire only slows you.',
        action: { type: 'hire', params: { role: 'clerk' } },
        doneWhen: { kind: 'stat', key: 'hires', min: 1 },
      },
      {
        id: 'staff-hours',
        coachId: 'hours',
        title: 'Watch the hours',
        body: 'Longer hours bring more shoppers and cost more wages. Much past 1.2×, staff get unhappy; you can change it anytime.',
        recovery: 'A bad hours setting only costs wages.',
        doneWhen: { kind: 'always' },
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
        body: 'Perishables age on the shelf and in back. Sales pull the oldest batch first. Stockers slow spoilage; coolers stretch life. Try Dump oldest on a tired batch — only when the meter forces your hand.',
        recovery: 'Spoil writes off stock — painful, not fatal; Next skips the dump if nothing is old yet.',
        action: { type: 'openMenu', params: { menu: 'backroom' } },
        doneWhen: { kind: 'stat', key: 'dumps', min: 1 },
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
        body: 'Memos are upgrades you buy once and keep. Buy the ones that open something new first; the fun extras can wait.',
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
        title: 'Where Attention is kept',
        body: 'Analysts make Attention and Archives store it. When Archives are full, the extra is lost, so buy more Archives before more Analysts. Some memos cost Attention from now on.',
        recovery: 'Full Archives only waste the extra Attention. Buy more when you can.',
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
        title: 'Ideas',
        body: 'With Big Ideas, Analysts make Ideas once your Archives are full. Ideas pay for the bigger memos. Fill your Archives once to see it happen.',
        recovery: 'Turning Ideas off only pauses them. Attention still works.',
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
        body: 'The Scanner Array gives a burst of Attention when you press it: sometimes small, sometimes big. It needs a few seconds between presses, and your Archives still limit how much you can keep.',
        recovery: 'A small burst only slows you a little. It never costs anything.',
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
        body: 'Reputation comes in steadily. Spend it on things that bring shoppers and open the story, Archives and coolers first. Only save it up when a memo needs it.',
        recovery: 'Spending less now only slows a later unlock. Reputation keeps coming in.',
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
        recovery: 'Liability trims cash. Redeem carefully.',
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
        body: 'A little stock gets stolen. Security staff and cashiers cut it down; mirrors help. It is a small cost, not a crisis: hire security when it starts to bite.',
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
        body: 'Spoiled food and mess fill the inspection meter. Cleaning memos and clipboard rounds bring it down. Fines have a limit: call the inspector when you are ready, or wait.',
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
        recovery: 'A tall build only raises upkeep; sell back refunds the last tier.',
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
        recovery: 'A weak upgrade still helps something. The choice stays for the run.',
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
        recovery: 'Cash left in the till just waits until there is room to grow.',
        action: { type: 'openVenture', params: { id: 'coffee' } },
        doneWhen: { kind: 'flag', key: 'ventures.coffee' },
      },
      {
        id: 'venture-collect',
        coachId: 'venture-collect-coffee',
        title: 'Collect the till',
        body: 'Venture cash stacks in the till until you Collect it. A full till stops filling, so claim it on your way past. Level the cart when spare cash allows.',
        recovery: 'Cash left in the till just waits until there is room to grow. Next skips ahead.',
        doneWhen: { kind: 'stat', key: 'ventureCollects', min: 1 },
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
        recovery: 'Waiting only delays the lot — covenants protect you from a ruinous buy.',
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
        body: 'Supplier B is cheaper but slower, sells at least two crates at a time, and sometimes sends less than you ordered. Use A when you need stock fast, B to save money. Switch in Suppliers anytime.',
        recovery: 'If B sends less, you only pay for what arrives.',
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
        body: 'Auto-restock buys crates when the backroom runs low and the price is under your limit. Set the limit near a good price. You can still order by hand.',
        recovery: 'A high limit only overspends. Lower it or turn it off.',
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
        body: 'Baskets, memos, and ventures feed Empire level. Perk points are small comforts, never required. Open Empire when you want a permanent nudge.',
        recovery: 'Ignoring perks only skips comfort; the store runs fine without them.',
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
        recovery: 'Shop items never change how the game plays. Skip them freely.',
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
        body: 'Now you run a chain. Your first store runs itself. Open a second store from Land when you have the cash. A store you never visit slowly loses shoppers; Land shows which ones need you.',
        recovery: 'Waiting is fine. Your first store keeps selling.',
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
        body: 'Each store can lean one way. Local brings more shoppers but loses more stock to theft. Premium brings fewer shoppers who spend more. Standard sits in the middle. Set it per store on Land.',
        recovery: 'The wrong choice only slows cash. Switch anytime.',
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
        body: 'Build the depot before your fifth store. It brings more shoppers to every store and opens catering and the ghost kitchen. Buy it on Land.',
        recovery: 'Without the depot, new stores cost more Attention to look after.',
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
        title: 'Go public',
        body: 'Go public when you need more cash to grow, not just because you can. It costs cash and Reputation, and adds shares and board meetings to Books.',
        recovery: 'Waiting just keeps you private. The game still stops you from buying things that would sink you.',
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
        title: 'Invest spare cash',
        body: 'Next to your savings is an investment book. Put cash in, pick Low, Mid or High risk, and buy upgrades for it. If it falls 40% from its best, it pauses itself; take cash out or lower the risk to restart it.',
        recovery: 'A paused book only stops earning. The cash in it is still yours.',
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
        body: 'Strategy costs Attention and pays Read. Buy the strategies in order; each one makes the payout bigger. Save some Read, because big memos cost a lot of it.',
        recovery: 'A small tournament still pays something. Attention refills over time.',
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
        body: 'Once you go public, the board meets every so often. Answer them in Books. Ignoring them slowly costs Reputation, but never ends your run.',
        recovery: 'A missed meeting only costs a little Reputation.',
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
        title: 'More plots on Land',
        body: 'After the lot, Land offers more plots: parking, a corner plot and a metro spot. If you owe too much, the bank blocks the big ones. Grow when your stores can keep up.',
        recovery: 'Skipping a plot only slows growth. Your stores keep selling.',
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
        body: 'Catering opens with your second store. The ghost kitchen needs the depot. The commodity desk needs the investment book. Collect their tills like before.',
        recovery: 'Ignoring a side business only skips some extra cash.',
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
        title: 'Hand over the chain',
        body: 'To finish this chapter: build the depot, earn enough Read, and spend your Reputation in the back office. Then hand the chain over in Empire. Leftover Reputation is lost; your investments and Read stay.',
        recovery: 'Moving on early only makes the next chapter a bit slower.',
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
        body: 'Now you run a cold chain. Plants make cold storage; tanks keep things running when power drops. Open Cold once the plant permit arrives.',
        recovery: 'Skipping Cold only delays fresher food. Stores still sell.',
        action: { type: 'openMenu', params: { menu: 'cold' } },
        doneWhen: { kind: 'menu', key: 'cold' },
      },
      {
        id: 'cold-plant',
        coachId: 'cold-buy-plant',
        title: 'Buy a plant',
        body: 'Each plant adds cold storage but uses up some of the region’s supply. Buy one to start. You can close a plant for a refund if you built too many.',
        recovery: 'An extra plant only costs cash. Close it anytime.',
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
        title: 'Keep supply ahead',
        body: 'Your bonus keeps growing while food stays fresh. If demand outruns supply, the power dips: the bonus pauses and a plant may shut down. Keep enough tanks to stay ahead.',
        recovery: 'A power dip only pauses the bonus. Refill the tanks and it comes back.',
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
        body: 'Hiring a lobbyist starts earning Political Capital. You spend it to buy out neighbours and, later, to move beyond the region. Open Politics once you have one.',
        recovery: 'Ignoring Politics only delays moving on. The cold chain keeps running.',
        action: { type: 'openMenu', params: { menu: 'politics' } },
        doneWhen: { kind: 'menu', key: 'politics' },
      },
      {
        id: 'politics-lobby',
        coachId: 'politics-lobby',
        title: 'Hire a lobbyist',
        body: 'Each lobbyist earns Capital slowly. Buying out neighbours can bring fines. Save up Capital before the region’s supply runs out.',
        recovery: 'Too many lobbyists only cost cash.',
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
        body: 'Leaving the region opens the world map. Fuel, sea routes, Control and franchises live here. Buy some spare fuel before you open routes.',
        recovery: 'Skipping a route only slows growth.',
        action: { type: 'openMenu', params: { menu: 'logistics' } },
        doneWhen: { kind: 'menu', key: 'logistics' },
      },
      {
        id: 'logistics-lane',
        coachId: 'logistics-lane',
        title: 'Open a route',
        body: 'Each sea route costs cash or Control. Franchises grow fast but slowly weaken your Brand until Fleet can protect it. Fill up on fuel first.',
        recovery: 'Out of fuel? The route just waits. Buy fuel and try again.',
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
        body: 'Now you send seed barges into space. Spend Charter points on each barge: hull, copying, scouting, speed and brand. Open Fleet once the berth is built.',
        recovery: 'Waiting only pauses Legacy. Logistics keeps paying.',
        action: { type: 'openMenu', params: { menu: 'fleet' } },
        doneWhen: { kind: 'menu', key: 'fleet' },
      },
      {
        id: 'charter-launch',
        coachId: 'fleet-launch',
        title: 'Launch a barge',
        body: 'The first launch costs cash and Read. Spend your Charter points before you launch. Reboot gives the points back if you change your mind.',
        recovery: 'A weak setup only grows slower. Reboot and try another mix.',
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
        title: 'Guardian shield',
        body: 'Guardian is a one-time shield for your last barge. Use it when a rival or running low on growth threatens it. It is a safety net, not a way to win.',
        recovery: 'Skipping it is a risk, but reboot still works.',
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
        body: 'When the last barge is safe, choose in Fleet. Accept starts a new universe. Reject ends things quietly.',
        recovery: 'This choice is final for this run. Take your time.',
        action: { type: 'openMenu', params: { menu: 'fleet' } },
        doneWhen: { kind: 'always' },
      },
      {
        id: 'endings-reject',
        coachId: 'ending-reject',
        title: 'Reject is also a door',
        body: 'Reject ends the run without a new-game bonus. You get a plaque, and the copycats never get your recipes.',
        recovery: 'You can still pick Accept instead.',
        action: { type: 'openMenu', params: { menu: 'fleet' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'tanks',
    name: 'Tank Farm',
    era: 3,
    steps: [
      {
        id: 'tanks-spot',
        coachId: 'cold-buy-tank',
        title: 'Buy tanks',
        body: 'Tanks keep the power steady. Buy them before demand climbs so your bonus stays on.',
        recovery: 'Too few tanks only pauses the bonus.',
        action: { type: 'buyTank' },
        doneWhen: { kind: 'flag', key: 'cold.tanks' },
      },
    ],
  },
  {
    id: 'leave-region',
    name: 'Leave Region',
    era: 3,
    steps: [
      {
        id: 'leave-spot',
        coachId: 'politics-leave',
        title: 'Leave the region',
        body: 'When the region’s supply runs out, leave from Politics. The map gets bigger.',
        recovery: 'Waiting only delays the world map. Cold keeps running.',
        action: { type: 'openMenu', params: { menu: 'politics' } },
        doneWhen: { kind: 'flag', key: 'politics.leftRegion' },
      },
    ],
  },
  {
    id: 'franchise',
    name: 'Franchise',
    era: 4,
    steps: [
      {
        id: 'franchise-spot',
        coachId: 'logistics-franchise',
        title: 'Franchises',
        body: 'Franchises grow fast, but slowly weaken your Brand until Fleet can protect it.',
        recovery: 'You can win Brand back with Control and the Brand Seal.',
        action: { type: 'openMenu', params: { menu: 'logistics' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'drift-war',
    name: 'Drift War',
    era: 5,
    steps: [
      {
        id: 'drift-spot',
        coachId: 'fleet-drift',
        title: 'Off-Brand contact',
        body: 'A copycat brand, Off-Brand, starts copying you. Legacy is your score from here on.',
        recovery: 'Guardian and reboot keep your last barge safe.',
        action: { type: 'openMenu', params: { menu: 'fleet' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'weather',
    name: 'Weather',
    era: 1,
    steps: [
      {
        id: 'weather-spot',
        coachId: 'floor-weather',
        title: 'Read the sky',
        body: 'The weather tile on the Floor shows today’s weather. Rain sells more cans, heat sells more dairy, and cold makes produce go off faster. The Weather Radio memo shows tomorrow too.',
        recovery: 'Weather only nudges sales and spoilage. It never ruins a run.',
        action: { type: 'openMenu', params: { menu: 'floor' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'e2-rival',
    name: 'Rival Pressure',
    era: 2,
    steps: [
      {
        id: 'e2-rival-spot',
        coachId: 'marketing-rival',
        title: 'A rival moves',
        body: 'Rivals sometimes undercut you, poach staff, smear you or raid your end displays. It is mild and short. Marketing shows how to answer and what it costs, or you can let it fade.',
        recovery: 'Ignoring a rival only costs a little business or morale for about a minute.',
        action: { type: 'openMenu', params: { menu: 'marketing' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'venture-late',
    name: 'Late Ventures',
    era: 3,
    steps: [
      {
        id: 'venture-late-spot',
        coachId: 'menu-ventures',
        title: 'Side tills expand',
        body: 'More side businesses open as you go. They are extra cash and always optional.',
        recovery: 'Ignoring them only skips some extra cash.',
        action: { type: 'openMenu', params: { menu: 'ventures' } },
        doneWhen: { kind: 'menu', key: 'ventures' },
      },
    ],
  },
  // Stretch loops — short, era-gated, current verb only (no later spoilers).
  {
    id: 'stretch-regulars',
    name: 'Neighborhood Regulars',
    era: 0,
    steps: [
      {
        id: 'stretch-regulars-spot',
        coachId: 'floor-unpack',
        title: 'Serve a regular',
        body: 'Neighbours visit when cans are featured and the shelf is stocked. When one is waiting, the big Floor button says Serve.',
        recovery: 'A missed visit only slows your star rating. Restock and try again.',
        action: { type: 'openMenu', params: { menu: 'floor' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'stretch-shifts',
    name: 'Shifts',
    era: 0,
    steps: [
      {
        id: 'stretch-shifts-spot',
        coachId: 'staff-hire-clerk',
        title: 'Staff the opening shift',
        body: 'Hire a clerk, then in Shifts & hours on Staff, put them on Opening. Each covered opening counts toward the yard.',
        recovery: 'An empty opening shift only pauses progress. Hire and assign when you can.',
        action: { type: 'openMenu', params: { menu: 'staff' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'stretch-invoices',
    name: 'Invoice Book',
    era: 1,
    steps: [
      {
        id: 'stretch-invoices-spot',
        coachId: 'floor-wholesale',
        title: 'Pay invoices on time',
        body: 'Crates you buy come with invoices, listed in Suppliers. Pay them before they go overdue; paying on time counts toward the side yard.',
        recovery: 'Late invoices cost some Goodwill, not the store. Pay the oldest first.',
        action: { type: 'openMenu', params: { menu: 'suppliers' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'stretch-planogram',
    name: 'Flagship Planogram',
    era: 1,
    steps: [
      {
        id: 'stretch-planogram-spot',
        coachId: 'floor-unpack',
        title: 'Practice the layout',
        body: 'On the Floor, under Regulars, use Planogram. Practise twice, then file a layout that scores 72% or better.',
        recovery: 'A weak layout only uses up a practice. Try again once the aisles are stocked.',
        action: { type: 'openMenu', params: { menu: 'floor' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'stretch-flyers',
    name: 'Flyer Desk',
    era: 2,
    steps: [
      {
        id: 'stretch-flyers-spot',
        coachId: 'marketing-ads',
        title: 'Print a flyer week',
        body: 'On Marketing, in Weekly flyer, pick a discount and print the week. Let it run, then wait for the next one. Three weeks earn the stamp.',
        recovery: 'A skipped week only delays the count. Print when you have the Attention.',
        action: { type: 'openMenu', params: { menu: 'marketing' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'stretch-cooler',
    name: 'Cooler Log',
    era: 3,
    steps: [
      {
        id: 'stretch-cooler-spot',
        coachId: 'cold-buy-plant',
        title: 'Sign the cooler log',
        body: 'Cold has a temperature check on a timer. Sign the cooler log when it is due. A plant operator on shift signs it for you.',
        recovery: 'A missed check only lets things warm up. Sign as soon as you can.',
        action: { type: 'openMenu', params: { menu: 'cold' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'stretch-dispatch',
    name: 'Dispatch Board',
    era: 4,
    steps: [
      {
        id: 'stretch-dispatch-spot',
        coachId: 'logistics-lane',
        title: 'Match the manifest',
        body: 'In Logistics, under Dispatch, file a manifest whose cargo matches a fuelled route, and file it clean.',
        recovery: 'A mismatch only wastes that round. Change the cargo and file again.',
        action: { type: 'openMenu', params: { menu: 'logistics' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'stretch-pockets',
    name: 'Pocket Ops',
    era: 5,
    steps: [
      {
        id: 'stretch-pockets-spot',
        coachId: 'fleet-launch',
        title: 'Send a Hauler',
        body: 'In Fleet, under Pocket Ops, send a hauler to a pocket that matches its cargo. Trips take real time.',
        recovery: 'The wrong pocket wastes the trip. Match the cargo and try again.',
        action: { type: 'openMenu', params: { menu: 'fleet' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  {
    id: 'stretch-hearing',
    name: 'Hearing Docket',
    era: 11,
    steps: [
      {
        id: 'stretch-hearing-spot',
        coachId: 'charter-clauses',
        title: 'Answer the hearing',
        body: 'Concord holds a hearing on every clause you make final. Answer each one in Charter before you sign.',
        recovery: 'Skipping a hearing only delays your charter. Answer when the next one opens.',
        action: { type: 'openMenu', params: { menu: 'charter' } },
        doneWhen: { kind: 'always' },
      },
    ],
  },
  ...HORIZON_TOURS,
]

export const TUTORIAL_BY_ID: Record<string, TutorialDef> = Object.fromEntries(
  TUTORIALS.map((t) => [t.id, t]),
)

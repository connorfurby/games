import type { GameState } from '../sim/state'

/** First-unlock tip whispers — one visible at a time, dismissible forever per save. */
export interface TipDef {
  id: string
  text: string
  /** Fire once when true and not yet in tipsSeen. */
  when: (s: GameState) => boolean
}

export const TIPS: TipDef[] = [
  {
    id: 'first-unpack',
    text: 'Unpack is free. It moves crates from the backroom onto the shelf, and shoppers only buy what is on the shelf. Buying more crates is what costs money.',
    when: (s) => s.stats.unpackedManual >= 1,
  },
  {
    id: 'first-basket',
    text: 'Baskets, next to your cash, count every sale you have ever made. Cash pays the bills; baskets are how far the store has come.',
    when: (s) => s.baskets >= 1,
  },
  {
    id: 'first-price',
    text: 'Price is what shoppers pay. If the shelf stays full, lower it a little. If you keep selling out, raise it or unpack faster.',
    when: (s) => s.stats.priceChanges >= 1,
  },
  {
    id: 'first-wholesale',
    text: 'A crate you order takes a moment to arrive in the backroom. Crate prices move up and down, so buy when they dip, then unpack.',
    when: (s) => s.stats.ordersPlaced >= 1,
  },
  {
    id: 'first-memo',
    text: 'Memos unlock new parts of the store and move the story along. One you can afford is worth a look.',
    when: (s) => s.stats.memosDone >= 1,
  },
  {
    id: 'first-staff',
    text: 'A clerk unpacks for you, so you can watch the price and order crates. Just make sure the store earns more than you pay in wages.',
    when: (s) => s.staff.length >= 1,
  },
  {
    id: 'produce',
    text: 'Produce goes bad if it sits. Sell the oldest crates first; a stocker and a cooler make that easy.',
    when: (s) => !!s.categories.produce,
  },
  {
    id: 'attention',
    text: 'Attention builds up on its own over time. You spend it to open new stores and to visit ones that need you.',
    when: (s) => s.compute.unlocked,
  },
  {
    id: 'cold',
    text: 'Cold plants keep fresh food good for longer. If the power dips, things slow down for a while but nothing is lost.',
    when: (s) => !!s.menus.cold || (s.cold?.plants ?? 0) > 0,
  },
  {
    id: 'fleet',
    text: 'Charter points shape each barge. If a barge gets into trouble, a one-time Guardian shield can save it.',
    when: (s) => !!s.menus.fleet || (s.fleet?.barges ?? 0) > 0,
  },
  {
    id: 'recovery',
    text: 'If money gets tight, a free starter crate or an emergency truck will get you going again. You cannot get stuck.',
    when: (s) => s.stats.helperCrates + s.stats.bailouts + s.stats.emergencyDeliveries >= 1,
  },
  {
    id: 'ventures',
    text: 'Ventures earn a little on the side. Each one fills a jar; collect it when it is full.',
    when: (s) => !!s.menus.ventures,
  },
  {
    id: 'upgrades',
    text: 'Upgrades cost cash. Empire rank comes from baskets sold, and a higher rank lets you take upgrades further.',
    when: (s) => !!s.menus.upgrades,
  },
  {
    id: 'empire-vs-upgrades',
    text: 'Empire rank comes from baskets. Upgrades cost cash. Trait points, on the Empire page, are a separate thing to spend.',
    when: (s) => !!s.menus.empire && s.empire.level >= 2,
  },
  {
    id: 'scanner',
    text: 'The Scanner Array gives a burst of Attention when you click it. It is a bonus; you never need it to move on.',
    when: (s) => !!s.compute.scanner,
  },
  {
    id: 'e2-depot',
    text: 'Build the depot before your fifth store. Without it, extra stores take Attention and bring in fewer shoppers than they should.',
    when: (s) => s.era >= 2 && s.stores.length >= 2 && !s.depot,
  },
  {
    id: 'e2-attention',
    text: 'Every store you open needs a share of your Attention. Visit a store that is slipping, and spread Attention evenly rather than piling it on one.',
    when: (s) => s.era >= 2 && s.stores.length >= 2,
  },
  {
    id: 'e2-board',
    text: 'At a board meeting, pick one: Expand, Dividend, Shelf R&D or Cut hours. Skipping the choice costs a little Reputation and Brand.',
    when: (s) => s.incorporated,
  },
  {
    id: 'e2-book',
    text: 'Investments earn steadily up to a limit. Medium risk needs Engine level 2 and High needs level 4. Invest what you do not need right now.',
    when: (s) => s.invest.unlocked,
  },
  {
    id: 'e2-brand',
    text: 'Brand now changes how many shoppers come. Answer coupon wars and use celebrities carefully: Brand heals slowly.',
    when: (s) => s.era >= 2 && s.brand < 0.98,
  },
  {
    id: 'e4-lanes',
    text: 'Ocean lanes burn fuel and pay back in Control and cash. If the fuel runs out the lane just waits; nothing breaks.',
    when: (s) => s.era >= 4 || (s.fleet?.lanes ?? 0) > 0,
  },
  {
    id: 'e4-franchise',
    text: 'Franchises grow your reach fast but chip at your Brand. The Brand Seal in Charter protects it.',
    when: (s) => (s.fleet?.franchises ?? 0) >= 1,
  },
  {
    id: 'e6-legacy',
    text: 'Legacy is your score out here. Fights with Off-Brand cost barges but earn plaques, and Guardian always saves your last barge.',
    when: (s) => s.era >= 6 || (s.fleet?.legacy ?? 0) > 0,
  },
  {
    id: 'weather',
    text: 'Weather rotates every few minutes. Rain pulls cans; heat pulls dairy; cold ages produce faster.',
    when: (s) => s.era >= 1 && (s.stats.weatherDays ?? 0) >= 1,
  },
  {
    id: 'celebrity',
    text: 'Celebrity endcap buys a loud minute of demand. Brand may take a nick when cameras leave.',
    when: (s) => (s.campaigns?.celebrityUntil ?? 0) > 0 || !!s.memos['celebrity-endcap'],
  },
  {
    id: 'e2-policy',
    text: 'Each store has one policy. Local brings more shoppers, Premium makes each basket worth more, and Standard is the safe middle.',
    when: (s) => s.era >= 2 && s.stores.length >= 2,
  },
  {
    id: 'e2-incorporate',
    text: 'Going public raises money and adds board meetings. Do it when cash is what holds you back, not before.',
    when: (s) => s.incorporated,
  },
  {
    id: 'e2-store-drift',
    text: 'A store that needs a visit loses more stock to spoilage and theft. Visit it, or give it more Attention, before it slips further.',
    when: (s) => s.stores.some((st) => st.drift >= 0.4),
  },
  {
    id: 'e2-read',
    text: 'Read is what Strategy runs on. Spend Attention on a Tournament to earn it, then buy strategies with it. Cash cannot buy Read.',
    when: (s) => s.read >= 1,
  },
  {
    id: 'e2-doctrine',
    text: 'Strategies build on each other. Buy them in order.',
    when: (s) => s.stats.doctrinesBought >= 1,
  },
  {
    id: 'e2-rival',
    text: 'A rival only takes a few shoppers, and Marketing always shows how to answer and what it costs. It also fades by itself.',
    when: (s) => s.events?.rival?.kind != null,
  },
  {
    id: 'e2-coupon',
    text: 'A coupon war cuts demand about 8%. Matching costs about half your next ad — worth it only if the war is young.',
    when: (s) => !!s.events?.couponWar?.active,
  },
  {
    id: 'e2-ghost',
    text: 'Ghost Kitchen needs the depot. It turns spare produce into cash while the aisle stays honest.',
    when: (s) => s.depot && s.era >= 2,
  },
  {
    id: 'e2-autonomous',
    text: 'Handing over the chain wipes any Reputation you have not spent. Spend it in the back office first.',
    when: (s) => s.depot && s.read >= 5,
  },
  {
    id: 'e3-brownout',
    text: 'When the power dips, freshness drops to 25% and your bonus pauses. Add tanks or run fewer plants. It is a setback, not a loss.',
    when: (s) => (s.cold?.brownouts ?? 0) >= 1,
  },
  {
    id: 'e3-capital',
    text: 'Political Capital slowly drains away. Lobbyists refill it; spend it on things that matter, like hearings.',
    when: (s) => (s.politics?.capital ?? 0) > 0,
  },
  {
    id: 'e4-fuel',
    text: 'Lanes run on fuel. A lane with no fuel just waits, so keep some spare before you add another.',
    when: (s) => s.era >= 4 && s.fuel < 20,
  },
  {
    id: 'e4-control',
    text: 'Control grows with fuelled routes and the Control Tower. Treat it like cash, not like Attention.',
    when: (s) => s.era >= 4 && s.control >= 5,
  },
  {
    id: 'e4-brand',
    text: 'Brand slowly slips if you ignore it. The Brand Seal in Charter slows that; answering coupon wars helps early on.',
    when: (s) => s.era >= 4 && s.brand < 0.85,
  },
  {
    id: 'e4-autonomous-stores',
    text: 'Autonomous stores stock themselves. Your job moves from the aisle to the dashboard.',
    when: (s) => s.era >= 4 && s.autonomous,
  },
  {
    id: 'e5-charter',
    text: 'Charter points shape each barge: hull, copying, scouting, speed and brand. Reboot gives them back if you want to try another mix.',
    when: (s) => s.era >= 5 && (s.fleet?.charterPool ?? 0) > 0,
  },
  {
    id: 'e5-guardian',
    text: 'Guardian is a one-time shield for your last barge. Use it before you lose them all, not after.',
    when: (s) => s.era >= 5 && (s.fleet?.barges ?? 0) <= 2 && (s.fleet?.launched ?? false),
  },
  {
    id: 'e6-ending',
    text: 'Accept starts again with small bonuses in a tougher universe. Reject ends things quietly. Neither is a failure.',
    when: (s) => s.era >= 6,
  },
  {
    id: 'e6-hungry',
    text: 'Hungry laws are optional rules that make the next universe harder. You can take up to two, so pick a pair you can live with.',
    when: (s) => s.era >= 6 && (s.prestigeCarry?.universeIndex ?? 0) >= 1,
  },
  {
    id: 'e6-biomass',
    text: 'When biomass hits zero, ration week begins. Until then, copying and scouting keep the barges growing.',
    when: (s) => s.era >= 6 && (s.fleet?.biomass ?? 1) > 0,
  },

  // ── Content firehose: E3 cold/politics, more E4/E6, weather, chain verbs ──
  {
    id: 'e3-momentum',
    text: 'Your cold bonus grows only while food stays fully fresh. Keep supply ahead of demand; a power dip pauses it but never wipes it.',
    when: (s) => !!s.cold?.momentumOn,
  },
  {
    id: 'e3-tanks',
    text: 'Tanks are cheap insurance: they widen the buffer so a heat wave or an extra plant does not tip you into brownout.',
    when: (s) => (s.cold?.tanks ?? 0) >= 1,
  },
  {
    id: 'e3-yield',
    text: 'The region’s supply is limited. Plants use it up for cash; when it runs low, leaving the region is the next step, not another plant.',
    when: (s) => !!s.cold && s.cold.yieldMax > 0 && s.cold.yieldLeft <= s.cold.yieldMax * 0.6,
  },
  {
    id: 'e3-monopoly',
    text: 'Buying out neighbours raises the risk of a monopoly fine. Spend Political Capital on hearings before it comes to that.',
    when: (s) => (s.politics?.monopolyRisk ?? 0) >= 0.3,
  },
  {
    id: 'e3-leave',
    text: 'Leaving the region needs its supply used up and enough Capital. It moves you forward; it is not a penalty.',
    when: (s) => !!s.cold && s.cold.yieldMax > 0 && s.cold.yieldLeft <= 0 && !s.politics?.leftRegion,
  },
  {
    id: 'e3-private-label',
    text: 'Your own label costs less to buy and sells for more. It also builds your Brand.',
    when: (s) => s.era >= 3 && !!s.categories.privateLabel,
  },
  {
    id: 'e4-clone',
    text: 'Copycat franchises chip at your Brand now and then. It is small, it heals, and the Brand Seal makes it smaller.',
    when: (s) => s.era >= 4 && (s.fleet?.franchises ?? 0) >= 1,
  },
  {
    id: 'e4-lane-count',
    text: 'Every extra route uses more fuel. Three fuelled routes beat six empty ones, and the Control Tower only rewards fuelled ones.',
    when: (s) => (s.fleet?.lanes ?? 0) >= 3,
  },
  {
    id: 'e6-universe',
    text: 'Each Accept makes the next universe hungrier and your cosmetics richer. Pick Hungry laws you can actually live with.',
    when: (s) => s.era >= 6 && s.endingChoice === 'accept',
  },
  {
    id: 'weather-radio',
    text: 'With the Weather Radio, the Floor shows tomorrow’s weather too. Stock up on what it will sell a little early.',
    when: (s) => (s.memos['weather-radio'] ?? 0) > 0,
  },
  {
    id: 'weather-dense',
    text: 'The weather shows on the Floor: rain sells cans, heat sells dairy, and cold makes produce age faster. Check it before you restock.',
    when: (s) => s.era >= 1 && s.stats.weatherDays >= 2,
  },
  {
    id: 'weather-heat-dairy',
    text: 'Hot weather spoils dairy fast. Lean on walk-in coolers or a stocker until the heat passes.',
    when: (s) => s.weather?.now === 'heat' && !!s.categories.dairy,
  },
  {
    id: 'e2-walk-train',
    text: 'Visiting a store stops it slipping; training a store spends Attention to level it up. Visit the neglected store first, then train your favourite.',
    when: (s) => s.era >= 2 && s.stores.length >= 2 && s.stores.some((st) => st.drift >= 0.25),
  },
  {
    id: 'e2-soft-opening',
    text: 'Cheaper Second Key makes new stores cheaper. Combine it with the Corner Parcel and the board’s Expand choice before your third store.',
    when: (s) => s.era >= 2 && (s.upgrades['soft-opening'] ?? 0) >= 1,
  },
  {
    id: 'e2-doctrine-read',
    text: 'Each strategy makes tournaments pay more Read, and later chapters spend it. Run a tournament after each new strategy.',
    when: (s) => s.stats.doctrinesBought >= 2 || s.stats.tournamentsRun >= 2,
  },
  {
    id: 'e2-rival-match',
    text: 'Rival match cost is about 40% of an ad. Cheap if the rival is fresh; skip it when the timer is nearly up.',
    when: (s) => s.events?.rival?.kind != null && (s.events?.rival?.endsAt ?? 0) - s.time > 20,
  },
  {
    id: 'e2-raid',
    text: 'An endcap raid only happens if you own an endcap. Rebooking costs a little and restores the doorway.',
    when: (s) => s.events?.rival?.kind === 'raid',
  },
  {
    id: 'e5-brand-seal',
    text: 'The Brand Seal in Charter protects you from Off-Brand. It is cheap early and costly once the fight has started.',
    when: (s) => s.era >= 5 && (s.fleet?.charter?.['brand-seal'] ?? 0) === 0 && (s.fleet?.franchises ?? 0) >= 1,
  },
]

export const TIP_BY_ID: Record<string, TipDef> = Object.fromEntries(TIPS.map((t) => [t.id, t]))

/** Next unseen tip ready to whisper, or null. */
/** The era a tip belongs to: e2-… → 2, the first-… basics → 0, everything else → 1 unless noted. */
const TIP_ERA: Record<string, number> = { cold: 3, fleet: 5 }
function tipEra(tip: TipDef): number {
  const m = /^e(\d)-/.exec(tip.id)
  if (m) return Number(m[1])
  if (tip.id in TIP_ERA) return TIP_ERA[tip.id]!
  return tip.id.startsWith('first-') || tip.id === 'produce' ? 0 : 1
}

export function pendingTip(s: GameState): TipDef | null {
  for (const tip of TIPS) {
    if (s.tipsSeen[tip.id]) continue
    // A tip from two eras back is noise, not help.
    if (tipEra(tip) < s.era - 1) continue
    try {
      if (tip.when(s)) return tip
    } catch {
      /* ignore bad predicates */
    }
  }
  return null
}

/**
 * The department a tip is about, so it shows as a help card inside that room instead of
 * floating over play. Unlisted tips are general and show on the Floor.
 */
const TIP_MENU: Record<string, string> = {
  'first-unpack': 'floor',
  'first-basket': 'floor',
  'first-price': 'floor',
  'first-wholesale': 'suppliers',
  'first-staff': 'staff',
  produce: 'floor',
  cold: 'cold',
  fleet: 'fleet',
  ventures: 'ventures',
  upgrades: 'upgrades',
  'empire-vs-upgrades': 'empire',
  scanner: 'floor',
  'e2-depot': 'land',
  'e2-board': 'empire',
  'e2-book': 'books',
  'e2-brand': 'marketing',
  'e4-lanes': 'logistics',
  'e4-franchise': 'map',
  celebrity: 'marketing',
  'e2-policy': 'staff',
  'e2-incorporate': 'books',
  'e2-store-drift': 'map',
  'e2-read': 'strategy',
  'e2-doctrine': 'strategy',
  'e2-rival': 'rivals',
  'e2-coupon': 'marketing',
  'e2-ghost': 'rivals',
  'e2-autonomous': 'empire',
  'e3-brownout': 'cold',
  'e3-capital': 'politics',
  'e4-fuel': 'logistics',
  'e4-control': 'logistics',
  'e4-brand': 'marketing',
  'e4-autonomous-stores': 'map',
  'e5-charter': 'fleet',
  'e5-guardian': 'fleet',
  'e6-biomass': 'fleet',
  'e3-tanks': 'cold',
  'e3-yield': 'cold',
  'e3-monopoly': 'politics',
  'e3-leave': 'politics',
  'e3-private-label': 'suppliers',
  'e4-clone': 'map',
  'e4-lane-count': 'logistics',
  'e2-walk-train': 'map',
  'e2-soft-opening': 'map',
  'e2-doctrine-read': 'strategy',
  'e2-rival-match': 'rivals',
  'e2-raid': 'rivals',
  'e6-legacy': 'fleet',
  attention: 'land',
}

export function tipMenu(id: string): string | null {
  return TIP_MENU[id] ?? null
}

/** The help card for the open room: the first unseen, live tip that belongs to it. */
export function panelTip(s: GameState, menu: string): TipDef | null {
  for (const tip of TIPS) {
    if (s.tipsSeen[tip.id]) continue
    if (tipEra(tip) < s.era - 1) continue
    // A tip with no room of its own waits for the Floor, so it is never repeated room to room.
    const home = TIP_MENU[tip.id] ?? 'floor'
    if (home !== menu) continue
    try {
      if (tip.when(s)) return tip
    } catch {
      /* ignore bad predicates */
    }
  }
  return null
}

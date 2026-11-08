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
    text: 'Unpack is free: backroom → shelf. Shoppers only buy the shelf. Wholesale is the bill that fills the backroom again.',
    when: (s) => s.stats.unpackedManual >= 1,
  },
  {
    id: 'first-basket',
    text: 'That top-left number is baskets — the neighborhood’s memory of you. Cash beside it pays rent and trucks.',
    when: (s) => s.baskets >= 1,
  },
  {
    id: 'first-price',
    text: 'Shelf price is what shoppers pay. Stock climbing → nudge down. Selling out → raise or unpack harder. Ads come much later.',
    when: (s) => s.stats.priceChanges >= 1,
  },
  {
    id: 'first-wholesale',
    text: 'Trucks land in the backroom after a short delay. Buy the walking dips (under ~$0.85 is a win). Then Unpack again.',
    when: (s) => s.stats.ordersPlaced >= 1,
  },
  {
    id: 'first-memo',
    text: 'Memos are the story spine — each one is a door with a voice. Affordable ones breathe; buy when the next chapter matters.',
    when: (s) => s.stats.memosDone >= 1,
  },
  {
    id: 'first-staff',
    text: 'A clerk unpacks while you watch price and wholesale. Keep wages under the till’s pulse.',
    when: (s) => s.staff.length >= 1,
  },
  {
    id: 'produce',
    text: 'Produce spoils on a clock. Oldest crate first. A stocker and a cooler turn panic into rotation.',
    when: (s) => !!s.categories.produce,
  },
  {
    id: 'attention',
    text: 'The back office fills with Attention. Spend Reputation on Archives before Analysts until the next memo fits.',
    when: (s) => s.compute.unlocked,
  },
  {
    id: 'cold',
    text: 'Cold plants buy time for perishables. Brownouts pause Momentum; the floor at 25% is a bruise, not an ending.',
    when: (s) => !!s.menus.cold || (s.cold?.plants ?? 0) > 0,
  },
  {
    id: 'fleet',
    text: 'Charter points shape barges. Guardians appear under pressure. Orbit is just a taller backroom.',
    when: (s) => !!s.menus.fleet || (s.fleet?.barges ?? 0) > 0,
  },
  {
    id: 'recovery',
    text: 'When the week tightens, mentor crates and emergency trucks buy you another morning. The door stays open.',
    when: (s) => s.stats.helperCrates + s.stats.bailouts + s.stats.emergencyDeliveries >= 1,
  },
  {
    id: 'ventures',
    text: 'Ventures drip beside the main heartbeat. Collect when the jar fills — side doors feed the till quietly.',
    when: (s) => !!s.menus.ventures,
  },
  {
    id: 'upgrades',
    text: 'Upgrades = cash trees. Empire = basket rank that unlocks deeper Upgrade levels, then trait points. Different tabs, different currencies.',
    when: (s) => !!s.menus.upgrades,
  },
  {
    id: 'empire-vs-upgrades',
    text: 'Empire rank comes from baskets. Upgrade ranks come from cash. Trait points on Empire are a third spend — never confuse them with Upgrade trees.',
    when: (s) => !!s.menus.empire && s.empire.level >= 2,
  },
  {
    id: 'scanner',
    text: 'Scanner Array dumps Attention with wobble. Click for joy — never required for progress.',
    when: (s) => !!s.compute.scanner,
  },
  {
    id: 'e2-depot',
    text: 'Build the depot before store five. Without it, extra doors eat Attention and under-deliver demand.',
    when: (s) => s.era >= 2 && s.stores.length >= 2 && !s.depot,
  },
  {
    id: 'e2-attention',
    text: 'Attention is the cost of every extra key. Walk drifted stores; even shares beat vanity focus.',
    when: (s) => s.era >= 2 && s.stores.length >= 2,
  },
  {
    id: 'e2-board',
    text: 'Board meetings want a pick — Expand, Dividend, Shelf R&D, or Cut hours. Ignoring nicks Rep and Brand.',
    when: (s) => s.incorporated,
  },
  {
    id: 'e2-book',
    text: 'The investment book ticks inside a cap. Mid needs Engine L2; High needs L4. Park surplus, spend the rest.',
    when: (s) => s.invest.unlocked,
  },
  {
    id: 'e2-brand',
    text: 'Brand finally moves demand. Match coupons and keep celebrity honest — nicks heal slowly.',
    when: (s) => s.era >= 2 && s.brand < 0.98,
  },
  {
    id: 'e4-lanes',
    text: 'Ocean lanes burn fuel for Control and cash. Dry tanks idle — never brick.',
    when: (s) => s.era >= 4 || (s.fleet?.lanes ?? 0) > 0,
  },
  {
    id: 'e4-franchise',
    text: 'Franchises buy footprint and nick Brand. Seal it with Charter brand-seal or watch the label drift.',
    when: (s) => (s.fleet?.franchises ?? 0) >= 1,
  },
  {
    id: 'e6-legacy',
    text: 'Legacy is the late score. Drift wars trade barges for plaques — Guardian keeps the last hull.',
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
    text: 'Store policy is one voice per door: Local pulls traffic, Premium pulls tickets. Standard is the safe default.',
    when: (s) => s.era >= 2 && s.stores.length >= 2,
  },
  {
    id: 'e2-incorporate',
    text: 'Incorporating turns expansion cash into Equity and opens board meetings. Do it when cash is the bottleneck, not before.',
    when: (s) => s.incorporated,
  },
  {
    id: 'e2-store-drift',
    text: 'A drifting store spoils more and shrinks more. Walk it, or lift its Attention share, before the meter bites.',
    when: (s) => s.stores.some((st) => st.drift >= 0.4),
  },
  {
    id: 'e2-read',
    text: 'Read is strategy currency: spend Attention on a Tournament, then buy doctrines. Cash never buys Read.',
    when: (s) => s.read >= 1,
  },
  {
    id: 'e2-doctrine',
    text: 'Doctrines are opinions with teeth. Buy in order; the later ones lean on the earlier ones.',
    when: (s) => s.stats.doctrinesBought >= 1,
  },
  {
    id: 'e2-rival',
    text: 'Rival pressure is mild and always answerable: Marketing shows the verb and the price. It also fades on its own.',
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
    text: 'Autonomous Release zeros unspent Reputation. Spend it on the office first, then release.',
    when: (s) => s.depot && s.read >= 5,
  },
  {
    id: 'e3-brownout',
    text: 'Brownout floors freshness at 25% and pauses Momentum. Add tanks or shed demand — it is a delay, not a fail.',
    when: (s) => (s.cold?.brownouts ?? 0) >= 1,
  },
  {
    id: 'e3-capital',
    text: 'Political Capital leaks. Lobby retainers refill it; spend it on hearings, not vanity.',
    when: (s) => (s.politics?.capital ?? 0) > 0,
  },
  {
    id: 'e4-fuel',
    text: 'Fuel is the lane bill. Dry lanes idle without bricking; keep a buffer before adding another.',
    when: (s) => s.era >= 4 && s.fuel < 20,
  },
  {
    id: 'e4-control',
    text: 'Control grows with wet lanes and Control Tower. Spend it like late-game cash, not like Attention.',
    when: (s) => s.era >= 4 && s.control >= 5,
  },
  {
    id: 'e4-brand',
    text: 'Brand drifts when you look away. Charter brand-seal slows it; Match and honest celebrity help early.',
    when: (s) => s.era >= 4 && s.brand < 0.85,
  },
  {
    id: 'e4-autonomous-stores',
    text: 'Autonomous stores stock themselves. Your job moves from the aisle to the dashboard.',
    when: (s) => s.era >= 4 && s.autonomous,
  },
  {
    id: 'e5-charter',
    text: 'Charter points shape barges: shell, replication, survey, transit, brand-seal. Reboot refunds them — no shame.',
    when: (s) => s.era >= 5 && (s.fleet?.charterPool ?? 0) > 0,
  },
  {
    id: 'e5-guardian',
    text: 'Guardian is a one-time floor for the last barge. Use it before extinction, not after.',
    when: (s) => s.era >= 5 && (s.fleet?.barges ?? 0) <= 2 && (s.fleet?.launched ?? false),
  },
  {
    id: 'e6-ending',
    text: 'Accept restarts with mild bonuses and a hungrier universe. Reject files the silence. Neither is failure.',
    when: (s) => s.era >= 6,
  },
  {
    id: 'e6-hungry',
    text: 'Hungry laws are optional mutators for the next universe. Two at most — pick the pair you can live with.',
    when: (s) => s.era >= 6 && (s.prestigeCarry?.universeIndex ?? 0) >= 1,
  },
  {
    id: 'e6-biomass',
    text: 'Biomass at zero opens the ration. Until then, replication and survey keep the barges honest.',
    when: (s) => s.era >= 6 && (s.fleet?.biomass ?? 1) > 0,
  },

  // ── Content firehose: E3 cold/politics, more E4/E6, weather, chain verbs ──
  {
    id: 'e3-momentum',
    text: 'Momentum compounds only while freshness stays at or above 1. Keep surplus positive; a brownout pauses it, never wipes it.',
    when: (s) => !!s.cold?.momentumOn,
  },
  {
    id: 'e3-tanks',
    text: 'Tanks are cheap insurance: they widen the buffer so a heat wave or an extra plant does not tip you into brownout.',
    when: (s) => (s.cold?.tanks ?? 0) >= 1,
  },
  {
    id: 'e3-yield',
    text: 'County yield is a finite pool. Plants burn it for cash; when it runs low, the map — not another plant — is the next move.',
    when: (s) => !!s.cold && s.cold.yieldMax > 0 && s.cold.yieldLeft <= s.cold.yieldMax * 0.6,
  },
  {
    id: 'e3-monopoly',
    text: 'Monopoly risk climbs as you acquire. Spend Political Capital on hearings before the committee spends it for you.',
    when: (s) => (s.politics?.monopolyRisk ?? 0) >= 0.3,
  },
  {
    id: 'e3-leave',
    text: 'Leaving the region needs an empty county and enough Capital. It is a door out, not a penalty.',
    when: (s) => !!s.cold && s.cold.yieldMax > 0 && s.cold.yieldLeft <= 0 && !s.politics?.leftRegion,
  },
  {
    id: 'e3-private-label',
    text: 'Private label is a margin engine: your name on the line, cheaper to buy, richer to sell. It also feeds Brand.',
    when: (s) => s.era >= 3 && !!s.categories.privateLabel,
  },
  {
    id: 'e4-clone',
    text: 'Lookalike franchises nick Brand now and then. It is small, it regenerates, and Brand Seal makes it smaller.',
    when: (s) => s.era >= 4 && (s.fleet?.franchises ?? 0) >= 1,
  },
  {
    id: 'e4-lane-count',
    text: 'Each extra lane multiplies fuel burn. Three wet lanes beat six dry ones — and Control Tower rewards the wet kind.',
    when: (s) => (s.fleet?.lanes ?? 0) >= 3,
  },
  {
    id: 'e6-universe',
    text: 'Each Accept makes the next universe hungrier and your cosmetics richer. Pick Hungry laws you can actually live with.',
    when: (s) => s.era >= 6 && s.endingChoice === 'accept',
  },
  {
    id: 'weather-radio',
    text: 'With the Weather Radio, the Floor shows tomorrow too. Stack the right category on the shelf one beat early.',
    when: (s) => (s.memos['weather-radio'] ?? 0) > 0,
  },
  {
    id: 'weather-dense',
    text: 'The Wx chip on the Floor is always on: rain pulls cans, heat pulls dairy, cold ages produce. Read it before you restock.',
    when: (s) => s.era >= 1 && s.stats.weatherDays >= 2,
  },
  {
    id: 'weather-heat-dairy',
    text: 'Heat plus dairy is a spoil clock. Lean on Walk-ins or a stocker rotation until the wave breaks.',
    when: (s) => s.weather?.now === 'heat' && !!s.categories.dairy,
  },
  {
    id: 'e2-walk-train',
    text: 'Walk store clears drift; Train store spends Attention on store XP. Walk the neglected door first, train the favorite.',
    when: (s) => s.era >= 2 && s.stores.length >= 2 && s.stores.some((st) => st.drift >= 0.25),
  },
  {
    id: 'e2-soft-opening',
    text: 'Cheaper Second Key trims new-store cost. Stack it with Corner Parcel and the board’s Expand pick before opening door three.',
    when: (s) => s.era >= 2 && (s.upgrades['soft-opening'] ?? 0) >= 1,
  },
  {
    id: 'e2-doctrine-read',
    text: 'Doctrines earn Read in tournaments, and later eras spend it. Run a tournament after each doctrine to keep the pages turning.',
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
    text: 'Brand Seal in Charter blunts Off-Brand drift. It is cheap early and costly once the war is already on.',
    when: (s) => s.era >= 5 && (s.fleet?.charter?.['brand-seal'] ?? 0) === 0 && (s.fleet?.franchises ?? 0) >= 1,
  },
]

export const TIP_BY_ID: Record<string, TipDef> = Object.fromEntries(TIPS.map((t) => [t.id, t]))

/** Next unseen tip ready to whisper, or null. */
export function pendingTip(s: GameState): TipDef | null {
  for (const tip of TIPS) {
    if (s.tipsSeen[tip.id]) continue
    try {
      if (tip.when(s)) return tip
    } catch {
      /* ignore bad predicates */
    }
  }
  return null
}

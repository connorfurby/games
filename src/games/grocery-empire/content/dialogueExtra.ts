import type { DialogueLine } from './dialogue'
import type { GameState } from '../sim/state'

/**
 * Content firehose — extra spoken beats. Every `when()` is a cheap field read;
 * the dialogue ticker try/catches anyway. Appended after the core table in dialogue.ts.
 */

const memo = (s: GameState, id: string) => (s.memos?.[id] ?? 0) > 0
const staffOf = (s: GameState, role: string) => s.staff.filter((m) => m.role === role).length

// ── Weather: enter / exit / forecast / depth by era ─────────────────────────
const WEATHER_MORE: DialogueLine[] = [
  {
    id: 'wx-rain-regular',
    speaker: 'clerk',
    text: 'Rain again. The umbrella bucket has regulars now.',
    when: (s) => s.era >= 1 && s.weather?.now === 'rain' && s.stats.weatherDays >= 5,
  },
  {
    id: 'wx-heat-regular',
    speaker: 'clerk',
    text: 'Another heat wave. The fan by the dairy case earns its keep.',
    when: (s) => s.era >= 1 && s.weather?.now === 'heat' && s.stats.weatherDays >= 6,
  },
  {
    id: 'wx-cold-produce',
    speaker: 'operations',
    text: 'Cold snap with produce on the shelf. Rotate the oldest crate forward.',
    when: (s) => s.era >= 1 && s.weather?.now === 'cold' && !!s.categories.produce && s.stats.weatherDays >= 4,
  },
  {
    id: 'wx-days-10',
    speaker: 'operations',
    text: 'Ten weather days logged. The sky is a supplier with no phone number.',
    when: (s) => s.stats.weatherDays >= 10,
  },
  {
    id: 'wx-days-30',
    speaker: 'operations',
    text: 'Thirty weather days. You read the clouds like a wholesale index.',
    when: (s) => s.stats.weatherDays >= 30,
  },
  {
    id: 'wx-forecast-rain',
    speaker: 'clerk',
    text: 'Radio says rain next. Soup toward the door, cans toward the front.',
    when: (s) => memo(s, 'weather-radio') && s.weather?.next === 'rain' && s.weather?.now !== 'rain',
  },
  {
    id: 'wx-forecast-heat',
    speaker: 'clerk',
    text: 'Radio says heat next. Chill the drinks before the line forms.',
    when: (s) => memo(s, 'weather-radio') && s.weather?.next === 'heat' && s.weather?.now !== 'heat',
  },
  {
    id: 'wx-forecast-cold',
    speaker: 'operations',
    text: 'Radio says a cold snap is coming. Check the produce dates tonight.',
    when: (s) => memo(s, 'weather-radio') && s.weather?.next === 'cold' && s.weather?.now !== 'cold',
  },
  {
    id: 'wx-rain-chain',
    speaker: 'operations',
    text: 'Rain over every door at once. One chalkboard pattern, copied per store.',
    when: (s) => s.era >= 2 && s.stores.length >= 2 && s.weather?.now === 'rain',
  },
  {
    id: 'wx-heat-plant',
    speaker: 'cold',
    text: 'Heat wave. Plants run hot and tanks drain faster. Watch freshness.',
    when: (s) => s.era >= 3 && (s.cold?.plants ?? 0) >= 1 && s.weather?.now === 'heat',
  },
  {
    id: 'wx-cold-plant',
    speaker: 'cold',
    text: 'Cold snap helps the compressors breathe. Free freshness, for a little while.',
    when: (s) => s.era >= 3 && (s.cold?.plants ?? 0) >= 1 && s.weather?.now === 'cold',
  },
  {
    id: 'wx-fleet',
    speaker: 'guardian',
    text: 'Weather is a rumor out here. The barges carry their own.',
    when: (s) => s.era >= 5 && s.stats.weatherDays >= 1 && s.weather?.now !== 'fair',
  },
]

// ── Rent / arrears / bailout / debt ─────────────────────────────────────────
const MONEY_MORE: DialogueLine[] = [
  {
    id: 'rent-100',
    speaker: 'operations',
    text: 'A hundred in rent paid over the run. The landlord frames the receipts.',
    when: (s) => s.stats.rentPaid >= 100,
  },
  {
    id: 'rent-1000',
    speaker: 'operations',
    text: 'A thousand in rent. The building is partly yours in spirit.',
    when: (s) => s.stats.rentPaid >= 1000,
  },
  {
    id: 'rent-chain',
    speaker: 'operations',
    text: 'Rent is a line per door now. Short leases are a feature; long ones are a plan.',
    when: (s) => s.era >= 2 && s.stores.length >= 2 && s.stats.rentPaid >= 500,
  },
  {
    id: 'arrears-deep',
    speaker: 'operations',
    text: 'Arrears are deep. Sales pay them first; a bailout is a legal bridge, not a shame.',
    when: (s) => s.arrears >= 100,
  },
  {
    id: 'bailout-second',
    speaker: 'operations',
    text: 'Second bailout. The pattern is the lesson: stock the backroom before the till.',
    when: (s) => s.stats.bailouts >= 2,
  },
  {
    id: 'broke-streak',
    speaker: 'clerk',
    text: 'Till is thin. Unpack, sell the shelf, then buy only the dip.',
    when: (s) => (s.recovery?.brokeSec ?? 0) >= 30,
  },
  {
    id: 'nephew-owed',
    speaker: 'clerk',
    text: 'Nephew’s float is on the books. He has not texted, which is its own message.',
    when: (s) => s.debt.taken >= 1 && s.debt.owed > 0,
  },
  {
    id: 'nephew-repaid',
    speaker: 'clerk',
    text: 'Nephew repaid in full. Thumbs-up emoji, plus a request for a discount.',
    when: (s) => s.debt.taken >= 1 && s.debt.owed <= 0,
  },
  {
    id: 'cash-1k',
    speaker: 'operations',
    text: 'A thousand in the till at once. Spend it before it starts to feel like a hobby.',
    when: (s) => s.stats.peakCash >= 1000,
  },
  {
    id: 'cash-100k',
    speaker: 'operations',
    text: 'Six figures of peak cash. Park it, spend it, or hire somebody to argue about it.',
    when: (s) => s.stats.peakCash >= 100_000,
  },
]

// ── Inspection ──────────────────────────────────────────────────────────────
const INSPECTION_MORE: DialogueLine[] = [
  {
    id: 'inspection-prep',
    speaker: 'operations',
    text: 'The laminated prep sheet is up. Initial it hourly or the sheet becomes decor.',
    when: (s) => memo(s, 'inspector-prep'),
  },
  {
    id: 'inspection-rounds',
    speaker: 'clerk',
    text: 'Clipboard rounds started. Walking the floor finds what a dashboard hides.',
    when: (s) => memo(s, 'clipboard-rounds'),
  },
  {
    id: 'inspection-calls-3',
    speaker: 'operations',
    text: 'Third scheduled inspector. You and the clipboard are on a first-name basis.',
    when: (s) => s.stats.inspectorCalls >= 3,
  },
  {
    id: 'inspection-pass-5',
    speaker: 'operations',
    text: 'Five inspections, zero fails. The county quietly stops circling.',
    when: (s) => s.stats.inspections >= 5 && s.stats.inspectionsFailed === 0,
  },
  {
    id: 'inspection-fines-100',
    speaker: 'operations',
    text: 'Fines past a hundred. That money bought a lot of wipe-down checklists.',
    when: (s) => s.stats.finesPaid >= 100,
  },
  {
    id: 'inspection-penalty',
    speaker: 'clerk',
    text: 'Shoppers are wary after the fail. Demand will mend; keep the floor spotless.',
    when: (s) => s.time < (s.inspection?.penaltyUntil ?? 0),
  },
  {
    id: 'inspection-morale',
    speaker: 'operations',
    text: 'Low morale is feeding the meter. A pizza now is cheaper than a fine later.',
    when: (s) => s.staff.length >= 2 && s.morale < 0.65,
  },
]

// ── Coupon war / rival / marketing ──────────────────────────────────────────
const RIVAL_MORE: DialogueLine[] = [
  {
    id: 'rival-raid',
    speaker: 'operations',
    text: 'Rival endcap raid. They paid for your door-side display. Rebook it in Marketing.',
    when: (s) => s.events?.rival?.kind === 'raid',
  },
  {
    id: 'rival-answered-3',
    speaker: 'operations',
    text: 'Three rival answers. Competitors know your reflexes by now.',
    when: (s) => s.stats.rivalAnswers >= 3,
  },
  {
    id: 'coupon-matches-3',
    speaker: 'operations',
    text: 'Three coupon matches. The rival learns to stop wasting printer ink.',
    when: (s) => s.stats.couponMatches >= 3,
  },
  {
    id: 'war-matcher-owned',
    speaker: 'clerk',
    text: 'War Matcher is on duty. The kid at the register answers circulars before you notice.',
    when: (s) => (s.upgrades?.['war-matcher'] ?? 0) >= 1,
  },
  {
    id: 'coupon-war-posture',
    speaker: 'operations',
    text: 'Circular posture, coupon war. Loud against loud. Hold Brand with the match.',
    when: (s) => !!s.events?.couponWar?.active && s.marketingPosture === 'circular',
  },
  {
    id: 'posture-house-brand',
    speaker: 'operations',
    text: 'House Brand posture. One voice, your own label, rivals can only copy the font.',
    when: (s) => s.marketingPosture === 'houseBrand',
  },
  {
    id: 'ads-5',
    speaker: 'operations',
    text: 'Ad level five. The block expects the flyers before you staple them.',
    when: (s) => s.ads >= 5,
  },
]

// ── Chain: stores / policy / depot / incorporate / board ────────────────────
const CHAIN_MORE: DialogueLine[] = [
  {
    id: 'store-three',
    speaker: 'operations',
    text: 'Third door. The chalkboard needs a map to explain itself.',
    when: (s) => s.stores.length >= 3,
  },
  {
    id: 'store-five-nodepot',
    speaker: 'operations',
    text: 'Five doors and no depot. The Attention bill is arriving by courier.',
    when: (s) => s.stores.length >= 5 && !s.depot,
  },
  {
    id: 'policy-local',
    speaker: 'operations',
    text: 'Local policy set. That door knows the regulars by first name and sells like it.',
    when: (s) => s.stores.some((st) => st.policy === 'local'),
  },
  {
    id: 'policy-premium',
    speaker: 'operations',
    text: 'Premium policy set. Fewer trips, richer tickets, a smaller crowd.',
    when: (s) => s.stores.some((st) => st.policy === 'premium'),
  },
  {
    id: 'store-level-3',
    speaker: 'operations',
    text: 'A store hit level three. That door runs its own morning now.',
    when: (s) => s.stores.some((st) => st.level >= 3),
  },
  {
    id: 'store-drift-heavy',
    speaker: 'operations',
    text: 'A door is nearly lost to drift. Walk it now; the numbers lag the smell.',
    when: (s) => s.stores.some((st) => st.drift >= 0.9),
  },
  {
    id: 'ghost-kitchen-live',
    speaker: 'operations',
    text: 'Ghost kitchen live off the depot. Nobody sees it, everybody orders from it.',
    when: (s) => memo(s, 'ghost-kitchen'),
  },
  {
    id: 'catering-live',
    speaker: 'operations',
    text: 'Catering contracts landing. Trays are just crates with ambition.',
    when: (s) => memo(s, 'catering-license'),
  },
  {
    id: 'articles-filed',
    speaker: 'operations',
    text: 'Articles in hand. Incorporate when cash — not ambition — is the bottleneck.',
    when: (s) => memo(s, 'articles-of-inc') && !s.incorporated,
  },
  {
    id: 'board-third',
    speaker: 'operations',
    text: 'Third board meeting. The agenda has a seat reserved for you now.',
    when: (s) => s.stats.boardMeetings >= 3,
  },
  {
    id: 'board-expand-pick',
    speaker: 'operations',
    text: 'Expand was the pick. The next deed comes at a discount; spend it soon.',
    when: (s) => (s.board?.expandDiscount ?? 1) < 1,
  },
  {
    id: 'board-rnd-pick',
    speaker: 'operations',
    text: 'Shelf R&D approved. Everything on the aisle lasts a little longer.',
    when: (s) => s.time < (s.board?.rndUntil ?? 0),
  },
  {
    id: 'board-hours-pick',
    speaker: 'operations',
    text: 'Hours cut by vote. The night staff pretend not to cheer.',
    when: (s) => s.time < (s.board?.cutHoursUntil ?? 0),
  },
  {
    id: 'expansion-parking',
    speaker: 'operations',
    text: 'Parking strip poured. Cars become baskets, eventually.',
    when: (s) => !!s.expansions?.parking,
  },
  {
    id: 'expansion-metro',
    speaker: 'operations',
    text: 'Metro slot secured. The map has a new color for you.',
    when: (s) => !!s.expansions?.['metro-slot'],
  },
  {
    id: 'invest-circuit',
    speaker: 'operations',
    text: 'Circuit breaker tripped on the book. Safety sirens are doing their job.',
    when: (s) => !!s.invest?.circuitBreaker,
  },
  {
    id: 'doctrine-three',
    speaker: 'operations',
    text: 'Three doctrines in the binder. Read accrues; opinions harden.',
    when: (s) => s.stats.doctrinesBought >= 3,
  },
  {
    id: 'read-bank-20',
    speaker: 'operations',
    text: 'Twenty Read banked. Later eras will want every page of it.',
    when: (s) => s.read >= 20,
  },
]

// ── Staff: first of each role (second), levels, traits, size ────────────────
const STAFF_MORE: DialogueLine[] = [
  {
    id: 'hire-clerk-two',
    speaker: 'clerk',
    text: 'Two clerks. The back line stops looking like a solo act.',
    when: (s) => staffOf(s, 'clerk') >= 2,
  },
  {
    id: 'hire-stocker-two',
    speaker: 'operations',
    text: 'Second stocker. FIFO is a culture, not a rule.',
    when: (s) => staffOf(s, 'stocker') >= 2,
  },
  {
    id: 'hire-cashier-two',
    speaker: 'operations',
    text: 'Second cashier. Express lane has an actual express now.',
    when: (s) => staffOf(s, 'cashier') >= 2,
  },
  {
    id: 'hire-security-two',
    speaker: 'operations',
    text: 'Two security. Any more and shoppers feel the eyes. Keep the cap in mind.',
    when: (s) => staffOf(s, 'security') >= 2,
  },
  {
    id: 'hire-night-two',
    speaker: 'operations',
    text: 'Second night clerk. The latch never has to wait for a key.',
    when: (s) => staffOf(s, 'night') >= 2,
  },
  {
    id: 'hire-five',
    speaker: 'operations',
    text: 'Five on the roster. Payroll is a weather system with a Friday.',
    when: (s) => s.staff.length >= 5,
  },
  {
    id: 'hire-ten',
    speaker: 'operations',
    text: 'Ten on staff. Somebody starts calling it the family business.',
    when: (s) => s.staff.length >= 10,
  },
  {
    id: 'staff-level-3',
    speaker: 'operations',
    text: 'A crew member hit level three. Experience is the cheapest raise you can offer.',
    when: (s) => s.staff.some((m) => m.level >= 3),
  },
  {
    id: 'trait-quick',
    speaker: 'clerk',
    text: 'A Quick hire. Hands move before the crate finishes opening.',
    when: (s) => s.staff.some((m) => m.traitId === 'quick'),
  },
  {
    id: 'trait-frugal',
    speaker: 'operations',
    text: 'A Frugal hire. Asks for less; reuses the tape.',
    when: (s) => s.staff.some((m) => m.traitId === 'frugal'),
  },
  {
    id: 'trait-dreamy',
    speaker: 'clerk',
    text: 'A Dreamy hire. Slower, but stares at the cans like they might speak.',
    when: (s) => s.staff.some((m) => m.traitId === 'dreamy'),
  },
  {
    id: 'trait-picky',
    speaker: 'operations',
    text: 'A Picky hire. Wants better gloves. Gets them.',
    when: (s) => s.staff.some((m) => m.traitId === 'picky'),
  },
  {
    id: 'staff-room-owned',
    speaker: 'clerk',
    text: 'Staff room open. The kettle starts a union of one.',
    when: (s) => memo(s, 'staff-room'),
  },
  {
    id: 'morale-high',
    speaker: 'operations',
    text: 'Morale is high. Nobody notices a good week until it ends.',
    when: (s) => s.staff.length >= 3 && s.morale >= 1.05,
  },
]

// ── Milestones: revenue, empire rank, baskets ───────────────────────────────
const MILESTONES_MORE: DialogueLine[] = [
  {
    id: 'dlg-baskets-10',
    speaker: 'clerk',
    text: 'Ten baskets. You stop counting out loud and start counting in your head.',
    when: (s) => s.baskets >= 10,
  },
  {
    id: 'dlg-baskets-60',
    speaker: 'clerk',
    text: 'Sixty baskets. Somebody asks if you are open tomorrow, as if it were weather.',
    when: (s) => s.baskets >= 60,
  },
  {
    id: 'dlg-baskets-250',
    speaker: 'operations',
    text: 'Two hundred fifty baskets. The chalkboard has fans.',
    when: (s) => s.baskets >= 250,
  },
  {
    id: 'dlg-baskets-2500',
    speaker: 'operations',
    text: 'Twenty-five hundred baskets. The corner has a gravity of its own.',
    when: (s) => s.baskets >= 2500,
  },
  {
    id: 'dlg-baskets-10000',
    speaker: 'operations',
    text: 'Ten thousand baskets. A retired inspector buys cans out of sentiment.',
    when: (s) => s.baskets >= 10_000,
  },
  {
    id: 'dlg-baskets-250000',
    speaker: 'operations',
    text: 'A quarter million baskets. Numbers this big feel like geography.',
    when: (s) => s.baskets >= 250_000,
  },
  {
    id: 'dlg-baskets-1m',
    speaker: 'guardian',
    text: 'A million baskets. The chalkboard wrote itself into legend.',
    when: (s) => s.baskets >= 1_000_000,
  },
  {
    id: 'dlg-revenue-100',
    speaker: 'clerk',
    text: 'A hundred in lifetime revenue. The register is quietly proud.',
    when: (s) => s.lifetimeRevenue >= 100,
  },
  {
    id: 'dlg-revenue-1k',
    speaker: 'clerk',
    text: 'A thousand in revenue. The store pays its own coffee.',
    when: (s) => s.lifetimeRevenue >= 1000,
  },
  {
    id: 'dlg-revenue-10k',
    speaker: 'operations',
    text: 'Ten thousand through the till. Accountants begin to take your calls.',
    when: (s) => s.lifetimeRevenue >= 10_000,
  },
  {
    id: 'dlg-revenue-100k',
    speaker: 'operations',
    text: 'A hundred thousand lifetime. The corner is a company wearing a smock.',
    when: (s) => s.lifetimeRevenue >= 100_000,
  },
  {
    id: 'dlg-revenue-1m',
    speaker: 'operations',
    text: 'A million in revenue. Somewhere a ledger needs a bigger binder.',
    when: (s) => s.lifetimeRevenue >= 1_000_000,
  },
  {
    id: 'dlg-empire-3',
    speaker: 'operations',
    text: 'Empire rank three. Perks stop being decoration and start being plans.',
    when: (s) => s.empire.level >= 3,
  },
  {
    id: 'dlg-empire-8',
    speaker: 'operations',
    text: 'Empire rank eight. Strangers call the chain by its nickname.',
    when: (s) => s.empire.level >= 8,
  },
  {
    id: 'dlg-memos-10',
    speaker: 'operations',
    text: 'Ten memos filed. The binder is thicker than the lease.',
    when: (s) => s.stats.memosDone >= 10,
  },
  {
    id: 'dlg-memos-30',
    speaker: 'operations',
    text: 'Thirty memos. The spine of the story has vertebrae.',
    when: (s) => s.stats.memosDone >= 30,
  },
]

// ── Era firsts ──────────────────────────────────────────────────────────────
const ERA_FIRSTS: DialogueLine[] = [
  {
    id: 'era1-first',
    speaker: 'operations',
    text: 'Corner store. Rent, weather, and customers who remember you.',
    when: (s) => s.era >= 1 && s.introSeen,
  },
  {
    id: 'era2-first',
    speaker: 'operations',
    text: 'Chain era. Doors multiply; so does the number of ways to neglect them.',
    when: (s) => s.era >= 2,
  },
  {
    id: 'era3-first',
    speaker: 'cold',
    text: 'Cold chain era. Freshness is infrastructure now. Keep surplus positive.',
    when: (s) => s.era >= 3,
  },
  {
    id: 'era4-first',
    speaker: 'lobbyist',
    text: 'Globe era. The map shows fewer borders and more fuel prices.',
    when: (s) => s.era >= 4,
  },
  {
    id: 'era5-first',
    speaker: 'guardian',
    text: 'Seed barge era. Every shelf is a hull; every hull has a name.',
    when: (s) => s.era >= 5,
  },
  {
    id: 'era6-first',
    speaker: 'guardian',
    text: 'The last era. Accept or Reject; the chalkboard stays honest either way.',
    when: (s) => s.era >= 6,
  },
]

// ── Cold chain / politics ───────────────────────────────────────────────────
const COLD_POLITICS_MORE: DialogueLine[] = [
  {
    id: 'brownout-second',
    speaker: 'cold',
    text: 'Second brownout. Freshness floors again; tanks are the cheap cure.',
    when: (s) => (s.cold?.brownouts ?? 0) >= 2,
  },
  {
    id: 'brownout-fifth',
    speaker: 'cold',
    text: 'Fifth brownout. The grid knows your name. Build buffer, not hope.',
    when: (s) => (s.cold?.brownouts ?? 0) >= 5,
  },
  {
    id: 'plants-three',
    speaker: 'cold',
    text: 'Three plants. The compressors harmonize at night.',
    when: (s) => (s.cold?.plants ?? 0) >= 3,
  },
  {
    id: 'plants-ten',
    speaker: 'cold',
    text: 'Ten plants. The county feels the frost from its porch.',
    when: (s) => (s.cold?.plants ?? 0) >= 10,
  },
  {
    id: 'tanks-three',
    speaker: 'cold',
    text: 'Three tanks. Buffer is the quiet kind of power.',
    when: (s) => (s.cold?.tanks ?? 0) >= 3,
  },
  {
    id: 'momentum-high',
    speaker: 'cold',
    text: 'Momentum is compounding. Do not stare at it; babysit surplus.',
    when: (s) => (s.cold?.momentum ?? 1) >= 1.5,
  },
  {
    id: 'yield-half',
    speaker: 'cold',
    text: 'County yield at half. The easy frost is gone; the map beckons.',
    when: (s) => !!s.cold && s.cold.yieldMax > 0 && s.cold.yieldLeft <= s.cold.yieldMax * 0.5,
  },
  {
    id: 'yield-empty',
    speaker: 'lobbyist',
    text: 'County yield emptied. The committee wants a farewell lunch. Leave when ready.',
    when: (s) => !!s.cold && s.cold.yieldMax > 0 && s.cold.yieldLeft <= 0,
  },
  {
    id: 'quadratic-live',
    speaker: 'cold',
    text: 'Plants count twice. The yield will vanish faster than the headline.',
    when: (s) => !!s.cold?.quadratic,
  },
  {
    id: 'auto-shed',
    speaker: 'cold',
    text: 'Auto-shed kicked in. Delay, not doom — the line recovers.',
    when: (s) => (s.cold?.autoSheds ?? 0) >= 1,
  },
  {
    id: 'lobby-capital-15',
    speaker: 'lobbyist',
    text: 'Fifteen capital. Enough to leave a region with a quiet nod.',
    when: (s) => (s.politics?.capital ?? 0) >= 15,
  },
  {
    id: 'monopoly-risk',
    speaker: 'lobbyist',
    text: 'Monopoly risk is climbing. A committee is forming. Spend capital before it spends you.',
    when: (s) => (s.politics?.monopolyRisk ?? 0) >= 0.5,
  },
  {
    id: 'acquisition-third',
    speaker: 'lobbyist',
    text: 'Third acquisition. Neighbors now introduce themselves as departments.',
    when: (s) => (s.politics?.acquisitions ?? 0) >= 3,
  },
]

// ── Globe, barges, endings ──────────────────────────────────────────────────
const LATE_MORE: DialogueLine[] = [
  {
    id: 'lanes-three',
    speaker: 'guardian',
    text: 'Three lanes. The ocean has your schedule memorized.',
    when: (s) => (s.fleet?.lanes ?? 0) >= 3,
  },
  {
    id: 'fuel-low',
    speaker: 'guardian',
    text: 'Fuel is low. Dry tanks idle lanes — never brick. Top them up.',
    when: (s) => (s.fleet?.lanes ?? 0) >= 1 && s.fuel < 10,
  },
  {
    id: 'control-50',
    speaker: 'lobbyist',
    text: 'Fifty Control. Routes obey you like polite weather.',
    when: (s) => s.control >= 50,
  },
  {
    id: 'franchise-first',
    speaker: 'lobbyist',
    text: 'First franchise. Brand will drift; seal it before the fonts wander.',
    when: (s) => (s.fleet?.franchises ?? 0) >= 1,
  },
  {
    id: 'barges-five',
    speaker: 'guardian',
    text: 'Five barges. The dock has a pulse.',
    when: (s) => (s.fleet?.barges ?? 0) >= 5,
  },
  {
    id: 'barges-twenty',
    speaker: 'guardian',
    text: 'Twenty barges. The dark has a supply chain.',
    when: (s) => (s.fleet?.barges ?? 0) >= 20,
  },
  {
    id: 'fleet-launched',
    speaker: 'guardian',
    text: 'Fleet launched. Charter points shaped every hull; the rest is physics.',
    when: (s) => !!s.fleet?.launched,
  },
  {
    id: 'drift-war',
    speaker: 'guardian',
    text: 'Drift war is live. Off-Brand wears your fonts; Brand Seal is the shield.',
    when: (s) => !!s.fleet?.warOn,
  },
  {
    id: 'drift-win',
    speaker: 'guardian',
    text: 'A drift win. Legacy ticks up. The plaque has room for more.',
    when: (s) => (s.fleet?.driftWins ?? 0) >= 1,
  },
  {
    id: 'biomass-thin',
    speaker: 'guardian',
    text: 'Biomass is thin. Guardian shell keeps the last barge; use it before you need it.',
    when: (s) => !!s.fleet?.launched && s.fleet.biomass < s.fleet.biomassMax * 0.3,
  },
  {
    id: 'legacy-first',
    speaker: 'guardian',
    text: 'Legacy accrues. Out here it outranks cash, and it never rots.',
    when: (s) => (s.fleet?.legacy ?? 0) >= 1,
  },
  {
    id: 'ending-accept',
    speaker: 'guardian',
    text: 'Accept filed. Another universe, same chalkboard, twelve cans.',
    when: (s) => s.endingChoice === 'accept',
  },
  {
    id: 'ending-reject',
    speaker: 'guardian',
    text: 'Reject filed. The shelf holds one empty spine. Silence suits it.',
    when: (s) => s.endingChoice === 'reject',
  },
  {
    id: 'universe-second',
    speaker: 'operations',
    text: 'A second universe. The cans are familiar; the hunger is better prepared.',
    when: (s) => (s.prestigeCarry?.universeIndex ?? 0) >= 1 && s.baskets >= 5,
  },
]

export const EXTRA_DIALOGUE: DialogueLine[] = [
  ...WEATHER_MORE,
  ...MONEY_MORE,
  ...INSPECTION_MORE,
  ...RIVAL_MORE,
  ...CHAIN_MORE,
  ...STAFF_MORE,
  ...MILESTONES_MORE,
  ...ERA_FIRSTS,
  ...COLD_POLITICS_MORE,
  ...LATE_MORE,
]

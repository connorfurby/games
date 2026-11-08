import type { SpeakerId } from '../art/cast'
import type { MenuId } from './menus'
import { MENU_LORE } from './lore'
import type { GameState } from '../sim/state'
import { EXTRA_DIALOGUE } from './dialogueExtra'

/** Spoken bottom-strip lines. Once per save via seenLines / dialogueQueue. */
export interface DialogueLine {
  id: string
  speaker: SpeakerId
  text: string
  /** When true and not yet seen, enqueue once. */
  when: (s: GameState) => boolean
}

const MENU_SPEAKER: Partial<Record<MenuId, SpeakerId>> = {
  floor: 'clerk',
  backroom: 'clerk',
  suppliers: 'clerk',
  staff: 'operations',
  marketing: 'operations',
  books: 'operations',
  invest: 'operations',
  build: 'operations',
  upgrades: 'operations',
  ventures: 'operations',
  land: 'operations',
  strategy: 'operations',
  cold: 'cold',
  politics: 'lobbyist',
  logistics: 'guardian',
  fleet: 'guardian',
  empire: 'operations',
  coach: 'operations',
  more: 'operations',
}

function menuLine(id: MenuId): DialogueLine | null {
  const text = MENU_LORE[id]
  if (!text) return null
  return {
    id: `menu-${id}`,
    speaker: MENU_SPEAKER[id] ?? 'operations',
    text,
    when: (s) => !!s.menus[id] && s.introSeen && id !== 'floor' && id !== 'more',
  }
}

/** Post-intro teaching beats — before coach spotlight feels less sudden. */
const OPENING: DialogueLine[] = [
  {
    id: 'open-shelf',
    speaker: 'clerk',
    text: 'Shelf is what shoppers buy. Backroom is crates waiting. Unpack moves stock onto the shelf — free.',
    when: (s) => s.introSeen,
  },
  {
    id: 'open-baskets',
    speaker: 'clerk',
    text: 'Baskets (big number, top-left) are how the block remembers you. Cash beside them pays rent and trucks.',
    when: (s) => s.introSeen && !!s.seenLines['open-shelf'],
  },
  {
    id: 'open-unpack-only',
    speaker: 'operations',
    text: 'For now: Unpack. Coach will spotlight price and wholesale after you have stock moving. Skip anytime.',
    when: (s) => s.introSeen && !!s.seenLines['open-baskets'],
  },
]

const FIRSTS: DialogueLine[] = [
  {
    id: 'first-unpack',
    speaker: 'clerk',
    text: 'Stock hit the shelf. Shoppers only buy what is on offer — keep something up there.',
    when: (s) => s.stats.unpackedManual >= 1,
  },
  {
    id: 'first-sale',
    speaker: 'clerk',
    text: 'A basket finished. That is the score ticking. Cash rose a little from the price you set.',
    when: (s) => s.stats.sold >= 1,
  },
  {
    id: 'first-wholesale',
    speaker: 'operations',
    text: 'Truck paid. Crates land in the backroom — Unpack again when the shelf thins.',
    when: (s) => s.stats.ordersPlaced >= 1,
  },
  {
    id: 'first-spoil',
    speaker: 'operations',
    text: 'Something wilted. Produce ages on a clock. Dump the cooler or rotate FIFO before the smell writes your reputation.',
    when: (s) => s.stats.spoiled >= 1,
  },
  {
    id: 'first-hire',
    speaker: 'operations',
    text: 'Someone else unpacks now. Wages tick; morale is soft. Pizza helps when it dips.',
    when: (s) => s.stats.hires >= 1,
  },
  {
    id: 'first-memo',
    speaker: 'operations',
    text: 'A memo stamped. Projects spend Attention, Ideas, Reputation, or cash — and open the next door.',
    when: (s) => s.stats.memosDone >= 1,
  },
]

const MILESTONES: DialogueLine[] = [
  {
    id: 'dlg-baskets-5',
    speaker: 'clerk',
    text: 'Five baskets. The register has a rhythm now.',
    when: (s) => s.baskets >= 5,
  },
  {
    id: 'dlg-baskets-25',
    speaker: 'clerk',
    text: 'Twenty-five baskets. Regulars start recognizing the chalkboard.',
    when: (s) => s.baskets >= 25,
  },
  {
    id: 'dlg-baskets-100',
    speaker: 'operations',
    text: 'A hundred baskets. The neighborhood treats the door like weather.',
    when: (s) => s.baskets >= 100,
  },
  {
    id: 'dlg-baskets-400',
    speaker: 'operations',
    text: 'Four hundred baskets. Era pressure gathers — the corner wants a name.',
    when: (s) => s.baskets >= 400,
  },
  {
    id: 'dlg-baskets-1000',
    speaker: 'operations',
    text: 'A thousand baskets. Somewhere a clerk tells a story that starts here.',
    when: (s) => s.baskets >= 1000,
  },
  {
    id: 'dlg-baskets-5000',
    speaker: 'operations',
    text: 'Five thousand baskets. The ledger stops sounding like a joke.',
    when: (s) => s.baskets >= 5000,
  },
  {
    id: 'dlg-baskets-25000',
    speaker: 'operations',
    text: 'Twenty-five thousand. The corner is a destination now.',
    when: (s) => s.baskets >= 25_000,
  },
  {
    id: 'dlg-baskets-100000',
    speaker: 'operations',
    text: 'A hundred thousand baskets. The block tells your story for you.',
    when: (s) => s.baskets >= 100_000,
  },
]

const WEATHER: DialogueLine[] = [
  {
    id: 'wx-rain',
    speaker: 'clerk',
    text: 'Rain on the glass. Cans pull harder — comfort food weather.',
    when: (s) => s.era >= 1 && s.weather?.now === 'rain' && s.stats.weatherDays >= 1,
  },
  {
    id: 'wx-heat',
    speaker: 'clerk',
    text: 'Heat wave. Dairy and drinks want the eye-level shelf.',
    when: (s) => s.era >= 1 && s.weather?.now === 'heat' && s.stats.weatherDays >= 1,
  },
  {
    id: 'wx-cold',
    speaker: 'operations',
    text: 'Cold snap. Produce wilts faster — keep the cooler honest.',
    when: (s) => s.era >= 1 && s.weather?.now === 'cold' && s.stats.weatherDays >= 1,
  },
]

const PRESSURE: DialogueLine[] = [
  {
    id: 'first-arrears',
    speaker: 'operations',
    text: 'Rent slipped into arrears. Sales pay it down — or the landlord’s patience thins.',
    when: (s) => s.arrears > 0,
  },
  {
    id: 'first-bailout',
    speaker: 'operations',
    text: 'Bailout floated the till. Soft help, not a growth plan.',
    when: (s) => s.stats.bailouts >= 1,
  },
  {
    id: 'first-inspection-fail',
    speaker: 'operations',
    text: 'Inspection failed. Fine paid; demand soft for a while. Call early next time.',
    when: (s) => s.stats.inspections >= 1 && s.stats.finesPaid > 0,
  },
  {
    id: 'coupon-war-start',
    speaker: 'operations',
    text: 'Coupon war. Rival circulars nick demand — Match in Marketing if cash allows.',
    when: (s) => !!s.events?.couponWar?.active,
  },
  {
    id: 'second-store',
    speaker: 'operations',
    text: 'Second door. Attention splits or the new key drifts into spoil.',
    when: (s) => s.stores.length >= 2,
  },
  {
    id: 'depot-online',
    speaker: 'operations',
    text: 'Depot online. Routes beat vanity footprints — open store five only when the shed is built.',
    when: (s) => !!s.depot,
  },
  {
    id: 'incorporated',
    speaker: 'operations',
    text: 'Incorporated. Equity is expansion fuel; the board will want an agenda.',
    when: (s) => s.incorporated,
  },
  {
    id: 'board-first',
    speaker: 'operations',
    text: 'Board meeting on the calendar. Expand, dividend, R&D, or cut hours — pick something.',
    when: (s) => s.stats.boardMeetings >= 1,
  },
  {
    id: 'autonomous-live',
    speaker: 'operations',
    text: 'Autonomous released. Price slews toward Best; tills collect themselves.',
    when: (s) => s.autonomous,
  },
  {
    id: 'brownout',
    speaker: 'cold',
    text: 'Brownout. Freshness floored. Dairy and meat feel it on the aisle.',
    when: (s) => (s.cold?.brownouts ?? 0) >= 1,
  },
  {
    id: 'first-barge',
    speaker: 'guardian',
    text: 'First barge launched. Charter is a taller backroom with worse weather.',
    when: (s) => (s.fleet?.barges ?? 0) >= 1,
  },
]

const DEPTH: DialogueLine[] = [
  {
    id: 'wx-rain-end',
    speaker: 'clerk',
    text: 'Rain clears. The umbrella bucket goes back to being a bucket.',
    when: (s) => !!s.seenLines['wx-rain'] && s.weather?.now !== 'rain',
  },
  {
    id: 'wx-heat-end',
    speaker: 'clerk',
    text: 'Heat breaks. The dairy case stops sweating.',
    when: (s) => !!s.seenLines['wx-heat'] && s.weather?.now !== 'heat',
  },
  {
    id: 'wx-cold-end',
    speaker: 'operations',
    text: 'Cold snap passes. Produce goes back to its usual schedule.',
    when: (s) => !!s.seenLines['wx-cold'] && s.weather?.now !== 'cold',
  },
  {
    id: 'wx-fair-first',
    speaker: 'clerk',
    text: 'Fair day. No excuses on the log — sales are just sales.',
    when: (s) => s.era >= 1 && s.stats.weatherDays >= 1 && s.weather?.now === 'fair',
  },
  {
    id: 'wx-forecast',
    speaker: 'operations',
    text: 'Weather radio on. Tomorrow has a forecast: cans for rain, dairy for heat.',
    when: (s) => (s.memos['weather-radio'] ?? 0) > 0,
  },
  {
    id: 'wx-rain-plan',
    speaker: 'clerk',
    text: 'Rain plan pinned up. Soup on the endcap, fans on the produce.',
    when: (s) => (s.memos['rain-plan'] ?? 0) > 0,
  },
  {
    id: 'first-rent-paid',
    speaker: 'clerk',
    text: 'First rent paid. The landlord got his number; the ledger got a line.',
    when: (s) => s.stats.rentPaid >= 1,
  },
  {
    id: 'rent-steps-up',
    speaker: 'operations',
    text: 'Rent steps up. The corner costs more than the counter did.',
    when: (s) => s.era >= 1 && !!s.seenLines['first-rent-paid'],
  },
  {
    id: 'arrears-cleared',
    speaker: 'clerk',
    text: 'Arrears cleared. The landlord goes back to waving.',
    when: (s) => !!s.seenLines['first-arrears'] && s.arrears <= 0,
  },
  {
    id: 'arrears-forgiven',
    speaker: 'operations',
    text: 'Part of the arrears forgiven. Mercy is a one-time line item.',
    when: (s) => s.arrearsForgiven > 0,
  },
  {
    id: 'bailout-third',
    speaker: 'operations',
    text: 'Third bailout. Smaller price tag, bigger backroom — that is the fix.',
    when: (s) => s.stats.bailouts >= 3,
  },
  {
    id: 'first-emergency-truck',
    speaker: 'operations',
    text: 'Emergency truck ran. It cost extra and it fed the shelf.',
    when: (s) => s.stats.emergencyDeliveries >= 1,
  },
  {
    id: 'first-mentor-crate',
    speaker: 'clerk',
    text: 'A mentor crate landed. Somebody remembers what a first week costs.',
    when: (s) => s.stats.helperCrates >= 1,
  },
  {
    id: 'first-intervention',
    speaker: 'operations',
    text: 'Recovery rail used. That is what it is for — no shame in the ledger.',
    when: (s) => s.stats.interventions >= 1,
  },
  {
    id: 'first-dump',
    speaker: 'clerk',
    text: 'Cooler dumped. Cheaper than a smell and cheaper than a failed inspection.',
    when: (s) => s.stats.dumps >= 1,
  },
  {
    id: 'first-pizza',
    speaker: 'operations',
    text: 'Pizza for the crew. Morale is a cheese-based problem.',
    when: (s) => s.stats.pizzas >= 1,
  },
  {
    id: 'first-inspection-pass',
    speaker: 'operations',
    text: 'Inspector came and left. No fine. Keep the laminated checklist honest.',
    when: (s) => s.stats.inspections >= 1 && s.stats.inspectionsFailed === 0 && s.stats.finesPaid <= 0,
  },
  {
    id: 'inspection-heat',
    speaker: 'operations',
    text: 'Inspection meter is climbing. Spoil and low morale feed it — fix the source.',
    when: (s) => s.inspection.meter >= 0.7,
  },
  {
    id: 'first-call-inspector',
    speaker: 'operations',
    text: 'Called the inspector early. A scheduled visit is cheaper than a surprise.',
    when: (s) => s.stats.inspectorCalls >= 1,
  },
  {
    id: 'inspection-fail-third',
    speaker: 'operations',
    text: 'Third failed inspection. Fines stack; the prep memos pay for themselves.',
    when: (s) => s.stats.inspectionsFailed >= 3,
  },
  {
    id: 'coupon-war-match',
    speaker: 'clerk',
    text: 'Matched the rival coupons. Shoppers stop comparing; Brand holds.',
    when: (s) => s.stats.couponMatches >= 1,
  },
  {
    id: 'coupon-war-end',
    speaker: 'operations',
    text: 'Coupon war over. The circulars go in the recycling.',
    when: (s) => !!s.seenLines['coupon-war-start'] && !s.events?.couponWar?.active,
  },
  {
    id: 'rival-undercut',
    speaker: 'operations',
    text: 'Rival undercut. A lower can price on someone else\'s chalkboard — match it in Marketing.',
    when: (s) => s.events?.rival?.kind === 'undercut',
  },
  {
    id: 'rival-poach',
    speaker: 'operations',
    text: 'Rival poach. Flyers are going to your crew. A retention bonus answers it.',
    when: (s) => s.events?.rival?.kind === 'poach',
  },
  {
    id: 'rival-smear',
    speaker: 'operations',
    text: 'Rival smear. A rumor about the produce bin. Open the door and let people look.',
    when: (s) => s.events?.rival?.kind === 'smear',
  },
  {
    id: 'rival-answered',
    speaker: 'clerk',
    text: 'Answered the rival. It cost a little and it ended early.',
    when: (s) => s.stats.rivalAnswers >= 1,
  },
  {
    id: 'first-ad',
    speaker: 'operations',
    text: 'First ad bought. Glances cost money; payback is on the Marketing card.',
    when: (s) => s.stats.adsBought >= 1,
  },
  {
    id: 'first-upgrade',
    speaker: 'operations',
    text: 'First upgrade bought. Small permanent edges add up faster than they look.',
    when: (s) => s.stats.upgradesBought >= 1,
  },
  {
    id: 'first-build',
    speaker: 'operations',
    text: 'First build bought. The shell grows one tier at a time.',
    when: (s) => s.stats.buildsBought >= 1,
  },
  {
    id: 'first-venture-collect',
    speaker: 'operations',
    text: 'Venture jar collected. Side doors earn while the aisle runs.',
    when: (s) => s.stats.ventureCollects >= 1,
  },
  {
    id: 'first-interest',
    speaker: 'operations',
    text: 'Interest landed. The passbook is a very quiet second store.',
    when: (s) => s.stats.interestEarned > 0,
  },
  {
    id: 'first-dip-buy',
    speaker: 'clerk',
    text: 'Bought under 85 cents. That is what the dip is for.',
    when: (s) => s.stats.ordersBelow85 >= 1,
  },
  {
    id: 'first-shrink',
    speaker: 'clerk',
    text: 'Shrink on the tape. Something walked out without a receipt.',
    when: (s) => s.stats.shrunk >= 1,
  },
  {
    id: 'first-short-ship',
    speaker: 'operations',
    text: 'A short-shipped truck. Supplier B is cheaper for a reason.',
    when: (s) => s.stats.shortShips >= 1,
  },
  {
    id: 'first-stockout',
    speaker: 'clerk',
    text: 'The shelf ran dry for a stretch. Unpack or buy before shoppers notice.',
    when: (s) => s.stats.stockoutSec >= 15,
  },
  {
    id: 'first-endcap',
    speaker: 'operations',
    text: 'Endcap set. Prime floor space is just a shelf people walk past twice.',
    when: (s) => s.endcaps >= 1,
  },
  {
    id: 'hire-clerk',
    speaker: 'clerk',
    text: 'First clerk on the clock. The unpack line moves without you.',
    when: (s) => s.staff.some((m) => m.role === 'clerk'),
  },
  {
    id: 'hire-stocker',
    speaker: 'operations',
    text: 'First stocker. Oldest crate first; the produce notices.',
    when: (s) => s.staff.some((m) => m.role === 'stocker'),
  },
  {
    id: 'hire-cashier',
    speaker: 'operations',
    text: 'First cashier. A second register is a second heartbeat.',
    when: (s) => s.staff.some((m) => m.role === 'cashier'),
  },
  {
    id: 'hire-security',
    speaker: 'operations',
    text: 'First security hire. Shrink drops; keep it to two a store.',
    when: (s) => s.staff.some((m) => m.role === 'security'),
  },
  {
    id: 'hire-night',
    speaker: 'operations',
    text: 'First night clerk. The latch opens late and somebody is awake behind it.',
    when: (s) => s.staff.some((m) => m.role === 'night'),
  },
  {
    id: 'hire-three',
    speaker: 'operations',
    text: 'Three on the roster. A staff room and a kettle are cheaper than turnover.',
    when: (s) => s.staff.length >= 3,
  },
  {
    id: 'second-store-open',
    speaker: 'operations',
    text: 'Second store open. Policies matter now — pick Local, Standard, or Premium.',
    when: (s) => s.stores.length >= 2 && s.stats.storesOpened >= 1,
  },
  {
    id: 'policy-set',
    speaker: 'operations',
    text: 'A store policy changed. One voice per door; neighbors notice the difference.',
    when: (s) => s.stores.some((st) => st.policy !== 'standard'),
  },
  {
    id: 'store-drift',
    speaker: 'operations',
    text: 'A store is drifting. Walk it before spoil and shrink write the review.',
    when: (s) => s.stores.some((st) => st.drift >= 0.5),
  },
  {
    id: 'store-level',
    speaker: 'operations',
    text: 'Store leveled. Sales share turns into permanent hands.',
    when: (s) => s.stores.some((st) => st.level >= 2),
  },
  {
    id: 'invest-book',
    speaker: 'operations',
    text: 'Investment book open. Park surplus inside the cap; the rest earns nothing.',
    when: (s) => s.invest.unlocked,
  },
  {
    id: 'invest-deposit',
    speaker: 'operations',
    text: 'First deposit into the book. Low risk is still risk — watch the peak.',
    when: (s) => s.stats.investDeposits >= 1,
  },
  {
    id: 'equity-first',
    speaker: 'operations',
    text: 'Equity on the books. Expansion fuel, not a trophy.',
    when: (s) => s.equity > 0,
  },
  {
    id: 'tournament-first',
    speaker: 'operations',
    text: 'Tournament run. Read banked; later eras eat it.',
    when: (s) => s.stats.tournamentsRun >= 1,
  },
  {
    id: 'doctrine-first',
    speaker: 'operations',
    text: 'First doctrine bought. An opinion with teeth — buy them in order.',
    when: (s) => s.stats.doctrinesBought >= 1,
  },
  {
    id: 'board-neglect',
    speaker: 'operations',
    text: 'Board meeting waiting on a pick. Silence costs a little Reputation and Brand.',
    when: (s) => s.incorporated && s.board.nextMeetingAt > 0 && s.board.lastResolvedAt < s.board.nextMeetingAt && s.time > s.board.nextMeetingAt + 300,
  },
  {
    id: 'celebrity-booked',
    speaker: 'operations',
    text: 'Celebrity endcap booked. A loud minute of demand — cameras may nick Brand on the way out.',
    when: (s) => (s.campaigns?.celebrityUntil ?? 0) > s.time,
  },
  {
    id: 'brand-nick',
    speaker: 'operations',
    text: 'Brand is under par. Match rivals and keep celebrities honest — it regenerates.',
    when: (s) => s.era >= 2 && s.brand < 0.9,
  },
  {
    id: 'first-plant',
    speaker: 'cold',
    text: 'First cold plant humming. Freshness is infrastructure, and infrastructure has a bill.',
    when: (s) => (s.cold?.plants ?? 0) >= 1,
  },
  {
    id: 'first-tank',
    speaker: 'cold',
    text: 'Tank farm online. Buffer is cheap insurance against the next brownout.',
    when: (s) => (s.cold?.tanks ?? 0) >= 1,
  },
  {
    id: 'momentum-on',
    speaker: 'cold',
    text: 'Momentum is live. Keep surplus positive and it compounds quietly.',
    when: (s) => !!s.cold?.momentumOn,
  },
  {
    id: 'first-lobby',
    speaker: 'lobbyist',
    text: 'Lobby retainer signed. Capital leaks; keep refilling it.',
    when: (s) => (s.politics?.capital ?? 0) > 0 || (s.politics?.lobby ?? 0) > 0,
  },
  {
    id: 'first-acquisition',
    speaker: 'lobbyist',
    text: 'First acquisition. A neighbor became a department; the committee noticed.',
    when: (s) => (s.politics?.acquisitions ?? 0) >= 1,
  },
  {
    id: 'left-region',
    speaker: 'lobbyist',
    text: 'Region left. The map got bigger and the county kept its quiet.',
    when: (s) => !!s.politics?.leftRegion,
  },
  {
    id: 'first-lane',
    speaker: 'guardian',
    text: 'First ocean lane. Distance is just another aisle with a fuel bill.',
    when: (s) => (s.fleet?.lanes ?? 0) >= 1,
  },
  {
    id: 'charter-pool',
    speaker: 'guardian',
    text: 'Charter points waiting. Allocate before you launch hard.',
    when: (s) => (s.fleet?.charterPool ?? 0) > 0,
  },
  {
    id: 'guardian-used',
    speaker: 'guardian',
    text: 'Guardian shell applied. The last barge keeps its name.',
    when: (s) => !!s.fleet?.guardianUsed,
  },
  {
    id: 'ending-picked',
    speaker: 'guardian',
    text: 'Ending filed. The counter outlives the clerk who opened it.',
    when: (s) => s.endingChoice !== null,
  },
  {
    id: 'hire-analyst',
    speaker: 'operations',
    text: 'Analyst hired. Attention starts to feel like a product.',
    when: (s) => (s.compute?.analysts ?? 0) >= 2,
  },
  {
    id: 'coupon-matched',
    speaker: 'operations',
    text: 'Coupons matched. Demand recovers; Brand holds the line.',
    when: (s) => (s.stats.couponMatches ?? 0) >= 1,
  },
  {
    id: 'walk-done',
    speaker: 'operations',
    text: 'Walk completed. Drift forgot your name for a while.',
    when: (s) => (s.stats.walks ?? 0) >= 1,
  },
  {
    id: 'train-done',
    speaker: 'operations',
    text: 'Training run. The door knows FIFO and when to call HQ.',
    when: (s) => (s.stats.trains ?? 0) >= 1,
  },
  {
    id: 'interest-10',
    speaker: 'operations',
    text: 'Ten dollars of interest earned. The passbook is not a toy.',
    when: (s) => (s.stats.interestEarned ?? 0) >= 10,
  },
  {
    id: 'autonomous-habit',
    speaker: 'operations',
    text: 'Autonomous habit set. Books can re-aim price, Attention, or collect.',
    when: (s) => s.autonomous && (s.autonomousHabit ?? 'balanced') !== 'balanced',
  },
  {
    id: 'softcap-felt',
    speaker: 'operations',
    text: 'Store five without a depot. Softcaps bite — Att and demand feel it.',
    when: (s) => s.era >= 2 && s.stores.length >= 5 && !s.depot,
  },
  {
    id: 'fuel-dry',
    speaker: 'guardian',
    text: 'Fuel ran low. Lanes idle — never brick — until you refill.',
    when: (s) => s.era >= 4 && s.fuel < 5 && (s.fleet?.lanes ?? 0) >= 1,
  },
  {
    id: 'franchise-clone',
    speaker: 'operations',
    text: 'A lookalike opened nearby. Brand took a nick; it regenerates.',
    when: (s) => (s.acc?.lastCloneAt ?? -1e9) > 0,
  },
  {
    id: 'accept-queued',
    speaker: 'guardian',
    text: 'Accept queued. Hungry laws board opens — pick 0–2, or none.',
    when: (s) => !!s.pendingAccept,
  },
  {
    id: 'reject-filed',
    speaker: 'guardian',
    text: 'Reject filed. Gallery mythic; silence keeps the plaque.',
    when: (s) => s.endingChoice === 'reject',
  },
  {
    id: 'meat-unlocked',
    speaker: 'clerk',
    text: 'Meat case open. Cold and FIFO matter more than slogans.',
    when: (s) => !!s.categories.meat,
  },
  {
    id: 'dairy-unlocked',
    speaker: 'clerk',
    text: 'Dairy door humming. Heat weather will live here.',
    when: (s) => !!s.categories.dairy,
  },
  {
    id: 'household-unlocked',
    speaker: 'clerk',
    text: 'Household aisle. Non-perishables buy you breathing room.',
    when: (s) => !!s.categories.household,
  },
  {
    id: 'passbook-open',
    speaker: 'operations',
    text: 'Passbook open. Park surplus; interest is slow honesty.',
    when: (s) => !!s.menus.invest || (s.passbook?.balance ?? 0) > 0 || !!s.memos['passbook'],
  },
  {
    id: 'mentor-crate',
    speaker: 'operations',
    text: 'Mentor crate landed. Soft help — not a growth plan.',
    when: (s) => (s.stats.helperCrates ?? 0) >= 1,
  },
  {
    id: 'emergency-truck',
    speaker: 'operations',
    text: 'Emergency truck. The door stayed open another morning.',
    when: (s) => (s.stats.emergencyDeliveries ?? 0) >= 1,
  },
  {
    id: 'loyalty-live',
    speaker: 'operations',
    text: 'Loyalty loop live. Regulars remember you with a card.',
    when: (s) => (s.loyalty?.tier ?? 0) >= 1,
  },
  {
    id: 'night-latch',
    speaker: 'clerk',
    text: 'Night latch. The door pretends the day never closed.',
    when: (s) => !!s.memos['night-latch'],
  },
  {
    id: 'empire-level-2',
    speaker: 'operations',
    text: 'Empire level two. Perk points are slow furniture for the run.',
    when: (s) => s.empire.level >= 2,
  },
  {
    id: 'wx-clear-after-storm',
    speaker: 'clerk',
    text: 'Weather settles. The aisle remembers rain and heat by what still sells.',
    when: (s) => s.era >= 1 && s.weather?.now === 'fair' && (s.stats.weatherDays ?? 0) >= 4,
  },
]

const MENU_IDS_FOR_DIALOGUE: MenuId[] = [
  'backroom',
  'suppliers',
  'staff',
  'marketing',
  'books',
  'invest',
  'build',
  'upgrades',
  'ventures',
  'land',
  'strategy',
  'cold',
  'politics',
  'logistics',
  'fleet',
  'empire',
  'coach',
]

const MENU_LINES: DialogueLine[] = MENU_IDS_FOR_DIALOGUE.map(menuLine).filter(
  (x): x is DialogueLine => !!x,
)

export const DIALOGUE_LINES: DialogueLine[] = [
  ...OPENING,
  ...FIRSTS,
  ...MILESTONES,
  ...WEATHER,
  ...PRESSURE,
  ...DEPTH,
  ...MENU_LINES,
  ...EXTRA_DIALOGUE,
]

export const DIALOGUE_BY_ID: Record<string, DialogueLine> = Object.fromEntries(
  DIALOGUE_LINES.map((d) => [d.id, d]),
)

/** Safe speaker lookup — unknown → operations. */
export function dialogueSpeaker(id: string | undefined): SpeakerId {
  const line = id ? DIALOGUE_BY_ID[id] : undefined
  return line?.speaker ?? 'operations'
}

/** True once the early teaching lines that gate Floor chrome are done. */
export function earlyFloorChromeDone(s: GameState): boolean {
  return (
    !!s.seenLines['open-unpack-only'] ||
    s.baskets >= 25 ||
    (s.stats.priceChanges >= 1 && s.stats.ordersPlaced >= 1)
  )
}

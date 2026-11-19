/**
 * Visitors at the door: every few minutes someone turns up with an offer and two choices.
 * Ignore them and they wander off. Two or three new faces every era.
 */
export type VisitorEffect =
  | { kind: 'demand' | 'ventures' | 'wages'; mul: number; sec: number }
  /** Seconds of current sales (negative = it costs you). */
  | { kind: 'cash'; revenueSec: number }
  | { kind: 'brand'; delta: number }
  | { kind: 'heat'; delta: number }
  /** Free stock: this share of the backroom's free room. */
  | { kind: 'stock'; capShare: number }
  /** A coin flip: win or lose seconds of sales. */
  | { kind: 'gamble'; odds: number; winSec: number; loseSec: number }
  /** A bribe: with these odds Heat drops by `cut`, otherwise it rises by `backfire`. */
  | { kind: 'bribe'; odds: number; cut: number; backfire: number }

export interface VisitorChoice {
  label: string
  /** What happens, shown under the button. */
  hint: string
  /** Logged after the choice. */
  result: string
  effects: VisitorEffect[]
}

export interface VisitorDef {
  id: string
  era: number
  /** Stops turning up after this era. */
  lastEra?: number
  who: string
  says: string
  a: VisitorChoice
  b: VisitorChoice
}

export const VISITORS: VisitorDef[] = [
  // ── Era 1 ────────────────────────────────────────────────────────────────
  {
    id: 'cart-man',
    era: 1,
    lastEra: 3,
    who: 'A man with forty shopping carts',
    says: '“Slightly used. Only one wobbles. Okay, three wobble.”',
    a: {
      label: 'Buy the carts',
      hint: 'Costs 20s of sales · +6% shoppers for 4:00',
      result: 'The carts squeak, but shoppers fill them.',
      effects: [{ kind: 'cash', revenueSec: -20 }, { kind: 'demand', mul: 1.06, sec: 240 }],
    },
    b: { label: 'No thanks', hint: 'Nothing happens', result: 'He wobbles off with all forty.', effects: [] },
  },
  {
    id: 'food-critic',
    era: 1,
    lastEra: 4,
    who: 'A food critic in sunglasses',
    says: '“I’m writing about corner shops. Impress me.”',
    a: {
      label: 'Give the best apples',
      hint: 'Costs 15s of sales · brand up a little',
      result: '“Crisp,” she wrote. Just “crisp”. It’s enough.',
      effects: [{ kind: 'cash', revenueSec: -15 }, { kind: 'brand', delta: 0.03 }],
    },
    b: {
      label: 'Hand her a bruised one',
      hint: '+8% shoppers for 3:00 (bad press is still press)',
      result: '“Honest fruit,” she wrote. People came to see.',
      effects: [{ kind: 'demand', mul: 1.08, sec: 180 }],
    },
  },
  {
    id: 'lost-dog',
    era: 1,
    lastEra: 6,
    who: 'A lost dog',
    says: 'It sits by the door and looks at the sausages.',
    a: {
      label: 'Feed it',
      hint: '+5% shoppers for 5:00',
      result: 'The dog stays. Shoppers stop to pet it, then buy things.',
      effects: [{ kind: 'demand', mul: 1.05, sec: 300 }],
    },
    b: {
      label: 'Find its owner',
      hint: 'A small reward · brand up a little',
      result: 'The owner cried and bought a lot of cheese.',
      effects: [{ kind: 'cash', revenueSec: 20 }, { kind: 'brand', delta: 0.02 }],
    },
  },
  // ── Era 2 ────────────────────────────────────────────────────────────────
  {
    id: 'band',
    era: 2,
    lastEra: 5,
    who: 'A garage band',
    says: '“Can we play in your parking lot? We know four songs.”',
    a: {
      label: 'Let them play',
      hint: '+10% shoppers for 2:00 · crew a bit tired',
      result: 'All four songs, twice. A crowd gathered.',
      effects: [{ kind: 'demand', mul: 1.1, sec: 120 }, { kind: 'wages', mul: 1.05, sec: 120 }],
    },
    b: {
      label: 'Hire them for an ad',
      hint: 'Costs 30s of sales · +7% shoppers for 6:00',
      result: 'The jingle is terrible. Everyone hums it.',
      effects: [{ kind: 'cash', revenueSec: -30 }, { kind: 'demand', mul: 1.07, sec: 360 }],
    },
  },
  {
    id: 'shady-supplier',
    era: 2,
    who: 'A supplier with no business card',
    says: '“Crates. Cheap. Cash only. No paperwork.”',
    a: {
      label: 'Take the crates',
      hint: 'Free stock · Heat +15',
      result: 'The crates are real. The paperwork is not.',
      effects: [{ kind: 'stock', capShare: 0.2 }, { kind: 'heat', delta: 15 }],
    },
    b: { label: 'Show him out', hint: 'Nothing happens', result: 'He leaves a smell of diesel.', effects: [] },
  },
  {
    id: 'twins',
    era: 2,
    lastEra: 7,
    who: 'Twins selling lemonade',
    says: '“Fifty-fifty split. We bring the lemons, you bring the shade.”',
    a: {
      label: 'Shake on it',
      hint: 'Venture tills fill 30% faster for 4:00',
      result: 'The twins outsell the coffee cart. Respect.',
      effects: [{ kind: 'ventures', mul: 1.3, sec: 240 }],
    },
    b: {
      label: 'Buy them out',
      hint: 'Costs 25s of sales · brand up a little',
      result: 'They took the money and started a hedge fund.',
      effects: [{ kind: 'cash', revenueSec: -25 }, { kind: 'brand', delta: 0.025 }],
    },
  },
  // ── Era 3 ────────────────────────────────────────────────────────────────
  {
    id: 'mayor',
    era: 3,
    lastEra: 6,
    who: 'The mayor, running for re-election',
    says: '“A photo in your aisle? I’ll mention you in my speech.”',
    a: {
      label: 'Smile for the camera',
      hint: '+9% shoppers for 4:00',
      result: 'Front page: the mayor holding a melon.',
      effects: [{ kind: 'demand', mul: 1.09, sec: 240 }],
    },
    b: {
      label: 'Ask about the parking fines',
      hint: 'Heat −20',
      result: 'The parking fines quietly went away.',
      effects: [{ kind: 'heat', delta: -20 }],
    },
  },
  {
    id: 'gambler',
    era: 3,
    who: 'A man with a lucky coin',
    says: '“Double or nothing on today’s takings. Heads you win.”',
    a: {
      label: 'Flip it',
      hint: '50/50: win or lose a minute of sales',
      result: '',
      effects: [{ kind: 'gamble', odds: 0.5, winSec: 60, loseSec: 60 }],
    },
    b: { label: 'Walk away', hint: 'Nothing happens', result: 'He flips it anyway. Tails.', effects: [] },
  },
  {
    id: 'strike',
    era: 3,
    lastEra: 8,
    who: 'Your crew’s shift lead',
    says: '“The crew wants pizza Fridays. Or else.”',
    a: {
      label: 'Pizza for everyone',
      hint: 'Costs 20s of sales · wages −10% for 5:00 (happy crews work cheap)',
      result: 'Pepperoni diplomacy works.',
      effects: [{ kind: 'cash', revenueSec: -20 }, { kind: 'wages', mul: 0.9, sec: 300 }],
    },
    b: {
      label: '“Or else what?”',
      hint: '−8% shoppers for 2:00',
      result: 'A slow afternoon. Very slow.',
      effects: [{ kind: 'demand', mul: 0.92, sec: 120 }],
    },
  },
  // ── Era 4 ────────────────────────────────────────────────────────────────
  {
    id: 'influencer',
    era: 4,
    lastEra: 8,
    who: 'An influencer with a ring light',
    says: '“Free groceries for a post? I have nine hundred thousand followers.”',
    a: {
      label: 'Deal',
      hint: 'Costs 30s of sales · +14% shoppers for 3:00',
      result: '#aislegoals trended for a whole afternoon.',
      effects: [{ kind: 'cash', revenueSec: -30 }, { kind: 'demand', mul: 1.14, sec: 180 }],
    },
    b: {
      label: '“Nine hundred thousand bots?”',
      hint: 'Nothing happens',
      result: 'She unfollowed you. All nine hundred thousand.',
      effects: [],
    },
  },
  {
    id: 'auditor',
    era: 4,
    who: 'A tax auditor with a thick folder',
    says: '“Just a routine check. Very routine.”',
    a: {
      label: 'Open the books',
      hint: 'Costs 40s of sales · Heat −30',
      result: 'He found a typo and a missing receipt. Small fine, clean slate.',
      effects: [{ kind: 'cash', revenueSec: -40 }, { kind: 'heat', delta: -30 }],
    },
    b: {
      label: '“The books are… at the cleaners”',
      hint: 'Heat +20',
      result: 'He wrote that down. He wrote everything down.',
      effects: [{ kind: 'heat', delta: 20 }],
    },
  },
  {
    id: 'rival-spy',
    era: 4,
    who: 'Someone in a fake moustache',
    says: '“I’m definitely not from the rival chain. Can I see your price list?”',
    a: {
      label: 'Feed them fake prices',
      hint: '+10% shoppers for 4:00',
      result: 'The rival priced against numbers that never existed.',
      effects: [{ kind: 'demand', mul: 1.1, sec: 240 }],
    },
    b: {
      label: 'Hire the spy',
      hint: 'Costs 30s of sales · venture tills 40% faster for 4:00',
      result: 'The moustache now works for you.',
      effects: [{ kind: 'cash', revenueSec: -30 }, { kind: 'ventures', mul: 1.4, sec: 240 }],
    },
  },
  // ── Era 5 ────────────────────────────────────────────────────────────────
  {
    id: 'tv-crew',
    era: 5,
    lastEra: 9,
    who: 'A reality TV crew',
    says: '“Grocery Wars, season two. Drama guaranteed.”',
    a: {
      label: 'Roll the cameras',
      hint: '+16% shoppers for 3:00 · brand down a little',
      result: 'You yelled at a pallet. It was great television.',
      effects: [{ kind: 'demand', mul: 1.16, sec: 180 }, { kind: 'brand', delta: -0.02 }],
    },
    b: { label: 'Keep it classy', hint: 'Brand up a little', result: 'They filmed the bakery next door instead.', effects: [{ kind: 'brand', delta: 0.02 }] },
  },
  {
    id: 'loan-shark',
    era: 5,
    who: 'A very friendly loan officer',
    says: '“Two minutes of sales today. Three tomorrow. Easy.”',
    a: {
      label: 'Take the loan',
      hint: '+2:00 of sales now · Heat +10',
      result: 'The cash is real. So is the friendly reminder.',
      effects: [{ kind: 'cash', revenueSec: 120 }, { kind: 'heat', delta: 10 }],
    },
    b: { label: 'Decline politely', hint: 'Nothing happens', result: 'He leaves a calendar with your name circled.', effects: [] },
  },
  // ── Era 6 ────────────────────────────────────────────────────────────────
  {
    id: 'ship-captain',
    era: 6,
    who: 'A ship’s captain with salt in her beard',
    says: '“My hold’s half full. Want the other half?”',
    a: {
      label: 'Fill the backroom',
      hint: 'Costs 45s of sales · free stock',
      result: 'Crates from three oceans, stacked to the ceiling.',
      effects: [{ kind: 'cash', revenueSec: -45 }, { kind: 'stock', capShare: 0.35 }],
    },
    b: {
      label: 'Ask what else is aboard',
      hint: 'Free stock · Heat +25',
      result: 'You don’t ask what was in the long crates.',
      effects: [{ kind: 'stock', capShare: 0.25 }, { kind: 'heat', delta: 25 }],
    },
  },
  {
    id: 'charity-gala',
    era: 6,
    lastEra: 10,
    who: 'The hospital’s gala committee',
    says: '“Would you sponsor the dessert table?”',
    a: {
      label: 'Sponsor it',
      hint: 'Costs 60s of sales · brand up · Heat −15',
      result: 'A plaque, a speech, and very good press.',
      effects: [{ kind: 'cash', revenueSec: -60 }, { kind: 'brand', delta: 0.04 }, { kind: 'heat', delta: -15 }],
    },
    b: { label: 'Send a fruit basket', hint: 'Brand up a little', result: 'The basket was the hit of the night.', effects: [{ kind: 'brand', delta: 0.015 }] },
  },
  // ── Era 7 ────────────────────────────────────────────────────────────────
  {
    id: 'robot-salesman',
    era: 7,
    who: 'A robot selling robots',
    says: '“UPGRADE YOUR CREW. MY COUSINS ARE VERY CHEAP.”',
    a: {
      label: 'Rent a few',
      hint: 'Costs 40s of sales · wages −20% for 5:00',
      result: 'The robots stack shelves in perfect silence. Creepy. Efficient.',
      effects: [{ kind: 'cash', revenueSec: -40 }, { kind: 'wages', mul: 0.8, sec: 300 }],
    },
    b: { label: 'Unplug it', hint: 'Nothing happens', result: '“I WILL REMEMBER THIS.”', effects: [] },
  },
  {
    id: 'colonist',
    era: 7,
    lastEra: 11,
    who: 'A homesick colonist',
    says: '“Do you have real Earth pickles? I’ll pay anything.”',
    a: {
      label: 'Sell your last jar',
      hint: '+45s of sales now · brand up a little',
      result: 'She cried into the pickle jar. Good tears.',
      effects: [{ kind: 'cash', revenueSec: 45 }, { kind: 'brand', delta: 0.02 }],
    },
    b: {
      label: 'Start a pickle line',
      hint: 'Venture tills 50% faster for 4:00',
      result: 'Earth Pickles™ sell out on three worlds.',
      effects: [{ kind: 'ventures', mul: 1.5, sec: 240 }],
    },
  },
  {
    id: 'comet',
    era: 7,
    who: 'An astronomer',
    says: '“A comet passes tonight. Everyone will be outside.”',
    a: {
      label: 'Sell comet snacks',
      hint: '+15% shoppers for 3:00',
      result: 'Comet Crunch: just regular crunch, but shinier.',
      effects: [{ kind: 'demand', mul: 1.15, sec: 180 }],
    },
    b: {
      label: 'Close early to watch',
      hint: 'Wages −30% for 3:00 · brand up a little',
      result: 'The whole crew on the roof. Worth it.',
      effects: [{ kind: 'wages', mul: 0.7, sec: 180 }, { kind: 'brand', delta: 0.02 }],
    },
  },
  // ── Era 8 ────────────────────────────────────────────────────────────────
  {
    id: 'ai-lawyer',
    era: 8,
    who: 'An AI lawyer on a hovering tablet',
    says: '“I can make your record disappear. Legally. Mostly.”',
    a: {
      label: 'Retain it',
      hint: 'Costs 60s of sales · Heat −40',
      result: '“Objection sustained,” it said to nobody, and the heat cooled.',
      effects: [{ kind: 'cash', revenueSec: -60 }, { kind: 'heat', delta: -40 }],
    },
    b: { label: 'Close the tab', hint: 'Nothing happens', result: 'It billed you for the conversation anyway. Zero.', effects: [] },
  },
  {
    id: 'space-race',
    era: 8,
    who: 'A delivery racer with a souped-up pod',
    says: '“Bet you a minute’s takings I beat your fastest truck.”',
    a: {
      label: 'You’re on',
      hint: '60/40 in your favour: win or lose a minute of sales',
      result: '',
      effects: [{ kind: 'gamble', odds: 0.6, winSec: 60, loseSec: 60 }],
    },
    b: { label: 'Not today', hint: 'Nothing happens', result: 'He zooms off, showing off.', effects: [] },
  },
  // ── Era 9 ────────────────────────────────────────────────────────────────
  {
    id: 'seed-monk',
    era: 9,
    who: 'A seed monk from the vault',
    says: '“Patience grows the best harvests. And the best tills.”',
    a: {
      label: 'Listen a while',
      hint: 'Venture tills 60% faster for 5:00',
      result: 'You came back calmer. Your tills came back fuller.',
      effects: [{ kind: 'ventures', mul: 1.6, sec: 300 }],
    },
    b: {
      label: 'Ask for a blessing',
      hint: 'Brand up · Heat −10',
      result: 'The monk blessed the bananas. All of them.',
      effects: [{ kind: 'brand', delta: 0.03 }, { kind: 'heat', delta: -10 }],
    },
  },
  {
    id: 'black-market',
    era: 9,
    who: 'A trader from the dark side of the moon',
    says: '“Rare spices. Untaxed. Very spicy.”',
    a: {
      label: 'Buy the lot',
      hint: '+18% shoppers for 4:00 · Heat +25',
      result: 'Everybody wants the spice. Nobody asks questions.',
      effects: [{ kind: 'demand', mul: 1.18, sec: 240 }, { kind: 'heat', delta: 25 }],
    },
    b: { label: 'Report them', hint: 'Heat −20', result: 'The patrol thanks you. Your record looks cleaner.', effects: [{ kind: 'heat', delta: -20 }] },
  },
  // ── Era 10 ───────────────────────────────────────────────────────────────
  {
    id: 'ambassador',
    era: 10,
    who: 'An ambassador from a ringed world',
    says: '“Our queen adores your yogurt. Would you cater the coronation?”',
    a: {
      label: 'Cater it',
      hint: 'Costs 60s of sales · +12% shoppers for 6:00',
      result: 'The queen had seconds. The galaxy noticed.',
      effects: [{ kind: 'cash', revenueSec: -60 }, { kind: 'demand', mul: 1.12, sec: 360 }],
    },
    b: {
      label: 'Send the recipe',
      hint: 'Brand up a little',
      result: 'Your yogurt is now a royal recipe.',
      effects: [{ kind: 'brand', delta: 0.025 }],
    },
  },
  {
    id: 'time-tourist',
    era: 10,
    who: 'A tourist who says they’re from the future',
    says: '“In my time your store is a museum. Can I buy a receipt?”',
    a: {
      label: 'Sell a signed receipt',
      hint: '+90s of sales now',
      result: 'They paid in a currency that turned out to be yours.',
      effects: [{ kind: 'cash', revenueSec: 90 }],
    },
    b: {
      label: 'Ask about the future',
      hint: '+10% shoppers for 5:00',
      result: '“Stock more pickles.” You did. They were right.',
      effects: [{ kind: 'demand', mul: 1.1, sec: 300 }],
    },
  },
  // ── Era 11 ───────────────────────────────────────────────────────────────
  {
    id: 'galactic-inspector',
    era: 11,
    who: 'The Galactic Health Inspector',
    says: '“Twelve worlds, one clipboard. Shall we begin?”',
    a: {
      label: 'Give the full tour',
      hint: 'Costs 45s of sales · Heat −30 · brand up a little',
      result: 'Spotless. She smiled with all three mouths.',
      effects: [{ kind: 'cash', revenueSec: -45 }, { kind: 'heat', delta: -30 }, { kind: 'brand', delta: 0.02 }],
    },
    b: {
      label: 'Offer a “gift basket”',
      hint: 'Heat −50, if it lands · or Heat +20',
      result: '',
      effects: [{ kind: 'bribe', odds: 0.5, cut: 50, backfire: 20 }],
    },
  },
  {
    id: 'star-chef',
    era: 11,
    who: 'A chef who cooks with starlight',
    says: '“A pop-up in your flagship. One night only.”',
    a: {
      label: 'Host the pop-up',
      hint: '+20% shoppers for 3:00',
      result: 'The queue went around a moon.',
      effects: [{ kind: 'demand', mul: 1.2, sec: 180 }],
    },
    b: {
      label: 'Buy the recipe book',
      hint: 'Costs 30s of sales · venture tills 70% faster for 4:00',
      result: 'Starlight Soup, now in every kiosk.',
      effects: [{ kind: 'cash', revenueSec: -30 }, { kind: 'ventures', mul: 1.7, sec: 240 }],
    },
  },
  // ── Era 12 ───────────────────────────────────────────────────────────────
  {
    id: 'old-ivo',
    era: 12,
    who: 'Ivo, older now',
    says: '“Remember the corner store? One crate, one shelf. Look at you.”',
    a: {
      label: 'Share a coffee',
      hint: 'Brand up · wages −15% for 5:00',
      result: 'You talked till closing. The crew covered for you.',
      effects: [{ kind: 'brand', delta: 0.03 }, { kind: 'wages', mul: 0.85, sec: 300 }],
    },
    b: {
      label: 'Give him a tour',
      hint: '+15% shoppers for 5:00',
      result: 'He touched every shelf. Shoppers followed the old man around.',
      effects: [{ kind: 'demand', mul: 1.15, sec: 300 }],
    },
  },
  {
    id: 'last-customer',
    era: 12,
    who: 'A child with one coin',
    says: '“Is this enough for an apple?”',
    a: {
      label: 'It’s on the house',
      hint: 'Brand up · +10% shoppers for 5:00',
      result: 'She told everyone. Everyone came.',
      effects: [{ kind: 'brand', delta: 0.03 }, { kind: 'demand', mul: 1.1, sec: 300 }],
    },
    b: {
      label: 'Exactly enough',
      hint: 'A tiny sale',
      result: 'One coin, one apple. The oldest deal there is.',
      effects: [{ kind: 'cash', revenueSec: 1 }],
    },
  },
]

export const VISITOR_BY_ID: Record<string, VisitorDef> = Object.fromEntries(VISITORS.map((v) => [v.id, v]))

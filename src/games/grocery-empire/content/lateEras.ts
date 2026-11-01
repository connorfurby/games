/**
 * Eras 3–6 content spine (plan Part F). Wired by systems/cold, politics, fleet, endings.
 * Data-first so sim agents can import without inventing copy.
 */

export interface LateMemoStub {
  id: string
  name: string
  era: number
  voice: string
  effect: string
  /** Rough unlock hint for UI teasers. */
  unlock: string
}

export const LATE_MEMOS: LateMemoStub[] = [
  // Era 3 — cold chain & state
  { id: 'cold-plant-permit', name: 'Cold Plant Permit', era: 3, voice: 'Compressors the size of trucks. The county wants forms. Freshness becomes a plant, not a cooler.', effect: 'Unlock Cold Plant build tier.', unlock: 'Era 3 · Walk-in owned' },
  { id: 'tank-farm', name: 'Tank Farm Spec', era: 3, voice: 'Insurance in steel cylinders. Cold you can measure with a gauge.', effect: 'Unlock Tank Farm; +cold buffer.', unlock: 'Cold plant ≥1' },
  { id: 'momentum', name: 'Momentum Clause', era: 3, voice: 'While freshness holds, everything compounds. When it slips, auto-shed — delay, not doom.', effect: 'Enable Momentum; freshness floor 25%.', unlock: 'Tanks online' },
  { id: 'quadratic-plants', name: 'County Emptying', era: 3, voice: 'One memo. Every plant counts twice. The region notices the frost on its breath.', effect: 'Quadratic plant multiplier (once).', unlock: 'Plant count gate' },
  { id: 'lobby-office', name: 'Lobby Retainer', era: 3, voice: 'A polite person who knows zoning. Capital is just another SKU.', effect: 'Open Politics; Political Capital wallet.', unlock: 'HQ Wing' },
  { id: 'monopoly-watch', name: 'Acquisition Desk', era: 3, voice: 'Buy neighbors before they form a committee against your cold.', effect: 'Region acquisition actions.', unlock: 'Politics open' },
  { id: 'leave-region', name: 'Leave the Region', era: 3, voice: 'Pack the brand. The map gets bigger. The counter does not shrink.', effect: 'Era 4 unlock flag.', unlock: 'Yield emptied' },
  { id: 'private-label-works', name: 'Private-Label Works', era: 3, voice: 'Your name on the line, not just the can. Ownership tastes like ink.', effect: 'Factory production path.', unlock: 'Private label SKU' },

  // Era 4 — globe
  { id: 'ocean-lane', name: 'Ocean Lane Charter', era: 4, voice: 'Fuel, weather, and a schedule that lies. Distance is just another aisle.', effect: 'Open Logistics; first freighter lane.', unlock: 'Leave region' },
  { id: 'franchise-kit', name: 'Franchise Kit', era: 4, voice: 'Partners grow faster. Brand drifts unless sealed — Off-Brand smiles with your fonts.', effect: 'Franchise expansion (Brand risk, recoverable).', unlock: 'Lane open' },
  { id: 'fuel-buffer', name: 'Fuel Buffer Policy', era: 4, voice: 'Never launch empty. Hunger outruns optimism.', effect: '+fuel capacity; lane reliability.', unlock: 'Logistics' },
  { id: 'control-tower', name: 'Control Tower', era: 4, voice: 'Someone has to say which ocean matters today. Control is a soft crown.', effect: 'Control currency; route priorities.', unlock: '3 lanes' },

  // Era 5 — seed barges
  { id: 'barge-berth', name: 'Seed Barge Berth', era: 5, voice: 'A dock that points at the dark. Crates become barges; shelves become orbits.', effect: 'Unlock Fleet / Charter.', unlock: 'Orbital annex' },
  { id: 'charter-opener', name: 'Charter Opener', era: 5, voice: 'Shell, replication, survey, transit. Allocate carefully — every point is a doctrine.', effect: 'Charter point budget.', unlock: 'Berth built' },
  { id: 'guardian-shell', name: 'Guardian Shell', era: 5, voice: 'Cheap. One-time. Keeps the last barge alive when the drift war gets teeth.', effect: 'Emergency shell floor before extinction.', unlock: 'Fleet under pressure' },
  { id: 'elliptic-hull', name: 'Elliptic Hull', era: 5, voice: 'Less shell, more replication, then survey. Geometry is a stocking plan.', effect: 'Hull efficiency memo.', unlock: 'Charter mid' },
  { id: 'reboot-fleet', name: 'Reboot Fleet', era: 5, voice: 'Refund Charter. Respec. No shame. The void forgives bad first drafts.', effect: 'Respec Charter points.', unlock: 'Fleet launched' },
  { id: 'off-brand-war', name: 'Off-Brand Contact', era: 5, voice: 'Someone else is stocking the void with your fonts. Legacy is the score out here.', effect: 'Start drift war; Legacy currency.', unlock: 'Biomass contested' },

  // Era 6 — endings
  { id: 'universal-ration', name: 'Universal Ration', era: 6, voice: 'Every basket that can be filled has been named. The last sentence waits for Accept or Reject.', effect: 'Open ending choice.', unlock: 'Biomass cleared' },
  { id: 'accept-exile', name: 'Accept Exile', era: 6, voice: 'Another universe. Cosmetics keep. Appetite resets. The chalkboard still says CANS.', effect: 'Prestige Accept.', unlock: 'Ending open' },
  { id: 'reject-silence', name: 'Reject', era: 6, voice: 'Disassemble. Gallery mythic. Silence. The Off-Brand never gets your recipes.', effect: 'Ending Reject.', unlock: 'Ending open' },
]

export const CHARTER_AXES = [
  { id: 'shell', name: 'Shell', blurb: 'Survivability. Guardian floor at 1 barge.' },
  { id: 'replication', name: 'Replication', blurb: 'Fleet growth. Soft-floor prevents total wipe.' },
  { id: 'survey', name: 'Survey', blurb: 'Find biomass and lanes.' },
  { id: 'transit', name: 'Transit', blurb: 'Move rations between systems.' },
  { id: 'brand-seal', name: 'Brand Seal', blurb: 'Resist Off-Brand drift.' },
] as const

/** Recommended opener from plan G5. */
export const CHARTER_OPENER: Record<string, number> = {
  shell: 5,
  replication: 4,
  survey: 1,
  transit: 1,
  'brand-seal': 0,
}

export const ENDING_BEATS = {
  accept: [
    'The last ration ships under your label.',
    'Mission control files the Accept form in triplicate.',
    'Shelf Tokens settle. Texture packs remember you.',
    'Empire Rank ticks up. The counter is empty again.',
    'Somewhere, a chalkboard still says CANS. CHEAP. INSIDE.',
    'You wake with $20 and twelve cans. Appetite resets.',
    'Continue?',
  ],
  reject: [
    'You refuse the hungry universe.',
    'Barges power down. The planogram goes dark.',
    'Legacy freezes into a gallery plaque.',
    'No prestige. No second counter.',
    'The Off-Brand never gets your recipes.',
    'Silence, and a Mythic achievement.',
    'The shelf holds one empty spine.',
  ],
} as const

export const DOCTRINES = [
  { id: 'fifo-first', name: 'FIFO First', blurb: 'Tournaments favor stockers and spoil control.' },
  { id: 'price-discipline', name: 'Price Discipline', blurb: 'Read from fair pricing streaks.' },
  { id: 'ad-pulse', name: 'Ad Pulse', blurb: 'Short campaigns score in AutoTourney.' },
  { id: 'cold-guard', name: 'Cold Guard', blurb: 'Freshness buffer scores late Era 3+.' },
  { id: 'lane-thrift', name: 'Lane Thrift', blurb: 'Fuel efficiency in globe tournaments.' },
  { id: 'shell-bias', name: 'Shell Bias', blurb: 'Charter shell weight in drift fights.' },
  { id: 'survey-sweep', name: 'Survey Sweep', blurb: 'Survey axes pay Read.' },
  { id: 'quiet-books', name: 'Quiet Books', blurb: 'Low-risk invest still ticks Read slowly.' },
] as const

/** New Game+ Hungry laws — pick 0–2 after Accept. Mild; never brick. */
export const HUNGRY_MUTATORS = [
  {
    id: 'fasterSpoil' as const,
    name: 'Faster spoil',
    blurb: 'Perishables age a bit quicker. Stockers still save you.',
  },
  {
    id: 'richerYield' as const,
    name: 'Richer yield',
    blurb: 'Cold plants pay a little more cash while they run.',
  },
  {
    id: 'weirdElasticity' as const,
    name: 'Weird elasticity',
    blurb: 'Price pulls shoppers harder — odd, but fair.',
  },
  {
    id: 'expensiveAds' as const,
    name: 'Expensive ads',
    blurb: 'Each ad level costs more. Demand math is unchanged.',
  },
] as const

export type HungryMutatorId = (typeof HUNGRY_MUTATORS)[number]['id']

export const HUNGRY_MUTATOR_IDS: readonly HungryMutatorId[] = HUNGRY_MUTATORS.map((m) => m.id)

export function isHungryMutatorId(id: string): id is HungryMutatorId {
  return (HUNGRY_MUTATOR_IDS as readonly string[]).includes(id)
}

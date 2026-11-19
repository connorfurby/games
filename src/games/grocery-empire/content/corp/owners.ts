/**
 * Owners: investors who buy a slice of your company. Each one changes how the store runs,
 * more strongly the bigger their slice, and votes their own way in the boardroom.
 */
export type OwnerLever = 'demand' | 'wages' | 'ventures' | 'heatCool' | 'brandDrift' | 'quarterTarget'

export interface OwnerDef {
  id: string
  name: string
  who: string
  /** One line in their voice. */
  says: string
  era: number
  /** Effect at a 20% stake (scales with stake). */
  levers: Partial<Record<OwnerLever, number>>
  /** How they lean in board votes: +1 always growth, −1 always caution. */
  lean: { growth: number; people: number; risk: number; giving: number }
  /** Paid this much over the share price to sell back to you. */
  buyoutPremium: number
  /** Blocks back-alley schemes while they hold 10% or more. */
  vetoesAlley?: boolean
  perk: string
  catch: string
}

export const OWNERS: OwnerDef[] = [
  {
    id: 'ivo',
    name: 'Ivo',
    who: 'Your old friend from the corner store',
    says: '“I don’t want to run it. I just want it to stay a good place to work.”',
    era: 1,
    levers: { wages: -0.12, demand: 0.02 },
    lean: { growth: 0, people: 1, risk: -0.5, giving: 1 },
    buyoutPremium: 0.05,
    perk: 'The crew works for less: wages down',
    catch: 'Votes against anything that hurts the crew',
  },
  {
    id: 'harlow',
    name: 'Harlow Family Trust',
    who: 'Three generations of quiet money',
    says: '“We have been patient for ninety years. We can wait a quarter.”',
    era: 2,
    levers: { demand: 0.04, quarterTarget: -0.3 },
    lean: { growth: -0.3, people: 0.4, risk: -1, giving: 0.6 },
    buyoutPremium: 0.15,
    perk: 'Steady shoppers and gentler quarterly targets',
    catch: 'Hates risk; slow to sell back',
  },
  {
    id: 'vulture',
    name: 'Vulture Capital',
    who: 'Two partners in identical grey suits',
    says: '“Every penny is a penny. Every person is a cost.”',
    era: 2,
    levers: { wages: -0.18, brandDrift: -0.004, quarterTarget: 0.4 },
    lean: { growth: 1, people: -1, risk: 0.6, giving: -1 },
    buyoutPremium: 0.25,
    perk: 'Wages cut hard',
    catch: 'Brand slowly sours; quarterly targets climb',
  },
  {
    id: 'rosa',
    name: 'Chef Rosa Delgado',
    who: 'A famous chef with a TV show',
    says: '“I put my name on things I love. I love your peaches.”',
    era: 3,
    levers: { demand: 0.08, ventures: 0.1 },
    lean: { growth: 0.5, people: 0.5, risk: 0.2, giving: 0.4 },
    buyoutPremium: 0.1,
    perk: 'More shoppers and busier venture tills',
    catch: 'Walks out (and sells) after a scandal',
  },
  {
    id: 'pension',
    name: 'Teachers’ Pension Fund',
    who: 'Careful people with long spreadsheets',
    says: '“We like boring. Boring retires on time.”',
    era: 3,
    levers: { heatCool: 1, quarterTarget: -0.2 },
    lean: { growth: -0.2, people: 0.6, risk: -1, giving: 0.8 },
    buyoutPremium: 0.08,
    vetoesAlley: true,
    perk: 'Heat cools much faster; gentle targets',
    catch: 'At 10% or more, the back alley is closed to you',
  },
  {
    id: 'orbital',
    name: 'Orbital Ventures',
    who: 'A fund that only invests in things with rockets',
    says: '“Can the store go to space? No? Can it go faster?”',
    era: 5,
    levers: { ventures: 0.2, demand: 0.03, quarterTarget: 0.25 },
    lean: { growth: 1, people: -0.2, risk: 1, giving: -0.2 },
    buyoutPremium: 0.2,
    perk: 'Venture tills fill much faster',
    catch: 'Pushes for wild growth; targets climb',
  },
  {
    id: 'grudge',
    name: 'Grudge Capital',
    who: 'An activist investor who used to work for a rival',
    says: '“I own a piece. Now I want a say. About everything.”',
    era: 4,
    levers: { demand: 0.05, brandDrift: -0.002 },
    lean: { growth: 0.8, people: -0.5, risk: 0.8, giving: -0.6 },
    buyoutPremium: 0.35,
    perk: 'Shoppers follow the noise',
    catch: 'Votes against you whenever it can; expensive to buy out',
  },
  {
    id: 'colony',
    name: 'The Colony Cooperative',
    who: 'Ten thousand settlers who each own a little',
    says: '“We eat what you sell. We would like a say in what that is.”',
    era: 8,
    levers: { demand: 0.07, wages: -0.05 },
    lean: { growth: 0.2, people: 1, risk: -0.2, giving: 1 },
    buyoutPremium: 0.05,
    perk: 'Shoppers and crew both pitch in',
    catch: 'Votes for giving and the crew',
  },
]

export const OWNER_BY_ID: Record<string, OwnerDef> = Object.fromEntries(OWNERS.map((o) => [o.id, o]))

/** Board proposals: each is voted on by everyone who owns a slice. */
export interface ProposalEffect {
  kind: 'demand' | 'wages' | 'ventures' | 'cash' | 'brand' | 'price' | 'heat'
  /** Multiplier (demand/wages/ventures/price), seconds of sales (cash), or a delta (brand, heat). */
  v: number
  sec?: number
}

export interface ProposalDef {
  id: string
  title: string
  pitch: string
  /** Which way owners lean: their lean scores are dotted with this. */
  leans: { growth?: number; people?: number; risk?: number; giving?: number }
  yes: ProposalEffect[]
  /** What happens if it fails (usually nothing). */
  no?: ProposalEffect[]
  era: number
}

export const PROPOSALS: ProposalDef[] = [
  {
    id: 'sunday',
    title: 'Open on Sundays',
    pitch: 'More hours, more shoppers. The crew loses its day off.',
    leans: { growth: 1, people: -1 },
    yes: [{ kind: 'demand', v: 1.08, sec: 600 }, { kind: 'wages', v: 1.06, sec: 600 }],
    era: 1,
  },
  {
    id: 'raise',
    title: 'Give the crew a raise',
    pitch: 'Happier people, higher wages, a better name in town.',
    leans: { people: 1, growth: -0.4 },
    yes: [{ kind: 'wages', v: 1.08, sec: 900 }, { kind: 'brand', v: 0.03 }, { kind: 'demand', v: 1.03, sec: 900 }],
    era: 1,
  },
  {
    id: 'dividend',
    title: 'Pay a special dividend',
    pitch: 'Hand some cash to every owner. The share price likes it.',
    leans: { growth: -0.3, risk: -0.4, giving: -0.3 },
    yes: [{ kind: 'cash', v: -60 }, { kind: 'price', v: 1.08 }],
    era: 2,
  },
  {
    id: 'expand',
    title: 'Borrow big and expand',
    pitch: 'New aisles, new signs, new debt. Fortune favours the bold.',
    leans: { growth: 1, risk: 1 },
    yes: [{ kind: 'demand', v: 1.12, sec: 900 }, { kind: 'cash', v: -90 }, { kind: 'price', v: 1.05 }],
    era: 2,
  },
  {
    id: 'charity',
    title: 'Give 1% of sales to the food bank',
    pitch: 'Good for the town, good for the name.',
    leans: { giving: 1, growth: -0.3 },
    yes: [{ kind: 'brand', v: 0.04 }, { kind: 'heat', v: -15 }, { kind: 'cash', v: -30 }],
    era: 2,
  },
  {
    id: 'robots',
    title: 'Replace the night shift with robots',
    pitch: 'Cheaper, tireless, and a little bit sad.',
    leans: { growth: 0.6, people: -1, risk: 0.3 },
    yes: [{ kind: 'wages', v: 0.85, sec: 900 }, { kind: 'brand', v: -0.02 }],
    era: 4,
  },
  {
    id: 'rebrand-logo',
    title: 'A new logo (it’s a squiggle)',
    pitch: 'The agency says the squiggle tests very well.',
    leans: { risk: 0.6, growth: 0.3 },
    yes: [{ kind: 'demand', v: 1.06, sec: 600 }, { kind: 'cash', v: -20 }],
    era: 2,
  },
  {
    id: 'lobby',
    title: 'Hire a lobbyist',
    pitch: 'Friends in the right places make problems go away.',
    leans: { risk: 0.5, giving: -0.4 },
    yes: [{ kind: 'heat', v: -25 }, { kind: 'cash', v: -45 }],
    era: 3,
  },
  {
    id: 'moonshot',
    title: 'Fund a moonshot ventures lab',
    pitch: 'Ten wild ideas. One of them will work. Probably.',
    leans: { growth: 1, risk: 1, people: 0.2 },
    yes: [{ kind: 'ventures', v: 1.4, sec: 900 }, { kind: 'cash', v: -60 }],
    era: 5,
  },
  {
    id: 'colony-store',
    title: 'Open a store for the colonists at cost',
    pitch: 'No profit, lots of gratitude.',
    leans: { giving: 1, people: 0.5, growth: -0.5 },
    yes: [{ kind: 'brand', v: 0.05 }, { kind: 'demand', v: 1.05, sec: 900 }, { kind: 'cash', v: -40 }],
    era: 7,
  },
]

export const PROPOSAL_BY_ID: Record<string, ProposalDef> = Object.fromEntries(PROPOSALS.map((p) => [p.id, p]))

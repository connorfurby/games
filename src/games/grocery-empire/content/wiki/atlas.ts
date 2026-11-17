/**
 * Era atlas for the Ops Wiki: one card per era with the door out and what it opens.
 * Titles and epigraphs come from `ERA_STORY`; doors follow docs/grocery-empire/05-eras.md.
 */
import { ERA_STORY } from '../lore'
import type { MenuId } from '../menus'

export type EraBand = 'store' | 'chain' | 'globe' | 'worlds'

export interface AtlasEra {
  era: number
  title: string
  epigraph: string
  band: EraBand
  /** Plain one-liner: what this era is about. */
  focus: string
  /** What you must do to leave (the hard door). */
  door: string[]
  /** Departments that open in this era. */
  opens: MenuId[]
  /** The main rival or pressure that shows up. */
  pressure?: string
  /** Wiki article with the walkthrough. */
  article?: string
  /** Painted plate for the card (falls back to the band's). */
  plate?: 'counter' | 'corner' | 'cold' | 'fleet'
}

export const BAND_INFO: Record<EraBand, { label: string; hue: number; plate: 'counter' | 'corner' | 'cold' | 'fleet' | null }> = {
  store: { label: 'The store', hue: 18, plate: 'counter' },
  chain: { label: 'The chain', hue: 38, plate: 'corner' },
  globe: { label: 'The globe', hue: 195, plate: 'fleet' },
  worlds: { label: 'Worlds', hue: 265, plate: null },
}

const RAW: Omit<AtlasEra, 'title' | 'epigraph'>[] = [
  {
    era: 0,
    plate: 'counter',
    band: 'store',
    focus: 'One shelf, one price. Learn the loop: crates in, Unpack, sell, pay rent.',
    door: ['Feature cans', 'Serve regulars', 'Buy on three price dips', 'Staff the opening shift', 'Star Board ≥ 3.5', 'Clear the layaway slips'],
    opens: ['floor', 'backroom', 'suppliers'],
    article: 'walk-e0',
  },
  {
    era: 1,
    plate: 'corner',
    band: 'store',
    focus: 'A real corner store: staff, produce, the back office and the lot next door.',
    door: ['Two regulars served on Open days', 'Invoices paid on time', 'Flagship layout credited (72% or better)', 'Dock check-ins', 'Buy the side yard'],
    opens: ['staff', 'marketing', 'books', 'invest', 'build', 'upgrades', 'ventures', 'land'],
    article: 'walk-e1',
  },
  {
    era: 2,
    plate: 'corner',
    band: 'chain',
    focus: 'More than one door. Split Attention between stores and keep the flagship humming.',
    door: ['Three Flyer Desk weeks', 'Matched stores', 'Star Board ≥ 3.7', 'Depot or commissary', 'Cold Plant Permit'],
    opens: ['strategy', 'rivals', 'empire', 'map'],
    pressure: 'Penny Market locks your aisles when you flyer deep.',
    article: 'walk-e2',
  },
  {
    era: 3,
    plate: 'cold',
    band: 'chain',
    focus: 'Cold plants, tanks and Momentum — and a statehouse that wants a word.',
    door: ['Sign Cooler Logs', 'Blast freezer + tunnel', 'Hot-trait store walks', 'Bills passed', 'Drain county yield', 'Leave the region'],
    opens: ['cold', 'politics'],
    pressure: 'FreshWay spoils your produce faster when you flyer soft.',
    article: 'walk-e3',
  },
  {
    era: 4,
    plate: 'fleet',
    band: 'globe',
    focus: 'Ocean lanes, fuel, franchises and the Dispatch Board.',
    door: ['Clean manifests', 'Passed inspections', 'Logistics staffed', 'Win back a defection', 'Open the barge berth'],
    opens: ['logistics'],
    pressure: 'MegaMart snipes any lane you leave open.',
    article: 'walk-e45',
  },
  {
    era: 5,
    plate: 'fleet',
    band: 'globe',
    focus: 'Seed barges harvest the biomass. Charter points shape every hull.',
    door: ['Haul pockets on hauler ETAs', 'Berth turnarounds', 'Orbit on the Mid shift', 'Hold the drift war', 'Ration facing'],
    opens: ['fleet'],
    article: 'walk-e45',
  },
  {
    era: 6,
    plate: 'fleet',
    band: 'globe',
    focus: 'Ration week. The Star Board freezes and the universe asks how it ends.',
    door: ['Stamp the ration ledger each shift day', 'Then Continue, Accept (a rebuild) or Reject'],
    opens: [],
    article: 'walk-e6',
  },
  {
    era: 7,
    band: 'worlds',
    focus: 'Planets want planograms. Practice twice, then file for credit.',
    door: ['Credited world filings', 'Serve climate neighbors', 'Survey on a shift'],
    opens: ['planets'],
    pressure: 'A climate guest bans your strongest facing until the shift turns.',
    article: 'late-worlds',
  },
  {
    era: 8,
    band: 'worlds',
    focus: 'Pack convoys between three worlds. Every stop taxes its circuit.',
    door: ['Credited circuits', 'Settle each stop (spoil, tariff or delay)'],
    opens: ['exchange'],
    article: 'late-worlds',
  },
  {
    era: 9,
    band: 'worlds',
    focus: 'Named crosses and season chores. A weak year is still a gate.',
    door: ['Credited crosses', 'Yield hauls before the season turns'],
    opens: ['cultivars'],
    pressure: 'A season chore locks the bed until the turn.',
    article: 'late-worlds-bed',
  },
  {
    era: 10,
    band: 'worlds',
    focus: 'Grammar on the wire. Each filed phrase posts a habit an agent must hold.',
    door: ['Credited phrases', 'Habit watches resolved'],
    opens: ['signal'],
    article: 'late-worlds',
  },
  {
    era: 11,
    band: 'worlds',
    focus: 'Keep four clauses, survive Concord’s hearings, then sign a charter fork.',
    door: ['Seat four clauses', 'Hearing on each seated clause', 'Sign Standard, Boutique or Co-op'],
    opens: ['charter'],
    article: 'choice-charter',
  },
  {
    era: 12,
    band: 'worlds',
    focus: 'Ivo’s list. Practise to an 85% average, then Accept or Reject.',
    door: ['Finish list practice', 'Practise the list (a miss crosses out a line)', 'Accept at 85%'],
    opens: ['lastaisle'],
    article: 'late-worlds-endless',
  },
]

export const ATLAS: AtlasEra[] = RAW.map((e) => ({
  ...e,
  title: ERA_STORY[e.era]?.title ?? `Era ${e.era}`,
  epigraph: ERA_STORY[e.era]?.epigraph ?? '',
}))

export function bandOfEra(era: number): EraBand {
  return ATLAS.find((a) => a.era === era)?.band ?? 'store'
}

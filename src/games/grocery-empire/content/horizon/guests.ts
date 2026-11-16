import type { CategoryId } from '../categories'
import type { PlanetClimate } from './planets'

/**
 * Named climate guests (Eras 7–9). They are not a new aisle or a new verb: the visiting climate that
 * `serveClimateNeighbor` already rotates through now arrives as a person with a want. The ban a guest
 * leaves on the flagship's strongest facing is unchanged; the want is the story the panel tells.
 */
export interface ClimateGuestDef {
  id: string
  name: string
  /** Climates this guest answers for (the stocked world's climate decides who walks in). */
  climates: PlanetClimate[]
  /** Aisle the guest asks after. */
  want: CategoryId
  /** One line the panel shows while they wait. */
  wants: string
  /** Log line when they are served. */
  served: string
  /** First era they come through the door (7–9). */
  era: number
}

export const CLIMATE_GUESTS: ClimateGuestDef[] = [
  {
    id: 'pilar',
    name: 'Pilar Quenby',
    climates: ['quiet', 'market'],
    want: 'cans',
    wants: 'Pilar wants one plain tin that tastes like Tuesday.',
    served: 'Pilar Quenby took a plain tin, read the label twice, and left a kind note on the door.',
    era: 7,
  },
  {
    id: 'ansel',
    name: 'Ansel Voss',
    climates: ['heat', 'ash'],
    want: 'cans',
    wants: 'Ansel wants anything that survives a long, hot road.',
    served: 'Ansel Voss packed a crate against the heat and said the road had never been so well provisioned.',
    era: 7,
  },
  {
    id: 'orla',
    name: 'Orla Finch',
    climates: ['orchard'],
    want: 'produce',
    wants: 'Orla wants the first fruit of the season, still cool from the bin.',
    served: 'Orla Finch ate an apple at the register and asked, politely, for the name of the grower.',
    era: 8,
  },
  {
    id: 'tamsin',
    name: 'Tamsin Rook',
    climates: ['tide'],
    want: 'dairy',
    wants: 'Tamsin wants something cold for a ferry that is always late.',
    served: 'Tamsin Rook took a cold bottle for the ferry. The ferry, for once, was on time.',
    era: 8,
  },
  {
    id: 'bram',
    name: 'Bram Hollis',
    climates: ['night'],
    want: 'household',
    wants: 'Bram wants a lamp, a match, and nobody asking why.',
    served: 'Bram Hollis bought a lamp and a match and thanked you for not asking.',
    era: 9,
  },
  {
    id: 'ismay',
    name: 'Ismay Crane',
    climates: ['ice'],
    want: 'frozen',
    wants: 'Ismay wants a frozen thing that stays frozen all the way home.',
    served: 'Ismay Crane carried the frozen bag out in both hands, like a small, cold baby.',
    era: 9,
  },
]

export const CLIMATE_GUEST_BY_ID: Record<string, ClimateGuestDef> = Object.fromEntries(
  CLIMATE_GUESTS.map((g) => [g.id, g]),
)

/**
 * The guest who walks in for `climate`. Deterministic from the serve count (no new state): guests who
 * have not arrived yet (era gate) fall back to the earliest guest for that climate, then to anyone open.
 */
export function climateGuestFor(climate: PlanetClimate, era: number, served: number): ClimateGuestDef {
  const open = CLIMATE_GUESTS.filter((g) => g.climates.includes(climate) && g.era <= era)
  if (open.length > 0) return open[Math.abs(served) % open.length]!
  const any = CLIMATE_GUESTS.filter((g) => g.climates.includes(climate))
  if (any.length > 0) return any[0]!
  return CLIMATE_GUESTS[Math.abs(served) % CLIMATE_GUESTS.length]!
}

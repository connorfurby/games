import type { CategoryId } from '../categories'

export interface LaneRouteDef {
  id: string
  name: string
  blurb: string
  /** Preferred cargo for a wet matched lane. */
  prefer: CategoryId
}

/** Four named ocean routes — openLane picks one. */
export const LANE_ROUTES: LaneRouteDef[] = [
  {
    id: 'spice-route',
    name: 'Spice Route',
    blurb: 'Fuelled import routes. Quiet orders from far harbours.',
    prefer: 'import',
  },
  {
    id: 'cold-line',
    name: 'Cold Line',
    blurb: 'Frozen freight that wants a tunnel at both ends.',
    prefer: 'frozen',
  },
  {
    id: 'dry-haul',
    name: 'Dry Haul',
    blurb: 'Household bulk. No chill, no hurry.',
    prefer: 'household',
  },
  {
    id: 'night-run',
    name: 'Night Run',
    blurb: 'Bakery overnight. Hot at dawn, quiet by noon.',
    prefer: 'bakery',
  },
]

export const LANE_ROUTE_BY_ID: Record<string, LaneRouteDef> = Object.fromEntries(
  LANE_ROUTES.map((r) => [r.id, r]),
)

export const LANE_ROUTE_IDS = LANE_ROUTES.map((r) => r.id)

export function isLaneRouteId(id: string): boolean {
  return id in LANE_ROUTE_BY_ID
}

/** Biomass pocket rations — Haulers clear the matching pocket. */
export const POCKET_RATIONS = [
  'grain',
  'legume',
  'oil',
  'salt',
  'yeast',
  'water',
] as const

export type PocketRation = (typeof POCKET_RATIONS)[number]

export const BARGE_CLASSES = ['hauler', 'replicator', 'ark'] as const
export type BargeClass = (typeof BARGE_CLASSES)[number]

export function isBargeClass(x: string): x is BargeClass {
  return (BARGE_CLASSES as readonly string[]).includes(x)
}

export const FRANCHISE_NAMES = [
  'North Dock Mart',
  'Harbor Pantry',
  'Tide & Tin',
  'Beacon Basket',
  'Gulf Grocer',
  'Pier & Pantry',
  'Saltwind Market',
  'Cape Crate',
  'Reef Shelf',
  'Ballast Bodega',
  'Keel & Can',
  'Lantern Lane Foods',
] as const

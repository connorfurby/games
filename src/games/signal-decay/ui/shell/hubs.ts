export type HubId = 'air' | 'plant' | 'crew' | 'books' | 'network'

export type PlantSub = 'mast' | 'trees' | 'desks'
export type CrewSub = 'shifts' | 'staff' | 'rivals'
export type BooksSub = 'ledger' | 'calls'
export type NetSub = 'map' | 'dial'
export type AirSub = 'loop'

export type HubSub = AirSub | PlantSub | CrewSub | BooksSub | NetSub

export interface HubDef {
  id: HubId
  name: string
  purpose: string
  icon: 'dial' | 'mast' | 'crew' | 'book' | 'net'
  /** Department sections — GE-style subtabs under the hub title. */
  subs: { id: HubSub; name: string; purpose: string; minEra?: number }[]
}

export const HUBS: HubDef[] = [
  {
    id: 'air',
    name: 'Air',
    purpose: 'Sweep, hold, log, air.',
    icon: 'dial',
    subs: [{ id: 'loop', name: 'Loop', purpose: 'The broadcast loop.' }],
  },
  {
    id: 'plant',
    name: 'Plant',
    purpose: 'Antenna, heat, upgrades.',
    icon: 'mast',
    subs: [
      { id: 'mast', name: 'Mast', purpose: 'Raise the antenna and crystal.' },
      { id: 'trees', name: 'Trees', purpose: 'Upgrade boards that change the shack.' },
      { id: 'desks', name: 'Desks', purpose: 'Heat, band, birds, Quiet.', minEra: 3 },
    ],
  },
  {
    id: 'crew',
    name: 'Crew',
    purpose: 'Shifts, rivals, promos.',
    icon: 'crew',
    subs: [
      { id: 'shifts', name: 'Shifts', purpose: 'Hire and clock the board.' },
      { id: 'staff', name: 'Staff', purpose: 'Roles that unlock with eras.' },
      { id: 'rivals', name: 'Rivals', purpose: 'Stations on your band.', minEra: 1 },
    ],
  },
  {
    id: 'books',
    name: 'Books',
    purpose: 'Invoices, Calls, Ear.',
    icon: 'book',
    subs: [
      { id: 'ledger', name: 'Ledger', purpose: 'Pay the power book on time.' },
      { id: 'calls', name: 'Calls', purpose: 'Tournaments and Ear.', minEra: 1 },
    ],
  },
  {
    id: 'network',
    name: 'Net',
    purpose: 'Towers, Dial, charter.',
    icon: 'net',
    subs: [
      { id: 'map', name: 'Map', purpose: 'Block → county → horizon.' },
      { id: 'dial', name: 'Dial', purpose: 'Boards that credit the format.', minEra: 7 },
    ],
  },
]

export const HUB_BY_ID: Record<HubId, HubDef> = Object.fromEntries(
  HUBS.map((h) => [h.id, h]),
) as Record<HubId, HubDef>

export function defaultSub(hub: HubId): HubSub {
  return HUB_BY_ID[hub].subs[0]!.id
}

export function visibleSubs(hub: HubId, era: number) {
  return HUB_BY_ID[hub].subs.filter((s) => (s.minEra ?? 0) <= era)
}

export function subName(hub: HubId, sub: HubSub): string | undefined {
  return HUB_BY_ID[hub].subs.find((s) => s.id === sub)?.name
}

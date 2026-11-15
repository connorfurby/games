/** Cast + plate registry for story chrome. Sim never imports this — UI only. */

export type SpeakerId = 'operations' | 'clerk' | 'cold' | 'lobbyist' | 'guardian'

export type PlateId = 'counter' | 'corner' | 'cold' | 'fleet' | 'cover'

export interface CastMember {
  id: SpeakerId
  name: string
  role: string
  portrait: string
}

export const CAST: Record<SpeakerId, CastMember> = {
  operations: {
    id: 'operations',
    name: 'Operations',
    role: 'Night supervisor',
    portrait: '/ge-art/portraits/operations.jpg',
  },
  clerk: {
    id: 'clerk',
    name: 'Clerk',
    role: 'You at the counter',
    portrait: '/ge-art/portraits/clerk.jpg',
  },
  cold: {
    id: 'cold',
    name: 'Cold tech',
    role: 'Freshness & plants',
    portrait: '/ge-art/portraits/cold.jpg',
  },
  lobbyist: {
    id: 'lobbyist',
    name: 'Lobbyist',
    role: 'Politics corridor',
    portrait: '/ge-art/portraits/lobbyist.jpg',
  },
  guardian: {
    id: 'guardian',
    name: 'Guardian',
    role: 'Fleet & legacy',
    portrait: '/ge-art/portraits/guardian.jpg',
  },
}

export const PLATES: Record<PlateId, string> = {
  counter: '/ge-art/plates/counter.jpg',
  corner: '/ge-art/plates/corner.jpg',
  cold: '/ge-art/plates/cold.jpg',
  fleet: '/ge-art/plates/fleet.jpg',
  cover: '/ge-art/plates/corner.jpg',
}

/** Cover art for Shelf / Shop when a GE plate is needed. */
export const GE_COVER = PLATES.cover

export function speakerForEra(era: number): SpeakerId {
  if (era <= 0) return 'clerk'
  if (era === 1) return 'operations'
  if (era === 2) return 'operations'
  if (era === 3) return 'cold'
  if (era === 4) return 'lobbyist'
  return 'guardian'
}

export function plateForEra(era: number): PlateId {
  if (era <= 1) return 'corner'
  if (era === 2) return 'counter'
  if (era === 3) return 'cold'
  return 'fleet'
}

export function plateSrc(id: PlateId | undefined): string | undefined {
  if (!id) return undefined
  return PLATES[id]
}

/** Worlds-hub busts. Colored silhouettes — the counter had photos, the map has ink. */
export type HorizonCastId =
  | 'nia'
  | 'maris'
  | 'edda'
  | 'listener'
  | 'arun'
  | 'ivo'
  | 'surveyor'
  | 'broker'
  | 'grower'
  | 'taster'
  | 'translator'
  | 'handler'
  | 'diplomat'

export interface HorizonCastMember {
  id: HorizonCastId
  name: string
  role: string
  initials: string
  color: string
}

export const HORIZON_CAST: Record<HorizonCastId, HorizonCastMember> = {
  nia: { id: 'nia', name: 'Nia', role: 'Survey', initials: 'NI', color: '#6ea8c9' },
  maris: { id: 'maris', name: 'Maris', role: 'Keel', initials: 'MA', color: '#c45a3c' },
  edda: { id: 'edda', name: 'Edda', role: 'Greenhouse', initials: 'ED', color: '#6a9a55' },
  listener: { id: 'listener', name: 'Listener', role: 'Wire', initials: 'LI', color: '#8d84c4' },
  arun: { id: 'arun', name: 'Arun', role: 'Bazaar', initials: 'AR', color: '#c6a15a' },
  ivo: { id: 'ivo', name: 'Ivo', role: 'Last aisle', initials: 'IV', color: '#efe9dc' },
  surveyor: { id: 'surveyor', name: 'Surveyor', role: 'Probe yard', initials: 'SU', color: '#4f7d99' },
  broker: { id: 'broker', name: 'Broker', role: 'Exchange', initials: 'BR', color: '#a34832' },
  grower: { id: 'grower', name: 'Grower', role: 'Beds', initials: 'GR', color: '#3f6b3a' },
  taster: { id: 'taster', name: 'Taster', role: 'Fork', initials: 'TA', color: '#d4a054' },
  translator: { id: 'translator', name: 'Translator', role: 'Phrase', initials: 'TR', color: '#6d5ea8' },
  handler: { id: 'handler', name: 'Handler', role: 'Freight', initials: 'HA', color: '#8a6a42' },
  diplomat: { id: 'diplomat', name: 'Diplomat', role: 'Charter', initials: 'DI', color: '#b9924a' },
}

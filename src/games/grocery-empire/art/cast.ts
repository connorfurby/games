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
    role: 'Cannot-lose mentor',
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

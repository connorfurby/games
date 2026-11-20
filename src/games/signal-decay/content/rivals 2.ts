/** Rival faces — the stations that eat your audience, and the voices you meet along the way. */

import type { PortraitId } from '../art/cast'

export interface RivalFace {
  id: string
  name: string
  tag: string
  portrait: PortraitId
  /** Sentence shown while the rival is still asleep. */
  wakes: string
  /** Short bio for the museum case. */
  bio: string
  /** What they do to you, in one line. */
  tactic: string
  /** What counters them. */
  counter: string
  /** Quote on the case card. */
  quote: string
  /** True when the sim actually seeds this rival into `state.rivals`. */
  live: boolean
  /** Era the face is introduced in lore, even if not live. */
  era: number
}

export const RIVAL_FACES: RivalFace[] = [
  {
    id: 'pirate',
    name: 'Pirate 88',
    tag: 'Bootleg FM',
    portrait: 'pirate',
    wakes: 'Wakes with your first tower.',
    bio: 'A garage transmitter that hops frequencies and never files a form.',
    tactic: 'Bites hard during a live deep promo week.',
    counter: 'Price war early, or buy out once the stores add up.',
    quote: '“Call sign? We’re the one that’s always on.”',
    live: true,
    era: 2,
  },
  {
    id: 'metrowave',
    name: 'MetroWave',
    tag: 'City chain',
    portrait: 'metrowave',
    wakes: 'Wakes with your first skip.',
    bio: 'A chain with a lawyer on retainer and a jingle for every hour.',
    tactic: 'Feeds noise into the band when you print soft promos.',
    counter: 'Print mid or deep, keep clarity high, buy out when cash allows.',
    quote: '“We are your city’s number one for everything.”',
    live: true,
    era: 3,
  },
  {
    id: 'orbital',
    name: 'Orbital',
    tag: 'Satellite net',
    portrait: 'orbital',
    wakes: 'Wakes with your first bird.',
    bio: 'A satellite net that never sleeps and never says hello.',
    tactic: 'Takes the horizon faster when a fast manifest leaves the lane open.',
    counter: 'Berth your own bird, hold the quiet ledger, freeze them with a war.',
    quote: '“Coverage is a promise we keep from above.”',
    live: true,
    era: 5,
  },
  {
    id: 'choir',
    name: 'The Choir',
    tag: 'Chorus of callers',
    portrait: 'choir',
    wakes: 'Wakes when the Dial opens in Subcarrier.',
    bio: 'Dozens of callers who learned your phrases and now repeat them back.',
    tactic: 'Hums under the featured show. A bold show or an open lane makes the chorus grow faster.',
    counter: 'Answer the hum to silence it. War and buyout still cut the stores.',
    quote: '“We know the words. We were listening.”',
    live: true,
    era: 7,
  },
]

export const RIVAL_FACE_BY_ID: Record<string, RivalFace> = Object.fromEntries(RIVAL_FACES.map((r) => [r.id, r]))

export interface VoiceFace {
  id: string
  name: string
  tag: string
  portrait: PortraitId
  era: number
}

/** Named voices on the dial — not rivals. */
export const VOICE_FACES: VoiceFace[] = [
  { id: 'pete', name: 'Pete', tag: 'County relay', portrait: 'pete', era: 1 },
  { id: 'june', name: 'June', tag: 'Night skip', portrait: 'june', era: 3 },
  { id: 'maya', name: 'Maya', tag: 'Board op', portrait: 'maya', era: 1 },
  { id: 'ross', name: 'Ross', tag: 'Promo desk', portrait: 'ross', era: 2 },
  { id: 'otto', name: 'Otto', tag: 'Dawn hand', portrait: 'otto', era: 1 },
  { id: 'lena', name: 'Lena', tag: 'Night ear', portrait: 'lena', era: 3 },
]

/** Anything you can show a face for, by id. */
export function faceFor(id: string): { name: string; tag: string; portrait: PortraitId | null } {
  const r = RIVAL_FACE_BY_ID[id]
  if (r) return { name: r.name, tag: r.tag, portrait: r.portrait }
  const v = VOICE_FACES.find((x) => x.id === id)
  if (v) return { name: v.name, tag: v.tag, portrait: v.portrait }
  return { name: id, tag: 'Rival', portrait: null }
}

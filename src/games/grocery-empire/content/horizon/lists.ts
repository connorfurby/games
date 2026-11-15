/**
 * Era 12 last-list templates. Bank of eight; seed deals five lines.
 *
 * Want grammar:
 * - shelf:  `${planetId}@0.72`
 * - route:  `${good}@${destPlanetId}`
 * - crop:   a trait id
 * - phrase: a symbol id
 * - clause: a clause id, or '' on the score-only list
 *
 * Lines are harder when the matching department was never staffed.
 */

import { DEFAULT_CLAUSES } from './charter'
import type { LastLineKind } from './types'

export interface ListLine {
  kind: LastLineKind
  want: string
  /** Department id that softens this line when ever staffed. */
  dept?: string
}

export interface LastListTemplate {
  id: string
  name: string
  lines: readonly [ListLine, ListLine, ListLine, ListLine, ListLine]
}

export const LAST_LISTS: readonly LastListTemplate[] = [
  {
    id: 'A',
    name: 'The morning list',
    lines: [
      { kind: 'shelf', want: 'pantry@0.72', dept: 'survey' },
      { kind: 'route', want: 'rice@cinder', dept: 'exchange' },
      { kind: 'crop', want: 'sturdy', dept: 'cultivar' },
      { kind: 'phrase', want: 'can', dept: 'signal' },
      { kind: 'clause', want: DEFAULT_CLAUSES[0], dept: 'charter' },
    ],
  },
  {
    id: 'B',
    name: 'The orchard list',
    lines: [
      { kind: 'shelf', want: 'orchard@0.72', dept: 'survey' },
      { kind: 'route', want: 'apple@orchard', dept: 'exchange' },
      { kind: 'crop', want: 'sweet', dept: 'cultivar' },
      { kind: 'phrase', want: 'leaf', dept: 'signal' },
      { kind: 'clause', want: DEFAULT_CLAUSES[1], dept: 'charter' },
    ],
  },
  {
    id: 'C',
    name: 'The night list',
    lines: [
      { kind: 'shelf', want: 'mercy@0.72', dept: 'survey' },
      { kind: 'route', want: 'salt@brine', dept: 'exchange' },
      { kind: 'crop', want: 'lasting', dept: 'cultivar' },
      { kind: 'phrase', want: 'bell', dept: 'signal' },
      { kind: 'clause', want: DEFAULT_CLAUSES[2], dept: 'charter' },
    ],
  },
  {
    id: 'D',
    name: 'The score list',
    lines: [
      { kind: 'shelf', want: 'bazaar@0.72', dept: 'survey' },
      { kind: 'route', want: 'flour@ash', dept: 'exchange' },
      { kind: 'crop', want: 'pretty', dept: 'cultivar' },
      { kind: 'phrase', want: 'key', dept: 'signal' },
      { kind: 'clause', want: '', dept: 'charter' },
    ],
  },
  {
    id: 'E',
    name: 'The quiet list',
    lines: [
      { kind: 'shelf', want: 'snow@0.72', dept: 'survey' },
      { kind: 'route', want: 'milk@snow', dept: 'exchange' },
      { kind: 'crop', want: 'quiet', dept: 'cultivar' },
      { kind: 'phrase', want: 'star', dept: 'signal' },
      { kind: 'clause', want: DEFAULT_CLAUSES[3], dept: 'charter' },
    ],
  },
  {
    id: 'F',
    name: 'The ash list',
    lines: [
      { kind: 'shelf', want: 'ash@0.72', dept: 'survey' },
      { kind: 'route', want: 'seed@ash', dept: 'exchange' },
      { kind: 'crop', want: 'rich', dept: 'cultivar' },
      { kind: 'phrase', want: 'wave', dept: 'signal' },
      { kind: 'clause', want: 'green-aisle', dept: 'charter' },
    ],
  },
  {
    id: 'G',
    name: 'The dock list',
    lines: [
      { kind: 'shelf', want: 'brine@0.72', dept: 'survey' },
      { kind: 'route', want: 'kelp@brine', dept: 'exchange' },
      { kind: 'crop', want: 'sturdy', dept: 'cultivar' },
      { kind: 'phrase', want: 'key', dept: 'signal' },
      { kind: 'clause', want: 'dock-tithe', dept: 'charter' },
    ],
  },
  {
    id: 'H',
    name: 'The co-op list',
    lines: [
      { kind: 'shelf', want: 'cinder@0.72', dept: 'survey' },
      { kind: 'route', want: 'spice@cinder', dept: 'exchange' },
      { kind: 'crop', want: 'pretty', dept: 'cultivar' },
      { kind: 'phrase', want: 'can', dept: 'signal' },
      { kind: 'clause', want: 'venture-share', dept: 'charter' },
    ],
  },
]

export function pickList(seed: number): LastListTemplate {
  const n = LAST_LISTS.length
  const i = ((Math.trunc(seed) % n) + n) % n
  return LAST_LISTS[i] ?? LAST_LISTS[0]!
}

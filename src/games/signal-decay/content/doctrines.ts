import { DEPTH } from '../sim/balance'
import type { GameState } from '../sim/state'

export interface DoctrineDef {
  id: string
  name: string
  /** Read by `statBonus` as `doc-${stat}`. */
  stat: string
  blurb: string
}

export const DOCTRINES: DoctrineDef[] = [
  { id: 'doc-airRate', name: 'Rate card', stat: 'airRate', blurb: 'Air pays a little more, forever.' },
  { id: 'doc-noiseCut', name: 'Quiet tubes', stat: 'noiseCut', blurb: 'Noise climbs a little slower.' },
  { id: 'doc-holdPush', name: 'Heavy key', stat: 'holdPush', blurb: 'Hold pushes the noise down harder.' },
  { id: 'doc-logSpeed', name: 'Fast log', stat: 'logSpeed', blurb: 'The buffer fills faster.' },
  { id: 'doc-cooling', name: 'Cold plate', stat: 'cooling', blurb: 'Logs pull more heat off the board.' },
  { id: 'doc-towerWeight', name: 'Heavy mast', stat: 'towerWeight', blurb: 'Each tower weighs more on the net.' },
]

export const DOCTRINE_BY_ID: Record<string, DoctrineDef> = Object.fromEntries(
  DOCTRINES.map((d) => [d.id, d]),
)

export function doctrineCost(s: GameState): number {
  return 100 * Math.pow(DEPTH.doctrineGrowth, s.doctrines.length)
}

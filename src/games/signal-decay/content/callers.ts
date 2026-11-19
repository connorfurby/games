import type { Daypart } from '../sim/state'

export interface CallerDef {
  id: string
  name: string
  want: Daypart
}

export const CALLERS: CallerDef[] = [
  { id: 'maya', name: 'Maya', want: 'talk' },
  { id: 'ross', name: 'Ross', want: 'record' },
  { id: 'june', name: 'June', want: 'night' },
  { id: 'otto', name: 'Otto', want: 'weather' },
  { id: 'lena', name: 'Lena', want: 'pledge' },
  { id: 'kip', name: 'Kip', want: 'static' },
  { id: 'vera', name: 'Vera', want: 'talk' },
  { id: 'ned', name: 'Ned', want: 'record' },
  { id: 'suki', name: 'Suki', want: 'night' },
  { id: 'bo', name: 'Bo', want: 'weather' },
]

export const DAYPARTS: Daypart[] = ['talk', 'record', 'night', 'weather', 'pledge', 'static']

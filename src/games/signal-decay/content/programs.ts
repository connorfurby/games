import { DEPTH } from '../sim/balance'
import type { Daypart, GameState } from '../sim/state'

export interface ProgramDef {
  id: string
  daypart: Daypart
  name: string
  stance: 'safe' | 'bold'
  blurb: string
}

/** One safe show and one bold show per daypart. Unset matches the old flat format. */
export const PROGRAMS: ProgramDef[] = [
  { id: 'county-line', daypart: 'talk', name: 'County Line', stance: 'safe', blurb: 'Steady talk. The audience stays put.' },
  { id: 'open-mic', daypart: 'talk', name: 'Open Mic', stance: 'bold', blurb: 'Louder talk. More ears, more heat.' },
  { id: 'tape-hour', daypart: 'record', name: 'Tape Hour', stance: 'safe', blurb: 'A calm reel. Heat stays ordinary.' },
  { id: 'bootleg-reel', daypart: 'record', name: 'Bootleg Reel', stance: 'bold', blurb: 'A hot reel. Pulls harder and runs warmer.' },
  { id: 'lamp-post', daypart: 'night', name: 'Lamp Post', stance: 'safe', blurb: 'A quiet night show.' },
  { id: 'skip-ghost', daypart: 'night', name: 'Skip Ghost', stance: 'bold', blurb: 'The skip speaks. Ears up, board hotter.' },
  { id: 'farm-report', daypart: 'weather', name: 'Farm Report', stance: 'safe', blurb: 'The forecast, read straight.' },
  { id: 'storm-watch', daypart: 'weather', name: 'Storm Watch', stance: 'bold', blurb: 'Live weather. People stay, the mast warms.' },
  { id: 'quiet-ask', daypart: 'pledge', name: 'Quiet Ask', stance: 'safe', blurb: 'A soft pledge. No extra heat.' },
  { id: 'pledge-drive', daypart: 'pledge', name: 'Pledge Drive', stance: 'bold', blurb: 'An all-night ask. Bigger crowd, hotter board.' },
  { id: 'dead-air', daypart: 'static', name: 'Dead Air', stance: 'safe', blurb: 'Held static. Predictable.' },
  { id: 'hum-bed', daypart: 'static', name: 'Hum Bed', stance: 'bold', blurb: 'A thick hum. More listeners, more heat.' },
]

export const PROGRAM_BY_ID: Record<string, ProgramDef> = Object.fromEntries(
  PROGRAMS.map((p) => [p.id, p]),
)

export function programsFor(daypart: Daypart): ProgramDef[] {
  return PROGRAMS.filter((p) => p.daypart === daypart)
}

export function featuredProgram(s: GameState): ProgramDef | null {
  const day = s.depth.featuredFormat
  if (!day) return null
  const id = s.depth.programs[day]
  if (!id) return null
  return PROGRAM_BY_ID[id] ?? null
}

/** Safe and unset are ×1. Bold pulls harder. */
export function programPullMul(s: GameState): number {
  return featuredProgram(s)?.stance === 'bold' ? DEPTH.programBoldPull : 1
}

export function programHeatMul(s: GameState): number {
  return featuredProgram(s)?.stance === 'bold' ? DEPTH.programBoldHeat : 1
}

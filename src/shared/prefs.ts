import { loadGame, saveGame } from './save'

export interface DevicePrefs {
  version: number
  sdCoachDone?: boolean
  sdToursDone?: string[]
  wikiChecks?: Record<string, Record<string, boolean>>
}

const DEFAULT: DevicePrefs = { version: 1 }

export function loadPrefs(): DevicePrefs {
  return { ...DEFAULT, ...(loadGame<DevicePrefs>('prefs') ?? {}) }
}

export function savePrefs(patch: Partial<DevicePrefs>) {
  const next = { ...loadPrefs(), ...patch, version: 1 }
  saveGame('prefs', next)
  return next
}

export function getWikiChecks(key: string): Record<string, boolean> {
  return loadPrefs().wikiChecks?.[key] ?? {}
}

export function setWikiChecks(key: string, checks: Record<string, boolean>) {
  const prefs = loadPrefs()
  savePrefs({ wikiChecks: { ...(prefs.wikiChecks ?? {}), [key]: checks } })
}

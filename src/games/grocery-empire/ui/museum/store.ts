import { useSyncExternalStore } from 'react'
import { loadGame, saveGame } from '@/shared/save'
import { emptyMuseum, normalizeMuseum, type MuseumSave } from '../../sim/museum'
import { isDevSave } from '../../sim/saveKey'

/**
 * The museum's own save. Separate from the run (and from site meta) so relics survive
 * New Game, Rebrand and hard reset. The DevMode sandbox gets its own copy.
 */
const KEY = () => (isDevSave() ? 'grocery-museum-dev' : 'grocery-museum')

let loadedKey = ''
let current: MuseumSave = emptyMuseum()
let version = 0
const subs = new Set<() => void>()

function ensure() {
  const k = KEY()
  if (k === loadedKey) return
  loadedKey = k
  let raw: unknown = null
  try {
    raw = loadGame<unknown>(k)
  } catch {
    raw = null
  }
  current = normalizeMuseum(raw)
  version++
}

export const museumStore = {
  get(): MuseumSave {
    ensure()
    return current
  },
  /** Apply a change to a copy, save it, and notify. Return false from fn to skip. */
  update(fn: (m: MuseumSave) => boolean | void) {
    ensure()
    const next = structuredClone(current)
    if (fn(next) === false) return
    current = next
    version++
    try {
      saveGame(loadedKey, current)
    } catch {
      /* storage full or blocked: keep going in memory */
    }
    for (const s of subs) s()
  },
  subscribe(cb: () => void) {
    subs.add(cb)
    return () => subs.delete(cb)
  },
  version: () => {
    ensure()
    return version
  },
}

export function useMuseum(): MuseumSave {
  useSyncExternalStore(museumStore.subscribe, museumStore.version, museumStore.version)
  return museumStore.get()
}

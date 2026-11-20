import { useSyncExternalStore } from 'react'
import { loadGame, saveGame } from '@/shared/save'
import { emptyMuseum, normalizeMuseum, type MuseumSave } from '../../sim/museum'
import { isDevSave } from '../../sim/saveKey'

/**
 * The museum's own save. Separate from the run (and from site meta) so relics survive
 * New Game and Rebrand. A reset clears it only when the player ticks Museum. The DevMode sandbox gets its own copy.
 *
 * Must reload after cloud hydrate — an early empty `get()` (e.g. Shelf) must not stick
 * forever, or `earn()` re-grants every claim-keyed chest and overwrites the account.
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
  const before = raw && typeof raw === 'object' ? (raw as { v?: unknown }).v : 0
  current = normalizeMuseum(raw)
  // Only write when migrating an existing older payload — never invent an empty
  // `grocery-museum` slot before cloud hydrate (that can race and clobber the account).
  if (raw != null && before !== 2) {
    try {
      saveGame(k, current)
    } catch {
      /* keep the migrated copy in memory */
    }
  }
  version++
}

function notify() {
  for (const s of subs) s()
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
      saveGame(loadedKey || KEY(), current)
    } catch {
      /* storage full or blocked: keep going in memory */
    }
    notify()
  },
  /** Empty the museum (relics, chests, progress) and save the empty copy. */
  reset() {
    ensure()
    current = emptyMuseum()
    version++
    try {
      saveGame(loadedKey || KEY(), current)
    } catch {
      /* storage blocked: the empty copy still holds for this visit */
    }
    notify()
  },
  /**
   * Drop the in-memory cache and re-read from the account Map.
   * Call after cloud hydrate and on sign-out.
   */
  reload() {
    loadedKey = ''
    ensure()
    notify()
  },
  /** Forget cached museum without reading (sign-out). */
  invalidate() {
    loadedKey = ''
    current = emptyMuseum()
    version++
    notify()
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

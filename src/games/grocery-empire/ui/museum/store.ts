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
 *
 * Persist is debounced: playClock banking stays in memory; grants / opens / resets flush now.
 */
const KEY = () => (isDevSave() ? 'grocery-museum-dev' : 'grocery-museum')
const PERSIST_DEBOUNCE_MS = 30_000

export type MuseumPersist = 'now' | 'later' | false

let loadedKey = ''
let current: MuseumSave = emptyMuseum()
let version = 0
const subs = new Set<() => void>()
let persistTimer: ReturnType<typeof setTimeout> | null = null
let persistPending = false

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

function writeNow() {
  persistPending = false
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  try {
    saveGame(loadedKey || KEY(), current)
  } catch {
    /* storage full or blocked: keep going in memory */
  }
}

function schedulePersist() {
  persistPending = true
  if (persistTimer) return
  persistTimer = setTimeout(() => {
    persistTimer = null
    if (persistPending) writeNow()
  }, PERSIST_DEBOUNCE_MS)
}

function commit(next: MuseumSave, persist: MuseumPersist) {
  current = next
  if (persist === 'later') {
    // playClock banking: keep memory warm, debounce disk, don't wake React.
    schedulePersist()
    return
  }
  version++
  if (persist === 'now') writeNow()
  notify()
}

export const museumStore = {
  get(): MuseumSave {
    ensure()
    return current
  },
  /**
   * Apply a change to a copy. Return false from fn to skip.
   * Default persist is immediate (opens, UI edits, resets).
   */
  update(fn: (m: MuseumSave) => boolean | void, persist: MuseumPersist = 'now') {
    ensure()
    const next = structuredClone(current)
    if (fn(next) === false) return
    commit(next, persist)
  },
  /**
   * Mutate a draft and choose persist mode from the return value.
   * `false` = discard; `'later'` = debounce; `'now'` = write immediately.
   */
  apply(fn: (m: MuseumSave) => MuseumPersist): MuseumPersist {
    ensure()
    const next = structuredClone(current)
    const persist = fn(next)
    if (persist === false) return false
    commit(next, persist)
    return persist
  },
  /** Empty the museum (relics, chests, progress) and save the empty copy. */
  reset() {
    ensure()
    commit(emptyMuseum(), 'now')
  },
  /** Flush a pending debounced write (tab hide / leave play). */
  flush() {
    if (persistPending) writeNow()
  },
  /**
   * Drop the in-memory cache and re-read from the account Map.
   * Call after cloud hydrate and on sign-out.
   */
  reload() {
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    persistPending = false
    loadedKey = ''
    ensure()
    notify()
  },
  /** Forget cached museum without reading (sign-out). */
  invalidate() {
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    persistPending = false
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

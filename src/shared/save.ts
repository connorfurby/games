import { markDeleted, markDirty } from './cloudSync'
import { isCloudSlot, isDevSlot } from './progress'
import { deserializeState, serializeState } from './saveCodec'
import { supabaseConfigured } from './supabase'

export { deserializeState, serializeState } from './saveCodec'

/**
 * In-memory account cache. With accounts, cloud is the durable store and nothing touches
 * localStorage. A build with no account server (local play, dev, e2e) keeps a browser copy
 * instead, so a refresh doesn't wipe the run.
 */
const LOCAL_PREFIX = 'games.v1.'
const localMirror = !supabaseConfigured && import.meta.env.MODE !== 'test' && typeof localStorage !== 'undefined'

class SlotStore extends Map<string, string> {
  override set(id: string, raw: string) {
    super.set(id, raw)
    if (localMirror) {
      try {
        localStorage.setItem(LOCAL_PREFIX + id, raw)
      } catch {
        /* full or blocked: memory still has it */
      }
    }
    return this
  }
  override delete(id: string) {
    if (localMirror) localStorage.removeItem(LOCAL_PREFIX + id)
    return super.delete(id)
  }
  override clear() {
    if (localMirror) for (const k of Object.keys(localStorage)) if (k.startsWith(LOCAL_PREFIX)) localStorage.removeItem(k)
    super.clear()
  }
}

const store = new SlotStore()
if (localMirror) {
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith(LOCAL_PREFIX)) continue
    const raw = localStorage.getItem(k)
    if (raw) Map.prototype.set.call(store, k.slice(LOCAL_PREFIX.length), raw)
  }
}
const snaps = new Map<string, Snapshot[]>()

function notifyCloudWrite(id: string) {
  if (isDevSlot(id)) return
  if (!isCloudSlot(id) && !id.match(/^grocery-empire-slot-[123]$/)) return
  markDirty(id)
}

/** Test helper — wipe the in-memory store. */
export function __resetSaveStore() {
  store.clear()
  snaps.clear()
}

/** Replace every slot from a cloud hydrate (clears first). */
export function replaceAllSlots(payloads: Record<string, string>) {
  store.clear()
  snaps.clear()
  for (const [id, raw] of Object.entries(payloads)) {
    store.set(id, raw)
  }
}

/** Clear every slot (sign-out). */
export function clearAllSlots() {
  store.clear()
  snaps.clear()
}

export function saveGame(id: string, data: unknown) {
  try {
    const payload = serializeState(data)
    if (store.get(id) === payload) return
    store.set(id, payload)
    notifyCloudWrite(id)
  } catch {
    /* ignore */
  }
}

/** Write a raw JSON string (slot copy / import). Syncs when signed in. */
export function saveRaw(id: string, raw: string) {
  if (store.get(id) === raw) return
  store.set(id, raw)
  notifyCloudWrite(id)
}

/** Load a game save. Never throws — returns null on missing or corrupt data. */
export function loadGame<T>(id: string): T | null {
  const raw = store.get(id)
  if (!raw) return null
  return deserializeState<T>(raw)
}

/** Alias for loadGame — explicit “never brick the app” entry point. */
export function safeLoadGame<T>(id: string): T | null {
  return loadGame<T>(id)
}

export function exportSave(id: string): string {
  return store.get(id) ?? ''
}

export function importSave(id: string, raw: string) {
  store.set(id, raw)
  notifyCloudWrite(id)
}

/** Wipe primary + snapshots for a game id. Used by New Game / recovery UI. */
export function clearGameSave(id: string) {
  store.delete(id)
  snaps.delete(id)
  if (!isDevSlot(id) && (isCloudSlot(id) || /^grocery-empire-slot-[123]$/.test(id))) {
    markDeleted(id)
  }
}

export function saveKey(id: string) {
  return id
}

export function saveMeta(data: unknown) {
  saveGame('meta', data)
}

export function loadMeta<T>(fallback: T): T {
  return loadGame<T>('meta') ?? fallback
}

export const SNAP_EVERY_MS = 10 * 60 * 1000
export const SNAP_KEEP = 2

export interface SnapshotInfo {
  at: number
  label: string
}

interface Snapshot extends SnapshotInfo {
  payload: string
}

function readSnaps(id: string): Snapshot[] {
  return snaps.get(id) ?? []
}

/** Take a snapshot if the newest is older than SNAP_EVERY_MS (or `force`). Never throws. */
export function snapshotGame(id: string, data: unknown, label: string, now = Date.now(), force = false): boolean {
  try {
    const list = readSnaps(id)
    const newest = list[0]
    if (!force && newest && now - newest.at < SNAP_EVERY_MS) return false
    const next = [{ at: now, label, payload: serializeState(data) }, ...list].slice(0, SNAP_KEEP)
    snaps.set(id, next)
    return true
  } catch {
    return false
  }
}

/** Newest first, without the payloads. */
export function listSnapshots(id: string): SnapshotInfo[] {
  return readSnaps(id).map(({ at, label }) => ({ at, label }))
}

/** The saved data of snapshot `i` (newest = 0), or null. */
export function readSnapshot<T>(id: string, i: number): T | null {
  const s = readSnaps(id)[i]
  return s ? deserializeState<T>(s.payload) : null
}

/** Drop every automatic backup for `id` (after a Rebrand, so its payout can't be replayed). */
export function clearSnapshots(id: string) {
  snaps.delete(id)
}

/** Read raw payload for cloud flush. */
export function getRawSlot(id: string): string | null {
  return store.get(id) ?? null
}

/** All in-memory slot payloads (for diagnostics / tests). */
export function listSlotIds(): string[] {
  return [...store.keys()]
}

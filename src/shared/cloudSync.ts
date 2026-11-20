import type { SaveRow } from './database.types'
import { CLOUD_SLOT_IDS, isCloudSlot, isDevSlot } from './progress'
import { clearAllSlots, getRawSlot, replaceAllSlots } from './save'
import { getSupabase } from './supabase'

const FLUSH_MS = 3000
const dirty = new Set<string>()
let flushTimer: ReturnType<typeof setTimeout> | null = null
let syncUserId: string | null = null
let flushing = false
const hydrateListeners = new Set<(e: HydrateEvent) => void>()

export type HydrateEvent =
  | { type: 'start' }
  | { type: 'done'; reloaded: boolean }
  | { type: 'error'; message: string }

/** Legacy types kept so AuthContext compiles during the cutover. */
export type ConflictChoice = 'cloud'
export interface ConflictInfo {
  slotId: string
  localLabel: string
  cloudLabel: string
}

export function subscribeHydrate(fn: (e: HydrateEvent) => void) {
  hydrateListeners.add(fn)
  return () => {
    hydrateListeners.delete(fn)
  }
}

function emit(e: HydrateEvent) {
  for (const fn of hydrateListeners) {
    try {
      fn(e)
    } catch {
      /* ignore */
    }
  }
}

export function setSyncUser(userId: string | null) {
  syncUserId = userId
  if (!userId) {
    dirty.clear()
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
  }
}

export function getSyncUser(): string | null {
  return syncUserId
}

/** Mark a slot dirty after a memory write. No-op when signed out or DevMode. */
export function markDirty(slotId: string) {
  if (!syncUserId || isDevSlot(slotId)) return
  if (!isCloudSlot(slotId) && !/^grocery-empire-slot-[123]$/.test(slotId)) return
  dirty.add(slotId)
  scheduleFlush()
}

export function markDeleted(slotId: string) {
  if (!syncUserId || isDevSlot(slotId)) return
  void deleteCloudSlot(slotId)
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushDirty()
  }, FLUSH_MS)
}

export async function flushDirty(): Promise<void> {
  if (!syncUserId || flushing || dirty.size === 0) return
  const sb = getSupabase()
  if (!sb) return
  flushing = true
  const ids = [...dirty]
  dirty.clear()
  try {
    const rows = ids
      .map((slot_id) => {
        const payload = getRawSlot(slot_id)
        if (!payload) return null
        return { user_id: syncUserId!, slot_id, payload }
      })
      .filter((r): r is { user_id: string; slot_id: string; payload: string } => !!r)

    if (rows.length === 0) return
    const { error } = await sb.from('saves').upsert(rows, { onConflict: 'user_id,slot_id' })
    if (error) {
      for (const r of rows) dirty.add(r.slot_id)
      console.warn('cloud flush failed', error.message)
    }
  } finally {
    flushing = false
    if (dirty.size) scheduleFlush()
  }
}

async function deleteCloudSlot(slotId: string) {
  const sb = getSupabase()
  if (!sb || !syncUserId) return
  const { error } = await sb.from('saves').delete().eq('user_id', syncUserId).eq('slot_id', slotId)
  if (error) console.warn('cloud delete failed', error.message)
}

/**
 * Pull this account's saves into memory. No localStorage migration — cloud only.
 */
export async function hydrateForUser(userId: string): Promise<{ reloaded: boolean }> {
  const sb = getSupabase()
  if (!sb) {
    setSyncUser(null)
    return { reloaded: false }
  }

  emit({ type: 'start' })
  // Keep syncUser off until slots are replaced so an early empty write cannot mark dirty.

  try {
    const { data, error } = await sb.from('saves').select('slot_id, payload, updated_at').eq('user_id', userId)
    if (error) throw new Error(error.message)

    const payloads: Record<string, string> = {}
    for (const row of (data ?? []) as SaveRow[]) {
      payloads[row.slot_id] = row.payload
    }
    // Ensure known slots exist as empty absence (engines create fresh if missing).
    for (const id of CLOUD_SLOT_IDS) {
      if (!(id in payloads)) {
        /* leave absent — loadGame returns null → createInitialState */
      }
    }
    replaceAllSlots(payloads)
    dirty.clear()
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    setSyncUser(userId)
    emit({ type: 'done', reloaded: true })
    return { reloaded: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not open your account saves.'
    emit({ type: 'error', message })
    clearAllSlots()
    dirty.clear()
    setSyncUser(null)
    emit({ type: 'done', reloaded: false })
    return { reloaded: false }
  }
}

export function signOutClear() {
  setSyncUser(null)
  clearAllSlots()
  dirty.clear()
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
}

/** Call on visibility hidden / beforeunload. */
export function flushNow() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  return flushDirty()
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushNow()
  })
  window.addEventListener('pagehide', () => {
    void flushNow()
  })
}

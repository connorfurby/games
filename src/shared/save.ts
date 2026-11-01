import { D } from './bn'

const PREFIX = 'games.v1.'

function isDecimal(v: unknown): boolean {
  return (
    !!v &&
    typeof v === 'object' &&
    'mantissa' in (v as object) &&
    'exponent' in (v as object) &&
    typeof (v as { toString: () => string }).toString === 'function'
  )
}

export function serializeState(data: unknown): string {
  return JSON.stringify(data, (_k, v) => {
    if (isDecimal(v)) return { __bn: String(v) }
    return v
  })
}

/** Parse a save string. Never throws — returns null on any failure. */
export function deserializeState<T>(raw: string): T | null {
  try {
    if (typeof raw !== 'string' || raw.length === 0) return null
    return JSON.parse(raw, (_k, v) => {
      if (v && typeof v === 'object' && '__bn' in v) return D((v as { __bn: string }).__bn)
      return v
    }) as T
  } catch {
    return null
  }
}

export function saveGame(id: string, data: unknown) {
  try {
    const payload = serializeState(data)
    const key = PREFIX + id
    localStorage.setItem(PREFIX + id + '.tmp', payload)
    localStorage.setItem(key, payload)
    localStorage.setItem(PREFIX + id + '.bak', payload)
    localStorage.removeItem(PREFIX + id + '.tmp')
  } catch {
    /* ignore */
  }
}

/** Load a game save. Never throws — returns null on missing or corrupt data. */
export function loadGame<T>(id: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + id) ?? localStorage.getItem(PREFIX + id + '.bak')
    if (!raw) return null
    return deserializeState<T>(raw)
  } catch {
    return null
  }
}

/** Alias for loadGame — explicit “never brick the app” entry point. */
export function safeLoadGame<T>(id: string): T | null {
  return loadGame<T>(id)
}

export function exportSave(id: string): string {
  try {
    return localStorage.getItem(PREFIX + id) ?? ''
  } catch {
    return ''
  }
}

export function importSave(id: string, raw: string) {
  try {
    localStorage.setItem(PREFIX + id, raw)
  } catch {
    /* ignore */
  }
}

/** Wipe primary + tmp + backup for a game id. Used by New Game / recovery UI. */
export function clearGameSave(id: string) {
  try {
    for (const suffix of ['', '.tmp', '.bak']) {
      localStorage.removeItem(PREFIX + id + suffix)
    }
  } catch {
    /* ignore */
  }
}

export function saveKey(id: string) {
  return PREFIX + id
}

export function saveMeta(data: unknown) {
  saveGame('meta', data)
}

export function loadMeta<T>(fallback: T): T {
  return loadGame<T>('meta') ?? fallback
}

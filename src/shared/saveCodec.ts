import { D } from './bn'

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
    // Legacy Decimal leftovers (if any) become plain numbers.
    if (isDecimal(v)) {
      const n = Number(String(v))
      return Number.isFinite(n) ? n : 0
    }
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

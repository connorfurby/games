import type { CrisisKind } from '../../../sim/balance'

export type { CrisisKind }

export interface CrisisOption {
  label: string
  hint: string
  /** Seconds of sales it costs up front. */
  costSec: number
  /** Odds it works. */
  odds: number
}

export interface CrisisDef {
  id: string
  era: number
  /** Stops appearing after this era (inclusive). Default: era + 4. */
  lastEra?: number
  kind: CrisisKind
  title: string
  body: string
  options: [CrisisOption, CrisisOption, CrisisOption]
}

export const opt = (label: string, hint: string, costSec: number, odds: number): CrisisOption => ({
  label,
  hint,
  costSec,
  odds,
})

/** Costly-reliable / free-gamble / cheap-denial — the three-button pattern. */
export function trio(
  a: [string, string, number, number],
  b: [string, string, number, number],
  c: [string, string, number, number],
): [CrisisOption, CrisisOption, CrisisOption] {
  return [opt(...a), opt(...b), opt(...c)]
}

export function crisis(def: CrisisDef): CrisisDef {
  return def
}

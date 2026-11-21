export type NumberFormat = 'named' | 'scientific' | 'engineering' | 'full'

const NAMES = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
]

/** Plain-number formatter. Matches the old break_eternity path for UI strings. */
export function formatBN(value: number, format: NumberFormat = 'named', digits = 2): string {
  if (!Number.isFinite(value)) return '0'
  const abs = Math.abs(value)
  if (abs < 1000) {
    if (abs < 10) return value.toFixed(Math.min(digits, 2))
    if (abs < 100) return value.toFixed(1)
    return Math.floor(value).toLocaleString()
  }
  if (format === 'full') {
    // Past ~1e9, dumping every digit is unreadable in an idle game.
    if (abs < 1e9) return Math.trunc(value).toString()
    // Fall through to named / scientific below.
  }
  if (format === 'scientific') {
    return value.toExponential(digits)
  }
  const exp = Math.floor(Math.log10(abs))
  if (format === 'engineering') {
    const eng = Math.floor(exp / 3) * 3
    const mant = value / 10 ** eng
    return `${mant.toFixed(digits)}e${eng}`
  }
  const tier = Math.floor(exp / 3)
  if (tier < NAMES.length) {
    const scaled = value / 10 ** (tier * 3)
    // Two-letter late suffixes get a thin space: in the mono face "8.14Oct" reads as "8.140ct".
    const gap = tier >= 5 ? '\u2009' : ''
    return `${scaled.toFixed(digits)}${gap}${NAMES[tier]}`
  }
  return value.toExponential(digits)
}

const LONG_NAMES = [
  '',
  'thousand',
  'million',
  'billion',
  'trillion',
  'quadrillion',
  'quintillion',
  'sextillion',
  'septillion',
  'octillion',
  'nonillion',
  'decillion',
]

/** "949.27 octillion": the spoken name of a big number, for tooltips next to the short suffix. */
export function longNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const abs = Math.abs(value)
  if (abs < 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  const tier = Math.floor(Math.log10(abs) / 3)
  if (tier >= LONG_NAMES.length) return value.toExponential(2)
  return `${(value / 10 ** (tier * 3)).toFixed(2)} ${LONG_NAMES[tier]}`
}

/** `$12.50` under 1k; named suffixes above. For sim gate reasons and UI. */
export function cashLabel(n: number): string {
  if (!Number.isFinite(n)) return '$0.00'
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs < 1000) return `${sign}$${abs.toFixed(2)}`
  return `${sign}$${formatBN(abs, 'named', 2)}`
}

/** Legacy save helper — old payloads stored `{ __bn: "…" }`; now plain numbers. */
export function D(n: number | string = 0): number {
  if (typeof n === 'number') return Number.isFinite(n) ? n : 0
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}

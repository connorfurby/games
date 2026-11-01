import Decimal from 'break_eternity.js'

export type BN = Decimal

export const D = (n: number | string | Decimal = 0): Decimal => new Decimal(n)

export function bnAdd(a: Decimal, b: number | Decimal): Decimal {
  return a.add(b)
}

export function bnSub(a: Decimal, b: number | Decimal): Decimal {
  return Decimal.max(0, a.sub(b))
}

export function bnMul(a: Decimal, b: number | Decimal): Decimal {
  return a.mul(b)
}

export function bnGte(a: Decimal, b: number | Decimal): boolean {
  return a.gte(b)
}

export function bnGt(a: Decimal, b: number | Decimal): boolean {
  return a.gt(b)
}

export function bnLte(a: Decimal, b: number | Decimal): boolean {
  return a.lte(b)
}

export function bnMax(a: Decimal, b: number | Decimal): Decimal {
  return Decimal.max(a, b)
}

export function bnMin(a: Decimal, b: number | Decimal): Decimal {
  return Decimal.min(a, b)
}

export function bnIsFinite(a: Decimal): boolean {
  return a.isFinite() && !a.isNan()
}

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

export function formatBN(value: Decimal | number, format: NumberFormat = 'named', digits = 2): string {
  const d = value instanceof Decimal ? value : D(value)
  if (!d.isFinite() || d.isNan()) return '0'
  if (d.abs().lt(1000) && d.e < 3) {
    const n = d.toNumber()
    if (Math.abs(n) < 10) return n.toFixed(Math.min(digits, 2))
    if (Math.abs(n) < 100) return n.toFixed(1)
    return Math.floor(n).toLocaleString()
  }
  if (format === 'full') {
    try {
      return d.toFixed(0)
    } catch {
      return d.toString()
    }
  }
  if (format === 'scientific') {
    return d.toExponential(digits)
  }
  if (format === 'engineering') {
    // Exponent forced to a multiple of 3 (SI-style engineering notation).
    const e = d.e
    const eng = Math.floor(e / 3) * 3
    const mant = d.div(D(10).pow(eng))
    return `${mant.toFixed(digits)}e${eng}`
  }
  const exp = d.e
  const tier = Math.floor(exp / 3)
  if (tier < NAMES.length) {
    const scaled = d.div(D(10).pow(tier * 3))
    return `${scaled.toFixed(digits)}${NAMES[tier]}`
  }
  return d.toExponential(digits)
}

export function serializeBN(d: Decimal): string {
  return d.toString()
}

export function deserializeBN(s: string | number | undefined | null): Decimal {
  if (s === undefined || s === null) return D(0)
  try {
    return D(s)
  } catch {
    return D(0)
  }
}

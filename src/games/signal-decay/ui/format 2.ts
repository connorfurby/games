export function money(n: number): string {
  if (!Number.isFinite(n)) return '$0'
  const abs = Math.abs(n)
  if (abs < 1000) return `$${n.toFixed(n < 10 ? 1 : 0)}`
  if (abs < 1e6) return `$${(n / 1e3).toFixed(1)}k`
  if (abs < 1e9) return `$${(n / 1e6).toFixed(2)}M`
  return `$${(n / 1e9).toFixed(2)}B`
}

export function qty(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) < 1000) return n.toFixed(digits)
  if (Math.abs(n) < 1e6) return `${(n / 1e3).toFixed(1)}k`
  return `${(n / 1e6).toFixed(2)}M`
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

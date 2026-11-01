import { formatBN, type NumberFormat } from '@/shared/bn'

export function money(n: number, fmt: NumberFormat = 'named'): string {
  if (!Number.isFinite(n)) return '$0'
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs < 1000) return `${sign}$${abs.toFixed(abs < 10 ? 2 : abs < 100 ? 1 : 0)}`
  return `${sign}$${formatBN(abs, fmt, 2)}`
}

export function qty(n: number, fmt: NumberFormat = 'named'): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) < 1000) return Math.floor(n).toLocaleString()
  return formatBN(n, fmt, 2)
}

export function rate(n: number): string {
  if (!Number.isFinite(n) || Math.abs(n) < 0.0005) return '0/s'
  if (Math.abs(n) < 0.1) return `${n.toFixed(3)}/s`
  if (Math.abs(n) < 10) return `${n.toFixed(2)}/s`
  return `${n.toFixed(1)}/s`
}

export function pct(n: number): string {
  if (!Number.isFinite(n)) return '0%'
  return `${Math.round(n * 100)}%`
}

export function clock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0s'
  if (sec < 60) return `${Math.floor(sec)}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}h ${m}m`
}

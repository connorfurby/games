import { describe, expect, it } from 'vitest'
import { cashLabel, formatBN, longNumber } from './bn'

describe('formatBN / cashLabel', () => {
  it('formats small cash with two decimals', () => {
    expect(cashLabel(12.5)).toBe('$12.50')
    expect(cashLabel(0)).toBe('$0.00')
    expect(cashLabel(-3.1)).toBe('-$3.10')
  })

  it('uses named suffixes for thousands and millions', () => {
    expect(cashLabel(1500)).toBe('$1.50K')
    expect(cashLabel(2_500_000)).toBe('$2.50M')
    expect(formatBN(1500, 'named', 2)).toBe('1.50K')
    expect(formatBN(2_500_000, 'named', 2)).toBe('2.50M')
  })

  it('puts a thin space before late two-letter suffixes', () => {
    // 1e15 → 1.00 Qa (tier 5)
    expect(formatBN(1e15, 'named', 2)).toBe(`1.00\u2009Qa`)
  })

  it('handles under-1000 display rules', () => {
    expect(formatBN(3.456, 'named', 2)).toBe('3.46')
    expect(formatBN(42.67, 'named', 2)).toBe('42.7')
    expect(formatBN(420.9, 'named', 2)).toBe((420).toLocaleString())
  })

  it('speaks long tooltips', () => {
    expect(longNumber(1500)).toBe('1.50 thousand')
    expect(longNumber(12.5)).toMatch(/12/)
  })
})

import { describe, expect, it } from 'vitest'
import { shortFigure } from '../format'

describe('shortFigure', () => {
  it('keeps three significant digits, and cents under $100', () => {
    expect(shortFigure('$103.89K')).toBe('$103K')
    expect(shortFigure('$46.76K')).toBe('$46.7K')
    expect(shortFigure('$3.11K')).toBe('$3.11K')
    expect(shortFigure('$40.95')).toBe('$40.95')
    expect(shortFigure('$512.40')).toBe('$512')
    expect(shortFigure('603')).toBe('603')
    expect(shortFigure('1,204')).toBe('1,204')
    expect(shortFigure('2.84 Qi')).toBe('2.84 Qi')
    expect(shortFigure('-$12.50')).toBe('-$12.50')
  })
})

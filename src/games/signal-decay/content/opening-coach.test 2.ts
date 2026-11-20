import { describe, expect, it } from 'vitest'
import { OPENING_TOUR, TOURS } from './tutorials'

describe('opening coach tour', () => {
  it('covers Sweep → Hold → Log → Air → Crystal → Antenna → Next', () => {
    const ids = OPENING_TOUR.map((s) => s.id)
    expect(ids).toEqual([
      'open-shack',
      'sweep',
      'hold',
      'log',
      'air',
      'crystal',
      'antenna',
      'next',
    ])
  })

  it('keeps the named tour shelf dense (≥40) beside the opening tour', () => {
    expect(OPENING_TOUR.length).toBe(8)
    expect(Object.keys(TOURS).length).toBeGreaterThanOrEqual(40)
  })

  it('soft-pauses only on act steps', () => {
    for (const step of OPENING_TOUR) {
      if (step.kind === 'act') expect(step.done).toBeTruthy()
      if (step.kind === 'say') expect(step.done).toBeUndefined()
    }
  })

  it('spotlights coach targets for mid-tour acts', () => {
    const withTarget = OPENING_TOUR.filter((s) => s.target)
    expect(withTarget.length).toBeGreaterThanOrEqual(5)
  })
})

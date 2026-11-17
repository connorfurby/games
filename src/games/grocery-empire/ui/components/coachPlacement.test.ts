import { describe, expect, it } from 'vitest'
import { coachCardPlacement } from './coachPlacement'

describe('coachCardPlacement', () => {
  const cardW = 360
  const cardH = 200
  const vw = 390
  const vh = 844

  it('docks above a VerbTray hole in the bottom half', () => {
    const hole = { top: 720, left: 40, width: 120, height: 48 }
    const box = coachCardPlacement(hole, vh, vw, cardW, cardH)
    expect(box.place).toBe('above')
    expect(box.top + cardH).toBeLessThanOrEqual(hole.top - 12 + 1)
    expect(box.left).toBeGreaterThanOrEqual(8)
    expect(box.left + cardW).toBeLessThanOrEqual(vw - 8)
  })

  it('docks below a HUD hole near the top', () => {
    const hole = { top: 12, left: 20, width: 100, height: 36 }
    const box = coachCardPlacement(hole, vh, vw, cardW, cardH)
    expect(box.place).toBe('below')
    expect(box.top).toBeGreaterThanOrEqual(hole.top + hole.height + 12 - 1)
  })
})

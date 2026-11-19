import { describe, expect, it } from 'vitest'
import { can, run } from '../sim/commands'
import { createInitialState } from '../sim/state'
import { CHAPTERS } from './story'
import { nextTour, TOURS } from './tutorials'
import { upgradeTree } from './upgradeTree'

describe('trees and chapters', () => {
  it('draws a path on the antenna tree and still lets a later rank be bought', () => {
    const s = createInitialState(1, 0)
    s.era = 5
    s.cash = 1e9
    const { nodes, tiers } = upgradeTree('antenna', s)
    const carriers = nodes.filter((n) => n.stat === 'carrier')
    expect(carriers[0]?.requires).toEqual([])
    expect(carriers[1]?.requires[0]?.id).toBe(carriers[0]?.id)
    expect(carriers[1]?.id).toBeTruthy()
    expect(tiers[0]?.note).toBe('open')
    expect(can(s, { type: 'buyUpgrade', id: 'bird-pass' }).ok).toBe(true)
  })

  it('hides ranks the era has not reached', () => {
    const s = createInitialState(1, 0)
    const { nodes } = upgradeTree('antenna', s)
    expect(nodes.find((n) => n.id === 'crystal-gain')?.state).not.toBe('unknown')
    expect(nodes.find((n) => n.id === 'bird-pass')?.hidden).toBe(true)
  })

  it('accepts the chapter in place and keeps it across a retune', () => {
    const s = createInitialState(1, 0)
    expect(s.chapterSeen).toBe(-1)
    expect(run(s, { type: 'acceptChapter' }).ok).toBe(true)
    expect(s.chapterSeen).toBe(0)
    s.era = 3
    s.chapterSeen = 3
    expect(run(s, { type: 'retune' }).ok).toBe(true)
    expect(s.era).toBe(0)
    expect(s.chapterSeen).toBe(3)
  })

  it('offers the current era tour before an older one', () => {
    expect(CHAPTERS.map((c) => c.era)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    const older = Object.values(TOURS).filter((t) => t.era < 7).map((t) => t.id)
    expect(nextTour(7, older)?.era).toBe(7)
    expect(TOURS['tour-last']?.era).toBe(12)
  })
})

// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { SNAP_EVERY_MS, SNAP_KEEP, clearGameSave, listSnapshots, readSnapshot, snapshotGame } from './save'

describe('automatic backups', () => {
  beforeEach(() => localStorage.clear())

  it('takes one per interval, keeps the newest few, and reads them back', () => {
    const t0 = 1_000_000
    expect(snapshotGame('g', { n: 1 }, 'one', t0)).toBe(true)
    expect(snapshotGame('g', { n: 2 }, 'two', t0 + 1000)).toBe(false)
    for (let i = 1; i <= SNAP_KEEP + 1; i++) snapshotGame('g', { n: 10 + i }, `s${i}`, t0 + i * SNAP_EVERY_MS)
    const list = listSnapshots('g')
    expect(list).toHaveLength(SNAP_KEEP)
    expect(list[0]!.label).toBe(`s${SNAP_KEEP + 1}`)
    expect(readSnapshot<{ n: number }>('g', 0)?.n).toBe(10 + SNAP_KEEP + 1)
    clearGameSave('g')
    expect(listSnapshots('g')).toHaveLength(0)
  })

  it('force takes one even inside the interval', () => {
    snapshotGame('g', { n: 1 }, 'a', 5)
    expect(snapshotGame('g', { n: 2 }, 'b', 6, true)).toBe(true)
    expect(listSnapshots('g')[0]!.label).toBe('b')
  })
})

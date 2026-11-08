/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { engine } from './engine'
import { PRIMARY_SAVE_ID, setActiveSaveId } from './saveKey'

describe('engine.newGame', () => {
  beforeEach(() => {
    setActiveSaveId(PRIMARY_SAVE_ID)
  })

  afterEach(() => {
    setActiveSaveId(PRIMARY_SAVE_ID)
    engine.newGame(1)
  })

  it('replaces in-memory state so Play cannot keep the previous run', () => {
    engine.newGame(11)
    const s = engine.getState()
    s.baskets = 12_345
    s.cash = 999
    s.era = 2
    engine.notify()

    expect(engine.getState().baskets).toBe(12_345)

    engine.newGame(77)

    const live = engine.getState()
    expect(live.baskets).toBe(0)
    expect(live.era).toBe(0)
    expect(live.seed).toBe(77)
    expect(live.cash).toBeLessThan(100)

    // Disk should match the fresh run (or at least not keep 12345).
    const raw = localStorage.getItem('games.v1.grocery-empire')
    expect(raw).toBeTruthy()
    expect(raw).not.toContain('"baskets":12345')
    expect(raw).toContain('"seed":77')

    // Remount path: mutate memory, then reload from the wiped+rewritten disk.
    live.baskets = 50
    engine.reloadFromDisk()
    expect(engine.getState().baskets).toBe(0)
    expect(engine.getState().seed).toBe(77)
  })
})

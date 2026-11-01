import { describe, expect, it } from 'vitest'
import { CAPITAL } from './balance'
import { hasProgressOrRecovery } from './bots'
import { can, run } from './commands'
import { createInitialState } from './state'
import { ensureFlagshipStore, openStoreCost } from './systems/chain'
import { applyTick } from './tick'

function finite(...vals: number[]) {
  for (const v of vals) expect(Number.isFinite(v)).toBe(true)
}

describe('era 2 smoke (openStore + incorporate)', () => {
  it('forced cash/era: openStore then incorporate without softlock', () => {
    const s = createInitialState(42)
    s.era = 2
    s.cash = 100_000
    s.compute.unlocked = true
    s.compute.reputation = CAPITAL.incorporateRep + 4
    s.expansions['side-yard'] = true
    s.menus.land = true
    s.menus.books = true
    ensureFlagshipStore(s)

    expect(s.stores.length).toBeGreaterThanOrEqual(1)
    expect(hasProgressOrRecovery(s)).toBe(true)

    const storeCost = openStoreCost(s)
    expect(storeCost).toBeGreaterThan(0)
    expect(can(s, { type: 'openStore' }).ok).toBe(true)
    expect(run(s, { type: 'openStore', name: 'Store 2' }).ok).toBe(true)
    expect(s.stores.length).toBeGreaterThanOrEqual(2)
    expect(s.stats.storesOpened).toBeGreaterThanOrEqual(1)

    expect(can(s, { type: 'incorporate' }).ok).toBe(true)
    expect(run(s, { type: 'incorporate' }).ok).toBe(true)
    expect(s.incorporated).toBe(true)
    expect(s.equity).toBeGreaterThan(0)
    expect(s.board.seats).toBeGreaterThan(0)

    for (let i = 0; i < 40; i++) applyTick(s, 1)

    finite(s.cash, s.equity, s.compute.attention, s.compute.reputation)
    expect(s.cash).toBeGreaterThanOrEqual(0)
    expect(hasProgressOrRecovery(s)).toBe(true)
    expect(s.stores.length).toBeGreaterThanOrEqual(2)
    expect(s.incorporated).toBe(true)
  })

  it('openStore blocked before Era 2; incorporate needs rep+cash', () => {
    const s = createInitialState(3)
    s.era = 1
    s.cash = 100_000
    ensureFlagshipStore(s)
    expect(can(s, { type: 'openStore' }).ok).toBe(false)
    expect(can(s, { type: 'incorporate' }).ok).toBe(false)

    s.era = 2
    s.compute.reputation = 0
    expect(can(s, { type: 'incorporate' }).ok).toBe(false)
    s.compute.reputation = CAPITAL.incorporateRep
    s.cash = CAPITAL.incorporateCash - 1
    expect(can(s, { type: 'incorporate' }).ok).toBe(false)
    s.cash = CAPITAL.incorporateCash
    expect(can(s, { type: 'incorporate' }).ok).toBe(true)
  })
})

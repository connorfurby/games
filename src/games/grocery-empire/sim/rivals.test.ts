import { describe, expect, it } from 'vitest'
import { can, run } from './commands'
import { createInitialState } from './state'
import { demandBreakdown } from './formulas'
import { networkMul } from './systems/network'
import { buyoutCost, priceWarCost, rivalDemandMul, tickRivals } from './systems/rivals'
import { migrate } from './migrate'
import { RIVAL_BY_ID } from '../content/rivals'

function era2() {
  const s = createInitialState(1)
  s.era = 2
  tickRivals(s)
  return s
}

describe('rival chains', () => {
  it('opens the era rival and nothing later', () => {
    const s = era2()
    expect(s.rivals.penny?.stores).toBe(RIVAL_BY_ID.penny.startStores)
    expect(s.rivals.freshway).toBeUndefined()
  })

  it('grows on its timer and cuts demand', () => {
    const s = era2()
    const before = rivalDemandMul(s)
    s.time = s.rivals.penny!.nextGrowAt + 1
    tickRivals(s)
    expect(s.rivals.penny!.stores).toBe(RIVAL_BY_ID.penny.startStores + 1)
    expect(rivalDemandMul(s)).toBeLessThan(before)
    expect(demandBreakdown(s).parts.rivals).toBeCloseTo(rivalDemandMul(s))
  })

  it('price war closes stores and freezes growth', () => {
    const s = era2()
    s.rivals.penny!.stores = 6
    s.cash = priceWarCost(s, 'penny')
    expect(can(s, { type: 'priceWar', id: 'penny' }).ok).toBe(true)
    run(s, { type: 'priceWar', id: 'penny' })
    expect(s.rivals.penny!.stores).toBe(4)
    expect(can(s, { type: 'priceWar', id: 'penny' }).ok).toBe(false)
    s.time += 300
    tickRivals(s)
    expect(s.rivals.penny!.stores).toBe(4)
  })

  it('buyout ends the demand cut and grows the network', () => {
    const s = era2()
    s.cash = buyoutCost(s, 'penny')
    const net = networkMul(s)
    run(s, { type: 'buyoutRival', id: 'penny' })
    expect(s.cash).toBe(0)
    expect(rivalDemandMul(s)).toBe(1)
    expect(networkMul(s)).toBeGreaterThan(net)
    expect(can(s, { type: 'buyoutRival', id: 'penny' }).ok).toBe(false)
  })

  it('survives a save round-trip', () => {
    const s = era2()
    s.rivals.penny!.wars = 2
    const back = migrate(JSON.parse(JSON.stringify(s)))
    expect(back.rivals.penny?.wars).toBe(2)
  })
})

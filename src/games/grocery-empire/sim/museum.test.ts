import { describe, expect, it } from 'vitest'
import { RELICS, WINGS, relicsInWing } from '../content/relics'
import { createInitialState } from './state'
import { buyChest, buyHint, earn, emptyMuseum, museumSync, openChest, partialName, relicCount } from './museum'
import { run } from './commands'
import { statMul } from './systems/stats'

function rng(seed: number) {
  let x = seed
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296
    return x / 4294967296
  }
}

describe('relic catalog', () => {
  it('has hundreds of unique relics, 25 per wing', () => {
    expect(RELICS.length).toBe(500)
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(RELICS.length)
    expect(new Set(RELICS.map((r) => r.name)).size).toBe(RELICS.length)
    for (const w of WINGS) expect(relicsInWing(w.id)).toHaveLength(25)
  })
})

describe('museum', () => {
  it('opens at Era 1 with a welcome, and pays each source once per run', () => {
    const m = emptyMuseum()
    const s = createInitialState(1)
    expect(earn(m, s, 0).chests).toHaveLength(0)
    s.era = 1
    const first = earn(m, s, 0)
    expect(first.unlockedNow).toBe(true)
    expect(first.chests.length).toBeGreaterThanOrEqual(2)
    const again = earn(m, s, 0)
    expect(again.chests).toHaveLength(0)
  })

  it('drips a chest per stretch of play', () => {
    const m = emptyMuseum()
    const s = createInitialState(1)
    s.era = 1
    earn(m, s, 0)
    const n = m.chests.length
    for (let i = 0; i < 49; i++) earn(m, s, 10)
    expect(m.chests.length).toBe(n + 1)
  })

  it('every chest relic is reachable: opening enough chests fills the chest wings', () => {
    const m = emptyMuseum()
    m.unlocked = true
    m.maxEra = 6
    const r = rng(7)
    for (let i = 0; i < 7000; i++) {
      m.chests.push({ id: `x${i}`, rarity: (['common', 'rare', 'epic', 'legendary', 'mythic'] as const)[i % 5]!, wing: null, source: 't', at: 0 })
      openChest(m, `x${i}`, r)
    }
    const chestRelics = RELICS.filter((x) => !x.feat)
    expect(chestRelics.every((x) => m.relics[x.id])).toBe(true)
  })

  it('duplicates turn into dust, which buys hints and chests', () => {
    const m = emptyMuseum()
    m.unlocked = true
    m.dust = 1000
    const target = RELICS.find((x) => x.rarity === 'rare' && !x.feat)!
    expect(buyHint(m, target.id)).toBe(true)
    expect(buyHint(m, target.id)).toBe(true)
    expect(m.hints[target.id]).toBe(2)
    expect(buyChest(m, 'epic', null)).not.toBeNull()
    expect(partialName('The First Dollar')).toBe('T__ F____ D_____')
  })

  it('feats award Oddities directly', () => {
    const m = emptyMuseum()
    const s = createInitialState(1)
    s.era = 1
    s.price = 50
    const res = earn(m, s, 0)
    expect(res.feats.map((f) => f.feat)).toContain('markup')
  })

  it('outlives the run: syncing feeds wing bonuses into a fresh state', () => {
    const m = emptyMuseum()
    for (const r of relicsInWing('corner')) m.relics[r.id] = { at: 0, n: 1 }
    const s = createInitialState(9)
    const before = statMul(s, 'demand')
    run(s, { type: 'syncRelics', ...museumSync(m) })
    expect(s.relics.count).toBe(relicCount(m))
    expect(s.relics.wings).toContain('corner')
    expect(statMul(s, 'demand')).toBeGreaterThan(before)
  })
})

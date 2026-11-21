import { describe, expect, it } from 'vitest'
import { DEPTH } from './balance'
import { can, run } from './commands'
import { migrate } from './migrate'
import { createInitialState, type GameState } from './state'
import { tickRegulars } from './systems/regulars'

/** Mae (tomatoes) in the primary spot, Otis (beans) waiting; shelf stocked with cans. */
function twoShoppers(): GameState {
  const s = createInitialState(11)
  s.shelf.push({ cat: 'cans', qty: 20, age: 0 })
  s.time = 100
  const r = s.depth.regulars
  r.activeId = 'mae'
  r.patienceUntil = s.time + 40
  r.layaway = true // never auto-serves
  r.waitingId = 'otis'
  r.waitingPatienceUntil = s.time + 90
  r.waitingLayaway = true
  r.arrivesAt = s.time + 500
  return s
}

describe('two regulars at once (SAVE 31)', () => {
  it('serving the primary promotes the waiting shopper with remaining patience', () => {
    const s = twoShoppers()
    run(s, { type: 'setFacing', cat: 'cans', facingId: 'tomatoes' })
    const before = s.depth.regularSatisfied
    expect(run(s, { type: 'serveRegular' }).ok).toBe(true)
    const r = s.depth.regulars
    expect(s.depth.regularSatisfied).toBe(before + 1)
    expect(r.activeId).toBe('otis')
    expect(r.patienceUntil).toBe(190)
    expect(r.layaway).toBe(true)
    expect(r.waitingId).toBeNull()
    expect(r.waitingPatienceUntil).toBe(0)
    // Otis wants beans. Serving while tomatoes are featured must not look successful.
    const blocked = can(s, { type: 'serveRegular' })
    expect(blocked.ok).toBe(false)
    expect(blocked.reason).toMatch(/Beans/)
    expect(run(s, { type: 'serveRegular' }).ok).toBe(false)
    expect(s.depth.regularSatisfied).toBe(before + 1)
  })

  it('serving the last shopper clears both slots', () => {
    const s = twoShoppers()
    run(s, { type: 'setFacing', cat: 'cans', facingId: 'tomatoes' })
    run(s, { type: 'serveRegular' })
    run(s, { type: 'setFacing', cat: 'cans', facingId: 'beans' })
    const before = s.depth.regularSatisfied
    run(s, { type: 'serveRegular' })
    const r = s.depth.regulars
    expect(s.depth.regularSatisfied).toBe(before + 1)
    expect(r.activeId).toBeNull()
    expect(r.waitingId).toBeNull()
  })

  it('focusRegular swaps who Serve targets', () => {
    const s = twoShoppers()
    run(s, { type: 'setFacing', cat: 'cans', facingId: 'beans' })
    expect(run(s, { type: 'focusRegular', which: 'waiting' }).ok).toBe(true)
    const r = s.depth.regulars
    expect(r.activeId).toBe('otis')
    expect(r.waitingId).toBe('mae')
    expect(r.patienceUntil).toBe(190)
    expect(r.waitingPatienceUntil).toBe(140)
    const before = s.depth.regularSatisfied
    run(s, { type: 'serveRegular' })
    expect(s.depth.regularSatisfied).toBe(before + 1)
    expect(r.activeId).toBe('mae')
    expect(r.waitingId).toBeNull()
  })

  it('focusRegular needs someone waiting', () => {
    const s = twoShoppers()
    s.depth.regulars.waitingId = null
    expect(can(s, { type: 'focusRegular', which: 'waiting' }).ok).toBe(false)
  })

  it('an impatient waiting shopper costs a star without touching the primary', () => {
    const s = twoShoppers()
    const stars = s.depth.stars
    s.time = 100 + 91 // past Otis, but Mae also expired? keep Mae alive
    s.depth.regulars.patienceUntil = s.time + 40
    tickRegulars(s, 1)
    const r = s.depth.regulars
    expect(r.waitingId).toBeNull()
    expect(r.activeId).toBe('mae')
    expect(s.depth.stars).toBeLessThan(stars)
    expect(r.seen.otis).toBe(1)
  })

  it('a second arrival walks in once the visit gap passes', () => {
    const s = twoShoppers()
    const r = s.depth.regulars
    r.waitingId = null
    r.waitingPatienceUntil = 0
    r.patienceUntil = s.time + 500
    r.arrivesAt = s.time
    tickRegulars(s, 1)
    expect(r.activeId).toBe('mae')
    expect(r.waitingId).not.toBeNull()
    expect(r.waitingId).not.toBe('mae')
    expect(r.waitingPatienceUntil).toBe(s.time + DEPTH.regularPatienceSec)
    expect(r.arrivesAt).toBe(s.time + DEPTH.regularVisitGapSec)
  })

  it('after the layaway lesson, matching visits clear on their own', () => {
    const s = createInitialState(13)
    s.shelf.push({ cat: 'cans', qty: 20, age: 0 })
    s.depth.layawaySlips = DEPTH.layawaySlipNeed
    s.depth.facings.cans = 'tomatoes'
    s.time = 200
    const r = s.depth.regulars
    r.activeId = 'mae'
    r.patienceUntil = s.time + 40
    r.layaway = true // leftover flag from earlier visits
    r.arrivesAt = s.time + 500
    const before = s.depth.regularSatisfied
    tickRegulars(s, 1)
    expect(s.depth.regularSatisfied).toBe(before + 1)
    expect(r.activeId).toBeNull()
  })

  it('migrate keeps waiting, defaults old saves, and drops orphans', () => {
    const s = twoShoppers()
    const m = migrate(JSON.parse(JSON.stringify(s)))
    expect(m.depth.regulars.waitingId).toBe('otis')
    expect(m.depth.regulars.waitingPatienceUntil).toBe(190)

    const old = JSON.parse(JSON.stringify(s)) as { depth: { regulars: Record<string, unknown> } }
    delete old.depth.regulars.waitingId
    delete old.depth.regulars.waitingPatienceUntil
    delete old.depth.regulars.waitingLayaway
    const m2 = migrate(old)
    expect(m2.depth.regulars.waitingId).toBeNull()
    expect(m2.depth.regulars.activeId).toBe('mae')

    const orphan = JSON.parse(JSON.stringify(s)) as { depth: { regulars: Record<string, unknown> } }
    orphan.depth.regulars.activeId = null
    expect(migrate(orphan).depth.regulars.waitingId).toBeNull()
  })
})

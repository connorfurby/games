import { describe, expect, it } from 'vitest'
import { MEMO_BY_ID } from '../content/memos'
import { CAPITAL, SAVE_VERSION } from './balance'
import { agingMul, batchSpoilFrac, categoryWeights, demandBreakdown, lifeMul } from './formulas'
import { tickCapital } from './systems/capital'
import { tickEvents } from './systems/events'
import { tickLogistics } from './systems/fleet'
import { migrate } from './migrate'
import { createInitialState } from './state'
import { canResolveBoard, canReleaseAutonomous, resolveBoardMeeting } from './systems/capital'
import { chainDemandMul, chainShrinkMul, walkStore } from './systems/chain'
import { run } from './commands'

describe('Grocery Empire 2.0 smoke', () => {
  it('Brand feeds demandBreakdown', () => {
    const low = createInitialState()
    low.brand = 0.7
    const high = createInitialState()
    high.brand = 1
    expect(demandBreakdown(high).parts.brand).toBeGreaterThan(demandBreakdown(low).parts.brand)
  })

  it('chainShrinkMul does not collapse with more even stores', () => {
    const a = createInitialState()
    a.era = 2
    a.stores = [
      { id: 's1', name: 'A', level: 1, xp: 0, policy: 'standard', attentionShare: 0.5, drift: 0 },
      { id: 's2', name: 'B', level: 1, xp: 0, policy: 'standard', attentionShare: 0.5, drift: 0 },
    ]
    const b = createInitialState()
    b.era = 2
    b.stores = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      name: `S${i}`,
      level: 1,
      xp: 0,
      policy: 'standard' as const,
      attentionShare: 1 / 6,
      drift: 0,
    }))
    expect(chainShrinkMul(b)).toBeGreaterThanOrEqual(chainShrinkMul(a) * 0.85)
  })

  it('depot softcap: 5 stores without depot underperform with depot', () => {
    const bare = createInitialState()
    bare.era = 2
    bare.depot = false
    bare.stores = Array.from({ length: 5 }, (_, i) => ({
      id: `s${i}`,
      name: `S${i}`,
      level: 1,
      xp: 0,
      policy: 'standard' as const,
      attentionShare: 0.2,
      drift: 0,
    }))
    const dep = { ...bare, depot: true, stores: bare.stores.map((st) => ({ ...st })) }
    expect(chainDemandMul(dep)).toBeGreaterThan(chainDemandMul(bare))
  })

  it('board Expand requires meeting due and sets expandDiscount', () => {
    const s = createInitialState()
    s.era = 2
    s.incorporated = true
    s.board.nextMeetingAt = 10
    s.board.lastResolvedAt = 0
    s.time = 5
    expect(canResolveBoard(s)).toMatch(/due/i)
    s.time = 15
    expect(canResolveBoard(s)).toBeNull()
    resolveBoardMeeting(s, 'expand')
    expect(s.board.expandDiscount).toBe(0.9)
    expect(s.stats.boardMeetings).toBe(1)
  })

  it('walkStore clears drift', () => {
    const s = createInitialState()
    s.era = 2
    s.compute.unlocked = true
    s.compute.attention = 100
    s.stores = [
      { id: 's1', name: 'Flagship', level: 1, xp: 0, policy: 'standard', attentionShare: 1, drift: 0.8 },
    ]
    expect(walkStore(s, 's1')).toBeNull()
    expect(s.stores[0]!.drift).toBe(0)
  })

  it('ghost doctrine memos are gone; Autonomous gate uses reachable repSpent', () => {
    expect(MEMO_BY_ID['doctrine-fifo-first']).toBeUndefined()
    expect(CAPITAL.autonomousRepSpentNeed).toBeLessThanOrEqual(25)
    const s = createInitialState()
    s.era = 2
    s.depot = true
    s.read = 50
    s.repSpent = CAPITAL.autonomousRepSpentNeed
    s.memos['autonomous-brief'] = 1
    expect(canReleaseAutonomous(s)).toBeNull()
  })

  it('SAVE_VERSION is 5 and migrate sets it', () => {
    expect(SAVE_VERSION).toBe(6)
    const m = migrate({ version: 3, cash: 10, baskets: 1 })
    expect(m.version).toBe(SAVE_VERSION)
    expect(m.board.expandDiscount).toBeDefined()
  })

  it('Brand 0.7 vs 1.0 changes demandBreakdown.parts.brand', () => {
    const a = createInitialState()
    a.brand = 0.7
    const b = createInitialState()
    b.brand = 1
    expect(demandBreakdown(a).parts.brand).not.toBe(demandBreakdown(b).parts.brand)
    expect(demandBreakdown(a).parts.brand).toBeLessThan(demandBreakdown(b).parts.brand)
  })

  it('chainShrinkMul does not fall as equal stores are added', () => {
    const make = (n: number) => {
      const s = createInitialState()
      s.era = 2
      s.stores = Array.from({ length: n }, (_, i) => ({
        id: `s${i}`,
        name: `S${i}`,
        level: 1,
        xp: 0,
        policy: 'standard' as const,
        attentionShare: 1 / n,
        drift: 0,
      }))
      return chainShrinkMul(s)
    }
    let prev = make(1)
    for (let n = 2; n <= 8; n++) {
      const cur = make(n)
      expect(cur).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = cur
    }
  })

  it('Board resolve is blocked until the meeting is due', () => {
    const s = createInitialState()
    s.era = 2
    s.incorporated = true
    s.board.nextMeetingAt = 100
    s.board.lastResolvedAt = 0
    s.time = 10
    expect(canResolveBoard(s)).not.toBeNull()
    resolveBoardMeeting(s, 'expand')
    expect(s.board.expandDiscount).toBe(1)
    expect(s.stats.boardMeetings).toBe(0)
  })

  it('no ghost doctrine-* memos grant Read (only doctrine-room remains)', () => {
    const ghosts = Object.keys(MEMO_BY_ID).filter((id) => id.startsWith('doctrine-') && id !== 'doctrine-room')
    expect(ghosts).toEqual([])
  })

  it('Autonomous gate uses ~18 repSpent', () => {
    expect(CAPITAL.autonomousRepSpentNeed).toBe(18)
    const s = createInitialState()
    s.era = 2
    s.depot = true
    s.read = 50
    s.memos['autonomous-brief'] = 1
    s.repSpent = 17
    expect(canReleaseAutonomous(s)).toMatch(/Reputation spent/)
    s.repSpent = 18
    expect(canReleaseAutonomous(s)).toBeNull()
  })

  it('Depot at 5 stores: chainDemandMul(no depot) < chainDemandMul(depot)', () => {
    const s = createInitialState()
    s.era = 2
    s.stores = Array.from({ length: 5 }, (_, i) => ({
      id: `s${i}`,
      name: `S${i}`,
      level: 1,
      xp: 0,
      policy: 'standard' as const,
      attentionShare: 0.2,
      drift: 0,
    }))
    s.depot = false
    const bare = chainDemandMul(s)
    s.depot = true
    expect(bare).toBeLessThan(chainDemandMul(s))
  })

  it('Space sealant lowers lane fuel burn', () => {
    const burn = (rank: number) => {
      const s = createInitialState()
      s.era = 4
      s.fleet.lanes = 2
      s.fuel = 100
      s.cash = 0
      s.upgrades['sealant'] = rank
      tickLogistics(s, 10)
      return 100 - s.fuel
    }
    expect(burn(5)).toBeLessThan(burn(0))
  })

  it('migrate v3→v4 keeps store.drift and board.expandDiscount', () => {
    const src = createInitialState()
    src.era = 2
    src.stores = [
      { id: 's1', name: 'Flagship', level: 1, xp: 0, policy: 'standard', attentionShare: 1, drift: 0.4 },
    ]
    src.board.expandDiscount = 0.9
    const raw = JSON.parse(JSON.stringify(src))
    raw.version = 3
    const m = migrate(raw)
    expect(m.version).toBe(SAVE_VERSION)
    expect(m.stores[0]!.drift).toBeCloseTo(0.4, 5)
    expect(m.board.expandDiscount).toBeCloseTo(0.9, 5)
  })

  it('cold ↔ aisle: healthy line stretches life; brownout ages faster and softens dairy/meat', () => {
    const base = createInitialState()
    base.era = 3
    base.categories.dairy = true
    base.categories.meat = true
    const plain = lifeMul(base, 'dairy')
    const plainAge = agingMul(base, 'shelf', 'dairy')
    const plainW = categoryWeights(base).dairy!

    const healthy = createInitialState()
    healthy.era = 3
    healthy.categories.dairy = true
    healthy.categories.meat = true
    healthy.cold.plants = 1
    healthy.cold.freshness = 1
    healthy.cold.momentumOn = true
    healthy.cold.momentum = 2
    expect(lifeMul(healthy, 'dairy')).toBeGreaterThan(plain)
    expect(categoryWeights(healthy).dairy!).toBeGreaterThan(plainW)

    const brown = createInitialState()
    brown.era = 3
    brown.categories.dairy = true
    brown.categories.meat = true
    brown.cold.plants = 1
    brown.cold.browned = true
    brown.cold.freshness = 0.25
    expect(agingMul(brown, 'shelf', 'dairy')).toBeGreaterThan(plainAge)
    expect(categoryWeights(brown).dairy!).toBeLessThan(plainW)
  })

  it('Accept soft-resets Era 0–1 teaching without wiping perks or later tutorials', () => {
    const s = createInitialState(5)
    s.era = 6
    s.fleet.biomass = 0
    s.fleet.launched = true
    s.empire.perks['known-door'] = 2
    s.tutorials.done['unpack'] = true
    s.tutorials.done['staff'] = true
    s.tutorials.done['e2-depot'] = true
    expect(run(s, { type: 'acceptEnding' }).ok).toBe(true)
    expect(s.tutorials.done['unpack']).toBeUndefined()
    expect(s.tutorials.done['staff']).toBeUndefined()
    expect(s.tutorials.done['e2-depot']).toBe(true)
    expect(s.empire.perks['known-door']).toBe(2)
    expect(run(s, { type: 'confirmHungryLaws', mutators: ['richerYield'] }).ok).toBe(true)
    expect(s.prestigeCarry.mutators).toEqual(['richerYield'])
  })

  it('cold momentum stretches perishable life; low freshness ramps toward the brownout cut; batchSpoilFrac follows', () => {
    const mk = (fresh: number, mom: number, on: boolean, browned = false) => {
      const s = createInitialState()
      s.era = 3
      s.categories.dairy = true
      s.cold.plants = 1
      s.cold.freshness = fresh
      s.cold.momentum = mom
      s.cold.momentumOn = on
      s.cold.browned = browned
      return s
    }
    const healthy = mk(1, 1, false)
    const rolling = mk(1.2, 2.5, true)
    const sagging = mk(0.6, 1, false)
    const brown = mk(0.25, 1, false, true)
    expect(lifeMul(rolling, 'dairy')).toBeGreaterThan(lifeMul(healthy, 'dairy'))
    expect(lifeMul(rolling, 'dairy')).toBeLessThan(1.25)
    expect(lifeMul(sagging, 'dairy')).toBeLessThan(1)
    expect(lifeMul(brown, 'dairy')).toBeLessThan(lifeMul(sagging, 'dairy'))
    expect(lifeMul(rolling, 'cans')).toBe(lifeMul(createInitialState(), 'cans'))
    const batch = { cat: 'dairy' as const, age: 100 }
    expect(batchSpoilFrac(brown, batch)).toBeGreaterThan(batchSpoilFrac(rolling, batch))
  })

  it('Accept also clears early tips and spoken lines but keeps later ones', () => {
    const s = createInitialState(5)
    s.era = 6
    s.fleet.biomass = 0
    s.fleet.launched = true
    s.tipsSeen['first-unpack'] = true
    s.tipsSeen['e2-depot'] = true
    s.seenLines['open-shelf'] = true
    s.seenLines['first-sale'] = true
    s.seenLines['depot-online'] = true
    s.dialogueQueue = ['first-hire', 'depot-online']
    expect(run(s, { type: 'acceptEnding' }).ok).toBe(true)
    expect(s.tipsSeen['first-unpack']).toBeUndefined()
    expect(s.tipsSeen['e2-depot']).toBe(true)
    expect(s.seenLines['open-shelf']).toBeUndefined()
    expect(s.seenLines['first-sale']).toBeUndefined()
    expect(s.seenLines['depot-online']).toBe(true)
    expect(s.dialogueQueue).toEqual(['depot-online'])
  })

  it('autonomous habit gates behaviors and migrate defaults to balanced', () => {
    const mk = (habit: 'price' | 'attention' | 'collect' | 'balanced') => {
      const s = createInitialState()
      s.era = 2
      s.autonomous = true
      s.autonomousHabit = habit
      s.price = 5
      s.stores = [
        { id: 's1', name: 'A', level: 1, xp: 0, policy: 'standard', attentionShare: 0.9, drift: 0 },
        { id: 's2', name: 'B', level: 1, xp: 0, policy: 'standard', attentionShare: 0.1, drift: 0 },
      ]
      s.ventures = { cart: { stored: 50, lifetime: 0 } } as never
      s.time = 20
      tickCapital(s, 1)
      return s
    }
    const att = mk('attention')
    expect(att.stores[0]!.attentionShare).toBeCloseTo(0.5)
    expect(att.price).toBe(5)
    const col = mk('collect')
    expect(col.stores[0]!.attentionShare).toBeCloseTo(0.9)
    expect((col.ventures as never as Record<string, { stored: number }>).cart!.stored).toBe(0)
    const pr = mk('price')
    expect((pr.ventures as never as Record<string, { stored: number }>).cart!.stored).toBe(50)
    expect(migrate({ version: 3 }).autonomousHabit).toBe('balanced')
    expect(createInitialState().autonomousHabit).toBe('balanced')
  })

  it('franchise clone event only nicks Brand in Era 4+ with franchises', () => {
    const s = createInitialState(3)
    s.era = 3
    s.fleet.franchises = 5
    for (let i = 0; i < 3000; i++) {
      s.time += 1
      tickEvents(s, 1)
    }
    expect(s.acc.lastCloneAt ?? -1e9).toBeLessThan(0)

    s.era = 4
    s.brand = 1
    for (let i = 0; i < 6000 && (s.acc.lastCloneAt ?? -1e9) < 0; i++) {
      s.time += 1
      tickEvents(s, 1)
    }
    expect(s.acc.lastCloneAt ?? -1e9).toBeGreaterThan(0)
    expect(s.brand).toBeLessThan(1)
    expect(s.brand).toBeGreaterThan(0.5)
  })

  it('resolveBoard command path accepts agenda', () => {
    const s = createInitialState()
    s.era = 2
    s.incorporated = true
    s.equity = 5000
    s.board.nextMeetingAt = 1
    s.board.lastResolvedAt = 0
    s.time = 10
    const r = run(s, { type: 'resolveBoard', agenda: 'dividend' })
    expect(r.ok).toBe(true)
    expect(s.stats.boardMeetings).toBe(1)
  })
})

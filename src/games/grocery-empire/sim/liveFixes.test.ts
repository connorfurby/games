import { afterEach, describe, expect, it, vi } from 'vitest'
import { CAPITAL, DT, POLITICS } from './balance'
import { run } from './commands'
import { GroceryEngine } from './engine'
import { attentionCap } from './formulas'
import { beginTutorial } from './helpers'
import { createInitialState } from './state'
import { tickPolitics } from './systems/politics'
import { applyOffline, applyTick } from './tick'

describe('live cash and tours', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('applies playback speed once per pulse', () => {
    vi.useFakeTimers()
    const eng = new GroceryEngine(createInitialState(4))
    eng.dispatch({ type: 'setSpeed', speed: 4 })
    eng.start()
    vi.advanceTimersByTime(1000)
    eng.stop()
    // 10Hz * 1s * 4× = 4 sim seconds. The old double multiply landed near 16.
    expect(eng.getState().time).toBeGreaterThan(3.5)
    expect(eng.getState().time).toBeLessThan(4.5)
  })

  it('tracks net cash, not just shelf revenue minus rent', () => {
    const s = createInitialState(2)
    run(s, { type: 'unpack' })
    const before = s.cash
    for (let i = 0; i < 200; i++) applyTick(s, DT)
    const gained = s.cash - before
    expect(gained).not.toBe(0)
    expect(s.rates.cashPerSec).not.toBe(0)
    // Window is ~45s, so the displayed rate is diluted but the same sign as the till.
    expect(Math.sign(s.rates.cashPerSec)).toBe(Math.sign(gained))
  })

  it('does not simulate while paused, including offline catch-up', () => {
    const s = createInitialState(3)
    run(s, { type: 'unpack' })
    s.paused = true
    const time = s.time
    const cash = s.cash
    applyOffline(s, 120)
    expect(s.time).toBe(time)
    expect(s.cash).toBe(cash)
  })

  it('does not auto-close a menu tour just because the tab is unlocked', () => {
    const s = createInitialState(5)
    s.introSeen = true
    s.seenLines['open-unpack-only'] = true
    for (const id of ['unpack', 'baskets', 'price', 'wholesale', 'rent', 'meta-shelf']) {
      s.tutorials.done[id] = true
    }
    s.menus.staff = true
    applyTick(s, 1.1)
    expect(s.tutorials.active?.id).toBe('staff')
    expect(s.tutorials.active?.step).toBe(0)
    applyTick(s, 1.1)
    expect(s.tutorials.active?.id).toBe('staff')
    expect(s.tutorials.active?.step).toBe(0)
    run(s, { type: 'noteMenu', id: 'staff' })
    applyTick(s, 1.1)
    expect(s.tutorials.active?.step).toBe(1)
  })

  it('keeps a tour on screen when its flag was already true', () => {
    const s = createInitialState(6)
    s.categories.produce = true
    beginTutorial(s, 'categories')
    expect(s.tutorials.active?.baseline.ack).toBe(1)
    applyTick(s, 1.1)
    expect(s.tutorials.active?.id).toBe('categories')
    expect(s.tutorials.active?.step).toBe(0)
  })

  it('ignores a second complete for the same tour step', () => {
    const s = createInitialState(8)
    beginTutorial(s, 'staff')
    expect(run(s, { type: 'completeTutorialStep', id: 'staff', step: 0 }).ok).toBe(true)
    expect(s.tutorials.active?.step).toBe(1)
    expect(run(s, { type: 'completeTutorialStep', id: 'staff', step: 0 }).ok).toBe(true)
    expect(s.tutorials.active?.step).toBe(1)
  })

  it('leaves a full Attention bar alone while Ideas are on', () => {
    const s = createInitialState(9)
    s.era = 2
    s.introSeen = true
    s.compute.unlocked = true
    s.compute.ideasUnlocked = true
    s.compute.ideasOn = true
    s.compute.archives = 8
    s.compute.attention = attentionCap(s)
    s.upgrades['tourney-while-full'] = 1
    s.menus.strategy = true
    const ideas = s.compute.ideas
    for (let i = 0; i < 40; i++) applyTick(s, 0.1)
    expect(s.stats.tournamentsRun).toBe(0)
    expect(s.compute.ideas).toBeGreaterThan(ideas)
    expect(s.compute.attention).toBeGreaterThan(attentionCap(s) * 0.9)
  })

  it('auto-tournament fires once, then waits, when Ideas are off', () => {
    const s = createInitialState(10)
    s.era = 2
    s.introSeen = true
    s.compute.unlocked = true
    s.compute.ideasUnlocked = true
    s.compute.ideasOn = false
    s.compute.archives = 8
    s.compute.attention = attentionCap(s)
    s.upgrades['tourney-while-full'] = 1
    s.menus.strategy = true
    applyTick(s, 0.1)
    expect(s.stats.tournamentsRun).toBe(1)
    const spent = attentionCap(s) - s.compute.attention
    expect(spent).toBeGreaterThan(CAPITAL.tournamentAttention - 0.01)
    expect(spent).toBeLessThan(CAPITAL.tournamentAttention + 1)
    s.compute.attention = attentionCap(s)
    applyTick(s, 0.1)
    expect(s.stats.tournamentsRun).toBe(1)
  })

  it('one lobbyist gains political capital instead of leaking faster', () => {
    const s = createInitialState(11)
    s.era = 3
    s.memos['lobby-office'] = 1
    s.politics.lobby = 1
    s.politics.capital = 20
    tickPolitics(s, 10)
    const net = POLITICS.lobbyGainPerSec - POLITICS.leakPerSec
    expect(net).toBeGreaterThan(0)
    expect(s.politics.capital).toBeGreaterThan(20)
  })
})

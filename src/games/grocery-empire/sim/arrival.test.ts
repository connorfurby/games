import { describe, expect, it } from 'vitest'
import { SAVE_VERSION } from './balance'
import { can, run } from './commands'
import {
  acknowledgeArrival,
  ERA_OPENERS,
  settlePendingReveals,
  setEra,
  unlockMenu,
} from './helpers'
import { migrate } from './migrate'
import { createInitialState } from './state'
import { tickUnlocks } from './unlocks'

describe('smooth arrivals (SAVE 46)', () => {
  it('SAVE_VERSION is 46', () => {
    expect(SAVE_VERSION).toBe(46)
  })

  it('unlockMenu does not queue a spoken line per room', () => {
    const s = createInitialState(11)
    s.introSeen = true
    unlockMenu(s, 'cold')
    unlockMenu(s, 'politics')
    expect(s.menus.cold).toBe(true)
    expect(s.menus.politics).toBe(true)
    expect(s.pendingReveal).toEqual(['cold', 'politics'])
    expect(s.dialogueQueue.some((id) => id.startsWith('menu-'))).toBe(false)
    expect(s.revealedMenus.cold).toBe(false)
    expect(s.revealedMenus.politics).toBe(false)
  })

  it('a lone mid-run unlock may appear on the rail while the notice waits', () => {
    const s = createInitialState(12)
    s.introSeen = true
    unlockMenu(s, 'cold')
    settlePendingReveals(s)
    expect(s.pendingReveal).toEqual(['cold'])
    expect(s.revealedMenus.cold).toBe(true)
  })

  it('a chapter keeps the rail still until acknowledged', () => {
    const s = createInitialState(13)
    s.introSeen = true
    setEra(s, 2)
    unlockMenu(s, 'land')
    unlockMenu(s, 'strategy')
    settlePendingReveals(s)
    expect(s.chapterQueue).toEqual([2])
    expect(s.pendingReveal).toContain('land')
    expect(s.pendingReveal).toContain('strategy')
    expect(s.revealedMenus.land).toBe(false)
    expect(s.revealedMenus.strategy).toBe(false)
  })

  it('promoteTutorial does not start during chapterQueue or pendingReveal', () => {
    const s = createInitialState(14)
    s.introSeen = true
    s.tutorials.done.opening = true
    s.tutorials.queue = ['e2-second-store']
    s.tutorials.calmUntil = 0
    s.chapterQueue = [2]
    for (let i = 0; i < 3; i++) tickUnlocks(s, 1)
    expect(s.tutorials.active).toBeNull()

    s.chapterQueue = []
    s.pendingReveal = ['land']
    for (let i = 0; i < 3; i++) tickUnlocks(s, 1)
    expect(s.tutorials.active).toBeNull()
  })

  it('setEra queues only the one opener for that door', () => {
    const s = createInitialState(15)
    s.introSeen = true
    s.tutorials.done.opening = true
    setEra(s, 2)
    expect(s.tutorials.queue).toEqual(['e2-second-store'])
    expect(ERA_OPENERS[2]?.tour).toBe('e2-second-store')
  })

  it('acceptChapter reveals pending rooms and starts calm', () => {
    const s = createInitialState(16)
    s.introSeen = true
    s.time = 100
    setEra(s, 2)
    unlockMenu(s, 'land')
    unlockMenu(s, 'strategy')
    expect(can(s, { type: 'acceptChapter' }).ok).toBe(true)
    run(s, { type: 'acceptChapter' })
    expect(s.chapterQueue).toEqual([])
    expect(s.pendingReveal).toEqual([])
    expect(s.revealedMenus.land).toBe(true)
    expect(s.revealedMenus.strategy).toBe(true)
    expect(s.tutorials.calmUntil).toBe(110)
  })

  it('arriveShow reveals, clears calm, and starts the opener', () => {
    const s = createInitialState(17)
    s.introSeen = true
    s.tutorials.done.opening = true
    setEra(s, 2)
    unlockMenu(s, 'land')
    unlockMenu(s, 'strategy')
    run(s, { type: 'arriveShow' })
    expect(s.chapterQueue).toEqual([])
    expect(s.pendingReveal).toEqual([])
    expect(s.revealedMenus.land).toBe(true)
    expect(s.tutorials.calmUntil).toBe(0)
    expect(s.tutorials.active?.id).toBe('e2-second-store')
    expect(s.lastMenu).toBe('land')
  })

  it('acknowledgeArrival is idempotent', () => {
    const s = createInitialState(18)
    s.introSeen = true
    unlockMenu(s, 'cold')
    acknowledgeArrival(s)
    acknowledgeArrival(s)
    expect(s.pendingReveal).toEqual([])
    expect(s.revealedMenus.cold).toBe(true)
  })

  it('migrate copies menus into revealedMenus for older saves', () => {
    const raw = createInitialState(19) as unknown as Record<string, unknown>
    raw.version = 45
    raw.menus = { ...(raw.menus as object), cold: true, politics: true }
    delete raw.revealedMenus
    delete raw.pendingReveal
    const m = migrate(raw)
    expect(m.version).toBe(SAVE_VERSION)
    expect(m.revealedMenus.cold).toBe(true)
    expect(m.revealedMenus.politics).toBe(true)
    expect(m.pendingReveal).toEqual([])
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { __resetSaveStore, getRawSlot, replaceAllSlots, saveGame, serializeState } from '@/shared/save'
import { emptyMuseum, openChest, type MuseumSave } from '../../sim/museum'
import { museumStore } from './store'

function seededMuseum(): MuseumSave {
  const m = emptyMuseum()
  m.unlocked = true
  m.claims = { 'goal:test': 1, welcome: 1 }
  m.chests = [
    { id: 'c1', rarity: 'common', wing: null, source: 'Test', at: 1 },
    { id: 'c2', rarity: 'rare', wing: null, source: 'Test 2', at: 2 },
  ]
  m.opened = 3
  m.nextChestId = 10
  m.relics = { corner: { at: 1, n: 1, level: 1 } }
  return m
}

describe('museumStore cloud hydrate', () => {
  beforeEach(() => {
    __resetSaveStore()
    museumStore.invalidate()
  })

  it('reloads opened chests from the account Map after an early empty get()', () => {
    // Shelf-style poison: read before cloud data exists.
    expect(museumStore.get().chests).toHaveLength(0)
    expect(museumStore.get().claims).toEqual({})

    const cloud = seededMuseum()
    openChest(cloud, 'c1', () => 0)
    expect(cloud.chests).toHaveLength(1)
    expect(cloud.opened).toBe(4)
    expect(cloud.claims['goal:test']).toBe(1)

    replaceAllSlots({ 'grocery-museum': serializeState(cloud) })

    // Without reload the cache would still be empty and earn() would re-grant.
    expect(museumStore.get().chests).toHaveLength(0)

    museumStore.reload()
    const m = museumStore.get()
    expect(m.chests.map((c) => c.id)).toEqual(['c2'])
    expect(m.opened).toBe(4)
    expect(m.claims).toMatchObject({ 'goal:test': 1, welcome: 1 })
  })

  it('does not invent a grocery-museum slot on first empty get()', () => {
    museumStore.get()
    expect(getRawSlot('grocery-museum')).toBeNull()
  })

  it('persists openChest through saveGame + reload', () => {
    saveGame('grocery-museum', seededMuseum())
    museumStore.reload()
    museumStore.update((m) => {
      openChest(m, 'c1', () => 0)
    })
    museumStore.invalidate()
    museumStore.reload()
    const m = museumStore.get()
    expect(m.chests.map((c) => c.id)).toEqual(['c2'])
    expect(m.opened).toBe(4)
  })

  it('does not saveGame on playClock-only bank; saves on chest grant', () => {
    museumStore.get()
    expect(getRawSlot('grocery-museum')).toBeNull()

    museumStore.apply((m) => {
      m.playClock += 12
      return 'later'
    })
    expect(getRawSlot('grocery-museum')).toBeNull()
    expect(museumStore.get().playClock).toBe(12)

    museumStore.apply((m) => {
      m.chests.push({ id: 'grant', rarity: 'common', wing: null, source: 'Test', at: 1 })
      m.unlocked = true
      return 'now'
    })
    expect(getRawSlot('grocery-museum')).toBeTruthy()
    expect(museumStore.get().chests.map((c) => c.id)).toEqual(['grant'])
  })
})


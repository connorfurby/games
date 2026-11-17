import { describe, expect, it } from 'vitest'
import { SAVE_VERSION } from './balance'
import { can, run } from './commands'
import { migrate } from './migrate'
import { cleanStoreName, createInitialState, STORE_NAME_MAX, storeDisplayName } from './state'

describe('store name', () => {
  it('starts empty and prints the game name', () => {
    const s = createInitialState(1)
    expect(s.storeName).toBe('')
    expect(storeDisplayName(s)).toBe('Grocery Empire')
  })

  it('setStoreName trims, collapses spaces and caps the length', () => {
    const s = createInitialState(1)
    expect(run(s, { type: 'setStoreName', name: '  Penny   Lane\n Market  ' }).ok).toBe(true)
    expect(s.storeName).toBe('Penny Lane Market')
    expect(storeDisplayName(s)).toBe('Penny Lane Market')
    run(s, { type: 'setStoreName', name: 'x'.repeat(80) })
    expect(s.storeName.length).toBe(STORE_NAME_MAX)
  })

  it('refuses a no-op rename and allows clearing', () => {
    const s = createInitialState(1)
    run(s, { type: 'setStoreName', name: 'Corner' })
    expect(can(s, { type: 'setStoreName', name: ' Corner ' }).ok).toBe(false)
    expect(run(s, { type: 'setStoreName', name: '' }).ok).toBe(true)
    expect(storeDisplayName(s)).toBe('Grocery Empire')
  })

  it('survives a save round trip and older saves get an empty name', () => {
    const s = createInitialState(1)
    run(s, { type: 'setStoreName', name: 'Corner' })
    const back = migrate(JSON.parse(JSON.stringify(s)))
    expect(back.storeName).toBe('Corner')
    expect(back.version).toBe(SAVE_VERSION)
    const old = JSON.parse(JSON.stringify(createInitialState(1))) as Record<string, unknown>
    delete old.storeName
    old.version = 36
    expect(migrate(old).storeName).toBe('')
  })

  it('cleanStoreName rejects non-strings', () => {
    expect(cleanStoreName(42)).toBe('')
    expect(cleanStoreName(null)).toBe('')
  })
})

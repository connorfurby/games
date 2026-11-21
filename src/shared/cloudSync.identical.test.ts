import { beforeEach, describe, expect, it } from 'vitest'
import {
  __lastFlushedPayload,
  __seedLastFlushed,
  __wouldSkipIdenticalFlush,
  setSyncUser,
  signOutClear,
} from './cloudSync'
import { __resetSaveStore, getRawSlot, saveGame, serializeState } from './save'
import { clearCampaignGlances } from './saveGlance'

describe('cloud identical upsert skip', () => {
  beforeEach(() => {
    signOutClear()
    __resetSaveStore()
    clearCampaignGlances()
  })

  it('skips flush when payload matches last flushed', () => {
    setSyncUser('user-1')
    const payload = serializeState({ era: 3, baskets: 100 })
    saveGame('grocery-empire', { era: 3, baskets: 100 })
    expect(getRawSlot('grocery-empire')).toBe(payload)
    __seedLastFlushed('grocery-empire', payload)
    expect(__wouldSkipIdenticalFlush('grocery-empire')).toBe(true)
    expect(__lastFlushedPayload('grocery-empire')).toBe(payload)
  })

  it('does not skip when payload changed', () => {
    setSyncUser('user-1')
    saveGame('grocery-empire', { era: 3, baskets: 100 })
    __seedLastFlushed('grocery-empire', serializeState({ era: 3, baskets: 100 }))
    saveGame('grocery-empire', { era: 3, baskets: 101 })
    expect(__wouldSkipIdenticalFlush('grocery-empire')).toBe(false)
  })
})

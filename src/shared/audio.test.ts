import { describe, expect, it } from 'vitest'
import { audioMix, setAudioMix } from './audio'

describe('audio mix', () => {
  it('is silent by default', () => {
    expect(audioMix().muted).toBe(true)
  })
  it('clamps volume and ignores junk', () => {
    setAudioMix({ volume: 7 })
    expect(audioMix().volume).toBe(1)
    setAudioMix({ volume: -2 })
    expect(audioMix().volume).toBe(0)
    setAudioMix({ volume: Number.NaN })
    expect(audioMix().volume).toBe(0)
    setAudioMix({ volume: 0.6, muted: true, ambience: true })
  })
})

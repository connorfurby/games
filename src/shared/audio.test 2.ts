import { describe, expect, it } from 'vitest'
import { audioMix, moodForEra, musicPlaying, setAudioMix, sfx, startMusic } from './audio'

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
  it('picks a score per era', () => {
    expect(moodForEra(0, 12)).toBe('corner')
    expect(moodForEra(2, 12)).toBe('chain')
    expect(moodForEra(4, 12)).toBe('cold')
    expect(moodForEra(5, 12)).toBe('harbor')
    expect(moodForEra(9, 12)).toBe('stars')
    // After dark the hush wins whatever the era.
    expect(moodForEra(9, 23)).toBe('night')
    expect(moodForEra(0, 2)).toBe('night')
  })
  it('stays silent and never throws while muted', () => {
    setAudioMix({ muted: true })
    for (const cue of Object.values(sfx)) expect(() => cue()).not.toThrow()
    startMusic('corner')
    expect(musicPlaying()).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { createInitialState } from '../sim/state'
import { advanceDialogue, queueDialogue, skipOpeningDialogue } from '../sim/helpers'
import { DIALOGUE_BY_ID, DIALOGUE_LINES, dialogueSpeaker } from './dialogue'

describe('dialogue', () => {
  it('has unique ids', () => {
    const ids = DIALOGUE_LINES.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('maps unknown speaker to operations', () => {
    expect(dialogueSpeaker('nope')).toBe('operations')
    expect(dialogueSpeaker('open-shelf')).toBe('clerk')
  })

  it('queues once and advance marks seen', () => {
    const s = createInitialState(7)
    s.introSeen = true
    queueDialogue(s, 'open-shelf')
    queueDialogue(s, 'open-shelf')
    expect(s.dialogueQueue).toEqual(['open-shelf'])
    advanceDialogue(s)
    expect(s.seenLines['open-shelf']).toBe(true)
    expect(s.dialogueQueue).toEqual([])
    queueDialogue(s, 'open-shelf')
    expect(s.dialogueQueue).toEqual([])
  })

  it('skipOpeningDialogue clears opener without blocking later lines', () => {
    const s = createInitialState(9)
    s.introSeen = true
    s.dialogueQueue = ['open-shelf', 'open-baskets', 'first-sale']
    skipOpeningDialogue(s)
    expect(s.seenLines['open-unpack-only']).toBe(true)
    expect(s.dialogueQueue).toEqual(['first-sale'])
  })

  it('every line has a registry entry', () => {
    for (const line of DIALOGUE_LINES) {
      expect(DIALOGUE_BY_ID[line.id]).toBe(line)
      expect(line.text.length).toBeGreaterThan(8)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { pendingTip } from '../content/tips'
import { can, run } from './commands'
import { applyTick } from './tick'
import { createInitialState } from './state'

describe('fluid opening lesson', () => {
  it('finishIntro starts opening with no strip and no first-unpack whisper', () => {
    const s = createInitialState(42)
    expect(s.introSeen).toBe(false)
    expect(run(s, { type: 'finishIntro' }).ok).toBe(true)
    expect(s.introSeen).toBe(true)
    expect(s.tutorials.active?.id).toBe('opening')
    expect(s.tutorials.active?.step).toBe(0)
    expect(s.dialogueQueue).toEqual([])
    expect(s.seenLines['open-unpack-only']).toBe(true)
    expect(pendingTip(s)).toBeNull()
  })

  it('advancing an opening step does not start the calm window', () => {
    const s = createInitialState(43)
    run(s, { type: 'finishIntro' })
    const calmBefore = s.tutorials.calmUntil
    expect(run(s, { type: 'doTutorialForMe' }).ok).toBe(true)
    expect(s.tutorials.active?.id).toBe('opening')
    expect(s.tutorials.active?.step).toBe(1)
    expect(s.tutorials.done['unpack']).toBe(true)
    expect(s.tipsSeen['first-unpack']).toBe(true)
    expect(s.tutorials.calmUntil).toBe(calmBefore)
  })

  it('finishing opening marks legacy tours and silences first-action tips', () => {
    const s = createInitialState(44)
    run(s, { type: 'finishIntro' })
    // unpack (act) → baskets (look / Got it) → price (act) → restock (act)
    expect(run(s, { type: 'doTutorialForMe' }).ok).toBe(true)
    expect(s.tutorials.active?.step).toBe(1)
    expect(run(s, { type: 'completeTutorialStep' }).ok).toBe(true)
    expect(s.tutorials.active?.step).toBe(2)
    expect(run(s, { type: 'doTutorialForMe' }).ok).toBe(true)
    expect(s.tutorials.active?.step).toBe(3)
    expect(run(s, { type: 'doTutorialForMe' }).ok).toBe(true)
    expect(s.tutorials.active).toBeNull()
    expect(s.tutorials.done['opening']).toBe(true)
    expect(s.tutorials.done['unpack']).toBe(true)
    expect(s.tutorials.done['baskets']).toBe(true)
    expect(s.tutorials.done['price']).toBe(true)
    expect(s.tutorials.done['wholesale']).toBe(true)
    expect(s.tipsSeen['first-unpack']).toBe(true)
    expect(s.tipsSeen['first-basket']).toBe(true)
    expect(s.tipsSeen['first-price']).toBe(true)
    expect(s.tipsSeen['first-wholesale']).toBe(true)
    expect(s.tutorials.calmUntil).toBeGreaterThan(0)
  })

  it('skip opening marks legacy spine done', () => {
    const s = createInitialState(45)
    run(s, { type: 'finishIntro' })
    expect(run(s, { type: 'skipTutorial' }).ok).toBe(true)
    expect(s.tutorials.active).toBeNull()
    expect(s.tutorials.done['opening']).toBe(true)
    expect(s.tutorials.done['unpack']).toBe(true)
    expect(s.tutorials.done['wholesale']).toBe(true)
    expect(can(s, { type: 'skipTutorial' }).ok).toBe(false)
  })

  it('does not auto-queue rent or meta-shelf after opening', () => {
    const s = createInitialState(46)
    run(s, { type: 'finishIntro' })
    run(s, { type: 'skipTutorial' })
    s.stats.rentPaid = 2
    s.baskets = 10
    applyTick(s, 2)
    expect(s.tutorials.queue.includes('rent')).toBe(false)
    expect(s.tutorials.queue.includes('meta-shelf')).toBe(false)
    expect(s.tutorials.active?.id === 'rent' || s.tutorials.active?.id === 'meta-shelf').toBe(false)
  })
})

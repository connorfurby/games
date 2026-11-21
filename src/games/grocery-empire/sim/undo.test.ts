import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState } from './state'
import { __undoStackLength, clearUndo, pushUndo } from './undo'

describe('undo stack cap', () => {
  beforeEach(() => clearUndo())

  it('keeps at most 2 snapshots', () => {
    const s = createInitialState(1)
    pushUndo(s, 'buyAd')
    pushUndo(s, 'buyBuild')
    pushUndo(s, 'hire')
    pushUndo(s, 'buyMemo')
    expect(__undoStackLength()).toBe(2)
  })
})

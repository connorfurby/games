import { beforeEach, describe, expect, it } from 'vitest'
import { clearNotices, noticeAge, notices, pushNotice } from './notices'

describe('notices', () => {
  beforeEach(() => clearNotices())

  it('keeps newest first and caps the list', () => {
    for (let i = 0; i < 50; i++) pushNotice(`n${i}`, 'info', 1000 + i * 10_000)
    expect(notices().length).toBe(40)
    expect(notices()[0]!.text).toBe('n49')
  })

  it('folds an immediate repeat into one', () => {
    pushNotice('Not enough cash', 'blocked', 1000)
    pushNotice('Not enough cash', 'blocked', 2000)
    pushNotice('Not enough cash', 'blocked', 9000)
    expect(notices().length).toBe(2)
  })

  it('words ages plainly', () => {
    expect(noticeAge(0, 10_000)).toBe('just now')
    expect(noticeAge(0, 4 * 60_000)).toBe('4 min ago')
    expect(noticeAge(0, 2 * 3_600_000)).toBe('2 h ago')
  })
})

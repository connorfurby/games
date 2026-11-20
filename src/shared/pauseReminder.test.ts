import { describe, expect, it } from 'vitest'
import { PAUSE_REMINDER_SEC, pauseClock, pauseReminderVisible } from './pauseReminder'

describe('pause reminder', () => {
  it('stays hidden until half a minute of a real pause', () => {
    expect(pauseReminderVisible(true, false, PAUSE_REMINDER_SEC - 1)).toBe(false)
    expect(pauseReminderVisible(true, false, PAUSE_REMINDER_SEC)).toBe(true)
    expect(pauseReminderVisible(false, false, 90)).toBe(false)
  })

  it('does not offer Resume over a story silence', () => {
    expect(pauseReminderVisible(true, true, 90)).toBe(false)
  })

  it('reads like a clock', () => {
    expect(pauseClock(0)).toBe('0:00')
    expect(pauseClock(30)).toBe('0:30')
    expect(pauseClock(65)).toBe('1:05')
    expect(pauseClock(3661)).toBe('1:01:01')
    expect(pauseClock(Number.NaN)).toBe('0:00')
  })
})

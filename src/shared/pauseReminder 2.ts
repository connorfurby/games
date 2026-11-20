import { useEffect, useState } from 'react'

/** Real seconds of a pause before the clock card offers Resume. */
export const PAUSE_REMINDER_SEC = 30

/** Seconds the current pause has lasted. Resets when the pause ends or a story silence takes over. */
export function usePauseSeconds(paused: boolean, quiet: boolean): number {
  const live = paused && !quiet
  const [sec, setSec] = useState(0)
  const [watch, setWatch] = useState(live)
  if (watch !== live) {
    setWatch(live)
    setSec(0)
  }
  useEffect(() => {
    if (!live) return
    const started = Date.now()
    const id = window.setInterval(() => {
      setSec(Math.floor((Date.now() - started) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [live])
  return live ? sec : 0
}

export function pauseReminderVisible(paused: boolean, quiet: boolean, elapsedSec: number): boolean {
  return paused && !quiet && elapsedSec >= PAUSE_REMINDER_SEC
}

/** How long the run has been paused: 0:30, 1:05, 1:02:03. */
export function pauseClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const ss = String(r).padStart(2, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`
  return `${m}:${ss}`
}

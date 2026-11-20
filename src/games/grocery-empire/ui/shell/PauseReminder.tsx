import { pauseClock, pauseReminderVisible, usePauseSeconds } from '@/shared/pauseReminder'
import { Button } from '../kit'

/**
 * After a real half-minute of pause, a small clock with Resume.
 * Story silences stay parked and do not get this button.
 */
export function PauseReminder({
  paused,
  quiet,
  onResume,
}: {
  paused: boolean
  quiet: boolean
  onResume: () => void
}) {
  const sec = usePauseSeconds(paused, quiet)
  if (!pauseReminderVisible(paused, quiet, sec)) return null

  return (
    <div className="g2-pause-note" role="status">
      <p className="g2-pause-note__kicker">Paused</p>
      <p className="g2-pause-note__clock" aria-label={`Paused for ${pauseClock(sec)}`}>
        {pauseClock(sec)}
      </p>
      <p className="g2-pause-note__line">The store is paused.</p>
      <Button tone="free" size="sm" onClick={onResume}>
        Resume
      </Button>
    </div>
  )
}

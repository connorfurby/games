import { pauseClock, pauseReminderVisible, usePauseSeconds } from '@/shared/pauseReminder'
import { Button } from '../kit'

/** After a real half-minute of pause, a small clock with Resume. */
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
    <div className="sd-pause-note" role="status">
      <p className="sd-pause-note__kicker">Paused</p>
      <p className="sd-pause-note__clock" aria-label={`Paused for ${pauseClock(sec)}`}>
        {pauseClock(sec)}
      </p>
      <p className="sd-pause-note__line">The broadcast is paused.</p>
      <Button tone="free" size="sm" onClick={onResume}>
        Resume
      </Button>
    </div>
  )
}

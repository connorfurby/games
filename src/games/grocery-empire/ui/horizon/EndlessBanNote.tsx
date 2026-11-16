import { endlessBanLine } from '../../sim/systems/horizon'
import { useGame } from '../GameContext'

/** SAVE 36: while an endless mutation's ban stands, say what is banned and how to clear it. */
export function EndlessBanNote() {
  const { state: s } = useGame()
  const line = endlessBanLine(s)
  if (!line) return null
  return (
    <p className="hz-note hz-ban" role="status" data-testid="endless-ban">
      {line}
    </p>
  )
}

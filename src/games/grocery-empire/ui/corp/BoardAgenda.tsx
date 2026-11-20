import { boardDue } from '../../sim/systems/capital'
import type { BoardAgenda as AgendaId } from '../../sim/state'
import { useGame } from '../GameContext'
import { Button, Card } from '../kit'
import '../panels/lateHubs.css'

const AGENDAS: { id: AgendaId; label: string; tip: string }[] = [
  { id: 'expand', label: 'Expand', tip: 'The next store costs 10% less. A little equity is set aside.' },
  { id: 'dividend', label: 'Dividend', tip: 'Turn some equity into cash. Brand takes a nick.' },
  { id: 'rnd', label: 'Shelf R&D', tip: 'Perishables last longer until the next meeting. Costs up to $400.' },
  { id: 'hours', label: 'Cut hours', tip: 'Hours snap to 1× for a short stretch. Wages ease and demand softens.' },
]

function eta(sec: number): string {
  if (!Number.isFinite(sec)) return '—'
  if (sec <= 0) return 'now'
  if (sec < 60) return `in ~${Math.ceil(sec)}s`
  if (sec < 3600) return `in ~${Math.ceil(sec / 60)} min`
  return `in ~${(sec / 3600).toFixed(1)} hr`
}

/**
 * The directors' agenda, which comes with incorporating. It lives in the Boardroom with
 * the owners and votes, so the company's board is in one place.
 */
export function BoardAgendaCard() {
  const { state: s, dispatch } = useGame()
  if (!s.incorporated) return null
  const due = boardDue(s)
  const next = Math.max(0, Math.ceil(s.board.nextMeetingAt - s.time))
  return (
    <Card
      className={`lh-board${due ? '' : ' lh-board--calm'}`}
      data-coach-id="boardroom-agenda"
      header={
        <div className="lh-card-title">
          <strong>Directors’ agenda</strong>
          <span>{due ? 'Pick one. The others wait until the next meeting.' : `Next meeting ${eta(next)}.`}</span>
        </div>
      }
    >
      <ul className="lh-board__list">
        {AGENDAS.map((a) => (
          <li key={a.id} className={due ? 'is-due' : ''}>
            <div>
              <strong>{a.label}</strong>
              <span>{a.tip}</span>
            </div>
            <Button
              size="sm"
              tone={due ? 'primary' : 'ghost'}
              disabled={!due}
              title={due ? a.tip : `Next meeting ${eta(next)}`}
              onClick={() => dispatch({ type: 'resolveBoard', agenda: a.id })}
            >
              {due ? 'Choose' : 'Waiting'}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

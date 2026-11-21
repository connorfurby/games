import { MENUS, type MenuId } from '../../content/menus'
import { arrivalFocusMenu } from '../../sim/helpers'
import { useGame } from '../GameContext'
import { Btn } from './Btn'

/** Rooms waiting on the arrival list, skipping chrome-only menus. */
export function pendingArrivalRooms(pending: readonly MenuId[]): MenuId[] {
  return pending.filter((id) => id !== 'coach' && id !== 'more' && !!MENUS[id])
}

/**
 * Hanging notice when rooms unlock without a chapter card (Company dump, lone Cold, etc.).
 * Stay here reveals the rail in place; Show me crossfades once and starts the opener if any.
 */
export function ArrivalNotice({ reducedMotion }: { reducedMotion: boolean }) {
  const { state, dispatch, setActiveMenu } = useGame()
  const rooms = pendingArrivalRooms(state.pendingReveal ?? [])
  if (rooms.length === 0 || state.chapterQueue[0] != null) return null

  const multi = rooms.length > 1
  const title = multi
    ? `${rooms.length} new rooms`
    : `${MENUS[rooms[0]!].name} is open`

  const onStay = () => dispatch({ type: 'arriveStay' })
  const onShow = () => {
    const focus = arrivalFocusMenu(state) ?? rooms[0]!
    dispatch({ type: 'arriveShow' })
    if (focus) setActiveMenu(focus)
  }

  return (
    <div
      className={`g2-arrival${reducedMotion ? '' : ' g2-arrival--enter'}`}
      role="status"
      aria-live="polite"
    >
      <div className="g2-arrival__body">
        <p className="g2-arrival__title">{title}</p>
        {multi ? (
          <ul className="g2-arrival__list">
            {rooms.slice(0, 8).map((id) => (
              <li key={id}>
                <strong>{MENUS[id].name}</strong>
                <span>{MENUS[id].purpose}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="g2-arrival__purpose">{MENUS[rooms[0]!].purpose}</p>
        )}
      </div>
      <div className="g2-arrival__actions">
        <Btn tone="ghost" onClick={onStay}>
          Stay here
        </Btn>
        <Btn tone="primary" onClick={onShow}>
          Show me
        </Btn>
      </div>
    </div>
  )
}

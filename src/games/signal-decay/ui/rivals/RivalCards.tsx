import { Button } from '../kit/Button'
import { Sheet } from '../kit/Sheet'
import { StatusChip } from '../kit/StatusChip'
import { useGame } from '../GameContext'
import { useState } from 'react'
import { RIVAL_FACE_BY_ID, faceFor } from '../../content/rivals'
import { can } from '../../sim/commands'
import { Portrait } from '../scenes/Portrait'

export function RivalCards() {
  const { state: s, dispatch } = useGame()
  const [open, setOpen] = useState<string | null>(null)
  const ids = Object.keys(s.rivals)
  if (ids.length === 0) {
    return <p className="purpose">No rivals on the dial yet — they wake with the Neighborhood.</p>
  }
  const openFace = open ? faceFor(open) : null
  const openLore = open ? RIVAL_FACE_BY_ID[open] : undefined
  return (
    <div className="sd-rivals">
      {ids.map((id) => {
        const r = s.rivals[id]!
        const face = faceFor(id)
        return (
          <button key={id} type="button" className="sd-rival" onClick={() => setOpen(id)}>
            <Portrait id={face.portrait} name={face.name} size={36} />
            <span>
              <strong>{face.name}</strong>
              <em>{face.tag}</em>
            </span>
            <StatusChip tone="warn">{r.stores} stores</StatusChip>
          </button>
        )
      })}
      <Sheet open={!!open} title={openFace?.name ?? 'Rival'} onClose={() => setOpen(null)}>
        {open && s.rivals[open] ? (
          <>
            <p className="purpose">
              {openFace?.tag ?? 'Rival'} · {s.rivals[open]!.stores} stores on your band.
            </p>
            {openLore ? (
              <>
                <p className="purpose">{openLore.bio}</p>
                <p className="purpose">
                  <strong>Tactic:</strong> {openLore.tactic} <strong>Counter:</strong> {openLore.counter}
                </p>
              </>
            ) : null}
            <div className="sd-tray">
              {open === 'choir' ? (
                <Button
                  tone="free"
                  disabled={!can(s, { type: 'hushChoir' }).ok}
                  onClick={() => dispatch({ type: 'hushChoir' })}
                >
                  Answer the hum
                </Button>
              ) : null}
              <Button tone="free" onClick={() => dispatch({ type: 'startWar', rivalId: open })}>
                Price war
              </Button>
              <Button tone="primary" onClick={() => dispatch({ type: 'buyoutRival', rivalId: open })}>
                Buy out
              </Button>
            </div>
            {open === 'choir' ? (
              <p className="purpose">
                {s.time < s.depth.choirHushUntil
                  ? 'The hum is answered for now.'
                  : s.rivals.choir && s.rivals.choir.stores > 0
                    ? 'They are humming under the featured show.'
                    : 'They are listening. A bold show makes them grow faster.'}
              </p>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </div>
  )
}

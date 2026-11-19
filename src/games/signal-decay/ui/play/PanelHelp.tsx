import { useState } from 'react'
import { CHAPTER_BY_ERA } from '../../content/story'
import { Button } from '../kit/Button'
import { useGame } from '../GameContext'

const HELP: Record<string, string> = {
  air: 'Sweep, hold, log, air. From the Neighborhood, feature a format and pick its safe or bold show.',
  plant: 'Mast raises the antenna. Trees are a board you pan and tap. Desks hold heat, the band plan, birds, and the Quiet door.',
  crew: 'Staff dawn, day, and night. Answer the Choir when they hum; war and buyout still work.',
  books: 'Pay invoices early. Calls run tournaments and, from Night Skip, buy doctrines.',
  network: 'Raise towers and set each one to match, push, or quiet. Dial boards open at Era 7.',
}

export function PanelHelpButton({ menu }: { menu: string }) {
  const [open, setOpen] = useState(false)
  const { state, setActiveMenu } = useGame()
  const mission = CHAPTER_BY_ERA[state.era]?.mission
  return (
    <div className="sd-help">
      <button
        type="button"
        className="pf__help"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="How this department works"
        title="How this works"
      >
        ?
      </button>
      {open ? (
        <div className="sd-help-pop" role="dialog">
          <p className="sd-help-pop__mark">Tip</p>
          <p>{HELP[menu] ?? 'One purpose, one room, one primary verb.'}</p>
          {mission ? <p>{mission}</p> : null}
          <div className="sd-help-pop__acts">
            <Button
              tone="ghost"
              size="sm"
              onClick={() => {
                setOpen(false)
                setActiveMenu(menu === 'plant' ? 'plant' : menu)
              }}
            >
              Got it
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** In-flow tip slot — reserved for coach-driven banners; button owns the popover. */
export function PanelHelp() {
  return null
}

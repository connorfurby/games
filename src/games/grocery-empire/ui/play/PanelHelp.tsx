import { useEffect, useRef, useState } from 'react'
import { MENUS, type MenuId } from '../../content/menus'
import { panelTip, TIPS } from '../../content/tips'
import { wikiForMenu } from '../../content/wiki/articles'
import { useGame } from '../GameContext'
import { Button } from '../kit/Button'
import { requestWiki } from '../shell/uiBus'

/** A card that sat on screen this long counts as read when you leave the room. */
const SEEN_MS = 8_000
/** After one tip is filed, the next waits: help should not arrive as a parade. */
const QUIET_MS = 90_000
let quietUntil = 0

/** `?` beside a department's purpose line: opens that department's wiki page in the Menu drawer. */
export function PanelHelpButton() {
  const { activeMenu } = useGame()
  const menu = activeMenu as MenuId
  if (!MENUS[menu]) return null
  return (
    <button
      type="button"
      className="pf__help"
      aria-label={`How ${MENUS[menu].name} works`}
      title={`How ${MENUS[menu].name} works`}
      onClick={() => requestWiki(wikiForMenu(menu))}
    >
      ?
    </button>
  )
}

/**
 * One help card in the room it is about. Replaces the floating tip card: it sits in the
 * panel's own flow, never over a button, and shows once per topic.
 */
export function PanelHelp() {
  const { state: s, dispatch, activeMenu } = useGame()
  const tutoring = !!s.tutorials?.active
  // Chosen once, when the room opens. A card never pops in mid-visit and never leaves on
  // a timer: the page under it only moves when the player presses Got it.
  const [tipId, setTipId] = useState<string | null>(() =>
    !s.introSeen || tutoring || Date.now() < quietUntil ? null : (panelTip(s, activeMenu)?.id ?? null),
  )
  const shownAt = useRef(0)
  const tip = tipId && !s.tipsSeen[tipId] ? (TIPS.find((t) => t.id === tipId) ?? null) : null

  useEffect(() => {
    if (!tipId) return
    shownAt.current = Date.now()
    // Leaving the room after a real look files the tip, so it does not greet you again.
    return () => {
      if (Date.now() - shownAt.current >= SEEN_MS) {
        quietUntil = Date.now() + QUIET_MS
        dispatch({ type: 'dismissTip', id: tipId })
      }
    }
  }, [tipId, dispatch])

  if (!tip) return null
  const menu = activeMenu as MenuId
  const file = () => {
    quietUntil = Date.now() + QUIET_MS
    dispatch({ type: 'dismissTip', id: tip.id })
    setTipId(null)
  }
  return (
    <aside className="pf-help" aria-label="Tip">
      <span className="pf-help__mark" aria-hidden="true">
        Tip
      </span>
      <p className="pf-help__text">{tip.text}</p>
      <span className="pf-help__acts">
        {MENUS[menu] ? (
          <Button size="sm" onClick={() => requestWiki(wikiForMenu(menu))}>
            More
          </Button>
        ) : null}
        <Button size="sm" tone="secondary" onClick={file}>
          Got it
        </Button>
      </span>
    </aside>
  )
}

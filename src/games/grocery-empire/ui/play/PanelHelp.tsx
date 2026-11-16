import { useEffect, useState } from 'react'
import { MENUS, type MenuId } from '../../content/menus'
import { panelTip } from '../../content/tips'
import { wikiForMenu } from '../../content/wiki/articles'
import { useGame } from '../GameContext'
import { Button } from '../kit/Button'
import { requestWiki } from '../shell/uiBus'

/** How long a help card may sit unread before it files itself. */
const AUTO_FILE_MS = 60_000
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
  const [, bump] = useState(0)
  const quiet = Date.now() < quietUntil
  const tip = !s.introSeen || tutoring || quiet ? null : panelTip(s, activeMenu)
  const id = tip?.id
  const file = (tipId: string) => {
    quietUntil = Date.now() + QUIET_MS
    dispatch({ type: 'dismissTip', id: tipId })
    bump((n) => n + 1)
  }

  useEffect(() => {
    if (!id) return
    const t = window.setTimeout(() => file(id), AUTO_FILE_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!tip) return null
  const menu = activeMenu as MenuId
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
        <Button size="sm" tone="secondary" onClick={() => file(tip.id)}>
          Got it
        </Button>
      </span>
    </aside>
  )
}

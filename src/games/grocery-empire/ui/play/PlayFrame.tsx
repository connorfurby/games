import type { ReactNode } from 'react'
import { PanelHelp, PanelHelpButton, PanelTitle } from './PanelHelp'
import { VerbTray, type VerbTrayProps } from './VerbTray'
import './play.css'

/**
 * One page frame for every department:
 * purpose → room → verb tray → optional body (puzzle / tree / map only).
 */
export function PlayFrame({
  purpose,
  room,
  tray,
  primarySlot,
  children,
  className = '',
}: {
  /** One sentence from hubs.ts (or the department purpose). */
  purpose?: ReactNode
  /** @deprecated The hub head already names the department (design law 1: one title). Not rendered. */
  department?: ReactNode
  room?: ReactNode
  tray?: VerbTrayProps
  /** Escape hatch while a panel still builds its own primary row. Prefer `tray`. */
  primarySlot?: ReactNode
  /** Body exception: puzzle board, skill tree, map, museum gallery. */
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={`pf${className ? ` ${className}` : ''}`.trim()}>
      {purpose ? (
        <header className="pf__head">
          <div className="pf__headcopy">
            <PanelTitle />
            <p className="pf__purpose">{purpose}</p>
          </div>
          <PanelHelpButton />
        </header>
      ) : null}
      <PanelHelp />
      {room ? <div className="pf__room">{room}</div> : null}
      {tray ? <VerbTray {...tray} /> : null}
      {!tray && primarySlot ? <div className="pf__tray">{primarySlot}</div> : null}
      {children != null ? <div className="pf__body">{children}</div> : null}
    </div>
  )
}

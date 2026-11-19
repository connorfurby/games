import type { ReactNode } from 'react'
import { PanelHelp, PanelHelpButton } from './PanelHelp'
import { VerbTray, type VerbTrayProps } from './VerbTray'
import './play.css'

export function PlayFrame({
  purpose,
  helpMenu = 'air',
  room,
  tray,
  primarySlot,
  children,
  className = '',
}: {
  purpose?: ReactNode
  helpMenu?: string
  room?: ReactNode
  tray?: VerbTrayProps
  primarySlot?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={`pf${className ? ` ${className}` : ''}`.trim()}>
      {purpose ? (
        <div className="pf__head">
          <p className="pf__purpose">{purpose}</p>
          <PanelHelpButton menu={helpMenu} />
        </div>
      ) : null}
      <PanelHelp />
      {room ? <div className="pf__room">{room}</div> : null}
      {tray ? <VerbTray {...tray} /> : null}
      {!tray && primarySlot ? <div className="pf__tray">{primarySlot}</div> : null}
      {children != null ? <div className="pf__body">{children}</div> : null}
    </div>
  )
}

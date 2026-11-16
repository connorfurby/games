import type { ReactNode } from 'react'
import { PlayFrame, type VerbTrayProps } from '../play'
import './hubStage.css'

/**
 * Department frame → PlayFrame.
 * Call sites that still pass scene/primary keep working; new panels should
 * use PlayFrame + VerbTray directly.
 */
export function HubStage({
  scene,
  tray,
  primary,
  children,
  className = '',
  sceneClassName = '',
  primaryClassName = '',
  bodyClassName = '',
  purpose,
  department,
}: {
  scene?: ReactNode
  /** The verb tray (one primary verb, optional secondaries, fail reason). */
  tray?: VerbTrayProps
  /** @deprecated Use `tray`. Ignored when `tray` is set. */
  primary?: ReactNode
  children?: ReactNode
  className?: string
  sceneClassName?: string
  primaryClassName?: string
  bodyClassName?: string
  purpose?: ReactNode
  department?: ReactNode
}) {
  const hasBody = children != null && children !== false && children !== true
  return (
    <div className={`hub-frame${className ? ` ${className}` : ''}`.trim()}>
      <PlayFrame
        purpose={purpose}
        department={department}
        room={
          scene ? (
            <div className={`hub-stage__scene ${sceneClassName}`.trim()}>{scene}</div>
          ) : undefined
        }
        tray={tray}
        primarySlot={
          !tray && primary ? (
            <div className={`hub-stage__primary ${primaryClassName}`.trim()}>{primary}</div>
          ) : undefined
        }
      >
        {hasBody ? <div className={`hub-stage__body ${bodyClassName}`.trim()}>{children}</div> : null}
      </PlayFrame>
    </div>
  )
}

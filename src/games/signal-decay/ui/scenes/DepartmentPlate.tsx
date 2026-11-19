import { useState, type ReactNode } from 'react'
import { PLATES, type PlateId } from '../../art/cast'
import { cx } from '../kit/hooks'
import './scenes.css'

export type DepartmentPlateId = Exclude<PlateId, 'cover'>

/**
 * Room backdrop — a department plate behind its children.
 * Falls back to a solid panel if the image is missing or fails to load.
 */
export function DepartmentPlate({
  plate,
  children,
  className,
  dim = 0.55,
}: {
  plate: DepartmentPlateId
  children?: ReactNode
  className?: string
  /** 0 = raw plate, 1 = fully dimmed. */
  dim?: number
}) {
  const src = PLATES[plate]
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = !src || failedSrc === src

  return (
    <div
      className={cx('sd-plate', `sd-plate--${plate}`, failed && 'is-solid', className)}
      data-plate={plate}
      style={{ ['--sd-plate-dim' as string]: String(dim) }}
    >
      {!failed && src ? (
        <img className="sd-plate__img" src={src} alt="" aria-hidden decoding="async" onError={() => setFailedSrc(src)} />
      ) : null}
      <div className="sd-plate__veil" aria-hidden />
      <div className="sd-plate__body">{children}</div>
    </div>
  )
}

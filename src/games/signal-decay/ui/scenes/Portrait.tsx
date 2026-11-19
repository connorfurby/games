import { useState } from 'react'
import { PORTRAITS, type PortraitId } from '../../art/cast'
import { cx } from '../kit/hooks'
import './scenes.css'

/** Round portrait with a letter fallback when the image is missing. */
export function Portrait({
  id,
  name,
  size = 40,
  className,
}: {
  id: PortraitId | null | undefined
  name: string
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const src = id ? PORTRAITS[id] : undefined
  const style = { width: size, height: size, fontSize: Math.round(size * 0.45) }
  if (!src || failed) {
    return (
      <span className={cx('sd-portrait is-letter', className)} style={style} aria-hidden>
        {name.slice(0, 1)}
      </span>
    )
  }
  return (
    <img
      className={cx('sd-portrait', className)}
      style={style}
      src={src}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

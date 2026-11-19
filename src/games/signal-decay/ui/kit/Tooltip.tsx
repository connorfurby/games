import { cloneElement, useId, useState, type ReactElement, type ReactNode } from 'react'
import { cx } from './hooks'

/**
 * CSS-positioned tooltip. Shows on hover and keyboard focus; wired to the child via aria-describedby.
 * On touch it appears on focus/tap, so help never hides behind hover.
 */
export function Tooltip({
  tip,
  children,
  side = 'top',
  className,
}: {
  tip: ReactNode
  children: ReactElement<{ 'aria-describedby'?: string }>
  side?: 'top' | 'bottom'
  className?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <span
      className={cx('sd-tip', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      {cloneElement(children, { 'aria-describedby': open ? id : undefined })}
      {open ? (
        <span id={id} role="tooltip" className={cx('sd-tip__bubble', `sd-tip__bubble--${side}`)}>
          {tip}
        </span>
      ) : null}
    </span>
  )
}

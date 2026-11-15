import { useId, useState, type ReactNode } from 'react'
import { cx } from './hooks'

/**
 * Hover / focus popover. Keep it for explanations that would otherwise clutter a panel.
 * Touch: tap the trigger to toggle. Pure CSS positioning (above, centred).
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <span
      className={cx('gk-tip', open && 'is-open', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
    >
      <span className="gk-tip__trigger" aria-describedby={open ? id : undefined} tabIndex={0} onClick={() => setOpen((o) => !o)}>
        {children}
      </span>
      {open ? (
        <span role="tooltip" id={id} className={cx('gk-tip__pop', `gk-tip__pop--${side}`)}>
          {content}
        </span>
      ) : null}
    </span>
  )
}

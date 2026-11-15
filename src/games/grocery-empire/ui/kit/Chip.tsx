import type { ReactNode } from 'react'
import { cx } from './hooks'

/** Filter / selection chip. Becomes a toggle button when `onClick` is given. */
export function Chip({
  children,
  icon,
  selected,
  onClick,
  onRemove,
  disabled,
  className,
}: {
  children: ReactNode
  icon?: ReactNode
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void
  disabled?: boolean
  className?: string
}) {
  const body = (
    <>
      {icon ? <span className="gk-chip__icon">{icon}</span> : null}
      <span>{children}</span>
    </>
  )
  return (
    <span className={cx('gk-chip', selected && 'is-selected', disabled && 'is-disabled', className)}>
      {onClick ? (
        <button type="button" className="gk-chip__main" aria-pressed={!!selected} disabled={disabled} onClick={onClick}>
          {body}
        </button>
      ) : (
        <span className="gk-chip__main">{body}</span>
      )}
      {onRemove ? (
        <button type="button" className="gk-chip__x" aria-label="Remove" disabled={disabled} onClick={onRemove}>
          ×
        </button>
      ) : null}
    </span>
  )
}

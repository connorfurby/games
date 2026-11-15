import type { ReactNode } from 'react'
import { cx } from './hooks'

/** "Nothing here yet" with a hint of what to do next. */
export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  body?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('gk-empty', className)}>
      {icon ? (
        <div className="gk-empty__icon" aria-hidden>
          {icon}
        </div>
      ) : null}
      <strong className="gk-empty__title">{title}</strong>
      {body ? <p className="gk-empty__body">{body}</p> : null}
      {action ? <div className="gk-empty__action">{action}</div> : null}
    </div>
  )
}

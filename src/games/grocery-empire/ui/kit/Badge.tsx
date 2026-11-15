import type { ReactNode } from 'react'
import { cx } from './hooks'

export type BadgeTone = 'accent' | 'tag' | 'success' | 'warn' | 'danger' | 'info' | 'muted'

/** Tiny status / count pill. */
export function Badge({
  tone = 'accent',
  dot,
  children,
  className,
  title,
}: {
  tone?: BadgeTone
  /** Render as a bare dot (e.g. "new" marker). */
  dot?: boolean
  children?: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span className={cx('gk-badge', `gk-badge--${tone}`, dot && 'gk-badge--dot', className)} title={title}>
      {dot ? null : children}
    </span>
  )
}

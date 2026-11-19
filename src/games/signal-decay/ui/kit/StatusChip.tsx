import type { ReactNode } from 'react'
import { cx } from './hooks'

export function StatusChip({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'warn' | 'danger'
}) {
  return <span className={cx('sd-chip', tone !== 'default' && `sd-chip--${tone}`)}>{children}</span>
}

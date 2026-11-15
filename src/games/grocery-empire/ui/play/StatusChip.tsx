import type { ReactNode } from 'react'
import { cx } from '../kit/hooks'

export type StatusChipTone = 'ready' | 'waiting' | 'locked' | 'warn' | 'idle'

export function StatusChip({
  tone = 'idle',
  children,
  title,
  className,
}: {
  tone?: StatusChipTone
  children: ReactNode
  title?: string
  className?: string
}) {
  return (
    <span className={cx('pf-chip', tone !== 'idle' && `pf-chip--${tone}`, className)} title={title}>
      {children}
    </span>
  )
}

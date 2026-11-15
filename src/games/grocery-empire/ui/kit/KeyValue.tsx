import type { ReactNode } from 'react'
import { cx } from './hooks'

export interface KeyValueItem {
  label: ReactNode
  value: ReactNode
  /** Tooltip on the row. */
  title?: string
  tone?: 'success' | 'danger' | 'warn' | 'muted'
}

/** Label / value rows with tabular numbers. */
export function KeyValue({ items, className }: { items: KeyValueItem[]; className?: string }) {
  return (
    <dl className={cx('gk-kv', className)}>
      {items.map((it, i) => (
        <div key={i} className={cx('gk-kv__row', it.tone && `gk-kv__row--${it.tone}`)} title={it.title}>
          <dt>{it.label}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

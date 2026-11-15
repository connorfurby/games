import type { ReactNode } from 'react'
import { Badge } from './Badge'
import { Disclosure } from './Disclosure'
import { cx } from './hooks'

export interface SectionProps {
  title: ReactNode
  count?: number
  actions?: ReactNode
  /** Make the section collapsible (uses Disclosure). */
  collapsible?: boolean
  defaultOpen?: boolean
  children?: ReactNode
  className?: string
}

/** A titled group of content. Static by default, collapsible on request. */
export function Section({ title, count, actions, collapsible, defaultOpen = true, children, className }: SectionProps) {
  if (collapsible) {
    return (
      <Disclosure title={title} count={count} actions={actions} defaultOpen={defaultOpen} className={className}>
        {children}
      </Disclosure>
    )
  }
  return (
    <section className={cx('gk-section', className)}>
      <header className="gk-section__head">
        <h3 className="gk-section__title">{title}</h3>
        {count != null ? <Badge tone="muted">{count}</Badge> : null}
        {actions ? <div className="gk-section__actions">{actions}</div> : null}
      </header>
      <div className="gk-section__body">{children}</div>
    </section>
  )
}

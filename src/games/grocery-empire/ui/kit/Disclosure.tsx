import { useId, useState, type ReactNode } from 'react'
import { Badge } from './Badge'
import { cx } from './hooks'

export interface DisclosureProps {
  title: ReactNode
  /** Small count badge next to the title (e.g. items inside). */
  count?: number
  defaultOpen?: boolean
  /** Controlled mode. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  actions?: ReactNode
  children?: ReactNode
  className?: string
}

/** Collapsible group. The body animates with a grid-rows transition (no JS motion). */
export function Disclosure({ title, count, defaultOpen = false, open, onOpenChange, actions, children, className }: DisclosureProps) {
  const [inner, setInner] = useState(defaultOpen)
  const isOpen = open ?? inner
  const id = useId()
  const toggle = () => {
    onOpenChange?.(!isOpen)
    if (open === undefined) setInner(!isOpen)
  }
  return (
    <section className={cx('gk-disclosure', isOpen && 'is-open', className)}>
      <div className="gk-disclosure__bar">
        <button type="button" className="gk-disclosure__toggle" aria-expanded={isOpen} aria-controls={id} onClick={toggle}>
          <span className="gk-disclosure__chev" aria-hidden>
            ›
          </span>
          <span className="gk-disclosure__title">{title}</span>
          {count != null ? <Badge tone="muted">{count}</Badge> : null}
        </button>
        {actions ? <div className="gk-disclosure__actions">{actions}</div> : null}
      </div>
      <div className="gk-disclosure__panel" id={id} role="region" inert={!isOpen}>
        <div className="gk-disclosure__inner">{children}</div>
      </div>
    </section>
  )
}

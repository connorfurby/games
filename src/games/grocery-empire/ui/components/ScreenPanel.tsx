import type { ReactNode } from 'react'
import type { MenuId } from '../../content/menus'
import { Card, type CardProps } from '../kit'
import { PlayFrame } from '../play'
import './screenPanel.css'

/**
 * Kit-template department shell → PlayFrame (purpose · room · primary · body).
 */
export function ScreenPanel({
  title,
  purpose,
  icon: _icon,
  scene,
  primary,
  stats,
  actions,
  children,
  className,
}: {
  title: string
  purpose?: string
  /** Department glyph — kept for call-site compat; PlayFrame shows the name. */
  icon?: MenuId
  scene?: ReactNode
  /** Sits in the verb tray region. Prefer migrating to PlayFrame tray props. */
  primary?: ReactNode
  stats?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`ge-panel p6${className ? ` ${className}` : ''}`}>
      <PlayFrame
        purpose={purpose}
        department={title}
        room={scene}
        primarySlot={
          primary || stats || actions ? (
            <div className="p6-primary-slot">
              {stats}
              {primary}
              {actions}
            </div>
          ) : undefined
        }
      >
        {children}
      </PlayFrame>
    </section>
  )
}

/** Card header: bold name with an optional muted line under it and a right-aligned slot. */
export function CardTitle({ title, sub, aside }: { title: ReactNode; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <>
      <div className="p6-title">
        <strong>{title}</strong>
        {sub ? <span>{sub}</span> : null}
      </div>
      {aside ? <div className="p6-aside">{aside}</div> : null}
    </>
  )
}

/** A card with a title, a line of copy, and its one action in the footer. */
export function ActionCard({
  title,
  sub,
  aside,
  copy,
  action,
  children,
  ...rest
}: Omit<CardProps, 'header' | 'footer'> & {
  title: ReactNode
  sub?: ReactNode
  aside?: ReactNode
  copy?: ReactNode
  action?: ReactNode
}) {
  return (
    <Card header={<CardTitle title={title} sub={sub} aside={aside} />} footer={action} {...rest}>
      {copy ? <p className="p6-copy">{copy}</p> : null}
      {children}
    </Card>
  )
}

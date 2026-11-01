import type { ReactNode } from 'react'
import type { MenuId } from '../../content/menus'
import { LoreBlurb } from './LoreBlurb'

export function Panel({
  title,
  purpose,
  lore,
  children,
  className = '',
}: {
  title: string
  purpose?: string
  /** Department id → atmospheric blurb under the purpose line. */
  lore?: MenuId
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`ge-panel ${className}`.trim()}>
      <header className="ge-panel__head">
        <h2 className="ge-panel__title">{title}</h2>
        {purpose ? <p className="ge-panel__purpose">{purpose}</p> : null}
        {lore ? <LoreBlurb menu={lore} /> : null}
      </header>
      <div className="ge-panel__body">{children}</div>
    </section>
  )
}

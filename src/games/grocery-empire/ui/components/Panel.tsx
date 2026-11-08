import type { ReactNode } from 'react'
import type { MenuId } from '../../content/menus'
import { Icon } from '../icons/Icon'

/**
 * Department shell: title + one job line + optional status strip.
 * Lore flavor lives in unlock dialogue / guide — not a second subtitle fighting the purpose.
 */
export function Panel({
  title,
  purpose,
  lore,
  scene,
  children,
  className = '',
}: {
  title: string
  purpose?: string
  /** Icon key — department glyph only (no lore paragraph). */
  lore?: MenuId
  scene?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`ge-panel ${className}`.trim()}>
      <header className="ge-panel__head">
        <div className="ge-panel__title-row">
          <h2 className="ge-panel__title">
            {lore ? <Icon name={lore} size={18} tone="accent" /> : null}
            {title}
          </h2>
          {purpose ? <p className="ge-panel__purpose">{purpose}</p> : null}
        </div>
      </header>
      {scene ? <div className="ge-panel__scene">{scene}</div> : null}
      <div className="ge-panel__body">{children}</div>
    </section>
  )
}

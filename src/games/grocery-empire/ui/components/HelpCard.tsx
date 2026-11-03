import { useState, type ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { SpeakerChrome } from './SpeakerChrome'

/** Collapsible “Ask Operations” help — keeps panels from walling text. */
export function HelpCard({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <aside className={`ge-help${open ? ' is-open' : ''}`.trim()}>
      <button
        type="button"
        className="ge-help__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="help" size={14} />
        <span className="ge-help__ask">Ask Operations</span>
        <span className="ge-help__title">{title}</span>
        <span className="ge-help__chev" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? (
        <div className="ge-help__body">
          <SpeakerChrome speaker="operations" size={36} className="ge-help__speaker" />
          {children}
        </div>
      ) : null}
    </aside>
  )
}

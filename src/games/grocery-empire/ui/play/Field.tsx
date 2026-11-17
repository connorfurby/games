import type { ReactNode } from 'react'

/**
 * One labelled choice in a panel form: a short label, the control, and an optional note.
 * Use it whenever a panel asks the player to pick something, so every picker in the game
 * lines up the same way and never sits unlabelled against the next one.
 */
export function Field({ label, note, children }: { label: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="pf-field" role="group" aria-label={label}>
      <span className="pf-field__label">{label}</span>
      <div className="pf-field__control">{children}</div>
      {note ? <span className="pf-field__note">{note}</span> : null}
    </div>
  )
}

/** Groups Fields into one bordered form block. */
export function FieldSet({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="pf-form">
      {title ? <h3 className="pf-form__title">{title}</h3> : null}
      {children}
    </div>
  )
}

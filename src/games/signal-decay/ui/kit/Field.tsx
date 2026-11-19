import { cloneElement, useId, type ReactElement, type ReactNode } from 'react'
import { cx } from './hooks'

/** Label + control + hint/error wrapper. The single child control gets id and aria wiring. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>
  className?: string
}) {
  const id = useId()
  const noteId = `${id}-note`
  const note = error ?? hint
  return (
    <div className={cx('sd-field', error != null && 'has-error', className)}>
      <label className="sd-field__label" htmlFor={id}>
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-describedby': note != null ? noteId : undefined,
        'aria-invalid': error != null ? true : undefined,
      })}
      {note != null ? (
        <span id={noteId} className="sd-field__note">
          {note}
        </span>
      ) : null}
    </div>
  )
}

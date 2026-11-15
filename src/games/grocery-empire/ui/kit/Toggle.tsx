import type { ReactNode } from 'react'
import { cx } from './hooks'

/** On/off switch with an inline label. */
export function Toggle({
  checked,
  onChange,
  children,
  disabled,
  title,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children?: ReactNode
  disabled?: boolean
  title?: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      className={cx('gk-toggle', checked && 'is-on', className)}
      onClick={() => onChange(!checked)}
    >
      <span className="gk-toggle__track" aria-hidden>
        <span className="gk-toggle__knob" />
      </span>
      {children != null ? <span className="gk-toggle__label">{children}</span> : null}
    </button>
  )
}

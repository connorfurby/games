import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../kit/hooks'

/** Full-width raised row that opens a sheet or fires a secondary verb. Retires p6-line. */
export function ActionRow({
  icon,
  label,
  fact,
  trail,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode
  label: ReactNode
  fact?: ReactNode
  trail?: ReactNode
}) {
  return (
    <button type="button" className={cx('pf-row', 'pf-press', className)} {...rest}>
      {icon ? <span className="pf-row__icon">{icon}</span> : null}
      <span className="pf-row__main">
        <span className="pf-row__label">{label}</span>
        {fact != null ? <span className="pf-row__fact">{fact}</span> : null}
        {children}
      </span>
      {trail != null ? <span className="pf-row__trail">{trail}</span> : null}
    </button>
  )
}

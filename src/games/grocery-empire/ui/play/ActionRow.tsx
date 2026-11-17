import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../kit/hooks'

/**
 * Full-width row for a secondary verb. When it cannot be used yet it is not a button:
 * it renders as a plain line that says why (design law: no dead buttons).
 */
export function ActionRow({
  icon,
  label,
  fact,
  trail,
  className,
  children,
  disabled,
  title,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode
  label: ReactNode
  fact?: ReactNode
  trail?: ReactNode
}) {
  if (disabled) {
    return (
      <div className={cx('pf-row', 'pf-row--info', className)}>
        {icon ? <span className="pf-row__icon">{icon}</span> : null}
        <span className="pf-row__main">
          <span className="pf-row__label">{label}</span>
          {fact != null ? <span className="pf-row__fact">{fact}</span> : null}
          {title ? <span className="pf-row__why">{title}</span> : null}
          {children}
        </span>
      </div>
    )
  }
  return (
    <button type="button" className={cx('pf-row', 'pf-press', className)} title={title} {...rest}>
      {icon ? <span className="pf-row__icon">{icon}</span> : null}
      <span className="pf-row__main">
        <span className="pf-row__label">{label}</span>
        {fact != null ? <span className="pf-row__fact">{fact}</span> : null}
        {children}
      </span>
      <span className="pf-row__trail">{trail ?? '›'}</span>
    </button>
  )
}

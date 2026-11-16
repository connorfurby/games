import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import type { ButtonSize, ButtonTone } from './Button'
import { cx } from './hooks'

/**
 * A router link that looks exactly like a kit `Button`. Use it for navigation that should
 * read as an action (Play, Open the wiki, Read the bulletin). Same tone law as Button.
 */
export function LinkButton({
  tone = 'ghost',
  size = 'md',
  icon,
  iconRight,
  className,
  children,
  ...rest
}: LinkProps & { tone?: ButtonTone; size?: ButtonSize; icon?: ReactNode; iconRight?: ReactNode; children?: ReactNode }) {
  return (
    <Link className={cx('gk-btn', `gk-btn--${tone}`, `gk-btn--${size}`, className)} {...rest}>
      {icon ? <span className="gk-btn__icon">{icon}</span> : null}
      {children != null ? <span className="gk-btn__label">{children}</span> : null}
      {iconRight ? <span className="gk-btn__icon">{iconRight}</span> : null}
    </Link>
  )
}

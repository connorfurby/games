import type { ReactNode } from 'react'
import { cx } from './hooks'

/** Top of every screen: title, ONE sentence of purpose, optional stats and actions. */
export function ScreenHeader({
  title,
  purpose,
  stats,
  actions,
  className,
  /** Inside a hub the shell already titles the department — keep stats/actions only. */
  hub = false,
}: {
  title: ReactNode
  purpose?: ReactNode
  stats?: ReactNode
  actions?: ReactNode
  className?: string
  hub?: boolean
}) {
  const showText = !hub
  const hasChrome = showText || !!stats || !!actions
  if (!hasChrome) return null

  return (
    <header className={cx('gk-screen-head', hub && 'gk-screen-head--hub', className)}>
      {showText ? (
        <div className="gk-screen-head__text">
          <h2 className="gk-screen-head__title">{title}</h2>
          {purpose ? <p className="gk-screen-head__purpose">{purpose}</p> : null}
        </div>
      ) : null}
      {stats ? <div className="gk-screen-head__stats">{stats}</div> : null}
      {actions ? <div className="gk-screen-head__actions">{actions}</div> : null}
    </header>
  )
}

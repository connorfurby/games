import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { GAME_VERSION } from '@/games/grocery-empire/content/news'
import { AppMenu } from './AppMenu'

const PRIMARY = [
  { id: 'play', label: 'Play', to: '/play/grocery-empire', match: (p: string) => p.startsWith('/play/') },
  { id: 'news', label: 'News', to: '/news', match: (p: string) => p.startsWith('/news') },
  { id: 'guide', label: 'Guide', to: '/guide/grocery-empire', match: (p: string) => p.startsWith('/guide') },
  { id: 'awards', label: 'Awards', to: '/achievements', match: (p: string) => p.startsWith('/achievements') },
  { id: 'shop', label: 'Shop', to: '/shop', match: (p: string) => p.startsWith('/shop') },
] as const

/**
 * Shared chrome for non-play routes. `overlay` sits on the Shelf wood stage;
 * `page` wraps warm subpages (News, Guide, Shop, Awards).
 */
export function ShellFrame({
  children,
  variant = 'page',
  title,
}: {
  children: ReactNode
  variant?: 'page' | 'overlay'
  /** Optional page title for screen readers when brand is not the H1 */
  title?: string
}) {
  const loc = useLocation()
  const homeOn = loc.pathname === '/'

  return (
    <div className={`shell-frame shell-frame--${variant}${homeOn ? ' is-home' : ''}`.trim()}>
      <header className="shell-bar" aria-label={title ?? 'Site'}>
        <Link to="/" className={`shell-bar__brand${homeOn ? ' is-active' : ''}`} aria-label="Home · GAMES">
          GAMES
        </Link>

        <nav className="shell-bar__nav" aria-label="Primary">
          {PRIMARY.map((item) => {
            const active = item.match(loc.pathname)
            return (
              <Link
                key={item.id}
                to={item.to}
                className={`shell-bar__link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="shell-bar__end">
          {loc.pathname.startsWith('/news') ? (
            <Link to="/news" className="shell-bar__ver news-chip" title="What’s new">
              v{GAME_VERSION}
            </Link>
          ) : null}
          <AppMenu placement="inline" className="shell-bar__waffle" />
        </div>
      </header>

      <div className="shell-frame__body">{children}</div>
    </div>
  )
}

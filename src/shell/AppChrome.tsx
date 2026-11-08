import { useLocation } from 'react-router-dom'
import { AppMenu } from './AppMenu'

/** Fixed waffle on shelf/shop/etc. Play embeds its own inline menu in TopBar. */
export function AppChrome() {
  const loc = useLocation()
  if (loc.pathname.startsWith('/play/')) return null
  return <AppMenu />
}

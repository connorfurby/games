import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { engine as groceryEngine } from '@/games/grocery-empire/sim/engine'
import { getSignalEngine } from '@/games/signal-decay/sim/engine'
import { AchievementsPage } from '@/shell/AchievementsPage'
import { AccountGate } from '@/shell/AccountGate'
import { AppChrome } from '@/shell/AppChrome'
import { AuthProvider, useAuth } from '@/shell/AuthContext'
import { wireCloudReload } from '@/shell/cloudReload'
import { GuidePage } from '@/shell/GuidePage'
import { HotkeyOverlay } from '@/shell/HotkeyOverlay'
import { MetaProvider, useMeta } from '@/shell/MetaContext'
import { NewsPage } from '@/shell/NewsPage'
import { PlayPage } from '@/shell/PlayPage'
import { Shelf } from '@/shell/Shelf'
import { ShopPage } from '@/shell/ShopPage'
import { SocialPage } from '@/shell/social/SocialPage'
import { setPlayingGame, startPresence, stopPresence } from '@/shell/social/presence'
import { publishPublicStats } from '@/shell/social/stats'
import type { SocialGameId } from '@/shared/database.types'
import { loadMeta } from '@/shared/save'
import { DEFAULT_META } from '@/shared/types'

function CloudReloadBridge() {
  const { replaceMeta } = useMeta()
  const { hydrating, session, savesReady } = useAuth()
  useEffect(() => {
    return wireCloudReload({
      grocery: () => groceryEngine.reloadFromDisk(),
      signal: () => getSignalEngine().reloadFromDisk(),
      meta: () => replaceMeta(loadMeta(DEFAULT_META)),
    })
  }, [replaceMeta])

  useEffect(() => {
    const pause = !!(session && (hydrating || !savesReady))
    groceryEngine.setSoftPauseMul(pause ? 0 : 1)
    getSignalEngine().setSoftPauseMul(pause ? 0 : 1)
    return () => {
      groceryEngine.setSoftPauseMul(1)
      getSignalEngine().setSoftPauseMul(1)
    }
  }, [session, hydrating, savesReady])

  return null
}

function PresenceBridge() {
  const { user, savesReady } = useAuth()
  const loc = useLocation()
  useEffect(() => {
    if (!user || !savesReady) {
      stopPresence()
      return
    }
    let game: SocialGameId | null = null
    if (loc.pathname.startsWith('/play/grocery-empire')) game = 'grocery-empire'
    else if (loc.pathname.startsWith('/play/signal-decay')) game = 'signal-decay'
    startPresence(user.id, game)
    setPlayingGame(game)
    if (game) void publishPublicStats(user.id)
  }, [user, savesReady, loc.pathname])
  return null
}

/** Play / shop / awards / social need a signed-in Google account. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, user, savesReady, hydrating } = useAuth()
  if (!ready) return null
  if (!user) return <Navigate to="/" replace />
  if (hydrating || !savesReady) {
    return (
      <div className="account-gate account-gate--veil" role="status">
        <div className="account-gate__card account-gate__card--slim">
          <p className="account-gate__title">Opening your shelf…</p>
        </div>
      </div>
    )
  }
  return children
}

function AppRoutes() {
  return (
    <>
      <CloudReloadBridge />
      <PresenceBridge />
      <Routes>
        <Route path="/" element={<Shelf />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:id" element={<NewsPage />} />
        <Route path="/guide/:gameId/*" element={<GuidePage />} />
        <Route
          path="/play/:gameId/dev"
          element={
            <RequireAuth>
              <PlayPage />
            </RequireAuth>
          }
        />
        <Route
          path="/play/:gameId"
          element={
            <RequireAuth>
              <PlayPage />
            </RequireAuth>
          }
        />
        <Route
          path="/shop"
          element={
            <RequireAuth>
              <ShopPage />
            </RequireAuth>
          }
        />
        <Route
          path="/achievements"
          element={
            <RequireAuth>
              <AchievementsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/social"
          element={
            <RequireAuth>
              <SocialPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AppChrome />
      <HotkeyOverlay />
      <AccountGate />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MetaProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </MetaProvider>
    </AuthProvider>
  )
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AchievementsPage } from '@/shell/AchievementsPage'
import { GuidePage } from '@/shell/GuidePage'
import { HotkeyOverlay } from '@/shell/HotkeyOverlay'
import { MetaProvider } from '@/shell/MetaContext'
import { PlayPage } from '@/shell/PlayPage'
import { SettingsFab } from '@/shell/SettingsFab'
import { Shelf } from '@/shell/Shelf'
import { ShopPage } from '@/shell/ShopPage'

export default function App() {
  return (
    <MetaProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Shelf />} />
          <Route path="/play/:gameId/dev" element={<PlayPage />} />
          <Route path="/play/:gameId" element={<PlayPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/guide/:gameId" element={<GuidePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SettingsFab />
        <HotkeyOverlay />
      </BrowserRouter>
    </MetaProvider>
  )
}

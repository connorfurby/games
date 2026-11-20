import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { SegmentedControl } from '@/games/grocery-empire/ui/kit'
import { useAuth } from './AuthContext'
import { subscribeProfileOpen } from './profileBus'
import { Avatar } from './social/Avatar'
import { ProfileEditor, SettingsPanel } from './social/ProfileEditor'
import { nameOf } from './social/people'
import './profileSheet.css'
import './social/social.css'

/** Profile and settings, from any screen. */
export function ProfileSheetHost() {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'profile' | 'settings'>('profile')
  const titleId = useId()

  useEffect(() => subscribeProfileOpen(() => setOpen(true)), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open || !user || !profile) return null

  return (
    <div className="profile-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="profile-sheet__scrim" aria-label="Close profile" onClick={() => setOpen(false)} />
      <div className="profile-sheet__panel">
        <header className="profile-sheet__head">
          <div className="profile-sheet__who">
            <Avatar profile={profile} size={48} />
            <div>
              <p className="sd-eyebrow">Your profile</p>
              <h2 id={titleId}>{nameOf(profile)}</h2>
            </div>
          </div>
          <button type="button" className="profile-sheet__close" onClick={() => setOpen(false)}>
            Close
          </button>
        </header>
        <div className="profile-sheet__tabs">
          <SegmentedControl
            aria-label="Profile section"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'profile', label: 'Profile' },
              { value: 'settings', label: 'Privacy & alerts' },
            ]}
          />
          <Link to={`/social/u/${profile.handle}`} className="sc-btnlink" onClick={() => setOpen(false)}>
            View profile
          </Link>
        </div>
        <div className="profile-sheet__body">{tab === 'profile' ? <ProfileEditor /> : <SettingsPanel />}</div>
      </div>
    </div>
  )
}

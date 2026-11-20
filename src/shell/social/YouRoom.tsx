import { Link } from 'react-router-dom'
import { Button } from '@/games/grocery-empire/ui/kit'
import { useAuth } from '../AuthContext'
import { Notifications } from './Notifications'
import { ProfileEditor, SettingsPanel } from './ProfileEditor'

export function YouRoom() {
  const { profile, local, signOut } = useAuth()
  if (!profile) return null
  return (
    <div className="sc-grid">
      <div className="sc-col">
        <section className="sc-card">
          <header className="sc-section-head">
            <h3 className="sc-h2">Your profile</h3>
            <Link to={`/social/u/${profile.handle}`} className="sc-btnlink">
              See it as others do
            </Link>
          </header>
          <ProfileEditor />
        </section>
      </div>
      <div className="sc-col">
        <section className="sc-card" id="notifications">
          <Notifications />
        </section>
        <SettingsPanel />
        <section className="sc-card">
          <h3 className="sc-h3">Account</h3>
          {local ? (
            <p className="sc-muted">You’re playing on this device without an account. Everything here is a practice town.</p>
          ) : (
            <Button tone="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          )}
        </section>
      </div>
    </div>
  )
}

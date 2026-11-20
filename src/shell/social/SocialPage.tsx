import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/games/grocery-empire/ui/kit'
import { ShellFrame } from '../ShellFrame'
import { useAuth } from '../AuthContext'
import { Avatar } from './Avatar'
import { social } from './backend'
import { Notifications } from './Notifications'
import { firstName, presenceOf } from './people'
import { useSocial } from './SocialContext'
import './social.css'

const ROOMS = [
  { id: 'home', label: 'Home', to: '/social', end: true },
  { id: 'compete', label: 'Compete', to: '/social/compete', end: false },
  { id: 'boards', label: 'Leaderboards', short: 'Ranks', to: '/social/boards', end: false },
  { id: 'friends', label: 'Friends', to: '/social/friends', end: false },
  { id: 'you', label: 'You', to: '/social/you', end: false },
] as const

export function SocialGate({ children }: { children: React.ReactNode }) {
  const { ready, user, hydrating, savesReady, signInWithGoogle } = useAuth()
  if (!ready) return null
  if (!user) {
    return (
      <div className="sc-gate">
        <p className="sd-eyebrow sd-eyebrow--tomato">Social</p>
        <h2>Play with friends</h2>
        <ul className="sc-gate__list">
          <li>Weekly cups and head-to-head challenges</li>
          <li>Leaderboards for everyone, your friends and your leagues</li>
          <li>Run cards, reactions and profiles</li>
        </ul>
        <Button tone="primary" size="lg" onClick={() => void signInWithGoogle()}>
          Sign in with Google
        </Button>
      </div>
    )
  }
  if (hydrating || !savesReady) {
    return (
      <div className="sc-gate" role="status">
        <p className="sd-eyebrow">Social</p>
        <h2>Opening your shelf…</h2>
      </div>
    )
  }
  return children
}

/** Who you are, at a glance, plus the bell. */
function IdentityBar() {
  const { profile, local } = useAuth()
  const { friends, unread, challenges, ready } = useSocial()
  const [bell, setBell] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!bell) return
    const close = (e: MouseEvent) => {
      if (!bellRef.current?.contains(e.target as Node)) setBell(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setBell(false)
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [bell])
  if (!profile) return null
  const online = friends.filter((f) => ['playing', 'online'].includes(presenceOf(f.profile).kind)).length
  const live = challenges.filter((c) => c.status === 'active').length
  return (
    <header className="sc-id">
      <Link to={`/social/u/${profile.handle}`} className="sc-id__who" title="See your public profile">
        <Avatar profile={profile} size={56} />
        <span>
          <span className="sd-eyebrow sd-eyebrow--tomato">Social</span>
          <strong className="sc-id__hi">Hi, {firstName(profile)}</strong>
          <span className="sc-id__handle">@{profile.handle}</span>
        </span>
      </Link>
      <div className="sc-id__chips" aria-label="At a glance">
        <Link to="/social/friends" className="sc-id__chip">
          <strong>{ready ? online : '–'}</strong>
          <span>friends online</span>
        </Link>
        <Link to="/social/compete" className="sc-id__chip">
          <strong>{ready ? live : '–'}</strong>
          <span>live challenges</span>
        </Link>
      </div>
      <div className="sc-id__acts">
        <div className="sc-bell" ref={bellRef}>
          <button
            type="button"
            className={`sc-bell__btn${unread ? ' has-unread' : ''}`}
            aria-label={unread ? `${unread} new notifications` : 'Notifications'}
            aria-expanded={bell}
            onClick={() => setBell((v) => !v)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path
                d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 20a2 2 0 0 0 4 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            {unread ? <span className="sc-bell__n">{unread > 9 ? '9+' : unread}</span> : null}
          </button>
          {bell ? (
            <div className="sc-bell__panel" role="dialog" aria-label="Notifications">
              <Notifications compact onPick={() => setBell(false)} />
            </div>
          ) : null}
        </div>
        <Link to="/social/you" className="sc-btnlink">
          Edit profile
        </Link>
      </div>
      {local ? (
        <p className="sc-id__local">
          Practice town: this build has no account server, so these players are pretend and nothing leaves your browser.
        </p>
      ) : null}
    </header>
  )
}

/** Layout for `/social/*`. Rooms are real links so every view can be shared. */
export function SocialPage() {
  const { waiting, incoming } = useSocial()
  const challengesWaiting = waiting - incoming.length
  return (
    <ShellFrame title="Social">
      <div className="sd-page sc-page">
        <SocialGate>
          <IdentityBar />
          <nav className="sc-rooms" aria-label="Social rooms">
            {ROOMS.map((r) => {
              const badge = r.id === 'friends' ? incoming.length : r.id === 'compete' ? challengesWaiting : 0
              return (
                <NavLink key={r.id} to={r.to} end={r.end} className={({ isActive }) => `sc-rooms__btn${isActive ? ' is-on' : ''}`}>
                  {'short' in r ? (
                    <>
                      <span className="sc-rooms__long">{r.label}</span>
                      <span className="sc-rooms__short">{r.short}</span>
                    </>
                  ) : (
                    r.label
                  )}
                  {badge > 0 ? <span className="sc-rooms__badge">{badge}</span> : null}
                </NavLink>
              )
            })}
          </nav>
          <div className="sc-body">
            <Outlet />
          </div>
        </SocialGate>
      </div>
    </ShellFrame>
  )
}

/** `/social/add/:code` — an invite link: find the player and open their profile. */
export function AddByCode() {
  const { code = '' } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const loc = useLocation()
  const [msg, setMsg] = useState('Looking up that code…')
  useEffect(() => {
    if (!user) return
    void social()
      .search(code, user.id)
      .then((hits) => {
        const hit = hits.find((h) => h.friend_code === code.toUpperCase())
        if (hit) nav(`/social/u/${hit.handle}`, { replace: true, state: { from: loc.pathname } })
        else setMsg('No player has that code. Ask them to copy it again from their profile.')
      })
  }, [code, user, nav, loc.pathname])
  return <p className="sc-muted">{msg}</p>
}

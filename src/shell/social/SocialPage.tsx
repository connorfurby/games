import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ShellFrame } from '../ShellFrame'
import { useAuth } from '../AuthContext'
import './social.css'

const ROOMS = [
  { id: 'floor', label: 'Floor', to: '/social', end: true },
  { id: 'friends', label: 'Friends', to: '/social/friends', end: false },
  { id: 'boards', label: 'Boards', to: '/social/boards', end: false },
  { id: 'you', label: 'You', to: '/social/you', end: false },
] as const

const TITLES: Record<string, { title: string; lead: string }> = {
  '/social': {
    title: 'The floor',
    lead: 'Run cards, reactions, and the live chatter of the shelf.',
  },
  '/social/friends': {
    title: 'Friends',
    lead: 'Presence first — who’s playing, who’s waiting on a request.',
  },
  '/social/boards': {
    title: 'Boards',
    lead: 'One podium, two games. Pin your rank and filter the field.',
  },
  '/social/you': {
    title: 'You',
    lead: 'Identity, pinned awards, and the quiet pile of notifications.',
  },
}

export function SocialGate({ children }: { children: React.ReactNode }) {
  const { ready, user, hydrating, savesReady, signInWithGoogle } = useAuth()
  if (!ready) return null
  if (!user) {
    return (
      <div className="social-empty social-empty--gate">
        <p className="sd-eyebrow">Social</p>
        <h2>Sign in to join the floor</h2>
        <p>Friends, boards, and run cards live on your Google account — not a lonely browser tab.</p>
        <button type="button" className="auth-btn__google" onClick={() => void signInWithGoogle()}>
          Sign in with Google
        </button>
      </div>
    )
  }
  if (hydrating || !savesReady) {
    return (
      <div className="social-empty" role="status">
        <p className="sd-eyebrow">Social</p>
        <h2>Opening your shelf…</h2>
      </div>
    )
  }
  return children
}

/** Layout for `/social/*` — room tabs are real Links for deep-linking. */
export function SocialPage() {
  const loc = useLocation()
  const copy = TITLES[loc.pathname] ?? TITLES['/social']!

  return (
    <ShellFrame title="Social">
      <div className="sd-page social-page">
        <header className="social-page__head">
          <p className="sd-eyebrow sd-eyebrow--tomato">Social</p>
          <h1 className="sd-title">{copy.title}</h1>
          <p className="sd-lead">{copy.lead}</p>
        </header>

        <nav className="social-rooms" aria-label="Social rooms">
          {ROOMS.map((r) => (
            <NavLink
              key={r.id}
              to={r.to}
              end={r.end}
              className={({ isActive }) => `social-rooms__btn${isActive ? ' is-on' : ''}`}
            >
              {r.label}
            </NavLink>
          ))}
        </nav>

        <div className="social-page__body">
          <SocialGate>
            <Outlet />
          </SocialGate>
        </div>
      </div>
    </ShellFrame>
  )
}

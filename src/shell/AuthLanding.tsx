import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import './authLanding.css'

export function AuthLanding() {
  const { signInWithGoogle, configured, hydrateError } = useAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  return (
    <div className="auth-land">
      <div className="auth-land__glow" aria-hidden />
      <div className="auth-land__grain" aria-hidden />

      <header className="auth-land__top">
        <p className="auth-land__brand">GAMES</p>
        <nav className="auth-land__links" aria-label="Browse">
          <Link to="/news">News</Link>
          <Link to="/guide/grocery-empire">Guide</Link>
        </nav>
      </header>

      <main className="auth-land__hero">
        <p className="auth-land__eyebrow">One account · every run</p>
        <h1 className="auth-land__title">Your shelf lives on Google</h1>
        <p className="auth-land__lede">
          Sign in to play Grocery Empire and Signal Decay. Saves, awards, friends, and the boards all ride with
          your account — never a lonely browser tab.
        </p>

        <div className="auth-land__cta">
          <button
            type="button"
            className="auth-land__google"
            disabled={busy || !configured}
            onClick={async () => {
              setBusy(true)
              setErr(null)
              const { error } = await signInWithGoogle()
              if (error) setErr(error)
              setBusy(false)
            }}
          >
            <span className="auth-land__g" aria-hidden>
              G
            </span>
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
          {!configured ? (
            <p className="auth-land__hint" role="status">
              Accounts aren’t configured on this build.
            </p>
          ) : (
            <p className="auth-land__hint">Google is the only way in. No email passwords.</p>
          )}
          {err || hydrateError ? (
            <p className="auth-land__err" role="alert">
              {err ?? hydrateError}
            </p>
          ) : null}
        </div>

        <ul className="auth-land__perks">
          <li>
            <strong>Cloud saves</strong>
            <span>Both games sync to your account the moment you play.</span>
          </li>
          <li>
            <strong>Social floor</strong>
            <span>Friends, run cards, and reactions on the shelf.</span>
          </li>
          <li>
            <strong>Boards</strong>
            <span>A living leaderboard for baskets, eras, and airtime.</span>
          </li>
        </ul>
      </main>

      <aside className="auth-land__stage" aria-hidden>
        <div className="auth-land__card auth-land__card--a">
          <span>Grocery Empire</span>
          <strong>Era boards</strong>
        </div>
        <div className="auth-land__card auth-land__card--b">
          <span>Signal Decay</span>
          <strong>On-air ranks</strong>
        </div>
        <div className="auth-land__card auth-land__card--c">
          <span>Social</span>
          <strong>The floor</strong>
        </div>
      </aside>
    </div>
  )
}

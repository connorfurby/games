import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function AuthButton({ className = '' }: { className?: string }) {
  const { configured, ready, user, profile, hydrating, signInWithGoogle, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const labelId = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!configured || !ready) return null

  if (!user) {
    return (
      <div className={`auth-btn ${className}`.trim()}>
        <button
          type="button"
          className="auth-btn__google"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setErr(null)
            const { error } = await signInWithGoogle()
            if (error) setErr(error)
            setBusy(false)
          }}
        >
          {busy ? 'Opening Google…' : 'Sign in with Google'}
        </button>
        {err ? (
          <p className="auth-btn__err" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    )
  }

  const handle = profile?.handle ?? 'you'
  const avatar = profile?.avatar_url

  return (
    <div className={`auth-btn auth-btn--signed ${className}`.trim()}>
      <button
        ref={btnRef}
        type="button"
        className="auth-btn__avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={labelId}
        onClick={() => setOpen((v) => !v)}
        title={`@${handle}`}
      >
        {avatar ? (
          <img src={avatar} alt="" width={28} height={28} referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden>{handle.slice(0, 1).toUpperCase()}</span>
        )}
        {hydrating ? <span className="auth-btn__pulse" aria-hidden /> : null}
      </button>
      {open ? (
        <div ref={panelRef} id={labelId} className="auth-btn__menu" role="menu">
          <p className="auth-btn__who">
            <strong>@{handle}</strong>
            {profile?.friend_code ? <span className="auth-btn__code">{profile.friend_code}</span> : null}
          </p>
          <Link to="/social" role="menuitem" className="auth-btn__item" onClick={() => setOpen(false)}>
            Social
          </Link>
          <button
            type="button"
            role="menuitem"
            className="auth-btn__item"
            onClick={async () => {
              setOpen(false)
              await signOut()
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

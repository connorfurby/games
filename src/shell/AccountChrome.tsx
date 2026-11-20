import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { openProfileSheet } from './profileBus'
import { Avatar } from './social/Avatar'
import { nameOf } from './social/people'
import { useSocial } from './social/SocialContext'
import './social/social.css'

/**
 * Sign-in / avatar menu shared by the shelf bar and both in-play HUDs.
 * Profile opens the global ProfileSheet; Social deep-links to the floor.
 */
export function AccountChrome({
  className = '',
  tone = 'shell',
}: {
  className?: string
  /** shell = light-on-dark shelf bar; play = sits in game HUD controls */
  tone?: 'shell' | 'play'
}) {
  const { configured, local, ready, user, profile, hydrating, signInWithGoogle, signOut } = useAuth()
  const { waiting, unread } = useSocial()
  const loc = useLocation()
  const inPlay = loc.pathname.startsWith('/play/')
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

  if ((!configured && !local) || !ready) return null

  const root = `account-chrome account-chrome--${tone}${className ? ` ${className}` : ''}`

  if (!user) {
    return (
      <div className={root}>
        <button
          type="button"
          className="account-chrome__signin"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setErr(null)
            const { error } = await signInWithGoogle()
            if (error) setErr(error)
            setBusy(false)
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {err ? (
          <p className="account-chrome__err" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    )
  }

  const name = nameOf(profile)
  const badge = waiting + unread

  return (
    <div className={`${root} is-signed`}>
      <button
        ref={btnRef}
        type="button"
        className="account-chrome__avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={labelId}
        onClick={() => setOpen((v) => !v)}
        title={name}
        aria-label={badge ? `${name}, ${badge} new` : name}
      >
        <Avatar profile={profile} size={30} />
        {badge ? <span className="account-chrome__badge">{badge > 9 ? '9+' : badge}</span> : null}
        {hydrating ? <span className="account-chrome__pulse" aria-hidden /> : null}
      </button>
      {open ? (
        <div ref={panelRef} id={labelId} className="account-chrome__menu" role="menu">
          <div className="account-chrome__who">
            <Avatar profile={profile} size={40} />
            <span>
              <strong>{name}</strong>
              {profile ? <span className="account-chrome__code">@{profile.handle}</span> : null}
            </span>
          </div>
          <button
            type="button"
            role="menuitem"
            className="account-chrome__item"
            onClick={() => {
              setOpen(false)
              openProfileSheet()
            }}
          >
            Profile
          </button>
          <Link to="/social" role="menuitem" className="account-chrome__item" onClick={() => setOpen(false)}>
            Social
            {badge ? <span className="account-chrome__count">{badge > 9 ? '9+' : badge}</span> : null}
          </Link>
          {inPlay ? (
            <Link to="/" role="menuitem" className="account-chrome__item" onClick={() => setOpen(false)}>
              Shelf
            </Link>
          ) : null}
          {local ? null : (
            <button
              type="button"
              role="menuitem"
              className="account-chrome__item"
              onClick={async () => {
                setOpen(false)
                await signOut()
              }}
            >
              Sign out
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

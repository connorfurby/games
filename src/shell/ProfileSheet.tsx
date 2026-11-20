import { useEffect, useId, useState } from 'react'
import { ACHIEVEMENTS } from '@/achievements/registry'
import { useAuth } from './AuthContext'
import { useMeta } from './MetaContext'
import { subscribeProfileOpen } from './profileBus'
import './profileSheet.css'

export function ProfileSheetHost() {
  const { user, profile, updateProfile, refreshProfile } = useAuth()
  const { meta } = useMeta()
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const [handle, setHandle] = useState('')
  const [bio, setBio] = useState('')
  const [pinned, setPinned] = useState<string[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => subscribeProfileOpen(() => setOpen(true)), [])

  useEffect(() => {
    if (!open || !profile) return
    setHandle(profile.handle)
    setBio(profile.bio ?? '')
    setPinned(profile.pinned_awards ?? [])
    setMsg(null)
  }, [open, profile])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open || !user || !profile) return null

  const unlocked = Object.keys(meta.achievements ?? {})

  return (
    <div className="profile-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="profile-sheet__scrim" aria-label="Close profile" onClick={() => setOpen(false)} />
      <div className="profile-sheet__panel">
        <header className="profile-sheet__head">
          <div className="profile-sheet__who">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" width={48} height={48} referrerPolicy="no-referrer" />
            ) : (
              <span className="profile-sheet__glyph" aria-hidden>
                {profile.handle.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <p className="sd-eyebrow">Your profile</p>
              <h2 id={titleId}>@{profile.handle}</h2>
            </div>
          </div>
          <button type="button" className="profile-sheet__close" onClick={() => setOpen(false)}>
            Close
          </button>
        </header>

        <form
          className="profile-sheet__form"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setMsg(null)
            const { error } = await updateProfile({
              handle,
              bio,
              pinned_awards: pinned.slice(0, 3),
            })
            setBusy(false)
            setMsg(error ?? 'Saved.')
            if (!error) await refreshProfile()
          }}
        >
          <label>
            Handle
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))}
              maxLength={24}
              autoComplete="username"
            />
          </label>
          <label>
            Bio
            <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} maxLength={280} rows={3} />
          </label>

          <div className="profile-sheet__code">
            <span className="sd-eyebrow">Friend code</span>
            <strong>{profile.friend_code}</strong>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(profile.friend_code)
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1600)
                } catch {
                  setMsg('Could not copy.')
                }
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <fieldset>
            <legend>Pin up to three awards</legend>
            <div className="social-pins">
              {unlocked.slice(0, 24).map((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id)
                const on = pinned.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    className={`social-chip${on ? ' is-on' : ''}`}
                    onClick={() => {
                      setPinned((prev) => {
                        if (prev.includes(id)) return prev.filter((x) => x !== id)
                        if (prev.length >= 3) return prev
                        return [...prev, id]
                      })
                    }}
                  >
                    {a?.name ?? id}
                  </button>
                )
              })}
            </div>
            {!unlocked.length ? <p className="social-muted">Unlock awards in play to pin them here.</p> : null}
          </fieldset>

          <div className="profile-sheet__actions">
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save profile'}
            </button>
            {msg ? <p className="social-muted">{msg}</p> : null}
          </div>
        </form>
      </div>
    </div>
  )
}

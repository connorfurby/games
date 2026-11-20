import { useEffect, useState } from 'react'
import { ACHIEVEMENTS } from '@/achievements/registry'
import { loadGame } from '@/shared/save'
import { useAuth } from '../AuthContext'
import { useMeta } from '../MetaContext'
import { fetchNotifications, markNotificationsRead } from './api'
import { publishPublicStats } from './stats'

export function You() {
  const { user, profile, updateProfile, signInWithGoogle, refreshProfile } = useAuth()
  const { meta } = useMeta()
  const [handle, setHandle] = useState(profile?.handle ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [pinned, setPinned] = useState<string[]>(profile?.pinned_awards ?? [])
  const [msg, setMsg] = useState<string | null>(null)
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof fetchNotifications>>>([])

  useEffect(() => {
    setHandle(profile?.handle ?? '')
    setBio(profile?.bio ?? '')
    setPinned(profile?.pinned_awards ?? [])
  }, [profile])

  useEffect(() => {
    if (!user) return
    void publishPublicStats(user.id)
    void fetchNotifications(user.id).then(setNotes)
  }, [user])

  const grocery = loadGame<{ era?: number }>('grocery-empire')
  const signal = loadGame<{ era?: number }>('signal-decay')
  const unlocked = Object.keys(meta.achievements ?? {})

  if (!user || !profile) {
    return (
      <div className="social-empty">
        <p className="sd-eyebrow">You</p>
        <h2>Your shelf identity</h2>
        <p>Sign in with Google to set a handle, pin awards, and see notifications.</p>
        <button type="button" className="auth-btn__google" onClick={() => void signInWithGoogle()}>
          Sign in with Google
        </button>
      </div>
    )
  }

  return (
    <div className="social-you">
      <div className="social-you__hero">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" width={64} height={64} referrerPolicy="no-referrer" />
        ) : (
          <div className="social-you__glyph">{profile.handle.slice(0, 1).toUpperCase()}</div>
        )}
        <div>
          <p className="sd-eyebrow">Profile</p>
          <h2>@{profile.handle}</h2>
          <p className="social-muted">Code {profile.friend_code}</p>
        </div>
      </div>

      <form
        className="social-you__form"
        onSubmit={async (e) => {
          e.preventDefault()
          setMsg(null)
          const { error } = await updateProfile({
            handle,
            bio,
            pinned_awards: pinned.slice(0, 3),
          })
          setMsg(error ?? 'Saved.')
          await refreshProfile()
        }}
      >
        <label>
          Handle
          <input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} maxLength={24} />
        </label>
        <label>
          Bio
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={3} />
        </label>
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
        <button type="submit" className="btn btn--primary">
          Save profile
        </button>
        {msg ? <p className="social-muted">{msg}</p> : null}
      </form>

      <section>
        <h3 className="social-h3">Best eras</h3>
        <ul className="social-list">
          <li>
            <strong>Grocery Empire</strong>
            <span>Era {grocery?.era ?? 0}</span>
          </li>
          <li>
            <strong>Signal Decay</strong>
            <span>Era {signal?.era ?? 0}</span>
          </li>
        </ul>
      </section>

      <section>
        <div className="social-you__notes-head">
          <h3 className="social-h3">Notifications</h3>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={async () => {
              await markNotificationsRead(user.id)
              setNotes(await fetchNotifications(user.id))
            }}
          >
            Mark read
          </button>
        </div>
        <ul className="social-list">
          {notes.map((n) => (
            <li key={n.id} className={n.read_at ? undefined : 'is-unread'}>
              <div>
                <strong>@{n.actor?.handle ?? 'someone'}</strong> {n.body}
                <span className="social-muted">{new Date(n.created_at).toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
        {!notes.length ? <p className="social-muted">Quiet for now.</p> : null}
      </section>
    </div>
  )
}

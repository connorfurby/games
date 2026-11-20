import { useEffect, useState } from 'react'
import { ACHIEVEMENTS } from '@/achievements/registry'
import { loadGame } from '@/shared/save'
import { useAuth } from '../AuthContext'
import { openProfileSheet } from '../profileBus'
import { fetchNotifications, markNotificationsRead } from './api'
import { publishPublicStats } from './stats'

export function You() {
  const { user, profile } = useAuth()
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof fetchNotifications>>>([])

  useEffect(() => {
    if (!user) return
    void publishPublicStats(user.id)
    void fetchNotifications(user.id).then(setNotes)
  }, [user])

  const grocery = loadGame<{ era?: number }>('grocery-empire')
  const signal = loadGame<{ era?: number }>('signal-decay')

  if (!user || !profile) return null

  const pinned = (profile.pinned_awards ?? [])
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter(Boolean)

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
          <p className="social-muted">{profile.bio?.trim() || 'No bio yet.'}</p>
          <p className="social-muted">Code {profile.friend_code}</p>
        </div>
      </div>

      <div className="social-you__edit">
        <button type="button" className="btn btn--primary" onClick={() => openProfileSheet()}>
          Edit profile
        </button>
        <p className="social-muted">Handle, bio, and pinned awards open in the sheet from any screen.</p>
      </div>

      {pinned.length ? (
        <section>
          <h3 className="social-h3">Pinned awards</h3>
          <div className="social-pins">
            {pinned.map((a) => (
              <span key={a!.id} className="social-chip is-on">
                {a!.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="social-h3">Best eras</h3>
        <ul className="social-list">
          <li>
            <div>
              <strong>Grocery Empire</strong>
            </div>
            <span>Era {grocery?.era ?? 0}</span>
          </li>
          <li>
            <div>
              <strong>Signal Decay</strong>
            </div>
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

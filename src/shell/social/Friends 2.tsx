import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FriendshipRow, ProfileRow } from '@/shared/database.types'
import { useAuth } from '../AuthContext'
import {
  fetchProfilesByIds,
  findByFriendCode,
  listFriendships,
  removeFriendship,
  requestFriend,
  respondFriend,
  searchProfiles,
} from './api'
import { presenceLabel } from './presence'

export function Friends() {
  const { user, profile, signInWithGoogle } = useAuth()
  const [rows, setRows] = useState<FriendshipRow[]>([])
  const [profiles, setProfiles] = useState<Map<string, ProfileRow>>(new Map())
  const [query, setQuery] = useState('')
  const [code, setCode] = useState('')
  const [hits, setHits] = useState<ProfileRow[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    const list = await listFriendships(user.id)
    setRows(list)
    const ids = list.flatMap((f) => [f.requester_id, f.addressee_id]).filter((id) => id !== user.id)
    setProfiles(await fetchProfilesByIds(ids))
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  const incoming = useMemo(
    () => rows.filter((f) => f.status === 'pending' && f.addressee_id === user?.id),
    [rows, user?.id],
  )
  const accepted = useMemo(() => rows.filter((f) => f.status === 'accepted'), [rows])

  if (!user || !profile) {
    return (
      <div className="social-empty">
        <p className="sd-eyebrow">Friends</p>
        <h2>Add friends with Google</h2>
        <p>Your friend code appears after you sign in.</p>
        <button type="button" className="auth-btn__google" onClick={() => void signInWithGoogle()}>
          Sign in with Google
        </button>
      </div>
    )
  }

  return (
    <div className="social-friends">
      <div className="social-code-card">
        <p className="sd-eyebrow">Your friend code</p>
        <p className="social-code">{profile.friend_code}</p>
        <p className="social-muted">Share this eight-character code. Anyone with it can send you a request.</p>
      </div>

      <form
        className="social-search"
        onSubmit={async (e) => {
          e.preventDefault()
          setHits(await searchProfiles(query))
        }}
      >
        <label>
          <span className="sd-eyebrow">Search handle</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="player_name" />
        </label>
        <button type="submit" className="btn btn--ghost">
          Search
        </button>
      </form>

      <form
        className="social-search"
        onSubmit={async (e) => {
          e.preventDefault()
          setMsg(null)
          const found = await findByFriendCode(code)
          if (!found) {
            setMsg('No player with that code.')
            return
          }
          if (found.id === user.id) {
            setMsg('That’s your own code.')
            return
          }
          const { error } = await requestFriend(user.id, found.id)
          setMsg(error ?? `Request sent to @${found.handle}`)
          void reload()
        }}
      >
        <label>
          <span className="sd-eyebrow">Add by code</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD2345" maxLength={8} />
        </label>
        <button type="submit" className="btn btn--primary">
          Add
        </button>
      </form>
      {msg ? <p className="social-muted">{msg}</p> : null}

      {hits.length ? (
        <ul className="social-list">
          {hits.map((h) => (
            <li key={h.id}>
              <div>
                <strong>@{h.handle}</strong>
                <span className="social-muted">{presenceLabel(h.playing_game, h.last_seen_at)}</span>
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={h.id === user.id}
                onClick={async () => {
                  const { error } = await requestFriend(user.id, h.id)
                  setMsg(error ?? `Request sent to @${h.handle}`)
                  void reload()
                }}
              >
                Request
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {incoming.length ? (
        <section>
          <h3 className="social-h3">Incoming</h3>
          <ul className="social-list">
            {incoming.map((f) => {
              const p = profiles.get(f.requester_id)
              return (
                <li key={f.id}>
                  <div>
                    <strong>@{p?.handle ?? 'player'}</strong>
                  </div>
                  <div className="social-row-acts">
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={async () => {
                        await respondFriend(f.id, 'accepted', user.id, f.requester_id)
                        void reload()
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={async () => {
                        await respondFriend(f.id, 'blocked', user.id, f.requester_id)
                        void reload()
                      }}
                    >
                      Block
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="social-h3">Friends ({accepted.length})</h3>
        <ul className="social-list">
          {accepted.map((f) => {
            const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id
            const p = profiles.get(otherId)
            return (
              <li key={f.id}>
                <div>
                  <strong>@{p?.handle ?? 'player'}</strong>
                  <span className="social-muted">{presenceLabel(p?.playing_game ?? null, p?.last_seen_at ?? null)}</span>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={async () => {
                    await removeFriendship(f.id)
                    void reload()
                  }}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
        {!accepted.length ? <p className="social-muted">No friends yet — share your code.</p> : null}
      </section>
    </div>
  )
}

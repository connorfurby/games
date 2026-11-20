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
  const { user, profile } = useAuth()
  const [rows, setRows] = useState<FriendshipRow[]>([])
  const [profiles, setProfiles] = useState<Map<string, ProfileRow>>(new Map())
  const [query, setQuery] = useState('')
  const [code, setCode] = useState('')
  const [hits, setHits] = useState<ProfileRow[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const reload = useCallback(async () => {
    if (!user) return
    const list = await listFriendships(user.id)
    setRows(list)
    const ids = list.flatMap((f) => [f.requester_id, f.addressee_id]).filter((id) => id !== user.id)
    setProfiles(await fetchProfilesByIds(ids))
  }, [user])

  useEffect(() => {
    void reload()
    if (!user) return
    const id = window.setInterval(() => void reload(), 60_000)
    return () => window.clearInterval(id)
  }, [reload, user])

  const incoming = useMemo(
    () => rows.filter((f) => f.status === 'pending' && f.addressee_id === user?.id),
    [rows, user?.id],
  )
  const accepted = useMemo(() => rows.filter((f) => f.status === 'accepted'), [rows])

  const sortedFriends = useMemo(() => {
    return [...accepted].sort((a, b) => {
      const aId = a.requester_id === user?.id ? a.addressee_id : a.requester_id
      const bId = b.requester_id === user?.id ? b.addressee_id : b.requester_id
      const ap = profiles.get(aId)
      const bp = profiles.get(bId)
      const aLive = ap?.playing_game ? 0 : 1
      const bLive = bp?.playing_game ? 0 : 1
      if (aLive !== bLive) return aLive - bLive
      return (ap?.handle ?? '').localeCompare(bp?.handle ?? '')
    })
  }, [accepted, profiles, user?.id])

  if (!user || !profile) return null

  return (
    <div className="social-friends">
      {incoming.length ? (
        <section className="social-incoming">
          <h3 className="social-h3">Incoming requests</h3>
          <ul className="social-list">
            {incoming.map((f) => {
              const p = profiles.get(f.requester_id)
              return (
                <li key={f.id}>
                  <div>
                    <strong>@{p?.handle ?? 'player'}</strong>
                    <span className="social-muted">Wants to join your floor</span>
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

      <div className="social-code-card social-code-card--chip">
        <p className="sd-eyebrow">Your friend code</p>
        <div className="social-code-row">
          <p className="social-code">{profile.friend_code}</p>
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
        <p className="social-muted">Share this eight-character code. Anyone with it can send you a request.</p>
      </div>

      <section>
        <h3 className="social-h3">On the floor ({sortedFriends.length})</h3>
        <ul className="social-list social-list--presence">
          {sortedFriends.map((f) => {
            const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id
            const p = profiles.get(otherId)
            const label = presenceLabel(p?.playing_game ?? null, p?.last_seen_at ?? null)
            const live = !!p?.playing_game
            return (
              <li key={f.id} className={live ? 'is-live' : undefined}>
                <div>
                  <strong>@{p?.handle ?? 'player'}</strong>
                  <span className={`social-presence${live ? ' is-live' : ''}`}>{label}</span>
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
        {!sortedFriends.length ? (
          <p className="social-muted">No friends yet — share your code or search a handle.</p>
        ) : null}
      </section>

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
    </div>
  )
}

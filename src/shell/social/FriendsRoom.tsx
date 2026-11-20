import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/games/grocery-empire/ui/kit'
import type { ProfileRow } from '@/shared/database.types'
import { useAuth } from '../AuthContext'
import { Avatar, PlayerName } from './Avatar'
import { social } from './backend'
import { ChallengeComposer } from './ChallengeComposer'
import type { Suggestion } from './model'
import { nameOf, presenceOf } from './people'
import { useSocial } from './SocialContext'

/** The one button a row needs, chosen by how you're related. */
export function RelationButton({ profile, size = 'sm' }: { profile: ProfileRow; size?: 'sm' | 'md' }) {
  const { relationTo, addFriend, answerFriend, removeFriend } = useSocial()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const { relation, friendship } = relationTo(profile.id)
  const run = async (p: Promise<string | null>) => {
    setBusy(true)
    const err = await p
    setBusy(false)
    setMsg(err)
  }
  if (relation === 'self') return null
  const btn =
    relation === 'friends' ? (
      <span className="sc-pill is-friends">Friends</span>
    ) : relation === 'incoming' ? (
      <Button size={size} tone="primary" disabled={busy} onClick={() => run(answerFriend(friendship!, 'accepted'))}>
        Accept
      </Button>
    ) : relation === 'outgoing' ? (
      <Button size={size} tone="ghost" disabled={busy} onClick={() => run(removeFriend(friendship!))} title="Cancel your request">
        Requested
      </Button>
    ) : relation === 'blocked' ? (
      <span className="sc-pill">Blocked</span>
    ) : (
      <Button size={size} tone="primary" disabled={busy} onClick={() => run(addFriend(profile.id))}>
        Add friend
      </Button>
    )
  return (
    <span className="sc-relbtn">
      {btn}
      {msg ? <span className="sc-err">{msg}</span> : null}
    </span>
  )
}

/** One person in a list. */
export function PersonRow({ profile, sub, right }: { profile: ProfileRow | null; sub?: React.ReactNode; right?: React.ReactNode }) {
  const pr = presenceOf(profile)
  return (
    <li className="sc-person">
      <Avatar profile={profile} size={40} presence />
      <span className="sc-person__main">
        <PlayerName profile={profile} />
        <span className={`sc-person__sub${pr.kind === 'playing' || pr.kind === 'online' ? ' is-live' : ''}`}>{sub ?? pr.label}</span>
      </span>
      {right ? <span className="sc-person__right">{right}</span> : null}
    </li>
  )
}

function InviteCard() {
  const { profile } = useAuth()
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  if (!profile) return null
  const link = `${window.location.origin}/social/add/${profile.friend_code}`
  const copy = async (what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'code' ? profile.friend_code : link)
      setCopied(what)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      /* clipboard blocked: the text is on screen to copy by hand */
    }
  }
  return (
    <section className="sc-card sc-invite">
      <h3 className="sc-h3">Invite a friend</h3>
      <p className="sc-muted">Send your link, or read out your code. They land on your profile with an Add button.</p>
      <div className="sc-invite__code" aria-label="Your friend code">
        {profile.friend_code.split('').map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </div>
      <div className="sc-invite__acts">
        <Button tone="primary" onClick={() => copy('link')}>
          {copied === 'link' ? 'Link copied' : 'Copy invite link'}
        </Button>
        <Button tone="ghost" onClick={() => copy('code')}>
          {copied === 'code' ? 'Code copied' : 'Copy code'}
        </Button>
        {typeof navigator !== 'undefined' && 'share' in navigator ? (
          <Button
            tone="ghost"
            onClick={() =>
              void navigator.share({ title: 'Add me on the shelf', text: `Add me: ${nameOf(profile)}`, url: link }).catch(() => {})
            }
          >
            Share…
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function FindPeople() {
  const { user } = useAuth()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<ProfileRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!user) return
    const term = q.trim()
    if (term.length < 2) {
      setHits(null)
      return
    }
    setBusy(true)
    const id = window.setTimeout(() => {
      void social()
        .search(term, user.id)
        .then((r) => {
          setHits(r)
          setBusy(false)
        })
    }, 250)
    return () => window.clearTimeout(id)
  }, [q, user])
  return (
    <section className="sc-card sc-find">
      <h3 className="sc-h3">Find people</h3>
      <div className="sc-search">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          className="sc-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, @handle or friend code"
          aria-label="Search players"
          autoComplete="off"
        />
      </div>
      {hits ? (
        hits.length ? (
          <ul className="sc-people">
            {hits.map((h) => (
              <PersonRow key={h.id} profile={h} right={<RelationButton profile={h} />} />
            ))}
          </ul>
        ) : (
          <p className="sc-muted">{busy ? 'Searching…' : 'Nobody by that name. Codes are eight letters and numbers.'}</p>
        )
      ) : (
        <p className="sc-muted">People who hide from search can still be added with their code.</p>
      )}
    </section>
  )
}

function Suggestions() {
  const { user } = useAuth()
  const { friends } = useSocial()
  const [list, setList] = useState<Suggestion[]>([])
  useEffect(() => {
    if (!user) return
    void social().suggestions(user.id).then(setList)
  }, [user, friends.length])
  if (!list.length) return null
  return (
    <section className="sc-card">
      <h3 className="sc-h3">People you may know</h3>
      <ul className="sc-suggest">
        {list.slice(0, 8).map((s) => (
          <li key={s.profile.id} className="sc-suggest__card">
            <Avatar profile={s.profile} size={48} presence />
            <PlayerName profile={s.profile} />
            <span className="sc-muted">
              {s.reason === 'mutual' ? `${s.mutual} mutual friend${s.mutual === 1 ? '' : 's'}` : 'Near your era'}
            </span>
            <RelationButton profile={s.profile} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function FriendsRoom() {
  const { friends, incoming, outgoing, answerFriend, removeFriend, ready } = useSocial()
  const [challenge, setChallenge] = useState<ProfileRow | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const sorted = useMemo(() => {
    const rank = (p: ProfileRow | null) => {
      const k = presenceOf(p).kind
      return k === 'playing' ? 0 : k === 'online' ? 1 : k === 'recent' ? 2 : 3
    }
    return [...friends].sort((a, b) => rank(a.profile) - rank(b.profile) || nameOf(a.profile).localeCompare(nameOf(b.profile)))
  }, [friends])
  const live = sorted.filter((f) => ['playing', 'online'].includes(presenceOf(f.profile).kind))
  const rest = sorted.filter((f) => !live.includes(f))

  return (
    <div className="sc-grid">
      <div className="sc-col">
        {incoming.length ? (
          <section className="sc-card sc-card--hot">
            <h3 className="sc-h3">Asking to be friends ({incoming.length})</h3>
            <ul className="sc-people">
              {incoming.map((f) => (
                <PersonRow
                  key={f.friendship.id}
                  profile={f.profile}
                  right={
                    <>
                      <Button size="sm" tone="primary" onClick={() => void answerFriend(f.friendship, 'accepted')}>
                        Accept
                      </Button>
                      <Button size="sm" tone="ghost" onClick={() => void removeFriend(f.friendship)}>
                        Not now
                      </Button>
                    </>
                  }
                />
              ))}
            </ul>
          </section>
        ) : null}

        <section className="sc-card">
          <h3 className="sc-h3">Your friends ({friends.length})</h3>
          {!ready ? <p className="sc-muted">Loading…</p> : null}
          {ready && !friends.length ? <p className="sc-muted">No friends yet. Search for someone, or send your invite link.</p> : null}
          {live.length ? <p className="sc-sub">On now</p> : null}
          <ul className="sc-people">
            {[...live, ...rest].map((f, i) => (
              <FriendRow
                key={f.friendship.id}
                first={i === live.length && live.length > 0}
                f={f}
                confirming={confirmRemove === f.friendship.id}
                onChallenge={() => setChallenge(f.profile)}
                onAskRemove={() => setConfirmRemove(f.friendship.id)}
                onCancelRemove={() => setConfirmRemove(null)}
                onRemove={() => void removeFriend(f.friendship).then(() => setConfirmRemove(null))}
              />
            ))}
          </ul>
        </section>

        {outgoing.length ? (
          <section className="sc-card">
            <h3 className="sc-h3">Requests you sent ({outgoing.length})</h3>
            <ul className="sc-people">
              {outgoing.map((f) => (
                <PersonRow
                  key={f.friendship.id}
                  profile={f.profile}
                  sub="Waiting for them"
                  right={
                    <Button size="sm" tone="ghost" onClick={() => void removeFriend(f.friendship)}>
                      Cancel
                    </Button>
                  }
                />
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div className="sc-col">
        <FindPeople />
        <InviteCard />
        <Suggestions />
      </div>

      {challenge ? <ChallengeComposer opponent={challenge} onClose={() => setChallenge(null)} /> : null}
    </div>
  )
}

function FriendRow({
  f,
  first,
  confirming,
  onChallenge,
  onAskRemove,
  onCancelRemove,
  onRemove,
}: {
  f: ReturnType<typeof useSocial>['friends'][number]
  first: boolean
  confirming: boolean
  onChallenge: () => void
  onAskRemove: () => void
  onCancelRemove: () => void
  onRemove: () => void
}) {
  return (
    <>
      {first ? (
        <li className="sc-sub" aria-hidden>
          Everyone else
        </li>
      ) : null}
      <PersonRow
        profile={f.profile}
        right={
          confirming ? (
            <>
              <Button size="sm" tone="danger" onClick={onRemove}>
                Remove
              </Button>
              <Button size="sm" tone="ghost" onClick={onCancelRemove}>
                Keep
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" tone="primary" onClick={onChallenge}>
                Challenge
              </Button>
              <Button size="sm" tone="ghost" onClick={onAskRemove} title={`Remove ${nameOf(f.profile)} from friends`}>
                Remove
              </Button>
            </>
          )
        }
      />
    </>
  )
}

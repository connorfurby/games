import { useCallback, useEffect, useState } from 'react'
import { Button, SegmentedControl } from '@/games/grocery-empire/ui/kit'
import type { PostVisibility, ReactionKind, RunCard, SocialGameId } from '@/shared/database.types'
import { useAuth } from '../AuthContext'
import { Avatar, PlayerName } from './Avatar'
import { social } from './backend'
import type { CommentWithAuthor, PostWithAuthor } from './model'
import { GAME_NAME, firstName, playTime, settingsOf, timeAgo } from './people'
import { runCardFromLocal } from './stats'

const REACTIONS: { kind: ReactionKind; icon: string; label: string }[] = [
  { kind: 'stamp', icon: '✦', label: 'Stamp' },
  { kind: 'basket', icon: '🧺', label: 'Basket' },
  { kind: 'static', icon: '📡', label: 'Static' },
]

export type FeedFilter = 'all' | 'friends' | 'mine' | { author: string }

export function RunCardView({ card }: { card: RunCard }) {
  return (
    <div className={`sc-runcard is-${card.gameId}`}>
      <span className="sd-eyebrow">{GAME_NAME[card.gameId]}</span>
      <strong className="sc-runcard__era">Era {card.era}</strong>
      <span className="sc-runcard__headline">{card.headline}</span>
      <span className="sc-muted">{playTime(card.playSec)} played</span>
    </div>
  )
}

function Comments({ post, onChange }: { post: PostWithAuthor; onChange: () => void }) {
  const { user } = useAuth()
  const [list, setList] = useState<CommentWithAuthor[] | null>(null)
  const [body, setBody] = useState('')
  const load = useCallback(() => void social().comments(post.id).then(setList), [post.id])
  useEffect(load, [load])
  if (!user) return null
  return (
    <div className="sc-comments">
      {list === null ? <p className="sc-muted">Loading…</p> : null}
      <ul>
        {(list ?? []).map((c) => (
          <li key={c.id}>
            <Avatar profile={c.author} size={24} />
            <div>
              <PlayerName profile={c.author} handle={false} /> <span className="sc-muted">{timeAgo(c.created_at)}</span>
              <p>{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="sc-inline-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!body.trim()) return
          await social().addComment(post.id, user.id, body.trim(), post.author_id)
          setBody('')
          load()
          onChange()
        }}
      >
        <input
          className="sc-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={280}
          placeholder="Write a reply"
          aria-label="Reply"
        />
        <Button type="submit" tone="secondary" disabled={!body.trim()}>
          Reply
        </Button>
      </form>
    </div>
  )
}

function Post({ p, onChange }: { p: PostWithAuthor; onChange: () => void }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [local, setLocal] = useState(p.reactions ?? [])
  useEffect(() => setLocal(p.reactions ?? []), [p.reactions])
  if (!user) return null
  const mine = p.author_id === user.id
  const react = async (kind: ReactionKind) => {
    const cur = local.find((r) => r.kind === kind)
    const on = !cur?.mine
    setLocal((rs) => {
      const has = rs.some((r) => r.kind === kind)
      const base = has ? rs : [...rs, { kind, count: 0, mine: false }]
      return base.map((r) => (r.kind === kind ? { ...r, mine: on, count: Math.max(0, r.count + (on ? 1 : -1)) } : r))
    })
    await social().toggleReaction(p.id, user.id, kind, on, p.author_id)
  }
  return (
    <li className="sc-post">
      <header className="sc-post__head">
        <Avatar profile={p.author} size={40} presence />
        <div className="sc-post__who">
          <PlayerName profile={p.author} />
          <span className="sc-muted">
            {timeAgo(p.created_at)} · {p.visibility === 'public' ? 'Everyone' : 'Friends'}
          </span>
        </div>
        {mine ? (
          confirm ? (
            <span className="sc-row">
              <Button size="sm" tone="danger" onClick={() => void social().deletePost(p.id).then(onChange)}>
                Delete
              </Button>
              <Button size="sm" tone="ghost" onClick={() => setConfirm(false)}>
                Keep
              </Button>
            </span>
          ) : (
            <Button size="sm" tone="ghost" onClick={() => setConfirm(true)} title="Delete this post">
              Delete
            </Button>
          )
        ) : null}
      </header>
      {p.body ? <p className="sc-post__body">{p.body}</p> : null}
      {p.run_card ? <RunCardView card={p.run_card} /> : null}
      <div className="sc-post__acts">
        {REACTIONS.map((r) => {
          const st = local.find((x) => x.kind === r.kind)
          return (
            <button
              key={r.kind}
              type="button"
              className={`sc-react${st?.mine ? ' is-on' : ''}`}
              aria-pressed={!!st?.mine}
              onClick={() => void react(r.kind)}
              title={r.label}
            >
              <span aria-hidden>{r.icon}</span>
              <span>{st?.count ? st.count : r.label}</span>
            </button>
          )
        })}
        <button type="button" className={`sc-react${open ? ' is-on' : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span aria-hidden>💬</span>
          <span>{p.commentCount ? `${p.commentCount} repl${p.commentCount === 1 ? 'y' : 'ies'}` : 'Reply'}</span>
        </button>
      </div>
      {open ? <Comments post={p} onChange={onChange} /> : null}
    </li>
  )
}

export function Composer({ onPosted }: { onPosted: () => void }) {
  const { user, profile } = useAuth()
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<PostVisibility>(settingsOf(profile).default_visibility)
  const [attach, setAttach] = useState<SocialGameId | 'none'>('none')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  if (!user) return null
  const cards = (['grocery-empire', 'signal-decay'] as SocialGameId[]).filter((g) => runCardFromLocal(g))
  const card = attach !== 'none' ? runCardFromLocal(attach) : null
  return (
    <form
      className="sc-card sc-composer"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setErr(null)
        const { error } = await social().createPost({ authorId: user.id, body: body.trim(), visibility, runCard: card })
        setBusy(false)
        if (error) return setErr(error)
        setBody('')
        setAttach('none')
        onPosted()
      }}
    >
      <div className="sc-composer__top">
        <Avatar profile={profile} size={40} />
        <textarea
          className="sc-input sc-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={`What’s happening in your store, ${firstName(profile)}?`}
          aria-label="New post"
        />
      </div>
      {card ? <RunCardView card={card} /> : null}
      <div className="sc-composer__row">
        {cards.length ? (
          <SegmentedControl
            aria-label="Attach a run"
            value={attach}
            onChange={setAttach}
            options={[
              { value: 'none' as const, label: 'No run' },
              ...cards.map((g) => ({ value: g, label: g === 'grocery-empire' ? 'Grocery run' : 'Signal run' })),
            ]}
          />
        ) : null}
        <SegmentedControl
          aria-label="Who sees it"
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'friends' as const, label: 'Friends' },
            { value: 'public' as const, label: 'Everyone' },
          ]}
        />
        <Button type="submit" tone="primary" disabled={busy || (!body.trim() && !card)}>
          Post
        </Button>
      </div>
      {err ? <p className="sc-err">{err}</p> : null}
    </form>
  )
}

export function Feed({ filter, empty, reloadKey = 0 }: { filter: FeedFilter; empty?: React.ReactNode; reloadKey?: number }) {
  const { user } = useAuth()
  const [posts, setPosts] = useState<PostWithAuthor[] | null>(null)
  const key = typeof filter === 'string' ? filter : filter.author
  const load = useCallback(() => {
    if (!user) return
    void social().feed(user.id, filter).then(setPosts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, key])
  useEffect(() => {
    load()
    const id = window.setInterval(load, 45_000)
    return () => window.clearInterval(id)
  }, [load, reloadKey])
  if (posts === null)
    return (
      <ul className="sc-feed" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <li key={i} className="sc-post sc-skeleton sc-skeleton--post" />
        ))}
      </ul>
    )
  if (!posts.length) return <>{empty ?? <p className="sc-card sc-muted">Nothing here yet.</p>}</>
  return (
    <ul className="sc-feed">
      {posts.map((p) => (
        <Post key={p.id} p={p} onChange={load} />
      ))}
    </ul>
  )
}

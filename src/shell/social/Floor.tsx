import { useCallback, useEffect, useState } from 'react'
import type { ReactionKind, SocialGameId } from '@/shared/database.types'
import { useAuth } from '../AuthContext'
import {
  addComment,
  createPost,
  fetchComments,
  fetchFeed,
  milestoneShared,
  shareMilestone,
  toggleReaction,
  type PostWithAuthor,
} from './api'
import { runCardFromLocal } from './stats'

const REACT_LABEL: Record<ReactionKind, string> = {
  stamp: 'Stamp',
  basket: 'Basket',
  static: 'Static',
}

export function Floor() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState<PostWithAuthor[]>([])
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<'friends' | 'public'>('friends')
  const [attach, setAttach] = useState<SocialGameId | null>('grocery-empire')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [commentBody, setCommentBody] = useState('')
  const [comments, setComments] = useState<Awaited<ReturnType<typeof fetchComments>>>([])
  const [shareEra, setShareEra] = useState<{ gameId: SocialGameId; era: number } | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    setPosts(await fetchFeed(user.id))
  }, [user])

  useEffect(() => {
    void reload()
    if (!user) return
    const id = window.setInterval(() => void reload(), 45_000)
    return () => window.clearInterval(id)
  }, [reload, user])

  useEffect(() => {
    if (!user) return
    const card = runCardFromLocal('grocery-empire') ?? runCardFromLocal('signal-decay')
    if (!card || card.era < 1) return
    void milestoneShared(user.id, card.gameId, card.era).then((shared) => {
      if (!shared) setShareEra({ gameId: card.gameId, era: card.era })
    })
  }, [user])

  if (!user) return null

  return (
    <div className="social-floor">
      {shareEra ? (
        <div className="social-share-era">
          <p>
            You reached <strong>Era {shareEra.era}</strong> in{' '}
            {shareEra.gameId === 'grocery-empire' ? 'Grocery Empire' : 'Signal Decay'}.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={async () => {
              const card = runCardFromLocal(shareEra.gameId)
              await shareMilestone(user.id, shareEra.gameId, shareEra.era)
              await createPost({
                authorId: user.id,
                body: `Just hit Era ${shareEra.era}.`,
                visibility: 'friends',
                runCard: card,
              })
              setShareEra(null)
              void reload()
            }}
          >
            Share this era
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setShareEra(null)}>
            Not now
          </button>
        </div>
      ) : null}

      <form
        className="social-composer social-composer--sticky"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setErr(null)
          const card = attach ? runCardFromLocal(attach) : null
          const { error } = await createPost({
            authorId: user.id,
            body,
            visibility,
            runCard: card,
          })
          setBusy(false)
          if (error) {
            setErr(error)
            return
          }
          setBody('')
          void reload()
        }}
      >
        <label className="social-composer__label">
          <span className="sd-eyebrow">Compose</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={`What’s on the shelf, @${profile?.handle ?? 'you'}?`}
          />
        </label>
        <div className="social-composer__row">
          <label>
            Visibility
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'friends' | 'public')}>
              <option value="friends">Friends</option>
              <option value="public">Public</option>
            </select>
          </label>
          <label>
            Run card
            <select
              value={attach ?? ''}
              onChange={(e) => setAttach((e.target.value || null) as SocialGameId | null)}
            >
              <option value="">None</option>
              <option value="grocery-empire">Grocery Empire</option>
              <option value="signal-decay">Signal Decay</option>
            </select>
          </label>
          <button type="submit" className="btn btn--primary" disabled={busy || (!body.trim() && !attach)}>
            Post
          </button>
        </div>
        {err ? <p className="social-err">{err}</p> : null}
      </form>

      <ul className="social-feed">
        {posts.map((p) => (
          <li key={p.id} className="social-post">
            <header>
              <strong>@{p.author?.handle ?? 'player'}</strong>
              <time dateTime={p.created_at}>{new Date(p.created_at).toLocaleString()}</time>
            </header>
            {p.body ? <p>{p.body}</p> : null}
            {p.run_card ? (
              <div className="social-run-card social-run-card--hero">
                <span className="sd-eyebrow">
                  {p.run_card.gameId === 'grocery-empire' ? 'Grocery Empire' : 'Signal Decay'}
                </span>
                <strong>Era {p.run_card.era}</strong>
                <span>{p.run_card.headline}</span>
                <span>{Math.floor(p.run_card.playSec / 60)}m played</span>
              </div>
            ) : null}
            <div className="social-post__acts">
              {(p.reactions ?? []).map((r) => (
                <button
                  key={r.kind}
                  type="button"
                  className={`social-react${r.mine ? ' is-on' : ''}`}
                  onClick={async () => {
                    await toggleReaction(p.id, user.id, r.kind, !r.mine, p.author_id)
                    void reload()
                  }}
                >
                  {REACT_LABEL[r.kind]} {r.count || ''}
                </button>
              ))}
              <button
                type="button"
                className="social-react"
                onClick={async () => {
                  setOpenComments(p.id)
                  setComments(await fetchComments(p.id))
                }}
              >
                Comments {p.commentCount ? p.commentCount : ''}
              </button>
            </div>
            {openComments === p.id ? (
              <div className="social-comments">
                <ul>
                  {comments.map((c) => (
                    <li key={c.id}>
                      <strong>@{c.author?.handle ?? 'player'}</strong> {c.body}
                    </li>
                  ))}
                </ul>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!commentBody.trim()) return
                    await addComment(p.id, user.id, commentBody, p.author_id)
                    setCommentBody('')
                    setComments(await fetchComments(p.id))
                    void reload()
                  }}
                >
                  <input
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    maxLength={280}
                    placeholder="Reply…"
                  />
                  <button type="submit" className="btn btn--ghost">
                    Send
                  </button>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {!posts.length ? (
        <div className="social-empty social-empty--inline">
          <p className="sd-eyebrow">First post</p>
          <h2>The floor is quiet</h2>
          <p>
            Share a run card from Grocery Empire or Signal Decay — friends will see it here. Keep the
            composer sticky while you scroll later.
          </p>
        </div>
      ) : null}
    </div>
  )
}

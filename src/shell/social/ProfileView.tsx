import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ACHIEVEMENTS } from '@/achievements/registry'
import { Button } from '@/games/grocery-empire/ui/kit'
import type { ProfileRow, PublicStatsRow, SocialGameId } from '@/shared/database.types'
import { useAuth } from '../AuthContext'
import { Avatar } from './Avatar'
import { social } from './backend'
import { ChallengeComposer } from './ChallengeComposer'
import { Feed } from './Feed'
import { RelationButton } from './FriendsRoom'
import type { CupResult } from './model'
import { GAME_NAME, accentOf, count, firstName, isoWeekKey, metricValue, nameOf, percentile, playTime, presenceOf } from './people'
import { useSocial } from './SocialContext'

function GameStats({ row, userId }: { row: PublicStatsRow; userId: string }) {
  const [rank, setRank] = useState<{ rank: number; total: number } | null>(null)
  useEffect(() => {
    void social()
      .board({ gameId: row.game_id, metric: 'revenue', scope: 'global', limit: 1, week: isoWeekKey(), selfId: userId })
      .then((b) => setRank(b.me ? { rank: b.me.rank, total: b.total } : null))
      .catch(() => setRank(null))
  }, [row.game_id, userId])
  const revenue = row.revenue_num ?? Number(row.lifetime_revenue) ?? 0
  const pct = rank ? percentile(rank.rank, rank.total) : null
  return (
    <div className={`sc-gamestat is-${row.game_id}`}>
      <header>
        <strong>{GAME_NAME[row.game_id]}</strong>
        {rank ? (
          <span className="sc-pill">
            #{rank.rank} overall{pct ? ` · ${pct}` : ''}
          </span>
        ) : null}
      </header>
      <dl>
        <div>
          <dt>Era</dt>
          <dd>{row.era}</dd>
        </div>
        <div>
          <dt>All-time sales</dt>
          <dd>{metricValue('revenue', revenue, row.game_id)}</dd>
        </div>
        <div>
          <dt>This week</dt>
          <dd>{metricValue('week', row.week_gain ?? 0, row.game_id)}</dd>
        </div>
        <div>
          <dt>{row.game_id === 'signal-decay' ? 'Signals' : 'Baskets'}</dt>
          <dd>{count(row.headline_count)}</dd>
        </div>
        <div>
          <dt>Played</dt>
          <dd>{playTime(row.play_seconds)}</dd>
        </div>
        {row.achievements ? (
          <div>
            <dt>Awards</dt>
            <dd>{row.achievements}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

export function ProfileView() {
  const { handle = '' } = useParams()
  const { user } = useAuth()
  const { relationTo } = useSocial()
  const [p, setP] = useState<ProfileRow | null | undefined>(undefined)
  const [stats, setStats] = useState<PublicStatsRow[]>([])
  const [trophies, setTrophies] = useState<CupResult[]>([])
  const [challenge, setChallenge] = useState(false)
  useEffect(() => {
    setP(undefined)
    void social()
      .getProfileByHandle(handle.toLowerCase())
      .then(async (row) => {
        setP(row)
        if (!row) return
        const [s, t] = await Promise.all([social().statsFor(row.id), social().trophies(row.id)])
        setStats(s)
        setTrophies(t)
      })
  }, [handle])
  if (p === undefined) return <div className="sc-card sc-skeleton sc-skeleton--hero" aria-label="Loading" />
  if (!p)
    return (
      <div className="sc-card sc-empty">
        <h3 className="sc-h3">No one goes by @{handle}</h3>
        <p className="sc-muted">They may have changed their handle. Try searching by name.</p>
        <Link to="/social/friends" className="sc-btnlink">
          Find people
        </Link>
      </div>
    )
  const me = user?.id === p.id
  const rel = relationTo(p.id).relation
  const pr = presenceOf(p)
  const pinned = (p.pinned_awards ?? []).map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a)
  const canSee = me || rel === 'friends'
  return (
    <div className="sc-profile" style={{ ['--accent' as string]: accentOf(p) }}>
      <section className="sc-card sc-hero">
        <div className="sc-hero__band" aria-hidden />
        <div className="sc-hero__body">
          <Avatar profile={p} size={88} presence />
          <div className="sc-hero__id">
            <h2 className="sc-h1">{nameOf(p)}</h2>
            <span className="sc-handle">@{p.handle}</span>
            {pr.label ? (
              <span className={`sc-hero__presence${pr.kind === 'playing' || pr.kind === 'online' ? ' is-live' : ''}`}>{pr.label}</span>
            ) : null}
          </div>
          <div className="sc-hero__acts">
            {me ? (
              <Link to="/social/you" className="sc-btnlink">
                Edit profile
              </Link>
            ) : (
              <>
                <RelationButton profile={p} size="md" />
                {rel === 'friends' ? (
                  <Button tone="free" onClick={() => setChallenge(true)}>
                    Challenge
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
        {p.bio?.trim() ? <p className="sc-hero__bio">{p.bio}</p> : null}
        <p className="sc-muted sc-hero__meta">
          {p.favorite_game ? `Mostly plays ${GAME_NAME[p.favorite_game as SocialGameId]} · ` : ''}
          Joined {new Date(p.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
        {pinned.length ? (
          <div className="sc-chips">
            {pinned.map((a) => (
              <span key={a.id} className="sc-chip is-on is-static" title={a.blurb}>
                ★ {a.name}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <div className="sc-grid">
        <div className="sc-col">
          {stats.length ? (
            stats.map((s) => <GameStats key={s.game_id} row={s} userId={p.id} />)
          ) : (
            <p className="sc-card sc-muted">
              {me ? 'Play a bit and your numbers show up here.' : `${firstName(p)} hasn’t posted any scores yet.`}
            </p>
          )}
          {trophies.length ? (
            <section className="sc-card sc-trophies">
              <h3 className="sc-h3">Trophies</h3>
              <ul>
                {trophies.map((t) => (
                  <li key={`${t.game_id}-${t.week_key}`} className={`is-${t.place}`}>
                    <span className="sc-trophy" aria-hidden>
                      {t.place}
                    </span>
                    {['1st', '2nd', '3rd'][t.place - 1]} · {GAME_NAME[t.game_id]} · {t.week_key.replace('-W', ' week ')}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <div className="sc-col">
          <h3 className="sc-h3">{me ? 'Your posts' : `${firstName(p)}’s posts`}</h3>
          <Feed
            filter={{ author: p.id }}
            empty={
              <p className="sc-card sc-muted">
                {canSee ? 'No posts yet.' : `Become friends to see posts ${firstName(p)} shares with friends.`}
              </p>
            }
          />
        </div>
      </div>
      {challenge ? <ChallengeComposer opponent={p} onClose={() => setChallenge(false)} /> : null}
    </div>
  )
}

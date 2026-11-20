import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SocialGameId } from '@/shared/database.types'
import { useAuth } from '../AuthContext'
import { fetchLeaderboard, listFriendships } from './api'
import { publishPublicStats } from './stats'

type Metric = 'lifetime_revenue' | 'headline_count' | 'era' | 'play_seconds' | 'daily_challenge_baskets'
type Scope = 'everyone' | 'friends'

const METRICS: { id: Metric; label: string; games: SocialGameId[] }[] = [
  { id: 'lifetime_revenue', label: 'Lifetime', games: ['grocery-empire', 'signal-decay'] },
  { id: 'headline_count', label: 'Baskets / Calls', games: ['grocery-empire', 'signal-decay'] },
  { id: 'era', label: 'Era', games: ['grocery-empire', 'signal-decay'] },
  { id: 'play_seconds', label: 'Play time', games: ['grocery-empire', 'signal-decay'] },
  { id: 'daily_challenge_baskets', label: 'Daily challenge', games: ['grocery-empire'] },
]

function formatMetric(metric: Metric, row: {
  lifetime_revenue: string
  headline_count: number
  era: number
  play_seconds: number
  daily_challenge_baskets: number | null
  week_start_score: string
}): { main: string; week?: string } {
  const weekGain = () => {
    const now = Number(row.lifetime_revenue)
    const start = Number(row.week_start_score)
    if (!Number.isFinite(now) || !Number.isFinite(start)) return undefined
    const gain = Math.max(0, now - start)
    return gain > 0 ? `+${gain.toLocaleString()} this week` : undefined
  }
  switch (metric) {
    case 'lifetime_revenue':
      return { main: Number(row.lifetime_revenue).toLocaleString(), week: weekGain() }
    case 'headline_count':
      return { main: Math.floor(row.headline_count).toLocaleString() }
    case 'era':
      return { main: `Era ${row.era}` }
    case 'play_seconds': {
      const h = Math.floor(row.play_seconds / 3600)
      const m = Math.floor((row.play_seconds % 3600) / 60)
      return { main: h > 0 ? `${h}h ${m}m` : `${m}m` }
    }
    case 'daily_challenge_baskets':
      return { main: Math.floor(row.daily_challenge_baskets ?? 0).toLocaleString() }
  }
}

export function Boards() {
  const { user } = useAuth()
  const [gameId, setGameId] = useState<SocialGameId>('grocery-empire')
  const [metric, setMetric] = useState<Metric>('lifetime_revenue')
  const [scope, setScope] = useState<Scope>('everyone')
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchLeaderboard>>>([])
  const [loading, setLoading] = useState(false)

  const metrics = useMemo(() => METRICS.filter((m) => m.games.includes(gameId)), [gameId])

  const reload = useCallback(async () => {
    if (!user) {
      setRows([])
      return
    }
    setLoading(true)
    await publishPublicStats(user.id)
    let friendIds: string[] | null = null
    if (scope === 'friends') {
      const fs = await listFriendships(user.id)
      friendIds = fs
        .filter((f) => f.status === 'accepted')
        .map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id))
      friendIds.push(user.id)
    }
    setRows(await fetchLeaderboard(gameId, metric, friendIds))
    setLoading(false)
  }, [user, gameId, metric, scope])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!metrics.some((m) => m.id === metric)) setMetric(metrics[0]?.id ?? 'lifetime_revenue')
  }, [metrics, metric])

  if (!user) return null

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)
  const myIndex = rows.findIndex((r) => r.user_id === user.id)
  const myRow = myIndex >= 0 ? rows[myIndex] : null
  const myRank = myIndex >= 0 ? myIndex + 1 : null

  return (
    <div className="social-boards">
      <div className="social-boards__compose" role="group" aria-label="Board filters">
        <div className="social-chips social-chips--games">
          <button
            type="button"
            className={`social-chip${gameId === 'grocery-empire' ? ' is-on' : ''}`}
            onClick={() => setGameId('grocery-empire')}
          >
            Grocery Empire
          </button>
          <button
            type="button"
            className={`social-chip${gameId === 'signal-decay' ? ' is-on' : ''}`}
            onClick={() => setGameId('signal-decay')}
          >
            Signal Decay
          </button>
        </div>
        <div className="social-chips">
          {metrics.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`social-chip${metric === m.id ? ' is-on' : ''}`}
              onClick={() => setMetric(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="social-chips social-chips--scope" role="group" aria-label="Who appears">
          <button
            type="button"
            className={`social-chip${scope === 'everyone' ? ' is-on' : ''}`}
            onClick={() => setScope('everyone')}
          >
            Everyone
          </button>
          <button
            type="button"
            className={`social-chip${scope === 'friends' ? ' is-on' : ''}`}
            onClick={() => setScope('friends')}
            title="Only accepted friends plus you"
          >
            Friends only
          </button>
        </div>
        <p className="social-muted social-boards__hint">
          {scope === 'friends'
            ? 'Showing accepted friends and your own rank.'
            : 'Public board — anyone who published stats.'}
        </p>
      </div>

      {loading ? <p className="social-muted">Loading board…</p> : null}

      {myRow && myRank != null ? (
        <div className="social-you-pin social-you-pin--always" aria-live="polite">
          <span className="sd-eyebrow">Your rank</span>
          <strong>#{myRank}</strong>
          <span>@{myRow.profile?.handle ?? 'you'}</span>
          <span className="social-rank__score">{formatMetric(metric, myRow).main}</span>
        </div>
      ) : null}

      <div className="social-podium" aria-label="Top three">
        {[1, 0, 2].map((podiumIndex) => {
          const row = top3[podiumIndex]
          const place = podiumIndex + 1
          const fmt = row ? formatMetric(metric, row) : null
          return (
            <div key={place} className={`social-podium__slot social-podium__slot--${place}`}>
              <span className="social-podium__place">#{place}</span>
              {row ? (
                <>
                  <strong>@{row.profile?.handle ?? 'player'}</strong>
                  <span className="social-podium__score">{fmt?.main}</span>
                  {fmt?.week ? <span className="social-week">{fmt.week}</span> : null}
                </>
              ) : (
                <span className="social-muted">Open seat</span>
              )}
            </div>
          )
        })}
      </div>

      <ol className="social-rank">
        {rest.map((row, i) => {
          const fmt = formatMetric(metric, row)
          const rank = i + 4
          return (
            <li key={row.user_id} className={row.user_id === user.id ? 'is-you' : undefined}>
              <span className="social-rank__n">{rank}</span>
              <strong>@{row.profile?.handle ?? 'player'}</strong>
              <span className="social-rank__score">{fmt.main}</span>
              {fmt.week ? <span className="social-week">{fmt.week}</span> : null}
            </li>
          )
        })}
      </ol>

      {!rows.length && !loading ? (
        <p className="social-muted">No scores yet. Play a bit, then refresh — stats publish from your save.</p>
      ) : null}
    </div>
  )
}

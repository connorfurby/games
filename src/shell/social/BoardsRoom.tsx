import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SegmentedControl } from '@/games/grocery-empire/ui/kit'
import { socialGames } from '@/shell/beta'
import type { SocialGameId } from '@/shared/database.types'
import { useAuth } from '../AuthContext'
import { Avatar, PlayerName } from './Avatar'
import { social } from './backend'
import type { Board, BoardEntry, BoardMetric, BoardScope } from './model'
import { BOARD_METRICS, GAME_NAME, isoWeekKey, metricValue, nameOf, percentile, timeLeft, weekEndsAt } from './people'
import { useSocial } from './SocialContext'
import { publishPublicStats } from './stats'

/** Board data for a filter, re-read when the filter changes and every minute. */
export function useBoard(gameId: SocialGameId, metric: BoardMetric, scope: BoardScope, leagueId: string | undefined, limit = 50) {
  const { user } = useAuth()
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!user) return
    let stop = false
    const load = async () => {
      setLoading(true)
      await publishPublicStats(user.id)
      const b = await social()
        .board({ gameId, metric, scope, leagueId, limit, week: isoWeekKey(), selfId: user.id })
        .catch(() => ({ entries: [], total: 0, me: null }) as Board)
      if (!stop) {
        setBoard(b)
        setLoading(false)
      }
    }
    void load()
    const id = window.setInterval(() => void load(), 60_000)
    return () => {
      stop = true
      window.clearInterval(id)
    }
  }, [user, gameId, metric, scope, leagueId, limit])
  return { board, loading }
}

function Podium({ entries, metric, gameId }: { entries: BoardEntry[]; metric: BoardMetric; gameId: SocialGameId }) {
  const order = [1, 0, 2]
  return (
    <ol className="sc-podium" aria-label="Top three">
      {order.map((i) => {
        const e = entries[i]
        return (
          <li key={i} className={`sc-podium__slot is-${i + 1}${e?.isMe ? ' is-me' : ''}`}>
            {e ? (
              <>
                <span className="sc-podium__medal">{i + 1}</span>
                <Avatar profile={e.profile} size={i === 0 ? 72 : 56} />
                <PlayerName profile={e.profile} handle={false} />
                <strong className="sc-podium__v">{metricValue(metric, e.value, gameId)}</strong>
              </>
            ) : (
              <span className="sc-muted">Open spot</span>
            )}
            <span className="sc-podium__block" aria-hidden />
          </li>
        )
      })}
    </ol>
  )
}

export function BoardRows({
  entries,
  metric,
  gameId,
  me,
}: {
  entries: BoardEntry[]
  metric: BoardMetric
  gameId: SocialGameId
  me: BoardEntry | null
}) {
  const meShown = entries.some((e) => e.isMe)
  return (
    <>
      <ol className="sc-board">
        {entries.map((e) => (
          <BoardRow key={e.userId} e={e} metric={metric} gameId={gameId} />
        ))}
      </ol>
      {me && !meShown ? (
        <ol className="sc-board sc-board--me" aria-label="Your place">
          <BoardRow e={me} metric={metric} gameId={gameId} />
        </ol>
      ) : null}
    </>
  )
}

function BoardRow({ e, metric, gameId }: { e: BoardEntry; metric: BoardMetric; gameId: SocialGameId }) {
  return (
    <li className={`sc-board__row${e.isMe ? ' is-me' : ''}${e.isFriend ? ' is-friend' : ''}`}>
      <span className="sc-board__rank">{e.rank}</span>
      <Avatar profile={e.profile} size={32} presence />
      <span className="sc-board__who">
        <PlayerName profile={e.profile} />
        {e.isMe ? <span className="sc-pill is-me">You</span> : e.isFriend ? <span className="sc-pill is-friends">Friend</span> : null}
      </span>
      {metric !== 'era' ? <span className="sc-board__era">Era {e.era}</span> : null}
      <strong className="sc-board__v">{metricValue(metric, e.value, gameId)}</strong>
    </li>
  )
}

/** Where you stand, and who's just ahead. */
function Standing({ board, metric, gameId }: { board: Board; metric: BoardMetric; gameId: SocialGameId }) {
  const me = board.me
  if (!me)
    return (
      <div className="sc-standing">
        <div>
          <span className="sd-eyebrow">Your place</span>
          <strong>Not on this board yet</strong>
          <span className="sc-muted">Play {GAME_NAME[gameId]} for a minute and you’ll show up here.</span>
        </div>
      </div>
    )
  const ahead = board.entries.find((e) => e.rank === me.rank - 1)
  const pct = percentile(me.rank, board.total)
  return (
    <div className="sc-standing">
      <div>
        <span className="sd-eyebrow">Your place</span>
        <strong className="sc-standing__rank">#{me.rank}</strong>
        <span className="sc-muted">
          of {board.total}
          {pct ? ` · ${pct}` : ''}
        </span>
      </div>
      <div>
        <span className="sd-eyebrow">You</span>
        <strong>{metricValue(metric, me.value, gameId)}</strong>
      </div>
      <div className="sc-standing__next">
        {me.rank === 1 ? (
          <span>You’re on top. Hold it.</span>
        ) : ahead ? (
          <span>
            {metricValue(metric, Math.max(0, ahead.value - me.value), gameId)} behind <strong>{nameOf(ahead.profile)}</strong> for #
            {ahead.rank}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function BoardsRoom() {
  const [params, setParams] = useSearchParams()
  const { leagues, canPlay } = useSocial()
  const games = socialGames(canPlay('signal-decay'))
  const requested = (params.get('game') as SocialGameId) || 'grocery-empire'
  const gameId = games.includes(requested) ? requested : 'grocery-empire'
  const metrics = BOARD_METRICS.filter((m) => m.games.includes(gameId))
  const metric = (metrics.find((m) => m.id === params.get('metric'))?.id ?? 'week') as BoardMetric
  const scopeParam = params.get('scope') ?? 'global'
  const league = leagues.find((l) => l.id === scopeParam)
  const scope: BoardScope = league ? 'league' : scopeParam === 'friends' ? 'friends' : 'global'
  const { board, loading } = useBoard(league?.game_id ?? gameId, metric, scope, league?.id)
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    next.set(k, v)
    setParams(next, { replace: true })
  }
  const m = metrics.find((x) => x.id === metric)!
  const shownGame = league?.game_id ?? gameId
  const top = useMemo(() => board?.entries.slice(0, 3) ?? [], [board])
  const rest = useMemo(() => board?.entries.slice(3) ?? [], [board])

  return (
    <div className="sc-boards">
      <div className="sc-card sc-filters">
        <div className="sc-filters__row">
          {games.length > 1 ? (
            <SegmentedControl
              aria-label="Game"
              value={gameId}
              onChange={(v) => set('game', v)}
              options={games.map((g) => ({ value: g, label: GAME_NAME[g] }))}
            />
          ) : null}
          <div className="sc-chips" role="group" aria-label="Who">
            <button type="button" className={`sc-chip${scope === 'global' ? ' is-on' : ''}`} onClick={() => set('scope', 'global')}>
              Everyone
            </button>
            <button type="button" className={`sc-chip${scope === 'friends' ? ' is-on' : ''}`} onClick={() => set('scope', 'friends')}>
              Friends
            </button>
            {leagues.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`sc-chip${league?.id === l.id ? ' is-on' : ''}`}
                onClick={() => set('scope', l.id)}
                title={`League · ${GAME_NAME[l.game_id]}`}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
        <div className="sc-chips sc-chips--metrics" role="group" aria-label="Ranked by">
          {metrics.map((x) => (
            <button key={x.id} type="button" className={`sc-chip${metric === x.id ? ' is-on' : ''}`} onClick={() => set('metric', x.id)}>
              {x.label}
            </button>
          ))}
        </div>
        <p className="sc-muted">
          {m.blurb}
          {metric === 'week' ? ` Ends in ${timeLeft(weekEndsAt().toISOString()).replace(' left', '')}.` : ''}
          {league ? ` ${league.name} plays ${GAME_NAME[league.game_id]}.` : ''}
        </p>
      </div>

      {board ? <Standing board={board} metric={metric} gameId={shownGame} /> : null}

      {loading && !board ? (
        <ol className="sc-board is-loading" aria-label="Loading">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="sc-board__row sc-skeleton" />
          ))}
        </ol>
      ) : board && board.entries.length ? (
        <>
          <Podium entries={top} metric={metric} gameId={shownGame} />
          <BoardRows entries={rest} metric={metric} gameId={shownGame} me={board.entries.some((e) => e.isMe) ? null : board.me} />
        </>
      ) : (
        <div className="sc-card sc-empty">
          <h3 className="sc-h3">{scope === 'friends' ? 'No friends on this board yet' : 'Nobody here yet'}</h3>
          <p className="sc-muted">
            {scope === 'friends'
              ? 'Add friends from the Friends tab and they’ll show up here.'
              : 'Play a little and your score appears within a minute.'}
          </p>
        </div>
      )}
    </div>
  )
}

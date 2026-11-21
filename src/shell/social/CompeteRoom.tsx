import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, SegmentedControl } from '@/games/grocery-empire/ui/kit'
import { socialGames } from '@/shell/beta'
import type { SocialGameId } from '@/shared/database.types'
import { useAuth } from '../AuthContext'
import { Avatar, PlayerName } from './Avatar'
import { social } from './backend'
import { useBoard } from './BoardsRoom'
import { ChallengeComposer } from './ChallengeComposer'
import type { ChallengeView, CupResult, LeagueView } from './model'
import { CHALLENGE_METRICS, GAME_NAME, metricValue, nameOf, timeLeft, weekEndsAt } from './people'
import { useSocial } from './SocialContext'

const PLACE = ['1st', '2nd', '3rd']

/** The weekly cup: sales since Monday; the top three each week go in the record book. */
function WeeklyCup() {
  const { profile } = useAuth()
  const { canPlay } = useSocial()
  const games = socialGames(canPlay('signal-decay'))
  const [game, setGame] = useState<SocialGameId>((profile?.favorite_game as SocialGameId) ?? 'grocery-empire')
  const shown = games.includes(game) ? game : 'grocery-empire'
  const { board } = useBoard(shown, 'week', 'global', undefined, 5)
  const [past, setPast] = useState<CupResult[]>([])
  useEffect(() => {
    void social().cupResults(shown, 4).then(setPast)
  }, [shown])
  const weeks = [...new Set(past.map((p) => p.week_key))]
  const me = board?.me
  return (
    <section className="sc-card sc-cup">
      <header className="sc-cup__head">
        <div>
          <span className="sd-eyebrow sd-eyebrow--tag">Weekly cup</span>
          <h3 className="sc-h2">{GAME_NAME[shown]}</h3>
          <p className="sc-muted">Most sales earned this week. Ends in {timeLeft(weekEndsAt().toISOString()).replace(' left', '')}.</p>
        </div>
        {games.length > 1 ? (
          <SegmentedControl
            aria-label="Cup game"
            value={shown}
            onChange={setGame}
            options={games.map((g) => ({
              value: g,
              label: g === 'grocery-empire' ? 'Grocery' : 'Signal',
            }))}
          />
        ) : null}
      </header>
      {me ? (
        <div className="sc-cup__me">
          <strong>#{me.rank}</strong>
          <span>
            You’ve earned <strong>{metricValue('week', me.value, shown)}</strong> this week
            {board && me.rank > 3 && board.entries[2]
              ? ` · ${metricValue('week', Math.max(0, board.entries[2].value - me.value), shown)} to the podium`
              : ''}
          </span>
        </div>
      ) : null}
      <ol className="sc-mini">
        {(board?.entries ?? []).map((e) => (
          <li key={e.userId} className={e.isMe ? 'is-me' : ''}>
            <span className="sc-mini__rank">{e.rank}</span>
            <Avatar profile={e.profile} size={26} />
            <PlayerName profile={e.profile} handle={false} />
            <strong>{metricValue('week', e.value, shown)}</strong>
          </li>
        ))}
      </ol>
      <Link to={`/social/boards?game=${shown}&metric=week`} className="sc-link">
        Full cup standings →
      </Link>
      {weeks.length ? (
        <div className="sc-cup__past">
          <span className="sd-eyebrow">Past winners</span>
          <ul>
            {weeks.map((w) => {
              const row = past.filter((p) => p.week_key === w).sort((a, b) => a.place - b.place)
              return (
                <li key={w}>
                  <span className="sc-muted">{w.replace('-W', ' · week ')}</span>
                  {row.map((r) => (
                    <span
                      key={r.place}
                      className={`sc-cup__winner is-${r.place}`}
                      title={`${PLACE[r.place - 1]} · ${metricValue('week', r.score, game)}`}
                    >
                      <Avatar profile={r.profile} size={22} />
                      {nameOf(r.profile)}
                    </span>
                  ))}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function Duel({ c, me }: { c: ChallengeView; me: string }) {
  const { refresh } = useSocial()
  const [busy, setBusy] = useState(false)
  const mine = c.creator_id === me
  const you = { p: mine ? c.creator : c.opponent, v: mine ? c.creatorProgress : c.opponentProgress }
  const them = { p: mine ? c.opponent : c.creator, v: mine ? c.opponentProgress : c.creatorProgress }
  const metric = CHALLENGE_METRICS.find((m) => m.id === c.metric)!
  const max = Math.max(1, you.v, them.v)
  const act = async (a: 'accept' | 'decline' | 'cancel') => {
    setBusy(true)
    await social().answerChallenge(c.id, me, a)
    await refresh()
    setBusy(false)
  }
  const head =
    c.status === 'pending'
      ? mine
        ? `Waiting for ${nameOf(them.p)}`
        : `${nameOf(them.p)} challenged you`
      : c.status === 'active'
        ? you.v > them.v
          ? 'You’re ahead'
          : you.v < them.v
            ? `${nameOf(them.p)} is ahead`
            : 'Dead even'
        : c.winner_id === me
          ? 'You won'
          : c.winner_id
            ? `${nameOf(them.p)} won`
            : 'Draw'
  return (
    <li className={`sc-duel is-${c.status}${c.status === 'done' ? (c.winner_id === me ? ' is-won' : c.winner_id ? ' is-lost' : '') : ''}`}>
      <div className="sc-duel__head">
        <strong>{head}</strong>
        <span className="sc-muted">
          {metric.label} · {GAME_NAME[c.game_id]} ·{' '}
          {c.status === 'active' && c.ends_at ? timeLeft(c.ends_at) : `${c.hours === 168 ? '1 week' : c.hours === 72 ? '3 days' : '1 day'}`}
        </span>
      </div>
      {c.message ? <p className="sc-duel__msg">“{c.message}”</p> : null}
      {c.status === 'active' || c.status === 'done' ? (
        <div className="sc-duel__bars">
          {[
            { who: you.p, v: you.v, label: 'You' },
            { who: them.p, v: them.v, label: nameOf(them.p) },
          ].map((x) => (
            <div key={x.label} className="sc-duel__bar">
              <Avatar profile={x.who} size={28} />
              <span className="sc-duel__name">{x.label}</span>
              <span className="sc-duel__track">
                <i style={{ width: `${(x.v / max) * 100}%` }} />
              </span>
              <strong>{metricValue(c.metric, x.v, c.game_id)}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {c.status === 'pending' ? (
        <div className="sc-duel__acts">
          {mine ? (
            <Button size="sm" tone="ghost" disabled={busy} onClick={() => act('cancel')}>
              Withdraw
            </Button>
          ) : (
            <>
              <Button size="sm" tone="free" disabled={busy} onClick={() => act('accept')}>
                Accept
              </Button>
              <Button size="sm" tone="ghost" disabled={busy} onClick={() => act('decline')}>
                Decline
              </Button>
            </>
          )}
        </div>
      ) : null}
    </li>
  )
}

function Challenges() {
  const { user } = useAuth()
  const { challenges, v2 } = useSocial()
  const [compose, setCompose] = useState(false)
  if (!user) return null
  const waiting = challenges.filter((c) => c.status === 'pending' && c.opponent_id === user.id)
  const live = challenges.filter((c) => c.status === 'active')
  const sent = challenges.filter((c) => c.status === 'pending' && c.creator_id === user.id)
  const done = challenges.filter((c) => c.status === 'done').slice(0, 6)
  const record = done.reduce(
    (a, c) => ({ w: a.w + (c.winner_id === user.id ? 1 : 0), l: a.l + (c.winner_id && c.winner_id !== user.id ? 1 : 0) }),
    { w: 0, l: 0 },
  )
  return (
    <section className="sc-card">
      <header className="sc-section-head">
        <div>
          <h3 className="sc-h2">Challenges</h3>
          <p className="sc-muted">Head to head with a friend. {done.length ? `Recent record: ${record.w}–${record.l}.` : ''}</p>
        </div>
        <Button
          tone="free"
          onClick={() => setCompose(true)}
          disabled={!v2}
          title={!v2 ? 'Challenges need the latest server update.' : undefined}
        >
          New challenge
        </Button>
      </header>
      {[...waiting, ...live, ...sent].length ? (
        <ul className="sc-duels">
          {[...waiting, ...live, ...sent].map((c) => (
            <Duel key={c.id} c={c} me={user.id} />
          ))}
        </ul>
      ) : (
        <p className="sc-muted">No challenges running. Pick a friend, a game and a few days, and see who sells more.</p>
      )}
      {done.length ? (
        <>
          <p className="sc-sub">Finished</p>
          <ul className="sc-duels sc-duels--done">
            {done.map((c) => (
              <Duel key={c.id} c={c} me={user.id} />
            ))}
          </ul>
        </>
      ) : null}
      {compose ? <ChallengeComposer onClose={() => setCompose(false)} /> : null}
    </section>
  )
}

function LeagueCard({ l }: { l: LeagueView }) {
  const { user } = useAuth()
  const { refresh } = useSocial()
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)
  return (
    <li className="sc-league">
      <div className="sc-league__head">
        <strong>{l.name}</strong>
        <span className="sc-muted">
          {GAME_NAME[l.game_id]} · {l.members} member{l.members === 1 ? '' : 's'}
        </span>
      </div>
      {l.motto ? <p className="sc-duel__msg">“{l.motto}”</p> : null}
      <p className="sc-league__line">
        {l.myRank ? (
          <>
            You’re <strong>#{l.myRank}</strong> this week
          </>
        ) : (
          'No score yet this week'
        )}
        {l.leader ? <> · {nameOf(l.leader)} leads</> : null}
      </p>
      <div className="sc-league__acts">
        <Link to={`/social/boards?scope=${l.id}&metric=week`} className="sc-btnlink">
          Standings
        </Link>
        <Button
          size="sm"
          tone="ghost"
          onClick={async () => {
            await navigator.clipboard?.writeText(l.code).catch(() => {})
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          }}
          title="Friends join with this code"
        >
          {copied ? 'Copied' : `Code ${l.code}`}
        </Button>
        {leaving ? (
          <>
            <Button
              size="sm"
              tone="danger"
              onClick={async () => {
                if (!user) return
                await social().leaveLeague(user.id, l.id)
                await refresh()
              }}
            >
              Leave
            </Button>
            <Button size="sm" tone="ghost" onClick={() => setLeaving(false)}>
              Stay
            </Button>
          </>
        ) : (
          <Button size="sm" tone="ghost" onClick={() => setLeaving(true)}>
            Leave
          </Button>
        )}
      </div>
    </li>
  )
}

function Leagues() {
  const { user, profile } = useAuth()
  const { leagues, refresh, v2, canPlay } = useSocial()
  const games = socialGames(canPlay('signal-decay'))
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none')
  const [name, setName] = useState('')
  const [motto, setMotto] = useState('')
  const [game, setGame] = useState<SocialGameId>((profile?.favorite_game as SocialGameId) ?? 'grocery-empire')
  const shown = games.includes(game) ? game : 'grocery-empire'
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)
  if (!user) return null
  return (
    <section className="sc-card">
      <header className="sc-section-head">
        <div>
          <h3 className="sc-h2">Leagues</h3>
          <p className="sc-muted">Private boards for a group: a class, a team, a group chat. Ranked by sales this week.</p>
        </div>
        <div className="sc-row">
          <Button tone="secondary" disabled={!v2} onClick={() => setMode(mode === 'join' ? 'none' : 'join')}>
            Join
          </Button>
          <Button tone="secondary" disabled={!v2} onClick={() => setMode(mode === 'create' ? 'none' : 'create')}>
            Start one
          </Button>
        </div>
      </header>
      {mode === 'join' ? (
        <form
          className="sc-inline-form"
          onSubmit={async (e) => {
            e.preventDefault()
            setErr(null)
            const { error } = await social().joinLeague(user.id, code)
            if (error) return setErr(error)
            setCode('')
            setMode('none')
            await refresh()
          }}
        >
          <input
            className="sc-input sc-input--code"
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 6),
              )
            }
            placeholder="League code"
            aria-label="League code"
          />
          <Button type="submit" tone="free" disabled={code.length !== 6}>
            Join league
          </Button>
        </form>
      ) : null}
      {mode === 'create' ? (
        <form
          className="sc-form"
          onSubmit={async (e) => {
            e.preventDefault()
            setErr(null)
            const { error } = await social().createLeague(user.id, name, shown, motto)
            if (error) return setErr(error)
            setName('')
            setMotto('')
            setMode('none')
            await refresh()
          }}
        >
          <label className="sc-form__field">
            <span className="sc-form__label">Name</span>
            <input
              className="sc-input"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="Night Shift Grocers"
            />
          </label>
          <label className="sc-form__field">
            <span className="sc-form__label">Motto (optional)</span>
            <input className="sc-input" value={motto} maxLength={80} onChange={(e) => setMotto(e.target.value)} />
          </label>
          {games.length > 1 ? (
            <div className="sc-form__field">
              <span className="sc-form__label">Game</span>
              <SegmentedControl
                aria-label="League game"
                value={shown}
                onChange={setGame}
                options={games.map((g) => ({ value: g, label: GAME_NAME[g] }))}
              />
            </div>
          ) : null}
          <Button type="submit" tone="free" disabled={name.trim().length < 3}>
            Create league
          </Button>
        </form>
      ) : null}
      {err ? <p className="sc-err">{err}</p> : null}
      {leagues.length ? (
        <ul className="sc-leagues">
          {leagues.map((l) => (
            <LeagueCard key={l.id} l={l} />
          ))}
        </ul>
      ) : mode === 'none' ? (
        <p className="sc-muted">You’re not in a league yet. Start one and share its code.</p>
      ) : null}
    </section>
  )
}

function Trophies() {
  const { user } = useAuth()
  const [list, setList] = useState<CupResult[]>([])
  useEffect(() => {
    if (user) void social().trophies(user.id).then(setList)
  }, [user])
  if (!list.length) return null
  return (
    <section className="sc-card sc-trophies">
      <h3 className="sc-h3">Your trophies</h3>
      <ul>
        {list.map((t) => (
          <li key={`${t.game_id}-${t.week_key}`} className={`is-${t.place}`}>
            <span className="sc-trophy" aria-hidden>
              {t.place}
            </span>
            {PLACE[t.place - 1]} · {GAME_NAME[t.game_id]} · {t.week_key.replace('-W', ' week ')}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CompeteRoom() {
  const { v2 } = useSocial()
  return (
    <div className="sc-grid">
      {!v2 ? (
        <p className="sc-card sc-note">
          Cups, challenges and leagues switch on once the server update is applied. Boards and friends already work.
        </p>
      ) : null}
      <div className="sc-col">
        <WeeklyCup />
        <Trophies />
      </div>
      <div className="sc-col">
        <Challenges />
        <Leagues />
      </div>
    </div>
  )
}

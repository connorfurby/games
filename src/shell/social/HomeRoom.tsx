import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, SegmentedControl } from '@/games/grocery-empire/ui/kit'
import type { SocialGameId } from '@/shared/database.types'
import { useAuth } from '../AuthContext'
import { Avatar, PlayerName } from './Avatar'
import { social } from './backend'
import { useBoard } from './BoardsRoom'
import { Composer, Feed } from './Feed'
import { RelationButton } from './FriendsRoom'
import type { Suggestion } from './model'
import { GAME_NAME, metricValue, nameOf, presenceOf, timeLeft, weekEndsAt } from './people'
import { useSocial } from './SocialContext'
import { runCardFromLocal } from './stats'

/** "You reached Era N — share it?" once per era. */
function MilestonePrompt({ onShared }: { onShared: () => void }) {
  const { user } = useAuth()
  const [era, setEra] = useState<{ gameId: SocialGameId; era: number } | null>(null)
  useEffect(() => {
    if (!user) return
    let stop = false
    void (async () => {
      for (const g of ['grocery-empire', 'signal-decay'] as SocialGameId[]) {
        const card = runCardFromLocal(g)
        if (!card || card.era < 2) continue
        if (!(await social().milestoneShared(user.id, g, card.era))) {
          if (!stop) setEra({ gameId: g, era: card.era })
          return
        }
      }
    })()
    return () => {
      stop = true
    }
  }, [user])
  if (!user || !era) return null
  const dismiss = async () => {
    await social().shareMilestone(user.id, era.gameId, era.era)
    setEra(null)
  }
  return (
    <div className="sc-card sc-milestone">
      <span className="sc-milestone__badge" aria-hidden>
        {era.era}
      </span>
      <div>
        <strong>You reached Era {era.era}</strong>
        <p className="sc-muted">in {GAME_NAME[era.gameId]}. Let your friends know?</p>
      </div>
      <div className="sc-row">
        <Button
          tone="primary"
          onClick={async () => {
            await social().createPost({
              authorId: user.id,
              body: `Just reached Era ${era.era}.`,
              visibility: 'friends',
              runCard: runCardFromLocal(era.gameId),
            })
            await dismiss()
            onShared()
          }}
        >
          Share
        </Button>
        <Button tone="ghost" onClick={() => void dismiss()}>
          Skip
        </Button>
      </div>
    </div>
  )
}

function CupGlance() {
  const { profile } = useAuth()
  const game: SocialGameId = (profile?.favorite_game as SocialGameId) ?? 'grocery-empire'
  const { board } = useBoard(game, 'week', 'friends', undefined, 5)
  return (
    <section className="sc-card sc-glance">
      <header className="sc-glance__head">
        <h3 className="sc-h3">This week with friends</h3>
        <span className="sc-muted">{timeLeft(weekEndsAt().toISOString())}</span>
      </header>
      {board?.entries.length ? (
        <ol className="sc-mini">
          {board.entries.map((e) => (
            <li key={e.userId} className={e.isMe ? 'is-me' : ''}>
              <span className="sc-mini__rank">{e.rank}</span>
              <Avatar profile={e.profile} size={26} />
              <PlayerName profile={e.profile} handle={false} />
              <strong>{metricValue('week', e.value, game)}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="sc-muted">Add friends to race them each week.</p>
      )}
      <Link to={`/social/boards?game=${game}&metric=week&scope=friends`} className="sc-link">
        All leaderboards →
      </Link>
    </section>
  )
}

function OnlineGlance() {
  const { friends } = useSocial()
  const on = friends.filter((f) => ['playing', 'online'].includes(presenceOf(f.profile).kind))
  return (
    <section className="sc-card sc-glance">
      <header className="sc-glance__head">
        <h3 className="sc-h3">Friends on now</h3>
        <span className="sc-muted">{on.length}</span>
      </header>
      {on.length ? (
        <ul className="sc-online">
          {on.slice(0, 8).map((f) => (
            <li key={f.otherId}>
              <Avatar profile={f.profile} size={32} presence />
              <span>
                <PlayerName profile={f.profile} handle={false} />
                <span className="sc-muted">{presenceOf(f.profile).label}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sc-muted">{friends.length ? 'Nobody right now.' : 'No friends yet.'}</p>
      )}
      <Link to="/social/friends" className="sc-link">
        {friends.length ? 'All friends →' : 'Find friends →'}
      </Link>
    </section>
  )
}

function DuelGlance() {
  const { user } = useAuth()
  const { challenges } = useSocial()
  if (!user) return null
  const live = challenges.filter((c) => c.status === 'active' || (c.status === 'pending' && c.opponent_id === user.id))
  return (
    <section className="sc-card sc-glance">
      <header className="sc-glance__head">
        <h3 className="sc-h3">Challenges</h3>
        <span className="sc-muted">{live.length}</span>
      </header>
      {live.length ? (
        <ul className="sc-online">
          {live.slice(0, 4).map((c) => {
            const mine = c.creator_id === user.id
            const them = mine ? c.opponent : c.creator
            const lead = (mine ? c.creatorProgress : c.opponentProgress) - (mine ? c.opponentProgress : c.creatorProgress)
            return (
              <li key={c.id}>
                <Avatar profile={them} size={32} />
                <span>
                  <strong>vs {nameOf(them)}</strong>
                  <span className={`sc-muted${c.status === 'pending' ? ' is-hot' : ''}`}>
                    {c.status === 'pending' ? 'Wants to play' : lead > 0 ? 'You lead' : lead < 0 ? 'You trail' : 'Even'}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="sc-muted">Challenge a friend to a sales race.</p>
      )}
      <Link to="/social/compete" className="sc-link">
        Compete →
      </Link>
    </section>
  )
}

function SuggestGlance() {
  const { user } = useAuth()
  const [list, setList] = useState<Suggestion[]>([])
  useEffect(() => {
    if (user) void social().suggestions(user.id).then(setList)
  }, [user])
  if (!list.length) return null
  return (
    <section className="sc-card sc-glance">
      <h3 className="sc-h3">People you may know</h3>
      <ul className="sc-online">
        {list.slice(0, 3).map((s) => (
          <li key={s.profile.id}>
            <Avatar profile={s.profile} size={32} />
            <span>
              <PlayerName profile={s.profile} handle={false} />
              <span className="sc-muted">{s.reason === 'mutual' ? `${s.mutual} mutual` : 'Near your era'}</span>
            </span>
            <RelationButton profile={s.profile} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function HomeRoom() {
  const [filter, setFilter] = useState<'all' | 'friends' | 'mine'>('all')
  const [reload, setReload] = useState(0)
  const bump = () => setReload((n) => n + 1)
  return (
    <div className="sc-grid sc-grid--home">
      <div className="sc-col sc-col--main">
        <MilestonePrompt onShared={bump} />
        <Composer onPosted={bump} />
        <SegmentedControl
          aria-label="Show posts from"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'friends', label: 'Friends' },
            { value: 'mine', label: 'Mine' },
          ]}
        />
        <Feed
          filter={filter}
          reloadKey={reload}
          empty={
            <div className="sc-card sc-empty">
              <h3 className="sc-h3">{filter === 'mine' ? 'You haven’t posted yet' : 'Quiet in here'}</h3>
              <p className="sc-muted">Share a run above. Friends see it here and can react.</p>
            </div>
          }
        />
      </div>
      <aside className="sc-col sc-col--side">
        <CupGlance />
        <DuelGlance />
        <OnlineGlance />
        <SuggestGlance />
      </aside>
    </div>
  )
}

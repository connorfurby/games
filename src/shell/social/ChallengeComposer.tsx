import { useState } from 'react'
import { Button, Modal, SegmentedControl } from '@/games/grocery-empire/ui/kit'
import { socialGames } from '@/shell/beta'
import type { ProfileRow, SocialGameId } from '@/shared/database.types'
import { useAuth } from '../AuthContext'
import { Avatar } from './Avatar'
import { social } from './backend'
import type { ChallengeMetric } from './model'
import { CHALLENGE_METRICS, GAME_NAME, nameOf } from './people'
import { useSocial } from './SocialContext'

const HOURS: { value: '24' | '72' | '168'; label: string }[] = [
  { value: '24', label: '1 day' },
  { value: '72', label: '3 days' },
  { value: '168', label: '1 week' },
]

/** Challenge a friend: pick a game, what counts, and how long. Progress counts from when they accept. */
export function ChallengeComposer({ opponent, onClose }: { opponent?: ProfileRow | null; onClose: () => void }) {
  const { user, profile } = useAuth()
  const { friends, refresh, v2, canPlay } = useSocial()
  const games = socialGames(canPlay('signal-decay'))
  const [who, setWho] = useState<string | null>(opponent?.id ?? null)
  const [game, setGame] = useState<SocialGameId>((profile?.favorite_game as SocialGameId) ?? 'grocery-empire')
  const [metric, setMetric] = useState<ChallengeMetric>('revenue')
  const [hours, setHours] = useState<'24' | '72' | '168'>('72')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const target = opponent ?? friends.find((f) => f.otherId === who)?.profile ?? null
  const m = CHALLENGE_METRICS.find((x) => x.id === metric)!

  return (
    <Modal
      open
      onClose={onClose}
      title="Challenge a friend"
      className="sc-modal"
      footer={
        <>
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            tone="primary"
            disabled={!target || busy || !v2}
            title={!v2 ? 'Challenges need the latest server update.' : !target ? 'Pick a friend first.' : undefined}
            onClick={async () => {
              if (!user || !target) return
              setBusy(true)
              setErr(null)
              const { error } = await social().createChallenge({
                creatorId: user.id,
                opponentId: target.id,
                gameId: games.includes(game) ? game : 'grocery-empire',
                metric,
                hours: Number(hours) as 24 | 72 | 168,
                message,
              })
              setBusy(false)
              if (error) return setErr(error)
              await refresh()
              onClose()
            }}
          >
            Send challenge
          </Button>
        </>
      }
    >
      <div className="sc-form">
        {opponent ? (
          <div className="sc-form__who">
            <Avatar profile={opponent} size={40} />
            <strong>{nameOf(opponent)}</strong>
          </div>
        ) : (
          <div className="sc-form__field">
            <span className="sc-form__label">Who</span>
            {friends.length ? (
              <div className="sc-pickfriend">
                {friends.map((f) => (
                  <button
                    key={f.otherId}
                    type="button"
                    className={`sc-pickfriend__btn${who === f.otherId ? ' is-on' : ''}`}
                    onClick={() => setWho(f.otherId)}
                  >
                    <Avatar profile={f.profile} size={28} />
                    <span>{nameOf(f.profile)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="sc-muted">Add a friend first. Challenges are between friends.</p>
            )}
          </div>
        )}
        {games.length > 1 ? (
          <div className="sc-form__field">
            <span className="sc-form__label">Game</span>
            <SegmentedControl
              aria-label="Game"
              value={games.includes(game) ? game : 'grocery-empire'}
              onChange={setGame}
              options={games.map((g) => ({ value: g, label: GAME_NAME[g] }))}
            />
          </div>
        ) : null}
        <div className="sc-form__field">
          <span className="sc-form__label">What counts</span>
          <SegmentedControl
            aria-label="What counts"
            value={metric}
            onChange={setMetric}
            options={CHALLENGE_METRICS.map((x) => ({ value: x.id, label: x.label }))}
          />
        </div>
        <div className="sc-form__field">
          <span className="sc-form__label">How long</span>
          <SegmentedControl aria-label="How long" value={hours} onChange={setHours} options={HOURS} />
        </div>
        <label className="sc-form__field">
          <span className="sc-form__label">Trash talk (optional)</span>
          <input
            className="sc-input"
            value={message}
            maxLength={140}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Bet you can’t keep up."
          />
        </label>
        <p className="sc-muted">
          {target ? `${nameOf(target)} and you` : 'You both'} {m.verb} in {GAME_NAME[game]} over{' '}
          {HOURS.find((h) => h.value === hours)!.label.replace('1 ', 'one ')}, counted from when they accept.
        </p>
        {err ? <p className="sc-err">{err}</p> : null}
      </div>
    </Modal>
  )
}

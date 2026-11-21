import { Link } from 'react-router-dom'
import { Button } from '@/games/grocery-empire/ui/kit'
import { Avatar } from './Avatar'
import type { NotificationWithActor } from './model'
import { nameOf, timeAgo } from './people'
import { useSocial } from './SocialContext'

/** Where a notification takes you. */
function hrefFor(n: NotificationWithActor): string {
  switch (n.kind) {
    case 'friend_request':
    case 'friend_accept':
      return n.actor ? `/social/u/${n.actor.handle}` : '/social/friends'
    case 'challenge':
    case 'challenge_accept':
    case 'challenge_result':
    case 'league_join':
    case 'cup_result':
      return '/social/compete'
    case 'beta_key':
      return '/play/signal-decay'
    default:
      return '/social'
  }
}

const ICON: Record<NotificationWithActor['kind'], string> = {
  friend_request: '👋',
  friend_accept: '🤝',
  comment: '💬',
  reaction: '★',
  challenge: '⚔',
  challenge_accept: '⚔',
  challenge_result: '🏁',
  league_join: '🏟',
  cup_result: '🏆',
  beta_key: '🔑',
}

export function Notifications({ compact = false, onPick }: { compact?: boolean; onPick?: () => void }) {
  const { notifications, unread, markRead } = useSocial()
  const list = compact ? notifications.slice(0, 8) : notifications
  return (
    <div className={`sc-notes${compact ? ' is-compact' : ''}`}>
      <div className="sc-notes__head">
        <strong>Notifications</strong>
        {unread ? (
          <Button size="sm" tone="ghost" onClick={() => void markRead()}>
            Mark all read
          </Button>
        ) : null}
      </div>
      {list.length ? (
        <ul className="sc-notes__list">
          {list.map((n) => (
            <li key={n.id} className={n.read_at ? '' : 'is-unread'}>
              <Link to={hrefFor(n)} onClick={onPick} className="sc-notes__row">
                {n.actor ? <Avatar profile={n.actor} size={32} /> : <span className="sc-notes__icon">{ICON[n.kind]}</span>}
                <span className="sc-notes__text">
                  <span>
                    {n.actor ? <strong>{nameOf(n.actor)} </strong> : null}
                    {n.actor ? n.body : n.body.charAt(0).toUpperCase() + n.body.slice(1)}
                  </span>
                  <time dateTime={n.created_at}>{timeAgo(n.created_at)}</time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sc-muted">Nothing yet. Requests, challenges and reactions show up here.</p>
      )}
      {compact && notifications.length > list.length ? (
        <Link to="/social/you#notifications" className="sc-notes__all" onClick={onPick}>
          See all
        </Link>
      ) : null}
    </div>
  )
}

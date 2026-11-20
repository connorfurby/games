import { Link } from 'react-router-dom'
import type { ProfileRow } from '@/shared/database.types'
import { accentOf, initials, nameOf, presenceOf } from './people'

/** Round avatar: Google photo or initials on your accent, with an optional presence dot. */
export function Avatar({
  profile,
  size = 36,
  presence = false,
  className = '',
}: {
  profile: ProfileRow | null | undefined
  size?: number
  presence?: boolean
  className?: string
}) {
  const accent = accentOf(profile)
  const p = presence ? presenceOf(profile) : null
  return (
    <span
      className={`sc-avatar${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, ['--accent' as string]: accent, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" width={size} height={size} referrerPolicy="no-referrer" />
      ) : (
        <span>{initials(profile)}</span>
      )}
      {p && (p.kind === 'playing' || p.kind === 'online') ? <i className={`sc-avatar__dot is-${p.kind}`} /> : null}
    </span>
  )
}

/** Name (and handle) that opens the player's profile. */
export function PlayerName({
  profile,
  handle = true,
  className = '',
}: {
  profile: ProfileRow | null | undefined
  handle?: boolean
  className?: string
}) {
  if (!profile) return <span className={`sc-name ${className}`}>Player</span>
  return (
    <Link to={`/social/u/${profile.handle}`} className={`sc-name ${className}`}>
      <strong>{nameOf(profile)}</strong>
      {handle ? <span className="sc-handle">@{profile.handle}</span> : null}
    </Link>
  )
}

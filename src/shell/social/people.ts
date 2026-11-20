import type { AccentId, ProfileRow, ProfileSettings, PublicStatsRow, SocialGameId } from '@/shared/database.types'
import { cashLabel, formatBN } from '@/shared/bn'
import type { BoardMetric, ChallengeMetric } from './model'

/** The name people see: the display name you chose, else your handle. */
export function nameOf(p: Pick<ProfileRow, 'display_name' | 'handle'> | null | undefined): string {
  const n = p?.display_name?.trim()
  return n || p?.handle || 'Player'
}

/** First name, for greetings. */
export function firstName(p: Pick<ProfileRow, 'display_name' | 'handle'> | null | undefined): string {
  return nameOf(p).split(/\s+/)[0] ?? 'there'
}

export function initials(p: Pick<ProfileRow, 'display_name' | 'handle'> | null | undefined): string {
  const parts = nameOf(p).split(/\s+/).filter(Boolean)
  const s = parts.length > 1 ? parts[0]![0]! + parts[parts.length - 1]![0]! : (parts[0] ?? 'P').slice(0, 2)
  return s.toUpperCase()
}

export const ACCENTS: { id: AccentId; label: string; color: string }[] = [
  { id: 'tomato', label: 'Tomato', color: '#ff5a43' },
  { id: 'tag', label: 'Price tag', color: '#f2c14e' },
  { id: 'mint', label: 'Mint', color: '#5fd38a' },
  { id: 'sky', label: 'Sky', color: '#6ab7ff' },
  { id: 'plum', label: 'Plum', color: '#b98aff' },
  { id: 'rose', label: 'Rose', color: '#ff8fb1' },
  { id: 'sand', label: 'Sand', color: '#d9b98c' },
  { id: 'ink', label: 'Ink', color: '#cfd6dc' },
]

export function accentOf(p: Pick<ProfileRow, 'accent'> | null | undefined): string {
  return ACCENTS.find((a) => a.id === p?.accent)?.color ?? ACCENTS[0]!.color
}

export const GAME_NAME: Record<SocialGameId, string> = {
  'grocery-empire': 'Grocery Empire',
  'signal-decay': 'Signal Decay',
}

/** Settings with defaults filled in. */
export function settingsOf(p: Pick<ProfileRow, 'settings'> | null | undefined): Required<ProfileSettings> {
  const s = p?.settings ?? {}
  return {
    discoverable: s.discoverable ?? true,
    public_boards: s.public_boards ?? true,
    show_presence: s.show_presence ?? true,
    default_visibility: s.default_visibility ?? 'friends',
    notify_friends: s.notify_friends ?? true,
    notify_posts: s.notify_posts ?? true,
    notify_compete: s.notify_compete ?? true,
  }
}

export type Presence = { kind: 'playing' | 'online' | 'recent' | 'away' | 'hidden'; label: string; game?: SocialGameId }

export function presenceOf(p: ProfileRow | null | undefined, now = Date.now()): Presence {
  if (!p) return { kind: 'away', label: 'Away' }
  if (!settingsOf(p).show_presence) return { kind: 'hidden', label: '' }
  const seen = p.last_seen_at ? now - new Date(p.last_seen_at).getTime() : Infinity
  const fresh = seen < 3 * 60_000
  if (fresh && (p.playing_game === 'grocery-empire' || p.playing_game === 'signal-decay')) {
    return { kind: 'playing', label: `Playing ${GAME_NAME[p.playing_game]}`, game: p.playing_game }
  }
  if (fresh) return { kind: 'online', label: 'Online' }
  if (seen < 60 * 60_000) return { kind: 'recent', label: `${Math.max(1, Math.floor(seen / 60_000))}m ago` }
  if (seen < 48 * 3600_000) return { kind: 'recent', label: `${Math.floor(seen / 3600_000)}h ago` }
  if (Number.isFinite(seen)) return { kind: 'away', label: `${Math.floor(seen / 86_400_000)}d ago` }
  return { kind: 'away', label: 'Away' }
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86_400) return `${Math.floor(s / 3600)}h`
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function timeLeft(iso: string, now = Date.now()): string {
  const s = Math.max(0, (new Date(iso).getTime() - now) / 1000)
  if (s <= 0) return 'ending'
  const d = Math.floor(s / 86_400)
  const h = Math.floor((s % 86_400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h left`
  if (h > 0) return `${h}h ${m}m left`
  return `${Math.max(1, m)}m left`
}

// ── Weeks (ISO, UTC) ─────────────────────────────────────────────────────────

export function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** When the current ISO week ends (next Monday 00:00 UTC). */
export function weekEndsAt(d = new Date()): Date {
  const day = d.getUTCDay() || 7
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (8 - day)))
  return end
}

export function prevWeekKey(d = new Date()): string {
  return isoWeekKey(new Date(d.getTime() - 7 * 86_400_000))
}

// ── Metrics ──────────────────────────────────────────────────────────────────

export const BOARD_METRICS: { id: BoardMetric; label: string; blurb: string; games: SocialGameId[] }[] = [
  {
    id: 'week',
    label: 'This week',
    blurb: 'Sales earned since Monday. Resets weekly; the top three win the cup.',
    games: ['grocery-empire', 'signal-decay'],
  },
  { id: 'revenue', label: 'All-time', blurb: 'Lifetime sales on your main save.', games: ['grocery-empire', 'signal-decay'] },
  { id: 'era', label: 'Furthest era', blurb: 'How far the run has come.', games: ['grocery-empire', 'signal-decay'] },
  { id: 'baskets', label: 'Baskets', blurb: 'Baskets sold (calls handled in Signal Decay).', games: ['grocery-empire', 'signal-decay'] },
  { id: 'daily', label: 'Daily run', blurb: 'Best daily challenge score.', games: ['grocery-empire'] },
  { id: 'awards', label: 'Awards', blurb: 'Awards unlocked.', games: ['grocery-empire', 'signal-decay'] },
  { id: 'play', label: 'Time played', blurb: 'Hours on the clock.', games: ['grocery-empire', 'signal-decay'] },
]

export const CHALLENGE_METRICS: { id: ChallengeMetric; label: string; verb: string }[] = [
  { id: 'revenue', label: 'Most sales', verb: 'earn the most' },
  { id: 'baskets', label: 'Most baskets', verb: 'sell the most baskets' },
  { id: 'play', label: 'Most time played', verb: 'play the longest' },
]

export function playTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function count(n: number): string {
  return n < 10_000 ? Math.floor(n).toLocaleString() : formatBN(Math.floor(n), 'named', 1)
}

export function metricValue(metric: BoardMetric | ChallengeMetric, v: number, gameId: SocialGameId = 'grocery-empire'): string {
  switch (metric) {
    case 'revenue':
    case 'week':
      return gameId === 'signal-decay' ? count(v) : cashLabel(v)
    case 'era':
      return `Era ${Math.floor(v)}`
    case 'play':
      return playTime(v)
    case 'baskets':
    case 'daily':
    case 'awards':
      return count(v)
  }
}

export function statValue(row: PublicStatsRow, metric: ChallengeMetric): number {
  switch (metric) {
    case 'revenue':
      return row.revenue_num ?? Number(row.lifetime_revenue) ?? 0
    case 'baskets':
      return row.headline_count
    case 'play':
      return row.play_seconds
  }
}

/** "Top 12%" for a rank in a pool, once the pool is big enough to say so. */
export function percentile(rank: number, total: number): string | null {
  if (total < 10 || rank < 1) return null
  const p = Math.max(1, Math.ceil((rank / total) * 100))
  return p <= 50 ? `Top ${p}%` : null
}

/** Handle rules: 3–24 of a–z, 0–9 and _. */
export function cleanHandle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24)
}

export function handleProblem(h: string): string | null {
  if (h.length < 3) return 'At least three characters.'
  if (!/^[a-z0-9_]+$/.test(h)) return 'Letters, numbers and _ only.'
  return null
}

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').replace(/^\s/, '').slice(0, 32)
}

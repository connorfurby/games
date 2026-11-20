import type {
  CommentRow,
  FriendshipRow,
  NotificationRow,
  PostRow,
  PostVisibility,
  ProfileRow,
  ProfileSettings,
  PublicStatsRow,
  ReactionKind,
  RunCard,
  SocialGameId,
} from '@/shared/database.types'

/**
 * Social domain: what the rooms work with, independent of where it's stored.
 * Two backends implement it — Supabase (real accounts) and Demo (in memory, for builds
 * without accounts and for tests).
 */

export type BoardMetric = 'revenue' | 'week' | 'era' | 'baskets' | 'play' | 'daily' | 'awards'
export type BoardScope = 'global' | 'friends' | 'league'
export type ChallengeMetric = 'revenue' | 'baskets' | 'play'
export type ChallengeStatus = 'pending' | 'active' | 'declined' | 'cancelled' | 'done'

export interface BoardEntry {
  rank: number
  userId: string
  value: number
  era: number
  profile: ProfileRow | null
  isMe: boolean
  isFriend: boolean
}

export interface Board {
  entries: BoardEntry[]
  /** Everyone ranked in this pool (for "top N%"). */
  total: number
  me: BoardEntry | null
}

export interface ChallengeRow {
  id: string
  game_id: SocialGameId
  metric: ChallengeMetric
  creator_id: string
  opponent_id: string
  status: ChallengeStatus
  hours: 24 | 72 | 168
  message: string
  starts_at: string | null
  ends_at: string | null
  creator_start: number | null
  opponent_start: number | null
  creator_final: number | null
  opponent_final: number | null
  winner_id: string | null
  created_at: string
}

export interface ChallengeView extends ChallengeRow {
  creator: ProfileRow | null
  opponent: ProfileRow | null
  /** Live progress since the start (active), or the final result (done). */
  creatorProgress: number
  opponentProgress: number
}

export interface LeagueRow {
  id: string
  name: string
  motto: string
  code: string
  game_id: SocialGameId
  owner_id: string
  created_at: string
}

export interface LeagueView extends LeagueRow {
  members: number
  /** My place in the league this week (by weekly gain), if any. */
  myRank: number | null
  leader: ProfileRow | null
}

export interface CupResult {
  game_id: SocialGameId
  week_key: string
  place: 1 | 2 | 3
  user_id: string
  score: number
  profile?: ProfileRow | null
}

export interface Suggestion {
  profile: ProfileRow
  mutual: number
  reason: 'mutual' | 'near'
}

export type Relation = 'self' | 'none' | 'friends' | 'incoming' | 'outgoing' | 'blocked'

export type PostWithAuthor = PostRow & {
  author?: ProfileRow | null
  reactions?: { kind: ReactionKind; count: number; mine: boolean }[]
  commentCount?: number
}

export type CommentWithAuthor = CommentRow & { author?: ProfileRow | null }
export type NotificationWithActor = NotificationRow & { actor?: ProfileRow | null }

export interface StatsPublish {
  game_id: SocialGameId
  era: number
  lifetime_revenue: string
  revenue_num: number
  headline_count: number
  play_seconds: number
  daily_challenge_baskets: number | null
  week_key: string
  achievements: number
}

export interface ProfilePatch {
  handle?: string
  display_name?: string
  bio?: string
  pinned_awards?: string[]
  accent?: ProfileRow['accent']
  favorite_game?: SocialGameId | null
  settings?: ProfileSettings
  onboarded_at?: string
  last_seen_at?: string
  playing_game?: SocialGameId | null
}

export type Result<T = null> = { error: string | null; data?: T }

export interface SocialBackend {
  readonly kind: 'supabase' | 'demo'
  /** Server has the v2 tables (competitions, settings). */
  v2(): Promise<boolean>

  // People
  getProfile(id: string): Promise<ProfileRow | null>
  getProfileByHandle(handle: string): Promise<ProfileRow | null>
  profilesByIds(ids: string[]): Promise<Map<string, ProfileRow>>
  updateProfile(id: string, patch: ProfilePatch): Promise<Result<ProfileRow>>
  handleAvailable(handle: string, selfId: string): Promise<boolean>
  search(q: string, selfId: string): Promise<ProfileRow[]>
  suggestions(selfId: string): Promise<Suggestion[]>
  statsFor(userId: string): Promise<PublicStatsRow[]>

  // Friends
  friendships(userId: string): Promise<FriendshipRow[]>
  requestFriend(fromId: string, toId: string): Promise<Result>
  respondFriend(f: FriendshipRow, status: 'accepted' | 'blocked', actorId: string): Promise<Result>
  removeFriendship(id: string): Promise<Result>

  // Floor
  feed(userId: string, filter: 'all' | 'friends' | 'mine' | { author: string }): Promise<PostWithAuthor[]>
  createPost(input: { authorId: string; body: string; visibility: PostVisibility; runCard?: RunCard | null }): Promise<Result<PostRow>>
  deletePost(id: string): Promise<Result>
  toggleReaction(postId: string, userId: string, kind: ReactionKind, on: boolean, authorId: string): Promise<Result>
  comments(postId: string): Promise<CommentWithAuthor[]>
  addComment(postId: string, authorId: string, body: string, postAuthorId: string): Promise<Result>
  milestoneShared(userId: string, gameId: SocialGameId, era: number): Promise<boolean>
  shareMilestone(userId: string, gameId: SocialGameId, era: number): Promise<Result>

  // Boards
  publishStats(userId: string, rows: StatsPublish[]): Promise<void>
  board(input: {
    gameId: SocialGameId
    metric: BoardMetric
    scope: BoardScope
    leagueId?: string
    limit?: number
    week: string
    selfId: string
  }): Promise<Board>

  // Competitions
  challenges(userId: string): Promise<ChallengeView[]>
  createChallenge(input: {
    creatorId: string
    opponentId: string
    gameId: SocialGameId
    metric: ChallengeMetric
    hours: 24 | 72 | 168
    message: string
  }): Promise<Result>
  answerChallenge(id: string, userId: string, answer: 'accept' | 'decline' | 'cancel'): Promise<Result>
  settleChallenges(userId: string): Promise<void>
  leagues(userId: string): Promise<LeagueView[]>
  createLeague(userId: string, name: string, gameId: SocialGameId, motto: string): Promise<Result<LeagueRow>>
  joinLeague(userId: string, code: string): Promise<Result<LeagueRow>>
  leaveLeague(userId: string, leagueId: string): Promise<Result>
  cupResults(gameId: SocialGameId, limitWeeks?: number): Promise<CupResult[]>
  trophies(userId: string): Promise<CupResult[]>
  settleCup(gameId: SocialGameId, week: string): Promise<void>

  // Notifications
  notifications(userId: string): Promise<NotificationWithActor[]>
  markRead(userId: string): Promise<void>
}

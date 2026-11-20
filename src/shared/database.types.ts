export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ReactionKind = 'stamp' | 'basket' | 'static'
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'
export type PostVisibility = 'public' | 'friends'
export type NotificationKind =
  | 'friend_request'
  | 'friend_accept'
  | 'comment'
  | 'reaction'
  | 'challenge'
  | 'challenge_accept'
  | 'challenge_result'
  | 'league_join'
  | 'cup_result'
export type SocialGameId = 'grocery-empire' | 'signal-decay'

export interface ProfileRow {
  id: string
  handle: string
  friend_code: string
  display_name: string
  avatar_url: string | null
  bio: string
  pinned_awards: string[]
  last_seen_at: string | null
  playing_game: string | null
  created_at: string
  updated_at: string
  /** Social v2 (20261120100000). Absent on servers without the migration. */
  onboarded_at?: string | null
  accent?: AccentId | null
  favorite_game?: SocialGameId | null
  settings?: ProfileSettings | null
}

export type AccentId = 'tomato' | 'tag' | 'mint' | 'sky' | 'plum' | 'rose' | 'sand' | 'ink'

/** Privacy and notification switches. Every key is optional; missing means on (or 'friends'). */
export interface ProfileSettings {
  discoverable?: boolean
  public_boards?: boolean
  show_presence?: boolean
  default_visibility?: PostVisibility
  notify_friends?: boolean
  notify_posts?: boolean
  notify_compete?: boolean
}

export interface SaveRow {
  user_id: string
  slot_id: string
  payload: string
  updated_at: string
}

export interface PublicStatsRow {
  user_id: string
  game_id: SocialGameId
  era: number
  lifetime_revenue: string
  headline_count: number
  play_seconds: number
  daily_challenge_baskets: number | null
  week_key: string | null
  week_start_score: string
  updated_at: string
  /** Social v2 */
  revenue_num?: number
  week_gain?: number
  prev_week_key?: string | null
  prev_week_gain?: number
  achievements?: number
}

export interface FriendshipRow {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  updated_at: string
}

export interface RunCard {
  gameId: SocialGameId
  era: number
  headline: string
  playSec: number
  packId?: string
}

export interface PostRow {
  id: string
  author_id: string
  body: string
  visibility: PostVisibility
  run_card: RunCard | null
  created_at: string
}

export interface CommentRow {
  id: string
  post_id: string
  author_id: string
  body: string
  created_at: string
}

export interface ReactionRow {
  post_id: string
  user_id: string
  kind: ReactionKind
  created_at: string
}

export interface MilestoneRow {
  user_id: string
  game_id: SocialGameId
  era: number
  shared_at: string | null
  created_at: string
}

export interface NotificationRow {
  id: string
  recipient_id: string
  kind: NotificationKind
  actor_id: string | null
  post_id: string | null
  body: string
  read_at: string | null
  created_at: string
  ref_id?: string | null
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Partial<ProfileRow> & Pick<ProfileRow, 'id' | 'handle' | 'friend_code'>
        Update: Partial<ProfileRow>
        Relationships: []
      }
      saves: {
        Row: SaveRow
        Insert: Pick<SaveRow, 'user_id' | 'slot_id' | 'payload'> & Partial<Pick<SaveRow, 'updated_at'>>
        Update: Partial<SaveRow>
        Relationships: []
      }
      public_stats: {
        Row: PublicStatsRow
        Insert: Pick<PublicStatsRow, 'user_id' | 'game_id'> & Partial<Omit<PublicStatsRow, 'user_id' | 'game_id'>>
        Update: Partial<PublicStatsRow>
        Relationships: []
      }
      friendships: {
        Row: FriendshipRow
        Insert: Pick<FriendshipRow, 'requester_id' | 'addressee_id' | 'status'> & Partial<Pick<FriendshipRow, 'id'>>
        Update: Partial<FriendshipRow>
        Relationships: []
      }
      posts: {
        Row: PostRow
        Insert: Pick<PostRow, 'author_id'> & Partial<Omit<PostRow, 'author_id' | 'id' | 'created_at'>>
        Update: Partial<PostRow>
        Relationships: []
      }
      comments: {
        Row: CommentRow
        Insert: Pick<CommentRow, 'post_id' | 'author_id' | 'body'> & Partial<Pick<CommentRow, 'id'>>
        Update: Partial<CommentRow>
        Relationships: []
      }
      reactions: {
        Row: ReactionRow
        Insert: Pick<ReactionRow, 'post_id' | 'user_id' | 'kind'>
        Update: Partial<ReactionRow>
        Relationships: []
      }
      milestones: {
        Row: MilestoneRow
        Insert: Pick<MilestoneRow, 'user_id' | 'game_id' | 'era'> & Partial<Pick<MilestoneRow, 'shared_at'>>
        Update: Partial<MilestoneRow>
        Relationships: []
      }
      notifications: {
        Row: NotificationRow
        Insert: Pick<NotificationRow, 'recipient_id' | 'kind'> &
          Partial<Omit<NotificationRow, 'recipient_id' | 'kind' | 'id' | 'created_at'>>
        Update: Partial<NotificationRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      are_friends: {
        Args: { a: string; b: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

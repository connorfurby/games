import type {
  CommentRow,
  FriendshipRow,
  NotificationRow,
  PostRow,
  ProfileRow,
  PublicStatsRow,
  ReactionKind,
  RunCard,
  SocialGameId,
} from '@/shared/database.types'
import { getSupabase } from '@/shared/supabase'

export type PostWithAuthor = PostRow & {
  author?: ProfileRow | null
  reactions?: { kind: ReactionKind; count: number; mine: boolean }[]
  commentCount?: number
}

export async function searchProfiles(q: string, limit = 12): Promise<ProfileRow[]> {
  const sb = getSupabase()
  if (!sb || !q.trim()) return []
  const needle = q.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (needle.length < 2) return []
  const { data } = await sb.from('profiles').select('*').ilike('handle', `${needle}%`).limit(limit)
  return (data as ProfileRow[]) ?? []
}

export async function findByFriendCode(code: string): Promise<ProfileRow | null> {
  const sb = getSupabase()
  if (!sb) return null
  const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (cleaned.length !== 8) return null
  const { data } = await sb.from('profiles').select('*').eq('friend_code', cleaned).maybeSingle()
  return data ? (data as ProfileRow) : null
}

export async function listFriendships(userId: string): Promise<FriendshipRow[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data } = await sb
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  return (data as FriendshipRow[]) ?? []
}

export async function requestFriend(fromId: string, toId: string): Promise<{ error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { error: 'Not configured' }
  const { error } = await sb.from('friendships').insert({
    requester_id: fromId,
    addressee_id: toId,
    status: 'pending',
  })
  if (!error) {
    await sb.from('notifications').insert({
      recipient_id: toId,
      actor_id: fromId,
      kind: 'friend_request',
      body: 'sent you a friend request',
    })
  }
  return { error: error?.message ?? null }
}

export async function respondFriend(
  friendshipId: string,
  status: 'accepted' | 'blocked',
  actorId: string,
  otherId: string,
): Promise<{ error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { error: 'Not configured' }
  const { error } = await sb.from('friendships').update({ status }).eq('id', friendshipId)
  if (!error && status === 'accepted') {
    await sb.from('notifications').insert({
      recipient_id: otherId,
      actor_id: actorId,
      kind: 'friend_accept',
      body: 'accepted your friend request',
    })
  }
  return { error: error?.message ?? null }
}

export async function removeFriendship(id: string): Promise<{ error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { error: 'Not configured' }
  const { error } = await sb.from('friendships').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, ProfileRow>> {
  const sb = getSupabase()
  const map = new Map<string, ProfileRow>()
  if (!sb || !ids.length) return map
  const unique = [...new Set(ids)]
  const { data } = await sb.from('profiles').select('*').in('id', unique)
  for (const row of (data as ProfileRow[]) ?? []) map.set(row.id, row)
  return map
}

export async function createPost(input: {
  authorId: string
  body: string
  visibility: 'public' | 'friends'
  runCard?: RunCard | null
}): Promise<{ error: string | null; post: PostRow | null }> {
  const sb = getSupabase()
  if (!sb) return { error: 'Not configured', post: null }
  const { data, error } = await sb
    .from('posts')
    .insert({
      author_id: input.authorId,
      body: input.body.slice(0, 500),
      visibility: input.visibility,
      run_card: input.runCard ?? null,
    })
    .select('*')
    .maybeSingle()
  return { error: error?.message ?? null, post: data ? (data as PostRow) : null }
}

export async function fetchFeed(userId: string, limit = 40): Promise<PostWithAuthor[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data: posts, error } = await sb.from('posts').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error || !posts) return []
  const rows = posts as PostRow[]
  const authors = await fetchProfilesByIds(rows.map((p) => p.author_id))
  const postIds = rows.map((p) => p.id)
  const { data: reactions } = await sb.from('reactions').select('*').in('post_id', postIds)
  const { data: comments } = await sb.from('comments').select('post_id').in('post_id', postIds)

  const commentCount = new Map<string, number>()
  for (const c of comments ?? []) {
    commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1)
  }

  return rows.map((p) => {
    const mine = new Set(
      (reactions ?? [])
        .filter((r) => r.post_id === p.id && r.user_id === userId)
        .map((r) => r.kind as ReactionKind),
    )
    const kinds: ReactionKind[] = ['stamp', 'basket', 'static']
    const reactionSummary = kinds.map((kind) => ({
      kind,
      count: (reactions ?? []).filter((r) => r.post_id === p.id && r.kind === kind).length,
      mine: mine.has(kind),
    }))
    return {
      ...p,
      author: authors.get(p.author_id) ?? null,
      reactions: reactionSummary,
      commentCount: commentCount.get(p.id) ?? 0,
    }
  })
}

export async function toggleReaction(
  postId: string,
  userId: string,
  kind: ReactionKind,
  on: boolean,
  authorId: string,
): Promise<{ error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { error: 'Not configured' }
  if (on) {
    const { error } = await sb.from('reactions').insert({ post_id: postId, user_id: userId, kind })
    if (!error && authorId !== userId) {
      await sb.from('notifications').insert({
        recipient_id: authorId,
        actor_id: userId,
        post_id: postId,
        kind: 'reaction',
        body: `reacted with ${kind}`,
      })
    }
    return { error: error?.message ?? null }
  }
  const { error } = await sb.from('reactions').delete().eq('post_id', postId).eq('user_id', userId).eq('kind', kind)
  return { error: error?.message ?? null }
}

export async function fetchComments(postId: string): Promise<(CommentRow & { author?: ProfileRow | null })[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data } = await sb.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true })
  const rows = (data as CommentRow[]) ?? []
  const authors = await fetchProfilesByIds(rows.map((c) => c.author_id))
  return rows.map((c) => ({ ...c, author: authors.get(c.author_id) ?? null }))
}

export async function addComment(
  postId: string,
  authorId: string,
  body: string,
  postAuthorId: string,
): Promise<{ error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { error: 'Not configured' }
  const { error } = await sb.from('comments').insert({
    post_id: postId,
    author_id: authorId,
    body: body.slice(0, 280),
  })
  if (!error && postAuthorId !== authorId) {
    await sb.from('notifications').insert({
      recipient_id: postAuthorId,
      actor_id: authorId,
      post_id: postId,
      kind: 'comment',
      body: 'commented on your post',
    })
  }
  return { error: error?.message ?? null }
}

export async function fetchLeaderboard(
  gameId: SocialGameId,
  metric: 'lifetime_revenue' | 'headline_count' | 'era' | 'play_seconds' | 'daily_challenge_baskets',
  friendIds: string[] | null,
  limit = 50,
): Promise<(PublicStatsRow & { profile?: ProfileRow | null })[]> {
  const sb = getSupabase()
  if (!sb) return []
  let q = sb.from('public_stats').select('*').eq('game_id', gameId)
  if (friendIds) {
    if (!friendIds.length) return []
    q = q.in('user_id', friendIds)
  }
  const { data, error } = await q.order(metric, { ascending: false }).limit(limit)
  if (error || !data) return []
  const rows = data as PublicStatsRow[]
  const profiles = await fetchProfilesByIds(rows.map((r) => r.user_id))
  return rows.map((r) => ({ ...r, profile: profiles.get(r.user_id) ?? null }))
}

export async function fetchNotifications(userId: string): Promise<(NotificationRow & { actor?: ProfileRow | null })[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data } = await sb
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(40)
  const rows = (data as NotificationRow[]) ?? []
  const actors = await fetchProfilesByIds(rows.map((n) => n.actor_id).filter((x): x is string => !!x))
  return rows.map((n) => ({ ...n, actor: n.actor_id ? actors.get(n.actor_id) ?? null : null }))
}

export async function markNotificationsRead(userId: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null)
}

export async function shareMilestone(userId: string, gameId: SocialGameId, era: number): Promise<{ error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { error: 'Not configured' }
  const { error } = await sb.from('milestones').upsert(
    { user_id: userId, game_id: gameId, era, shared_at: new Date().toISOString() },
    { onConflict: 'user_id,game_id,era' },
  )
  return { error: error?.message ?? null }
}

export async function milestoneShared(userId: string, gameId: SocialGameId, era: number): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { data } = await sb
    .from('milestones')
    .select('shared_at')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .eq('era', era)
    .maybeSingle()
  return !!(data as { shared_at?: string | null } | null)?.shared_at
}

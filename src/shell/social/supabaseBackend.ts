import type {
  FriendshipRow,
  NotificationRow,
  PostRow,
  ProfileRow,
  PublicStatsRow,
  ReactionKind,
  SocialGameId,
} from '@/shared/database.types'
import { getSupabase } from '@/shared/supabase'
import type {
  Board,
  BoardEntry,
  ChallengeRow,
  ChallengeView,
  CommentWithAuthor,
  CupResult,
  LeagueRow,
  LeagueView,
  NotificationWithActor,
  PostWithAuthor,
  SocialBackend,
  Suggestion,
} from './model'
import { isoWeekKey, statValue } from './people'

/**
 * Supabase backend. Every v2 call (competitions, settings, RPC boards) checks that the
 * server has the 20261120100000 migration and falls back to v1 behaviour when it doesn't,
 * so the client can ship before the migration lands without breaking play.
 */

const sbOrThrow = () => {
  const sb = getSupabase()
  if (!sb) throw new Error('Accounts are not configured on this build.')
  return sb
}

let v2Probe: Promise<boolean> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function asError<T>(p: PromiseLike<{ error: { message: string } | null; data?: any }>): Promise<{ error: string | null; data?: T }> {
  try {
    const r = await p
    return { error: r.error?.message ?? null, data: r.data as T }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

async function profilesByIds(ids: string[]): Promise<Map<string, ProfileRow>> {
  const sb = getSupabase()
  const map = new Map<string, ProfileRow>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (!sb || !unique.length) return map
  const { data } = await sb.from('profiles').select('*').in('id', unique)
  for (const row of (data as ProfileRow[]) ?? []) map.set(row.id, row)
  return map
}

async function notify(row: Partial<NotificationRow> & Pick<NotificationRow, 'recipient_id' | 'kind'>) {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('notifications').insert(row)
}

async function friendIds(userId: string): Promise<Set<string>> {
  const sb = sbOrThrow()
  const { data } = await sb
    .from('friendships')
    .select('requester_id,addressee_id,status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted')
  const out = new Set<string>()
  for (const f of (data as FriendshipRow[]) ?? []) out.add(f.requester_id === userId ? f.addressee_id : f.requester_id)
  return out
}

function v1Column(metric: string): string {
  switch (metric) {
    case 'era':
      return 'era'
    case 'baskets':
      return 'headline_count'
    case 'play':
      return 'play_seconds'
    case 'daily':
      return 'daily_challenge_baskets'
    default:
      return 'lifetime_revenue'
  }
}

export const supabaseBackend: SocialBackend = {
  kind: 'supabase',

  v2() {
    if (!v2Probe) {
      v2Probe = (async () => {
        const sb = getSupabase()
        if (!sb) return false
        const { error } = await sb.from('challenges').select('id').limit(1)
        return !error
      })()
    }
    return v2Probe
  },

  async getProfile(id) {
    const { data } = await sbOrThrow().from('profiles').select('*').eq('id', id).maybeSingle()
    return (data as ProfileRow) ?? null
  },

  async getProfileByHandle(handle) {
    const { data } = await sbOrThrow().from('profiles').select('*').ilike('handle', handle.toLowerCase()).maybeSingle()
    return (data as ProfileRow) ?? null
  },

  profilesByIds,

  async updateProfile(id, patch) {
    const sb = sbOrThrow()
    const v2 = await this.v2()
    const body: Record<string, unknown> = { ...patch }
    if (!v2) {
      delete body.accent
      delete body.favorite_game
      delete body.settings
      delete body.onboarded_at
    }
    const r = await asError<ProfileRow>(sb.from('profiles').update(body).eq('id', id).select('*').maybeSingle())
    if (r.error && /profiles_handle_unique|duplicate key/.test(r.error)) return { error: 'That handle is taken.' }
    return r
  },

  async handleAvailable(handle, selfId) {
    const sb = sbOrThrow()
    if (await this.v2()) {
      const { data, error } = await sb.rpc('handle_available', { p_handle: handle })
      if (!error) return !!data
    }
    const { data } = await sb.from('profiles').select('id').ilike('handle', handle).maybeSingle()
    return !data || (data as { id: string }).id === selfId
  },

  async search(q, selfId) {
    const sb = sbOrThrow()
    const needle = q.trim()
    if (needle.length < 2) return []
    if (await this.v2()) {
      const { data, error } = await sb.rpc('search_players', { p_q: needle, p_limit: 12 })
      if (!error) return (data as ProfileRow[]) ?? []
    }
    const h = needle
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/[^a-z0-9_]/g, '')
    const { data } = await sb
      .from('profiles')
      .select('*')
      .or(`handle.ilike.${h}%,display_name.ilike.%${needle.replace(/[,()%]/g, '')}%,friend_code.eq.${needle.toUpperCase()}`)
      .neq('id', selfId)
      .limit(12)
    return (data as ProfileRow[]) ?? []
  },

  async suggestions() {
    if (!(await this.v2())) return []
    const { data, error } = await sbOrThrow().rpc('suggest_friends', { p_limit: 12 })
    if (error || !data) return []
    return (data as { profile: ProfileRow; mutual: number; reason: Suggestion['reason'] }[]).map((r) => ({
      profile: r.profile,
      mutual: r.mutual,
      reason: r.reason,
    }))
  },

  async statsFor(userId) {
    const { data } = await sbOrThrow().from('public_stats').select('*').eq('user_id', userId)
    return (data as PublicStatsRow[]) ?? []
  },

  async friendships(userId) {
    const { data } = await sbOrThrow().from('friendships').select('*').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    return (data as FriendshipRow[]) ?? []
  },

  async requestFriend(fromId, toId) {
    const sb = sbOrThrow()
    // They already asked you: accept instead of making a second row.
    const { data: back } = await sb.from('friendships').select('*').eq('requester_id', toId).eq('addressee_id', fromId).maybeSingle()
    if (back) {
      const f = back as FriendshipRow
      if (f.status === 'pending') return this.respondFriend(f, 'accepted', fromId)
      if (f.status === 'blocked') return { error: 'You can’t add this player.' }
    }
    const r = await asError(sb.from('friendships').insert({ requester_id: fromId, addressee_id: toId, status: 'pending' }))
    if (r.error && /duplicate key|pair_unique/.test(r.error)) return { error: 'Request already sent.' }
    if (!r.error) await notify({ recipient_id: toId, actor_id: fromId, kind: 'friend_request', body: 'sent you a friend request' })
    return { error: r.error }
  },

  async respondFriend(f, status, actorId) {
    const r = await asError(sbOrThrow().from('friendships').update({ status }).eq('id', f.id))
    const other = f.requester_id === actorId ? f.addressee_id : f.requester_id
    if (!r.error && status === 'accepted') {
      await notify({ recipient_id: other, actor_id: actorId, kind: 'friend_accept', body: 'accepted your friend request' })
    }
    return { error: r.error }
  },

  async removeFriendship(id) {
    return asError(sbOrThrow().from('friendships').delete().eq('id', id))
  },

  async feed(userId, filter) {
    const sb = sbOrThrow()
    let q = sb.from('posts').select('*').order('created_at', { ascending: false }).limit(40)
    if (filter === 'mine') q = q.eq('author_id', userId)
    else if (typeof filter === 'object') q = q.eq('author_id', filter.author)
    else if (filter === 'friends') {
      const ids = [...(await friendIds(userId)), userId]
      q = q.in('author_id', ids)
    }
    const { data: posts, error } = await q
    if (error || !posts) return []
    const rows = posts as PostRow[]
    if (!rows.length) return []
    const authors = await profilesByIds(rows.map((p) => p.author_id))
    const postIds = rows.map((p) => p.id)
    const [{ data: reactions }, { data: comments }] = await Promise.all([
      sb.from('reactions').select('post_id,user_id,kind').in('post_id', postIds),
      sb.from('comments').select('post_id').in('post_id', postIds),
    ])
    const cc = new Map<string, number>()
    for (const c of (comments as { post_id: string }[]) ?? []) cc.set(c.post_id, (cc.get(c.post_id) ?? 0) + 1)
    const rx = (reactions as { post_id: string; user_id: string; kind: ReactionKind }[]) ?? []
    return rows.map<PostWithAuthor>((p) => ({
      ...p,
      author: authors.get(p.author_id) ?? null,
      commentCount: cc.get(p.id) ?? 0,
      reactions: (['stamp', 'basket', 'static'] as ReactionKind[]).map((kind) => ({
        kind,
        count: rx.filter((r) => r.post_id === p.id && r.kind === kind).length,
        mine: rx.some((r) => r.post_id === p.id && r.kind === kind && r.user_id === userId),
      })),
    }))
  },

  async createPost(input) {
    return asError<PostRow>(
      sbOrThrow()
        .from('posts')
        .insert({
          author_id: input.authorId,
          body: input.body.slice(0, 500),
          visibility: input.visibility,
          run_card: input.runCard ?? null,
        })
        .select('*')
        .maybeSingle(),
    )
  },

  async deletePost(id) {
    return asError(sbOrThrow().from('posts').delete().eq('id', id))
  },

  async toggleReaction(postId, userId, kind, on, authorId) {
    const sb = sbOrThrow()
    if (on) {
      const r = await asError(sb.from('reactions').insert({ post_id: postId, user_id: userId, kind }))
      if (!r.error && authorId !== userId) {
        await notify({ recipient_id: authorId, actor_id: userId, post_id: postId, kind: 'reaction', body: `reacted with ${kind}` })
      }
      return { error: r.error }
    }
    return asError(sb.from('reactions').delete().eq('post_id', postId).eq('user_id', userId).eq('kind', kind))
  },

  async comments(postId) {
    const { data } = await sbOrThrow().from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true })
    const rows = (data as CommentWithAuthor[]) ?? []
    const authors = await profilesByIds(rows.map((c) => c.author_id))
    return rows.map((c) => ({ ...c, author: authors.get(c.author_id) ?? null }))
  },

  async addComment(postId, authorId, body, postAuthorId) {
    const r = await asError(
      sbOrThrow()
        .from('comments')
        .insert({ post_id: postId, author_id: authorId, body: body.slice(0, 280) }),
    )
    if (!r.error && postAuthorId !== authorId) {
      await notify({ recipient_id: postAuthorId, actor_id: authorId, post_id: postId, kind: 'comment', body: 'commented on your post' })
    }
    return { error: r.error }
  },

  async milestoneShared(userId, gameId, era) {
    const { data } = await sbOrThrow()
      .from('milestones')
      .select('shared_at')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .eq('era', era)
      .maybeSingle()
    return !!(data as { shared_at?: string | null } | null)?.shared_at
  },

  async shareMilestone(userId, gameId, era) {
    return asError(
      sbOrThrow()
        .from('milestones')
        .upsert({ user_id: userId, game_id: gameId, era, shared_at: new Date().toISOString() }, { onConflict: 'user_id,game_id,era' }),
    )
  },

  async publishStats(userId, rows) {
    const sb = sbOrThrow()
    const v2 = await this.v2()
    const { data: existing } = await sb.from('public_stats').select('*').eq('user_id', userId)
    const prev = new Map(((existing as PublicStatsRow[]) ?? []).map((r) => [r.game_id, r]))
    const out = rows.map((r) => {
      const old = prev.get(r.game_id)
      const sameWeek = old?.week_key === r.week_key && old.week_start_score != null
      const weekStart = sameWeek ? Number(old!.week_start_score) : r.revenue_num
      const base = {
        user_id: userId,
        game_id: r.game_id,
        era: r.era,
        lifetime_revenue: r.lifetime_revenue,
        headline_count: r.headline_count,
        play_seconds: r.play_seconds,
        daily_challenge_baskets: r.daily_challenge_baskets,
        week_key: r.week_key,
        week_start_score: String(Math.floor(weekStart)),
      }
      if (!v2) return base
      return {
        ...base,
        revenue_num: r.revenue_num,
        week_gain: Math.max(0, r.revenue_num - weekStart),
        achievements: r.achievements,
        // Week rolled over: keep last week's final gain for the cup.
        ...(old && !sameWeek && old.week_key
          ? { prev_week_key: old.week_key, prev_week_gain: Math.max(0, Number(old.week_gain ?? 0)) }
          : {}),
      }
    })
    if (!out.length) return
    const { error } = await sb.from('public_stats').upsert(out, { onConflict: 'user_id,game_id' })
    if (error) console.warn('public_stats upsert', error.message)
  },

  async board({ gameId, metric, scope, leagueId, limit = 50, week, selfId }) {
    const sb = sbOrThrow()
    const friends = await friendIds(selfId)
    if (await this.v2()) {
      const { data, error } = await sb.rpc('leaderboard', {
        p_game: gameId,
        p_metric: metric,
        p_scope: scope,
        p_league: leagueId ?? null,
        p_limit: limit,
        p_week: week,
      })
      if (!error && data) {
        const rows = data as { rank: number; user_id: string; value: number; era: number; total: number }[]
        const profiles = await profilesByIds(rows.map((r) => r.user_id))
        const entries: BoardEntry[] = rows.map((r) => ({
          rank: Number(r.rank),
          userId: r.user_id,
          value: Number(r.value),
          era: r.era,
          profile: profiles.get(r.user_id) ?? null,
          isMe: r.user_id === selfId,
          isFriend: friends.has(r.user_id),
        }))
        const me = entries.find((e) => e.isMe) ?? null
        return { entries: entries.filter((e) => e.rank <= limit), total: Number(rows[0]?.total ?? 0), me }
      }
    }
    // v1: plain query (text revenue sorts as text, so sort numerically here).
    let q = sb.from('public_stats').select('*').eq('game_id', gameId)
    if (scope !== 'global') q = q.in('user_id', [...friends, selfId])
    const { data } = await q.order(v1Column(metric), { ascending: false }).limit(200)
    const rows = ((data as PublicStatsRow[]) ?? []).map((r) => ({
      r,
      v:
        metric === 'era'
          ? r.era
          : metric === 'baskets'
            ? r.headline_count
            : metric === 'play'
              ? r.play_seconds
              : metric === 'daily'
                ? (r.daily_challenge_baskets ?? 0)
                : metric === 'week'
                  ? Math.max(0, Number(r.lifetime_revenue) - Number(r.week_start_score))
                  : Number(r.lifetime_revenue),
    }))
    rows.sort((a, b) => b.v - a.v)
    const profiles = await profilesByIds(rows.map((x) => x.r.user_id))
    const entries = rows.map<BoardEntry>((x, i) => ({
      rank: i + 1,
      userId: x.r.user_id,
      value: x.v,
      era: x.r.era,
      profile: profiles.get(x.r.user_id) ?? null,
      isMe: x.r.user_id === selfId,
      isFriend: friends.has(x.r.user_id),
    }))
    return { entries: entries.slice(0, limit), total: entries.length, me: entries.find((e) => e.isMe) ?? null } satisfies Board
  },

  async challenges(userId) {
    if (!(await this.v2())) return []
    const sb = sbOrThrow()
    const { data } = await sb
      .from('challenges')
      .select('*')
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(40)
    const rows = (data as ChallengeRow[]) ?? []
    const ids = rows.flatMap((c) => [c.creator_id, c.opponent_id])
    const profiles = await profilesByIds(ids)
    const { data: stats } = ids.length
      ? await sb
          .from('public_stats')
          .select('*')
          .in('user_id', [...new Set(ids)])
      : { data: [] }
    const st = (stats as PublicStatsRow[]) ?? []
    const now = (uid: string, c: ChallengeRow) => {
      const row = st.find((s) => s.user_id === uid && s.game_id === c.game_id)
      return row ? statValue(row, c.metric) : 0
    }
    return rows.map<ChallengeView>((c) => ({
      ...c,
      creator: profiles.get(c.creator_id) ?? null,
      opponent: profiles.get(c.opponent_id) ?? null,
      creatorProgress:
        c.status === 'done'
          ? (c.creator_final ?? 0)
          : c.status === 'active'
            ? Math.max(0, now(c.creator_id, c) - (c.creator_start ?? 0))
            : 0,
      opponentProgress:
        c.status === 'done'
          ? (c.opponent_final ?? 0)
          : c.status === 'active'
            ? Math.max(0, now(c.opponent_id, c) - (c.opponent_start ?? 0))
            : 0,
    }))
  },

  async createChallenge(input) {
    if (!(await this.v2())) return { error: 'Challenges need the latest server update.' }
    const r = await asError(
      sbOrThrow()
        .from('challenges')
        .insert({
          creator_id: input.creatorId,
          opponent_id: input.opponentId,
          game_id: input.gameId,
          metric: input.metric,
          hours: input.hours,
          message: input.message.slice(0, 140),
        }),
    )
    if (!r.error) await notify({ recipient_id: input.opponentId, actor_id: input.creatorId, kind: 'challenge', body: 'challenged you' })
    return { error: r.error }
  },

  async answerChallenge(id, _userId, answer) {
    const sb = sbOrThrow()
    if (answer === 'accept') return asError(sb.rpc('accept_challenge', { p_id: id }))
    return asError(
      sb
        .from('challenges')
        .update({ status: answer === 'decline' ? 'declined' : 'cancelled' })
        .eq('id', id),
    )
  },

  async settleChallenges() {
    if (!(await this.v2())) return
    await sbOrThrow().rpc('settle_challenges')
  },

  async leagues(userId) {
    if (!(await this.v2())) return []
    const sb = sbOrThrow()
    const { data: mem } = await sb.from('league_members').select('league_id').eq('user_id', userId)
    const ids = ((mem as { league_id: string }[]) ?? []).map((m) => m.league_id)
    if (!ids.length) return []
    const [{ data: ls }, { data: all }] = await Promise.all([
      sb.from('leagues').select('*').in('id', ids),
      sb.from('league_members').select('league_id,user_id').in('league_id', ids),
    ])
    const members = (all as { league_id: string; user_id: string }[]) ?? []
    const out: LeagueView[] = []
    for (const l of (ls as LeagueRow[]) ?? []) {
      const b = await this.board({
        gameId: l.game_id,
        metric: 'week',
        scope: 'league',
        leagueId: l.id,
        limit: 1,
        week: isoWeekKey(),
        selfId: userId,
      }).catch(() => null)
      out.push({
        ...l,
        members: members.filter((m) => m.league_id === l.id).length,
        myRank: b?.me?.rank ?? null,
        leader: b?.entries[0]?.profile ?? null,
      })
    }
    return out
  },

  async createLeague(_userId, name, gameId, motto) {
    if (!(await this.v2())) return { error: 'Leagues need the latest server update.' }
    return asError<LeagueRow>(sbOrThrow().rpc('create_league', { p_name: name, p_game: gameId, p_motto: motto }))
  },

  async joinLeague(_userId, code) {
    if (!(await this.v2())) return { error: 'Leagues need the latest server update.' }
    const r = await asError<LeagueRow>(sbOrThrow().rpc('join_league', { p_code: code }))
    if (r.error && /no league/.test(r.error)) return { error: 'No league with that code.' }
    return r
  },

  async leaveLeague(userId, leagueId) {
    return asError(sbOrThrow().from('league_members').delete().eq('league_id', leagueId).eq('user_id', userId))
  },

  async cupResults(gameId, limitWeeks = 6) {
    if (!(await this.v2())) return []
    const { data } = await sbOrThrow()
      .from('cup_results')
      .select('*')
      .eq('game_id', gameId)
      .order('week_key', { ascending: false })
      .limit(limitWeeks * 3)
    const rows = (data as CupResult[]) ?? []
    const profiles = await profilesByIds(rows.map((r) => r.user_id))
    return rows.map((r) => ({ ...r, profile: profiles.get(r.user_id) ?? null }))
  },

  async trophies(userId) {
    if (!(await this.v2())) return []
    const { data } = await sbOrThrow().from('cup_results').select('*').eq('user_id', userId).order('week_key', { ascending: false })
    return (data as CupResult[]) ?? []
  },

  async settleCup(gameId, week) {
    if (!(await this.v2())) return
    await sbOrThrow().rpc('settle_cup', { p_game: gameId, p_week: week })
  },

  async notifications(userId) {
    const { data } = await sbOrThrow()
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    const rows = (data as NotificationRow[]) ?? []
    const actors = await profilesByIds(rows.map((n) => n.actor_id).filter((x): x is string => !!x))
    return rows.map<NotificationWithActor>((n) => ({ ...n, actor: n.actor_id ? (actors.get(n.actor_id) ?? null) : null }))
  },

  async markRead(userId) {
    await sbOrThrow().from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', userId).is('read_at', null)
  },
}

export type { SocialGameId }

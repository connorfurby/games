import type {
  FriendshipRow,
  NotificationRow,
  PostRow,
  ProfileRow,
  PublicStatsRow,
  ReactionKind,
  ReactionRow,
  SocialGameId,
} from '@/shared/database.types'
import type {
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
  StatsPublish,
  Suggestion,
} from './model'
import { BETA_GAME_ID, isBetaIssuer } from '@/shell/beta'
import { isoWeekKey, prevWeekKey, settingsOf, statValue } from './people'

/**
 * Demo backend: a small, believable town of players kept in memory. Used when the build
 * has no account server (local dev, previews, tests). Nothing leaves the browser.
 * Deterministic seed so screenshots and tests are stable.
 */

export const DEMO_ME = 'local-me'

const FIRST = [
  'Ava',
  'Ben',
  'Cleo',
  'Dev',
  'Eli',
  'Fran',
  'Gus',
  'Hana',
  'Iris',
  'Jules',
  'Kai',
  'Lou',
  'Mina',
  'Nico',
  'Oz',
  'Pia',
  'Quin',
  'Rae',
  'Sol',
  'Tess',
  'Uma',
  'Vic',
  'Wren',
  'Xan',
  'Yuki',
  'Zed',
  'Ari',
  'Bo',
  'Cass',
  'Dot',
  'Esme',
  'Finn',
  'Gil',
  'Ida',
  'Jun',
  'Kit',
]
const LAST = [
  'Park',
  'Okafor',
  'Lindqvist',
  'Moreau',
  'Tanaka',
  'Silva',
  'Novak',
  'Haddad',
  'Reyes',
  'Khan',
  'Fischer',
  'Byrne',
  'Costa',
  'Ito',
  'Nwosu',
  'Walsh',
]
const BIOS = [
  'Cans first, questions later.',
  'Running a corner store on lunch breaks.',
  'Signal Decay night shift regular.',
  'Chasing the weekly cup.',
  'Produce aisle purist.',
  '',
  'I name every cashier.',
  'Era 7 or bust.',
]
const ACC = ['tomato', 'tag', 'mint', 'sky', 'plum', 'rose', 'sand', 'ink'] as const
const POSTS = [
  'Finally got the cold chain humming. Freezers everywhere.',
  'Who else forgot to staff the opening shift and watched produce rot?',
  'Hit the till limit hard today. Four cashiers later…',
  'Took the weekly cup lead for an hour. Felt nice.',
  'Licensing deal signed. My house brand is in three other stores now.',
  'Signal Decay: answered 400 calls without a dropped line.',
  'New personal best on the daily run.',
  'Anyone found a good use for Greeters yet? Crowds love them.',
]

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

interface DemoDb {
  profiles: Map<string, ProfileRow>
  stats: PublicStatsRow[]
  friendships: FriendshipRow[]
  posts: PostRow[]
  comments: CommentWithAuthor[]
  reactions: ReactionRow[]
  notifications: NotificationRow[]
  milestones: Set<string>
  challenges: ChallengeRow[]
  leagues: LeagueRow[]
  members: { league_id: string; user_id: string }[]
  cups: CupResult[]
  betaGrants: { game_id: string; grantee_id: string; granted_by: string }[]
}

let db: DemoDb | null = null
let idn = 0
const uid = (p: string) => `${p}-${++idn}`
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()

function seed(): DemoDb {
  const r = rng(20261120)
  const pick = <T>(a: readonly T[]) => a[Math.floor(r() * a.length)]!
  const profiles = new Map<string, ProfileRow>()
  const stats: PublicStatsRow[] = []
  const week = isoWeekKey()
  const ids: string[] = []
  for (let i = 0; i < 36; i++) {
    const first = FIRST[i % FIRST.length]!
    const last = pick(LAST)
    const id = `demo-${i}`
    ids.push(id)
    const playing = r() < 0.18 ? pick(['grocery-empire', 'signal-decay'] as const) : null
    profiles.set(id, {
      id,
      handle: `${first}_${last}`.toLowerCase().slice(0, 20),
      friend_code: Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(r() * 32)]).join(''),
      display_name: `${first} ${last}`,
      avatar_url: null,
      bio: pick(BIOS),
      pinned_awards: [],
      last_seen_at: iso(playing ? r() * 60_000 : r() * 5 * 86_400_000),
      playing_game: playing,
      created_at: iso(30 * 86_400_000 + r() * 60 * 86_400_000),
      updated_at: iso(0),
      onboarded_at: iso(20 * 86_400_000),
      accent: pick(ACC),
      favorite_game: r() < 0.7 ? 'grocery-empire' : 'signal-decay',
      settings: {},
    })
    for (const g of ['grocery-empire', 'signal-decay'] as SocialGameId[]) {
      if (g === 'signal-decay' && r() < 0.45) continue
      const era = Math.floor(r() ** 1.6 * (g === 'grocery-empire' ? 12 : 8))
      const rev = Math.floor(10 ** (2 + era * 0.9 + r() * 1.5))
      const gain = Math.floor(rev * (0.05 + r() * 0.4))
      stats.push({
        user_id: id,
        game_id: g,
        era,
        lifetime_revenue: String(rev),
        revenue_num: rev,
        headline_count: Math.floor(rev / (8 + r() * 20)),
        play_seconds: Math.floor(3600 * (2 + era * 3 + r() * 10)),
        daily_challenge_baskets: g === 'grocery-empire' && r() < 0.6 ? Math.floor(200 + r() * 2400) : null,
        week_key: week,
        week_start_score: String(rev - gain),
        week_gain: gain,
        prev_week_key: prevWeekKey(),
        prev_week_gain: Math.floor(gain * (0.5 + r())),
        achievements: Math.floor(era * 4 + r() * 12),
        updated_at: iso(r() * 86_400_000),
      })
    }
  }
  const friendships: FriendshipRow[] = []
  const link = (a: string, b: string, status: FriendshipRow['status'], ago = 5 * 86_400_000) =>
    friendships.push({ id: uid('f'), requester_id: a, addressee_id: b, status, created_at: iso(ago), updated_at: iso(ago) })
  // You: six friends, two asking, one you asked.
  for (const i of [0, 3, 5, 8, 12, 17]) link(DEMO_ME, ids[i]!, 'accepted')
  link(ids[21]!, DEMO_ME, 'pending', 3 * 3600_000)
  link(ids[25]!, DEMO_ME, 'pending', 26 * 3600_000)
  link(DEMO_ME, ids[30]!, 'pending', 8 * 3600_000)
  // Friends of friends, for suggestions.
  for (const [a, b] of [
    [0, 9],
    [3, 9],
    [5, 9],
    [0, 14],
    [8, 14],
    [12, 19],
    [3, 3 + 20],
    [1, 2],
    [4, 6],
  ] as const)
    link(ids[a]!, ids[b]!, 'accepted')

  const posts: PostRow[] = []
  for (let i = 0; i < 14; i++) {
    const author = ids[[0, 3, 5, 8, 12, 17, 2, 9, 14, 20][i % 10]!]!
    const st = stats.find((s) => s.user_id === author)
    posts.push({
      id: uid('p'),
      author_id: author,
      body: POSTS[i % POSTS.length]!,
      visibility: i % 3 === 0 ? 'public' : 'friends',
      run_card:
        i % 2 === 0 && st
          ? {
              gameId: st.game_id,
              era: st.era,
              headline: `${Math.floor(st.headline_count).toLocaleString()} baskets`,
              playSec: st.play_seconds,
            }
          : null,
      created_at: iso(i * 3.3 * 3600_000 + r() * 3600_000),
    })
  }
  const reactions: ReactionRow[] = []
  for (const p of posts)
    for (const u of ids.slice(0, 12))
      if (r() < 0.22) reactions.push({ post_id: p.id, user_id: u, kind: pick(['stamp', 'basket', 'static'] as const), created_at: iso(0) })
  const comments: CommentWithAuthor[] = posts.slice(0, 4).map((p, i) => ({
    id: uid('c'),
    post_id: p.id,
    author_id: ids[(i * 5) % 18]!,
    body: ['Nice run.', 'How long did that take?', 'Cold chain is the best era.', 'Teach me your ways.'][i]!,
    created_at: iso(i * 1800_000),
  }))

  const challenges: ChallengeRow[] = []
  const now = Date.now()
  const mk = (c: Partial<ChallengeRow> & Pick<ChallengeRow, 'creator_id' | 'opponent_id' | 'status'>) =>
    challenges.push({
      id: uid('ch'),
      game_id: 'grocery-empire',
      metric: 'revenue',
      hours: 72,
      message: '',
      starts_at: null,
      ends_at: null,
      creator_start: null,
      opponent_start: null,
      creator_final: null,
      opponent_final: null,
      winner_id: null,
      created_at: iso(3600_000),
      ...c,
    })
  mk({ creator_id: ids[3]!, opponent_id: DEMO_ME, status: 'pending', metric: 'baskets', hours: 24, message: 'Rematch?' })
  mk({
    creator_id: DEMO_ME,
    opponent_id: ids[0]!,
    status: 'active',
    starts_at: iso(30 * 3600_000),
    ends_at: new Date(now + 42 * 3600_000).toISOString(),
    creator_start: 0,
    opponent_start: 0,
  })
  mk({
    creator_id: ids[8]!,
    opponent_id: DEMO_ME,
    status: 'done',
    hours: 24,
    creator_final: 18_400,
    opponent_final: 22_900,
    winner_id: DEMO_ME,
    starts_at: iso(4 * 86_400_000),
    ends_at: iso(3 * 86_400_000),
  })

  const leagues: LeagueRow[] = [
    {
      id: 'league-1',
      name: 'Night Shift Grocers',
      motto: 'Open till the lights go out.',
      code: 'NIGHT7',
      game_id: 'grocery-empire',
      owner_id: ids[0]!,
      created_at: iso(10 * 86_400_000),
    },
  ]
  const members = [DEMO_ME, ids[0], ids[3], ids[5], ids[9], ids[14], ids[20]].map((u) => ({ league_id: 'league-1', user_id: u! }))

  const cups: CupResult[] = []
  for (let w = 1; w <= 4; w++) {
    const key = isoWeekKey(new Date(now - w * 7 * 86_400_000))
    const top = [...stats].filter((s) => s.game_id === 'grocery-empire').sort((a, b) => (b.week_gain ?? 0) - (a.week_gain ?? 0))
    for (let p = 0; p < 3; p++) {
      const s = top[(p + w) % 8]!
      cups.push({
        game_id: 'grocery-empire',
        week_key: key,
        place: (p + 1) as 1 | 2 | 3,
        user_id: s.user_id,
        score: (s.prev_week_gain ?? 0) * (1.2 - p * 0.15),
      })
    }
  }

  const notifications: NotificationRow[] = [
    {
      id: uid('n'),
      recipient_id: DEMO_ME,
      kind: 'friend_request',
      actor_id: ids[21]!,
      post_id: null,
      body: 'sent you a friend request',
      read_at: null,
      created_at: iso(3 * 3600_000),
    },
    {
      id: uid('n'),
      recipient_id: DEMO_ME,
      kind: 'challenge',
      actor_id: ids[3]!,
      post_id: null,
      body: 'challenged you',
      read_at: null,
      created_at: iso(3600_000),
    },
    {
      id: uid('n'),
      recipient_id: DEMO_ME,
      kind: 'challenge_result',
      actor_id: ids[8]!,
      post_id: null,
      body: 'you won the challenge',
      read_at: iso(0),
      created_at: iso(3 * 86_400_000),
    },
  ]

  return {
    profiles,
    stats,
    friendships,
    posts,
    comments,
    reactions,
    notifications,
    milestones: new Set(),
    challenges,
    leagues,
    members,
    cups,
    betaGrants: [],
  }
}

function D(): DemoDb {
  if (!db) db = seed()
  return db
}

/** Tests: start from a fresh seed. */
export function __resetDemo() {
  db = null
  idn = 0
}

/** The local player's profile row (created on first use). */
export function ensureDemoMe(name = 'Local player'): ProfileRow {
  const d = D()
  let me = d.profiles.get(DEMO_ME)
  if (!me) {
    me = {
      id: DEMO_ME,
      handle: 'local_player',
      friend_code: 'LOCAL234',
      display_name: name,
      avatar_url: null,
      bio: '',
      pinned_awards: [],
      last_seen_at: iso(0),
      playing_game: null,
      created_at: iso(0),
      updated_at: iso(0),
      onboarded_at: iso(0),
      accent: 'tomato',
      favorite_game: 'grocery-empire',
      settings: {},
    }
    d.profiles.set(DEMO_ME, me)
  }
  return me
}

const ok = { error: null }
const friendsOf = (u: string) =>
  new Set(
    D()
      .friendships.filter((f) => f.status === 'accepted' && (f.requester_id === u || f.addressee_id === u))
      .map((f) => (f.requester_id === u ? f.addressee_id : f.requester_id)),
  )

function note(n: Omit<NotificationRow, 'id' | 'created_at' | 'read_at'>) {
  D().notifications.unshift({ ...n, id: uid('n'), created_at: iso(0), read_at: null })
}

function value(s: PublicStatsRow, metric: string, week: string): number {
  switch (metric) {
    case 'week':
      return s.week_key === week ? (s.week_gain ?? 0) : 0
    case 'era':
      return s.era
    case 'baskets':
      return s.headline_count
    case 'play':
      return s.play_seconds
    case 'daily':
      return s.daily_challenge_baskets ?? 0
    case 'awards':
      return s.achievements ?? 0
    default:
      return s.revenue_num ?? Number(s.lifetime_revenue)
  }
}

export const demoBackend: SocialBackend = {
  kind: 'demo',
  v2: async () => true,

  async getProfile(id) {
    if (id === DEMO_ME) return ensureDemoMe()
    return D().profiles.get(id) ?? null
  },
  async getProfileByHandle(handle) {
    ensureDemoMe()
    return [...D().profiles.values()].find((p) => p.handle.toLowerCase() === handle.toLowerCase()) ?? null
  },
  async profilesByIds(ids) {
    ensureDemoMe()
    const m = new Map<string, ProfileRow>()
    for (const id of ids) {
      const p = D().profiles.get(id)
      if (p) m.set(id, p)
    }
    return m
  },
  async updateProfile(id, patch) {
    const p = id === DEMO_ME ? ensureDemoMe() : D().profiles.get(id)
    if (!p) return { error: 'No such player.' }
    if (patch.handle && [...D().profiles.values()].some((o) => o.id !== id && o.handle === patch.handle))
      return { error: 'That handle is taken.' }
    Object.assign(p, patch, { updated_at: iso(0) })
    return { error: null, data: { ...p } }
  },
  async handleAvailable(handle, selfId) {
    return ![...D().profiles.values()].some((p) => p.id !== selfId && p.handle.toLowerCase() === handle.toLowerCase())
  },
  async search(q, selfId) {
    const n = q.trim().toLowerCase().replace(/^@/, '')
    if (n.length < 2) return []
    const friends = friendsOf(selfId)
    return [...D().profiles.values()]
      .filter((p) => p.id !== selfId)
      .filter(
        (p) =>
          p.friend_code === q.trim().toUpperCase() ||
          ((settingsOf(p).discoverable || friends.has(p.id)) && (p.handle.startsWith(n) || p.display_name.toLowerCase().includes(n))),
      )
      .slice(0, 12)
  },
  async suggestions(selfId) {
    const d = D()
    const mine = new Set(
      d.friendships.filter((f) => f.requester_id === selfId || f.addressee_id === selfId).flatMap((f) => [f.requester_id, f.addressee_id]),
    )
    const friends = friendsOf(selfId)
    const mutual = new Map<string, number>()
    for (const f of friends) for (const g of friendsOf(f)) if (g !== selfId && !mine.has(g)) mutual.set(g, (mutual.get(g) ?? 0) + 1)
    const myEra = Math.max(0, ...d.stats.filter((s) => s.user_id === selfId).map((s) => s.era))
    const near = d.stats.filter((s) => Math.abs(s.era - myEra) <= 1 && !mine.has(s.user_id) && s.user_id !== selfId).map((s) => s.user_id)
    const out: Suggestion[] = []
    for (const [id, n] of [...mutual].sort((a, b) => b[1] - a[1])) out.push({ profile: d.profiles.get(id)!, mutual: n, reason: 'mutual' })
    for (const id of near) if (!out.some((o) => o.profile.id === id)) out.push({ profile: d.profiles.get(id)!, mutual: 0, reason: 'near' })
    return out.filter((o) => o.profile && settingsOf(o.profile).discoverable).slice(0, 12)
  },
  async statsFor(userId) {
    return D().stats.filter((s) => s.user_id === userId)
  },

  async friendships(userId) {
    return D().friendships.filter((f) => f.requester_id === userId || f.addressee_id === userId)
  },
  async requestFriend(fromId, toId) {
    const d = D()
    const back = d.friendships.find((f) => f.requester_id === toId && f.addressee_id === fromId)
    if (back?.status === 'pending') return this.respondFriend(back, 'accepted', fromId)
    if (back?.status === 'blocked') return { error: 'You can’t add this player.' }
    if (d.friendships.some((f) => f.requester_id === fromId && f.addressee_id === toId)) return { error: 'Request already sent.' }
    d.friendships.push({
      id: uid('f'),
      requester_id: fromId,
      addressee_id: toId,
      status: 'pending',
      created_at: iso(0),
      updated_at: iso(0),
    })
    note({ recipient_id: toId, actor_id: fromId, kind: 'friend_request', post_id: null, body: 'sent you a friend request' })
    return ok
  },
  async respondFriend(f, status, actorId) {
    const row = D().friendships.find((x) => x.id === f.id)
    if (!row) return { error: 'Request not found.' }
    row.status = status
    row.updated_at = iso(0)
    if (status === 'accepted') {
      const other = f.requester_id === actorId ? f.addressee_id : f.requester_id
      note({ recipient_id: other, actor_id: actorId, kind: 'friend_accept', post_id: null, body: 'accepted your friend request' })
    }
    return ok
  },
  async removeFriendship(id) {
    const d = D()
    d.friendships = d.friendships.filter((f) => f.id !== id)
    return ok
  },

  async feed(userId, filter) {
    const d = D()
    const friends = friendsOf(userId)
    let rows = d.posts.filter((p) => p.visibility === 'public' || p.author_id === userId || friends.has(p.author_id))
    if (filter === 'mine') rows = rows.filter((p) => p.author_id === userId)
    else if (filter === 'friends') rows = rows.filter((p) => p.author_id === userId || friends.has(p.author_id))
    else if (typeof filter === 'object') rows = rows.filter((p) => p.author_id === filter.author)
    rows = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 40)
    return rows.map<PostWithAuthor>((p) => ({
      ...p,
      author: d.profiles.get(p.author_id) ?? null,
      commentCount: d.comments.filter((c) => c.post_id === p.id).length,
      reactions: (['stamp', 'basket', 'static'] as ReactionKind[]).map((kind) => ({
        kind,
        count: d.reactions.filter((r) => r.post_id === p.id && r.kind === kind).length,
        mine: d.reactions.some((r) => r.post_id === p.id && r.kind === kind && r.user_id === userId),
      })),
    }))
  },
  async createPost(input) {
    const post: PostRow = {
      id: uid('p'),
      author_id: input.authorId,
      body: input.body.slice(0, 500),
      visibility: input.visibility,
      run_card: input.runCard ?? null,
      created_at: iso(0),
    }
    D().posts.unshift(post)
    return { error: null, data: post }
  },
  async deletePost(id) {
    const d = D()
    d.posts = d.posts.filter((p) => p.id !== id)
    return ok
  },
  async toggleReaction(postId, userId, kind, on, authorId) {
    const d = D()
    d.reactions = d.reactions.filter((r) => !(r.post_id === postId && r.user_id === userId && r.kind === kind))
    if (on) {
      d.reactions.push({ post_id: postId, user_id: userId, kind, created_at: iso(0) })
      if (authorId !== userId)
        note({ recipient_id: authorId, actor_id: userId, kind: 'reaction', post_id: postId, body: `reacted with ${kind}` })
    }
    return ok
  },
  async comments(postId) {
    const d = D()
    return d.comments.filter((c) => c.post_id === postId).map((c) => ({ ...c, author: d.profiles.get(c.author_id) ?? null }))
  },
  async addComment(postId, authorId, body, postAuthorId) {
    D().comments.push({ id: uid('c'), post_id: postId, author_id: authorId, body: body.slice(0, 280), created_at: iso(0) })
    if (postAuthorId !== authorId)
      note({ recipient_id: postAuthorId, actor_id: authorId, kind: 'comment', post_id: postId, body: 'commented on your post' })
    return ok
  },
  async milestoneShared(userId, gameId, era) {
    return D().milestones.has(`${userId}:${gameId}:${era}`)
  },
  async shareMilestone(userId, gameId, era) {
    D().milestones.add(`${userId}:${gameId}:${era}`)
    return ok
  },

  async publishStats(userId, rows: StatsPublish[]) {
    const d = D()
    for (const r of rows) {
      const old = d.stats.find((s) => s.user_id === userId && s.game_id === r.game_id)
      const sameWeek = old?.week_key === r.week_key
      const start = sameWeek ? Number(old!.week_start_score) : r.revenue_num
      const row: PublicStatsRow = {
        user_id: userId,
        game_id: r.game_id,
        era: r.era,
        lifetime_revenue: r.lifetime_revenue,
        revenue_num: r.revenue_num,
        headline_count: r.headline_count,
        play_seconds: r.play_seconds,
        daily_challenge_baskets: r.daily_challenge_baskets,
        week_key: r.week_key,
        week_start_score: String(start),
        week_gain: Math.max(0, r.revenue_num - start),
        prev_week_key: sameWeek ? (old?.prev_week_key ?? null) : (old?.week_key ?? null),
        prev_week_gain: sameWeek ? (old?.prev_week_gain ?? 0) : (old?.week_gain ?? 0),
        achievements: r.achievements,
        updated_at: iso(0),
      }
      if (old) Object.assign(old, row)
      else d.stats.push(row)
    }
  },

  async board({ gameId, metric, scope, leagueId, limit = 50, week, selfId }) {
    const d = D()
    const friends = friendsOf(selfId)
    const leagueMembers = new Set(d.members.filter((m) => m.league_id === leagueId).map((m) => m.user_id))
    const pool = d.stats
      .filter((s) => s.game_id === gameId)
      .filter((s) => {
        if (scope === 'friends') return s.user_id === selfId || friends.has(s.user_id)
        if (scope === 'league') return leagueMembers.has(s.user_id) && leagueMembers.has(selfId)
        const p = d.profiles.get(s.user_id)
        return s.user_id === selfId || friends.has(s.user_id) || settingsOf(p).public_boards
      })
      .map((s) => ({ s, v: value(s, metric, week) }))
      .filter((x) => x.v > 0 || x.s.user_id === selfId)
      .sort((a, b) => b.v - a.v)
    const entries = pool.map<BoardEntry>((x, i) => ({
      rank: i + 1,
      userId: x.s.user_id,
      value: x.v,
      era: x.s.era,
      profile: d.profiles.get(x.s.user_id) ?? null,
      isMe: x.s.user_id === selfId,
      isFriend: friends.has(x.s.user_id),
    }))
    return { entries: entries.slice(0, limit), total: entries.length, me: entries.find((e) => e.isMe) ?? null }
  },

  async challenges(userId) {
    const d = D()
    const cur = (u: string, c: ChallengeRow) => {
      const s = d.stats.find((x) => x.user_id === u && x.game_id === c.game_id)
      return s ? statValue(s, c.metric) : 0
    }
    return d.challenges
      .filter((c) => c.creator_id === userId || c.opponent_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map<ChallengeView>((c) => {
        // Demo rivals make steady progress so live bars move.
        const elapsed = c.starts_at ? Math.max(0, Date.now() - new Date(c.starts_at).getTime()) / 3600_000 : 0
        const fake = (u: string) =>
          u === DEMO_ME ? Math.max(0, cur(u, c) - (c.creator_id === u ? (c.creator_start ?? 0) : (c.opponent_start ?? 0))) : elapsed * 900
        return {
          ...c,
          creator: d.profiles.get(c.creator_id) ?? null,
          opponent: d.profiles.get(c.opponent_id) ?? null,
          creatorProgress: c.status === 'done' ? (c.creator_final ?? 0) : c.status === 'active' ? fake(c.creator_id) : 0,
          opponentProgress: c.status === 'done' ? (c.opponent_final ?? 0) : c.status === 'active' ? fake(c.opponent_id) : 0,
        }
      })
  },
  async createChallenge(input) {
    if (!friendsOf(input.creatorId).has(input.opponentId)) return { error: 'You can only challenge friends.' }
    D().challenges.unshift({
      id: uid('ch'),
      game_id: input.gameId,
      metric: input.metric,
      creator_id: input.creatorId,
      opponent_id: input.opponentId,
      status: 'pending',
      hours: input.hours,
      message: input.message.slice(0, 140),
      starts_at: null,
      ends_at: null,
      creator_start: null,
      opponent_start: null,
      creator_final: null,
      opponent_final: null,
      winner_id: null,
      created_at: iso(0),
    })
    note({ recipient_id: input.opponentId, actor_id: input.creatorId, kind: 'challenge', post_id: null, body: 'challenged you' })
    return ok
  },
  async answerChallenge(id, userId, answer) {
    const d = D()
    const c = d.challenges.find((x) => x.id === id)
    if (!c || c.status !== 'pending') return { error: 'That challenge is no longer open.' }
    if (answer === 'accept') {
      if (c.opponent_id !== userId) return { error: 'Only the player challenged can accept.' }
      const val = (u: string) => {
        const s = d.stats.find((x) => x.user_id === u && x.game_id === c.game_id)
        return s ? statValue(s, c.metric) : 0
      }
      Object.assign(c, {
        status: 'active',
        starts_at: iso(0),
        ends_at: new Date(Date.now() + c.hours * 3600_000).toISOString(),
        creator_start: val(c.creator_id),
        opponent_start: val(c.opponent_id),
      })
      note({ recipient_id: c.creator_id, actor_id: userId, kind: 'challenge_accept', post_id: null, body: 'accepted your challenge' })
    } else c.status = answer === 'decline' ? 'declined' : 'cancelled'
    return ok
  },
  async settleChallenges(userId) {
    const views = await this.challenges(userId)
    for (const v of views) {
      if (v.status !== 'active' || !v.ends_at || new Date(v.ends_at).getTime() > Date.now()) continue
      const c = D().challenges.find((x) => x.id === v.id)!
      c.status = 'done'
      c.creator_final = v.creatorProgress
      c.opponent_final = v.opponentProgress
      c.winner_id = v.creatorProgress > v.opponentProgress ? c.creator_id : v.opponentProgress > v.creatorProgress ? c.opponent_id : null
    }
  },
  async leagues(userId) {
    const d = D()
    const mine = d.members.filter((m) => m.user_id === userId).map((m) => m.league_id)
    const out: LeagueView[] = []
    for (const l of d.leagues.filter((x) => mine.includes(x.id))) {
      const b = await this.board({ gameId: l.game_id, metric: 'week', scope: 'league', leagueId: l.id, week: isoWeekKey(), selfId: userId })
      out.push({
        ...l,
        members: d.members.filter((m) => m.league_id === l.id).length,
        myRank: b.me?.rank ?? null,
        leader: b.entries[0]?.profile ?? null,
      })
    }
    return out
  },
  async createLeague(userId, name, gameId, motto) {
    const d = D()
    if (d.leagues.filter((l) => l.owner_id === userId).length >= 5) return { error: 'You can run five leagues at most.' }
    const code = Array.from(
      { length: 6 },
      (_, i) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[(name.charCodeAt(i % name.length) + i * 7 + d.leagues.length) % 32],
    ).join('')
    const l: LeagueRow = {
      id: uid('league'),
      name: name.trim(),
      motto: motto.trim(),
      code,
      game_id: gameId,
      owner_id: userId,
      created_at: iso(0),
    }
    d.leagues.push(l)
    d.members.push({ league_id: l.id, user_id: userId })
    return { error: null, data: l }
  },
  async joinLeague(userId, code) {
    const d = D()
    const l = d.leagues.find((x) => x.code === code.trim().toUpperCase())
    if (!l) return { error: 'No league with that code.' }
    if (!d.members.some((m) => m.league_id === l.id && m.user_id === userId)) d.members.push({ league_id: l.id, user_id: userId })
    return { error: null, data: l }
  },
  async leaveLeague(userId, leagueId) {
    const d = D()
    d.members = d.members.filter((m) => !(m.league_id === leagueId && m.user_id === userId))
    return ok
  },
  async cupResults(gameId, limitWeeks = 6) {
    const d = D()
    return d.cups
      .filter((c) => c.game_id === gameId)
      .sort((a, b) => b.week_key.localeCompare(a.week_key) || a.place - b.place)
      .slice(0, limitWeeks * 3)
      .map((c) => ({ ...c, profile: d.profiles.get(c.user_id) ?? null }))
  },
  async trophies(userId) {
    return D().cups.filter((c) => c.user_id === userId)
  },
  async settleCup() {
    /* The demo seeds past cups. */
  },

  async notifications(userId) {
    const d = D()
    return d.notifications
      .filter((n) => n.recipient_id === userId)
      .slice(0, 50)
      .map<NotificationWithActor>((n) => ({ ...n, actor: n.actor_id ? (d.profiles.get(n.actor_id) ?? null) : null }))
  },
  async betaState(userId) {
    const p = userId === DEMO_ME ? ensureDemoMe() : D().profiles.get(userId)
    const granted = D().betaGrants.some((g) => g.game_id === BETA_GAME_ID && g.grantee_id === userId)
    return {
      games: isBetaIssuer(p?.handle) || granted ? [BETA_GAME_ID] : [],
      sentTo: D().betaGrants.filter((g) => g.granted_by === userId).map((g) => g.grantee_id),
    }
  },

  async grantBetaKey(fromId, toId) {
    const from = fromId === DEMO_ME ? ensureDemoMe() : D().profiles.get(fromId)
    if (!isBetaIssuer(from?.handle)) return { error: 'Only @connorfurby can send a beta key.' }
    if (!friendsOf(fromId).has(toId)) return { error: 'Beta keys go only to friends.' }
    const d = D()
    if (!d.betaGrants.some((g) => g.game_id === BETA_GAME_ID && g.grantee_id === toId)) {
      d.betaGrants.push({ game_id: BETA_GAME_ID, grantee_id: toId, granted_by: fromId })
      note({
        recipient_id: toId,
        actor_id: fromId,
        kind: 'beta_key',
        post_id: null,
        body: 'sent you a Signal Decay beta key',
      })
    }
    return ok
  },

  async markRead(userId) {
    for (const n of D().notifications) if (n.recipient_id === userId && !n.read_at) n.read_at = iso(0)
  },
}

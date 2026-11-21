import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { FriendshipRow, ProfileRow } from '@/shared/database.types'
import { BETA_GAME_ID, isBetaIssuer } from '@/shell/beta'
import { useAuth } from '../AuthContext'
import { social } from './backend'
import type { ChallengeView, LeagueView, NotificationWithActor, Relation } from './model'
import { prevWeekKey } from './people'
import { publishPublicStats } from './stats'

export interface FriendLink {
  friendship: FriendshipRow
  profile: ProfileRow | null
  otherId: string
}

interface SocialCtx {
  ready: boolean
  v2: boolean
  friends: FriendLink[]
  incoming: FriendLink[]
  outgoing: FriendLink[]
  notifications: NotificationWithActor[]
  unread: number
  challenges: ChallengeView[]
  leagues: LeagueView[]
  /** Things waiting on you: requests and challenges to answer. */
  waiting: number
  relationTo: (id: string) => { relation: Relation; friendship: FriendshipRow | null }
  /** True when this account may open a vaulted game. Grocery is always open. */
  canPlay: (gameId: string) => boolean
  /** Friend ids @connorfurby has already keyed. Empty for everyone else. */
  betaSentTo: string[]
  refresh: () => Promise<void>
  addFriend: (id: string) => Promise<string | null>
  sendBetaKey: (friendId: string) => Promise<string | null>
  answerFriend: (f: FriendshipRow, status: 'accepted' | 'blocked') => Promise<string | null>
  removeFriend: (f: FriendshipRow) => Promise<string | null>
  markRead: () => Promise<void>
}

const Ctx = createContext<SocialCtx | null>(null)

const POLL_MS = 120_000

/** One shared, polled view of your social graph, so every room is instant and consistent. */
export function SocialProvider({ children }: { children: ReactNode }) {
  const { user, profile, savesReady } = useAuth()
  const loc = useLocation()
  const onSocial = loc.pathname.startsWith('/social') || loc.pathname.startsWith('/compete') || loc.pathname.startsWith('/boards') || loc.pathname.startsWith('/friends') || loc.pathname.startsWith('/you') || loc.pathname.startsWith('/u/') || loc.pathname.startsWith('/add/')
  const uid = user?.id ?? null
  const [ready, setReady] = useState(false)
  const [v2, setV2] = useState(false)
  const [rows, setRows] = useState<FriendshipRow[]>([])
  const [people, setPeople] = useState<Map<string, ProfileRow>>(new Map())
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([])
  const [challenges, setChallenges] = useState<ChallengeView[]>([])
  const [leagues, setLeagues] = useState<LeagueView[]>([])
  const [betaGames, setBetaGames] = useState<string[]>([])
  const [betaSentTo, setBetaSentTo] = useState<string[]>([])
  const busy = useRef(false)
  const unreadRef = useRef(0)

  const refresh = useCallback(async () => {
    if (!uid || busy.current) return
    busy.current = true
    try {
      const b = social()
      const hasV2 = await b.v2()
      setV2(hasV2)
      const fs = await b.friendships(uid)
      const ids = fs.map((f) => (f.requester_id === uid ? f.addressee_id : f.requester_id))
      const [profiles, notes, chals, lgs, beta] = await Promise.all([
        b.profilesByIds(ids),
        b.notifications(uid),
        hasV2 ? b.challenges(uid) : Promise.resolve([]),
        hasV2 ? b.leagues(uid) : Promise.resolve([]),
        b.betaState(uid),
      ])
      setRows(fs)
      setPeople(profiles)
      setNotifications(notes)
      setChallenges(chals)
      setLeagues(lgs)
      setBetaGames(beta.games)
      setBetaSentTo(beta.sentTo)
      setReady(true)
    } catch (e) {
      console.warn('social refresh', e)
    } finally {
      busy.current = false
    }
  }, [uid])

  // First load: publish stats, close finished challenges and last week's cup, then read.
  useEffect(() => {
    if (!uid || !savesReady) {
      setReady(false)
      setBetaGames([])
      setBetaSentTo([])
      return
    }
    let stop = false
    void (async () => {
      const b = social()
      await publishPublicStats(uid, true)
      if (await b.v2()) {
        await Promise.all([
          b.settleChallenges(uid).catch(() => {}),
          b.settleCup('grocery-empire', prevWeekKey()).catch(() => {}),
          b.settleCup('signal-decay', prevWeekKey()).catch(() => {}),
        ])
      }
      if (!stop) await refresh()
    })()
    return () => {
      stop = true
    }
  }, [uid, savesReady, refresh])

  // Home and the vaulted game re-read keys so a friend sees a grant without waiting on the poll.
  useEffect(() => {
    if (!uid || !savesReady) return
    if (loc.pathname === '/' || loc.pathname.startsWith('/play/signal-decay')) void refresh()
  }, [uid, savesReady, loc.pathname, refresh])

  // Slow poll only on Social routes (or while you have unread badges and the tab is visible).
  useEffect(() => {
    if (!uid || !savesReady) return
    const shouldPoll = () => {
      if (document.hidden) return false
      return onSocial || unreadRef.current > 0
    }
    const tick = () => {
      if (!shouldPoll()) return
      void publishPublicStats(uid)
      void refresh()
    }
    const id = window.setInterval(tick, POLL_MS)
    const onVis = () => {
      if (!document.hidden && onSocial) tick()
    }
    document.addEventListener('visibilitychange', onVis)
    if (onSocial) tick()
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [uid, savesReady, refresh, onSocial])

  const links = useMemo(() => {
    const mk = (f: FriendshipRow): FriendLink => {
      const otherId = f.requester_id === uid ? f.addressee_id : f.requester_id
      return { friendship: f, otherId, profile: people.get(otherId) ?? null }
    }
    return {
      friends: rows.filter((f) => f.status === 'accepted').map(mk),
      incoming: rows.filter((f) => f.status === 'pending' && f.addressee_id === uid).map(mk),
      outgoing: rows.filter((f) => f.status === 'pending' && f.requester_id === uid).map(mk),
    }
  }, [rows, people, uid])

  const relationTo = useCallback(
    (id: string) => {
      if (id === uid) return { relation: 'self' as Relation, friendship: null }
      const f =
        rows.find((x) => (x.requester_id === id && x.addressee_id === uid) || (x.requester_id === uid && x.addressee_id === id)) ?? null
      if (!f) return { relation: 'none' as Relation, friendship: null }
      if (f.status === 'accepted') return { relation: 'friends' as Relation, friendship: f }
      if (f.status === 'blocked') return { relation: 'blocked' as Relation, friendship: f }
      return { relation: (f.addressee_id === uid ? 'incoming' : 'outgoing') as Relation, friendship: f }
    },
    [rows, uid],
  )

  const after = useCallback(
    async (p: Promise<{ error: string | null }>) => {
      const { error } = await p
      await refresh()
      return error
    },
    [refresh],
  )

  const canPlay = useCallback(
    (gameId: string) => {
      if (gameId !== BETA_GAME_ID) return true
      return isBetaIssuer(profile?.handle) || betaGames.includes(BETA_GAME_ID)
    },
    [profile?.handle, betaGames],
  )

  const value = useMemo<SocialCtx>(() => {
    const unread = notifications.filter((n) => !n.read_at).length
    unreadRef.current = unread
    const waitingChallenges = challenges.filter((c) => c.status === 'pending' && c.opponent_id === uid).length
    return {
      ready,
      v2,
      ...links,
      notifications,
      unread,
      challenges,
      leagues,
      waiting: links.incoming.length + waitingChallenges,
      relationTo,
      canPlay,
      betaSentTo,
      refresh,
      addFriend: (id) => (uid ? after(social().requestFriend(uid, id)) : Promise.resolve('Sign in first.')),
      answerFriend: (f, status) => (uid ? after(social().respondFriend(f, status, uid)) : Promise.resolve('Sign in first.')),
      removeFriend: (f) => after(social().removeFriendship(f.id)),
      sendBetaKey: async (friendId) => {
        if (!uid) return 'Sign in first.'
        if (!isBetaIssuer(profile?.handle)) return 'Only @connorfurby can send a beta key.'
        const { error } = await social().grantBetaKey(uid, friendId)
        await refresh()
        return error
      },
      markRead: async () => {
        if (!uid) return
        await social().markRead(uid)
        await refresh()
      },
    }
  }, [ready, v2, links, notifications, challenges, leagues, relationTo, canPlay, betaSentTo, refresh, after, uid, profile?.handle])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSocial(): SocialCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSocial outside SocialProvider')
  return ctx
}

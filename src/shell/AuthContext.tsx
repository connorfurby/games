import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { flushNow, hydrateForUser, setSyncUser, signOutClear, subscribeHydrate } from '@/shared/cloudSync'
import type { ProfileRow } from '@/shared/database.types'
import { getSupabase, supabaseConfigured } from '@/shared/supabase'

interface AuthCtx {
  configured: boolean
  ready: boolean
  session: Session | null
  user: User | null
  profile: ProfileRow | null
  hydrating: boolean
  hydrateError: string | null
  savesReady: boolean
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (
    patch: Partial<Pick<ProfileRow, 'handle' | 'bio' | 'display_name' | 'pinned_awards'>>,
  ) => Promise<{ error: string | null }>
}

const Ctx = createContext<AuthCtx | null>(null)

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) {
    console.warn('profile fetch', error.message)
    return null
  }
  return data as ProfileRow | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [hydrating, setHydrating] = useState(false)
  const [hydrateError, setHydrateError] = useState<string | null>(null)
  const [savesReady, setSavesReady] = useState(false)
  const lastHydrated = useRef<string | null>(null)

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id
    if (!uid) {
      setProfile(null)
      return
    }
    setProfile(await fetchProfile(uid))
  }, [session?.user?.id])

  useEffect(() => {
    return subscribeHydrate((e) => {
      if (e.type === 'start') {
        setHydrating(true)
        setSavesReady(false)
        setHydrateError(null)
      } else if (e.type === 'error') {
        setHydrateError(e.message)
      } else if (e.type === 'done') {
        setHydrating(false)
        setSavesReady(e.reloaded)
        if (e.reloaded) {
          window.dispatchEvent(new CustomEvent('games:cloud-reloaded'))
        }
      }
    })
  }, [])

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) {
      setReady(true)
      return
    }

    let cancelled = false

    const runHydrate = async (userId: string) => {
      if (lastHydrated.current === userId) return
      lastHydrated.current = userId
      await hydrateForUser(userId)
      if (!cancelled) {
        setProfile(await fetchProfile(userId))
        setSavesReady(true)
      }
    }

    void sb.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setReady(true)
      if (data.session?.user?.id) await runHydrate(data.session.user.id)
      else setSavesReady(false)
    })

    const { data: sub } = sb.auth.onAuthStateChange(async (event, next) => {
      setSession(next)
      if (event === 'SIGNED_OUT') {
        signOutClear()
        setProfile(null)
        setSavesReady(false)
        lastHydrated.current = null
        return
      }
      if (next?.user?.id && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        lastHydrated.current = null
        await runHydrate(next.user.id)
      } else if (next?.user?.id && event === 'TOKEN_REFRESHED') {
        void fetchProfile(next.user.id).then((p) => {
          if (!cancelled && p) setProfile(p)
        })
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const sb = getSupabase()
    if (!sb) return { error: 'Accounts are not configured on this build.' }
    const redirectTo = `${window.location.origin}/`
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, queryParams: { prompt: 'select_account' } },
    })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    const sb = getSupabase()
    await flushNow()
    if (!sb) {
      signOutClear()
      setProfile(null)
      setSavesReady(false)
      lastHydrated.current = null
      return
    }
    await sb.auth.signOut()
    signOutClear()
    setSyncUser(null)
    setProfile(null)
    setSavesReady(false)
    lastHydrated.current = null
  }, [])

  const updateProfile = useCallback(
    async (patch: Partial<Pick<ProfileRow, 'handle' | 'bio' | 'display_name' | 'pinned_awards'>>) => {
      const sb = getSupabase()
      const uid = session?.user?.id
      if (!sb || !uid) return { error: 'Sign in first.' }
      const cleaned = {
        ...patch,
        handle: patch.handle?.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24),
      }
      const { data, error } = await sb.from('profiles').update(cleaned).eq('id', uid).select('*').maybeSingle()
      if (error) return { error: error.message }
      if (data) setProfile(data as ProfileRow)
      return { error: null }
    },
    [session?.user?.id],
  )

  const value = useMemo<AuthCtx>(
    () => ({
      configured: supabaseConfigured,
      ready,
      session,
      user: session?.user ?? null,
      profile,
      hydrating,
      hydrateError,
      savesReady: !!session && savesReady && !hydrating,
      signInWithGoogle,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [
      ready,
      session,
      profile,
      hydrating,
      hydrateError,
      savesReady,
      signInWithGoogle,
      signOut,
      refreshProfile,
      updateProfile,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}

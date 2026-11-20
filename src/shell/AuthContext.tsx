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
import { social } from './social/backend'
import { DEMO_ME, ensureDemoMe } from './social/demoBackend'
import type { ProfilePatch } from './social/model'

interface AuthCtx {
  configured: boolean
  /** No account server on this build: you play as a local player (nothing is uploaded). */
  local: boolean
  /** Signed in but hasn't picked a name yet. */
  needsOnboarding: boolean
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
  updateProfile: (patch: ProfilePatch) => Promise<{ error: string | null }>
}

/** A stand-in session for builds without accounts, so play, saves and Social still work. */
const LOCAL_SESSION = {
  access_token: 'local',
  refresh_token: 'local',
  expires_in: 0,
  token_type: 'bearer',
  user: { id: DEMO_ME, app_metadata: {}, user_metadata: {}, aud: 'local', created_at: new Date(0).toISOString() },
} as unknown as Session

function localOnboardForced(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('onboard') || sessionStorage.getItem('games.forceOnboard') === '1'
  } catch {
    return false
  }
}

const Ctx = createContext<AuthCtx | null>(null)

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  try {
    return await social().getProfile(userId)
  } catch (e) {
    console.warn('profile fetch', e)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const local = !supabaseConfigured
  const [ready, setReady] = useState(local)
  const [session, setSession] = useState<Session | null>(local ? LOCAL_SESSION : null)
  const [profile, setProfile] = useState<ProfileRow | null>(() => {
    if (!local) return null
    const me = ensureDemoMe()
    if (localOnboardForced()) me.onboarded_at = null
    return { ...me }
  })
  const [hydrating, setHydrating] = useState(false)
  const [hydrateError, setHydrateError] = useState<string | null>(null)
  const [savesReady, setSavesReady] = useState(local)
  const [v2, setV2] = useState(local)
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
    // Must match an entry in Supabase Auth → URL Configuration → Redirect URLs.
    // If it doesn't, Auth falls back to Site URL (often localhost:3000) and the return breaks.
    const redirectTo = `${window.location.origin}/`
    try {
      sessionStorage.setItem('games.authReturn', window.location.pathname + window.location.search)
    } catch {
      /* ignore */
    }
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    const sb = getSupabase()
    await flushNow()
    // Local play has no account to leave.
    if (!sb) return
    await sb.auth.signOut()
    signOutClear()
    setSyncUser(null)
    setProfile(null)
    setSavesReady(false)
    lastHydrated.current = null
  }, [])

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      const uid = session?.user?.id
      if (!uid) return { error: 'Sign in first.' }
      const cleaned: ProfilePatch = { ...patch }
      if (patch.handle != null) cleaned.handle = patch.handle.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
      if (patch.display_name != null) cleaned.display_name = patch.display_name.replace(/\s+/g, ' ').trim().slice(0, 32)
      const { data, error } = await social().updateProfile(uid, cleaned)
      if (error) return { error }
      if (data) setProfile(data)
      return { error: null }
    },
    [session?.user?.id],
  )

  // Learn whether the account server has the v2 tables (names, settings, competitions).
  useEffect(() => {
    if (local || !session) return
    void social()
      .v2()
      .then(setV2)
      .catch(() => setV2(false))
  }, [local, session])

  // Without the v2 server we can't record onboarding, so we don't block on it.
  const needsOnboarding = !!session && !!profile && v2 && !profile.onboarded_at

  const value = useMemo<AuthCtx>(
    () => ({
      configured: supabaseConfigured,
      local,
      needsOnboarding,
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
      local,
      needsOnboarding,
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

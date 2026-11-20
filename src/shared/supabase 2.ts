import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = !!(url && key)

// Untyped client: table Row/Insert shapes live in database.types.ts and are asserted at call sites.
// Generated Database generics from supabase-js are brittle across CLI versions for this app.
let client: SupabaseClient | null = null

/** Lazy singleton. Null when env is missing — signed-out local play still works. */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null
  if (!client) {
    client = createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  }
  return client
}

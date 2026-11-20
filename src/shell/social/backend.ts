import { supabaseConfigured } from '@/shared/supabase'
import { demoBackend } from './demoBackend'
import type { SocialBackend } from './model'
import { supabaseBackend } from './supabaseBackend'

/**
 * Where social data lives: the account server when this build has one, otherwise the
 * in-memory demo town (local play, previews, tests).
 */
export function social(): SocialBackend {
  return supabaseConfigured ? supabaseBackend : demoBackend
}

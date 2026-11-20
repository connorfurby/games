import { loadGame } from '@/shared/save'
import type { SocialGameId } from '@/shared/database.types'
import { getSupabase } from '@/shared/supabase'
import { loadMeta } from '@/shared/save'
import type { MetaSave } from '@/shared/types'
import { DEFAULT_META } from '@/shared/types'

function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function scoreFromRevenue(rev: number): string {
  return String(Math.max(0, Math.floor(rev)))
}

/** Publish glance stats for leaderboards. Never publishes DevMode runs. */
export async function publishPublicStats(userId: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return

  const week = isoWeekKey()
  const meta = loadMeta<MetaSave>(DEFAULT_META)

  const grocery = loadGame<{
    era?: number
    lifetimeRevenue?: number
    baskets?: number
    stats?: { playSec?: number }
  }>('grocery-empire')

  const signal = loadGame<{
    era?: number
    lifetimeRevenue?: number
    calls?: number
    time?: number
  }>('signal-decay')

  const rows: {
    user_id: string
    game_id: SocialGameId
    era: number
    lifetime_revenue: string
    headline_count: number
    play_seconds: number
    daily_challenge_baskets: number | null
    week_key: string
    week_start_score: string
  }[] = []

  if (grocery) {
    const rev = Number(grocery.lifetimeRevenue ?? 0)
    const existing = await sb
      .from('public_stats')
      .select('week_key, week_start_score')
      .eq('user_id', userId)
      .eq('game_id', 'grocery-empire')
      .maybeSingle()
    const prev = existing.data as { week_key?: string; week_start_score?: string } | null
    const weekStart =
      prev?.week_key === week && prev.week_start_score != null ? prev.week_start_score : scoreFromRevenue(rev)
    rows.push({
      user_id: userId,
      game_id: 'grocery-empire',
      era: Math.max(0, Math.floor(grocery.era ?? 0)),
      lifetime_revenue: scoreFromRevenue(rev),
      headline_count: Math.max(0, Number(grocery.baskets ?? 0)),
      play_seconds: Math.max(0, Number(grocery.stats?.playSec ?? 0)),
      daily_challenge_baskets:
        meta.dailyChallengeBest?.day && meta.dailyChallengeBest.day === new Date().toLocaleDateString('en-CA')
          ? meta.dailyChallengeBest.baskets
          : meta.dailyChallengeBest?.baskets ?? null,
      week_key: week,
      week_start_score: weekStart,
    })
  }

  if (signal) {
    const rev = Number(signal.lifetimeRevenue ?? 0)
    const existing = await sb
      .from('public_stats')
      .select('week_key, week_start_score')
      .eq('user_id', userId)
      .eq('game_id', 'signal-decay')
      .maybeSingle()
    const prev = existing.data as { week_key?: string; week_start_score?: string } | null
    const weekStart =
      prev?.week_key === week && prev.week_start_score != null ? prev.week_start_score : scoreFromRevenue(rev)
    rows.push({
      user_id: userId,
      game_id: 'signal-decay',
      era: Math.max(0, Math.floor(signal.era ?? 0)),
      lifetime_revenue: scoreFromRevenue(rev),
      headline_count: Math.max(0, Number(signal.calls ?? 0)),
      play_seconds: Math.max(0, Number(signal.time ?? 0)),
      daily_challenge_baskets: null,
      week_key: week,
      week_start_score: weekStart,
    })
  }

  if (!rows.length) return
  const { error } = await sb.from('public_stats').upsert(rows, { onConflict: 'user_id,game_id' })
  if (error) console.warn('public_stats upsert', error.message)
}

export function runCardFromLocal(gameId: SocialGameId): import('@/shared/database.types').RunCard | null {
  const meta = loadMeta<MetaSave>(DEFAULT_META)
  if (gameId === 'grocery-empire') {
    const g = loadGame<{ era?: number; baskets?: number; stats?: { playSec?: number } }>('grocery-empire')
    if (!g) return null
    return {
      gameId,
      era: Math.floor(g.era ?? 0),
      headline: `${Math.floor(g.baskets ?? 0).toLocaleString()} baskets`,
      playSec: Math.floor(g.stats?.playSec ?? 0),
      packId: meta.equippedPack,
    }
  }
  const s = loadGame<{ era?: number; calls?: number; time?: number }>('signal-decay')
  if (!s) return null
  return {
    gameId,
    era: Math.floor(s.era ?? 0),
    headline: `${Math.floor(s.calls ?? 0).toLocaleString()} calls`,
    playSec: Math.floor(s.time ?? 0),
    packId: meta.equippedPack,
  }
}

import type { RunCard, SocialGameId } from '@/shared/database.types'
import { loadGame, loadMeta } from '@/shared/save'
import { getCampaignGlance } from '@/shared/saveGlance'
import type { MetaSave } from '@/shared/types'
import { DEFAULT_META } from '@/shared/types'
import { social } from './backend'
import type { StatsPublish } from './model'
import { isoWeekKey } from './people'

type GrocerySave = { era?: number; lifetimeRevenue?: number; baskets?: number; stats?: { playSec?: number } }
type SignalSave = { era?: number; lifetimeRevenue?: number; calls?: number; time?: number }

let last = 0

function groceryRow(week: string, awards: string[], meta: MetaSave): StatsPublish | null {
  const glance = getCampaignGlance('grocery-empire')
  if (glance) {
    const today = new Date().toLocaleDateString('en-CA')
    return {
      game_id: 'grocery-empire',
      era: glance.era,
      lifetime_revenue: String(glance.lifetimeRevenue),
      revenue_num: glance.lifetimeRevenue,
      headline_count: glance.headline,
      play_seconds: glance.playSec,
      daily_challenge_baskets:
        meta.dailyChallengeBest?.day === today ? meta.dailyChallengeBest.baskets : (meta.dailyChallengeBest?.baskets ?? null),
      week_key: week,
      achievements: awards.filter((id) => !id.startsWith('sd-')).length,
    }
  }
  const g = loadGame<GrocerySave>('grocery-empire')
  if (!g) return null
  const rev = Math.max(0, Math.floor(Number(g.lifetimeRevenue ?? 0)))
  const today = new Date().toLocaleDateString('en-CA')
  return {
    game_id: 'grocery-empire',
    era: Math.max(0, Math.floor(g.era ?? 0)),
    lifetime_revenue: String(rev),
    revenue_num: rev,
    headline_count: Math.max(0, Number(g.baskets ?? 0)),
    play_seconds: Math.max(0, Number(g.stats?.playSec ?? 0)),
    daily_challenge_baskets:
      meta.dailyChallengeBest?.day === today ? meta.dailyChallengeBest.baskets : (meta.dailyChallengeBest?.baskets ?? null),
    week_key: week,
    achievements: awards.filter((id) => !id.startsWith('sd-')).length,
  }
}

function signalRow(week: string, awards: string[]): StatsPublish | null {
  const glance = getCampaignGlance('signal-decay')
  if (glance) {
    return {
      game_id: 'signal-decay',
      era: glance.era,
      lifetime_revenue: String(glance.lifetimeRevenue),
      revenue_num: glance.lifetimeRevenue,
      headline_count: glance.headline,
      play_seconds: glance.playSec,
      daily_challenge_baskets: null,
      week_key: week,
      achievements: awards.filter((id) => id.startsWith('sd-')).length,
    }
  }
  const s = loadGame<SignalSave>('signal-decay')
  if (!s) return null
  const rev = Math.max(0, Math.floor(Number(s.lifetimeRevenue ?? 0)))
  return {
    game_id: 'signal-decay',
    era: Math.max(0, Math.floor(s.era ?? 0)),
    lifetime_revenue: String(rev),
    revenue_num: rev,
    headline_count: Math.max(0, Number(s.calls ?? 0)),
    play_seconds: Math.max(0, Number(s.time ?? 0)),
    daily_challenge_baskets: null,
    week_key: week,
    achievements: awards.filter((id) => id.startsWith('sd-')).length,
  }
}

/** What this account publishes for the boards (main saves only, never DevMode). */
export function localStats(): StatsPublish[] {
  const week = isoWeekKey()
  const meta = loadMeta<MetaSave>(DEFAULT_META)
  const awards = Object.keys(meta.achievements ?? {})
  const out: StatsPublish[] = []
  const g = groceryRow(week, awards, meta)
  if (g) out.push(g)
  const s = signalRow(week, awards)
  if (s) out.push(s)
  return out
}

/** Publish glance stats for leaderboards and challenges. Throttled to once every 20 seconds. */
export async function publishPublicStats(userId: string, force = false): Promise<void> {
  const now = Date.now()
  if (!force && now - last < 20_000) return
  last = now
  const rows = localStats()
  if (!rows.length) return
  try {
    await social().publishStats(userId, rows)
  } catch (e) {
    console.warn('publish stats', e)
  }
}

export function runCardFromLocal(gameId: SocialGameId): RunCard | null {
  const meta = loadMeta<MetaSave>(DEFAULT_META)
  const glance = getCampaignGlance(gameId)
  if (glance) {
    return {
      gameId,
      era: glance.era,
      headline: glance.headlineLabel,
      playSec: glance.playSec,
      packId: meta.equippedPack,
    }
  }
  if (gameId === 'grocery-empire') {
    const g = loadGame<GrocerySave>('grocery-empire')
    if (!g) return null
    return {
      gameId,
      era: Math.floor(g.era ?? 0),
      headline: `${Math.floor(g.baskets ?? 0).toLocaleString()} baskets`,
      playSec: Math.floor(g.stats?.playSec ?? 0),
      packId: meta.equippedPack,
    }
  }
  const s = loadGame<SignalSave>('signal-decay')
  if (!s) return null
  return {
    gameId,
    era: Math.floor(s.era ?? 0),
    headline: `${Math.floor(s.calls ?? 0).toLocaleString()} calls`,
    playSec: Math.floor(s.time ?? 0),
    packId: meta.equippedPack,
  }
}

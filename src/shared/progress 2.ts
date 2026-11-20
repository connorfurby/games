import type { MetaSave } from './types'

/** Slots that sync to the signed-in account. DevMode ids are excluded. */
export const CLOUD_SLOT_IDS = [
  'meta',
  'prefs',
  'grocery-empire',
  'grocery-empire-slot-1',
  'grocery-empire-slot-2',
  'grocery-empire-slot-3',
  'grocery-museum',
  'daily-challenge',
  'signal-decay',
] as const

export type CloudSlotId = (typeof CLOUD_SLOT_IDS)[number]

export function isCloudSlot(id: string): boolean {
  return (CLOUD_SLOT_IDS as readonly string[]).includes(id)
}

export function isDevSlot(id: string): boolean {
  return id.endsWith('-dev') || id.includes('-dev-')
}

export interface ProgressScore {
  lifetimeRevenue: number
  playSec: number
  headline: number
  era: number
  empty: boolean
}

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (v && typeof v === 'object' && 'toNumber' in v && typeof (v as { toNumber: () => number }).toNumber === 'function') {
    try {
      return (v as { toNumber: () => number }).toNumber()
    } catch {
      return 0
    }
  }
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/** Score a grocery or signal campaign blob for merge decisions. */
export function scoreCampaign(raw: unknown, game: 'grocery' | 'signal'): ProgressScore {
  if (!raw || typeof raw !== 'object') {
    return { lifetimeRevenue: 0, playSec: 0, headline: 0, era: 0, empty: true }
  }
  const o = raw as Record<string, unknown>
  const era = Math.max(0, Math.floor(num(o.era)))
  const lifetimeRevenue = Math.max(0, num(o.lifetimeRevenue))
  if (game === 'grocery') {
    const stats = (o.stats as { playSec?: unknown; sold?: unknown } | undefined) ?? {}
    const playSec = Math.max(0, num(stats.playSec ?? o.playSec))
    const baskets = Math.max(0, num(o.baskets))
    const empty = era === 0 && lifetimeRevenue === 0 && baskets === 0 && playSec < 5
    return { lifetimeRevenue, playSec, headline: baskets, era, empty }
  }
  const playSec = Math.max(0, num(o.time))
  const calls = Math.max(0, num(o.calls))
  const empty = era === 0 && lifetimeRevenue === 0 && calls === 0 && playSec < 5
  return { lifetimeRevenue, playSec, headline: calls, era, empty }
}

export function compareProgress(a: ProgressScore, b: ProgressScore): number {
  if (a.lifetimeRevenue !== b.lifetimeRevenue) return a.lifetimeRevenue > b.lifetimeRevenue ? 1 : -1
  if (a.playSec !== b.playSec) return a.playSec > b.playSec ? 1 : -1
  if (a.headline !== b.headline) return a.headline > b.headline ? 1 : -1
  if (a.era !== b.era) return a.era > b.era ? 1 : -1
  return 0
}

/** True when both sides have real progress and look like parallel runs (not a clear winner). */
export function isProgressFork(local: ProgressScore, cloud: ProgressScore): boolean {
  if (local.empty || cloud.empty) return false
  if (compareProgress(local, cloud) === 0) return false
  const maxRev = Math.max(local.lifetimeRevenue, cloud.lifetimeRevenue, 1)
  const revenueClose = Math.abs(local.lifetimeRevenue - cloud.lifetimeRevenue) / maxRev < 0.15
  const playDiff = Math.abs(local.playSec - cloud.playSec)
  // Parallel play: similar totals with a big clock gap, or close totals on different eras.
  if (revenueClose && playDiff > 300) return true
  if (revenueClose && local.era !== cloud.era && Math.min(local.playSec, cloud.playSec) > 120) return true
  return false
}

export function gameForSlot(slotId: string): 'grocery' | 'signal' | null {
  if (slotId === 'signal-decay') return 'signal'
  if (slotId.startsWith('grocery-empire') && !slotId.includes('museum')) return 'grocery'
  return null
}

/** Union unlocks / achievements; take max tokens & streak; settings from the newer copy. */
export function mergeMeta(local: MetaSave, cloud: MetaSave, prefer: 'local' | 'cloud'): MetaSave {
  const newer = prefer === 'local' ? local : cloud
  const older = prefer === 'local' ? cloud : local
  const union = (a: string[] | undefined, b: string[] | undefined) =>
    Array.from(new Set([...(a ?? []), ...(b ?? [])]))

  const achievements: MetaSave['achievements'] = { ...(older.achievements ?? {}) }
  for (const [id, row] of Object.entries(local.achievements ?? {})) {
    const prev = achievements[id]
    if (!prev || (row.unlockedAt ?? 0) >= (prev.unlockedAt ?? 0)) achievements[id] = row
  }
  for (const [id, row] of Object.entries(cloud.achievements ?? {})) {
    const prev = achievements[id]
    if (!prev || (row.unlockedAt ?? 0) >= (prev.unlockedAt ?? 0)) achievements[id] = row
  }

  const dailyA = local.dailyChallengeBest
  const dailyB = cloud.dailyChallengeBest
  let dailyChallengeBest = newer.dailyChallengeBest ?? null
  if (dailyA && dailyB) {
    if (dailyA.day === dailyB.day) {
      dailyChallengeBest = dailyA.baskets >= dailyB.baskets ? dailyA : dailyB
    } else {
      dailyChallengeBest = dailyA.day >= dailyB.day ? dailyA : dailyB
    }
  } else {
    dailyChallengeBest = dailyA ?? dailyB ?? null
  }

  return {
    ...newer,
    unlockedPacks: union(local.unlockedPacks, cloud.unlockedPacks),
    unlockedLedgerSkins: union(local.unlockedLedgerSkins, cloud.unlockedLedgerSkins),
    unlockedUnpackFx: union(local.unlockedUnpackFx, cloud.unlockedUnpackFx),
    unlockedOrnaments: union(local.unlockedOrnaments, cloud.unlockedOrnaments),
    achievements,
    shelfTokens: Math.max(local.shelfTokens ?? 0, cloud.shelfTokens ?? 0),
    lifetimeXp: Math.max(local.lifetimeXp ?? 0, cloud.lifetimeXp ?? 0),
    lifetimeRank: Math.max(local.lifetimeRank ?? 1, cloud.lifetimeRank ?? 1),
    groceryUniverses: Math.max(local.groceryUniverses ?? 0, cloud.groceryUniverses ?? 0),
    dailyStreak: Math.max(local.dailyStreak ?? 0, cloud.dailyStreak ?? 0),
    lastDailyStamp: (() => {
      const a = local.lastDailyStamp
      const b = cloud.lastDailyStamp
      if (!a) return b
      if (!b) return a
      return a >= b ? a : b
    })(),
    dailyChallengeBest,
    settings: { ...older.settings, ...newer.settings },
    equippedPack: newer.equippedPack || older.equippedPack,
    equippedLedgerSkin: newer.equippedLedgerSkin || older.equippedLedgerSkin,
    equippedUnpackFx: newer.equippedUnpackFx || older.equippedUnpackFx,
    equippedOrnaments: newer.equippedOrnaments?.length
      ? newer.equippedOrnaments
      : older.equippedOrnaments ?? [],
  }
}

export interface SlotDecision {
  slotId: string
  winner: 'local' | 'cloud' | 'merged'
  needsChooser: boolean
}

export function decideSlot(
  slotId: string,
  localRaw: string | null,
  cloudRaw: string | null,
  deserialize: <T>(raw: string) => T | null,
): SlotDecision {
  if (!localRaw && !cloudRaw) return { slotId, winner: 'local', needsChooser: false }
  if (!localRaw) return { slotId, winner: 'cloud', needsChooser: false }
  if (!cloudRaw) return { slotId, winner: 'local', needsChooser: false }

  if (slotId === 'meta') {
    return { slotId, winner: 'merged', needsChooser: false }
  }

  const game = gameForSlot(slotId)
  if (!game) {
    // prefs / museum — prefer newer by lastSavedAt / updated feel; default local if equal
    const local = deserialize<{ lastSavedAt?: number; v?: number }>(localRaw)
    const cloud = deserialize<{ lastSavedAt?: number; v?: number }>(cloudRaw)
    const lt = local?.lastSavedAt ?? 0
    const ct = cloud?.lastSavedAt ?? 0
    return { slotId, winner: lt >= ct ? 'local' : 'cloud', needsChooser: false }
  }

  const local = scoreCampaign(deserialize(localRaw), game)
  const cloud = scoreCampaign(deserialize(cloudRaw), game)
  if (local.empty && !cloud.empty) return { slotId, winner: 'cloud', needsChooser: false }
  if (cloud.empty && !local.empty) return { slotId, winner: 'local', needsChooser: false }
  if (isProgressFork(local, cloud)) return { slotId, winner: 'local', needsChooser: true }
  return {
    slotId,
    winner: compareProgress(local, cloud) >= 0 ? 'local' : 'cloud',
    needsChooser: false,
  }
}

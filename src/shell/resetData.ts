import { DEFAULT_META, type MetaSave } from '@/shared/types'

/** What a reset can clear. The run is always one of the choices; the rest live outside the run. */
export interface ResetScope {
  /** Cash, stock, eras: the campaign save. */
  run: boolean
  /** The three manual save slots. */
  slots: boolean
  /** Relics, chests and museum progress. */
  museum: boolean
  /** Shelf tokens and everything bought with them. */
  shop: boolean
  /** Achievements, rank, universes, daily streak. Also resets the shop: see `normalizeScope`. */
  achievements: boolean
}

export const RESET_NOTHING: ResetScope = { run: false, slots: false, museum: false, shop: false, achievements: false }
export const RESET_EVERYTHING: ResetScope = { run: true, slots: true, museum: true, shop: true, achievements: true }

/**
 * Achievements pay shelf tokens once. Clearing them while keeping the shop would let the
 * same achievement pay twice, so wiping achievements always wipes tokens and purchases too.
 */
export function normalizeScope(scope: ResetScope): ResetScope {
  return scope.achievements ? { ...scope, shop: true } : scope
}

/** The site meta after a reset. Settings are never touched. Returns the same object if nothing applies. */
export function resetMeta(meta: MetaSave, raw: ResetScope): MetaSave {
  const scope = normalizeScope(raw)
  if (!scope.shop && !scope.achievements) return meta
  let next: MetaSave = { ...meta }
  if (scope.shop) {
    next = {
      ...next,
      shelfTokens: DEFAULT_META.shelfTokens,
      unlockedPacks: [...DEFAULT_META.unlockedPacks],
      equippedPack: DEFAULT_META.equippedPack,
      unlockedLedgerSkins: [...DEFAULT_META.unlockedLedgerSkins],
      equippedLedgerSkin: DEFAULT_META.equippedLedgerSkin,
      unlockedUnpackFx: [...DEFAULT_META.unlockedUnpackFx],
      equippedUnpackFx: DEFAULT_META.equippedUnpackFx,
      unlockedOrnaments: [...DEFAULT_META.unlockedOrnaments],
      equippedOrnaments: [...DEFAULT_META.equippedOrnaments],
    }
  }
  if (scope.achievements) {
    next = {
      ...next,
      achievements: {},
      lifetimeRank: DEFAULT_META.lifetimeRank,
      lifetimeXp: DEFAULT_META.lifetimeXp,
      groceryUniverses: DEFAULT_META.groceryUniverses,
      groceryEnding: DEFAULT_META.groceryEnding,
      hungryLaws: [],
      lastDailyStamp: DEFAULT_META.lastDailyStamp,
      dailyStreak: DEFAULT_META.dailyStreak,
      dailyChallengeBest: DEFAULT_META.dailyChallengeBest,
    }
  }
  return next
}

/** Plain-words list for the confirm line: "run, museum and shop". */
export function describeScope(raw: ResetScope): string {
  const scope = normalizeScope(raw)
  const parts = [
    scope.run ? 'run' : '',
    scope.slots ? 'save slots' : '',
    scope.museum ? 'museum' : '',
    scope.shop ? 'shop and tokens' : '',
    scope.achievements ? 'achievements' : '',
  ].filter(Boolean)
  if (parts.length <= 1) return parts[0] ?? 'nothing'
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

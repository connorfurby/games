import type { ComponentType } from 'react'
import type { NumberFormat } from './bn'

export type GameId = 'grocery-empire' | string

export interface GameDefinition {
  id: GameId
  title: string
  tagline: string
  accent: string
  coverKey: string
  status: 'playable' | 'coming-soon'
  defaultTexturePack: string
  achievementNamespace: string
  component: ComponentType
}

export interface MetaSave {
  version: number
  shelfTokens: number
  unlockedPacks: string[]
  equippedPack: string
  unlockedLedgerSkins: string[]
  equippedLedgerSkin: string
  unlockedUnpackFx: string[]
  equippedUnpackFx: string
  /** Shelf ornaments (CSS stickers) — presentation only. */
  unlockedOrnaments: string[]
  equippedOrnaments: string[]
  achievements: Record<string, { unlockedAt: number; progress?: number }>
  lifetimeRank: number
  lifetimeXp: number
  settings: PlayerSettings
  groceryUniverses: number
  groceryEnding?: 'accept' | 'reject' | null
  /** Last confirmed Hungry laws (0–2 mutator ids) for the current NG+ run. */
  hungryLaws?: string[]
  /** Local calendar day of last daily stamp (YYYY-MM-DD). */
  lastDailyStamp: string | null
  dailyStreak: number
  /** Local-only daily challenge leaderboard (best baskets for that day). */
  dailyChallengeBest?: {
    day: string
    seed: number
    baskets: number
  } | null
}

export interface PlayerSettings {
  numberFormat: NumberFormat
  reducedMotion: boolean
  animationDensity: 'full' | 'tasteful' | 'minimal'
  /** When true (default), optional WebAudio helpers no-op. */
  muted: boolean
  showSpoilers: boolean
  rememberTutorials: boolean
  softPauseTutorials: boolean
  notifyEnabled: boolean
  presentation: 'dense' | 'atmospheric' | 'map'
  speedUnlock: boolean
  /** Preferred Grocery Empire menu id restored on load. */
  pinnedMenu?: string | null
  /** Alternate accent set for color vision deficiency. */
  colorblind: boolean
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  numberFormat: 'named',
  reducedMotion: false,
  animationDensity: 'tasteful',
  muted: true,
  showSpoilers: false,
  rememberTutorials: true,
  softPauseTutorials: true,
  notifyEnabled: false,
  presentation: 'atmospheric',
  speedUnlock: false,
  pinnedMenu: null,
  colorblind: false,
}

export const DEFAULT_META: MetaSave = {
  version: 1,
  shelfTokens: 0,
  unlockedPacks: ['receipt-classic'],
  equippedPack: 'receipt-classic',
  unlockedLedgerSkins: ['torn-receipt'],
  equippedLedgerSkin: 'torn-receipt',
  unlockedUnpackFx: ['none'],
  equippedUnpackFx: 'none',
  unlockedOrnaments: ['price-tag'],
  equippedOrnaments: ['price-tag'],
  achievements: {},
  lifetimeRank: 1,
  lifetimeXp: 0,
  settings: { ...DEFAULT_SETTINGS },
  groceryUniverses: 0,
  groceryEnding: null,
  hungryLaws: [],
  lastDailyStamp: null,
  dailyStreak: 0,
  dailyChallengeBest: null,
}

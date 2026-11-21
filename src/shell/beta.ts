import type { SocialGameId } from '@/shared/database.types'

/** The only account that can hand out Signal Decay beta keys. */
export const BETA_ISSUER_HANDLE = 'connorfurby'

export const BETA_GAME_ID = 'signal-decay'

export function isBetaIssuer(handle: string | null | undefined): boolean {
  return (handle ?? '').toLowerCase() === BETA_ISSUER_HANDLE
}

/** Social pickers hide Signal Decay until this account can open it. */
export function socialGames(includeSignal: boolean): SocialGameId[] {
  return includeSignal ? ['grocery-empire', 'signal-decay'] : ['grocery-empire']
}

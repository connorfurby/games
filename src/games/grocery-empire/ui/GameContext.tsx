import { createContext, useContext, type ReactNode } from 'react'
import type { NumberFormat } from '@/shared/bn'
import type { Command } from '../sim/commands'
import type { Suggestion } from '../sim/suggestions'
import type { GameState } from '../sim/state'

export interface GameCtxValue {
  state: GameState
  /**
   * Engine snapshot version. GameState is mutated in place — never use `state`
   * alone as a useMemo/useEffect dependency; depend on `tick` instead.
   */
  tick: number
  dispatch: (cmd: Command) => void
  reducedMotion: boolean
  numberFormat: NumberFormat
  activeMenu: string
  setActiveMenu: (id: string) => void
  /** Ranked next-best actions (recomputed each tick). */
  suggestions: Suggestion[]
  /** Jump to a suggestion’s channel and optional target. */
  focusSuggestion: (s: Suggestion) => void
  /** Bumps when focusSuggestion runs — panels can switch tabs to the target. */
  focusNonce: number
  focusTarget: string | null
  /** Local UI-only: hide chrome for screenshots (not saved). */
  photoMode: boolean
  setPhotoMode: (on: boolean) => void
}

const GameCtx = createContext<GameCtxValue | null>(null)

export function GameProvider({ value, children }: { value: GameCtxValue; children: ReactNode }) {
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>
}

export function useGame(): GameCtxValue {
  const ctx = useContext(GameCtx)
  if (!ctx) throw new Error('useGame outside GameProvider')
  return ctx
}

/** True only for the single best next target. */
export function useIsSuggested(target: string | undefined): boolean {
  return useSuggestRank(target) === 0
}

/** 0 = best next; −1 = not the top suggestion. */
export function useSuggestRank(target: string | undefined): number {
  const { suggestions } = useGame()
  if (!target || !suggestions[0]) return -1
  const g = suggestions[0]
  return g.target === target || g.id === target ? 0 : -1
}

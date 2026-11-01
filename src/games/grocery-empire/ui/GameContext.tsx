import { createContext, useContext, type ReactNode } from 'react'
import type { NumberFormat } from '@/shared/bn'
import type { Command } from '../sim/commands'
import type { GameState } from '../sim/state'

export interface GameCtxValue {
  state: GameState
  dispatch: (cmd: Command) => void
  reducedMotion: boolean
  numberFormat: NumberFormat
  activeMenu: string
  setActiveMenu: (id: string) => void
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

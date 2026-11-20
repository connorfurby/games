import { createContext, useContext, type ReactNode } from 'react'
import type { NumberFormat } from '@/shared/bn'
import type { Command } from '../sim/commands'
import type { GameState } from '../sim/state'
import type { HubId, HubSub } from './shell/hubs'

export interface GameCtxValue {
  state: GameState
  tick: number
  dispatch: (cmd: Command) => void
  reducedMotion: boolean
  numberFormat: NumberFormat
  activeMenu: HubId
  setActiveMenu: (id: string) => void
  activeSub: HubSub
  setActiveSub: (id: HubSub) => void
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

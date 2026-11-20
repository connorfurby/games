import { useEffect, useRef } from 'react'
import { sfx } from '@/shared/audio'
import type { GameState } from '../../sim/state'

interface Snap {
  staff: number
  rank: number
  sold: number
  orders: number
  memos: number
}

const snap = (s: GameState): Snap => ({
  staff: s.staff.length,
  rank: s.empire.level,
  sold: s.stats.sold,
  orders: (s.orders ?? []).length,
  memos: Object.values(s.memos ?? {}).filter(Boolean).length,
})

/**
 * Listens to the running game and plays a sound for the moments that matter:
 * a hire, a new rank, a delivery pulling in, a memo filed, and the till while baskets sell.
 * The sim stays silent; this only reads snapshots.
 */
export function useSoundDirector(state: GameState) {
  const prev = useRef<Snap | null>(null)
  useEffect(() => {
    const now = snap(state)
    const was = prev.current
    prev.current = now
    // First snapshot, a load or a big jump (dev stage, offline catch-up): stay quiet.
    if (!was || Math.abs(now.sold - was.sold) > 500) return
    if (now.rank > was.rank) sfx.rank()
    else if (now.staff > was.staff) sfx.hire()
    else if (now.memos > was.memos) sfx.goal()
    else if (now.orders < was.orders) sfx.truck()
    else if (now.sold > was.sold) sfx.sale()
  }, [state])
}

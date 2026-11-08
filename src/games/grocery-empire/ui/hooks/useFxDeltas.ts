import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../../sim/state'

export interface FxFlags {
  spoilWilt: boolean
  coldDrop: boolean
  bargeBirth: boolean
  ventureArc: boolean
  ventureAmt: number
}

const IDLE: FxFlags = {
  spoilWilt: false,
  coldDrop: false,
  bargeBirth: false,
  ventureArc: false,
  ventureAmt: 0,
}

/** Diff snapshot fields → short-lived UI FX flags. Sim never waits on these. */
export function useFxDeltas(state: GameState, reducedMotion: boolean): FxFlags {
  const prev = useRef({
    spoiled: state.stats.spoiled,
    freshness: state.cold.freshness,
    barges: state.fleet.barges,
    ventureCollects: state.stats.ventureCollects,
    ventureCash: state.stats.ventureCollected,
  })
  const [flags, setFlags] = useState<FxFlags>(IDLE)
  const timers = useRef<number[]>([])

  useEffect(() => {
    return () => {
      for (const t of timers.current) window.clearTimeout(t)
      timers.current = []
    }
  }, [])

  useEffect(() => {
    const p = prev.current
    const next = {
      spoiled: state.stats.spoiled,
      freshness: state.cold.freshness,
      barges: state.fleet.barges,
      ventureCollects: state.stats.ventureCollects,
      ventureCash: state.stats.ventureCollected,
    }
    prev.current = next

    if (reducedMotion) return

    const patch: Partial<FxFlags> = {}
    if (next.spoiled > p.spoiled) patch.spoilWilt = true
    if (next.freshness < p.freshness - 0.02) patch.coldDrop = true
    if (next.barges > p.barges) patch.bargeBirth = true
    if (next.ventureCollects > p.ventureCollects) {
      patch.ventureArc = true
      patch.ventureAmt = Math.max(0, next.ventureCash - p.ventureCash)
    }
    if (Object.keys(patch).length === 0) return

    setFlags((f) => ({ ...f, ...patch }))
    const clearKeys = Object.keys(patch) as (keyof FxFlags)[]
    const t = window.setTimeout(() => {
      setFlags((f) => {
        const out = { ...f }
        for (const k of clearKeys) {
          if (k === 'ventureAmt') out.ventureAmt = 0
          else (out as Record<string, boolean | number>)[k] = false
        }
        return out
      })
    }, 450)
    timers.current.push(t)
  }, [
    state.stats.spoiled,
    state.cold.freshness,
    state.fleet.barges,
    state.stats.ventureCollects,
    state.stats.ventureCollected,
    reducedMotion,
  ])

  return flags
}

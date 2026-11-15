import { useEffect, useRef, useState } from 'react'
import './fx.css'
import { FX_POOL_MAX, fxReducedMotion, subscribeFx, type FxItem, type FxKind } from './bus'

/** How long each kind stays mounted (matches the CSS animation length). */
const LIFE_MS: Record<FxKind, number> = {
  gain: 900,
  cost: 800,
  info: 1000,
  toast: 1800,
  burst: 700,
  sweep: 1100,
}

const BURST_PARTS = 8

/**
 * Fixed, click-through layer for floating text, bursts and the full-screen sweep.
 * Only transform / opacity are animated. Mount once, inside `.ge-root` so tokens resolve.
 * Renders nothing and holds no timers under reduced motion.
 */
export function FxLayer() {
  const [items, setItems] = useState<FxItem[]>([])
  const timers = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    const live = timers.current
    const drop = (id: number) => {
      live.delete(id)
      setItems((cur) => cur.filter((x) => x.id !== id))
    }
    const off = subscribeFx((item) => {
      if (fxReducedMotion()) return
      setItems((cur) => {
        const next = [...cur, item]
        // Pool cap: evict the oldest (its timer becomes a harmless no-op filter).
        while (next.length > FX_POOL_MAX) {
          const gone = next.shift()!
          const t = live.get(gone.id)
          if (t != null) window.clearTimeout(t)
          live.delete(gone.id)
        }
        return next
      })
      live.set(item.id, window.setTimeout(() => drop(item.id), LIFE_MS[item.kind] + 60))
    })
    return () => {
      off()
      for (const t of live.values()) window.clearTimeout(t)
      live.clear()
    }
  }, [])

  if (items.length === 0) return <div className="fx-layer" aria-hidden />

  return (
    <div className="fx-layer" aria-hidden>
      {items.map((it) => {
        if (it.kind === 'sweep') {
          return (
            <div key={it.id} className="fx-sweep">
              <span className="fx-sweep__bar" />
              {it.text ? <span className="fx-sweep__text">{it.text}</span> : null}
            </div>
          )
        }
        const style = {
          left: it.x ?? (typeof window === 'undefined' ? 0 : window.innerWidth / 2),
          top: it.y ?? (typeof window === 'undefined' ? 0 : window.innerHeight * 0.3),
        }
        if (it.kind === 'burst') {
          return (
            <span key={it.id} className="fx-burst" style={style}>
              {Array.from({ length: BURST_PARTS }, (_, i) => {
                const a = (i / BURST_PARTS) * Math.PI * 2
                return (
                  <i
                    key={i}
                    style={{ ['--dx' as string]: `${Math.cos(a) * 34}px`, ['--dy' as string]: `${Math.sin(a) * 34}px` }}
                  />
                )
              })}
              {it.text ? <b className="fx-burst__text">{it.text}</b> : null}
            </span>
          )
        }
        return (
          <span key={it.id} className={`fx-float fx-float--${it.kind}`} style={style}>
            {it.text}
          </span>
        )
      })}
    </div>
  )
}

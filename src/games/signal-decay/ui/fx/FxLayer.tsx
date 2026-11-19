import { useEffect, useState } from 'react'
import { useReducedMotion } from '../kit/hooks'
import { setFxReducedMotion, subscribeFx, type FxEvent } from './bus'
import '../design/layers.css'
import './fx.css'

/** Fixed overlay that paints spawnFx events. Mount once inside the app root. */
export function FxLayer() {
  const reduced = useReducedMotion()
  const [events, setEvents] = useState<FxEvent[]>([])

  useEffect(() => {
    setFxReducedMotion(reduced)
  }, [reduced])

  useEffect(
    () =>
      subscribeFx((e) => {
        setEvents((xs) => [...xs.slice(-24), e])
        window.setTimeout(() => setEvents((xs) => xs.filter((x) => x.id !== e.id)), e.ttl)
      }),
    [],
  )

  return (
    <div className="sd-fx" aria-hidden>
      {events.map((e) =>
        e.kind === 'floater' ? (
          <span
            key={e.id}
            className={`sd-fx__floater sd-fx__floater--${e.tone}`}
            style={{ left: `${e.x * 100}%`, top: `${e.y * 100}%` }}
          >
            {e.text}
          </span>
        ) : (
          <span key={e.id} className="sd-fx__burst" style={{ left: `${e.x * 100}%`, top: `${e.y * 100}%` }}>
            {Array.from({ length: e.count }, (_, i) => {
              const a = (i / e.count) * Math.PI * 2 + (e.id % 7) * 0.3
              const d = 70 + ((i * 37) % 60)
              return (
                <i
                  key={i}
                  className={`sd-fx__spark sd-fx__spark--${e.tone}`}
                  style={
                    {
                      '--dx': `${Math.cos(a) * d}px`,
                      '--dy': `${Math.sin(a) * d}px`,
                      animationDelay: `${(i % 4) * 20}ms`,
                    } as React.CSSProperties
                  }
                />
              )
            })}
          </span>
        ),
      )}
    </div>
  )
}

import type { KeyboardEvent } from 'react'
import type { PlanetClimate } from '../../content/horizon'
import type { GameState } from '../../sim/state'
import { planetDef } from '../../sim/systems/horizon'
import { CLIMATE_TINT } from '../puzzles/PlanetShelf'

export interface PlanetPin {
  id: string
  name: string
  climate: PlanetClimate
  stocked: boolean
  score: number
  embassy?: boolean
}

const MAX = { map: 16, panel: 8 } as const

export function horizonPins(s: GameState): PlanetPin[] {
  const out: PlanetPin[] = []
  for (const run of s.horizon.planets) {
    if (!run.revealed) continue
    const def = planetDef(run.id)
    if (!def) continue
    out.push({
      id: run.id,
      name: def.name,
      climate: def.climate,
      stocked: run.stocked,
      score: run.score,
    })
  }
  return out
}

function onKey(e: KeyboardEvent<SVGGElement>, fire: () => void) {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  fire()
}

function pinPos(
  i: number,
  count: number,
  cx: number,
  cy: number,
  orbit: number,
  map: boolean,
): { x: number; y: number } {
  const angle = count === 1 ? -Math.PI / 2 : (i / count) * Math.PI * 2 - Math.PI / 2
  return {
    x: cx + Math.cos(angle) * orbit,
    y: cy + Math.sin(angle) * (map ? orbit * 0.72 : orbit * 0.55),
  }
}

/** System / Cluster / Galaxy zooms for Worlds. */
export function PlanetPins({
  pins,
  selectedId,
  onSelect,
  reducedMotion,
  frame,
  circuits = [],
  embassies = 0,
  mode = 'system',
}: {
  pins: PlanetPin[]
  selectedId: string | null
  onSelect: (id: string) => void
  reducedMotion: boolean
  frame: 'map' | 'panel'
  /** Origin–dest pairs to draw as arcs (Cluster). */
  circuits?: { origin: string; dest: string }[]
  /** Embassy count for Galaxy seals. */
  embassies?: number
  mode?: 'system' | 'cluster' | 'galaxy'
}) {
  const cap = MAX[frame]
  const shown = pins.slice(0, cap)
  const map = frame === 'map'
  const cx = map ? 500 : 480
  const cy = map ? 300 : 100
  const orbit = map ? (mode === 'galaxy' ? 220 : 200) : 160
  const r = map ? 16 : 14
  const viewBox = map ? '0 0 1000 640' : '0 0 960 220'
  const extra = pins.length - shown.length
  const byId = new Map(shown.map((pin, i) => [pin.id, pinPos(i, shown.length, cx, cy, orbit, map)]))

  const pinsSvg = (
    <svg
      className={`hz-pins${map ? ' mp-svg' : ''}${reducedMotion ? '' : ' is-live'}`}
      viewBox={viewBox}
      role="group"
      aria-label={
        mode === 'cluster'
          ? 'Cluster routes'
          : mode === 'galaxy'
            ? 'Galaxy embassies'
            : pins.length
              ? `${pins.length} worlds`
              : 'No worlds revealed'
      }
    >
      <rect width={map ? 1000 : 960} height={map ? 640 : 220} fill="#12162e" />
      {(map ? [80, 160, 300, 480, 640, 820, 940] : [60, 160, 280, 420, 560, 700, 820, 920]).map((x, i) => (
        <circle
          key={x}
          className="hz-star"
          cx={x}
          cy={map ? 40 + (i % 4) * 18 : 16 + (i % 4) * 9}
          r={i % 2 ? 1.3 : 0.8}
          fill="#efe9dc"
          style={reducedMotion ? undefined : { animationDelay: `${i * 0.4}s` }}
        />
      ))}
      {mode === 'galaxy'
        ? Array.from({ length: Math.min(embassies, 8) }, (_, i) => {
            const a = (i / Math.max(1, embassies)) * Math.PI * 2 - Math.PI / 2
            const ex = cx + Math.cos(a) * (orbit + 48)
            const ey = cy + Math.sin(a) * (orbit * 0.72 + 28)
            return (
              <g key={`emb-${i}`} transform={`translate(${ex} ${ey})`}>
                <rect x={-7} y={-9} width="14" height="18" rx="2" fill="#e8d7a0" opacity="0.9" />
                <text y="22" textAnchor="middle" className="hz-pins__label">
                  Embassy {i + 1}
                </text>
              </g>
            )
          })
        : null}
      {mode === 'cluster'
        ? circuits.map((c, i) => {
            const a = byId.get(c.origin)
            const b = byId.get(c.dest)
            if (!a || !b) return null
            return (
              <path
                key={`arc-${i}`}
                d={`M${a.x} ${a.y} Q${cx} ${cy - 40} ${b.x} ${b.y}`}
                fill="none"
                stroke="#8fb6e0"
                strokeWidth="2"
                opacity="0.75"
              />
            )
          })
        : null}
      {shown.length === 0 ? (
        <text x={cx} y={cy} textAnchor="middle" className="hz-pins__empty">
          No worlds yet
        </text>
      ) : null}
      {shown.map((pin, i) => {
        const { x, y } = pinPos(i, shown.length, cx, cy, orbit, map)
        const tint = CLIMATE_TINT[pin.climate].mark
        const on = selectedId === pin.id
        return (
          <g
            key={pin.id}
            className={`hz-pin${pin.stocked ? ' is-stocked' : ''}${on ? ' is-on' : ''}`}
            transform={`translate(${x} ${y})`}
            role="button"
            tabIndex={0}
            aria-label={`${pin.name}, ${pin.climate}${pin.stocked ? `, stocked ${pin.score.toFixed(2)}` : ', revealed'}`}
            aria-pressed={on}
            onClick={() => onSelect(pin.id)}
            onKeyDown={(e) => onKey(e, () => onSelect(pin.id))}
          >
            <circle r={on ? r + 4 : r} fill="none" stroke={tint} strokeWidth={on ? 3 : 1.5} />
            <circle r={r - 3} fill={pin.stocked ? tint : 'transparent'} stroke={tint} strokeWidth="1.5" />
            <text y={r + 14} textAnchor="middle" className="hz-pins__label">
              {pin.name.length > 14 ? `${pin.name.slice(0, 13)}…` : pin.name}
            </text>
          </g>
        )
      })}
      {extra > 0 ? (
        <text x={cx} y={map ? 610 : 200} textAnchor="middle" className="hz-pins__empty">
          +{extra} more worlds
        </text>
      ) : null}
      {mode === 'cluster' && circuits.length === 0 ? (
        <text x={cx} y={map ? 580 : 190} textAnchor="middle" className="hz-pins__empty">
          File a circuit to draw routes
        </text>
      ) : null}
    </svg>
  )

  if (map) return pinsSvg
  return <figure className={`hz-shelf-wrap${reducedMotion ? '' : ' is-live'}`}>{pinsSvg}</figure>
}

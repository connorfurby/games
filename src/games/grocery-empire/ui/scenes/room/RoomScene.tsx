import type { CSSProperties, ReactNode } from 'react'
import { useId } from 'react'
import { useGame } from '../../GameContext'
import { usePhone } from '../../kit/hooks'
import type { RoomHudChip } from './RoomHud'
import { RoomChips, RoomHud } from './RoomHud'
import './room.css'

export const ROOM_W = 960
export const ROOM_H = 300
export const ROOM_GROUND = 248
/** Height of the in-scene HUD row that the phone band crops away. */
export const BAND_TOP = 54

/**
 * Dense illustrated department room (960×300). Always mounts a RoomHud.
 * Animations gate on `is-live` only (paused / reduced motion = still).
 */
export function RoomScene({
  label,
  chips,
  children,
  className = '',
  height = ROOM_H,
  skyTop = '#070b12',
  skyBottom = '#141c18',
  ground = '#0c1014',
  floor = '#1a1e24',
  showDefaultSky = true,
  portrait,
}: {
  label: string
  chips: RoomHudChip[]
  children: ReactNode
  className?: string
  height?: number
  skyTop?: string
  skyBottom?: string
  ground?: string
  floor?: string
  /** When false, caller draws its own background. */
  showDefaultSky?: boolean
  /**
   * Phone composition. Pass a size when the caller re-lays its stations for a narrow
   * screen (it must branch on `usePhone()` too). Without it, phones get the simplified
   * room: readable chips above a pannable illustration band with scene lettering hidden.
   */
  portrait?: { w: number; h: number }
}) {
  const { state: s, reducedMotion } = useGame()
  const phone = usePhone()
  const live = !reducedMotion && !s.paused
  const uid = useId().replace(/:/g, '')
  const skyId = `rm-sky-${uid}`
  const mode = !phone ? 'wide' : portrait ? 'portrait' : 'band'
  const w = mode === 'portrait' ? portrait!.w : ROOM_W
  const h = mode === 'portrait' ? portrait!.h : height
  const groundY = h - 52
  // The band drops the in-scene HUD row; its numbers move to real text above.
  const top = mode === 'band' ? BAND_TOP : 0
  const sky = (
    <>
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: skyTop }} />
          <stop offset="1" style={{ stopColor: skyBottom }} />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#${skyId})`} />
      <rect y={groundY} width={w} height={h - groundY} fill={ground} />
      <rect y={groundY - 10} width={w} height="10" fill={floor} />
    </>
  )

  return (
    <figure
      className={`rm rm--${mode}${live ? ' is-live' : ''}${s.paused ? ' is-paused' : ''} ${className}`.trim()}
      data-era={s.era}
      style={
        {
          '--rm-sky-top': skyTop,
          '--rm-sky-bottom': skyBottom,
          '--rm-floor': floor,
          '--rm-ground': ground,
          '--rm-floor-at': `${((groundY - 10) / h) * 100}%`,
          '--rm-ground-at': `${(groundY / h) * 100}%`,
        } as CSSProperties
      }
    >
      {mode !== 'wide' ? <RoomChips chips={chips} label={`${label.split(',')[0]} numbers`} /> : null}
      <div className="rm-stage">
        <svg
          className="rm-svg"
          viewBox={`0 ${top} ${w} ${h - top}`}
          role="img"
          aria-label={label}
          style={mode === 'band' ? { aspectRatio: `${w} / ${h - top}` } : undefined}
        >
          {showDefaultSky ? sky : null}
          {mode === 'wide' ? <RoomHud chips={chips} /> : null}
          {children}
        </svg>
      </div>
    </figure>
  )
}

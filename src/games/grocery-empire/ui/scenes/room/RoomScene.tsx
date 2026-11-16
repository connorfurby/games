import type { ReactNode } from 'react'
import { useId } from 'react'
import { useGame } from '../../GameContext'
import type { RoomHudChip } from './RoomHud'
import { RoomHud } from './RoomHud'
import './room.css'

export const ROOM_W = 960
export const ROOM_H = 300
export const ROOM_GROUND = 248

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
}) {
  const { state: s, reducedMotion } = useGame()
  const live = !reducedMotion && !s.paused
  const uid = useId().replace(/:/g, '')
  const skyId = `rm-sky-${uid}`
  const groundY = height - 52

  return (
    <figure
      className={`rm${live ? ' is-live' : ''}${s.paused ? ' is-paused' : ''} ${className}`.trim()}
      data-era={s.era}
    >
      <svg
        className="rm-svg"
        viewBox={`0 0 ${ROOM_W} ${height}`}
        role="img"
        aria-label={label}
      >
        {showDefaultSky ? (
          <>
            <defs>
              <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: skyTop }} />
                <stop offset="1" style={{ stopColor: skyBottom }} />
              </linearGradient>
            </defs>
            <rect width={ROOM_W} height={height} fill={`url(#${skyId})`} />
            <rect y={groundY} width={ROOM_W} height={height - groundY} fill={ground} />
            <rect y={groundY - 10} width={ROOM_W} height="10" fill={floor} />
          </>
        ) : null}
        <RoomHud chips={chips} />
        {children}
      </svg>
    </figure>
  )
}

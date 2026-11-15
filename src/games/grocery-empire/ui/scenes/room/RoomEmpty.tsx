import type { ReactNode } from 'react'
import { Hit } from './Hit'

/** Furnished idle state — never a blank sky. */
export function RoomEmpty({
  x = 280,
  y = 120,
  w = 400,
  title,
  body,
  cta,
  menu,
  coachId,
  onActivate,
  furniture,
}: {
  x?: number
  y?: number
  w?: number
  title: string
  body: string
  cta?: string
  menu?: string
  coachId?: string
  onActivate?: () => void
  furniture?: ReactNode
}) {
  return (
    <g className="rm-empty">
      {furniture}
      <rect x={x} y={y} width={w} height="88" rx="8" fill="#0f1317" stroke="#3a444e" opacity="0.92" />
      <text className="rm-empty__title" x={x + w / 2} y={y + 28} textAnchor="middle">
        {title}
      </text>
      <text className="rm-empty__body" x={x + w / 2} y={y + 50} textAnchor="middle">
        {body}
      </text>
      {cta ? (
        <Hit
          x={x + w / 2 - 80}
          y={y + 58}
          w={160}
          h={22}
          label={cta}
          menu={menu}
          coachId={coachId}
          onActivate={onActivate}
        >
          <text className="rm-sign" x={x + w / 2} y={y + 76} textAnchor="middle" fill="#f2c14e">
            {cta} →
          </text>
        </Hit>
      ) : null}
    </g>
  )
}

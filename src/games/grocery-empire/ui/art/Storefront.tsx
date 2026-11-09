/**
 * Grocery storefront. The origin is the bottom-left corner; the building rises up.
 * Shared by the empire map and the Land street so both read as the same city.
 */
export function Storefront({
  w = 46,
  h = 40,
  awning = 'var(--sc-tag)',
  lit = 0.75,
  drift = 0,
  sign,
  gold = false,
  door = true,
}: {
  w?: number
  h?: number
  awning?: string
  /** 0..1 window brightness. */
  lit?: number
  /** 0..1 neglect. Boards the glass once it gets bad. */
  drift?: number
  sign?: string
  gold?: boolean
  door?: boolean
}) {
  const glow = Math.max(0.08, Math.min(1, lit)) * (drift > 0.55 ? 0.35 : 1)
  const floors = h >= 58 ? 2 : 1
  const winW = Math.max(6, Math.min(9, (w - 16) / 3))
  const cols = Math.max(2, Math.min(4, Math.floor((w - 10) / (winW + 3))))
  const span = cols * winW + (cols - 1) * 3
  const x0 = (w - span) / 2
  const boarded = drift >= 0.45
  const roof = gold ? 'var(--sc-tag)' : awning

  return (
    <g className={`bm-shop${boarded ? ' is-drift' : ''}${gold ? ' is-gold' : ''}`}>
      <rect x={1} y={4} width={w - 2} height={h - 4} rx={1.5} className="bm-wall" />
      <polygon points={`0,10 ${w},10 ${w - 3},16 3,16`} fill={roof} />
      {sign ? (
        <text x={w / 2} y={9} textAnchor="middle" className="bm-sign">
          {sign.length > 12 ? `${sign.slice(0, 11)}…` : sign}
        </text>
      ) : null}
      {Array.from({ length: floors }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const wy = 20 + row * 16
          if (wy > h - 16) return null
          return (
            <rect
              key={`${row}-${col}`}
              x={x0 + col * (winW + 3)}
              y={wy}
              width={winW}
              height={11}
              rx={0.6}
              className="bm-win"
              style={{ opacity: 0.35 + glow * 0.65 }}
            />
          )
        }),
      )}
      {door ? <rect x={w / 2 - 4} y={h - 16} width={8} height={12} rx={0.8} className="bm-door" /> : null}
      {boarded ? (
        <g className="bm-boards">
          <rect x={5} y={h * 0.42} width={w - 10} height={3.2} rx={0.4} />
          <rect x={5} y={h * 0.62} width={w - 10} height={3.2} rx={0.4} />
        </g>
      ) : null}
    </g>
  )
}

export interface RoomHudChip {
  label: string
  value: string
  rate?: string
  neg?: boolean
}

/** Mandatory top strip of live numbers inside a RoomScene. */
export function RoomHud({
  chips,
  x = 12,
  y = 10,
  chipW = 132,
}: {
  chips: RoomHudChip[]
  x?: number
  y?: number
  chipW?: number
}) {
  const shown = chips.slice(0, 5)
  const gap = 8
  const w = Math.min(chipW, (960 - x * 2 - gap * (shown.length - 1)) / Math.max(1, shown.length))
  return (
    <g className="rm-hud" aria-hidden={false}>
      {shown.map((c, i) => {
        const cx = x + i * (w + gap)
        return (
          <g key={`${c.label}-${i}`} transform={`translate(${cx} ${y})`}>
            <rect className="rm-hud__chip" width={w} height="38" rx="5" />
            <text className="rm-hud__label" x="8" y="14">
              {c.label}
            </text>
            <text className="rm-hud__value" x="8" y="30">
              {c.value}
            </text>
            {c.rate ? (
              <text className={`rm-hud__rate${c.neg ? ' is-neg' : ''}`} x={w - 8} y="30" textAnchor="end">
                {c.rate}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

/** The same numbers as real text, for phone rooms where in-scene chips would be unreadable. */
export function RoomChips({ chips, label }: { chips: RoomHudChip[]; label: string }) {
  if (!chips.length) return null
  return (
    <ul className="rm-chips" aria-label={label}>
      {chips.slice(0, 5).map((c, i) => (
        <li key={`${c.label}-${i}`} className="rm-chips__chip">
          <span className="rm-chips__label">{c.label}</span>
          <span className="rm-chips__value">{c.value}</span>
          {c.rate ? <span className={`rm-chips__rate${c.neg ? ' is-neg' : ''}`}>{c.rate}</span> : null}
        </li>
      ))}
    </ul>
  )
}

import type { PlanetClimate } from '../../content/horizon'
import { SKU_BY_ID } from '../../content/horizon'
import { Hit, Person, RoomScene, Sign } from '../scenes/room'

export const CLIMATE_TINT: Record<
  PlanetClimate,
  { sky: string; ground: string; shelf: string; mark: string; glow: string }
> = {
  quiet: { sky: '#243148', ground: '#161e2a', shelf: '#8ea0b8', mark: '#c5d0e0', glow: '#9eb0c8' },
  heat: { sky: '#5a281c', ground: '#241411', shelf: '#e0a090', mark: '#f0c8b8', glow: '#e07058' },
  orchard: { sky: '#244830', ground: '#142218', shelf: '#b7d39a', mark: '#dff0c8', glow: '#7dba6a' },
  tide: { sky: '#174454', ground: '#0e2430', shelf: '#9fd0de', mark: '#d4eef4', glow: '#5eb4cc' },
  night: { sky: '#141228', ground: '#0a0914', shelf: '#b2acd4', mark: '#e0dcf0', glow: '#8d84c4' },
  ash: { sky: '#3e362e', ground: '#1e1916', shelf: '#c4b2a2', mark: '#e8ddd2', glow: '#a89078' },
  ice: { sky: '#6a8498', ground: '#c8d6e0', shelf: '#f7fafc', mark: '#ffffff', glow: '#e8f2f6' },
  market: { sky: '#4e3414', ground: '#24180c', shelf: '#e6c56a', mark: '#f8e8b0', glow: '#e0b44a' },
}

const SKU_GLYPH: Record<string, string> = {
  can: '▮',
  rice: '∷',
  milk: '◌',
  apple: '◉',
  salt: '✦',
  bread: '▭',
  spice: '✧',
  ice: '❄',
  seed: '⁕',
  lamp: '☀',
  soap: '□',
  flour: '▤',
}

/** Dense six-bay shelf — chips + bays fill the frame; planet sits beside the last bay. */
export function PlanetShelf({
  name,
  climate,
  slots,
  reducedMotion: _reducedMotion,
  score,
  survey,
  onCommit,
}: {
  name: string
  climate: PlanetClimate
  slots: readonly string[]
  reducedMotion: boolean
  score?: number
  survey?: number
  onCommit?: () => void
}) {
  const tint = CLIMATE_TINT[climate]
  const filled = slots.filter((id) => SKU_BY_ID[id]).length
  const scoreText = score != null && Number.isFinite(score) ? score.toFixed(2) : `${filled}/6`

  return (
    <RoomScene
      label={`${name}. ${filled} of 6 shelves filled.`}
      chips={[
        { label: 'World', value: name.slice(0, 12) },
        { label: 'Score', value: scoreText },
        { label: 'Shelf', value: `${filled}/6` },
        ...(survey != null
          ? [{ label: 'Survey', value: survey < 10 ? survey.toFixed(1) : String(Math.floor(survey)) }]
          : []),
      ]}
      skyTop={tint.sky}
      skyBottom={tint.ground}
      ground={tint.ground}
      floor={tint.shelf}
      height={200}
    >
      <defs>
        <radialGradient id={`hz-glow-${climate}`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor={tint.glow} stopOpacity="0.22" />
          <stop offset="100%" stopColor={tint.sky} stopOpacity="0" />
        </radialGradient>
      </defs>

      <Hit
        x={16}
        y={58}
        w={720}
        h={118}
        label="File or stock shelf"
        menu="planets"
        coachId="planets-standard"
        onActivate={onCommit}
      >
        {filled === 0 ? (
          <Sign x={28} y={72} text="File the standard — or place six goods" />
        ) : (
          <Sign x={28} y={72} text={`${filled} of 6 bays · tap to file`} small />
        )}
        {Array.from({ length: 6 }, (_, i) => {
          const sku = SKU_BY_ID[slots[i] ?? '']
          const x = 28 + i * 112
          return (
            <g key={i} transform={`translate(${x} 88)`}>
              <rect width="100" height="68" rx="5" fill={tint.shelf} opacity={sku ? 1 : 0.42} />
              {sku ? (
                <>
                  <rect x="24" y="10" width="52" height="28" rx="3" fill={tint.ground} opacity="0.85" />
                  <text x="50" y="30" textAnchor="middle" className="rm-sign" style={{ fontSize: 15 }}>
                    {SKU_GLYPH[sku.id] ?? '·'}
                  </text>
                  <Sign x={50} y={58} text={sku.name} small anchor="middle" />
                </>
              ) : (
                <Sign x={50} y={40} text={String(i + 1)} anchor="middle" />
              )}
            </g>
          )
        })}
      </Hit>

      <ellipse cx="820" cy="108" rx="70" ry="48" fill={`url(#hz-glow-${climate})`} />
      <g transform="translate(820 108)">
        <circle r="36" fill={tint.ground} stroke={tint.mark} strokeWidth="2" />
        <circle r="22" fill={tint.shelf} opacity="0.35" />
        <Sign x={0} y={4} text={name.split(' ').pop()?.slice(0, 7) ?? name.slice(0, 7)} small anchor="middle" />
      </g>
      <Person x={900} y={178} tint={tint.shelf} scale={0.75} working={filled > 0} />
    </RoomScene>
  )
}

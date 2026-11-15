import { PLANET_BY_ID } from '../../../content/horizon'
import { outposts } from '../../../sim/systems/lateHubs'
import { useGame } from '../../GameContext'
import { LiveScene } from './LiveScene'
import { CrateStack, SkyBand, Walker } from './primitives'

const CLIMATE_TINT: Record<string, string> = {
  quiet: '#7cc47f',
  heat: '#c9a15a',
  orchard: '#6a9a55',
  tide: '#6ea8c9',
  night: '#8d84c4',
  ash: '#a09080',
  ice: '#9fd4e4',
  market: '#e0a64a',
}

/** Land stage for stocked-world outposts — one pin per franchised / stocked world. */
export function OutpostStreetScene() {
  const { state: s } = useGame()
  const rows = outposts(s)
  const shown = rows.slice(0, 8)

  return (
    <LiveScene
      label={
        shown.length
          ? `Outpost street, ${shown.length} stocked world${shown.length === 1 ? '' : 's'}`
          : 'Outpost street, waiting on a stocked world'
      }
    >
      <SkyBand top="#1a2430" bottom="#3e4a32" />
      <rect x="0" y="168" width="960" height="52" fill="#2a2620" />
      <rect x="0" y="168" width="960" height="4" fill="#4a443c" />
      {shown.length === 0 ? (
        <text x="480" y="110" textAnchor="middle" fontSize="12" fill="#9aa7b4">
          Stock a world to plant an outpost pin.
        </text>
      ) : (
        shown.map((row, i) => {
          const climate = PLANET_BY_ID[row.id]?.climate ?? 'temperate'
          const tint = CLIMATE_TINT[climate] ?? '#c9a15a'
          const x = 70 + i * 110
          return (
            <g key={row.id} transform={`translate(${x} 0)`}>
              <rect x="0" y="90" width="72" height="54" rx="3" fill="#1c2228" stroke={tint} strokeWidth="2" />
              <rect x="8" y="98" width="28" height="22" fill={tint} opacity="0.55" />
              <CrateStack x={40} y={140} count={row.franchised ? 4 : Math.max(1, Math.round(row.score * 4))} cap={4} tint={tint} />
              <text x="36" y="158" textAnchor="middle" fontSize="9" fill="#efe9dc">
                {row.name.slice(0, 10)}
              </text>
              {row.franchised ? <Walker x={36} tint={tint} delay={i * 0.2} scale={0.85} label="Franchise clerk" /> : null}
            </g>
          )
        })
      )}
    </LiveScene>
  )
}

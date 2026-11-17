import { CHARTER_AXES } from '../../content/lateEras'
import type { GameState } from '../../sim/state'
import { Hit } from '../scenes/room/Hit'

/** Short labels under the charter bars; the full name is in the tooltip. */
const AXIS_SHORT: Record<string, string> = { shell: 'Hull', replication: 'Copy', survey: 'Scout', transit: 'Speed', brand: 'Brand' }

/**
 * Barges on the dark water, eating the biomass.
 * Pier labels carry barge count + biomass %; keel convoys labeled; Hits → launch / charter.
 */
export function FleetHarbor({ state: s, motion }: { state: GameState; motion: boolean }) {
  const f = s.fleet
  const barges = Math.max(0, Math.floor(f.barges))
  const shown = Math.min(12, barges)
  const cleared = f.biomassMax > 0 ? 1 - f.biomass / f.biomassMax : 0
  const left = 1 - cleared
  const convoys = s.era >= 8 && s.horizon?.keel?.bought ? Math.floor(s.horizon.keel.convoys) : 0
  const bioPct = Math.round(cleared * 100)

  return (
    <figure className={`fh${motion ? ' is-live' : ''}${f.warOn ? ' is-war' : ''}`}>
      <svg viewBox="0 0 960 220" role="img" aria-label="Seed barges harvesting biomass">
        <rect width="960" height="220" fill="#070b1f" />
        {[40, 120, 200, 310, 480, 640, 760, 880].map((x, i) => (
          <circle key={x} cx={x} cy={16 + (i % 4) * 8} r={i % 2 ? 1.2 : 0.7} fill="#efe9dc" opacity="0.7" />
        ))}
        <ellipse cx="760" cy="70" rx={40 + left * 70} ry={18 + left * 28} className="fh-bio" opacity={0.35 + left * 0.5} />
        <text x="760" y="74" textAnchor="middle" className="fh-bio-label">
          {f.biomass <= 0 ? 'CLEARED' : 'BIOMASS'}
        </text>
        <rect y="150" width="960" height="70" fill="#0c1a30" />
        <path d="M0 150 Q240 140 480 152 T960 146" fill="none" className="fh-wake" />

        {/* Pier labels */}
        <g transform="translate(150 158)">
          <rect width="150" height="36" rx="4" fill="#12182a" stroke="#4a5878" />
          <text x="10" y="15" className="fh-dock-label">
            PIER
          </text>
          <text x="10" y="30" className="fh-wait">
            {barges} barge{barges === 1 ? '' : 's'} · {bioPct}%
          </text>
        </g>

        {Array.from({ length: shown }, (_, i) => {
          const x = 150 + (i % 6) * 90
          const y = i < 6 ? 118 : 96
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <g className="fh-barge" style={{ animationDelay: `${i * 0.2}s` }}>
                <path d={`M28 8 Q${120 + (i % 3) * 20} ${-10 - (i % 2) * 6} 200 -30`} className="fh-beam" />
                <ellipse cx="28" cy="22" rx="28" ry="8" fill="#9aa7c7" />
                <rect x="16" y="12" width="20" height="8" rx="1" fill="#e7ecf5" />
              </g>
            </g>
          )
        })}
        {barges === 0 ? (
          <text x="400" y="130" className="fh-wait">
            The berth is empty — launch a barge
          </text>
        ) : null}
        {barges > shown ? (
          <text x="700" y="208" className="fh-wait">
            +{barges - shown} more barges in the dark
          </text>
        ) : null}

        <Hit x={16} y={16} w={200} h={110} label="Charter drydock" menu="fleet" coachId="fleet-charter">
          <text className="fh-dock-label" x="16" y="26">
            CHARTER
          </text>
          {CHARTER_AXES.map((a, i) => {
            const lvl = f.charter[a.id] ?? 0
            return (
              <g key={a.id} transform={`translate(${16 + i * 26} 34)`}>
                <rect y={70 - Math.min(60, lvl * 6)} width="16" height={Math.min(60, lvl * 6)} className="fh-pip" />
                <text y="84" className="fh-pip-label">
                  {AXIS_SHORT[a.id] ?? a.name}
                </text>
              </g>
            )
          })}
        </Hit>

        <Hit x={320} y={90} w={280} h={70} label="Launch a barge" menu="fleet" coachId="fleet-launch">
          <rect x="320" y="90" width="280" height="70" rx="6" fill="transparent" />
        </Hit>

        {convoys > 0 ? (
          <g transform="translate(560 168)">
            <text x="0" y="-6" className="fh-dock-label">
              KEEL CONVOYS
            </text>
            {Array.from({ length: Math.min(6, convoys) }, (_, i) => (
              <rect key={i} x={i * 22} y="0" width="16" height="8" rx="2" fill="#d9a441" opacity="0.85" />
            ))}
            <text x="0" y="28" className="fh-wait">
              {convoys} keel convoy{convoys === 1 ? '' : 's'} on the water
            </text>
          </g>
        ) : null}
        {f.warOn ? <rect width="960" height="220" className="fh-war" /> : null}
      </svg>
      <figcaption>
        {barges} barge{barges === 1 ? '' : 's'}
        {f.warOn ? ' · drift war on' : ''}
        {convoys > 0 ? ` · ${convoys} keel convoy${convoys === 1 ? '' : 's'}` : ''} · biomass {bioPct}% cleared
      </figcaption>
    </figure>
  )
}

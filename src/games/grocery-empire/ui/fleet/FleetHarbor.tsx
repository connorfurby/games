import { CHARTER_AXES } from '../../content/lateEras'
import type { GameState } from '../../sim/state'

/**
 * Barges on the dark water, eating the biomass.
 * The drydock on the left is the Charter: each stack is a point you placed.
 */
export function FleetHarbor({ state: s, motion }: { state: GameState; motion: boolean }) {
  const f = s.fleet
  const barges = Math.max(0, Math.floor(f.barges))
  const shown = Math.min(12, barges)
  const cleared = f.biomassMax > 0 ? 1 - f.biomass / f.biomassMax : 0
  const left = 1 - cleared

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
        <g transform="translate(16 16)">
          <text className="fh-dock-label" y="10">
            CHARTER
          </text>
          {CHARTER_AXES.map((a, i) => {
            const lvl = f.charter[a.id] ?? 0
            return (
              <g key={a.id} transform={`translate(${i * 26} 18)`}>
                <rect y={70 - Math.min(60, lvl * 6)} width="16" height={Math.min(60, lvl * 6)} className="fh-pip" />
                <text y="84" className="fh-pip-label">
                  {a.name.slice(0, 3)}
                </text>
              </g>
            )
          })}
        </g>
        {f.warOn ? <rect width="960" height="220" className="fh-war" /> : null}
      </svg>
      <figcaption>
        {barges} barge{barges === 1 ? '' : 's'}
        {f.warOn ? ' · drift war on' : ''} · biomass {Math.round(cleared * 100)}% cleared
      </figcaption>
    </figure>
  )
}

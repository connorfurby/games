import { CHARTER_AXES } from '../../../content/lateEras'
import { fleetHarvestPerSec } from '../../../sim/systems/fleet'
import { useGame } from '../../GameContext'
import { qty } from '../../format'
import { Badge, Hit, Person, RoomScene, Sign } from '../room'
import { HarborOrnaments } from './HarborOrnaments'

const NEB = { x: 800, y: 118 }
const PIER = { x: 440, y: 150 }

/** Where pocket `i` of `n` hangs in orbit around the biomass cloud. */
function pocketAt(i: number, n: number) {
  const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2
  return { x: NEB.x + Math.cos(a) * 92, y: NEB.y + Math.sin(a) * 56 }
}

/**
 * Fleet harbor room: pier + barges on dark water, biomass cloud with six orbiting pockets,
 * en-route haulers drawn on their real ETA, Charter drydock on the left.
 */
export function FleetHarborScene() {
  const { state: s } = useGame()
  const f = s.fleet
  const barges = Math.max(0, Math.floor(f.barges))
  const shown = Math.min(8, barges)
  const pockets = f.pockets ?? []
  const cleared = f.biomassMax > 0 ? Math.max(0, Math.min(1, 1 - f.biomass / f.biomassMax)) : 0
  const left = 1 - cleared
  const bioPct = Math.round(cleared * 100)
  const pocketsCleared = pockets.filter((p) => p.left <= 0).length
  const trips = (f.trips ?? []).filter((t) => t.status === 'enroute')
  const convoys = s.era >= 8 && s.horizon?.keel?.bought ? Math.floor(s.horizon.keel.convoys) : 0
  const harvest = fleetHarvestPerSec(s)
  const charterIn = Object.values(f.charter).reduce((a, n) => a + Math.max(0, n), 0)

  return (
    <RoomScene
      label={`Fleet harbor. ${barges} barges, biomass ${bioPct}% cleared, ${pocketsCleared} of ${pockets.length} pockets clear${f.warOn ? ', drift war on' : ''}.`}
      chips={[
        { label: 'Barges', value: String(barges) },
        { label: 'Biomass', value: `${bioPct}%`, rate: f.biomass <= 0 ? 'clear' : undefined },
        { label: 'Pockets', value: `${pocketsCleared}/${pockets.length || 6}` },
        {
          label: 'En route',
          value: trips.length ? String(trips.length) : harvest > 0 ? `${qty(harvest)}/s` : '—',
        },
      ]}
      skyTop="#070b1f"
      skyBottom="#0f1b3a"
      ground="#0a1630"
      floor="#12264a"
      height={260}
    >
      {/* Stars */}
      {[60, 150, 260, 340, 420, 560, 640, 700, 880, 930].map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={64 + (i % 4) * 14}
          r={i % 3 ? 1 : 1.5}
          fill="#efe9dc"
          opacity="0.55"
          className={i % 3 === 0 ? 'rm-pulse' : undefined}
        />
      ))}

      {/* Biomass cloud — shrinks as pockets clear */}
      <g aria-hidden>
        <ellipse
          cx={NEB.x}
          cy={NEB.y}
          rx={22 + left * 58}
          ry={14 + left * 34}
          fill="#6a4ea0"
          opacity={0.25 + left * 0.45}
        />
        <ellipse
          className="rm-pulse"
          cx={NEB.x}
          cy={NEB.y}
          rx={32 + left * 62}
          ry={22 + left * 38}
          fill="none"
          stroke="#c3aaf0"
          strokeOpacity="0.5"
          strokeDasharray="4 6"
        />
        <Sign x={NEB.x} y={NEB.y + 4} text={f.biomass <= 0 ? 'CLEARED' : 'BIOMASS'} small anchor="middle" />
      </g>

      {/* Pockets in orbit */}
      {pockets.map((p, i) => {
        const at = pocketAt(i, pockets.length)
        const done = p.left <= 0
        const frac = p.max > 0 ? Math.max(0, Math.min(1, p.left / p.max)) : 0
        return (
          <g key={p.id} transform={`translate(${at.x} ${at.y})`}>
            <title>{`${p.ration} pocket${done ? ' — cleared' : ` — ${Math.round(frac * 100)}% left`}`}</title>
            <circle r="11" fill="#0f1317" stroke={done ? '#7cc47f' : '#a58be0'} strokeWidth="2" />
            {done ? null : <circle r={3 + frac * 6} fill="#a58be0" opacity="0.85" />}
            <text className="rm-badge__text" y={done ? 4 : 24} textAnchor="middle" fill={done ? '#7cc47f' : '#b4bfc9'}>
              {done ? '✓' : p.ration.slice(0, 4)}
            </text>
          </g>
        )
      })}

      {/* Haulers on live trips: position follows the sim clock */}
      {trips.slice(0, 4).map((t) => {
        const idx = Math.max(0, pockets.findIndex((p) => p.id === t.pocketId))
        const at = pocketAt(idx, pockets.length)
        const span = Math.max(1, t.arriveAt - t.departAt)
        const k = Math.max(0, Math.min(1, (s.time - t.departAt) / span))
        const x = PIER.x + (at.x - PIER.x) * k
        const y = PIER.y + (at.y - PIER.y) * k
        return (
          <g key={`${t.bargeId}-${t.pocketId}`}>
            <path
              d={`M${PIER.x} ${PIER.y} L${at.x} ${at.y}`}
              stroke="#c3aaf0"
              strokeOpacity="0.4"
              strokeDasharray="3 6"
              fill="none"
            />
            <g transform={`translate(${x} ${y})`}>
              <ellipse rx="9" ry="4" fill="#e7ecf5" />
              <rect x="-3" y="-5" width="6" height="4" rx="1" fill="#9aa7c7" />
            </g>
          </g>
        )
      })}

      {/* Charter drydock */}
      <Hit x={24} y={58} w={160} h={130} label="Charter drydock" menu="fleet" coachId="fleet-charter">
        <rect x="24" y="58" width="160" height="130" rx="8" fill="#0f131a" stroke="#4a5a72" strokeWidth="2" />
        <Sign x={38} y={80} text="Charter" />
        {CHARTER_AXES.map((a, i) => {
          const lvl = Math.max(0, f.charter[a.id] ?? 0)
          const h = Math.min(70, lvl * 7)
          return (
            <g key={a.id} transform={`translate(${42 + i * 28} 94)`}>
              <rect width="18" height="70" rx="3" fill="#1e2836" />
              <rect y={70 - h} width="18" height={h} rx="3" fill="#d9a441" opacity="0.9" />
              <text className="rm-sign--sm" y="84" x="9" textAnchor="middle" fontSize="9">
                {a.name.slice(0, 3)}
              </text>
            </g>
          )
        })}
        {f.charterPool > 0 ? <Badge x={118} y={64} text={`${f.charterPool} free`} w={56} /> : null}
        {charterIn === 0 && f.charterPool === 0 ? (
          <Sign x={104} y={181} text="No points yet" small anchor="middle" />
        ) : null}
      </Hit>

      {/* Pier + barges */}
      <Hit x={200} y={96} w={270} h={104} label="Launch a barge" menu="fleet" coachId="fleet-launch">
        <rect x="200" y="176" width="270" height="12" rx="2" fill="#3a2f26" stroke="#5a4e44" />
        {[212, 262, 312, 362, 412, 452].map((x) => (
          <rect key={x} x={x} y="188" width="6" height="14" fill="#2a221c" />
        ))}
        <Sign x={212} y={112} text="Pier" />
        <Sign x={212} y={128} text={`${barges} barge${barges === 1 ? '' : 's'}`} small />
        {Array.from({ length: shown }, (_, i) => {
          const x = 214 + (i % 4) * 62
          const y = i < 4 ? 150 : 124
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <g className="rm-person" style={{ animationDelay: `${i * 0.25}s` }}>
                <path d="M0 14 H48 L40 24 H8 Z" fill="#9aa7c7" />
                <rect x="14" y="4" width="20" height="10" rx="1" fill="#e7ecf5" />
                <path
                  d={`M24 4 Q${60 + i * 14} ${-20 - (i % 2) * 10} ${NEB.x - 110 - x} ${NEB.y - y}`}
                  fill="none"
                  stroke="#c3aaf0"
                  strokeOpacity="0.28"
                  className="rm-pulse"
                />
              </g>
            </g>
          )
        })}
        {barges === 0 ? <Sign x={212} y={162} text="Berth is empty — launch a barge" small /> : null}
        {barges > shown ? <Sign x={330} y={128} text={`+${barges - shown} in the dark`} small /> : null}
      </Hit>

      <HarborOrnaments />

      {convoys > 0 ? (
        <g transform="translate(500 214)">
          <Sign x={0} y={-4} text="Keel convoys" small />
          {Array.from({ length: Math.min(6, convoys) }, (_, i) => (
            <rect key={i} x={i * 20} y="2" width="14" height="8" rx="2" fill="#d9a441" opacity="0.85" />
          ))}
          <Sign x={0} y={26} text={`${convoys} on the water`} small />
        </g>
      ) : null}

      {f.warOn ? <rect width="960" height="260" fill="#d9665b" opacity="0.08" className="rm-pulse" pointerEvents="none" /> : null}

      <Person x={196} y={170} tint="#c9a15a" working={barges > 0} delay={0.2} />
      <Person x={480} y={170} tint="#8fb6e0" working={trips.length > 0} delay={0.6} />
    </RoomScene>
  )
}

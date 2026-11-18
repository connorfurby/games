import { fuelCap } from '../../../sim/systems/late'
import { useGame } from '../../GameContext'
import { Badge, Gauge, Hit, RoomScene, Sign } from '../room'

/** Logistics room: labeled lanes, ships when fueled, fuel tower in gallons, dry dock when empty. */
export function LaneScene() {
  const { state: s, reducedMotion } = useGame()
  const lanes = Math.min(4, Math.max(0, s.fleet.lanes))
  const cap = Math.max(1, fuelCap(s))
  const fuelGal = Math.floor(s.fuel)
  const fuelFrac = Math.max(0, Math.min(1, s.fuel / cap))
  const circuits = s.era >= 8 ? Math.min(6, s.horizon?.circuits?.length ?? 0) : 0
  const keel = s.horizon?.keel?.bought ? Math.min(3, s.horizon.keel.convoys ?? 0) : 0
  const moving = !reducedMotion && !s.paused && s.fuel > 0 && lanes > 0
  const wet = s.fuel > 0 ? lanes : 0

  return (
    <RoomScene
      className="ls"
      label={`Logistics, ${s.fleet.lanes} lanes, fuel ${fuelGal} of ${Math.round(cap)} gallons${
        circuits ? `, ${circuits} convoys` : ''
      }`}
      chips={[
        { label: 'Routes', value: lanes > 0 ? `${wet}/${lanes} fuelled` : 'None yet', neg: lanes > 0 && s.fuel <= 0 },
        { label: 'Fuel', value: `${fuelGal} gal`, rate: `${Math.round(fuelFrac * 100)}%`, neg: fuelFrac < 0.25 },
        ...(s.era >= 8 ? [{ label: 'Circuits', value: String(circuits) }] : []),
        ...(s.horizon?.keel?.bought ? [{ label: 'Convoys', value: String(keel) }] : []),
      ]}
      skyTop="#12202c"
      skyBottom="#1d3446"
    >
      {Array.from({ length: Math.max(lanes, 0) }, (_, i) => {
        const y = 200 - i * 28
        const d = `M60 ${y} Q 300 ${y - 70 - i * 6} 560 ${y - 10} T 820 ${y - 20}`
        return (
          <Hit
            key={i}
            x={40}
            y={y - 50}
            w={780}
            h={56}
            label={`Route ${i + 1}`}
            menu="logistics"
            coachId="logistics-lane"
          >
            <Sign x={48} y={y - 36} text={`Route ${i + 1}`} />
            <Badge
              x={110}
              y={y - 48}
              text={s.fuel > 0 ? 'fuelled' : 'no fuel'}
              w={40}
            />
            <path d={d} fill="none" stroke="#5aa0c0" strokeWidth="2" strokeDasharray="6 6" opacity="0.7" />
            {s.fuel > 0 ? (
              <g
                className={moving ? 'ls-ship' : undefined}
                style={
                  moving
                    ? {
                        offsetPath: `path('${d}')`,
                        animationDuration: `${14 + i * 3}s`,
                        animationDelay: `${-i * 3}s`,
                      }
                    : { transform: `translate(300px, ${y - 70 - i * 6}px)` }
                }
              >
                <rect x="-14" y="-6" width="28" height="10" rx="3" fill="#c9a15a" />
                <rect x="-6" y="-12" width="10" height="6" fill="#efe9dc" />
              </g>
            ) : (
              <Sign x={300} y={y - 8} text="Waiting on fuel" small />
            )}
          </Hit>
        )
      })}

      {Array.from({ length: circuits }, (_, i) => (
        <path
          key={`c${i}`}
          d={`M${120 + i * 20} 56 Q ${480} ${24 + i * 6} ${840 - i * 20} 56`}
          fill="none"
          stroke="#c3aaf0"
          strokeWidth="1.5"
          opacity="0.6"
        />
      ))}

      {Array.from({ length: keel }, (_, i) => (
        <g key={`k${i}`} transform={`translate(${200 + i * 90} ${80 + i * 8})`}>
          <rect width="42" height="16" rx="3" fill="#c45a3c" />
          <path d="M6 -4 L21 -12 L36 -4" fill="none" stroke="#efe9dc" strokeWidth="1.5" />
          <Sign x={21} y={30} text="Convoy" small anchor="middle" />
        </g>
      ))}

      <Hit x={860} y={70} w={80} h={160} label="Buy fuel" menu="logistics" coachId="logistics-lane">
        <Sign x={870} y={88} text="Fuel" />
        <Gauge
          x={878}
          y={100}
          h={110}
          w={36}
          fill={fuelFrac}
          color={fuelFrac < 0.25 ? '#e05252' : '#d9a441'}
          label="gal"
          value={`${fuelGal}`}
        />
      </Hit>

      {lanes <= 0 ? (
        <g>
          {/* No routes yet: four empty berths waiting for ships. */}
          <Sign x={430} y={92} text="No sea routes yet: open one below and a ship takes a berth" anchor="middle" small />
          {Array.from({ length: 4 }, (_, i) => {
            const x = 90 + i * 185
            return (
              <g key={`berth${i}`}>
                <rect x={x} y={178} width={130} height={10} rx="2" fill="#4a3d32" />
                {[0, 1, 2, 3].map((k) => (
                  <rect key={k} x={x + 6 + k * 38} y={186} width={6} height={20} fill="#3a3026" />
                ))}
                <rect x={x + 20} y={150} width={90} height={22} rx="4" fill="none" stroke="#5aa0c0" strokeDasharray="5 4" opacity="0.6" />
                <Sign x={x + 65} y={134} text={`Berth ${i + 1}`} small anchor="middle" />
              </g>
            )
          })}
        </g>
      ) : null}
    </RoomScene>
  )
}

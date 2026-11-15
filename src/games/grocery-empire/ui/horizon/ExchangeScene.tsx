import { Hit, Person, RoomScene, Sign } from '../scenes/room'

/** Three discs, Keel hulls, freight chip — Hit to open / file circuit. */
export function ExchangeScene({
  origin,
  stop,
  dest,
  convoys,
  freight,
  reducedMotion: _reducedMotion,
  onOpen,
}: {
  origin: string
  stop: string
  dest: string
  convoys: number
  freight?: number
  reducedMotion: boolean
  onOpen?: () => void
}) {
  const on = [Boolean(origin), Boolean(stop), Boolean(dest)]
  const labels = [origin || 'Origin', stop || 'Stop', dest || 'Dest']
  const hulls = Math.max(0, Math.min(8, Math.floor(convoys)))

  return (
    <RoomScene
      label={`${hulls} Keel hull${hulls === 1 ? '' : 's'} on the circuit.`}
      chips={[
        { label: 'Route', value: origin && dest ? `${origin.slice(0, 6)}→${dest.slice(0, 6)}` : 'Open' },
        { label: 'Keel', value: String(hulls) },
        ...(freight != null
          ? [{ label: 'Freight', value: freight < 10 ? freight.toFixed(1) : String(Math.floor(freight)) }]
          : []),
      ]}
      skyTop="#0c1224"
      skyBottom="#152038"
      ground="#152038"
      floor="#1a2438"
      height={280}
    >
      {[60, 160, 280, 420, 560, 700, 820, 920].map((x, i) => (
        <circle key={x} cx={x} cy={56 + (i % 4) * 9} r={i % 2 ? 1.3 : 0.8} fill="#efe9dc" opacity="0.45" />
      ))}
      <path
        d="M120 130 Q480 66 840 130"
        fill="none"
        stroke="#8ea0b8"
        strokeWidth="2.5"
        strokeDasharray={on.every(Boolean) ? '0' : '6 6'}
        opacity="0.85"
      />
      <Hit x={80} y={90} w={800} h={120} label="Open circuit" menu="exchange" coachId="exchange-goal" onActivate={onOpen}>
        {[
          [120, labels[0], on[0]],
          [480, labels[1], on[1]],
          [840, labels[2], on[2]],
        ].map(([x, label, lit], i) => (
          <g key={i} transform={`translate(${x} 130)`}>
            <circle r="28" fill={lit ? '#e7e1d4' : '#1a2438'} stroke="#e7e1d4" strokeWidth="2" />
            <circle r="12" fill={lit ? '#c45a3c' : '#2a3650'} opacity="0.85" />
            <Sign x={0} y={48} text={String(label).slice(0, 12)} small anchor="middle" />
          </g>
        ))}
        {Array.from({ length: hulls }, (_, i) => {
          const x = 80 + i * 100
          return (
            <g key={i} transform={`translate(${x} 200)`}>
              <path d="M0 10 H36 L48 4 L36 -2 H0 Z" fill="#c45a3c" />
              <rect x="12" y="-10" width="3" height="10" fill="#efe9dc" />
            </g>
          )
        })}
        {hulls === 0 ? <Sign x={480} y={210} text="Keel is quiet — open a circuit" anchor="middle" /> : null}
      </Hit>
      <Person x={900} y={230} tint="#c45a3c" name="Maris" scale={0.85} working={hulls > 0} />
    </RoomScene>
  )
}

import { Hit, Person, RoomScene, Sign } from '../scenes/room'
import { pct } from '../format'

/** Aisle bay + clipboard — live list score; Hit to file standard. */
export function LastAisleScene({
  filled,
  score,
  reducedMotion: _reducedMotion,
  onFile,
}: {
  filled: number
  score?: number
  reducedMotion: boolean
  onFile?: () => void
}) {
  const n = Math.max(0, Math.min(5, filled))

  return (
    <RoomScene
      label={`Ivo’s list. ${n} of 5 lines filled.`}
      chips={[
        { label: 'Lines', value: `${n}/5` },
        ...(score != null ? [{ label: 'Average', value: pct(score) }] : []),
        { label: 'List', value: n >= 5 ? 'Ready' : 'Fill' },
      ]}
      skyTop="#1c1916"
      skyBottom="#12100e"
      ground="#12100e"
      floor="#2a2420"
      height={280}
    >
      {[120, 280, 440, 600].map((x) => (
        <rect key={x} x={x} y="52" width="72" height="4" rx="2" fill="#c4b2a2" opacity="0.35" />
      ))}
      {[0, 1, 2].map((row) => (
        <g key={row} transform={`translate(48 ${90 + row * 28})`}>
          <rect width="420" height="22" rx="2" fill="#2a2420" stroke="#4a4038" strokeWidth="1.5" />
          {[0, 1, 2, 3, 4, 5].map((slot) => (
            <rect
              key={slot}
              x={14 + slot * 66}
              y="4"
              width="52"
              height="14"
              rx="2"
              fill={slot < n ? '#3f6b3a' : '#3a322c'}
              opacity={slot < n ? 1 : 0.55}
            />
          ))}
        </g>
      ))}

      <Person x={520} y={220} tint="#efe9dc" name="Ivo" scale={0.95} working={n > 0} />

      <Hit
        x={600}
        y={56}
        w={320}
        h={180}
        label="Fill with the standard"
        menu="lastaisle"
        coachId="lastaisle-standard"
        onActivate={onFile}
      >
        <rect x="620" y="56" width="280" height="148" rx="6" fill="#f4efe4" />
        <rect x="728" y="50" width="64" height="14" rx="3" fill="#c4b2a2" />
        <text x="760" y="92" textAnchor="middle" className="rm-sign" style={{ fill: '#1c1916' }}>
          THE LIST
        </text>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <circle cx="648" cy={108 + i * 22} r="5" fill={i < n ? '#3f6b3a' : '#c4b2a2'} />
            <rect
              x="664"
              y={104 + i * 22}
              width={i < n ? 200 : 140}
              height="8"
              rx="2"
              fill={i < n ? '#3f6b3a' : '#c4b2a2'}
              opacity={i < n ? 0.85 : 0.55}
            />
          </g>
        ))}
      </Hit>
      <Sign x={258} y={240} text={n === 0 ? 'Five lines to fill' : `${n} of 5 filled`} anchor="middle" />
    </RoomScene>
  )
}
import { Hit, Person, RoomScene, Sign } from '../scenes/room'

/** Treaty table and embassy seals — Seal chip; Hit to embassy. */
export function CharterScene({
  kept,
  embassies,
  signed,
  seal,
  reducedMotion: _reducedMotion,
  onEmbassy,
}: {
  kept: number
  embassies: number
  signed: boolean
  seal?: number
  reducedMotion: boolean
  onEmbassy?: () => void
}) {
  const seals = Math.max(0, Math.min(8, embassies))

  return (
    <RoomScene
      label={`${kept} clauses kept. ${seals} embassies.`}
      chips={[
        { label: 'Clauses', value: `${kept}/4` },
        { label: 'Embassies', value: String(seals) },
        ...(seal != null ? [{ label: 'Seal', value: seal < 10 ? seal.toFixed(1) : String(Math.floor(seal)) }] : []),
        { label: 'Charter', value: signed ? 'Signed' : 'Open' },
      ]}
      skyTop="#2a2218"
      skyBottom="#1a1510"
      ground="#1a1510"
      floor="#6a543c"
      height={280}
    >
      <ellipse cx="420" cy="168" rx="260" ry="48" fill="#6a543c" />
      <ellipse cx="420" cy="158" rx="260" ry="48" fill="#c4a574" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={262 + i * 82}
          y="136"
          width="70"
          height="44"
          rx="3"
          fill={i < kept ? '#f4efe4' : '#8a7050'}
          stroke="#2a2218"
          strokeWidth="1.5"
        />
      ))}
      {signed ? <circle cx="420" cy="158" r="16" fill="none" stroke="#8d2a2a" strokeWidth="3" /> : null}
      <Sign x={420} y={278} text={signed ? 'Charter signed' : `${kept} of 4 clauses on the table`} anchor="middle" />

      <Hit
        x={700}
        y={56}
        w={220}
        h={180}
        label="Open embassy"
        menu="charter"
        coachId="charter-embassy"
        onActivate={onEmbassy}
      >
        <Sign x={810} y={80} text="Embassies" anchor="middle" />
        {Array.from({ length: Math.max(seals, 1) }, (_, i) => (
          <g key={i} transform={`translate(${760 + (i % 2) * 56} ${100 + Math.floor(i / 2) * 42})`}>
            <circle
              r="16"
              fill="none"
              stroke={i < seals ? '#c6a15a' : '#4a4038'}
              strokeWidth="2"
              opacity={i < seals ? 1 : 0.4}
            />
            <circle r="5" fill={i < seals ? '#c6a15a' : '#4a4038'} opacity={i < seals ? 1 : 0.4} />
          </g>
        ))}
      </Hit>
      <Person x={120} y={230} tint="#c4a574" name="Diplomat" scale={0.85} working={signed} />
    </RoomScene>
  )
}

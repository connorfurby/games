import { Hit, Person, RoomScene, Sign } from '../scenes/room'
import { SymbolMark } from './SymbolMark'

/** Mast and four marks — live Signal chip; Hit to phrase commit. */
export function SignalScene({
  symbols,
  signal,
  reducedMotion: _reducedMotion,
  onCommit,
}: {
  symbols: readonly string[]
  signal?: number
  reducedMotion: boolean
  onCommit?: () => void
}) {
  const marks = [0, 1, 2, 3].map((i) => symbols[i] ?? '')
  const filled = marks.filter(Boolean).length

  return (
    <RoomScene
      label="Signal mast and four marks."
      chips={[
        { label: 'Marks', value: `${filled}/4` },
        ...(signal != null
          ? [{ label: 'Signal', value: signal < 10 ? signal.toFixed(1) : String(Math.floor(signal)) }]
          : []),
        { label: 'Wire', value: filled >= 4 ? 'Ready' : 'Open' },
      ]}
      skyTop="#161428"
      skyBottom="#0e0c18"
      ground="#0e0c18"
      floor="#241e33"
      height={280}
    >
      {/* Radio mast: lattice tower, lit tip, waves heading for the marks. */}
      <g stroke="#cfc6e8" strokeWidth="2" fill="none" strokeLinejoin="round">
        <path d="M104 196 L122 60 L140 196" />
        <path d="M108 166 L136 166 M111 136 L133 136 M114 106 L130 106 M117 80 L127 80" />
        <path d="M108 166 L133 136 L111 136 L130 106 L114 106 L127 80" opacity="0.6" />
      </g>
      <circle cx="122" cy="56" r="5" fill="#f2c14e" />
      <g stroke="#f2c14e" strokeWidth="2" fill="none" opacity="0.7" strokeLinecap="round">
        <path d="M136 46 Q146 56 136 66" />
        <path d="M146 38 Q162 56 146 74" opacity="0.6" />
      </g>
      <path d="M230 120 H880" stroke="#8d84c4" strokeWidth="2" strokeDasharray="6 8" opacity="0.7" />

      <Hit
        x={260}
        y={70}
        w={600}
        h={140}
        label="Commit phrase"
        menu="signal"
        coachId="signal-commit"
        onActivate={onCommit}
      >
        {marks.map((mark, i) => (
          <g key={i} transform={`translate(${300 + i * 140} 80)`} color="#efe9dc">
            <rect width="96" height="96" rx="10" fill="#241e33" stroke="#8d84c4" strokeWidth="2" />
            <g transform="translate(24 24)">
              {mark ? (
                <SymbolMark id={mark} size={48} />
              ) : (
                <Sign x={24} y={32} text="?" anchor="middle" />
              )}
            </g>
          </g>
        ))}
      </Hit>
      {filled === 0 ? <Sign x={560} y={230} text="Four marks to send" anchor="middle" /> : null}
      <Person x={60} y={230} tint="#8d84c4" name="Listener" scale={0.85} working={filled > 0} />
    </RoomScene>
  )
}

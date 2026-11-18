import { LiveScene } from './LiveScene'
import { Blink, SkyBand, Walker } from './primitives'

/**
 * Planets before the first world: a probe on its pad under a starry sky. The fuel gauge on the
 * tower fills with cash toward the next probe, so the room says how close the launch is.
 */
export function ProbePadScene({ ready, fill, note }: { ready: boolean; fill: number; note: string }) {
  const f = Math.max(0, Math.min(1, fill))
  const stars = Array.from({ length: 28 }, (_, i) => ({
    x: (i * 137) % 940 + 10,
    y: ((i * 53) % 120) + 8,
    r: i % 5 === 0 ? 1.6 : 1,
  }))
  return (
    <LiveScene label={`Probe pad. ${note}`}>
      <SkyBand top="#0b1020" bottom="#232a44" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#e8e2d0" opacity={0.35 + (i % 3) * 0.2} />
      ))}
      {/* A far world, still unknown */}
      <circle cx="780" cy="58" r="26" fill="#2e3550" stroke="#5a6488" strokeDasharray="4 3" />
      <text x="780" y="62" textAnchor="middle" fontSize="12" fill="#9aa3c4">
        ?
      </text>

      {/* Ground */}
      <rect x="0" y="176" width="960" height="44" fill="#1a1c22" />
      <rect x="0" y="176" width="960" height="3" fill="#3a3e4a" />

      {/* Launch tower with a fuel gauge */}
      <g transform="translate(400 70)">
        <rect x="0" y="0" width="14" height="106" fill="#3a4152" />
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M0 ${i * 18 + 4} L14 ${i * 18 + 16} M14 ${i * 18 + 4} L0 ${i * 18 + 16}`} stroke="#59627a" strokeWidth="1.2" />
        ))}
        <rect x="-26" y="20" width="16" height="70" rx="3" fill="#121620" stroke="#59627a" />
        <rect x="-23" y={23 + 64 * (1 - f)} width="10" height={64 * f} rx="2" fill={ready ? '#7cc47f' : '#f2c14e'} />
        <text x="-18" y="12" textAnchor="middle" fontSize="10" fill="#c9cbd6">
          {Math.round(f * 100)}%
        </text>
        <Blink x={7} y={-4} on={ready} color={ready ? '#7cc47f' : '#e0a43a'} />
      </g>

      {/* The probe */}
      <g transform="translate(436 74)">
        <path d="M18 0 C30 14 32 40 32 70 L4 70 C4 40 6 14 18 0 Z" fill="#d9d4c7" stroke="#8a8476" />
        <circle cx="18" cy="34" r="6" fill="#2e3550" stroke="#8a8476" />
        <path d="M4 56 L-6 82 L4 76 Z M32 56 L42 82 L32 76 Z" fill="#c45a4a" />
        <rect x="8" y="70" width="20" height="10" fill="#6b6f7a" />
        {ready ? <path d="M10 82 Q18 100 26 82 Z" fill="#f2c14e" opacity="0.85" /> : null}
      </g>
      <rect x="380" y="166" width="120" height="10" fill="#2c303a" />

      <Walker x={540} tint="#c9a15a" delay={0.1} label="Pad crew" />
      <Walker x={600} tint="#8fb6e0" delay={0.6} label="Pad crew" />

      <text x="60" y="206" fontSize="12" fill="#c9cbd6">
        {note}
      </text>
    </LiveScene>
  )
}

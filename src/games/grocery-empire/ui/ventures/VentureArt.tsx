/**
 * A small scene for each side till. The jar on the counter fills with real stored cash.
 */

const SCENES: Record<string, { sky: string; ground: string; sign: string }> = {
  coffee: { sky: '#3a2a28', ground: '#2a211c', sign: 'COFFEE' },
  mealkits: { sky: '#2a3328', ground: '#241e18', sign: 'KITS' },
  catering: { sky: '#2c2838', ground: '#221e18', sign: 'CATERING' },
  ghost: { sky: '#1a1c28', ground: '#14161c', sign: 'GHOST' },
  snacks: { sky: '#3a2e22', ground: '#261c14', sign: 'SNACKS' },
  commodity: { sky: '#243040', ground: '#1a2228', sign: 'DESK' },
  coldlease: { sky: '#1c2c38', ground: '#162028', sign: 'COLD' },
  media: { sky: '#2a2040', ground: '#1a1624', sign: 'ON AIR' },
  orbital: { sky: '#12162c', ground: '#10141f', sign: 'ORBIT' },
  museum: { sky: '#2e2830', ground: '#221e22', sign: 'MUSEUM' },
}

export function VentureArt({
  id,
  level,
  fill,
  open,
  motion,
}: {
  id: string
  level: number
  /** 0..1 till fullness. */
  fill: number
  open: boolean
  motion: boolean
}) {
  const look = SCENES[id] ?? SCENES.coffee!
  const f = Math.max(0, Math.min(1, fill))
  const busy = open ? Math.max(1, Math.min(5, Math.ceil(level / 4))) : 0

  return (
    <svg className={`va${motion ? ' is-live' : ''}${open ? '' : ' is-shut'}`} viewBox="0 0 320 108" aria-hidden>
      <rect width="320" height="78" fill={look.sky} />
      <rect y="78" width="320" height="30" fill={look.ground} />
      <g transform="translate(150 62) scale(1.55) translate(-130 -58)">
        <Scene id={id} busy={open ? busy : 2} open />
      </g>
      <g transform="translate(248 62)">
        <rect width="52" height="36" rx="3" fill="#1a1612" stroke="#efe9dc" strokeOpacity="0.35" />
        <rect x="6" y={28 - f * 20} width="40" height={f * 20} fill="var(--sc-tag)" opacity={0.35 + f * 0.6} />
        <text x="26" y="12" textAnchor="middle" className="va-jar">
          TILL
        </text>
      </g>
      <g transform="translate(16 16)">
        <rect width="92" height="16" rx="2" fill="#1e2a2b" />
        <text x="46" y="12" textAnchor="middle" className="va-sign">
          {open ? look.sign : 'CLOSED'}
        </text>
      </g>
    </svg>
  )
}

function Scene({ id, busy, open }: { id: string; busy: number; open: boolean }) {
  if (!open) {
    return (
      <g opacity="0.45">
        <rect x="70" y="48" width="140" height="36" fill="#1a1614" />
        <path d="M78 54 H200 M78 64 H170" stroke="#efe9dc" strokeOpacity="0.25" />
      </g>
    )
  }
  switch (id) {
    case 'coffee':
      return (
        <g>
          <rect x="78" y="58" width="70" height="28" rx="3" fill="#5b3a33" />
          <rect x="86" y="46" width="28" height="16" rx="2" fill="#c9a15a" />
          <circle cx="126" cy="70" r="8" fill="#efe9dc" />
          {Array.from({ length: busy }, (_, i) => (
            <path key={i} d={`M${100 + i * 12} 44 q4 -10 0 -16`} className="va-steam" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
        </g>
      )
    case 'mealkits':
      return (
        <g>
          {Array.from({ length: 3 + Math.min(2, busy) }, (_, i) => (
            <g key={i} transform={`translate(${78 + i * 28} ${58 - (i % 2) * 8})`}>
              <rect width="24" height="22" rx="2" fill={i % 2 ? '#7cc47f' : '#c9a15a'} />
              <path d="M4 8 H20" stroke="#1a1612" strokeOpacity="0.35" />
            </g>
          ))}
        </g>
      )
    case 'catering':
      return (
        <g>
          <rect x="70" y="58" width="86" height="26" rx="3" fill="#efe9dc" />
          <rect x="148" y="64" width="28" height="20" fill="#c9a15a" />
          <circle cx="88" cy="86" r="6" fill="#1a1612" />
          <circle cx="150" cy="86" r="6" fill="#1a1612" />
          {Array.from({ length: busy }, (_, i) => (
            <rect key={i} x={188 + i * 14} y="66" width="10" height="8" fill="#d9665b" />
          ))}
        </g>
      )
    case 'ghost':
      return (
        <g>
          <rect x="78" y="40" width="90" height="44" fill="#2a3348" stroke="#7fa3c9" strokeOpacity="0.8" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={88 + i * 24} y="50" width="14" height="8" fill="#ffd98c" opacity={0.3 + (i === busy % 3 ? 0.5 : 0)} />
          ))}
          <g transform="translate(180 70)">
            <g className="va-scooter">
            <circle cx="4" cy="12" r="4" fill="#efe9dc" />
            <circle cx="22" cy="12" r="4" fill="#efe9dc" />
            <path d="M6 10 H18 L22 4" stroke="#c9a15a" fill="none" />
            </g>
          </g>
        </g>
      )
    case 'snacks':
      return (
        <g>
          {Array.from({ length: 4 }, (_, i) => (
            <g key={i} transform={`translate(${80 + i * 32} 52) rotate(${(i - 1.5) * 6} 12 16)`}>
              <rect width="22" height="30" rx="4" fill={['#d9665b', '#f2c14e', '#7cc47f', '#b58ad1'][i]} />
              <rect x="4" y="12" width="14" height="6" fill="#1e2a2b" />
            </g>
          ))}
        </g>
      )
    case 'commodity':
      return (
        <g>
          <rect x="78" y="56" width="110" height="28" fill="#3a4043" />
          <rect x="86" y="40" width="70" height="20" fill="#142a45" />
          <path d="M90 54 L100 46 L112 52 L128 42 L146 50" fill="none" stroke="#7cc47f" strokeWidth="1.4" />
          <text x="92" y="74" className="va-jar">
            FLOUR
          </text>
        </g>
      )
    case 'coldlease':
      return (
        <g>
          {Array.from({ length: Math.max(2, Math.min(4, busy + 1)) }, (_, i) => (
            <g key={i} transform={`translate(${80 + i * 36} 44)`}>
              <rect width="26" height="40" rx="8" fill="#d7e6ee" opacity="0.85" />
              <rect x="8" y="6" width="10" height="6" fill="#7fd3e8" className="va-frost" />
            </g>
          ))}
        </g>
      )
    case 'media':
      return (
        <g>
          <rect x="86" y="48" width="64" height="36" fill="#1a1624" stroke="#b58ad1" />
          <circle cx="170" cy="66" r="14" fill="#2a2040" stroke="#f2c14e" />
          <circle cx="170" cy="66" r="6" fill="#f2c14e" className="va-onair" />
          <path d="M150 66 H136" stroke="#efe9dc" strokeOpacity="0.5" />
        </g>
      )
    case 'orbital':
      return (
        <g>
          <ellipse cx="150" cy="70" rx="70" ry="16" fill="#1b2147" />
          {Array.from({ length: Math.max(2, busy) }, (_, i) => (
            <ellipse key={i} cx={100 + i * 28} cy={64 - (i % 2) * 8} rx="16" ry="5" fill="#9aa7c7" className="va-barge" />
          ))}
          <circle cx="230" cy="40" r="10" fill="#efe9dc" opacity="0.8" />
        </g>
      )
    case 'museum':
      return (
        <g>
          <rect x="90" y="36" width="100" height="48" fill="#efe9dc" />
          <polygon points="84,36 140,16 196,36" fill="#5b3a33" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={100 + i * 20} y="48" width="12" height="16" fill={['#c9a15a', '#7fa3c9', '#d9665b', '#7cc47f'][i]} />
          ))}
        </g>
      )
    default:
      return null
  }
}

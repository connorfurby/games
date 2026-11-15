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
  dutyfree: { sky: '#1a2040', ground: '#12182a', sign: 'DUTY-FREE' },
  seedcat: { sky: '#243028', ground: '#1a2218', sign: 'SEEDS' },
  bonded: { sky: '#2a241c', ground: '#1c1814', sign: 'BONDED' },
  courier: { sky: '#243038', ground: '#182028', sign: 'COURIER' },
  almanac: { sky: '#2c2830', ground: '#1c1820', sign: 'ALMANAC' },
  wire: { sky: '#1c2830', ground: '#141c20', sign: 'WIRE' },
  phrasebook: { sky: '#302418', ground: '#221a14', sign: 'PRESS' },
  frequency: { sky: '#141828', ground: '#10141c', sign: 'NIGHT' },
  'embassy-gift': { sky: '#2a2438', ground: '#1c1824', sign: 'GIFTS' },
  'treaty-caterer': { sky: '#2c2c38', ground: '#1e1e26', sign: 'TREATY' },
  'ivo-diner': { sky: '#2e2018', ground: '#1e1610', sign: 'IVO’S' },
  'endless-kiosk': { sky: '#10182c', ground: '#0c1220', sign: 'KIOSK' },
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
    case 'dutyfree':
      return (
        <g>
          {/* Airlock arch, counter, and bags on the shelf */}
          <path d="M74 84 V54 Q74 34 110 34 Q146 34 146 54 V84" fill="#1a2040" stroke="#8fb6e0" strokeWidth="2" />
          <path d="M84 84 V56 Q84 42 110 42 Q136 42 136 56 V84" fill="#0e1330" />
          <rect x="150" y="56" width="62" height="28" rx="3" fill="#2a3358" />
          {Array.from({ length: Math.max(2, Math.min(4, busy)) }, (_, i) => (
            <rect key={i} x={156 + i * 14} y="46" width="10" height="12" rx="2" fill={['#f2c14e', '#d9665b', '#7cc47f', '#b58ad1'][i]} />
          ))}
          <circle cx="110" cy="62" r="5" fill="#efe9dc" className="va-steam" />
          <circle cx="200" cy="30" r="2" fill="#efe9dc" opacity="0.8" />
          <circle cx="176" cy="22" r="1.4" fill="#efe9dc" opacity="0.6" />
        </g>
      )
    case 'seedcat':
      return (
        <g>
          {/* Seed rack: packets pinned to a board */}
          <rect x="82" y="38" width="100" height="46" rx="2" fill="#4a3d2c" />
          {Array.from({ length: 6 }, (_, i) => (
            <g key={i} transform={`translate(${90 + (i % 3) * 30} ${44 + Math.floor(i / 3) * 20})`}>
              <rect width="22" height="16" rx="2" fill={['#c9a15a', '#7cc47f', '#d9665b', '#b58ad1', '#f2c14e', '#8fb6e0'][i]} />
              <path d="M11 12 V5 M11 8 Q7 7 7 4 M11 8 Q15 7 15 4" stroke="#1a1612" strokeOpacity="0.6" fill="none" className={i === busy % 6 ? 'va-steam' : undefined} />
            </g>
          ))}
          <ellipse cx="206" cy="78" rx="14" ry="5" fill="#2a2218" />
          <path d="M206 78 V62 M206 68 Q198 66 198 60 M206 64 Q214 62 214 56" stroke="#7cc47f" strokeWidth="2" fill="none" />
        </g>
      )
    case 'bonded':
      return (
        <g>
          {/* Cage, padlock, and crates inside */}
          <rect x="74" y="40" width="82" height="44" fill="#1a1612" stroke="#8a96a2" strokeWidth="2" />
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M${86 + i * 16} 40 V84`} stroke="#5a6570" />
          ))}
          <rect x="84" y="62" width="22" height="22" fill="#8a6240" />
          <rect x="108" y="68" width="18" height="16" fill="#6c5b47" className="va-steam" />
          <rect x="126" y="62" width="22" height="22" fill="#8a6240" opacity={busy >= 3 ? 1 : 0.35} />
          <rect x="107" y="32" width="14" height="10" rx="5" fill="none" stroke="#c9a15a" strokeWidth="3" />
          <rect x="102" y="40" width="24" height="14" rx="2" fill="#c9a15a" />
          <rect x="170" y="62" width="40" height="22" fill="#4a3d2c" />
          <rect x="176" y="54" width="28" height="10" fill="#8a6240" />
        </g>
      )
    case 'courier':
      return (
        <g>
          {/* Two cargo bikes in a line */}
          {[0, 1].map((k) => (
            <g key={k} transform={`translate(${k * 78 - 10} 0)`} className={k === 0 ? 'va-steam' : undefined}>
              <circle cx="104" cy="76" r="9" fill="none" stroke="#efe9dc" strokeWidth="2" />
              <circle cx="146" cy="76" r="9" fill="none" stroke="#efe9dc" strokeWidth="2" />
              <path d="M104 76 L122 58 H142 L146 76 M122 58 L116 50 H110" stroke="#c9a15a" strokeWidth="2.5" fill="none" />
              <rect x="118" y="40" width="22" height="16" rx="2" fill={k ? '#7cc47f' : '#c9a15a'} />
              <path d="M118 48 H140" stroke="#1a1612" strokeOpacity="0.4" />
            </g>
          ))}
          <path d="M70 86 H230" stroke="#efe9dc" strokeOpacity="0.25" strokeDasharray="6 6" />
        </g>
      )
    case 'almanac':
      return (
        <g>
          {/* A wall calendar with a ringed page and tear-off sheets */}
          <rect x="88" y="34" width="64" height="50" rx="3" fill="#efe9dc" />
          <rect x="88" y="34" width="64" height="12" rx="3" fill="#9b3f3a" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect
              key={i}
              x={94 + (i % 4) * 14}
              y={52 + Math.floor(i / 4) * 10}
              width="9"
              height="6"
              rx="1"
              fill={i === busy + 2 ? '#d9665b' : '#1a1612'}
              opacity={i === busy + 2 ? 0.9 : 0.25}
            />
          ))}
          {[96, 120, 144].map((x) => (
            <circle key={x} cx={x} cy="34" r="2.2" fill="#1a1612" />
          ))}
          <path d="M160 46 Q184 40 196 56 L186 60 Z" fill="#efe9dc" opacity="0.85" className="va-steam" />
        </g>
      )
    case 'wire':
      return (
        <g>
          {/* Two poles, a sagging wire, and a bird on it */}
          <rect x="82" y="38" width="5" height="46" fill="#6c5b47" />
          <rect x="200" y="38" width="5" height="46" fill="#6c5b47" />
          <path d="M60 44 H105 M178 44 H222" stroke="#6c5b47" strokeWidth="3" />
          <path d="M84 46 Q144 78 202 46" stroke="#8fb6e0" strokeWidth="2" fill="none" />
          <path d="M84 52 Q144 82 202 52" stroke="#8fb6e0" strokeWidth="1.5" fill="none" opacity="0.6" />
          <g transform="translate(136 62)" className="va-steam">
            <ellipse cx="0" cy="0" rx="6" ry="4" fill="#efe9dc" />
            <circle cx="6" cy="-3" r="3" fill="#efe9dc" />
            <path d="M9 -3 l4 1 -4 1z" fill="#f2c14e" />
          </g>
          {Array.from({ length: Math.max(1, Math.min(3, busy)) }, (_, i) => (
            <circle key={i} cx={104 + i * 28} cy={70 + (i % 2) * 6} r="3" fill="#c9a15a" />
          ))}
        </g>
      )
    case 'phrasebook':
      return (
        <g>
          {/* A press: stacked books and a lever */}
          {Array.from({ length: Math.max(2, Math.min(5, busy + 1)) }, (_, i) => (
            <rect
              key={i}
              x={92 + (i % 2) * 4}
              y={74 - i * 9}
              width="62"
              height="8"
              rx="1"
              fill={['#5b3a33', '#2f5d9e', '#3f7d58', '#9b3f3a', '#6b4fa8'][i]}
            />
          ))}
          <rect x="162" y="40" width="8" height="44" fill="#6c5b47" />
          <path d="M166 44 H198" stroke="#8a96a2" strokeWidth="4" className="va-steam" />
          <circle cx="198" cy="44" r="5" fill="#c9a15a" />
          <rect x="170" y="70" width="36" height="14" fill="#efe9dc" />
          <path d="M176 76 H200 M176 80 H192" stroke="#1a1612" strokeOpacity="0.4" />
        </g>
      )
    case 'frequency':
      return (
        <g>
          {/* Mast with radiating arcs over a sleeping town */}
          <rect x="138" y="30" width="6" height="54" fill="#efe9dc" />
          <circle cx="141" cy="26" r="5" fill="#ffd98c" className="va-steam" />
          {[10, 20, 30].map((r, i) => (
            <path key={r} d={`M${141 - r} ${26 - r * 0.2} Q141 ${26 - r * 1.2} ${141 + r} ${26 - r * 0.2}`} fill="none" stroke="#8fb6e0" opacity={0.9 - i * 0.25} />
          ))}
          {[84, 104, 186, 206].map((x, i) => (
            <g key={x}>
              <rect x={x} y="68" width="14" height="16" fill="#1a1a26" />
              <rect x={x + 4} y="72" width="5" height="5" fill={i % 2 ? '#ffd98c' : '#3a4048'} />
            </g>
          ))}
        </g>
      )
    case 'embassy-gift':
      return (
        <g>
          {/* Gift boxes under a small flag */}
          <rect x="86" y="62" width="34" height="22" fill="#9b3f3a" />
          <path d="M103 62 V84 M86 72 H120" stroke="#f2c14e" strokeWidth="3" />
          <path d="M103 62 q-8 -10 -14 -4 q4 6 14 4 q10 2 14 -4 q-6 -6 -14 4" fill="none" stroke="#f2c14e" strokeWidth="2" />
          <rect x="128" y="52" width="26" height="32" fill="#2f5d9e" />
          <path d="M141 52 V84 M128 68 H154" stroke="#efe9dc" strokeWidth="2.5" />
          <rect x="162" y="68" width="22" height="16" fill="#3f7d58" />
          <path d="M173 68 V84" stroke="#f2c14e" strokeWidth="2.5" />
          <rect x="196" y="30" width="3" height="54" fill="#efe9dc" />
          <path d="M199 32 H218 L214 38 L218 44 H199 Z" fill="#d9665b" className="va-steam" />
        </g>
      )
    case 'treaty-caterer':
      return (
        <g>
          {/* A long banquet table with plates, a cloche and the treaty */}
          <rect x="72" y="62" width="150" height="8" rx="2" fill="#efe9dc" />
          <rect x="82" y="70" width="5" height="16" fill="#4a3d2c" />
          <rect x="206" y="70" width="5" height="16" fill="#4a3d2c" />
          {Array.from({ length: Math.max(3, Math.min(5, busy + 2)) }, (_, i) => (
            <ellipse key={i} cx={92 + i * 28} cy="60" rx="9" ry="3" fill="#d7e6ee" />
          ))}
          <path d="M138 58 Q150 40 162 58 Z" fill="#c9c9d0" className="va-steam" />
          <circle cx="150" cy="40" r="2" fill="#c9c9d0" />
          <rect x="176" y="48" width="30" height="12" fill="#e8d7a0" transform="rotate(-6 191 54)" />
          <path d="M180 53 H202 M180 57 H196" stroke="#1a1612" strokeOpacity="0.4" />
        </g>
      )
    case 'ivo-diner':
      return (
        <g>
          {/* A counter, three stools, a mug, and a buzzing neon */}
          <rect x="76" y="58" width="140" height="12" rx="3" fill="#8a6240" />
          <rect x="76" y="70" width="140" height="14" fill="#3a2c20" />
          {[96, 140, 184].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="78" rx="9" ry="3" fill="#9b3f3a" />
              <rect x={x - 1.5} y="78" width="3" height="8" fill="#6a5c4a" />
            </g>
          ))}
          <rect x="116" y="46" width="12" height="12" rx="2" fill="#efe9dc" />
          <path d="M128 49 q6 0 6 5 q0 4 -6 4" fill="none" stroke="#efe9dc" strokeWidth="2" />
          <path d="M120 44 q4 -8 0 -14" className="va-steam" />
          <rect x="150" y="30" width="62" height="14" rx="3" fill="#1a0e0e" stroke="#ff7a5c" />
          <text x="181" y="40" textAnchor="middle" className="va-jar" style={{ fill: '#ff9d86' }}>
            OPEN
          </text>
        </g>
      )
    case 'endless-kiosk':
      return (
        <g>
          {/* A striped stall at the edge of the map, with worlds hung over it */}
          <rect x="94" y="56" width="96" height="28" fill="#2a3040" />
          {Array.from({ length: 6 }, (_, i) => (
            <path key={i} d={`M${90 + i * 18} 40 H${108 + i * 18} L${104 + i * 18} 56 H${94 + i * 18} Z`} fill={i % 2 ? '#efe9dc' : '#7fa3c9'} />
          ))}
          <rect x="108" y="62" width="30" height="14" fill="#0e1218" />
          <circle cx="212" cy="36" r="10" fill="#6b4fa8" className="va-steam" />
          <ellipse cx="212" cy="36" rx="16" ry="3.5" fill="none" stroke="#c9a0d4" />
          <circle cx="76" cy="30" r="5" fill="#d9a441" />
          <circle cx="232" cy="64" r="3" fill="#8fb6e0" />
          {Array.from({ length: Math.max(2, Math.min(4, busy)) }, (_, i) => (
            <circle key={i} cx={150 + i * 10} cy="70" r="3" fill={['#f2c14e', '#7cc47f', '#d9665b', '#8fb6e0'][i]} />
          ))}
        </g>
      )
    default:
      return null
  }
}

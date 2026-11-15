import { HORIZON_CAST, type HorizonCastId } from '../../art/cast'

/** Cast bust with collar, hair, and seal — denser than initials-on-circle. */
export function HorizonBust({ id, className = '' }: { id: HorizonCastId; className?: string }) {
  const who = HORIZON_CAST[id]
  const hair =
    id === 'nia' || id === 'edda' || id === 'listener'
      ? 'M12 14 Q24 4 36 14 Q32 22 24 20 Q16 22 12 14 Z'
      : id === 'ivo' || id === 'arun' || id === 'diplomat'
        ? 'M14 12 Q24 6 34 12 Q30 18 24 16 Q18 18 14 12 Z'
        : 'M13 13 Q24 8 35 13 Q31 19 24 17 Q17 19 13 13 Z'
  return (
    <svg
      className={`hz-bust ${className}`.trim()}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`${who.name}, ${who.role}`}
    >
      <defs>
        <linearGradient id={`hz-bust-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={who.color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={who.color} stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="8" fill="#141210" stroke={who.color} strokeWidth="1.2" strokeOpacity="0.55" />
      <ellipse cx="24" cy="44" rx="16" ry="6" fill="#0c0a08" opacity="0.55" />
      <path d="M10 46 Q12 30 24 28 Q36 30 38 46 Z" fill={`url(#hz-bust-${id})`} />
      <path d="M16 34 H32 V38 Q24 42 16 38 Z" fill="#1c1916" opacity="0.55" />
      <circle cx="24" cy="17" r="9" fill="#e6c2a0" />
      <path d={hair} fill={`url(#hz-bust-${id})`} opacity="0.9" />
      <circle cx="20.5" cy="17" r="1.1" fill="#141210" />
      <circle cx="27.5" cy="17" r="1.1" fill="#141210" />
      <path d="M21 21 Q24 23 27 21" fill="none" stroke="#141210" strokeWidth="1" opacity="0.45" />
      <circle cx="38" cy="38" r="8" fill="#1c1916" stroke={who.color} strokeWidth="1.4" />
      <text x="38" y="41.5" textAnchor="middle" fontSize="7" fontWeight="700" fill={who.color}>
        {who.initials}
      </text>
    </svg>
  )
}

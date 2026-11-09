import type { RoleId } from '../../content/staff'
import { ROLES } from '../../content/staff'
import type { StaffMember } from '../../sim/state'

/**
 * The aisle with the people actually on the clock.
 * Clerks at the crates, stockers in the shelf, cashiers on the registers, security at the door.
 */

const SHIRT: Record<RoleId, string> = {
  clerk: '#c9a15a',
  stocker: '#7cc47f',
  cashier: '#7fa3c9',
  security: '#3a4048',
  night: '#6d5a8a',
}

const STATION: Record<RoleId, { x: number; y: number }[]> = {
  clerk: [
    { x: 46, y: 112 },
    { x: 92, y: 112 },
    { x: 138, y: 112 },
    { x: 70, y: 148 },
  ],
  stocker: [
    { x: 228, y: 128 },
    { x: 276, y: 128 },
    { x: 324, y: 128 },
    { x: 252, y: 156 },
  ],
  cashier: [
    { x: 470, y: 120 },
    { x: 530, y: 120 },
    { x: 500, y: 148 },
    { x: 560, y: 148 },
  ],
  security: [
    { x: 640, y: 100 },
    { x: 668, y: 132 },
  ],
  night: [
    { x: 400, y: 70 },
    { x: 430, y: 96 },
  ],
}

export function StaffFloor({
  roster,
  bottleneck,
  motion,
}: {
  roster: StaffMember[]
  bottleneck: string
  motion: boolean
}) {
  const placed: { m: StaffMember; x: number; y: number }[] = []
  const overflow: Record<string, number> = {}
  const used: Record<string, number> = {}
  for (const m of roster) {
    const slots = STATION[m.role]
    const i = used[m.role] ?? 0
    used[m.role] = i + 1
    const slot = slots[i]
    if (!slot) {
      overflow[m.role] = (overflow[m.role] ?? 0) + 1
      continue
    }
    placed.push({ m, x: slot.x, y: slot.y })
  }

  return (
    <figure className={`sf${motion ? ' is-live' : ''}`}>
      <svg viewBox="0 0 720 190" role="img" aria-label="Staff on the store floor">
        <rect width="720" height="190" fill="#1c1916" />
        <rect y="150" width="720" height="40" fill="#2a2420" />
        <g className="sf-crates">
          {[0, 1, 2].map((i) => (
            <rect key={i} x={36 + i * 28} y={86} width="24" height="20" fill="#6c5b47" />
          ))}
          <text x="40" y="78" className="sf-label">
            Unload
          </text>
        </g>
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${210 + i * 48} 36)`}>
              <rect width="36" height="70" fill="#3a322c" />
              {[0, 1, 2].map((row) => (
                <rect key={row} x="4" y={8 + row * 18} width="28" height="8" fill={['#c9a15a', '#7cc47f', '#d9665b'][row]} opacity="0.8" />
              ))}
            </g>
          ))}
          <text x="214" y="28" className="sf-label">
            Shelf
          </text>
        </g>
        <g>
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${450 + i * 70} 96)`}>
              <rect width="48" height="28" rx="2" fill="#efe9dc" />
              <rect x="6" y="6" width="20" height="8" fill="#1e2a2b" />
            </g>
          ))}
          <text x="454" y="88" className="sf-label">
            Registers
          </text>
        </g>
        <g>
          <rect x="620" y="40" width="70" height="110" fill="#141210" />
          <rect x="642" y="70" width="26" height="50" fill="#2c201c" />
          <text x="628" y="36" className="sf-label">
            Door
          </text>
        </g>
        <g transform="translate(390 40)">
          <circle r="8" cx="8" cy="8" className="sf-lamp" />
          <path d="M8 16 V28" stroke="#6d5a8a" />
        </g>
        {placed.map(({ m, x, y }) => (
          <Person key={m.id} x={x} y={y} role={m.role} name={m.name} level={m.level} motion={motion} />
        ))}
        {roster.length === 0 ? (
          <text x="360" y="170" textAnchor="middle" className="sf-empty">
            Nobody on the clock — the {bottleneck} waits
          </text>
        ) : null}
      </svg>
      <figcaption>
        {roster.length === 0
          ? 'Empty payroll.'
          : Object.entries(overflow)
              .filter(([, n]) => n > 0)
              .map(([role, n]) => `+${n} more ${ROLES[role as RoleId]?.name ?? role}`)
              .join(' · ') || 'Everyone on this floor is someone you hired.'}
      </figcaption>
    </figure>
  )
}

function Person({
  x,
  y,
  role,
  name,
  level,
  motion,
}: {
  x: number
  y: number
  role: RoleId
  name: string
  level: number
  motion: boolean
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={`sf-person${motion ? ' is-live' : ''}`}>
      <title>
        {name} · {ROLES[role].name} · Lv {level}
      </title>
      <ellipse cx="0" cy="16" rx="8" ry="3" fill="#000" opacity="0.35" />
      <path d="M-7 4 Q0 14 7 4 V-2 H-7 Z" fill={SHIRT[role]} />
      <circle cy="-8" r="5.5" fill="#e6c2a0" />
      {role === 'security' ? <rect x="-6" y="-14" width="12" height="4" rx="1" fill="#1a1c1e" /> : null}
      {role === 'night' ? <circle cx="8" cy="-10" r="2" fill="#ffd98c" /> : null}
      {role === 'cashier' ? <rect x="-8" y="-1" width="5" height="3" fill="#efe9dc" /> : null}
      <text y="24" textAnchor="middle" className="sf-name">
        {name.split(' ')[0]}
      </text>
      </g>
    </g>
  )
}

/** Small portrait used on the hire card. */
export function RolePortrait({ role }: { role: RoleId }) {
  return (
    <svg className="sf-portrait" viewBox="0 0 48 48" aria-hidden>
      <rect width="48" height="48" rx="6" fill="#1c1916" />
      <path d="M12 40 Q24 28 36 40 V44 H12 Z" fill={SHIRT[role]} />
      <circle cx="24" cy="18" r="8" fill="#e6c2a0" />
      {role === 'security' ? <rect x="16" y="10" width="16" height="4" rx="1" fill="#1a1c1e" /> : null}
      {role === 'clerk' ? <rect x="14" y="30" width="20" height="6" fill="#6c5b47" /> : null}
      {role === 'stocker' ? <rect x="30" y="26" width="8" height="10" fill="#7cc47f" /> : null}
      {role === 'cashier' ? <rect x="10" y="28" width="12" height="8" fill="#efe9dc" /> : null}
      {role === 'night' ? <circle cx="36" cy="12" r="3" fill="#ffd98c" /> : null}
    </svg>
  )
}

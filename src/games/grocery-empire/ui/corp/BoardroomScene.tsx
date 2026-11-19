import { OWNER_BY_ID } from '../../content/corp/owners'
import { CORP } from '../../sim/balance'
import { valuation } from '../../sim/corp/company'
import { useGame } from '../GameContext'
import { clock, money } from '../format'
import { ROOM_GROUND, RoomScene } from '../scenes/room'
import { OWNER_COLOR, initialsOf } from './ownerLook'

const G = ROOM_GROUND

/** Ten chairs, one per 10% of the company, coloured by who holds that slice. */
function seats(you: number, owners: Record<string, number>, float: number) {
  const parts: { id: string; n: number }[] = [{ id: 'you', n: you }]
  for (const [id, n] of Object.entries(owners)) if (n > 0) parts.push({ id, n })
  if (float > 0) parts.push({ id: 'public', n: float })
  const out: string[] = []
  // Largest remainder so ten chairs always add up.
  const raw = parts.map((p) => ({ ...p, q: (p.n / CORP.sharesPerCompany) * 10 }))
  for (const p of raw) for (let i = 0; i < Math.floor(p.q); i++) out.push(p.id)
  const rest = [...raw].sort((a, b) => (b.q % 1) - (a.q % 1))
  for (const p of rest) if (out.length < 10) out.push(p.id)
  return out.slice(0, 10)
}

export function BoardroomScene() {
  const { state: s, numberFormat } = useGame()
  const co = s.corp.co
  const chairs = seats(co.you, co.owners, co.float)
  const hist = co.hist
  const lo = hist.length ? Math.min(...hist) : 0
  const hi = hist.length ? Math.max(...hist) : 1
  const span = hi - lo || hi || 1
  const sx = 640
  const sy = 12
  const sw = 290
  const sh = 96
  const pts = hist.map((v, i) => `${sx + 12 + (i / Math.max(1, hist.length - 1)) * (sw - 24)},${sy + sh - 14 - ((v - lo) / span) * (sh - 52)}`)
  const up = hist.length > 1 && hist[hist.length - 1]! >= hist[0]!
  const q = co.quarter
  const qAvg = q.samples ? q.sum / q.samples : 0
  const qPct = q.target > 0 ? Math.min(1, qAvg / q.target) : 0

  return (
    <RoomScene
      label={`Boardroom: you own ${Math.round((co.you / CORP.sharesPerCompany) * 100)}%, company worth ${money(valuation(s), numberFormat)}`}
      chips={[
        { label: 'You own', value: `${Math.round((co.you / CORP.sharesPerCompany) * 100)}%` },
        { label: 'Company worth', value: money(valuation(s), numberFormat) },
        { label: co.listed ? 'Share price' : 'Status', value: co.listed ? money(co.price, numberFormat) : 'Private' },
      ]}
      skyTop="#1b2233"
      skyBottom="#2c2a38"
      phoneChipsOnly
      className="bd-room"
    >
      {/* Window with the city */}
      <rect x="30" y="70" width="200" height="100" rx="4" fill="#0e1424" stroke="#3a3348" strokeWidth="6" />
      {[44, 76, 112, 146, 180, 204].map((x, i) => (
        <rect key={x} x={x} y={170 - 30 - (i % 3) * 22} width="22" height={30 + (i % 3) * 22} fill="#1d2640" />
      ))}
      <line x1="130" y1="70" x2="130" y2="170" stroke="#3a3348" strokeWidth="4" />
      {/* Price screen */}
      <rect x={sx} y={sy} width={sw} height={sh} rx="6" fill="#05070c" stroke="#2a3550" />
      <text x={sx + 12} y={sy + 22} fontSize="13" fontWeight="800" fill="#efe6cf">
        {co.listed ? 'Your share price' : 'Your company (private)'}
      </text>
      {pts.length > 1 ? (
        <polyline points={pts.join(' ')} fill="none" stroke={up ? '#5fd38a' : '#ff7a5c'} strokeWidth="2.2" />
      ) : null}
      {co.listed ? (
        <g>
          <rect x={sx + 12} y={sy + sh - 10} width={sw - 24} height="5" rx="2.5" fill="#1d2640" />
          <rect x={sx + 12} y={sy + sh - 10} width={(sw - 24) * qPct} height="5" rx="2.5" fill={qPct >= 1 ? '#5fd38a' : '#f2c14e'} />
          <text x={sx + sw - 12} y={sy + 22} fontSize="11" textAnchor="end" fill="#b9b2a2">
            Q{q.n} · {clock(Math.max(0, q.endsAt - s.time))}
          </text>
        </g>
      ) : null}
      {/* Table and chairs */}
      <ellipse cx="480" cy={G - 40} rx="300" ry="34" fill="#4a2f26" />
      <ellipse cx="480" cy={G - 46} rx="300" ry="30" fill="#6b4434" />
      {chairs.map((id, i) => {
        const top = i < 5
        const k = top ? i : i - 5
        const x = 260 + k * 110
        const y = top ? G - 92 : G - 4
        const col = OWNER_COLOR[id] ?? '#8a8f99'
        const label = id === 'you' ? 'YOU' : id === 'public' ? 'PUB' : initialsOf(OWNER_BY_ID[id]?.name ?? id)
        return (
          <g key={i} className="bd-chair">
            <rect x={x - 22} y={y - 26} width="44" height="40" rx="8" fill={col} opacity="0.9" />
            <circle cx={x} cy={y - 36} r="12" fill={col} />
            <text x={x} y={y - 2} fontSize="11" fontWeight="800" textAnchor="middle" fill="#14110d">
              {label}
            </text>
          </g>
        )
      })}
      {co.vote ? (
        <g className="bd-gavel">
          <rect x="430" y={G - 64} width="100" height="20" rx="10" fill="#f2c14e" />
          <text x="480" y={G - 50} fontSize="11" fontWeight="800" textAnchor="middle" fill="#1a1206">
            VOTE ON THE TABLE
          </text>
        </g>
      ) : null}
    </RoomScene>
  )
}

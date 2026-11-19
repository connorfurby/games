import { LATE } from '../../../sim/balance'
import { backroomCap, deliveryTime } from '../../../sim/formulas'
import { sumQty } from '../../../sim/helpers'
import { useGame } from '../../GameContext'
import { clock, qty } from '../../format'
import { ROOM_GROUND, RoomScene, Sign } from '../room'

const G = ROOM_GROUND
const DOCK_X = 640

/**
 * Dock room: a street with your trucks driving in on their real arrival time, the warehouse
 * with its bay doors (a door rolls up as a truck pulls in), the backroom stacked inside the
 * open door, and the wholesale price board on its pole.
 */
export function DockScene() {
  const { state: s } = useGame()
  const orders = s.orders ?? []
  const index = s.wholesale?.index ?? 1
  const mood = index < 0.88 ? 'CHEAP' : index > 1.08 ? 'DEAR' : 'FAIR'
  const moodWord = mood === 'CHEAP' ? 'Low' : mood === 'DEAR' ? 'High' : 'Normal'
  const moodColor = mood === 'CHEAP' ? '#5aa85a' : mood === 'DEAR' ? '#e8583c' : '#f2c14e'
  const back = Math.floor(sumQty(s.backroom))
  const cap = Math.max(1, backroomCap(s))
  const fill = Math.max(0, Math.min(1, back / cap))
  const shown = [...orders].sort((a, b) => a.eta - b.eta).slice(0, 4)
  const arriving = shown.some((o) => o.eta <= 4)
  // Crates stacked behind the open door: up to 5 columns × 4 rows, by backroom fill.
  const crates = Math.round(fill * 20)

  return (
    <RoomScene
      label={`Dock, ${orders.length} trucks inbound, ${back} of ${cap} backroom units, crate prices ${moodWord.toLowerCase()}`}
      chips={[
        { label: 'Crate price', value: moodWord },
        { label: 'Trucks', value: String(orders.length) },
        { label: 'Backroom', value: `${qty(back)} / ${qty(cap)}` },
        {
          label: 'Next truck',
          value: orders.length ? clock(Math.min(...orders.map((o) => o.eta))) : 'none ordered',
        },
      ]}
      skyTop="#121a2a"
      skyBottom="#2c2a38"
      phoneChipsOnly
      className="dk"
    >
      {/* Far skyline */}
      <g opacity="0.35" aria-hidden>
        {[20, 120, 210, 330, 440, 520].map((x, i) => (
          <rect key={x} x={x} y={G - 80 - (i % 3) * 20} width={60 + (i % 2) * 24} height={80 + (i % 3) * 20} fill="#1e2433" />
        ))}
      </g>

      {/* Road */}
      <rect x="0" y={G} width="960" height="52" fill="#24252b" />
      <rect x="0" y={G} width="960" height="6" fill="#3b3a40" />
      {Array.from({ length: 15 }, (_, i) => (
        <rect key={i} x={10 + i * 64} y={G + 26} width="30" height="3" fill="#6c6a62" opacity="0.55" className="dk-lane" />
      ))}

      {/* Price board on its pole */}
      <g aria-label={`Crate prices ${moodWord}`}>
        <rect x="92" y={G - 120} width="5" height="120" fill="#4a4f5c" />
        <rect x="40" y={G - 168} width="110" height="54" rx="4" fill="#12161f" stroke={moodColor} strokeWidth="2" />
        <text x="95" y={G - 150} textAnchor="middle" fontSize="10" fontWeight="700" fill="#b9b2a2" letterSpacing="1">
          CRATE PRICES
        </text>
        <text x="95" y={G - 126} textAnchor="middle" fontSize="18" fontWeight="800" fill={moodColor} className="dk-price">
          {mood === 'CHEAP' ? '▼ LOW' : mood === 'DEAR' ? '▲ HIGH' : '● NORMAL'}
        </text>
      </g>

      {/* Warehouse */}
      <g aria-label="Warehouse">
        <rect x={DOCK_X} y={G - 150} width="300" height="150" fill="#5b3a2e" />
        <path d={`M${DOCK_X - 10} ${G - 150} L${DOCK_X + 150} ${G - 176} L${DOCK_X + 310} ${G - 150} Z`} fill="#4a2f26" />
        <rect x={DOCK_X + 90} y={G - 172} width="120" height="18" rx="3" fill="#2a1d18" />
        <text x={DOCK_X + 150} y={G - 159} textAnchor="middle" fontSize="10" fontWeight="800" fill="#f2c14e" letterSpacing="1">
          RECEIVING
        </text>
        {/* Loading platform */}
        <rect x={DOCK_X - 6} y={G - 24} width="312" height="24" fill="#6c6a62" />
        {/* Bay 1: open, crates inside */}
        <rect x={DOCK_X + 24} y={G - 116} width="120" height="92" fill="#16120f" />
        {Array.from({ length: crates }, (_, i) => (
          <rect
            key={i}
            x={DOCK_X + 30 + (i % 5) * 22}
            y={G - 46 - Math.floor(i / 5) * 18}
            width="20"
            height="16"
            rx="2"
            fill={i % 3 === 0 ? '#8a6a4a' : '#6c5b47'}
            stroke="#3a2c22"
          />
        ))}
        <rect
          x={DOCK_X + 22}
          y={G - 118}
          width="124"
          height={arriving ? 14 : 30}
          fill="#8b8f99"
          className="dk-door"
        />
        {/* Bay 2: closed roll-up door */}
        <rect x={DOCK_X + 160} y={G - 116} width="120" height="92" fill="#8b8f99" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={DOCK_X + 160} y={G - 112 + i * 11} width="120" height="1.5" fill="#6a6e78" />
        ))}
        {/* Backroom gauge on the wall */}
        <rect x={DOCK_X + 24} y={G - 140} width="256" height="10" rx="5" fill="#2a1d18" />
        <rect
          x={DOCK_X + 24}
          y={G - 140}
          width={Math.max(6, 256 * fill)}
          height="10"
          rx="5"
          fill={fill > 0.9 ? '#e8583c' : '#5aa85a'}
        />
        <Sign x={DOCK_X + 152} y={G + 22} text={`Backroom ${qty(back)} / ${qty(cap)}`} small anchor="middle" />
      </g>

      {/* Trucks on the road, placed by their real arrival time */}
      {shown.map((o, i) => {
        const base = deliveryTime(s, o.supplier)
        const total = Math.max(o.eta, base, 1)
        const t = Math.max(0, Math.min(1, 1 - o.eta / total))
        const coop = (o as { coop?: boolean }).coop || o.eta > base * (LATE.coopEtaMul * 0.85)
        const keel = o.supplier === 'b'
        const tint = coop ? '#6ea8c9' : keel ? '#c45a3c' : '#c9a15a'
        const x = 170 + (DOCK_X - 110 - 170) * t - i * 18
        const y = G - 6 - (i % 2) * 12
        return (
          <g key={o.id} transform={`translate(${x} ${y})`} className="dk-truck">
            <rect x="0" y="-34" width="62" height="30" rx="3" fill={tint} />
            <rect x="62" y="-26" width="24" height="22" rx="3" fill="#d9d4c7" />
            <rect x="70" y="-22" width="12" height="9" fill="#8fc4e0" />
            <circle cx="14" cy="-2" r="6" fill="#1a1612" />
            <circle cx="72" cy="-2" r="6" fill="#1a1612" />
            <g transform="translate(43 -50)">
              <rect x="-38" y="-11" width="76" height="17" rx="8.5" fill="#12161f" stroke={tint} />
              <text x="0" y="2" textAnchor="middle" fontSize="10" fontWeight="700" fill="#efe9dc">
                {clock(o.eta)} · {qty(Math.floor(o.qty))}
              </text>
            </g>
          </g>
        )
      })}
      {orders.length > shown.length ? (
        <Sign x={180} y={G - 70} text={`+${orders.length - shown.length} more on the way`} small />
      ) : null}
      {orders.length === 0 ? (
        <g>
          {/* Parked forklift */}
          <g transform={`translate(${DOCK_X - 70} ${G - 6})`}>
            <rect x="0" y="-22" width="34" height="18" rx="3" fill="#f2c14e" />
            <rect x="34" y="-40" width="3" height="36" fill="#4a4f5c" />
            <rect x="37" y="-8" width="16" height="3" fill="#4a4f5c" />
            <circle cx="8" cy="-2" r="5" fill="#1a1612" />
            <circle cx="28" cy="-2" r="5" fill="#1a1612" />
          </g>
          <Sign x={330} y={G - 40} text="No trucks on the road" anchor="middle" />
          <Sign x={330} y={G - 20} text="Buy a crate below and one sets off" small anchor="middle" />
        </g>
      ) : null}
    </RoomScene>
  )
}

import { LATE } from '../../../sim/balance'
import { deliveryTime } from '../../../sim/formulas'
import { sumQty } from '../../../sim/helpers'
import { useGame } from '../../GameContext'
import { clock, qty } from '../../format'
import { ROOM_GROUND, RoomScene, Sign } from '../room'
import { Conveyor, CrateStack, TickerTape, Truck } from './primitives'

/** Dock room: trucks with ETA clocks, wholesale gauge, backroom tally. */
export function DockScene() {
  const { state: s } = useGame()
  const orders = s.orders ?? []
  const index = s.wholesale?.index ?? 1
  const mood = index < 0.88 ? 'CHEAP' : index > 1.08 ? 'DEAR' : 'FAIR'
  const back = Math.floor(sumQty(s.backroom))
  const tally = Math.min(12, Math.ceil(back / 8))
  const shown = orders.slice(0, 4)

  return (
    <RoomScene
      label={`Dock, ${orders.length} trucks inbound, ${back} units in the backroom, wholesale ${index.toFixed(2)}`}
      chips={[
        { label: 'Wholesale', value: index.toFixed(2), rate: mood },
        { label: 'Trucks', value: String(orders.length) },
        { label: 'Backroom', value: qty(back) },
        {
          label: 'Next truck',
          value: orders.length ? clock(Math.min(...orders.map((o) => o.eta))) : '—',
        },
      ]}
      skyTop="#070b12"
      skyBottom="#141c22"
    >
      <TickerTape x={24} y={56} text={`WHOLESALE ${index.toFixed(2)} · ${mood}`} />

      <g aria-label="Delivery bay">
        <Sign x={36} y={108} text="Bay" />
        <Conveyor x={40} y={ROOM_GROUND - 20} w={420} fill={orders.length > 0 ? 0.6 : 0.1} />
        {shown.map((o, i) => {
          const base = deliveryTime(s, o.supplier)
          const total = Math.max(o.eta, base, 1)
          const coop = (o as { coop?: boolean }).coop || o.eta > base * (LATE.coopEtaMul * 0.85)
          const keel = o.supplier === 'b'
          return (
            <g key={o.id}>
              <Truck
                progress={1 - o.eta / total}
                x0={30 + i * 14}
                x1={430 - i * 14}
                y={130 - i * 8}
                tint={coop ? '#6ea8c9' : keel ? '#c45a3c' : '#c9a15a'}
                shuttle={coop}
              />
              <text x={60 + i * 90} y={120 - i * 8} fill="#efe9dc" fontSize="12" fontFamily="var(--ge-font-mono, monospace)">
                {clock(o.eta)} · {Math.floor(o.qty)}u
              </text>
            </g>
          )
        })}
        {orders.length > shown.length ? (
          <Sign x={36} y={128} text={`+${orders.length - shown.length} more inbound`} small />
        ) : null}
        {orders.length === 0 ? (
          <g>
            <Sign x={48} y={150} text="No trucks on the road" />
            <Sign x={48} y={172} text="Buy a crate below and a truck sets off" small />
          </g>
        ) : null}
      </g>

      <g transform="translate(560 70)">
        <rect width="360" height="180" rx="6" fill="#0a0e14" stroke="#f2c14e" strokeOpacity="0.35" />
        <Sign x={16} y={28} text="Dock door tally" />
        <CrateStack x={24} y={150} count={tally} cap={12} />
        <Sign x={160} y={80} text={`${back} units waiting`} />
        <Sign x={160} y={104} text={orders.length ? 'Inbound on the belt' : 'Bay is clear'} small />
      </g>
    </RoomScene>
  )
}

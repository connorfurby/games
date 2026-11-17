import { backroomCap } from '../../../sim/formulas'
import { sumQty } from '../../../sim/helpers'
import { useGame } from '../../GameContext'
import { qty } from '../../format'
import { Hit, Person, ROOM_GROUND, RoomScene, Sign } from '../room'
import { Blink, Conveyor, CrateStack } from './primitives'

/** Backroom room: stock counts on crates, capacity wall meter, bonded cage, inbound belt. */
export function BackroomScene() {
  const { state: s, reducedMotion } = useGame()
  const total = sumQty(s.backroom)
  const cap = Math.max(1, backroomCap(s))
  const fill = Math.min(1, total / cap)
  const crates = total > 0 ? Math.max(1, Math.ceil(fill * 12)) : 0
  const inbound = s.orders?.length ?? 0
  const bondedOn = s.era >= 8
  const bonded = s.bonded?.crates ?? 0
  const bondedCapN = Math.max(1, s.bonded?.cap ?? 8)

  return (
    <RoomScene
      label={`Backroom, ${qty(total)} of ${qty(cap)} units stocked, ${inbound} trucks inbound`}
      phoneChipsOnly
      chips={[
        { label: 'Stock', value: `${qty(total)}/${qty(cap)}` },
        { label: 'Fill', value: `${Math.round(fill * 100)}%` },
        { label: 'Inbound', value: String(inbound) },
        ...(bondedOn ? [{ label: 'Bonded', value: `${bonded}/${bondedCapN}` }] : []),
      ]}
      skyTop="#1b2128"
      skyBottom="#2c3238"
    >
      <Hit x={36} y={60} w={280} h={160} label="Inbound belt" menu="suppliers" coachId="suppliers-autorestock">
        <Sign x={48} y={78} text="Inbound" />
        <Conveyor x={48} y={ROOM_GROUND - 40} w={260} fill={inbound > 0 ? Math.min(1, 0.3 + inbound * 0.2) : 0.15} />
        <Sign x={48} y={ROOM_GROUND + 8} text={inbound > 0 ? `${inbound} truck${inbound === 1 ? '' : 's'} on the way` : 'No trucks on the way'} small />
      </Hit>

      <Hit x={340} y={70} w={280} h={150} label="Backroom stock" coachId="backroom-categories">
        <Sign x={350} y={88} text="Stock piles" />
        <CrateStack x={350} y={ROOM_GROUND - 30} count={crates} cap={12} />
        <CrateStack x={470} y={ROOM_GROUND - 30} count={Math.max(0, crates - 12)} cap={12} tint="#7b6a52" />
        <rect x="350" y="100" width="160" height="14" rx="4" fill="#0f1317" stroke="#3a444e" />
        <rect x="352" y="102" width={156 * fill} height="10" rx="3" fill="#c9a15a" />
        <Sign x={350} y={130} text={`${qty(total)} units · ${Math.round(fill * 100)}% of cap`} small />
        <Person x={520} y={ROOM_GROUND - 10} tint="#d9a441" delay={0.2} working={total > 0} scale={1.05} />
      </Hit>

      {/* While trucks come in, a stocker carries crates from the belt to the piles. */}
      {inbound > 0 && !reducedMotion ? (
        <g className="rm-carry" aria-hidden>
          <Person x={150} y={ROOM_GROUND - 10} tint="#b8956a" working={false} />
          <rect x={141} y={ROOM_GROUND - 33} width="18" height="13" rx="2" fill="#a0784c" stroke="#5a4028" />
        </g>
      ) : null}

      {bondedOn ? (
        <Hit x={700} y={70} w={220} h={150} label="Bonded cage" coachId="backroom-fifo">
          <g transform="translate(710 90)">
            <rect width="200" height="120" rx="4" fill="#161a20" stroke="#8a96a2" strokeWidth="2" />
            {Array.from({ length: 7 }, (_, i) => (
              <path key={i} d={`M${12 + i * 26} 0 V120`} stroke="#5a6570" strokeWidth="1.5" />
            ))}
            <CrateStack x={20} y={90} count={Math.min(6, Math.ceil((bonded / bondedCapN) * 6))} cap={6} tint="#8a6fb8" />
            <Blink x={170} y={24} on={bonded > 0} color={bonded > 0 ? '#e0a64a' : '#5a6570'} />
            <Sign x={12} y={-8} text="Bonded cage" />
            <Sign x={12} y={112} text={`${bonded}/${bondedCapN} crates`} small />
          </g>
        </Hit>
      ) : null}

      {total <= 0 && inbound <= 0 ? (
        <g>
          <Sign x={60} y={200} text="Backroom empty — order a truck" />
          <Sign x={60} y={220} text="Crates from Suppliers land here before the shelf" small />
        </g>
      ) : null}
    </RoomScene>
  )
}

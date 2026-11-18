import { councilPayingSeats, councilSeatCap, councilSeats } from '../../../sim/systems/lateHubs'
import { useGame } from '../../GameContext'
import { Badge, Gauge, Hit, Person, RoomScene, Sign } from '../room'
import { Blink } from './primitives'
import { qty } from '../../format'
import type { BillId } from '../../../sim/state'

const BILLS: { id: BillId; name: string }[] = [
  { id: 'hours', name: 'Hours' },
  { id: 'waste', name: 'Waste' },
  { id: 'labor', name: 'Labour' },
  { id: 'tax', name: 'Tax' },
]

const SLOTS = 14

/** Politics room: labeled seats, scrutiny %, keeps "Council chamber" in label. */
export function CouncilScene() {
  const { state: s } = useGame()
  const seats = councilSeats(s)
  const paying = councilPayingSeats(s)
  const cap = councilSeatCap(s)
  const scrutiny = s.late?.scrutiny ?? 0
  const lamp = scrutiny > 0.6 ? '#d9665b' : scrutiny > 0.3 ? '#e0a64a' : '#7cc47f'
  const lobby = Math.min(3, s.politics?.lobby ?? 0)
  const council = s.era >= 7
  const scrutinyPct = Math.round(scrutiny * 100)

  if (!council) {
    const capital = s.politics?.capital ?? 0
    const lobbyists = s.politics?.lobby ?? 0
    const passed = BILLS.filter((b) => s.politics?.bills?.[b.id]).length
    const yMax = Math.max(1, s.cold?.yieldMax ?? 1)
    const yFrac = Math.max(0, Math.min(1, (s.cold?.yieldLeft ?? 0) / yMax))
    const yPct = Math.round(yFrac * 100)
    return (
      <RoomScene
        label={`County hall, ${qty(capital)} capital, ${lobbyists} lobbyists, ${passed} of 4 bills passed, region supply ${yPct} percent`}
        chips={[
          { label: 'Capital', value: qty(capital) },
          { label: 'Lobbyists', value: String(lobbyists) },
          { label: 'Bills', value: `${passed}/4` },
          { label: 'Region supply', value: `${yPct}%`, neg: yFrac < 0.15 },
        ]}
        skyTop="#1a1d28"
        skyBottom="#2b2f3c"
        phoneChipsOnly
      >
        {BILLS.map((b, i) => {
          const on = !!s.politics?.bills?.[b.id]
          const x = 60 + i * 150
          return (
            <Hit key={b.id} x={x} y={76} w={130} h={110} label={`${b.name} bill, ${on ? 'passed' : 'not passed'}`} menu="politics">
              <rect x={x} y={80} width={120} height={100} rx="6" fill={on ? '#2f3a2c' : '#20252e'} stroke={on ? '#7cc47f' : '#3a444e'} />
              <Sign x={x + 60} y={112} text={b.name} anchor="middle" />
              <Sign x={x + 60} y={150} text={on ? 'Passed' : 'Not yet'} small anchor="middle" />
            </Hit>
          )
        })}
        {Array.from({ length: Math.min(6, lobbyists) }, (_, i) => (
          <Person key={i} x={90 + i * 48} y={232} tint="#9fb9d4" delay={0.3 * i} scale={0.9} />
        ))}
        <Hit x={780} y={70} w={140} h={160} label={`Region supply ${yPct}%`} menu="cold">
          <Sign x={850} y={88} text="Region supply" anchor="middle" />
          <Gauge x={836} y={100} h={100} w={28} fill={yFrac} color={yFrac < 0.15 ? '#d9665b' : '#7cc47f'} value={`${yPct}%`} />
        </Hit>
      </RoomScene>
    )
  }

  return (
    <RoomScene
      label={`Council chamber, ${seats} seats held, ${paying} paying, scrutiny ${scrutinyPct} percent`}
      chips={[
        { label: 'Seats', value: `${seats}` },
        { label: 'Paying', value: council ? `${paying}/${cap}` : String(paying) },
        { label: 'Scrutiny', value: `${scrutinyPct}%`, neg: scrutiny > 0.6 },
        { label: 'Lobby', value: String(lobby) },
      ]}
      skyTop="#1a1d28"
      skyBottom="#2b2f3c"
      phoneChipsOnly
    >
      {Array.from({ length: SLOTS }, (_, i) => {
        const a = Math.PI * (0.08 + (0.84 * i) / (SLOTS - 1))
        const x = 480 - Math.cos(a) * 260
        const y = 180 - Math.sin(a) * 100
        const held = i < Math.min(SLOTS, seats)
        const pays = i < Math.min(SLOTS, paying)
        const fill = !held ? '#20252e' : pays ? '#c9a15a' : '#6b6354'
        return (
          <Hit
            key={i}
            x={x - 18}
            y={y - 28}
            w={36}
            h={44}
            label={`Seat ${i + 1}${held ? (pays ? ', paying' : ', held') : ', empty'}`}
            menu="politics"
            coachId="politics-petitions"
          >
            <g transform={`translate(${x} ${y})`}>
              <rect x="-14" y="-10" width="28" height="18" rx="4" fill={fill} stroke="#3a444e" />
              {held ? <circle cy="-18" r="5" fill="#e6c2a0" opacity={pays ? 1 : 0.7} /> : null}
              <Sign x={0} y={24} text={`${i + 1}`} small anchor="middle" />
            </g>
          </Hit>
        )
      })}

      <Hit x={420} y={150} w={120} h={50} label="Council dais" menu="politics" coachId="politics-petitions">
        <rect x="420" y="160" width="120" height="20" rx="3" fill="#3a342d" />
        <Blink x={480} y={152} on color={lamp} />
        <Badge x={440} y={188} text={council ? `${paying}/${cap} paying` : `${seats} held`} w={80} />
      </Hit>

      <Hit x={780} y={70} w={140} h={160} label={`Scrutiny ${scrutinyPct}%`} menu="politics">
        <Sign x={850} y={88} text="Scrutiny" anchor="middle" />
        <Gauge
          x={836}
          y={100}
          h={100}
          w={28}
          fill={Math.min(1, scrutiny)}
          color={lamp}
          value={`${scrutinyPct}%`}
        />
      </Hit>

      {Array.from({ length: lobby }, (_, i) => (
        <Person key={i} x={90 + i * 48} y={230} tint="#9fb9d4" delay={0.3 * i} scale={0.9} />
      ))}
    </RoomScene>
  )
}

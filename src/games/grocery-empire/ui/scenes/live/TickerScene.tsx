import { INSTRUMENTS } from '../../../content/instruments'
import { instrumentLots, instrumentYieldPerSec } from '../../../sim/systems/lateHubs'
import { useGame } from '../../GameContext'
import { money, rate } from '../../format'
import { Badge, Hit, Person, RoomScene, Sign } from '../room'
import { Blink, CrateStack, TickerTape } from './primitives'

/** Invest room: lot pads with instrument name + yield/s; keeps "Trading floor" in label. */
export function TickerScene() {
  const { state: s } = useGame()
  const open = INSTRUMENTS.filter((i) => s.era >= i.era)
  const held = open.reduce((n, i) => n + instrumentLots(s, i.id), 0)
  const yieldTotal = open.reduce((n, i) => n + instrumentYieldPerSec(s, i.id), 0)
  const book = s.invest?.balance ?? 0
  const tape =
    open.length === 0
      ? 'SAVINGS AND INVESTMENTS'
      : open
          .map((i) => `${i.name} ×${instrumentLots(s, i.id)} ${rate(instrumentYieldPerSec(s, i.id))}`)
          .join(' · ')

  return (
    <RoomScene
      label={`Trading floor, ${held} instrument lots held`}
      phoneChipsOnly
      chips={[
        { label: 'Savings', value: money(s.passbook?.balance ?? 0) },
        { label: 'Invested', value: money(book) },
        ...(open.length > 0
          ? [
              { label: 'Holdings', value: String(held) },
              { label: 'Returns', value: rate(yieldTotal) },
            ]
          : []),
      ]}
      skyTop="#141b22"
      skyBottom="#252d36"
    >
      <TickerTape x={40} y={52} text={tape} />
      <rect x="40" y="72" width="880" height="3" fill="#2f3944" />

      {open.map((inst, i) => {
        const lots = instrumentLots(s, inst.id)
        const yld = instrumentYieldPerSec(s, inst.id)
        const x = 48 + i * 220
        return (
          <Hit
            key={inst.id}
            x={x}
            y={86}
            w={200}
            h={140}
            label={`${inst.name} ${rate(yld)}`}
            menu="invest"
            coachId="invest-instruments"
          >
            <rect x={x} y={90} width="190" height="120" rx="6" fill="#10151a" stroke="#3a444e" />
            <Sign x={x + 95} y={112} text={inst.name} anchor="middle" />
            <Badge x={x + 16} y={122} text={`${lots} lots`} w={60} />
            <Badge x={x + 90} y={122} text={rate(yld)} w={80} />
            <CrateStack x={x + 24} y={190} count={lots * 2} cap={8} tint="#8fb6e0" />
            <Blink x={x + 170} y={108} on={lots > 0} color={lots > 0 ? '#7cc47f' : '#5a6570'} />
            <Sign x={x + 95} y={198} text="yield / s" small anchor="middle" />
          </Hit>
        )
      })}

      {open.length === 0 ? (
        <g>
          <Sign x={280} y={150} text="Trading floor quiet" />
          <Sign
            x={280}
            y={172}
            text={book > 0 ? 'Instruments open in Era 7.' : 'Park cash in the book first.'}
            small
          />
        </g>
      ) : null}

      <Person x={900} y={230} tint="#e0a64a" delay={0.2} working={held > 0} />
    </RoomScene>
  )
}

import { VENTURES, ventureIncome, venturePolicyIncomeMul } from '../../content/ventures'
import { useGame } from '../GameContext'
import { money, rate } from '../format'
import { Badge, Gauge, Hit, ROOM_GROUND, RoomScene, Sign } from '../scenes/room'

/** One illustrated row of open ventures — jar fill + $/s — above the card grid. */
export function VenturesStreet() {
  const { state: s, numberFormat } = useGame()
  const rows = VENTURES.map((def) => {
    let available = false
    try {
      available = def.available(s)
    } catch {
      available = false
    }
    const vs = s.ventures[def.id]
    const level = vs?.level ?? 0
    return { def, available, vs, level, open: level > 0 }
  }).filter((r) => r.open || r.available)

  const open = rows.filter((r) => r.open).slice(0, 8)
  const totalIncome = open.reduce(
    (n, { def, vs, level }) => n + ventureIncome(def, level) * venturePolicyIncomeMul(s, def, vs?.policy),
    0,
  )
  const stored = open.reduce((n, { vs }) => n + (vs?.stored ?? 0), 0)
  const slotW = open.length > 0 ? Math.min(110, Math.floor(880 / open.length)) : 110

  return (
    <RoomScene
      label={`Ventures street, ${open.length} tills open, ${rate(totalIncome)}`}
      phoneChipsOnly
      chips={[
        { label: 'Open', value: String(open.length) },
        { label: 'Income', value: rate(totalIncome) },
        { label: 'Stored', value: money(stored, numberFormat) },
        { label: 'Ready', value: String(open.filter((r) => (r.vs?.stored ?? 0) > 0).length) },
      ]}
      skyTop="#2a221c"
      skyBottom="#3a3228"
    >
      {open.map(({ def, vs, level }, i) => {
        const income = ventureIncome(def, level) * venturePolicyIncomeMul(s, def, vs?.policy)
        const storeCap = ventureIncome(def, Math.max(1, level)) * def.storeSec
        const fill = storeCap > 0 ? Math.min(1, (vs?.stored ?? 0) / storeCap) : 0
        const x = 24 + i * slotW
        return (
          <Hit
            key={def.id}
            x={x}
            y={60}
            w={slotW - 8}
            h={180}
            label={`${def.name} ${rate(income)}`}
            menu="ventures"
            coachId={`venture-collect-${def.id}`}
          >
            <rect x={x} y={70} width={slotW - 16} height={150} rx="6" fill="#161210" stroke="#4a3d32" />
            <Sign x={x + (slotW - 16) / 2} y={88} text={def.name.slice(0, 10)} small anchor="middle" />
            <Gauge
              x={x + (slotW - 16) / 2 - 14}
              y={100}
              h={70}
              w={28}
              fill={fill}
              color="#c9a15a"
              label="jar"
              value={`${Math.round(fill * 100)}%`}
            />
            <Badge x={x + 8} y={ROOM_GROUND - 20} text={rate(income)} w={Math.max(56, slotW - 32)} />
            <Sign x={x + (slotW - 16) / 2} y={ROOM_GROUND + 8} text={`L${level}`} small anchor="middle" />
          </Hit>
        )
      })}

      {open.length === 0
        ? (() => {
            // No tills yet: the street is a row of empty lots, one per venture you could open.
            const lots = rows.slice(0, 6)
            const w = Math.min(140, Math.floor(880 / Math.max(1, lots.length)))
            return (
              <>
                <Sign x={480} y={92} text="Empty lots: open one below to start a side till" anchor="middle" small />
                {lots.map(({ def }, i) => {
                  const x = Math.round((960 - lots.length * w) / 2) + 10 + i * w
                  return (
                    <g key={def.id}>
                      <rect x={x} y={108} width={w - 20} height={ROOM_GROUND - 108} rx="4" fill="none" stroke="#7a6a52" strokeDasharray="5 4" />
                      <line x1={x + (w - 20) / 2} y1={136} x2={x + (w - 20) / 2} y2={ROOM_GROUND} stroke="#5d5440" strokeWidth="2" />
                      <rect x={x + (w - 20) / 2 - 26} y={126} width={52} height={22} rx="2" fill="#efe6cf" stroke="#5d5440" />
                      <text x={x + (w - 20) / 2} y={141} textAnchor="middle" fontSize="9" fontWeight="700" fill="#3a3324">
                        FOR LEASE
                      </text>
                      <Sign x={x + (w - 20) / 2} y={ROOM_GROUND + 14} text={def.name.length > 14 ? `${def.name.slice(0, 13)}…` : def.name} small anchor="middle" />
                    </g>
                  )
                })}
              </>
            )
          })()
        : null}
    </RoomScene>
  )
}

import { RIVALS } from '../../../content/rivals'
import { useGame } from '../../GameContext'
import { Badge, Hit, Person, RoomScene, Sign } from '../room'
import { Blink, Truck } from './primitives'

const OURS = '#d9a441'
const SLOT = 88

/** Rival street: store counts on facades; keeps "Rival street" in aria-label and chain names. */
export function RivalStreetScene() {
  const { state: s } = useGame()
  const open = RIVALS.filter((def) => s.rivals?.[def.id])
  const keel = s.era >= 8 ? s.horizon?.keel : null
  const independent = open.filter((def) => !s.rivals[def.id]?.bought)
  const ourStores = s.stores?.length ?? 1
  const leader = independent.reduce<string | null>((best, def) => {
    const st = s.rivals[def.id]!
    const bestStores = best ? (s.rivals[best]?.stores ?? 0) : -1
    return st.stores > bestStores ? def.id : best
  }, null)

  return (
    <RoomScene
      label={`Rival street, ${independent.length} independent ${independent.length === 1 ? 'chain' : 'chains'}${
        keel && !keel.bought && keel.convoys > 0 ? `, ${keel.convoys} Keel convoys` : ''
      }`}
      chips={[
        { label: 'Yours', value: String(ourStores) },
        { label: 'Chains', value: String(independent.length) },
        { label: 'Open', value: String(open.length) },
        ...(keel
          ? [
              {
                label: 'Keel & Sons',
                value: keel.bought ? 'yours' : `${keel.convoys} convoys`,
              },
            ]
          : []),
      ]}
      skyTop="#222030"
      skyBottom="#3a3430"
    >
      <Hit x={16} y={70} w={100} h={160} label="Your stores" menu="land" coachId="land-open-store">
        <g transform="translate(28 70)">
          <rect x="0" y="40" width="76" height="100" fill="#3a342d" stroke="#6a5c4a" />
          <path d="M-4 40 H80 L74 24 H2 Z" fill={OURS} />
          <rect x="26" y="88" width="24" height="52" fill="#1a1612" />
          <rect x="8" y="56" width="14" height="16" fill="#ffd98c" opacity="0.7" />
          <rect x="54" y="56" width="14" height="16" fill="#ffd98c" opacity="0.7" />
          <Sign x={38} y={16} text="YOURS" anchor="middle" />
          <Badge x={10} y={150} text={`${ourStores} stores`} w={56} />
        </g>
      </Hit>

      {open.map((def, i) => {
        const st = s.rivals[def.id]!
        const x = 130 + i * SLOT
        const storeN = st.bought ? st.boughtStores : st.stores
        const frac = Math.max(0.25, Math.min(1, storeN / def.maxStores))
        const h = 54 + frac * 70
        const frozen = !st.bought && s.time < st.frozenUntil
        const tint = st.bought ? OURS : def.color
        const growing = !st.bought && !frozen && st.stores < def.maxStores
        return (
          <Hit
            key={def.id}
            x={x}
            y={168 - h}
            w={80}
            h={h + 40}
            label={`${def.name}, ${storeN} stores`}
            menu="rivals"
            coachId="rival-keel"
          >
            <g transform={`translate(${x} ${168 - h})`}>
              <title>
                {def.name} · {st.bought ? 'bought' : frozen ? 'frozen' : `${st.stores} stores`}
              </title>
              <rect x="0" y="0" width="76" height={h} fill="#2e2924" stroke={st.bought ? OURS : '#4a423a'} />
              <rect x="-3" y="0" width="82" height="14" rx="2" fill={tint} />
              {Array.from({ length: 6 }, (_, k) => {
                const row = Math.floor(k / 3)
                const col = k % 3
                const lit = k < Math.ceil(frac * 6)
                return (
                  <rect
                    key={k}
                    x={8 + col * 22}
                    y={22 + row * 22}
                    width="14"
                    height="12"
                    fill={lit ? def.accent : '#1c1814'}
                    opacity={lit ? 0.75 : 0.9}
                  />
                )
              })}
              <rect x="26" y={h - 30} width="24" height="30" fill="#1a1612" />
              {frozen ? (
                <>
                  <rect x="0" y="0" width="76" height={h} fill="#8fb6e0" opacity="0.28" />
                  <path d={`M26 ${h - 30} H50 M26 ${h - 22} H50 M26 ${h - 14} H50`} stroke="#cfe0ff" strokeWidth="2" />
                </>
              ) : null}
              <Sign x={38} y={h + 14} text={def.name.split(' ')[0]!} small anchor="middle" />
              <Badge x={8} y={h + 20} text={`${storeN}`} w={36} />
              <Sign x={48} y={h + 32} text="stores" small />
              <Blink x={70} y={22} on={growing} color={growing ? '#e0a64a' : '#5a6570'} />
              {st.bought ? <circle cx="38" cy="-8" r="5" fill={OURS} /> : null}
            </g>
          </Hit>
        )
      })}

      {leader
        ? Array.from({ length: 3 }, (_, i) => {
            const idx = open.findIndex((d) => d.id === leader)
            return (
              <Person
                key={i}
                x={160 + idx * SLOT + i * 14}
                y={240}
                tint={['#c9a15a', '#7fa3c9', '#c9a0d4'][i]}
                delay={i * 0.4}
                scale={0.85}
              />
            )
          })
        : null}

      {keel && !keel.bought && keel.convoys > 0 ? (
        <Truck progress={Math.min(1, keel.convoys / 10)} x0={110} x1={760} y={236} tint="#7a8fa8" />
      ) : null}
      {keel?.bought ? <Truck progress={0.5} x0={110} x1={760} y={236} tint={OURS} /> : null}
    </RoomScene>
  )
}

import { COLD } from '../../../sim/balance'
import { useGame } from '../../GameContext'
import { Badge, Gauge, Hit, ROOM_GROUND, RoomScene, Sign } from '../room'
import { Blink, Frost, Steam } from './primitives'

/** Cold room: plants online/offline, tanks with fill %, large surplus, brownout flash, Cryo Ark. */
export function ColdScene() {
  const { state: s } = useGame()
  const c = s.cold
  const plants = Math.min(8, Math.max(0, c.plants))
  const offline = Math.min(plants, Math.max(0, c.offline))
  const online = Math.max(0, plants - offline)
  const tanks = Math.min(6, Math.max(0, c.tanks))
  const immune = (s.late?.cryoImmuneUntil ?? 0) > s.time
  const ark = (s.builds.cold ?? 0) >= 6
  const tankFill = Math.max(0, Math.min(1, c.freshness))
  const surplusLabel = `${c.surplus >= 0 ? '+' : ''}${c.surplus.toFixed(1)}`
  const browned = !!c.browned

  return (
    <RoomScene
      label={`Cold line, ${c.plants} plants, ${online} online, ${c.tanks} tanks, surplus ${surplusLabel}${
        browned ? ', brownout' : ''
      }${immune ? ', Cryo Treaty holds' : ''}${ark ? ', Cryo Ark' : ''}`}
      chips={[
        { label: 'Surplus', value: surplusLabel, neg: c.surplus < 0 },
        { label: 'Plants', value: `${online}/${plants}`, rate: offline > 0 ? `${offline} off` : 'online' },
        { label: 'Tanks', value: String(c.tanks), rate: `${Math.round(tankFill * 100)}%` },
        {
          label: 'Fresh',
          value: `${Math.min(200, Math.round(c.freshness * 100))}%`,
          neg: browned,
        },
      ]}
      className={browned ? 'rm-cold is-brownout' : 'rm-cold'}
      skyTop="#070b12"
      skyBottom="#121c24"
    >
      {browned ? (
        <rect className="rm-brownout-flash" x="0" y="48" width="960" height="252" fill="#d9665b" opacity="0.12" />
      ) : null}

      <Hit x={24} y={56} w={520} h={180} label="Buy a plant" menu="cold" coachId="cold-buy-plant">
        <Sign x={36} y={74} text="Plants" />
        <Badge x={100} y={60} text={`${online} online`} w={72} />
        {offline > 0 ? <Badge x={180} y={60} text={`${offline} offline`} w={78} /> : null}
        {Array.from({ length: Math.max(plants, 1) }, (_, i) => {
          const down = i >= plants - offline || plants === 0
          const x = 40 + i * 62
          return (
            <g key={i} transform={`translate(${x} 100)`}>
              <rect
                width="52"
                height="58"
                rx="4"
                fill={plants === 0 ? '#0a0e14' : down ? '#3a2326' : '#1a3040'}
                stroke={down ? '#e05252' : '#f2c14e'}
                strokeOpacity={down ? 0.7 : 0.45}
                strokeWidth="2"
              />
              <path d="M6 16 H46 M6 30 H46 M6 44 H46" stroke="#5a6570" strokeWidth="2" />
              {plants > 0 && !down ? (
                <>
                  <Steam x={16} y={-4} delay={i * 0.3} />
                  <Steam x={34} y={-8} delay={i * 0.3 + 0.9} />
                </>
              ) : null}
              <Blink x={42} y={8} on={plants > 0} color={down ? '#e05252' : '#7cc47f'} />
              <Sign x={26} y={72} text={plants === 0 ? '—' : down ? 'OFF' : 'ON'} small anchor="middle" />
            </g>
          )
        })}
      </Hit>

      <Hit x={560} y={56} w={220} h={180} label="Buy a tank" menu="cold" coachId="cold-buy-tank">
        <Sign x={572} y={74} text="Tanks" />
        <Badge x={630} y={60} text={`${Math.round(tankFill * 100)}%`} w={48} />
        {Array.from({ length: Math.max(tanks, 1) }, (_, i) => {
          const x = 572 + (i % 3) * 54
          const y = 96 + Math.floor(i / 3) * 64
          const show = i < tanks
          return (
            <g key={i} transform={`translate(${x} ${y})`} opacity={show ? 1 : 0.25}>
              <rect width="44" height="52" rx="14" fill="#33566a" stroke="#9fd4e4" strokeWidth="2" />
              {show ? <Frost x={0} y={0} w={44} h={52} /> : null}
              <rect
                x="6"
                y={46 - tankFill * 34}
                width="32"
                height={Math.max(4, tankFill * 34)}
                rx="6"
                fill="#9fd4e4"
                opacity={0.35 + tankFill * 0.35}
              />
              {/* The badge above already shows the shared fill; only the empty slot needs a mark. */}
              {show ? null : <Sign x={22} y={64} text="—" small anchor="middle" />}
            </g>
          )
        })}
      </Hit>

      {/* Surplus + freshness — right rail, no overlap with tanks */}
      <g transform="translate(800 64)">
        <rect width="144" height="88" rx="8" fill="#0f1317" stroke={c.surplus < 0 ? '#d9665b' : '#3a444e'} strokeWidth="2" />
        <Sign x={72} y={24} text="Surplus" small anchor="middle" />
        <text
          x="72"
          y="58"
          textAnchor="middle"
          fill={c.surplus < 0 ? '#e8a79e' : '#7cc47f'}
          fontSize="24"
          fontWeight="800"
          fontFamily="var(--ge-font-mono, monospace)"
        >
          {surplusLabel}
        </text>
        <Sign x={72} y={78} text={`buffer ${COLD.tankBuffer}/tank`} small anchor="middle" />
      </g>

      <Gauge
        x={830}
        y={ROOM_GROUND - 90}
        h={64}
        w={32}
        fill={tankFill}
        color={browned ? '#d9665b' : '#9fd4e4'}
        label="Fresh"
        value={`${Math.round(tankFill * 100)}%`}
      />

      {ark ? (
        <Hit x={878} y={168} w={66} h={70} label="Cryo Ark" menu="cold" coachId="cold-momentum">
          <rect x="878" y="168" width="66" height="70" rx="6" fill="#1a2830" stroke="#9fd4e4" strokeWidth="2" />
          <Sign x={911} y={198} text="Ark" anchor="middle" />
          <Sign x={911} y={218} text="×0.5" small anchor="middle" />
        </Hit>
      ) : null}

      {immune ? (
        <rect
          x="8"
          y="52"
          width="944"
          height="240"
          rx="8"
          fill="none"
          stroke="#9fd4e4"
          strokeWidth="2"
          strokeDasharray="6 6"
          opacity="0.85"
        />
      ) : null}

      {plants <= 0 && tanks <= 0 ? (
        <g>
          <Sign x={48} y={200} text="Cold line dark — buy a plant, then tanks" />
          <Sign x={48} y={220} text="Buy a cooling plant below to start the buffer" small />
        </g>
      ) : null}
    </RoomScene>
  )
}

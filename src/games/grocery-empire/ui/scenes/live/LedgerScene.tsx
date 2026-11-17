import { LEDGER_SKINS } from '@/cosmetics/packs'
import { useMetaOptional } from '@/shell/MetaContext'
import { HORIZON } from '../../../sim/balance'
import { useGame } from '../../GameContext'
import { money, rate } from '../../format'
import { Chart, Gauge, Hit, Person, RoomScene, Sign } from '../room'

const HORIZON_GAUGES = [
  { id: 'survey' as const, name: 'Survey', cap: HORIZON.surveyCap, color: '#8fb6e0', era: 7, menu: 'planets' },
  { id: 'freight' as const, name: 'Freight', cap: HORIZON.freightCap, color: '#d9a441', era: 8, menu: 'exchange' },
  { id: 'seed' as const, name: 'Seed', cap: HORIZON.seedCap, color: '#7cc47f', era: 9, menu: 'cultivars' },
  { id: 'signal' as const, name: 'Signal', cap: HORIZON.signalCap, color: '#c3aaf0', era: 10, menu: 'signal' },
  { id: 'seal' as const, name: 'Seal', cap: HORIZON.sealCap, color: '#e0a64a', era: 11, menu: 'charter' },
]

/** Books room: log-friendly income chart, horizon gauges with full names, Hits to fix burn/sales. */
export function LedgerScene() {
  const { state: s, numberFormat } = useGame()
  const meta = useMetaOptional()?.meta
  const skin = LEDGER_SKINS.find((k) => k.id === meta?.equippedLedgerSkin) ?? LEDGER_SKINS[0]
  const net = s.rates.cashPerSec
  const rising = net >= 0
  const store = Math.max(0, s.rates.revenuePerSec)
  const side = Math.max(0, (s.rates.venturePerSec ?? 0) + (s.rates.investYieldPerSec ?? 0))
  const burn = Math.max(0, s.rates.costPerSec)
  const pips = HORIZON_GAUGES.filter((p) => s.era >= p.era)

  return (
    <RoomScene
      phoneChipsOnly
      label={`Books ledger, net ${rate(net)}, sales ${rate(store)}, costs ${rate(burn)}, ${pips.length} horizon currencies`}
      chips={[
        { label: 'Net', value: rate(net), neg: !rising },
        { label: 'Sales', value: rate(store) },
        { label: 'Costs', value: rate(burn), neg: burn > store },
        ...(side > 0 ? [{ label: 'Other', value: rate(side) }] : []),
      ]}
      className={`ls-skin ls-skin--${skin.id}`}
      skyTop="#171c22"
      skyBottom="#2a323a"
    >
      <Hit x={40} y={56} w={300} h={160} label="Sales chart — open Floor" menu="floor" coachId="books-history">
        <Sign x={52} y={72} text="Till chart" />
        <Chart
          x={52}
          y={84}
          w={280}
          h={120}
          items={[
            { label: 'Sales', value: store, display: money(store, numberFormat), color: '#7cc47f' },
            { label: 'Other', value: side, display: money(side, numberFormat), color: '#8fb6e0' },
            { label: 'Costs', value: burn, display: money(burn, numberFormat), color: '#d9665b' },
          ]}
        />
      </Hit>

      <Hit x={360} y={84} w={120} h={100} label="Sales — Floor" menu="floor">
        <rect x="360" y="84" width="120" height="100" rx="6" fill="#0f1317" stroke="#7cc47f" />
        <Sign x={420} y={118} text="Sales" anchor="middle" />
        <Sign x={420} y={142} text={rate(store)} small anchor="middle" />
        <Sign x={420} y={164} text="→ Floor" small anchor="middle" />
      </Hit>

      <Hit x={500} y={84} w={120} h={100} label="Burn — Staff" menu="staff">
        <rect x="500" y="84" width="120" height="100" rx="6" fill="#0f1317" stroke="#d9665b" />
        <Sign x={560} y={118} text="Costs" anchor="middle" />
        <Sign x={560} y={142} text={rate(burn)} small anchor="middle" />
        <Sign x={560} y={164} text="→ Staff" small anchor="middle" />
      </Hit>

      <Person x={660} y={200} tint="#9fb9d4" delay={0.3} working={rising} />

      {pips.length > 0 ? (
        <g>
          <Sign x={720} y={72} text="Horizon" />
          {pips.map((p, i) => {
            const have = Math.max(0, (s.horizon?.[p.id] as number) ?? 0)
            const fill = Math.max(0, Math.min(1, have / p.cap))
            return (
              <Hit
                key={p.id}
                x={700 + i * 48}
                y={80}
                w={46}
                h={150}
                label={`${p.name} ${have.toFixed(1)}`}
                menu={p.menu}
              >
                <Gauge
                  x={708 + i * 48}
                  y={88}
                  h={90}
                  w={30}
                  fill={fill}
                  color={p.color}
                  label={p.name}
                  value={have < 10 ? have.toFixed(1) : String(Math.floor(have))}
                />
              </Hit>
            )
          })}
        </g>
      ) : (
        <Sign x={720} y={120} text="More money streams appear later" small />
      )}
    </RoomScene>
  )
}

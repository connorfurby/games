import { HORIZON } from '../../sim/balance'
import {
  charterNetworkMul,
  endlessNetworkMul,
  greenhouseNetworkMul,
  planetNetworkMul,
  relayNetworkMul,
  routeNetworkMul,
  stockedCount,
} from '../../sim/systems/horizon'
import { INSTRUMENTS } from '../../content/instruments'
import { instrumentYieldPerSec, bargeFreightPerSec } from '../../sim/systems/lateHubs'
import { networkBreakdown } from '../../sim/systems/network'
import { statMul } from '../../sim/systems/stats'
import type { GameState } from '../../sim/state'
import { Card, DataTable } from '../kit'
import type { Column } from '../kit'

const LAYERS = [
  { id: 'planets', label: 'Planets', color: '#8fb6e0', era: 7 },
  { id: 'routes', label: 'Routes', color: '#d9a441', era: 8 },
  { id: 'greenhouses', label: 'Greenhouses', color: '#7cc47f', era: 9 },
  { id: 'relays', label: 'Relays', color: '#c3aaf0', era: 10 },
  { id: 'charter', label: 'Charter', color: '#e0a64a', era: 11 },
  { id: 'endless', label: 'Endless', color: '#d98ec0', era: 12 },
] as const

function layerValue(s: GameState, id: (typeof LAYERS)[number]['id']): number {
  switch (id) {
    case 'planets':
      return planetNetworkMul(s)
    case 'routes':
      return routeNetworkMul(s)
    case 'greenhouses':
      return greenhouseNetworkMul(s)
    case 'relays':
      return relayNetworkMul(s)
    case 'charter':
      return charterNetworkMul(s)
    case 'endless':
      return endlessNetworkMul(s)
  }
}

/** Era 7+ income waterfall: each Worlds layer is a multiplier, drawn as its share of the log of the network. */
export function IncomeWaterfall({ s }: { s: GameState }) {
  const rows = LAYERS.filter((l) => s.era >= l.era).map((l) => ({ ...l, mul: layerValue(s, l.id) }))
  const logs = rows.map((r) => Math.log(Math.max(1, r.mul)))
  const sum = logs.reduce((a, b) => a + b, 0)
  const total = networkBreakdown(s).total
  const cols: Column<(typeof rows)[number] | null>[] = [
    {
      key: 'layer',
      header: 'Layer',
      render: (r) =>
        r ? (
          <span className="lh-swatch" style={{ color: r.color }}>
            ■ {r.label}
          </span>
        ) : (
          <strong>Network total</strong>
        ),
    },
    {
      key: 'mul',
      header: 'Multiplier',
      align: 'end',
      render: (r) => (r ? <span style={{ opacity: r.mul > 1.0005 ? 1 : 0.55 }}>×{r.mul.toFixed(2)}</span> : <strong>×{total.toFixed(2)}</strong>),
    },
  ]
  return (
    <Card header={<strong>Income waterfall</strong>}>
      <div className="lh-stack">
        <div
          className="lh-stackbar"
          role="img"
          aria-label={`Worlds layers multiply the network to ×${total.toFixed(2)}`}
        >
          {rows.map((r, i) => (
            <span
              key={r.id}
              title={`${r.label} ×${r.mul.toFixed(2)}`}
              style={{
                flex: sum > 0 ? Math.max(logs[i]!, sum * 0.02) : 1,
                background: r.color,
                opacity: r.mul > 1.0005 ? 0.9 : 0.25,
              }}
            />
          ))}
        </div>
        <DataTable columns={cols} rows={[...rows, null]} rowKey={(r) => r?.id ?? 'total'} caption="Income waterfall" />
        <p className="lh-note">
          Bar width is each layer’s share of the log of the network, so a ×2 layer beside a ×1.1 layer reads fairly.
        </p>
      </div>
    </Card>
  )
}

function fmt(n: number): string {
  if (!(n > 0)) return '—'
  return n >= 1 ? `+${n.toFixed(2)}/s` : `+${n.toFixed(3)}/s`
}

/** Per-second flow of each Horizon currency, from the same HORIZON rates the sim ticks with. */
export function CurrencyFlowTable({ s }: { s: GameState }) {
  const h = s.horizon
  const instr = (cur: string) =>
    INSTRUMENTS.filter((i) => i.currency === cur).reduce((a, i) => a + instrumentYieldPerSec(s, i.id), 0)
  const freightBase =
    stockedCount(s) * HORIZON.freightPerPlanet * statMul(s, 'freight') + bargeFreightPerSec(s)
  const rows = [
    { id: 'survey', era: 7, have: h.survey, cap: HORIZON.surveyCap, rate: (h.continued ? HORIZON.surveyPerSec : 0) + instr('survey') },
    { id: 'freight', era: 8, have: h.freight, cap: HORIZON.freightCap, rate: freightBase + instr('freight') },
    {
      id: 'seed',
      era: 9,
      have: h.seed,
      cap: HORIZON.seedCap,
      rate: (HORIZON.seedPerSec + h.greenhouses * HORIZON.seedPerGreenhouse) * statMul(s, 'seed') + instr('seed'),
    },
    {
      id: 'signal',
      era: 10,
      have: h.signal,
      cap: HORIZON.signalCap,
      rate: h.relays * HORIZON.signalPerRelay * statMul(s, 'signal') + instr('signal'),
    },
    {
      id: 'seal',
      era: 11,
      have: h.seal,
      cap: HORIZON.sealCap,
      rate: h.embassies * HORIZON.embassySealPerSec * statMul(s, 'seal'),
    },
  ].filter((r) => s.era >= r.era)
  const cols: Column<(typeof rows)[number]>[] = [
    { key: 'cur', header: 'Currency', render: (r) => <span style={{ textTransform: 'capitalize' }}>{r.id}</span> },
    {
      key: 'bank',
      header: 'Banked',
      align: 'end',
      render: (r) => (
        <span title={`${r.have.toFixed(1)} of ${r.cap} banked`}>
          {r.have.toFixed(0)} / {r.cap}
        </span>
      ),
    },
    { key: 'rate', header: 'Flow', align: 'end', render: (r) => fmt(r.rate) },
  ]
  return (
    <Card header={<strong>Currency flow</strong>}>
      <div className="lh-stack" data-coach-id="books-currency-flow">
        <DataTable columns={cols} rows={rows} rowKey={(r) => r.id} caption="Currency flow" />
        <p className="lh-note">
          Puzzle currencies gate verbs; cash buys buildings. Instruments on Invest add to these rates.
        </p>
      </div>
    </Card>
  )
}

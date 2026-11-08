import { useMemo, useState } from 'react'
import { RIVALS, type RivalId } from '../../content/rivals'
import type { GameState } from '../../sim/state'
import { networkBreakdown, storeEngineWeight } from '../../sim/systems/network'
import { useGame } from '../GameContext'
import { money } from '../format'

/**
 * Empire Map: everything you own, drawn as rings around the flagship.
 * City (chain stores) → Region (districts, cold plants) → World (lanes, franchises) → Orbit (barges).
 * Rival stores sit in the ring they compete in; bought ones turn gold.
 */

const C = 500
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

interface View {
  id: 'city' | 'region' | 'world' | 'orbit'
  label: string
  r: number
  era: number
}

const VIEWS: View[] = [
  { id: 'city', label: 'City', r: 175, era: 0 },
  { id: 'region', label: 'Region', r: 320, era: 3 },
  { id: 'world', label: 'World', r: 450, era: 4 },
  { id: 'orbit', label: 'Orbit', r: 500, era: 5 },
]

/** Ring bands in map units. */
const RING = {
  city: [55, 150],
  region: [185, 300],
  world: [330, 430],
  orbit: [462, 492],
} as const

const RIVAL_RING: Record<RivalId, keyof typeof RING> = {
  penny: 'city',
  freshway: 'region',
  megamart: 'world',
  halo: 'orbit',
}

type Pin =
  | { kind: 'flagship'; x: number; y: number }
  | { kind: 'store'; x: number; y: number; index: number }
  | { kind: 'district'; x: number; y: number; n: number }
  | { kind: 'plant'; x: number; y: number; n: number; offline: boolean }
  | { kind: 'port'; x: number; y: number; n: number }
  | { kind: 'franchise'; x: number; y: number; n: number }
  | { kind: 'barge'; x: number; y: number; n: number }
  | { kind: 'rival'; x: number; y: number; id: RivalId; n: number; bought: boolean }

/** Deterministic spot in a ring: golden-angle spiral, offset per layer so layers interleave. */
function spot(ring: keyof typeof RING, i: number, count: number, phase: number) {
  const [a, b] = RING[ring]
  const angle = i * GOLDEN + phase
  const t = count <= 1 ? 0.5 : (i % 7) / 6
  const r = a + (b - a) * (0.15 + 0.7 * t)
  return { x: C + Math.cos(angle) * r, y: C + Math.sin(angle) * r }
}

/** Draw at most this many of one thing; the label carries the real count. */
const CAP = 60

function buildPins(s: GameState): Pin[] {
  const pins: Pin[] = [{ kind: 'flagship', x: C, y: C }]
  for (let i = 1; i < s.stores.length && i <= CAP; i++) pins.push({ kind: 'store', ...spot('city', i, s.stores.length, 0.3), index: i })
  const districts = s.politics?.acquisitions ?? 0
  for (let i = 0; i < Math.min(districts, CAP); i++) pins.push({ kind: 'district', ...spot('region', i, districts, 1.1), n: i + 1 })
  const plants = s.cold?.plants ?? 0
  const offline = s.cold?.offline ?? 0
  for (let i = 0; i < Math.min(plants + offline, CAP); i++) {
    pins.push({ kind: 'plant', ...spot('region', i, plants + offline, 2.4), n: i + 1, offline: i >= plants })
  }
  const lanes = s.fleet?.lanes ?? 0
  for (let i = 0; i < Math.min(lanes, CAP); i++) {
    const angle = i * GOLDEN + 0.7
    pins.push({ kind: 'port', x: C + Math.cos(angle) * 410, y: C + Math.sin(angle) * 410, n: i + 1 })
  }
  const fr = s.fleet?.franchises ?? 0
  for (let i = 0; i < Math.min(fr, CAP); i++) pins.push({ kind: 'franchise', ...spot('world', i, fr, 3.3), n: i + 1 })
  const barges = s.fleet?.barges ?? 0
  for (let i = 0; i < Math.min(barges, CAP); i++) {
    const angle = (i / Math.max(1, Math.min(barges, CAP))) * Math.PI * 2
    pins.push({ kind: 'barge', x: C + Math.cos(angle) * 477, y: C + Math.sin(angle) * 477, n: i + 1 })
  }
  for (const def of RIVALS) {
    const st = s.rivals?.[def.id]
    if (!st) continue
    const n = st.bought ? st.boughtStores : st.stores
    for (let i = 0; i < n; i++) {
      pins.push({ kind: 'rival', ...spot(RIVAL_RING[def.id], i + 40, n, 4.2 + RIVALS.indexOf(def)), id: def.id, n: i + 1, bought: st.bought })
    }
  }
  return pins
}

function pinKey(p: Pin): string {
  switch (p.kind) {
    case 'flagship':
      return 'flagship'
    case 'store':
      return `store-${p.index}`
    case 'rival':
      return `rival-${p.id}-${p.n}`
    default:
      return `${p.kind}-${p.n}`
  }
}

function describe(s: GameState, p: Pin, fmt: ReturnType<typeof useGame>['numberFormat']): { title: string; lines: string[] } {
  switch (p.kind) {
    case 'flagship':
      return {
        title: 'The flagship',
        lines: [
          'The store you run by hand. Every other pin copies its sales.',
          `Selling ${money(s.rates?.revenuePerSec ?? 0, fmt)}/s across the empire.`,
        ],
      }
    case 'store': {
      const st = s.stores[p.index]!
      const w = storeEngineWeight(s, st, p.index)
      return {
        title: st.name,
        lines: [
          `Level ${st.level}, ${st.policy} policy.`,
          `Worth ${w.toFixed(2)} flagships.`,
          st.drift > 0.4 ? 'Drifting — walk it in Land.' : 'Running fine.',
        ],
      }
    }
    case 'district':
      return { title: `District ${p.n}`, lines: ['Bought with political capital. Multiplies the whole network.'] }
    case 'plant':
      return {
        title: `Cold plant ${p.n}`,
        lines: [p.offline ? 'Offline after a brownout. It comes back when supply recovers.' : 'Keeping the cold chain cold.'],
      }
    case 'port':
      return { title: `Lane ${p.n}`, lines: [s.fuel > 0 ? 'Fuelled and running.' : 'Out of fuel — running at a crawl.'] }
    case 'franchise':
      return { title: `Franchise ${p.n}`, lines: ['Someone else’s money, your sign.'] }
    case 'barge':
      return { title: `Seed barge ${p.n}`, lines: ['Harvesting biomass in orbit.'] }
    case 'rival': {
      const def = RIVALS.find((r) => r.id === p.id)!
      return {
        title: `${def.name} #${p.n}`,
        lines: [p.bought ? 'Bought. It copies your flagship now.' : `Run by ${def.founder}. Pulling your shoppers away.`],
      }
    }
  }
}

export function EmpireMap() {
  const { state: s, tick, numberFormat, reducedMotion } = useGame()
  const open = VIEWS.filter((v) => s.era >= v.era)
  const [viewId, setViewId] = useState<View['id']>(() => open[open.length - 1]!.id)
  const view = open.find((v) => v.id === viewId) ?? open[open.length - 1]!
  const [selected, setSelected] = useState<string>('flagship')
  // Pins only move when counts change, so key the memo on the counts, not the tick.
  const sig = [
    s.stores.length,
    s.politics?.acquisitions ?? 0,
    s.cold?.plants ?? 0,
    s.cold?.offline ?? 0,
    s.fleet?.lanes ?? 0,
    s.fleet?.franchises ?? 0,
    s.fleet?.barges ?? 0,
    ...RIVALS.map((r) => `${s.rivals?.[r.id]?.stores ?? '-'}${s.rivals?.[r.id]?.bought ? 'b' : ''}`),
  ].join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pins = useMemo(() => buildPins(s), [sig])
  const net = useMemo(() => networkBreakdown(s), [tick, s])
  const scale = 500 / view.r
  const u = 1 / scale // one screen-ish unit in map space
  const sel = pins.find((p) => pinKey(p) === selected) ?? pins[0]!
  const info = describe(s, sel, numberFormat)
  const rings = (Object.keys(RING) as (keyof typeof RING)[]).filter((k) => s.era >= VIEWS.find((v) => v.id === k)!.era)
  const lanes = s.fleet?.lanes ?? 0

  const counts: [string, string][] = [
    ['Stores', String(s.stores.length)],
    ...(s.era >= 3 ? ([['Districts', String(s.politics?.acquisitions ?? 0)], ['Cold plants', String(s.cold?.plants ?? 0)]] as [string, string][]) : []),
    ...(s.era >= 4 ? ([['Lanes', String(lanes)], ['Franchises', String(s.fleet?.franchises ?? 0)]] as [string, string][]) : []),
    ...(s.era >= 5 ? ([['Barges', String(s.fleet?.barges ?? 0)]] as [string, string][]) : []),
    ['Network', `×${net.total >= 100 ? Math.round(net.total) : net.total.toFixed(2)}`],
  ]

  return (
    <div className="mp">
      <section className="ge-panel mp-head">
        <header className="ge-panel__head">
          <h2 className="ge-panel__title">Empire Map</h2>
          <p className="ge-panel__purpose">Everything you own, in rings around the flagship. Tap a pin for details.</p>
        </header>
        <dl className="mp-counts">
          {counts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ge-panel mp-stage">
        <div className="g2-subtabs mp-zoom" role="tablist" aria-label="Zoom">
          {VIEWS.map((v) => {
            const locked = s.era < v.era
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view.id === v.id}
                className={`g2-subtab${view.id === v.id ? ' is-active' : ''}`}
                disabled={locked}
                title={locked ? `Opens in Era ${v.era}` : `Zoom to ${v.label}`}
                onClick={() => setViewId(v.id)}
              >
                {v.label}
              </button>
            )
          })}
        </div>
        <svg className="mp-svg" viewBox="0 0 1000 1000" role="img" aria-label={`Map of your empire, ${view.label} view`}>
          <defs>
            <radialGradient id="mp-sea" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="var(--g2-raised)" />
              <stop offset="1" stopColor="var(--ge-bg, #0d0f14)" />
            </radialGradient>
          </defs>
          <rect width="1000" height="1000" fill="url(#mp-sea)" />
          <g
            className={reducedMotion ? '' : 'mp-zoomable'}
            style={{ transform: `scale(${scale})`, transformOrigin: '500px 500px' }}
          >
            {rings.map((k) => (
              <g key={k}>
                <circle cx={C} cy={C} r={(RING[k][0] + RING[k][1]) / 2} className={`mp-ring mp-ring--${k}`} strokeWidth={RING[k][1] - RING[k][0]} />
                <text x={C} y={C - RING[k][1] + 14 * u} className="mp-ring__label" fontSize={11 * u} textAnchor="middle">
                  {VIEWS.find((v) => v.id === k)!.label.toUpperCase()}
                </text>
              </g>
            ))}
            {s.era >= 5 && (s.fleet?.biomassMax ?? 0) > 0 ? (
              <circle
                cx={C}
                cy={C}
                r={496}
                className="mp-biomass"
                strokeWidth={4 * u}
                pathLength={1}
                strokeDasharray={`${1 - (s.fleet.biomass ?? 0) / s.fleet.biomassMax} 1`}
              >
                <title>Biomass cleared</title>
              </circle>
            ) : null}
            {pins
              .filter((p) => p.kind === 'port')
              .map((p) => (
                <path
                  key={`lane-${pinKey(p)}`}
                  d={`M${C} ${C} Q${(C + p.x) / 2 + (p.y - C) * 0.25} ${(C + p.y) / 2 - (p.x - C) * 0.25} ${p.x} ${p.y}`}
                  className={`mp-lane${s.fuel > 0 ? '' : ' is-dry'}`}
                  strokeWidth={1.4 * u}
                />
              ))}
            <g className={reducedMotion ? '' : 'mp-orbit'} style={{ transformOrigin: '500px 500px' }}>
              {pins
                .filter((p) => p.kind === 'barge')
                .map((p) => (
                  <PinMark key={pinKey(p)} p={p} u={u} active={pinKey(p) === selected} onPick={setSelected} />
                ))}
            </g>
            {pins
              .filter((p) => p.kind !== 'barge')
              .map((p) => (
                <PinMark key={pinKey(p)} p={p} u={u} active={pinKey(p) === selected} onPick={setSelected} />
              ))}
          </g>
        </svg>
        <aside className="mp-detail" aria-live="polite">
          <h3>{info.title}</h3>
          {info.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </aside>
      </section>

      <section className="ge-panel mp-legend" aria-label="Legend">
        <ul>
          <li><i className="mp-key mp-key--flagship" /> Flagship</li>
          <li><i className="mp-key mp-key--store" /> Chain store</li>
          {s.era >= 3 ? <li><i className="mp-key mp-key--district" /> District</li> : null}
          {s.era >= 3 ? <li><i className="mp-key mp-key--plant" /> Cold plant</li> : null}
          {s.era >= 4 ? <li><i className="mp-key mp-key--port" /> Lane port</li> : null}
          {s.era >= 4 ? <li><i className="mp-key mp-key--franchise" /> Franchise</li> : null}
          {s.era >= 5 ? <li><i className="mp-key mp-key--barge" /> Barge</li> : null}
          {Object.keys(s.rivals ?? {}).length ? <li><i className="mp-key mp-key--rival" /> Rival store</li> : null}
          {Object.values(s.rivals ?? {}).some((r) => r.bought) ? <li><i className="mp-key mp-key--bought" /> Bought rival</li> : null}
        </ul>
      </section>
    </div>
  )
}

function PinMark({ p, u, active, onPick }: { p: Pin; u: number; active: boolean; onPick: (k: string) => void }) {
  const k = pinKey(p)
  const pick = () => onPick(k)
  const common = {
    className: `mp-pin mp-pin--${p.kind}${p.kind === 'plant' && p.offline ? ' is-off' : ''}${p.kind === 'rival' && p.bought ? ' is-bought' : ''}${active ? ' is-active' : ''}`,
    onClick: pick,
    tabIndex: 0,
    role: 'button',
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        pick()
      }
    },
  }
  const r = (p.kind === 'flagship' ? 13 : p.kind === 'store' || p.kind === 'district' ? 7 : 5.5) * u
  if (p.kind === 'flagship') {
    return (
      <g {...common} aria-label="Flagship">
        <circle cx={p.x} cy={p.y} r={r * 1.8} className="mp-halo" />
        <path d={`M${p.x - r} ${p.y + r * 0.8}V${p.y - r * 0.2}L${p.x} ${p.y - r}L${p.x + r} ${p.y - r * 0.2}V${p.y + r * 0.8}Z`} />
      </g>
    )
  }
  if (p.kind === 'district') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6
      return `${p.x + Math.cos(a) * r},${p.y + Math.sin(a) * r}`
    }).join(' ')
    return <polygon {...common} points={pts} aria-label={`District ${p.n}`} />
  }
  if (p.kind === 'store' || p.kind === 'rival' || p.kind === 'franchise') {
    return (
      <path
        {...common}
        aria-label={p.kind}
        d={`M${p.x - r} ${p.y + r * 0.8}V${p.y - r * 0.2}L${p.x} ${p.y - r}L${p.x + r} ${p.y - r * 0.2}V${p.y + r * 0.8}Z`}
      />
    )
  }
  if (p.kind === 'plant') {
    return (
      <g {...common} aria-label={`Cold plant ${p.n}`}>
        <rect x={p.x - r} y={p.y - r} width={r * 2} height={r * 2} rx={r * 0.4} />
      </g>
    )
  }
  if (p.kind === 'barge') {
    return <ellipse {...common} cx={p.x} cy={p.y} rx={r * 1.2} ry={r * 0.6} aria-label={`Barge ${p.n}`} />
  }
  return <circle {...common} cx={p.x} cy={p.y} r={r} aria-label={`Lane ${p.n}`} />
}

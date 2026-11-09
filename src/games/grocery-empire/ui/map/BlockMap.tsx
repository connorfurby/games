import type { KeyboardEvent } from 'react'
import type { RivalId } from '../../content/rivals'
import { RIVALS } from '../../content/rivals'
import type { GameState } from '../../sim/state'
import { Storefront } from '../art/Storefront'

/**
 * The empire as a city block, not a ring of dots.
 * Main Street holds your doors. Rivals keep their own awnings.
 * Water, plants and orbit appear when those eras open.
 */

const VIEWBOX: Record<'city' | 'region' | 'world' | 'orbit', string> = {
  city: '210 255 620 235',
  region: '0 120 1000 500',
  world: '0 40 1000 600',
  orbit: '0 0 1000 640',
}

export type MapKind = 'flagship' | 'store' | 'district' | 'plant' | 'port' | 'franchise' | 'barge' | 'rival'

export interface MapPin {
  key: string
  kind: MapKind
  index?: number
  n?: number
  offline?: boolean
  rival?: RivalId
  bought?: boolean
}

const AWNING = {
  local: '#c2563a',
  standard: 'var(--sc-tag)',
  premium: '#2f6d4f',
} as const

const RIVAL_COLOR: Record<RivalId, string> = {
  penny: '#c2563a',
  freshway: '#3f7d58',
  megamart: '#3d6f9a',
  halo: '#8d6bc4',
}

interface Hit {
  key: string
  kind: MapKind
  active: boolean
  label: string
  onSelect: (key: string) => void
}

function hit(h: Hit) {
  return {
    className: `mp-pin mp-pin--${h.kind}${h.active ? ' is-active' : ''}`,
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': h.label,
    onClick: () => h.onSelect(h.key),
    onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        h.onSelect(h.key)
      }
    },
  }
}

/** Bottom-center anchors along our sidewalks. Flagship owns the corner. */
const OUR_LOTS: { x: number; y: number }[] = [
  { x: 250, y: 398 },
  { x: 620, y: 398 },
  { x: 730, y: 398 },
  { x: 860, y: 398 },
  { x: 250, y: 470 },
  { x: 360, y: 470 },
  { x: 620, y: 470 },
  { x: 730, y: 470 },
  { x: 860, y: 470 },
  { x: 250, y: 300 },
  { x: 620, y: 300 },
  { x: 730, y: 300 },
  { x: 860, y: 300 },
  { x: 140, y: 300 },
  { x: 140, y: 398 },
  { x: 140, y: 470 },
]

const RIVAL_ROW: Record<RivalId, { x: number; y: number }[]> = {
  penny: [
    { x: 80, y: 470 },
    { x: 80, y: 398 },
    { x: 80, y: 300 },
    { x: 180, y: 560 },
    { x: 270, y: 560 },
  ],
  freshway: [
    { x: 360, y: 230 },
    { x: 460, y: 230 },
    { x: 560, y: 230 },
    { x: 660, y: 230 },
    { x: 760, y: 230 },
  ],
  megamart: [
    { x: 860, y: 230 },
    { x: 940, y: 300 },
    { x: 940, y: 398 },
    { x: 940, y: 470 },
    { x: 800, y: 560 },
  ],
  halo: [
    { x: 220, y: 78 },
    { x: 340, y: 64 },
    { x: 460, y: 78 },
    { x: 580, y: 64 },
    { x: 700, y: 78 },
  ],
}

export function BlockMap({
  pins,
  state: s,
  selected,
  onSelect,
  view,
  reducedMotion,
}: {
  pins: MapPin[]
  state: GameState
  selected: string
  onSelect: (key: string) => void
  view: keyof typeof VIEWBOX
  reducedMotion: boolean
}) {
  const stores = pins.filter((p) => p.kind === 'store')
  const shownStores = stores.slice(0, OUR_LOTS.length)
  const districts = pins.filter((p) => p.kind === 'district')
  const plants = pins.filter((p) => p.kind === 'plant')
  const ports = pins.filter((p) => p.kind === 'port')
  const franchises = pins.filter((p) => p.kind === 'franchise')
  const barges = pins.filter((p) => p.kind === 'barge')
  const flag = s.stores[0]
  const tier = Math.max(1, s.builds.storefront ?? 1)
  const water = s.era >= 4
  const orbit = s.era >= 5
  const biomass = s.fleet?.biomassMax > 0 ? 1 - (s.fleet.biomass ?? 0) / s.fleet.biomassMax : 0
  const fuelled = s.fuel > 0

  return (
    <svg
      className={`mp-svg bm${reducedMotion ? '' : ' is-live'}`}
      viewBox={VIEWBOX[view]}
      role="img"
      aria-label={`City map of your empire, ${view} view`}
    >
      <defs>
        <linearGradient id="bm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={orbit ? '#12162e' : '#24324f'} />
          <stop offset="1" stopColor={water ? '#1a3350' : '#3a4a62'} />
        </linearGradient>
        <linearGradient id="bm-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#242a2c" />
          <stop offset="1" stopColor="#1a1e20" />
        </linearGradient>
      </defs>

      <rect width="1000" height="640" fill="url(#bm-sky)" />
      {orbit
        ? [80, 160, 240, 420, 510, 690, 810, 900].map((x, i) => (
            <circle key={x} cx={x} cy={18 + (i % 3) * 10} r={i % 2 ? 1.1 : 0.7} className="bm-star" />
          ))
        : null}
      {water ? <rect x="0" y="96" width="1000" height="52" className="bm-water" /> : <rect x="0" y="96" width="1000" height="36" fill="#2a3548" />}
      <rect x="0" y="148" width="1000" height="492" fill="url(#bm-ground)" />

      {view !== 'city' && districts.slice(0, 4).map((p, i) => {
        const lot = [
          { x: 30, y: 168, w: 250, h: 70 },
          { x: 720, y: 168, w: 250, h: 70 },
          { x: 30, y: 500, w: 280, h: 70 },
          { x: 680, y: 500, w: 290, h: 70 },
        ][i]!
        return (
          <g key={p.key} transform={`translate(${lot.x} ${lot.y})`} {...hit({ key: p.key, kind: 'district', active: selected === p.key, label: `District ${p.n}`, onSelect })}>
            <rect width={lot.w} height={lot.h} rx={6} className="bm-district" />
            <text x={12} y={18} className="bm-tiny">
              District {p.n}
            </text>
          </g>
        )
      })}

      <g className="bm-roads">
        <rect x="0" y="400" width="1000" height="26" />
        <rect x="488" y="160" width="22" height="460" />
        <rect x="0" y="292" width="1000" height="14" opacity="0.65" />
        <g className="bm-dashes">
          <path d="M0 413 H1000" />
          <path d="M499 160 V620" />
        </g>
      </g>
      <text x="24" y="418" className="bm-street">
        MAIN ST
      </text>

      {s.expansions['side-yard'] ? (
        <g transform="translate(520 330)">
          <rect width="70" height="58" rx="4" className="bm-park" />
          <circle cx="18" cy="38" r="8" className="bm-tree" />
          <circle cx="40" cy="28" r="10" className="bm-tree" />
          <circle cx="56" cy="42" r="7" className="bm-tree" />
        </g>
      ) : null}
      {s.expansions.parking ? (
        <g transform="translate(330 500)">
          <rect width="90" height="36" rx="3" className="bm-lot" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${12 + i * 20} 6 V30`} className="bm-dashes" />
          ))}
        </g>
      ) : null}
      {s.depot ? (
        <g transform="translate(40 330)" aria-hidden>
          <rect width="78" height="52" className="bm-depot" />
          <rect x="8" y="28" width="22" height="24" className="bm-door" />
          <text x="39" y="16" textAnchor="middle" className="bm-tiny">
            DEPOT
          </text>
        </g>
      ) : null}

      {plants.slice(0, 8).map((p, i) => (
        <g
          key={p.key}
          transform={`translate(${40 + (i % 8) * 52} 575)`}
          {...hit({ key: p.key, kind: 'plant', active: selected === p.key, label: `Cold plant ${p.n}`, onSelect })}
        >
          <rect x="0" y="10" width="36" height="28" className={p.offline ? 'bm-plant is-off' : 'bm-plant'} />
          <rect x="8" y="0" width="6" height="14" className="bm-stack" />
          <rect x="20" y="4" width="6" height="10" className="bm-stack" />
          {p.offline ? null : <circle cx="11" cy="-2" r="4" className="bm-smoke" style={{ animationDelay: `${i * 0.4}s` }} />}
        </g>
      ))}

      {franchises.slice(0, 8).map((p, i) => (
          <g key={p.key} transform={`translate(${700 + (i % 8) * 34} 158)`} {...hit({ key: p.key, kind: 'franchise', active: selected === p.key, label: `Franchise ${p.n}`, onSelect })}>
          <rect x="10" y="8" width="3" height="16" fill="#9bc0e6" />
          <rect width="22" height="10" rx="1" fill="#1e2a2b" stroke="#9bc0e6" />
          <text x="11" y="8" textAnchor="middle" className="bm-tiny">
            F
          </text>
        </g>
      ))}

      {RIVALS.map((def) => {
        const group = pins.filter((p) => p.kind === 'rival' && p.rival === def.id)
        const lots = RIVAL_ROW[def.id]
        return group.slice(0, lots.length).map((p, i) => {
          const lot = lots[i]!
          const color = p.bought ? 'var(--sc-tag)' : RIVAL_COLOR[def.id]
          if (def.id === 'halo') {
            return (
              <g key={p.key} transform={`translate(${lot.x} ${lot.y})`} {...hit({ key: p.key, kind: 'rival', active: selected === p.key, label: `${def.name} ${p.n}`, onSelect })}>
                <ellipse cx="16" cy="8" rx="16" ry="6" fill={color} className="bm-barge" style={{ animationDelay: `${i * 0.3}s` }} />
                <rect x="6" y="2" width="14" height="5" fill="#efe9dc" opacity="0.8" />
              </g>
            )
          }
          return (
            <g key={p.key} transform={`translate(${lot.x - 16} ${lot.y - 34})`} {...hit({ key: p.key, kind: 'rival', active: selected === p.key, label: `${def.name} ${p.n}`, onSelect })}>
              <Storefront w={32} h={34} awning={color} lit={p.bought ? 0.9 : 0.45} gold={p.bought} door={false} />
            </g>
          )
        })
      })}

      {shownStores.map((p, i) => {
        const st = s.stores[p.index ?? 0]
        const lot = OUR_LOTS[i]!
        const h = 34 + Math.min(22, (st?.level ?? 1) * 4)
        return (
          <g key={p.key} transform={`translate(${lot.x - 22} ${lot.y - h})`} {...hit({ key: p.key, kind: 'store', active: selected === p.key, label: st?.name ?? 'Store', onSelect })}>
            <Storefront
              w={44}
              h={h}
              awning={AWNING[st?.policy ?? 'standard']}
              lit={st?.attentionShare ?? 0.5}
              drift={st?.drift ?? 0}
            />
          </g>
        )
      })}

      <g
        transform={`translate(${352} ${398 - (64 + tier * 4)})`}
        {...hit({ key: pins.find((p) => p.kind === 'flagship')?.key ?? 'flagship', kind: 'flagship', active: selected === (pins.find((p) => p.kind === 'flagship')?.key ?? 'flagship'), label: 'Flagship', onSelect })}
      >
        <Storefront
          w={96}
          h={64 + tier * 4}
          awning="var(--sc-tag)"
          lit={flag ? 0.45 + flag.attentionShare * 0.55 : 1}
          drift={flag?.drift ?? 0}
          sign={flag?.name ?? 'Flagship'}
        />
      </g>

      {ports.slice(0, 8).map((p, i) => (
        <g key={p.key} transform={`translate(${60 + i * 110} 112)`} {...hit({ key: p.key, kind: 'port', active: selected === p.key, label: `Lane ${p.n}`, onSelect })}>
          <path d="M0 18 H36" className={fuelled ? 'bm-dock' : 'bm-dock is-dry'} />
          <rect x="4" y="8" width="22" height="8" rx="2" className="bm-hull" />
          <path d={`M18 8 Q${40 + (i % 3) * 10} -8 70 -20`} className={fuelled ? 'bm-lane' : 'bm-lane is-dry'} />
        </g>
      ))}

      {barges.slice(0, 10).map((p, i) => {
        const x = 80 + (i % 10) * 86
        return (
          <g key={p.key} transform={`translate(${x} 36)`} {...hit({ key: p.key, kind: 'barge', active: selected === p.key, label: `Seed barge ${p.n}`, onSelect })}>
            <ellipse cx="22" cy="14" rx="22" ry="7" className="bm-barge" fill="var(--sc-barge)" style={{ animationDelay: `${i * 0.25}s` }} />
            <rect x="12" y="6" width="16" height="7" rx="1" fill="#d7deee" />
            <path d={`M22 6 L${22 + (i - 4) * 6} -8`} className="bm-beam" />
          </g>
        )
      })}

      {orbit && (s.fleet?.biomassMax ?? 0) > 0 ? (
        <g className="bm-biomass">
          <rect x="40" y="8" width="920" height="6" rx="3" className="bm-bio-track" />
          <rect x="40" y="8" width={920 * biomass} height="6" rx="3" className="bm-bio-fill" />
        </g>
      ) : null}

      <g className="bm-more">
        {stores.length > shownStores.length ? (
          <text x="500" y="610" textAnchor="middle">
            +{stores.length - shownStores.length} more of your stores on this block
          </text>
        ) : null}
        {districts.length > 4 ? (
          <text x="40" y="590">
            +{districts.length - 4} districts
          </text>
        ) : null}
        {plants.length > 8 ? (
          <text x="40" y="632">
            +{plants.length - 8} plants
          </text>
        ) : null}
        {barges.length > 10 ? (
          <text x="860" y="28" textAnchor="end">
            +{barges.length - 10} barges
          </text>
        ) : null}
      </g>
    </svg>
  )
}

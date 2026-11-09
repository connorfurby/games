import { sumQty } from '../../sim/helpers'
import { useGame } from '../GameContext'

/**
 * A short illustrated strip for the departments that were still just numbers.
 * Everything drawn is read from the sim.
 */
export function DeptDiorama({ kind }: { kind: 'backroom' | 'suppliers' | 'cold' | 'politics' | 'logistics' | 'marketing' | 'invest' | 'build' }) {
  const { state: s, reducedMotion } = useGame()
  return (
    <svg className={`dd dd--${kind}${reducedMotion ? '' : ' is-live'}`} viewBox="0 0 640 96" aria-hidden>
      <rect width="640" height="96" className="dd-bg" />
      {kind === 'backroom' ? <Backroom sQty={sumQty(s.backroom)} orders={s.orders.length} /> : null}
      {kind === 'suppliers' ? <Suppliers orders={s.orders.length} cat={s.orderCat || 'cans'} /> : null}
      {kind === 'cold' ? <Cold plants={s.cold?.plants ?? 0} offline={s.cold?.offline ?? 0} tanks={s.cold?.tanks ?? 0} /> : null}
      {kind === 'politics' ? <Politics heat={s.politics?.monopolyRisk ?? 0} districts={s.politics?.acquisitions ?? 0} /> : null}
      {kind === 'logistics' ? <Lanes lanes={s.fleet?.lanes ?? 0} fuel={s.fuel} /> : null}
      {kind === 'marketing' ? <Ads brand={s.brand} ads={s.ads} /> : null}
      {kind === 'invest' ? <Book on={s.invest.unlocked} risk={s.invest.unlocked ? s.invest.risk : 'safe'} /> : null}
      {kind === 'build' ? <Site tier={s.builds.storefront ?? 1} storage={s.builds.storage ?? 1} /> : null}
    </svg>
  )
}

function Backroom({ sQty, orders }: { sQty: number; orders: number }) {
  const crates = Math.max(1, Math.min(10, Math.ceil(sQty / 20)))
  return (
    <g>
      {Array.from({ length: crates }, (_, i) => (
        <rect key={i} x={24 + (i % 10) * 36} y={28 + (i % 2) * 8} width="28" height="22" fill="#6c5b47" />
      ))}
      <text x="24" y="18" className="dd-label">
        {orders} inbound
      </text>
    </g>
  )
}

function Suppliers({ orders, cat }: { orders: number; cat: string }) {
  return (
    <g>
      <rect x="36" y="40" width="90" height="32" rx="3" fill="var(--sc-tag)" />
      <rect x="120" y="48" width="40" height="24" fill="#efe9dc" />
      <circle cx="54" cy="76" r="7" fill="#1a1612" />
      <circle cx="130" cy="76" r="7" fill="#1a1612" />
      {Array.from({ length: Math.max(1, Math.min(6, orders || 1)) }, (_, i) => (
        <rect key={i} x={200 + i * 36} y="46" width="24" height="20" fill="#c9a15a" opacity={orders ? 1 : 0.35} />
      ))}
      <text x="200" y="24" className="dd-label">
        {cat}
      </text>
    </g>
  )
}

function Cold({ plants, offline, tanks }: { plants: number; offline: number; tanks: number }) {
  const n = Math.max(1, Math.min(6, plants + offline))
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${30 + i * 70} 28)`}>
          <rect width="40" height="48" fill={i < plants ? '#d7e6ee' : '#3a4043'} />
          <rect x="14" y="6" width="6" height="16" fill="#7a8794" />
          {i < plants ? <circle cx="17" cy="2" r="5" className="dd-smoke" /> : null}
        </g>
      ))}
      {Array.from({ length: Math.min(4, tanks) }, (_, i) => (
        <rect key={i} x={460 + i * 28} y="30" width="18" height="46" rx="8" fill="#9fd4e4" />
      ))}
    </g>
  )
}

function Politics({ heat, districts }: { heat: number; districts: number }) {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={40 + i * 36} y={20} width="14" height="58" fill="#efe9dc" opacity={0.25 + i * 0.08} />
      ))}
      <rect x="240" y="70" width="360" height="8" rx="4" fill="#1a1612" />
      <rect x="240" y="70" width={360 * Math.max(0, Math.min(1, heat))} height="8" rx="4" fill="#d9665b" />
      <text x="240" y="28" className="dd-label">
        {districts} district{districts === 1 ? '' : 's'} bought
      </text>
    </g>
  )
}

function Lanes({ lanes, fuel }: { lanes: number; fuel: number }) {
  const n = Math.max(1, Math.min(5, lanes))
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <path d={`M40 ${28 + i * 12} Q320 ${18 + i * 8} 520 ${30 + i * 10}`} fill="none" stroke="#5b9bd5" strokeOpacity={fuel > 0 ? 0.8 : 0.25} />
          <rect x={520} y={22 + i * 12} width="28" height="10" rx="2" fill="#c8ccd2" />
        </g>
      ))}
      <text x="40" y="88" className="dd-label">
        {fuel > 0 ? 'Fuelled' : 'Out of fuel'} · {lanes} lane{lanes === 1 ? '' : 's'}
      </text>
    </g>
  )
}

function Ads({ brand, ads }: { brand: number; ads: number }) {
  const n = Math.max(1, Math.min(6, ads))
  return (
    <g>
      <rect x="28" y="18" width="160" height="60" fill="#1e2a2b" />
      <text x="108" y="52" textAnchor="middle" fill="var(--sc-tag)" fontSize="16" fontFamily="var(--g2-display)">
        {Math.round(brand * 100)}%
      </text>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={220 + i * 36} y={24 + (i % 2) * 6} width="26" height="36" fill="#efe9dc" transform={`rotate(${(i - 2) * 4} ${233 + i * 36} 42)`} />
      ))}
    </g>
  )
}

function Book({ on, risk }: { on: boolean; risk: string }) {
  const bars = risk === 'high' ? [20, 48, 30, 60, 36, 70] : risk === 'mid' ? [24, 32, 40, 36, 50, 46] : [18, 22, 26, 30, 34, 38]
  return (
    <g>
      <rect x="28" y="16" width="120" height="64" rx="4" fill="#efe9dc" />
      <path d="M40 28 H130 M40 40 H110 M40 52 H120" stroke="#1a1612" strokeOpacity="0.35" />
      {bars.map((h, i) => (
        <rect key={i} x={180 + i * 28} y={80 - h} width="16" height={h} fill={on ? '#7cc47f' : '#3a4043'} />
      ))}
    </g>
  )
}

function Site({ tier, storage }: { tier: number; storage: number }) {
  const floors = Math.max(1, Math.min(4, tier))
  return (
    <g>
      <rect x="40" y={70 - floors * 14} width="90" height={floors * 14} fill="#5b3a33" />
      <polygon points={`34,${70 - floors * 14} 85,${52 - floors * 14} 136,${70 - floors * 14}`} fill="var(--sc-tag)" />
      {Array.from({ length: Math.min(5, storage) }, (_, i) => (
        <rect key={i} x={180 + i * 34} y="40" width="26" height="30" fill="#6c5b47" />
      ))}
      <text x="40" y="88" className="dd-label">
        Storefront tier {tier}
      </text>
    </g>
  )
}

import { roleCount, shelfCap } from '../../sim/formulas'
import type { GameState } from '../../sim/state'
import { sumQty } from '../../sim/helpers'
import { SceneFrame } from './SceneFrame'

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

export function FloorScene({ state: s }: { state: GameState }) {
  const shelf = sumQty(s.shelf)
  const cap = Math.max(1, shelfCap(s))
  const fill = clamp01(shelf / cap)
  const bays = 5
  return (
    <SceneFrame label="Shelf run">
      {Array.from({ length: bays }, (_, i) => {
        const h = 10 + clamp01(fill * 1.15 - i * 0.04) * 28
        return (
          <rect
            key={i}
            x={30 + i * 54}
            y={56 - h}
            width={40}
            height={h}
            rx={3}
            fill="var(--ge-accent)"
            opacity={0.25 + fill * 0.35}
            stroke="var(--ge-ink)"
            strokeOpacity={0.2}
          />
        )
      })}
      <path d="M16 58h288" stroke="var(--ge-ink)" strokeOpacity={0.25} />
    </SceneFrame>
  )
}

export function MemosScene({ state: s }: { state: GameState }) {
  const filed = Math.min(8, Object.values(s.memos).filter((v) => v > 0).length)
  const sheets = Math.max(2, Math.min(6, filed))
  return (
    <SceneFrame label="Memo stack">
      {Array.from({ length: sheets }, (_, i) => (
        <rect
          key={i}
          x={110 + i * 12}
          y={14 + i * 3}
          width={64}
          height={42}
          rx={2}
          fill="var(--ge-paper)"
          opacity={0.3 + i * 0.07}
          stroke="var(--ge-accent)"
          strokeOpacity={0.35}
          transform={`rotate(${(i - 2) * 2.5} ${142 + i * 12} 35)`}
        />
      ))}
    </SceneFrame>
  )
}

export function BackroomScene({ state: s }: { state: GameState }) {
  const crates = Math.min(8, Math.max(1, Math.ceil(sumQty(s.backroom) / 12)))
  return (
    <SceneFrame label="Backroom crates">
      {Array.from({ length: crates }, (_, i) => (
        <rect
          key={i}
          x={24 + i * 34}
          y={28 + (i % 2) * 6}
          width={26}
          height={22}
          rx={2}
          fill="var(--ge-paper)"
          opacity={0.55 + (i % 3) * 0.1}
          stroke="var(--ge-ink)"
          strokeOpacity={0.25}
        />
      ))}
      <path d="M12 62h296" stroke="var(--ge-ink)" strokeOpacity={0.2} />
    </SceneFrame>
  )
}

export function SuppliersScene({ state: s }: { state: GameState }) {
  const orders = Math.min(4, s.orders.length)
  return (
    <SceneFrame label="Supplier truck">
      <rect x="40" y="28" width="70" height="28" rx="4" fill="var(--ge-accent)" opacity={0.55} />
      <rect x="108" y="34" width="48" height="22" rx="3" fill="var(--ge-paper)" opacity={0.45} />
      <circle cx="58" cy="58" r="7" fill="var(--ge-ink)" opacity={0.35} />
      <circle cx="128" cy="58" r="7" fill="var(--ge-ink)" opacity={0.35} />
      {Array.from({ length: Math.max(1, orders) }, (_, i) => (
        <rect
          key={i}
          x={180 + i * 28}
          y={36}
          width={18}
          height={16}
          rx={2}
          fill="var(--ge-success)"
          opacity={0.4 + i * 0.1}
        />
      ))}
    </SceneFrame>
  )
}

export function StaffScene({ state: s }: { state: GameState }) {
  const roles = ['clerk', 'stocker', 'cashier', 'security', 'night'] as const
  return (
    <SceneFrame label="Staff on shift">
      {roles.map((role, i) => {
        const n = Math.min(4, roleCount(s, role))
        return Array.from({ length: Math.max(n, 0) }, (_, j) => (
          <g key={`${role}-${j}`} transform={`translate(${28 + i * 56 + j * 8} 20)`}>
            <circle cx="10" cy="10" r="7" fill="var(--ge-accent)" opacity={0.55 + j * 0.1} />
            <rect x="3" y="18" width="14" height="22" rx="4" fill="var(--ge-paper)" opacity={0.4} />
          </g>
        ))
      })}
    </SceneFrame>
  )
}

export function BuildScene({ state: s }: { state: GameState }) {
  const tiers = [
    s.builds.storefront ?? 0,
    s.builds.storage ?? 0,
    s.builds.cold ?? 0,
    s.builds.transit ?? 0,
    s.builds.civic ?? 0,
  ]
  return (
    <SceneFrame label="Build silhouettes">
      {tiers.map((t, i) => {
        const h = 12 + Math.min(5, t) * 8
        return (
          <rect
            key={i}
            x={30 + i * 56}
            y={62 - h}
            width={36}
            height={h}
            rx={3}
            fill="var(--ge-ink)"
            opacity={0.2 + Math.min(0.45, t * 0.08)}
          />
        )
      })}
      <path d="M16 62h288" stroke="var(--ge-ink)" strokeOpacity={0.25} />
    </SceneFrame>
  )
}

export function VenturesScene({ state: s }: { state: GameState }) {
  const entries = Object.values(s.ventures)
  const fill = clamp01(
    entries.reduce((a, v) => a + (v.stored ?? 0), 0) /
      Math.max(1, entries.reduce((a, v) => a + Math.max(1, v.level) * 10, 1)),
  )
  return (
    <SceneFrame label="Venture till">
      <rect x="110" y="18" width="100" height="40" rx="6" fill="var(--ge-bg)" opacity={0.5} stroke="var(--ge-accent)" strokeOpacity={0.5} />
      <rect
        x="116"
        y={52 - fill * 28}
        width="88"
        height={fill * 28}
        rx="3"
        fill="var(--ge-success)"
        opacity={0.55}
      />
      <text x="160" y="44" textAnchor="middle" fill="var(--ge-ink)" opacity={0.55} fontSize="10">
        till
      </text>
    </SceneFrame>
  )
}

export function ColdScene({ state: s }: { state: GameState }) {
  const plants = Math.min(6, s.cold.plants)
  const tanks = Math.min(6, s.cold.tanks)
  const frost = s.cold.freshness >= 1
  const amber = s.cold.freshness < 0.85
  return (
    <SceneFrame label="Cold plants" className={frost ? 'ge-scene--frost' : amber ? 'ge-scene--amber' : ''}>
      {Array.from({ length: Math.max(1, plants) }, (_, i) => (
        <rect
          key={`p${i}`}
          x={24 + i * 28}
          y={22}
          width={20}
          height={34}
          rx={3}
          fill="var(--ge-accent)"
          opacity={frost ? 0.65 : 0.4}
        />
      ))}
      {Array.from({ length: tanks }, (_, i) => (
        <ellipse
          key={`t${i}`}
          cx={200 + i * 18}
          cy={44}
          rx={10}
          ry={16}
          fill="var(--ge-paper)"
          opacity={0.35}
          stroke="var(--ge-ink)"
          strokeOpacity={0.3}
        />
      ))}
      {frost ? <rect x="0" y="0" width="320" height="72" fill="var(--ge-paper)" opacity={0.08} /> : null}
    </SceneFrame>
  )
}

export function PoliticsScene({ state: s }: { state: GameState }) {
  const heat = clamp01(s.politics.monopolyRisk)
  return (
    <SceneFrame label="Politics hall">
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={40 + i * 60}
          y={16}
          width={18}
          height={46}
          rx={2}
          fill="var(--ge-ink)"
          opacity={0.22 + i * 0.05}
        />
      ))}
      <rect x="40" y="64" width={240 * heat} height="4" rx="2" fill="var(--ge-danger)" opacity={0.7} />
    </SceneFrame>
  )
}

export function LogisticsScene({ state: s }: { state: GameState }) {
  const lanes = Math.min(8, s.fleet.lanes)
  const fuel = clamp01(s.fuel / Math.max(1, 100 + (s.memos['fuel-buffer'] ? 50 : 0)))
  return (
    <SceneFrame label="Lanes and fuel">
      {Array.from({ length: Math.max(1, lanes) }, (_, i) => (
        <path
          key={i}
          d={`M20 ${20 + i * 6} Q160 ${12 + i * 4} 300 ${22 + i * 5}`}
          fill="none"
          stroke="var(--ge-accent)"
          strokeOpacity={0.35 + i * 0.05}
          strokeWidth={1.5}
        />
      ))}
      <rect x="24" y="54" width="272" height="8" rx="4" fill="var(--ge-bg)" opacity={0.5} />
      <rect x="24" y="54" width={272 * fuel} height="8" rx="4" fill="var(--ge-success)" opacity={0.6} />
    </SceneFrame>
  )
}

export function FleetScene({ state: s }: { state: GameState }) {
  const barges = Math.min(12, Math.max(0, Math.floor(s.fleet.barges)))
  return (
    <SceneFrame label="Barge swarm">
      {Array.from({ length: Math.max(1, barges || 1) }, (_, i) => {
        const x = 28 + (i % 6) * 48
        const y = 22 + Math.floor(i / 6) * 24
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={5}
            fill="var(--ge-accent)"
            opacity={0.45 + (i % 3) * 0.12}
          />
        )
      })}
      {s.fleet.warOn ? (
        <text x="280" y="60" fill="var(--ge-danger)" opacity={0.7} fontSize="10">
          war
        </text>
      ) : null}
    </SceneFrame>
  )
}

export function StrategyScene({ state: s }: { state: GameState }) {
  const ids = Object.keys(s.doctrines)
  return (
    <SceneFrame label="Doctrine seals">
      {Array.from({ length: 8 }, (_, i) => {
        const owned = ids.length > i
        return (
          <circle
            key={i}
            cx={28 + i * 36}
            cy={36}
            r={12}
            fill={owned ? 'var(--ge-accent)' : 'var(--ge-bg)'}
            opacity={owned ? 0.65 : 0.3}
            stroke="var(--ge-ink)"
            strokeOpacity={0.35}
          />
        )
      })}
    </SceneFrame>
  )
}

export function MarketingScene({ state: s }: { state: GameState }) {
  const ads = Math.min(8, Math.max(1, s.ads))
  return (
    <SceneFrame label="Flyer stack">
      {Array.from({ length: ads }, (_, i) => (
        <rect
          key={i}
          x={40 + i * 28}
          y={20 + (i % 2) * 4}
          width={22}
          height={30}
          rx={2}
          fill="var(--ge-paper)"
          opacity={0.35 + i * 0.05}
          stroke="var(--ge-accent)"
          strokeOpacity={0.4}
          transform={`rotate(${(i - 4) * 3} ${51 + i * 28} 35)`}
        />
      ))}
    </SceneFrame>
  )
}

export function BooksScene({ state: s }: { state: GameState }) {
  const fill = clamp01(s.cash / Math.max(80, s.stats.peakCash || 80))
  return (
    <SceneFrame label="Register tape">
      <rect x="60" y="18" width="200" height="40" rx="4" fill="var(--ge-paper)" opacity={0.25} />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M72 ${28 + i * 7} h${40 + fill * 120 - i * 12}`}
          stroke="var(--ge-ink)"
          strokeOpacity={0.35}
          strokeWidth={2}
        />
      ))}
    </SceneFrame>
  )
}

export function InvestScene({ state: s }: { state: GameState }) {
  const bal = s.invest.unlocked ? s.invest.balance : s.passbook.balance
  const peak = Math.max(1, s.invest.unlocked ? s.invest.peak || bal : bal || 50)
  const fill = clamp01(bal / peak)
  return (
    <SceneFrame label="Passbook">
      <rect x="90" y="14" width="140" height="48" rx="6" fill="var(--ge-bg)" opacity={0.45} stroke="var(--ge-success)" strokeOpacity={0.45} />
      <rect x="100" y={52 - fill * 28} width="120" height={fill * 28} rx="3" fill="var(--ge-success)" opacity={0.5} />
    </SceneFrame>
  )
}

export function LandScene({ state: s }: { state: GameState }) {
  const lots = Object.values(s.expansions).filter(Boolean).length + s.stores.length
  return (
    <SceneFrame label="Lots">
      {Array.from({ length: Math.min(6, Math.max(1, lots)) }, (_, i) => (
        <rect
          key={i}
          x={30 + i * 48}
          y={28}
          width={36}
          height={28}
          rx={3}
          fill="var(--ge-accent)"
          opacity={0.3 + i * 0.08}
        />
      ))}
    </SceneFrame>
  )
}

export function EmpireScene({ state: s }: { state: GameState }) {
  const lvl = Math.min(12, s.empire.level)
  return (
    <SceneFrame label="Empire rank">
      {Array.from({ length: lvl }, (_, i) => (
        <rect
          key={i}
          x={24 + i * 24}
          y={48 - Math.min(28, 8 + i * 2)}
          width={16}
          height={Math.min(28, 8 + i * 2)}
          rx={2}
          fill="var(--ge-accent)"
          opacity={0.35 + (i % 4) * 0.1}
        />
      ))}
    </SceneFrame>
  )
}

export function UpgradesScene({ state: s }: { state: GameState }) {
  const n = Math.min(10, Object.values(s.upgrades).reduce((a, v) => a + v, 0))
  return (
    <SceneFrame label="Upgrade nodes">
      {Array.from({ length: Math.max(3, n) }, (_, i) => (
        <circle
          key={i}
          cx={40 + i * 28}
          cy={36}
          r={8}
          fill="var(--ge-accent)"
          opacity={0.3 + (i % 3) * 0.15}
        />
      ))}
      <path d="M40 36 H280" stroke="var(--ge-ink)" strokeOpacity={0.2} strokeDasharray="4 4" />
    </SceneFrame>
  )
}

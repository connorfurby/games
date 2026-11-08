import { BUILD_TRACKS } from '../../content/builds'
import { ROLE_IDS } from '../../content/staff'
import { UPGRADES } from '../../content/upgrades'
import { VENTURES } from '../../content/ventures'
import { MORALE } from '../../sim/balance'
import { backroomCap, roleCount, shelfCap, up, upkeepPerSec } from '../../sim/formulas'
import { sumQty } from '../../sim/helpers'
import type { GameState } from '../../sim/state'
import { money, pct, qty, rate } from '../format'
import { StatusBand, type StatusItem } from '../components/StatusBand'

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

export function BackroomBand({ state: s }: { state: GameState }) {
  const total = sumQty(s.backroom)
  const cap = Math.max(1, backroomCap(s))
  const inbound = s.orders?.length ?? 0
  const items: StatusItem[] = [
    {
      label: 'Stock',
      value: `${qty(total)} / ${qty(cap)}`,
      fill: clamp01(total / cap),
      tone: total <= 0 ? 'danger' : 'accent',
    },
    {
      label: 'Inbound',
      value: String(inbound),
      tone: inbound > 0 ? 'success' : 'muted',
    },
    {
      label: 'Shelf',
      value: `${qty(sumQty(s.shelf))} / ${qty(shelfCap(s))}`,
      tone: 'muted',
    },
  ]
  return <StatusBand items={items} />
}

export function SuppliersBand({ state: s }: { state: GameState }) {
  const inbound = s.orders?.length ?? 0
  return (
    <StatusBand
      items={[
        { label: 'Index', value: s.wholesale.index.toFixed(3), tone: 'accent' },
        { label: 'Supplier', value: String(s.supplier).toUpperCase(), tone: 'muted' },
        {
          label: 'Inbound',
          value: String(inbound),
          tone: inbound > 0 ? 'success' : 'muted',
        },
        { label: 'Order', value: s.orderCat || 'cans', tone: 'muted' },
      ]}
    />
  )
}

export function StaffBand({ state: s }: { state: GameState }) {
  const heads = ROLE_IDS.reduce((n, r) => n + roleCount(s, r), 0)
  const moraleFill = clamp01(s.morale / MORALE.max)
  return (
    <StatusBand
      items={[
        {
          label: 'Crew',
          value: String(heads),
          tone: heads <= 0 ? 'muted' : 'accent',
          hint: 'People on payroll',
        },
        {
          label: 'Morale',
          value: pct(moraleFill),
          fill: moraleFill,
          tone: s.morale < 0.65 ? 'danger' : 'success',
        },
        { label: 'Hours', value: `${s.hours.toFixed(1)}×`, tone: 'muted' },
      ]}
    />
  )
}

export function MarketingBand({ state: s }: { state: GameState }) {
  const meter = s.inspection?.meter ?? 0
  return (
    <StatusBand
      items={[
        { label: 'Brand', value: pct(s.brand), fill: clamp01(s.brand), tone: 'accent' },
        { label: 'Ad Lv', value: String(s.ads), tone: 'muted', hint: 'Ad intensity level' },
        {
          label: 'Heat',
          value: pct(meter),
          fill: clamp01(meter),
          tone: meter > 0.7 ? 'danger' : 'muted',
          hint: 'Inspection heat — call early on Floor',
        },
      ]}
    />
  )
}

export function InvestBand({ state: s }: { state: GameState }) {
  const bal = s.invest.unlocked ? s.invest.balance : s.passbook.balance
  const peak = Math.max(1, s.invest.unlocked ? s.invest.peak || bal : bal || 50)
  return (
    <StatusBand
      items={[
        {
          label: s.invest.unlocked ? 'In book' : 'Passbook',
          value: money(bal),
          fill: clamp01(bal / peak),
          tone: 'success',
        },
        {
          label: 'Risk',
          value: s.invest.unlocked ? s.invest.risk : 'safe',
          tone: 'muted',
        },
        {
          label: 'Engine',
          value: s.invest.unlocked ? `L${s.invest.engineLevel}` : '—',
          tone: 'muted',
        },
      ]}
    />
  )
}

export function BuildBand({ state: s }: { state: GameState }) {
  const levels = Object.values(s.builds ?? {}).reduce((a, n) => a + (n ?? 0), 0)
  const upkeep = upkeepPerSec(s, BUILD_TRACKS)
  return (
    <StatusBand
      items={[
        { label: 'Tiers', value: String(levels), tone: 'accent', hint: 'Sum of build ranks' },
        { label: 'Endcaps', value: String(s.endcaps ?? 0), tone: 'muted' },
        {
          label: 'Upkeep',
          value: rate(upkeep),
          tone: upkeep > 0 ? 'muted' : 'muted',
          hint: 'Shell burn per second (with rent & wages)',
        },
      ]}
    />
  )
}

/** Kept for legacy imports; Upgrades panel no longer mounts a band. */
export function UpgradesBand({ state: s }: { state: GameState }) {
  const bought = UPGRADES.reduce((n, u) => n + up(s, u.id), 0)
  return (
    <StatusBand
      items={[
        { label: 'Ranks', value: String(bought), tone: 'accent' },
        { label: 'Empire', value: `Lv ${s.empire.level}`, tone: 'muted' },
      ]}
    />
  )
}

/** Kept for legacy imports; Ventures panel uses a claim callout instead. */
export function VenturesBand({ state: s }: { state: GameState }) {
  let open = 0
  let stored = 0
  for (const def of VENTURES) {
    const vs = s.ventures[def.id]
    if (vs && vs.level > 0) {
      open += 1
      stored += vs.stored ?? 0
    }
  }
  return (
    <StatusBand
      items={[
        { label: 'Open', value: String(open), tone: open > 0 ? 'accent' : 'muted' },
        {
          label: 'Claimable',
          value: money(stored),
          tone: stored > 0 ? 'success' : 'muted',
        },
      ]}
    />
  )
}

export function LandBand({ state: s }: { state: GameState }) {
  const lots = Object.values(s.expansions ?? {}).filter(Boolean).length
  return (
    <StatusBand
      items={[
        { label: 'Stores', value: String(s.stores?.length ?? 0), tone: 'accent' },
        { label: 'Lots', value: String(lots), tone: 'muted' },
        { label: 'Depot', value: s.depot ? 'Online' : '—', tone: s.depot ? 'success' : 'muted' },
      ]}
    />
  )
}

export function StrategyBand({ state: s }: { state: GameState }) {
  return (
    <StatusBand
      items={[
        { label: 'Read', value: String(Math.floor(s.read * 10) / 10), tone: 'accent' },
        { label: 'Attention', value: String(Math.floor(s.compute.attention)), tone: 'muted' },
        { label: 'Tournaments', value: String(s.stats.tournamentsRun), tone: 'muted' },
      ]}
    />
  )
}

export function ColdBand({ state: s }: { state: GameState }) {
  const c = s.cold
  return (
    <StatusBand
      items={[
        {
          label: 'Fresh',
          value: `${Math.min(200, Math.round(c.freshness * 100))}%`,
          fill: clamp01(c.freshness / 1.5),
          tone: c.browned ? 'danger' : 'success',
        },
        {
          label: 'Surplus',
          value: `${c.surplus >= 0 ? '+' : ''}${c.surplus.toFixed(1)}`,
          tone: c.surplus < 0 ? 'danger' : 'accent',
          hint: 'Cold supply minus demand. Negative means brownout pressure.',
        },
        {
          label: 'Kit',
          value: `${c.plants}p · ${c.tanks}t`,
          tone: 'muted',
          hint: 'Plants supply cold; tanks buffer brownouts',
        },
        {
          label: 'Yield',
          value: Math.floor(c.yieldLeft).toLocaleString(),
          fill: clamp01(c.yieldLeft / Math.max(1, c.yieldMax)),
          tone: c.yieldLeft <= 0 ? 'danger' : 'muted',
          hint: 'Regional yield left before the county runs dry.',
        },
      ]}
    />
  )
}

export function PoliticsBand({ state: s }: { state: GameState }) {
  const p = s.politics
  return (
    <StatusBand
      items={[
        { label: 'PC', value: p.capital.toFixed(1), tone: 'accent', hint: 'Political capital' },
        { label: 'Lobby', value: String(p.lobby), tone: 'muted' },
        {
          label: 'Heat',
          value: pct(p.monopolyRisk),
          fill: clamp01(p.monopolyRisk),
          tone: p.monopolyRisk > 0.6 ? 'danger' : 'muted',
          hint: 'Monopoly heat — answers live on this desk',
        },
        {
          label: 'Brand',
          value: pct(s.brand),
          fill: clamp01(s.brand),
          tone: s.brand < 0.4 ? 'danger' : 'success',
        },
      ]}
    />
  )
}

export function LogisticsBand({ state: s }: { state: GameState }) {
  const fuelCap = 100 + (s.memos['fuel-buffer'] ? 50 : 0)
  const wet = s.fuel > 0 ? s.fleet.lanes : 0
  return (
    <StatusBand
      items={[
        {
          label: 'Fuel',
          value: `${Math.floor(s.fuel)} / ${fuelCap}`,
          fill: clamp01(s.fuel / fuelCap),
          tone: s.fuel < 15 ? 'danger' : 'accent',
        },
        {
          label: 'Lanes',
          value: `${wet} / ${s.fleet.lanes}`,
          tone: s.fleet.lanes > 0 && s.fuel <= 0 ? 'danger' : 'muted',
          hint: 'Wet lanes only run while the tank has fuel',
        },
        { label: 'Control', value: s.control.toFixed(1), tone: 'muted' },
        {
          label: 'Brand',
          value: pct(s.brand),
          fill: clamp01(s.brand),
          tone: s.brand < 0.4 ? 'danger' : 'success',
        },
      ]}
    />
  )
}

export function FleetBand({ state: s }: { state: GameState }) {
  const f = s.fleet
  return (
    <StatusBand
      items={[
        { label: 'Barges', value: String(f.barges), tone: 'accent' },
        { label: 'Legacy', value: f.legacy.toFixed(1), tone: 'muted' },
        {
          label: 'Biomass',
          value: `${Math.floor(f.biomass).toLocaleString()}`,
          fill: clamp01(f.biomass / Math.max(1, f.biomassMax)),
          tone: 'success',
        },
        {
          label: 'War',
          value: f.warOn ? 'Live' : 'Quiet',
          tone: f.warOn ? 'danger' : 'muted',
        },
      ]}
    />
  )
}

export function EmpireBand({ state: s }: { state: GameState }) {
  return (
    <StatusBand
      items={[
        { label: 'Level', value: `Lv ${s.empire.level}`, tone: 'accent' },
        { label: 'Points', value: String(s.empire.points), tone: 'success' },
        {
          label: 'Universe',
          value: s.prestigeCarry.universeIndex > 0 ? `#${s.prestigeCarry.universeIndex}` : '—',
          tone: 'muted',
        },
      ]}
    />
  )
}

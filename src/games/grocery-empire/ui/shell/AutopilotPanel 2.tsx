import type { ReactNode } from 'react'
import { PERK_BY_ID } from '../../content/perks'
import { RARITY_INFO, type Rarity } from '../../content/relics'
import { UPGRADE_BY_ID } from '../../content/upgrades'
import { DEPTH } from '../../sim/balance'
import type { MenuId } from '../../content/menus'
import { plantOperatorOnCurrentShift } from '../../sim/systems/cold'
import { useGame } from '../GameContext'
import { Button, Toggle } from '../kit'
import { requestInbox } from './uiBus'

type Row = {
  id: string
  title: string
  /** What it does, in one line. */
  what: string
  on: boolean
  /** A toggle when the player has earned it, else how to earn it. */
  control?: ReactNode
  earn?: string
  go?: { label: string; run: () => void }
  extra?: ReactNode
}

/**
 * Every chore the game can take off your hands, in one place. Each one is earned (a hire, a memo,
 * an upgrade, or doing it by hand enough times); this page says which are running and how to get
 * the rest. Owner rule: chores collapse to one tap or none.
 */
export function AutopilotPanel({ onOpenMenu }: { onOpenMenu: (m: MenuId) => void }) {
  const { state: s, dispatch } = useGame()
  const rows: Row[] = []
  const goto = (m: MenuId, label: string) => ({ label, run: () => onOpenMenu(m) })

  // 1. Unpacking
  const clerks = s.staff.filter((m) => m.role === 'clerk').length
  rows.push({
    id: 'unpack',
    title: 'Unpacking',
    what: 'Clerks move stock from the back onto the shelf.',
    on: clerks > 0,
    earn: clerks > 0 ? undefined : 'Hire a Clerk.',
    go: clerks > 0 ? undefined : goto('staff', 'Team'),
    extra: clerks > 0 ? <span className="ap-note">{clerks} clerk{clerks === 1 ? '' : 's'} on it. Hire more if the shelf runs dry.</span> : null,
  })

  if (s.era >= 1 && s.depth) {
    // 2. Invoices
    rows.push({
      id: 'invoices',
      title: 'Paying invoices',
      what: 'Pays crates bought on credit, early, so you keep the discount.',
      on: !!s.depth.autoPayInvoices,
      control: (
        <Toggle checked={!!s.depth.autoPayInvoices} onChange={(on) => dispatch({ type: 'setAutoPayInvoices', on })}>
          Pay automatically
        </Toggle>
      ),
    })

    // 3. Restocking
    const hasClip = (s.memos['auto-order'] ?? 0) > 0
    rows.push({
      id: 'restock',
      title: 'Restocking',
      what: 'Orders a crate when the back runs low and the price is under your limit.',
      on: hasClip && s.autoRestock.enabled,
      control: hasClip ? (
        <Toggle checked={s.autoRestock.enabled} onChange={(on) => dispatch({ type: 'setAutoRestock', enabled: on })}>
          Restock automatically
        </Toggle>
      ) : undefined,
      earn: hasClip ? undefined : 'Buy the Auto-Order Clipboard memo (after about 30 orders by hand).',
      go: hasClip ? goto('suppliers', 'Limits in Suppliers') : { label: 'Memos', run: () => requestInbox('memos') },
    })

    // 4. Dock check-ins
    const done = s.depth.dockCheckIns ?? 0
    const earned = done >= DEPTH.dockAutoAfter
    rows.push({
      id: 'dock',
      title: 'Dock check-ins',
      what: 'Your receiver checks each truck in to the aisle with the least stock.',
      on: earned && !!s.depth.autoDock,
      control: earned ? (
        <Toggle checked={!!s.depth.autoDock} onChange={(on) => dispatch({ type: 'setAutoDock', on })}>
          Check trucks in automatically
        </Toggle>
      ) : undefined,
      earn: earned ? undefined : `Do ${DEPTH.dockAutoAfter} check-ins by hand first (${done} of ${DEPTH.dockAutoAfter}).`,
      go: earned ? undefined : goto('suppliers', 'Suppliers'),
      extra: earned ? null : (
        <span className="ap-bar" aria-hidden>
          <i style={{ width: `${(done / DEPTH.dockAutoAfter) * 100}%` }} />
        </span>
      ),
    })
  }

  // 5. Cooler log
  if (s.era >= 3 && s.cold.plants > 0) {
    const op = plantOperatorOnCurrentShift(s)
    rows.push({
      id: 'cooler',
      title: 'Cooler log',
      what: 'Signs the cold log on time so produce stays fresh.',
      on: op,
      earn: op ? undefined : 'Put a Plant Operator on the shift that is running now.',
      go: op ? undefined : goto('staff', 'Team'),
    })
  }

  // 6. Venture tills
  if (s.menus.ventures) {
    const runner = (s.upgrades['auto-collect'] ?? 0) >= 1 || (s.empire.perks['venture-auto'] ?? 0) > 0
    const anyStored = Object.values(s.ventures).some((v) => (v?.stored ?? 0) > 0)
    rows.push({
      id: 'ventures',
      title: 'Collecting tills',
      what: 'Empties full venture tills into your cash.',
      on: runner,
      earn: runner
        ? undefined
        : `Buy ${UPGRADE_BY_ID['auto-collect']?.name ?? 'Venture Runner'} in Upgrades, or the ${PERK_BY_ID['venture-auto']?.name ?? 'Cart Runner'} perk.`,
      go: runner ? undefined : goto('upgrades', 'Upgrades'),
      extra: anyStored ? (
        <Button tone="free" size="sm" onClick={() => dispatch({ type: 'collectAllVentures' })}>
          Collect all now
        </Button>
      ) : null,
    })
  }

  // 7. Strategy tournaments
  if (s.menus.strategy) {
    const owned = (s.upgrades['tourney-while-full'] ?? 0) >= 1
    rows.push({
      id: 'tourney',
      title: 'Tournaments',
      what: 'Runs a strategy tournament whenever Attention is full.',
      on: owned && s.compute.autoTourney !== false,
      control: owned ? (
        <Toggle checked={s.compute.autoTourney !== false} onChange={(on) => dispatch({ type: 'setAutoTourney', on })}>
          Run automatically
        </Toggle>
      ) : undefined,
      earn: owned ? undefined : `Buy ${UPGRADE_BY_ID['tourney-while-full']?.name ?? 'Tourney While Full'} in Upgrades.`,
      go: owned ? undefined : goto('upgrades', 'Upgrades'),
    })
  }

  // 8. Museum duplicates
  if (s.menus.relics) {
    const dust = s.relics.autoDust
    rows.push({
      id: 'dust',
      title: 'Dusting duplicates',
      what: 'Turns new low-rarity relics straight into dust.',
      on: !!dust,
      earn: dust ? undefined : 'Off. Pick a rarity in the Museum’s dust shop.',
      go: goto('relics', 'Museum'),
      extra: dust ? <span className="ap-note">{RARITY_INFO[dust as Rarity]?.label ?? dust} and below.</span> : null,
    })
  }

  const running = rows.filter((r) => r.on).length

  return (
    <section className="ap" aria-label="Autopilot">
      <header className="ap-head">
        <h3>Autopilot</h3>
        <p>
          {running} of {rows.length} chores run themselves. Each one is earned; this page says how.
        </p>
      </header>
      <ul className="ap-list">
        {rows.map((r) => (
          <li key={r.id} className={`ap-row${r.on ? ' is-on' : ''}`}>
            <span className={`ap-dot${r.on ? ' is-on' : ''}`} aria-hidden />
            <div className="ap-body">
              <strong>{r.title}</strong>
              <span className="ap-what">{r.what}</span>
              {r.control ?? null}
              {r.earn ? <span className="ap-earn">{r.earn}</span> : null}
              {r.extra ?? null}
            </div>
            {r.go ? (
              <button type="button" className="pf-chip__link ap-go" onClick={r.go.run}>
                {r.go.label}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

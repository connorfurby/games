import { Link } from 'react-router-dom'
import { AppMenu } from '@/shell/AppMenu'
import type { NumberFormat } from '@/shared/bn'
import { ERA_STORY } from '../../content/lore'
import { MENUS, type MenuId } from '../../content/menus'
import type { Command } from '../../sim/commands'
import { engine } from '../../sim/engine'
import { salesBottleneck } from '../../sim/formulas'
import type { GameState } from '../../sim/state'
import { canResolveBoard } from '../../sim/systems/capital'
import { canUndo } from '../../sim/undo'
import { PopLayer, type PopItem } from '../components/Pop'
import { money, qty } from '../format'
import { Icon } from '../icons/Icon'
import { NextGoal } from './NextGoal'

function perSec(n: number, fmt: NumberFormat) {
  const sign = n < 0 ? '−' : '+'
  return `${sign}${money(Math.abs(n), fmt)}/s`
}

const LIMIT_COPY: Record<string, string> = {
  shelf: 'Shelves run empty',
  unpack: 'Unpacking can’t keep up',
  checkout: 'The checkout line is the limit',
  demand: 'More shoppers would sell more',
}

export function Hud({
  state: s,
  pops,
  speeds,
  numberFormat,
  dispatch,
  onMenu,
  inboxCount,
  inboxOpen,
  onInbox,
}: {
  state: GameState
  pops: PopItem[]
  speeds: number[]
  numberFormat: NumberFormat
  dispatch: (cmd: Command) => void
  onMenu: (id: MenuId) => void
  inboxCount: number
  inboxOpen: boolean
  onInbox: () => void
}) {
  const net = s.rates.revenuePerSec - s.rates.costPerSec
  const era = ERA_STORY[s.era]
  const undo = canUndo()

  // One alert at a time, most urgent first.
  let alert: { text: string; menu: MenuId; tone: 'warn' | 'danger' } | null = null
  if (s.era >= 2 && canResolveBoard(s) === null) {
    alert = { text: 'The board is waiting on an agenda', menu: 'books', tone: 'danger' }
  } else if (s.era >= 2 && s.stores.some((st) => (st.drift ?? 0) >= 0.55)) {
    alert = { text: 'A store is drifting — walk it', menu: 'land', tone: 'warn' }
  } else if (s.era >= 1 && s.stats.sold > 0) {
    const b = salesBottleneck(s)
    if (b.kind !== 'demand') {
      const dest: MenuId = b.kind === 'shelf' ? (s.backroom.length ? 'floor' : 'suppliers') : 'staff'
      alert = { text: LIMIT_COPY[b.kind] ?? b.label, menu: s.menus[dest] ? dest : 'floor', tone: 'warn' }
    }
  }

  return (
    <header className="g2-hud">
      <div className="g2-hud__brand">
        <Link to="/" className="g2-hud__home" title="Back to the shelf">
          Grocery Empire
        </Link>
        <span className="g2-hud__era" title={era?.epigraph}>
          {era?.title ?? `Era ${s.era}`}
        </span>
      </div>

      <div className="g2-hud__money">
        <div className="g2-stat g2-stat--cash" data-coach-id="floor-cash">
          <span className="g2-stat__label">
            <Icon name="cash" size={13} /> Cash
          </span>
          <span className="g2-stat__value">{money(s.cash, numberFormat)}</span>
          <span className={`g2-stat__rate${net < 0 ? ' is-neg' : ''}`} title="Net income, smoothed over 45 s">
            {perSec(net, numberFormat)}
          </span>
        </div>
        <div className="g2-stat g2-stat--baskets" data-coach-id="floor-baskets">
          <span className="g2-stat__label">
            <Icon name="baskets" size={13} /> Baskets
          </span>
          <span className="g2-stat__value g2-stat__value--small">
            {qty(s.baskets, numberFormat)}
            <PopLayer pops={pops} />
          </span>
          <span className="g2-stat__rate">
            {s.rates.soldPerSec < 100 ? s.rates.soldPerSec.toFixed(1) : qty(s.rates.soldPerSec, numberFormat)}/s
          </span>
        </div>
      </div>

      <NextGoal state={s} numberFormat={numberFormat} dispatch={dispatch} />

      <div className="g2-hud__controls">
        {alert ? (
          <button
            type="button"
            className={`g2-alert is-${alert.tone}`}
            onClick={() => onMenu(alert.menu)}
            title={`Open ${MENUS[alert.menu].name}`}
          >
            {alert.text}
          </button>
        ) : null}
        <div className="g2-transport" role="group" aria-label="Time">
          <button
            type="button"
            className={`g2-icon-btn${s.paused ? ' is-on' : ''}`}
            onClick={() => dispatch({ type: 'setPaused', paused: !s.paused })}
            title={s.paused ? 'Resume (Space)' : 'Pause (Space)'}
            aria-pressed={s.paused}
          >
            {s.paused ? '▶' : '❚❚'}
          </button>
          {speeds.map((sp) => (
            <button
              key={sp}
              type="button"
              className={`g2-icon-btn g2-icon-btn--text${s.speed === sp ? ' is-on' : ''}`}
              aria-pressed={s.speed === sp}
              onClick={() => dispatch({ type: 'setSpeed', speed: sp })}
            >
              {sp}×
            </button>
          ))}
          <button
            type="button"
            className="g2-icon-btn g2-icon-btn--text"
            disabled={!engine.canUndo()}
            onClick={() => engine.undo()}
            title={undo.ok ? `Undo ${undo.label ?? 'last purchase'} (Ctrl+Z)` : 'Nothing to undo'}
          >
            Undo
          </button>
        </div>
        <button
          type="button"
          className={`g2-inbox-btn${inboxOpen ? ' is-on' : ''}`}
          onClick={onInbox}
          aria-expanded={inboxOpen}
          title="Memos and the ledger (M)"
        >
          <Icon name="memo" size={16} />
          <span>Memos</span>
          {inboxCount > 0 ? <span className="g2-badge">{inboxCount}</span> : null}
        </button>
        {s.menus.coach ? (
          <button type="button" className="g2-icon-btn" onClick={() => onMenu('coach')} title="Coach lessons">
            <Icon name="coach" size={16} />
          </button>
        ) : null}
        <button type="button" className="g2-icon-btn" onClick={() => onMenu('more')} title="Saves, settings and tools">
          <Icon name="more" size={16} />
        </button>
        <AppMenu placement="inline" />
      </div>
    </header>
  )
}

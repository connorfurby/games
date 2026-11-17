import { Link } from 'react-router-dom'
import { useStable } from '../useStable'
import type { NumberFormat } from '@/shared/bn'
import { ERA_STORY } from '../../content/lore'
import { MENUS, type MenuId } from '../../content/menus'
import type { Command } from '../../sim/commands'
import type { GameState } from '../../sim/state'
import { canUndo, undoLabel, undoSecondsLeft } from '../../sim/undo'
import { computeHudAlert } from './hudAlert'
import { performUndo } from './undoAction'
import { PopLayer, type PopItem } from '../components/Pop'
import { useFlash, useTween } from '../fx'
import { money, qty, shortFigure } from '../format'
import { Icon } from '../icons/Icon'
import { NextGoal } from './NextGoal'

function perSec(n: number, fmt: NumberFormat) {
  const sign = n < 0 ? '−' : '+'
  return `${sign}${money(Math.abs(n), fmt)}/s`
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
  toolsOpen,
  onTools,
  reducedMotion = false,
  activeMenu,
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
  toolsOpen: boolean
  onTools: () => void
  reducedMotion?: boolean
  activeMenu?: MenuId
}) {
  const net = s.rates.revenuePerSec - s.rates.costPerSec
  const era = ERA_STORY[s.era]
  const undo = canUndo()
  const undoText = undoLabel(undo.label ?? 'last purchase')
  const undoLeft = undoSecondsLeft()
  const cashShown = useTween(s.cash, { duration: reducedMotion ? 0 : 420, reducedMotion, snapRatio: 0.35 })
  const cashFlash = useFlash(s.cash, { minRatio: 0.015, minDelta: 1 })
  const basketsShown = useTween(s.baskets, { duration: reducedMotion ? 0 : 380, reducedMotion, snapRatio: 0.4 })
  const basketsFlash = useFlash(s.baskets, { minRatio: 0.02, minDelta: 0.5 })

  // One alert at a time, most urgent first (shared with hidden-tab notifications).
  // Bottleneck alerts swing with every crate; only change the banner when it settles.
  const alert = useStable(computeHudAlert(s), (a) => a?.text ?? '', 2000, 5000)

  return (
    <header className="g2-hud">
      <div className="g2-hud__brand">
        <Link to="/" className="g2-hud__home" title="Back to the shelf" data-coach-id="meta-shelf">
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
          <span className="g2-stat__value" data-fx-flash={cashFlash ?? undefined} title={money(cashShown, 'named')}>
            <span className="g2-stat__full">{money(cashShown, 'named')}</span>
            <span className="g2-stat__short" aria-hidden="true">
              {shortFigure(money(cashShown, 'named'))}
            </span>
          </span>
          <span className={`g2-stat__rate${net < 0 ? ' is-neg' : ''}`} title="Net income, smoothed over 45 s">
            {perSec(net, 'named')}
          </span>
        </div>
        <div className="g2-stat g2-stat--baskets" data-coach-id="floor-baskets">
          <span className="g2-stat__label">
            <Icon name="baskets" size={13} /> Baskets
          </span>
          <span className="g2-stat__value g2-stat__value--small" data-fx-flash={basketsFlash ?? undefined}>
            <span className="g2-stat__full">{qty(basketsShown, 'named')}</span>
            <span className="g2-stat__short" aria-hidden="true">
              {shortFigure(qty(basketsShown, 'named'))}
            </span>
            <PopLayer pops={pops} />
          </span>
          <span className="g2-stat__rate">
            {s.rates.soldPerSec < 100 ? s.rates.soldPerSec.toFixed(1) : qty(s.rates.soldPerSec, 'named')}/s
          </span>
        </div>
      </div>

      <NextGoal state={s} numberFormat={numberFormat} dispatch={dispatch} activeMenu={activeMenu} onMenu={onMenu} />

      {alert ? (
        <button
          type="button"
          className={`g2-alert g2-alert--hang is-${alert.tone}`}
          onClick={() => onMenu(alert.menu)}
          title={`Open ${MENUS[alert.menu].name}`}
        >
          {alert.text}
        </button>
      ) : null}

      <div className="g2-hud__controls">
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
              className={`g2-icon-btn g2-icon-btn--speed${s.speed === sp ? ' is-on' : ''}`}
              aria-pressed={s.speed === sp}
              aria-label={`Speed ${sp}×`}
              title={`Speed ${sp}×`}
              onClick={() => dispatch({ type: 'setSpeed', speed: sp })}
            >
              <span aria-hidden>{sp}×</span>
              <span className="ge-sr-only">{sp}×</span>
            </button>
          ))}
          {/* Phones: one button cycles the speeds so the HUD fits on one row. */}
          <button
            type="button"
            className="g2-icon-btn g2-icon-btn--cycle"
            aria-label={`Speed ${s.speed}×, tap for ${speeds[(speeds.indexOf(s.speed) + 1) % speeds.length]}×`}
            title="Change speed"
            onClick={() => dispatch({ type: 'setSpeed', speed: speeds[(speeds.indexOf(s.speed) + 1) % speeds.length]! })}
          >
            {s.speed}×
          </button>
          <button
            type="button"
            className="g2-icon-btn g2-icon-btn--undo"
            disabled={!undo.ok}
            onClick={() => performUndo()}
            aria-label={undo.ok ? `Undo ${undoText}` : 'Nothing to undo'}
            title={undo.ok ? `Undo ${undoText} · ${undoLeft}s left (Ctrl+Z)` : 'Nothing to undo'}
          >
            <span aria-hidden>↶</span>
            <span className="g2-icon-btn__label">{undo.ok ? `Undo ${undoText}` : 'Undo'}</span>
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
          <button type="button" className="g2-icon-btn g2-icon-btn--coach" onClick={() => onMenu('coach')} title="Coach lessons">
            <Icon name="coach" size={16} />
          </button>
        ) : null}
        <button
          type="button"
          className={`g2-icon-btn g2-menu-btn${toolsOpen ? ' is-on' : ''}`}
          onClick={onTools}
          aria-expanded={toolsOpen}
          aria-label="Menu"
          title="Saves, settings and tools"
        >
          <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden>
            {[0, 1, 2].flatMap((r) =>
              [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={1 + c * 6} y={1 + r * 6} width="4" height="4" rx="0.6" fill="currentColor" />),
            )}
          </svg>
        </button>
      </div>
    </header>
  )
}

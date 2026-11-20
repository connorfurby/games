import { longNumber } from '@/shared/bn'
import { Link } from 'react-router-dom'
import { useStable } from '../useStable'
import type { NumberFormat } from '@/shared/bn'
import { ERA_STORY } from '../../content/lore'
import { MENUS, type MenuId } from '../../content/menus'
import type { Command } from '../../sim/commands'
import { storeDisplayName, type GameState } from '../../sim/state'
import { AccountChrome } from '@/shell/AccountChrome'
import { useMeta } from '@/shell/MetaContext'
import { sfx } from '@/shared/audio'
import { canUndo, undoLabel, undoSecondsLeft } from '../../sim/undo'
import { computeHudAlert } from './hudAlert'
import { PauseReminder } from './PauseReminder'
import { performUndo } from './undoAction'
import { storySilence } from '../../sim/pause'
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
        <Link to="/" className="g2-hud__home" aria-label="Back to shelf" title="Back to the shelf" data-coach-id="meta-shelf">
          {storeDisplayName(s)}
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
          <span className="g2-stat__value" data-fx-flash={cashFlash ?? undefined} title={`$${longNumber(cashShown)}`}>
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
          <span
            className="g2-stat__value g2-stat__value--small"
            data-fx-flash={basketsFlash ?? undefined}
            title={`${longNumber(basketsShown)} baskets`}
          >
            <span className="g2-stat__full">{qty(basketsShown, 'named')}</span>
            <span className="g2-stat__short" aria-hidden="true">
              {shortFigure(qty(basketsShown, 'named'))}
            </span>
          </span>
          {/* Floaters rise beside the column, never over the number. */}
          <PopLayer pops={pops} />
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
        <div className="g2-transport" role="group" aria-label="Pause">
          <button
            type="button"
            className={`g2-icon-btn${s.paused ? ' is-on' : ''}`}
            onClick={() => dispatch({ type: 'setPaused', paused: !s.paused })}
            title={s.paused ? 'Resume (Space)' : 'Pause (Space)'}
            aria-label={s.paused ? 'Resume' : 'Pause'}
            aria-pressed={s.paused}
          >
            <span aria-hidden>{s.paused ? '▶' : '❚❚'}</span>
          </button>
        </div>
        <button
          type="button"
          className="g2-icon-btn g2-icon-btn--undo"
          disabled={!undo.ok}
          // Nothing to undo: keep the slot (no layout shift) but do not show a dead button.
          style={undo.ok ? undefined : { visibility: 'hidden' }}
          aria-hidden={undo.ok ? undefined : true}
          tabIndex={undo.ok ? undefined : -1}
          onClick={() => performUndo()}
          aria-label={undo.ok ? `Undo ${undoText}` : 'Nothing to undo'}
          title={undo.ok ? `Undo ${undoText} · ${undoLeft}s left (Ctrl+Z)` : 'Nothing to undo'}
        >
          <span aria-hidden>↶</span>
          <span className="g2-icon-btn__label">{undo.ok ? `Undo ${undoText}` : 'Undo'}</span>
        </button>
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
        <SoundButton />
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
        <AccountChrome tone="play" className="g2-hud__account" />
      </div>
      <PauseReminder
        paused={s.paused}
        quiet={storySilence(s)}
        onResume={() => dispatch({ type: 'setPaused', paused: false })}
      />
    </header>
  )
}

/** One tap to turn sound and music on or off. The mixer lives in Settings. */
function SoundButton() {
  const { meta, updateSettings } = useMeta()
  const on = !meta.settings.muted
  return (
    <button
      type="button"
      className={`g2-icon-btn g2-icon-btn--sound${on ? ' is-on' : ''}`}
      aria-pressed={on}
      aria-label={on ? 'Sound on. Tap to mute' : 'Sound off. Tap to turn on'}
      title={on ? 'Sound on' : 'Sound off'}
      onClick={() => {
        updateSettings({ muted: on })
        if (!on) window.setTimeout(() => sfx.purchase(), 80)
      }}
    >
      <svg
        viewBox="0 0 18 18"
        width="16"
        height="16"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 7h2.5L9 4v10l-3.5-3H3V7Z" />
        {on ? <path d="M11.5 6.5a3.5 3.5 0 0 1 0 5M13.6 4.6a6.2 6.2 0 0 1 0 8.8" /> : <path d="m12 7 4 4m0-4-4 4" />}
      </svg>
    </button>
  )
}

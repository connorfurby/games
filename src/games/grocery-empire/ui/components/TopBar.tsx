import { Link } from 'react-router-dom'
import { AppMenu } from '@/shell/AppMenu'
import { MENUS, type MenuId } from '../../content/menus'
import { ERA_STORY } from '../../content/lore'
import { salesBottleneck } from '../../sim/formulas'
import { canResolveBoard } from '../../sim/systems/capital'
import { engine } from '../../sim/engine'
import type { GameState } from '../../sim/state'
import { canUndo } from '../../sim/undo'
import { money, qty, rate } from '../format'
import { Icon } from '../icons/Icon'
import { Btn } from './Btn'
import { PopLayer, type PopItem } from './Pop'

type TopChip = {
  id: string
  label: string
  value: string
  title: string
  menu: MenuId
  tone?: 'warn' | 'danger'
}

export function TopBar({
  state,
  snapV,
  pops,
  speeds,
  numberFormat,
  onPause,
  onSpeed,
  fxVenture,
  ventureAmt,
  onJumpMenu,
}: {
  state: GameState
  snapV: number
  pops: PopItem[]
  speeds: number[]
  numberFormat: 'named' | 'scientific' | 'engineering' | 'full'
  onPause: () => void
  onSpeed: (n: number) => void
  fxVenture?: boolean
  ventureAmt?: number
  onJumpMenu?: (id: MenuId) => void
}) {
  const undoGate = canUndo()
  const net = state.rates.cashPerSec ?? state.rates.revenuePerSec - state.rates.costPerSec
  const eraTitle = ERA_STORY[state.era]?.title ?? `Era ${state.era}`
  const eraTip = ERA_STORY[state.era]?.epigraph ?? eraTitle

  const chips: TopChip[] = []
  if (state.era >= 1) {
    const b = salesBottleneck(state)
    const dest: MenuId =
      b.kind === 'demand' ? 'marketing' : b.kind === 'shelf' ? (state.backroom.length ? 'floor' : 'suppliers') : 'staff'
    chips.push({
      id: 'bottleneck',
      label: 'Limit',
      value: b.kind,
      title: `${b.label} — open ${MENUS[dest].name}`,
      menu: state.menus[dest] ? dest : 'floor',
      tone: b.kind === 'demand' ? undefined : 'warn',
    })
  }
  if (state.era >= 2) {
    if (canResolveBoard(state) === null) {
      chips.push({
        id: 'board',
        label: 'Board',
        value: 'due',
        title: 'Board meeting due — pick an agenda in Books',
        menu: 'books',
        tone: 'danger',
      })
    }
    let worst = 0
    for (const st of state.stores) worst = Math.max(worst, st.drift ?? 0)
    if (worst >= 0.55) {
      chips.push({
        id: 'drift',
        label: 'Drift',
        value: `${Math.round(worst * 100)}%`,
        title: 'A store is drifting — Walk it in Land',
        menu: 'land',
        tone: worst >= 0.7 ? 'danger' : 'warn',
      })
    }
  }

  const jump = (id: MenuId) => {
    if (onJumpMenu) onJumpMenu(id)
  }

  return (
    <header className="ge-top">
      <div className="ge-top__score">
        <div
          className="ge-baskets"
          data-coach-id="floor-baskets"
          title={
            state.compute?.unlocked
              ? `Next Reputation +1 at ${qty(state.compute.nextRepAt, numberFormat)} baskets (${Math.max(0, Math.ceil(state.compute.nextRepAt - state.baskets)).toLocaleString()} to go)`
              : 'Baskets are the score'
          }
        >
          <span className="ge-baskets__label">
            <Icon name="baskets" size={14} /> Baskets
          </span>
          <div className="ge-baskets__value">
            <span className="ge-baskets__num">{qty(state.baskets, numberFormat)}</span>
            <PopLayer pops={pops} />
          </div>
          {state.compute?.unlocked ? (
            <span className="ge-baskets__rep" aria-label="Next Reputation milestone">
              Rep @ {qty(state.compute.nextRepAt, numberFormat)}
            </span>
          ) : null}
        </div>

        <div className="ge-top__cash">
          <span className="ge-top__cash-label">
            <Icon name="cash" size={14} /> Cash
          </span>
          <span className="ge-top__cash-num">{money(state.cash, numberFormat)}</span>
          {fxVenture ? (
            <span className="ge-venture-arc" aria-hidden>
              +{Math.max(1, Math.round(ventureAmt || 1))}
            </span>
          ) : null}
        </div>
      </div>

      <div className="ge-top__mid">
        <div className="ge-top__era-wrap">
          <span className="ge-top__era" title={eraTip}>
            {eraTitle}
          </span>
          {chips.length > 0 ? (
            <div className="ge-top__chips" role="group" aria-label="Attention">
              {chips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`ge-top__chip${c.tone ? ` is-${c.tone}` : ''}`.trim()}
                  title={c.title}
                  onClick={() => jump(c.menu)}
                >
                  <span>{c.label}</span>
                  <strong>{c.value}</strong>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <span
          className={`ge-live${state.paused ? ' is-paused' : ''}`}
          title={state.paused ? 'Paused' : `Live · tick ${snapV}`}
          aria-label={state.paused ? 'Paused' : 'Live'}
        >
          <i className="ge-live__dot" aria-hidden />
          {state.paused ? 'Paused' : 'Live'}
        </span>

        <div className="ge-top__transport" role="group" aria-label="Playback">
          <Btn tone={state.paused ? 'primary' : 'ghost'} onClick={onPause}>
            {state.paused ? 'Resume' : 'Pause'}
          </Btn>
          <Btn
            tone="ghost"
            disabled={!engine.canUndo()}
            title={
              undoGate.ok
                ? `Undo ${undoGate.label ?? 'last action'} (Ctrl+Z · 5s)`
                : 'Nothing to undo (Ctrl+Z · 5s)'
            }
            onClick={() => engine.undo()}
          >
            Undo
          </Btn>
          <div className="ge-speed" role="group" aria-label="Speed">
            {speeds.map((sp) => (
              <button
                key={sp}
                type="button"
                className={`ge-speed__btn${state.speed === sp ? ' is-on' : ''}`}
                aria-pressed={state.speed === sp}
                onClick={() => onSpeed(sp)}
              >
                {sp}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ge-top__pace" aria-label="Pace">
        <div className="ge-top__pace-item" title="Sold per second">
          <span>Sold</span>
          <strong>{rate(state.rates.soldPerSec)}</strong>
        </div>
        <div className="ge-top__pace-item" title="Revenue per second">
          <span>Rev</span>
          <strong>{rate(state.rates.revenuePerSec)}</strong>
        </div>
        <div
          className={`ge-top__pace-item${net < 0 ? ' is-neg' : ' is-pos'}`}
          title="Smoothed cash change per second — sales, side income, rent, wages, and debt"
        >
          <span>Cash</span>
          <strong>{rate(net)}</strong>
        </div>
      </div>

      <div className="ge-top__nav">
        <Link className="ge-top__link" to="/" data-coach-id="meta-shelf" title="Home · Shelf">
          Home
        </Link>
        <AppMenu placement="inline" />
      </div>
    </header>
  )
}

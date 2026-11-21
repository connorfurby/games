import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DECAY, ERA_TITLES } from '../../sim/balance'
import { getSignalEngine } from '../../sim/engine'
import { clarity } from '../../sim/helpers'
import type { GameState } from '../../sim/state'
import { useFlash, useTween } from '../fx'
import { money, pct, qty } from '../format'
import { AccountChrome } from '@/shell/AccountChrome'
import { storySilence } from '../../sim/pause'
import { useGame } from '../GameContext'
import { NextGoal } from './NextGoal'
import { PauseReminder } from './PauseReminder'

const SPEEDS = [1, 2, 4, 8] as const
const HEAT_HIGH = DECAY.heatMax * 0.7
const INVOICE_WARN_SEC = 30

interface Alert {
  id: 'clarity' | 'heat' | 'invoice'
  tone: 'warn' | 'danger'
  text: string
  menu: string
}

function bottleneck(s: GameState, c: number): Alert | null {
  if (s.air.tuned && c < DECAY.clarityFloor) {
    return { id: 'clarity', tone: 'danger', text: 'Clarity under the floor — hold Lock', menu: 'air' }
  }
  if (s.air.heat >= HEAT_HIGH) {
    return { id: 'heat', tone: 'warn', text: 'Board is hot — sign a Heat Log', menu: 'plant' }
  }
  if (s.depth.invoices.some((i) => !i.paid && s.time >= i.dueAt - INVOICE_WARN_SEC)) {
    return { id: 'invoice', tone: 'warn', text: 'Invoice due — open Books', menu: 'books' }
  }
  return null
}

export function Hud({ onMore }: { onMore?: () => void }) {
  const { state, dispatch, setActiveMenu, reducedMotion } = useGame()
  const engine = getSignalEngine()
  const c = clarity(state)
  const under = state.air.tuned && c < DECAY.clarityFloor
  const era = ERA_TITLES[state.era] ?? `Era ${state.era}`
  const alert = bottleneck(state, c)

  const cashShown = useTween(state.cash, reducedMotion ? 0 : 420)
  const cashFlash = useFlash(state.cash)
  const starsFlash = useFlash(state.depth.stars)

  const [, bump] = useState(0)
  const canUndo = engine.canUndo()
  const undoDeadline = engine.undoDeadline()
  useEffect(() => {
    if (!undoDeadline) return
    const wait = Math.max(20, undoDeadline - Date.now() + 20)
    const id = window.setTimeout(() => bump((n) => n + 1), wait)
    return () => window.clearTimeout(id)
  }, [undoDeadline])

  const speeds = SPEEDS as readonly number[]
  const speed = speeds.includes(state.speed) ? state.speed : 1
  const nextSpeed = speeds[(speeds.indexOf(speed) + 1) % speeds.length]!

  return (
    <header className="sd-hud">
      <div className="sd-hud__brand">
        <Link to="/" className="sd-hud__home" aria-label="Back to shelf" title="Back to the shelf" data-coach-id="meta-shelf">
          Signal Decay
        </Link>
        <span className="sd-hud__era">{era}</span>
      </div>

      <div className="sd-hud__money">
        <div className="sd-stat sd-stat--cash" data-coach-id="hud-cash">
          <span className="sd-stat__label">Cash</span>
          <span className="sd-stat__value" data-fx-flash={cashFlash ?? undefined}>
            {money(cashShown)}
          </span>
          <span className="sd-stat__rate">+{money(state.rates.revenuePerSec)}/s</span>
        </div>
        <div className="sd-stat" data-coach-id="hud-clarity">
          <span className="sd-stat__label">Clarity</span>
          <span className={`sd-stat__value sd-stat__value--sm${under ? ' is-warn' : ''}`}>{pct(c)}</span>
          <span className="sd-stat__meter" aria-hidden>
            <i style={{ width: `${Math.max(0, Math.min(1, c)) * 100}%` }} />
          </span>
        </div>
        <div className="sd-stat sd-stat--stars" data-coach-id="hud-stars">
          <span className="sd-stat__label">Stars</span>
          <span
            className={`sd-stat__value sd-stat__value--sm${starsFlash ? ` is-flash-${starsFlash}` : ''}`}
            title="Star Board soft-caps demand"
          >
            {qty(state.depth.stars, 1)}★
          </span>
        </div>
      </div>

      <NextGoal />

      {alert ? (
        <button
          type="button"
          className={`sd-alert sd-alert--hang is-${alert.tone}`}
          onClick={() => setActiveMenu(alert.menu)}
          title={`Open ${alert.menu}`}
        >
          {alert.text}
        </button>
      ) : null}

      <div className="sd-hud__controls">
        <div className="sd-transport" role="group" aria-label="Time">
          <button
            type="button"
            className={`sd-icon-btn${state.paused ? ' is-on' : ''}`}
            onClick={() => dispatch({ type: 'setPaused', paused: !state.paused })}
            title={state.paused ? 'Resume' : 'Pause'}
            aria-label={state.paused ? 'Resume' : 'Pause'}
            aria-pressed={state.paused}
          >
            {state.paused ? '▶' : '❚❚'}
          </button>
          {speeds.map((sp) => (
            <button
              key={sp}
              type="button"
              className={`sd-icon-btn sd-icon-btn--speed${speed === sp ? ' is-on' : ''}`}
              aria-pressed={speed === sp}
              aria-label={`Speed ${sp}×`}
              title={`Speed ${sp}×`}
              onClick={() => dispatch({ type: 'setSpeed', speed: sp })}
            >
              {sp}×
            </button>
          ))}
          <button
            type="button"
            className="sd-icon-btn sd-icon-btn--cycle"
            aria-label={`Speed ${speed}×, tap for ${nextSpeed}×`}
            title="Change speed"
            onClick={() => dispatch({ type: 'setSpeed', speed: nextSpeed })}
          >
            {speed}×
          </button>
          <button
            type="button"
            className="sd-icon-btn sd-icon-btn--undo"
            disabled={!canUndo}
            title={canUndo ? 'Undo last purchase' : 'Nothing to undo'}
            onClick={() => dispatch({ type: 'undo' })}
          >
            <span aria-hidden>↶</span>
            <span className="sd-icon-btn__label">Undo</span>
          </button>
        </div>
        {onMore ? (
          <button type="button" className="sd-icon-btn sd-menu-btn" onClick={onMore} aria-label="More" title="Wiki, museum, settings">
            <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden>
              {[0, 1, 2].flatMap((r) =>
                [0, 1, 2].map((c) => (
                  <rect key={`${r}${c}`} x={1 + c * 6} y={1 + r * 6} width="4" height="4" rx="0.6" fill="currentColor" />
                )),
              )}
            </svg>
          </button>
        ) : null}
        <AccountChrome tone="play" className="sd-hud__account" />
      </div>
      <PauseReminder
        paused={state.paused}
        quiet={storySilence(state)}
        onResume={() => dispatch({ type: 'setPaused', paused: false })}
      />
    </header>
  )
}

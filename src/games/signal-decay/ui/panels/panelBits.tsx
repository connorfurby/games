import type { ReactNode } from 'react'
import { can, type Command } from '../../sim/commands'
import type { GameState } from '../../sim/state'
import { Button, type ButtonTone } from '../kit/Button'
import { Meter } from '../kit/Meter'
import { useGame } from '../GameContext'
import './panels.css'

/** Seconds left on a `*ReadyAt` timestamp (0 when ready). */
export function cooldownLeft(s: GameState, readyAt: number): number {
  return Math.max(0, Math.ceil(readyAt - s.time))
}

export function clock(sec: number): string {
  const n = Math.max(0, Math.ceil(sec))
  if (n < 60) return `${n}s`
  const m = Math.floor(n / 60)
  const r = n % 60
  return r === 0 ? `${m}m` : `${m}m ${r}s`
}

/** One dispatchable verb row. Gate comes from `can()`; the sim stays the authority. */
export function ActionRow({
  cmd,
  label,
  fact,
  action,
  tone = 'secondary',
  hidden,
}: {
  cmd: Command
  label: ReactNode
  fact?: ReactNode
  action: ReactNode
  tone?: ButtonTone
  hidden?: boolean
}) {
  const { state, dispatch } = useGame()
  if (hidden) return null
  const gate = can(state, cmd)
  return (
    <div className={`sd-act${gate.ok ? '' : ' is-locked'}`}>
      <div className="sd-act__text">
        <strong>{label}</strong>
        {gate.ok ? (
          fact != null ? <span className="sd-act__fact">{fact}</span> : null
        ) : (
          <span className="sd-act__fact is-blocked">{gate.reason}</span>
        )}
      </div>
      <Button tone={tone} size="sm" disabled={!gate.ok} onClick={() => dispatch(cmd)}>
        {action}
      </Button>
    </div>
  )
}

export function Dots({ on, of }: { on: number; of: number }) {
  return (
    <span className="sd-dots" aria-label={`${Math.min(on, of)} of ${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={i < on ? 'is-on' : ''} />
      ))}
    </span>
  )
}

export function MeterRow({
  label,
  value,
  text,
  warn,
}: {
  label: string
  value: number
  text: ReactNode
  warn?: boolean
}) {
  return (
    <div className="sd-metrow">
      <span>{label}</span>
      <Meter value={value} warn={warn} label={label} />
      <span>{text}</span>
    </div>
  )
}

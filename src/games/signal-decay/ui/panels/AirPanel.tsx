import { useEffect, useRef, useState } from 'react'
import { DECAY, DEPTH } from '../../sim/balance'
import { clarity } from '../../sim/helpers'
import { programsFor } from '../../content/programs'
import { airBurstFloater } from '../fx'
import { Button } from '../kit/Button'
import { Meter } from '../kit/Meter'
import { Sheet } from '../kit/Sheet'
import { StatusChip } from '../kit/StatusChip'
import { PlayFrame } from '../play/PlayFrame'
import { DepartmentPlate } from '../scenes/DepartmentPlate'
import { ShackScene } from '../shack/ShackScene'
import { money, pct } from '../format'
import { useGame } from '../GameContext'

const FORMATS = ['talk', 'record', 'night', 'weather', 'pledge', 'static'] as const

type Step = 0 | 1 | 2 | 3

/** Air = GE-style one primary verb; the loop step decides which. */
export function AirPanel() {
  const { state: s, dispatch, reducedMotion } = useGame()
  const [callersOpen, setCallersOpen] = useState(false)
  const lastBurst = useRef(s.air.lastBurstAt)
  const c = clarity(s)
  const under = s.air.tuned && c < DECAY.clarityFloor

  useEffect(() => {
    if (s.air.lastBurstAt > lastBurst.current && s.air.lastBurst > 0) {
      lastBurst.current = s.air.lastBurstAt
      airBurstFloater(`+${money(s.air.lastBurst)}`)
    }
  }, [s.air.lastBurstAt, s.air.lastBurst])

  const bufferReady = s.air.logFill >= 1
  const canAir = s.air.cleanLogs > 0 && s.time >= s.air.airReadyAt
  const era0Need = DEPTH.era0CleanLogs
  const progress = s.era === 0 ? Math.min(1, s.depth.cleanLogsLifetime / era0Need) : null
  // Priority: spend a ready log → capture a full buffer → hold → sweep.
  const step: Step = canAir ? 3 : bufferReady ? 2 : s.air.tuned ? 1 : 0
  const stepLabel = ['Sweep a carrier', 'Hold Lock until the buffer fills', 'Log the clean copy', 'Air it for cash'][
    step
  ]!

  const onHoldDown = () => {
    if (!s.air.tuned) return
    dispatch({ type: 'setHolding', on: true })
  }
  const onHoldUp = () => dispatch({ type: 'setHolding', on: false })

  return (
    <>
      <PlayFrame
        helpMenu="air"
        purpose={stepLabel}
        room={
          <DepartmentPlate plate="air" dim={0.35}>
            <div className="sd-shack-wrap">
              <ShackScene interactive />
              <div className="sd-air-strip" aria-live="polite">
                <div className={`sd-air-strip__cell${under ? ' is-warn' : ''}`}>
                  <span className="sd-air-strip__label">Clarity</span>
                  <strong>{pct(c)}</strong>
                  <span className="sd-air-strip__meter" aria-hidden>
                    <i style={{ width: `${Math.max(0, Math.min(1, c)) * 100}%` }} />
                  </span>
                </div>
                <div className="sd-air-strip__cell">
                  <span className="sd-air-strip__label">Buffer</span>
                  <strong>{pct(s.air.logFill)}</strong>
                  <span className="sd-air-strip__meter" aria-hidden>
                    <i style={{ width: `${s.air.logFill * 100}%` }} />
                  </span>
                </div>
                <div className="sd-air-strip__cell">
                  <span className="sd-air-strip__label">Ready</span>
                  <strong>×{s.air.cleanLogs}</strong>
                </div>
              </div>
              {progress != null ? (
                <div className="sd-progress sd-progress--overlay">
                  <div className="sd-progress__label">
                    Neighborhood {s.depth.cleanLogsLifetime}/{era0Need}
                  </div>
                  <Meter value={progress} label="Neighborhood" />
                </div>
              ) : null}
            </div>
          </DepartmentPlate>
        }
        primarySlot={
          <div className="sd-air-board">
            <ol className="sd-loop-rail" aria-label="Air loop">
              {(['Sweep', 'Hold', 'Log', 'Air'] as const).map((label, i) => (
                <li
                  key={label}
                  className={`sd-loop-rail__step${i === step ? ' is-now' : ''}${i < step ? ' is-done' : ''}`}
                >
                  <span className="sd-loop-rail__n">{i + 1}</span>
                  {label}
                </li>
              ))}
            </ol>

            <div className="sd-air-primary">
              {step === 0 ? (
                <Button
                  tone="free"
                  size="lg"
                  className="sd-air-hero sd-air-hero--pulse"
                  coachId="verb-sweep"
                  disabled={s.time < s.air.tuneReadyAt}
                  onClick={() => dispatch({ type: 'tune' })}
                >
                  Sweep dial
                </Button>
              ) : null}

              {step === 1 ? (
                <button
                  type="button"
                  className={`sd-air-hero sd-air-hero--hold${s.air.holding ? ' is-down' : ''}${!reducedMotion ? ' sd-air-hero--pulse' : ''}`}
                  data-coach-id="verb-hold"
                  disabled={!s.air.tuned}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    onHoldDown()
                  }}
                  onPointerUp={onHoldUp}
                  onPointerCancel={onHoldUp}
                  onPointerLeave={onHoldUp}
                >
                  <span className="sd-air-hero__kicker">{under ? 'Clarity under floor' : 'Free verb'}</span>
                  <strong>{s.air.holding ? 'Holding…' : 'Hold Lock'}</strong>
                  <span className="sd-air-hero__hint">Press & hold · buffer {pct(s.air.logFill)}</span>
                  <span className="sd-air-hero__meter" aria-hidden>
                    <span style={{ width: `${s.air.logFill * 100}%` }} />
                  </span>
                </button>
              ) : null}

              {step === 2 ? (
                <Button
                  tone="free"
                  size="lg"
                  className="sd-air-hero sd-air-hero--pulse"
                  coachId="verb-log"
                  disabled={!bufferReady}
                  onClick={() => dispatch({ type: 'log' })}
                >
                  Log clean copy
                </Button>
              ) : null}

              {step === 3 ? (
                <Button
                  tone="primary"
                  size="lg"
                  className="sd-air-hero sd-air-hero--pulse"
                  coachId="verb-air"
                  disabled={!canAir}
                  onClick={() => dispatch({ type: 'air' })}
                >
                  Air ×{s.air.cleanLogs}
                </Button>
              ) : null}
            </div>

            <div className="sd-air-secs" role="group" aria-label="Other loop actions">
              <Button
                tone="secondary"
                size="sm"
                coachId="verb-sweep"
                disabled={step === 0 || s.time < s.air.tuneReadyAt}
                onClick={() => dispatch({ type: 'tune' })}
                title="Retune"
              >
                <span className="pf-row__main">
                  <span className="pf-row__label">Dial</span>
                  <span className="pf-row__fact">
                    {s.air.tuned ? `${s.air.frequency.toFixed(1)}` : 'Sweep'}
                  </span>
                </span>
              </Button>
              <Button
                tone="secondary"
                size="sm"
                disabled={step === 1 || !s.air.tuned}
                onPointerDown={(e) => {
                  if (step === 1) return
                  e.currentTarget.setPointerCapture(e.pointerId)
                  onHoldDown()
                }}
                onPointerUp={onHoldUp}
                onPointerCancel={onHoldUp}
                title="Hold Lock"
              >
                <span className="pf-row__main">
                  <span className="pf-row__label">Lock</span>
                  <span className="pf-row__fact">{pct(s.air.logFill)}</span>
                </span>
              </Button>
              <Button
                tone="secondary"
                size="sm"
                coachId="verb-log"
                disabled={step === 2 || !bufferReady}
                onClick={() => dispatch({ type: 'log' })}
              >
                <span className="pf-row__main">
                  <span className="pf-row__label">Log</span>
                  <span className="pf-row__fact">{bufferReady ? 'Ready' : 'Wait'}</span>
                </span>
              </Button>
              <Button
                tone="secondary"
                size="sm"
                coachId="verb-air"
                disabled={step === 3 || !canAir}
                onClick={() => dispatch({ type: 'air' })}
              >
                <span className="pf-row__main">
                  <span className="pf-row__label">Air</span>
                  <span className="pf-row__fact">×{s.air.cleanLogs}</span>
                </span>
              </Button>
            </div>
          </div>
        }
      >
        {s.era >= 1 ? (
          <div className="sd-air-extra">
            <div className="sd-format-row" role="group" aria-label="Featured format">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`sd-pill${s.depth.featuredFormat === f ? ' is-on' : ''}`}
                  onClick={() => dispatch({ type: 'setFormat', format: f })}
                >
                  {f}
                </button>
              ))}
            </div>
            {s.depth.featuredFormat ? (
              <div className="sd-program-row" role="group" aria-label="Show on this format">
                {programsFor(s.depth.featuredFormat).map((p) => {
                  const on = s.depth.programs[p.daypart] === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`sd-pill${on ? ' is-on' : ''}`}
                      title={p.blurb}
                      onClick={() => dispatch({ type: 'setProgram', id: p.id })}
                    >
                      {p.name}
                      <small>{p.stance}</small>
                    </button>
                  )
                })}
              </div>
            ) : null}
            <Button tone="secondary" size="sm" onClick={() => setCallersOpen(true)}>
              Callers · {s.depth.activeCaller?.name ?? 'desk'}
            </Button>
          </div>
        ) : null}
      </PlayFrame>

      <Sheet open={callersOpen} title="Caller desk" onClose={() => setCallersOpen(false)}>
        <p className="purpose">
          Active {s.depth.activeCaller?.name ?? '—'}
          {s.depth.activeCaller ? ` wants ${s.depth.activeCaller.want}` : ''}
        </p>
        <div className="sd-tray">
          <Button tone="free" onClick={() => dispatch({ type: 'serveCaller' })}>
            Serve
          </Button>
          <Button onClick={() => dispatch({ type: 'checkIn' })}>Check-in ({s.depth.checkIns})</Button>
          {s.depth.waitingCaller ? (
            <Button tone="ghost" onClick={() => dispatch({ type: 'focusCaller', which: 'waiting' })}>
              Switch to {s.depth.waitingCaller.name}
            </Button>
          ) : null}
        </div>
        <StatusChip>Served {s.depth.callersServed}</StatusChip>
      </Sheet>
    </>
  )
}

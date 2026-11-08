import { useState } from 'react'
import { CHARTER_AXES } from '../../content/lateEras'
import { can } from '../../sim/commands'
import { FLEET } from '../../sim/balance'
import { engine } from '../../sim/engine'
import { endingOpen } from '../../sim/systems/endings'
import {
  bargeCost,
  fleetHarvestPerSec,
  harvestPerBarge,
  replicationPerMin,
  warResist,
} from '../../sim/systems/fleet'
import { money, qty } from '../format'
import { useGame } from '../GameContext'
import { Btn } from '../components/Btn'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'

function eta(sec: number): string {
  if (sec < 90) return `${Math.ceil(sec)}s`
  if (sec < 5400) return `${Math.round(sec / 60)} min`
  return `${(sec / 3600).toFixed(1)} h`
}

export function FleetPanel() {
  const { state: s, dispatch, reducedMotion, numberFormat } = useGame()
  const f = s.fleet
  const showEnding = endingOpen(s) || !!s.memos['universal-ration'] || s.era >= 6
  const launchCheck = can(s, { type: 'launchBarge' })
  const driftCheck = can(s, { type: 'startDriftWar' })
  const charterCheck = can(s, { type: 'buyCharter' })
  const guardianCheck = can(s, { type: 'applyGuardian' })
  const rebootCheck = can(s, { type: 'rebootFleet' })
  const acceptCheck = can(s, { type: 'acceptEnding' })
  const rejectCheck = can(s, { type: 'rejectEnding' })
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)

  const harvest = fleetHarvestPerSec(s)
  const perBarge = harvestPerBarge(s)
  const repl = replicationPerMin(s)
  const cleared = f.biomassMax > 0 ? 1 - f.biomass / f.biomassMax : 0
  const etaSec = harvest > 0 ? f.biomass / harvest : Infinity
  const cost = bargeCost(s)
  const pool = f.charterPool
  const spent = Object.values(f.charter).reduce((a, n) => a + Math.max(0, n), 0)
  const resist = warResist(s)

  // What each Charter axis is doing right now, in plain numbers.
  const axisEffect = (id: string, lvl: number): string => {
    switch (id) {
      case 'shell':
        return lvl > 0 ? `War losses ÷${resist.toFixed(1)}` : 'No war protection'
      case 'replication':
        return lvl > 0 ? `~${repl.toFixed(repl < 10 ? 1 : 0)} free barges/min` : 'No free barges'
      case 'survey':
        return `+${Math.round(lvl * 8)}% harvest`
      case 'transit':
        return `+${Math.round(lvl * 5)}% harvest`
      case 'brand-seal':
        return lvl > 0 ? 'Brand recovers; war losses down' : 'Brand drifts with franchises'
      default:
        return ''
    }
  }

  return (
    <Panel title="Fleet" purpose="Barges harvest the biomass; clearing it ends the era." lore="fleet" className="fv">
      <section className="fv-goal" aria-label="Biomass">
        <div className="fv-goal__head">
          <h3>Clear the biomass</h3>
          <span>{f.biomass > 0 ? `${(cleared * 100).toFixed(cleared < 0.1 ? 1 : 0)}% cleared` : 'Cleared'}</span>
        </div>
        <div className="fv-bar" role="progressbar" aria-valuenow={Math.round(cleared * 100)} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ transform: `scaleX(${cleared})` }} />
        </div>
        <p className="fv-note">
          {f.biomass > 0
            ? `${qty(f.biomass, numberFormat)} left · harvesting ${qty(harvest, numberFormat)}/s${
                Number.isFinite(etaSec) ? ` · about ${eta(etaSec)} at this rate` : ' · launch a barge to start'
              }`
            : 'The universe is rationed. The ending is open below.'}
        </p>
      </section>

      <div className="fv-grid">
        <section className="fl-card" aria-label="Barges">
          <h3 className="fl-card__title">Barges</h3>
          <p className="fv-big">{qty(f.barges, numberFormat)}</p>
          <p className="fv-note">
            Each harvests {perBarge.toFixed(perBarge < 10 ? 1 : 0)}/s.
            {repl > 0 ? ` Replication adds ~${repl.toFixed(repl < 10 ? 1 : 0)} a minute for free.` : ''}
          </p>
          <div className="fl-row">
            <button
              type="button"
              className="g2-tag"
              data-coach-id="fleet-launch"
              disabled={!launchCheck.ok}
              title={launchCheck.ok ? `+${perBarge.toFixed(1)}/s harvest` : launchCheck.reason}
              onClick={() => dispatch({ type: 'launchBarge' })}
            >
              <span className="g2-tag__price">{money(cost, numberFormat)}</span>
              <span className="g2-tag__label">Launch barge</span>
            </button>
          </div>
        </section>

        <section className="fl-card" aria-label="Charter">
          <h3 className="fl-card__title">Charter</h3>
          <p className="fv-big">
            {pool} <small>unspent · {spent} placed · cap {f.charterCap}</small>
          </p>
          <p className="fv-note">Points shape every barge. Buy them with Read ({qty(s.read, numberFormat)} on hand).</p>
          <div className="fl-row">
            <Btn
              tone="primary"
              disabled={!charterCheck.ok}
              title={charterCheck.ok ? 'One Charter point' : charterCheck.reason}
              onClick={() => dispatch({ type: 'buyCharter' })}
            >
              +1 point · {FLEET.readPerCharterPoint} Read
            </Btn>
            <Btn
              tone="ghost"
              disabled={!charterCheck.ok}
              title={charterCheck.ok ? `Up to 10 points · ${FLEET.readPerCharterPoint * 10} Read` : charterCheck.reason}
              onClick={() => {
                for (let i = 0; i < 10; i++) {
                  if (!can(engine.getState(), { type: 'buyCharter' }).ok) break
                  dispatch({ type: 'buyCharter' })
                }
              }}
            >
              +10
            </Btn>
            <Btn
              tone="ghost"
              disabled={!guardianCheck.ok}
              title={
                guardianCheck.ok
                  ? 'Reset to the safe opener (Shell 5 · Replication 4 · Survey 1 · Transit 1) and protect the last barge.'
                  : guardianCheck.reason
              }
              onClick={() => dispatch({ type: 'applyGuardian' })}
            >
              Safe opener
            </Btn>
            <Btn
              tone="ghost"
              disabled={!rebootCheck.ok}
              title={rebootCheck.ok ? 'Refund every placed point (costs a slice of cash).' : rebootCheck.reason}
              onClick={() => dispatch({ type: 'rebootFleet' })}
            >
              Refund all
            </Btn>
          </div>
        </section>

        <section className={`fl-card${f.warOn ? ' fv-war' : ''}`} aria-label="Drift war">
          <h3 className="fl-card__title">Drift war</h3>
          <p className="fv-big">
            {f.legacy.toFixed(1)} <small>Legacy</small>
          </p>
          <p className="fv-note">
            {f.warOn
              ? `War is on: earning Legacy (raises the Charter cap) but barges can be lost. Shell and Brand Seal cut losses ÷${resist.toFixed(1)}.`
              : 'Optional. Fight Off-Brand for Legacy, which raises the Charter cap. Costs barges now and then.'}
          </p>
          {!f.warOn ? (
            <div className="fl-row">
              <Btn
                tone="ghost"
                disabled={!driftCheck.ok}
                title={driftCheck.ok ? 'Start the Drift war' : driftCheck.reason}
                onClick={() => dispatch({ type: 'startDriftWar' })}
              >
                Start the war
              </Btn>
            </div>
          ) : null}
        </section>
      </div>

      <section className="fv-axes" aria-label="Charter axes">
        {CHARTER_AXES.map((a) => {
          const lvl = f.charter[a.id] ?? 0
          const minus = can(s, { type: 'setCharterAxis', axis: a.id, delta: -1 })
          const plus = can(s, { type: 'setCharterAxis', axis: a.id, delta: 1 })
          return (
            <div key={a.id} className="fv-axis">
              <div className="fv-axis__who">
                <strong>{a.name}</strong>
                <span>{axisEffect(a.id, lvl)}</span>
              </div>
              <div className="fl-stepper fv-stepper">
                <button
                  type="button"
                  disabled={!minus.ok}
                  aria-label={`Take a point from ${a.name}`}
                  onClick={() => dispatch({ type: 'setCharterAxis', axis: a.id, delta: -1 })}
                >
                  −
                </button>
                <output aria-label={`${a.name} points`}>{lvl}</output>
                <button
                  type="button"
                  disabled={!plus.ok}
                  title={plus.ok ? undefined : plus.reason}
                  aria-label={`Put a point in ${a.name}`}
                  onClick={() => dispatch({ type: 'setCharterAxis', axis: a.id, delta: 1 })}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </section>

      {showEnding || s.endingChoice ? (
        <section className="ge-empire-block">
          <header className="ge-empire-block__head">
            <h3>Ending</h3>
            <p>
              {s.endingChoice
                ? `Chose: ${s.endingChoice}`
                : 'Biomass cleared. Accept carries cosmetics; Reject ends in gallery silence.'}
            </p>
          </header>
          <div className="ge-chip-row">
            <Btn
              tone="primary"
              coachId="ending-accept"
              disabled={!acceptCheck.ok}
              title={!acceptCheck.ok ? acceptCheck.reason : undefined}
              onClick={() =>
                setConfirm({
                  title: 'Accept the ending?',
                  body: 'Accept carries cosmetics into the next universe. The hungry laws still apply.',
                  confirmLabel: 'Accept',
                  onConfirm: () => dispatch({ type: 'acceptEnding' }),
                })
              }
            >
              Accept
            </Btn>
            <Btn
              tone="ghost"
              coachId="ending-reject"
              disabled={!rejectCheck.ok}
              title={!rejectCheck.ok ? rejectCheck.reason : undefined}
              onClick={() =>
                setConfirm({
                  title: 'Reject the ending?',
                  body: 'Reject ends in gallery silence. This choice sticks for the run.',
                  confirmLabel: 'Reject',
                  tone: 'danger',
                  onConfirm: () => dispatch({ type: 'rejectEnding' }),
                })
              }
            >
              Reject
            </Btn>
          </div>
        </section>
      ) : null}

      <HelpCard title="How the fleet works">
        Barges harvest biomass; when it hits zero, Era 6 opens. More barges, Survey and Transit all speed the harvest.
        Replication breeds free barges. Charter points come from Read; Legacy from the optional Drift war raises how
        many points you can hold.
      </HelpCard>

      <ConfirmModal
        open={!!confirm}
        spec={confirm}
        reducedMotion={reducedMotion}
        onClose={() => setConfirm(null)}
      />
    </Panel>
  )
}

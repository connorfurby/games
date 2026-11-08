import { useState } from 'react'
import { CHARTER_AXES } from '../../content/lateEras'
import { can } from '../../sim/commands'
import { endingOpen } from '../../sim/systems/endings'
import { useGame } from '../GameContext'
import { Btn } from '../components/Btn'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HelpCard } from '../components/HelpCard'
import { Panel } from '../components/Panel'
import { Icon } from '../icons/Icon'
import { FleetBand } from '../scenes/DepartmentBands'

export function FleetPanel() {
  const { state: s, dispatch, reducedMotion } = useGame()
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

  return (
    <Panel
      title="Fleet"
      purpose="Launch barges. Spend Read and Charter."
      lore="fleet"
      scene={<FleetBand state={s} />}
    >
      {f.warOn ? (
        <div className="ge-war-strip" role="status">
          Drift war live — losses cost time and Legacy. Guardian preset available under pressure.
        </div>
      ) : null}

      <div className="ge-dept-split">
        <article className="ge-card ge-card--owned">
          <header className="ge-empire-block__head">
            <h3>Barges</h3>
            <p>
              {f.barges} barge{f.barges === 1 ? '' : 's'} · {f.warOn ? 'war live' : 'quiet waters'}
            </p>
          </header>
          <div className="ge-card__actions">
            <Btn
              tone="primary"
              coachId="fleet-launch"
              disabled={!launchCheck.ok}
              title={!launchCheck.ok ? launchCheck.reason : undefined}
              onClick={() => dispatch({ type: 'launchBarge' })}
            >
              <Icon name="barge" size={14} />
              Launch barge
            </Btn>
            <Btn
              tone="ghost"
              coachId="fleet-drift"
              disabled={!driftCheck.ok}
              title={!driftCheck.ok ? driftCheck.reason : undefined}
              onClick={() => dispatch({ type: 'startDriftWar' })}
            >
              Drift war
            </Btn>
          </div>
        </article>

        <article className="ge-card">
          <header className="ge-empire-block__head">
            <h3>Charter</h3>
            <p>
              Pool {f.charterPool} · Cap {f.charterCap}
            </p>
          </header>
          <Btn
            tone="ghost"
            disabled={!charterCheck.ok}
            title={!charterCheck.ok ? charterCheck.reason : undefined}
            onClick={() => dispatch({ type: 'buyCharter' })}
          >
            <Icon name="charter" size={14} />
            Buy point (Read)
          </Btn>
          <div className="ge-chip-row">
            <Btn
              tone="primary"
              coachId="fleet-guardian"
              disabled={!guardianCheck.ok}
              title={!guardianCheck.ok ? guardianCheck.reason : undefined}
              onClick={() => dispatch({ type: 'applyGuardian' })}
            >
              Guardian
            </Btn>
            <Btn
              tone="ghost"
              disabled={!rebootCheck.ok}
              title={!rebootCheck.ok ? rebootCheck.reason : undefined}
              onClick={() => dispatch({ type: 'rebootFleet' })}
            >
              Reboot
            </Btn>
          </div>
        </article>
      </div>

      <section className="ge-empire-block">
        <header className="ge-empire-block__head">
          <h3>Charter axes</h3>
          <p>Spend pool points across the doctrines of orbit.</p>
        </header>
        <div className="ge-card-grid">
          {CHARTER_AXES.map((a) => {
            const minusCheck = can(s, { type: 'setCharterAxis', axis: a.id, delta: -1 })
            const plusCheck = can(s, { type: 'setCharterAxis', axis: a.id, delta: 1 })
            return (
              <article key={a.id} className="ge-card">
                <div className="ge-card__head">
                  <Icon name="charter" size={18} tone="accent" />
                  <div>
                    <strong>{a.name}</strong>
                    <p className="ge-muted">{f.charter[a.id] ?? 0}</p>
                  </div>
                </div>
                <p className="ge-card__blurb">{a.blurb}</p>
                <div className="ge-card__actions">
                  <Btn
                    tone="ghost"
                    disabled={!minusCheck.ok}
                    title={!minusCheck.ok ? minusCheck.reason : undefined}
                    onClick={() => dispatch({ type: 'setCharterAxis', axis: a.id, delta: -1 })}
                  >
                    −
                  </Btn>
                  <Btn
                    tone="primary"
                    disabled={!plusCheck.ok}
                    title={!plusCheck.ok ? plusCheck.reason : undefined}
                    onClick={() => dispatch({ type: 'setCharterAxis', axis: a.id, delta: 1 })}
                  >
                    +
                  </Btn>
                </div>
              </article>
            )
          })}
        </div>
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

      <HelpCard title="Orbit is still a shelf">
        Barges stock the void the way clerks stock aisles. Charter points are doctrines. Legacy is the
        score when Off-Brand copies your fonts.
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

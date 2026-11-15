import { useState } from 'react'
import { CHARTER_AXES } from '../../content/lateEras'
import { can } from '../../sim/commands'
import { DEPTH, FLEET } from '../../sim/balance'
import { engine } from '../../sim/engine'
import { endingOpen } from '../../sim/systems/endings'
import {
  bargeCost,
  fleetHarvestPerSec,
  replicationPerMin,
  warResist,
} from '../../sim/systems/fleet'
import { money, qty } from '../format'
import { useGame } from '../GameContext'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { HubStage } from '../components/HubStage'
import { Button, ScreenHeader, Sheet, Stat, usePhone } from '../kit'
import { FleetHarbor } from '../fleet/FleetHarbor'

function eta(sec: number): string {
  if (sec < 90) return `${Math.ceil(sec)}s`
  if (sec < 5400) return `${Math.round(sec / 60)} min`
  return `${(sec / 3600).toFixed(1)} h`
}

export function FleetPanel() {
  const { state: s, dispatch, reducedMotion, numberFormat } = useGame()
  const phone = usePhone()
  const [pocketSheet, setPocketSheet] = useState(false)
  const [charterOpen, setCharterOpen] = useState(false)
  const [warOpen, setWarOpen] = useState(false)
  const f = s.fleet
  const showEnding = endingOpen(s) || !!s.memos['universal-ration'] || s.era >= 6
  const driftCheck = can(s, { type: 'startDriftWar' })
  const charterCheck = can(s, { type: 'buyCharter' })
  const guardianCheck = can(s, { type: 'applyGuardian' })
  const rebootCheck = can(s, { type: 'rebootFleet' })
  const acceptCheck = can(s, { type: 'acceptEnding' })
  const rejectCheck = can(s, { type: 'rejectEnding' })
  const continueCheck = can(s, { type: 'continueHorizon' })
  const unsealCheck = can(s, { type: 'unsealHorizon' })
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)

  const harvest = fleetHarvestPerSec(s)
  const repl = replicationPerMin(s)
  const pockets = f.pockets ?? []
  const pocketsCleared = pockets.filter((p) => p.left <= 0).length
  const etaSec = harvest > 0 ? f.biomass / harvest : Infinity
  const cost = bargeCost(s)
  const pool = f.charterPool
  const spent = Object.values(f.charter).reduce((a, n) => a + Math.max(0, n), 0)
  const resist = warResist(s)
  const warStep = s.depth?.driftWar?.step ?? 0
  const advanceCheck = can(s, { type: 'advanceDriftWar' })
  const rationWeekLeft = Math.max(0, (s.depth?.rationWeekUntil ?? 0) - s.time)
  const stewardCandidates = s.staff.filter(
    (m) =>
      m.role === 'steward' ||
      m.role === 'pilot' ||
      m.role === 'storeManager' ||
      m.role === 'produceLead',
  )

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
    <section className="ge-panel fv">
      <ScreenHeader
        hub
        title="Fleet"
        purpose="Send haulers on pocket trips."
        stats={
          <Stat
            size="sm"
            label="Pockets"
            value={`${pocketsCleared}/6`}
            title="Four clears, Orbit on Mid, and Hold open Era 6."
          />
        }
      />
      <HubStage
        scene={<FleetHarbor state={s} motion={!reducedMotion} />}
        primary={
          <>
            {(() => {
              const stamp = can(s, { type: 'stampLedger' })
              const stamps = s.depth?.ledgerStamps ?? 0
              if (!stamp.ok && stamps >= DEPTH.rationLedgerNeed) return null
              if (s.era < 6 && !stamp.ok) return null
              if (!stamp.ok && stamps <= 0) return null
              return (
                <Button
                  tone="free"
                  size="lg"
                  coachId="fleet-ledger"
                  disabled={!stamp.ok}
                  title={stamp.ok ? 'Stamp the ration ledger — free.' : stamp.reason}
                  onClick={() => dispatch({ type: 'stampLedger' })}
                >
                  Stamp ledger · {stamps}/{DEPTH.rationLedgerNeed}
                </Button>
              )
            })()}
            <section className="fv-goal" aria-label="Biomass pockets">
              <div className="fv-goal__head">
                <h3>Pocket Ops</h3>
              </div>
              <p className="fv-note">
                {pocketsCleared}/6 cleared
                {pockets.length
                  ? ` · ${pockets.map((p) => `${p.ration}${p.left <= 0 ? '✓' : ''}`).join(' ')}`
                  : ''}
                {harvest > 0 && Number.isFinite(etaSec) ? ` · ~${eta(etaSec)} en route` : ''}
                {s.era >= 5
                  ? ` · turnarounds ${s.depth?.berthTurnarounds ?? 0}/${DEPTH.berthTurnaroundNeed}`
                  : ''}
                {s.era >= 6 && rationWeekLeft > 0 ? ` · ration week ${eta(rationWeekLeft)}` : ''}.
              </p>
              {phone ? (
                <>
                  <Button tone="free" size="lg" onClick={() => setPocketSheet(true)}>
                    Dispatch · {pocketsCleared}/6
                  </Button>
                  <Sheet
                    open={pocketSheet}
                    onClose={() => setPocketSheet(false)}
                    title="Pocket Ops"
                    reducedMotion={reducedMotion}
                    footer={
                      <Button tone="ghost" onClick={() => setPocketSheet(false)}>
                        Done
                      </Button>
                    }
                  >
                    <p className="fv-note">Hauler trips clear pockets on ETA. Wrong ration wastes the trip.</p>
                    <div className="fl-row">
                      {pockets
                        .filter((p) => p.left > 0)
                        .slice(0, 4)
                        .map((p) => {
                          const check = can(s, { type: 'dispatchHauler', pocketId: p.id, class: 'hauler' })
                          return (
                            <Button
                              key={p.id}
                              tone="free"
                              size="lg"
                              coachId="fleet-dispatch"
                              disabled={!check.ok}
                              title={check.ok ? `Dispatch Hauler to ${p.ration}` : check.reason}
                              onClick={() =>
                                dispatch({
                                  type: 'dispatchHauler',
                                  pocketId: p.id,
                                  class: 'hauler',
                                  loadRation: p.ration,
                                })
                              }
                            >
                              {p.ration}
                            </Button>
                          )
                        })}
                    </div>
                  </Sheet>
                </>
              ) : (
                <div className="fl-row">
                  {pockets
                    .filter((p) => p.left > 0)
                    .slice(0, 4)
                    .map((p) => {
                      const check = can(s, { type: 'dispatchHauler', pocketId: p.id, class: 'hauler' })
                      return (
                        <Button
                          key={p.id}
                          tone="free"
                          size="lg"
                          coachId="fleet-dispatch"
                          disabled={!check.ok}
                          title={check.ok ? `Dispatch Hauler to ${p.ration}` : check.reason}
                          onClick={() =>
                            dispatch({
                              type: 'dispatchHauler',
                              pocketId: p.id,
                              class: 'hauler',
                              loadRation: p.ration,
                            })
                          }
                        >
                          {p.ration}
                        </Button>
                      )
                    })}
                </div>
              )}
            </section>
          </>
        }
      >
      <div className="ge-chip-row">
        {(['hauler', 'replicator', 'ark'] as const).map((cls) => {
          const check = can(s, { type: 'launchBarge', class: cls })
          return (
            <Button
              key={cls}
              tone={cls === 'hauler' ? 'primary' : 'ghost'}
              size="sm"
              coachId={cls === 'hauler' ? 'fleet-launch' : undefined}
              disabled={!check.ok}
              title={
                check.ok
                  ? `Launch ${cls}${repl > 0 ? ` · replication ~${repl.toFixed(repl < 10 ? 1 : 0)}/min` : ''}`
                  : check.reason
              }
              cost={cls === 'hauler' ? money(cost, numberFormat) : undefined}
              onClick={() => dispatch({ type: 'launchBarge', class: cls })}
            >
              {cls}
            </Button>
          )
        })}
        <Button size="sm" onClick={() => setCharterOpen(true)}>
          Charter · {pool} free
        </Button>
        <Button size="sm" onClick={() => setWarOpen(true)}>
          Drift war{warStep > 0 ? ` · ${warStep}/3` : ''}
        </Button>
      </div>
      <Sheet
        open={charterOpen}
        onClose={() => setCharterOpen(false)}
        title={`Charter · ${pool} free · ${spent} placed`}
        reducedMotion={reducedMotion}
      >
        <p className="fv-note">Points shape every barge. Read on hand: {qty(s.read, numberFormat)}.</p>
        <div className="fl-row">
          <Button
            tone="primary"
            coachId="fleet-charter"
            disabled={!charterCheck.ok}
            title={charterCheck.ok ? 'One Charter point' : charterCheck.reason}
            onClick={() => dispatch({ type: 'buyCharter' })}
          >
            +1 point · {FLEET.readPerCharterPoint} Read
          </Button>
          <Button
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
          </Button>
          <Button
            tone="ghost"
            coachId="fleet-guardian"
            disabled={!guardianCheck.ok}
            title={guardianCheck.ok ? 'Safe opener: Shell 5, Replication 4, Survey 1, Transit 1.' : guardianCheck.reason}
            onClick={() => dispatch({ type: 'applyGuardian' })}
          >
            Safe opener
          </Button>
          <Button
            tone="ghost"
            disabled={!rebootCheck.ok}
            title={rebootCheck.ok ? 'Refund every placed point.' : rebootCheck.reason}
            onClick={() => dispatch({ type: 'rebootFleet' })}
          >
            Refund all
          </Button>
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
      </Sheet>
      <Sheet
        open={warOpen}
        onClose={() => setWarOpen(false)}
        title={`Drift war · ${f.legacy.toFixed(1)} Legacy`}
        reducedMotion={reducedMotion}
      >
        <p className="fv-note" data-coach-id="fleet-drift">
          {f.warOn || warStep > 0
            ? `Sight, Board, Hold. Resist ÷${resist.toFixed(1)}.`
            : 'Optional. Legacy from the war raises the Charter cap.'}
        </p>
        <div className="fl-row">
          {!f.warOn && warStep === 0 ? (
            <Button
              tone="ghost"
              disabled={!driftCheck.ok}
              title={driftCheck.ok ? 'Start the Drift war' : driftCheck.reason}
              onClick={() => dispatch({ type: 'startDriftWar' })}
            >
              Start the war
            </Button>
          ) : null}
          {warStep > 0 && warStep < 3 ? (
            <Button
              tone="secondary"
              disabled={!advanceCheck.ok}
              title={advanceCheck.ok ? 'Advance Sight, Board, Hold' : advanceCheck.reason}
              onClick={() => dispatch({ type: 'advanceDriftWar' })}
            >
              Advance ({warStep}/3)
            </Button>
          ) : null}
        </div>
      </Sheet>

      {showEnding || s.endingChoice ? (
        <section className="ge-empire-block">
          <header className="ge-empire-block__head">
            <h3>The ration</h3>
            <p>
              {s.endingChoice === 'continue'
                ? 'Continued into the Worlds hub. The counter stays.'
                : s.endingChoice === 'accept'
                  ? 'Prestiged into a hungry universe.'
                  : s.endingChoice === 'reject'
                    ? 'Stepped away. Unseal opens the Worlds hub without wiping the save.'
                    : 'Biomass cleared. Continue keeps the save. Prestige resets. Step away pauses.'}
            </p>
          </header>
          {s.depth?.stewardId == null && stewardCandidates.length > 0 ? (
            <div className="fl-row" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              {stewardCandidates.slice(0, 3).map((m) => {
                const check = can(s, { type: 'promoteSteward', staffId: m.id })
                return (
                  <Button
                    key={m.id}
                    tone="ghost"
                    disabled={!check.ok}
                    title={check.ok ? 'Steward of the Counter' : check.reason}
                    onClick={() => dispatch({ type: 'promoteSteward', staffId: m.id })}
                  >
                    Promote {m.name}
                  </Button>
                )
              })}
            </div>
          ) : s.depth?.stewardId != null ? (
            <p className="fv-note">Steward of the Counter named.</p>
          ) : null}
          <div className="ge-chip-row">
            {(() => {
              const stamp = can(s, { type: 'stampLedger' })
              const stamps = s.depth?.ledgerStamps ?? 0
              return (
                <Button
                  tone="free"
                  size="lg"
                  coachId="fleet-ledger"
                  disabled={!stamp.ok}
                  title={stamp.ok ? 'Stamp the ration ledger — free.' : stamp.reason}
                  onClick={() => dispatch({ type: 'stampLedger' })}
                >
                  Stamp ledger · {stamps}/{DEPTH.rationLedgerNeed}
                </Button>
              )
            })()}
            <Button
              tone="primary"
              coachId="ending-continue"
              disabled={!continueCheck.ok}
              title={!continueCheck.ok ? continueCheck.reason : undefined}
              onClick={() =>
                setConfirm({
                  title: 'Continue past the ration?',
                  body: 'Same save. Era 7 opens. Cash, fleet, and cold stay. The Worlds hub unlocks.',
                  confirmLabel: 'Continue',
                  onConfirm: () => dispatch({ type: 'continueHorizon' }),
                })
              }
            >
              Continue
            </Button>
            <Button
              tone="ghost"
              coachId="ending-accept"
              disabled={!acceptCheck.ok}
              title={!acceptCheck.ok ? acceptCheck.reason : undefined}
              onClick={() =>
                setConfirm({
                  title: 'Prestige into a hungry universe?',
                  body: 'Cash resets to $20. Era 0. Hungry laws. You can Continue the next time biomass clears.',
                  confirmLabel: 'Prestige',
                  onConfirm: () => dispatch({ type: 'acceptEnding' }),
                })
              }
            >
              Prestige
            </Button>
            <Button
              tone="ghost"
              coachId="ending-reject"
              disabled={!rejectCheck.ok}
              title={!rejectCheck.ok ? rejectCheck.reason : undefined}
              onClick={() =>
                setConfirm({
                  title: 'Step away?',
                  body: 'The run pauses. A mythic plaque. Unseal later opens Era 7 with a stipend.',
                  confirmLabel: 'Step away',
                  tone: 'danger',
                  onConfirm: () => dispatch({ type: 'rejectEnding' }),
                })
              }
            >
              Step away
            </Button>
            {s.endingChoice === 'reject' ? (
              <Button
                tone="primary"
                coachId="ending-unseal"
                disabled={!unsealCheck.ok}
                title={!unsealCheck.ok ? unsealCheck.reason : undefined}
                onClick={() => dispatch({ type: 'unsealHorizon' })}
              >
                Unseal
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}
      </HubStage>

      <ConfirmModal
        open={!!confirm}
        spec={confirm}
        reducedMotion={reducedMotion}
        onClose={() => setConfirm(null)}
      />
    </section>
  )
}

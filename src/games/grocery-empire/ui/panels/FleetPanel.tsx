import { useState } from 'react'
import { CHARTER_AXES, HUNGRY_MUTATORS } from '../../content/lateEras'
import { can } from '../../sim/commands'
import { DEPTH, FLEET } from '../../sim/balance'
import { engine } from '../../sim/engine'
import { endingOpen } from '../../sim/systems/endings'
import type { RebrandCarry } from '../../sim/systems/prestige'
import { rationBoardBehind } from '../../sim/systems/rivals'
import {
  bargeCost,
  fleetHarvestPerSec,
  openPocketRations,
  pocketConcurrency,
  pocketsOutrunHauler,
  replicationPerMin,
  warResist,
} from '../../sim/systems/fleet'
import { money, qty } from '../format'
import { useGame } from '../GameContext'
import { ConfirmModal, type ConfirmSpec } from '../components/ConfirmModal'
import { PrestigeKeepSheet } from '../components/PrestigeKeepSheet'
import { Button, EmptyState, Meter, SegmentedControl, Sheet } from '../kit'
import { ActionRow, FailReason, PlayFrame, StatusChip } from '../play'
import { FleetHarborScene } from '../scenes/live'

type BargeClass = 'hauler' | 'replicator' | 'ark'
const BARGE_CLASSES: BargeClass[] = ['hauler', 'replicator', 'ark']

function eta(sec: number): string {
  if (sec < 90) return `${Math.ceil(sec)}s`
  if (sec < 5400) return `${Math.round(sec / 60)} min`
  return `${(sec / 3600).toFixed(1)} h`
}

/** A can() reason that is really "go bank Read" — Strategy is where Read comes from. */
const needsRead = (reason?: string) => !!reason && /\bRead\b/.test(reason)

/** Fail line plus an optional jump when the real fix lives in another department. */
function NavFail({ reason, onJump, jumpLabel }: { reason?: string; onJump?: () => void; jumpLabel?: string }) {
  if (!reason) return null
  return (
    <div className="p6-stack" style={{ gap: '0.25rem' }}>
      <FailReason>{reason}</FailReason>
      {onJump && jumpLabel ? (
        <Button tone="ghost" size="sm" onClick={onJump}>
          {jumpLabel}
        </Button>
      ) : null}
    </div>
  )
}

export function FleetPanel() {
  const { state: s, dispatch, reducedMotion, numberFormat, setActiveMenu } = useGame()
  const [charterOpen, setCharterOpen] = useState(false)
  const [warOpen, setWarOpen] = useState(false)
  const [cls, setCls] = useState<BargeClass>('hauler')
  const [pocketId, setPocketId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [carry, setCarry] = useState<RebrandCarry>(null)
  const f = s.fleet

  const showEnding = endingOpen(s) || !!s.memos['universal-ration'] || s.era >= 6
  const launchCheck = can(s, { type: 'launchBarge', class: cls })
  const stampCheck = can(s, { type: 'stampLedger' })
  const driftCheck = can(s, { type: 'startDriftWar' })
  const advanceCheck = can(s, { type: 'advanceDriftWar' })
  const charterCheck = can(s, { type: 'buyCharter' })
  const guardianCheck = can(s, { type: 'applyGuardian' })
  const rebootCheck = can(s, { type: 'rebootFleet' })
  const acceptCheck = can(s, { type: 'acceptEnding' })
  const rejectCheck = can(s, { type: 'rejectEnding' })
  const continueCheck = can(s, { type: 'continueHorizon' })
  const unsealCheck = can(s, { type: 'unsealHorizon' })

  const harvest = fleetHarvestPerSec(s)
  const repl = replicationPerMin(s)
  const cost = bargeCost(s)
  const resist = warResist(s)
  const pockets = f.pockets ?? []
  const openPockets = pockets.filter((p) => p.left > 0)
  const pocketsCleared = pockets.filter((p) => p.left <= 0).length
  const etaSec = harvest > 0 ? f.biomass / harvest : Infinity
  const trips = (f.trips ?? []).filter((t) => t.status === 'enroute')
  const pool = f.charterPool
  const spent = Object.values(f.charter).reduce((a, n) => a + Math.max(0, n), 0)
  const warStep = s.depth?.driftWar?.step ?? 0
  const stamps = s.depth?.ledgerStamps ?? 0
  const rationWeekLeft = Math.max(0, (s.depth?.rationWeekUntil ?? 0) - s.time)
  const stewardCandidates = s.staff.filter(
    (m) => m.role === 'steward' || m.role === 'pilot' || m.role === 'storeManager' || m.role === 'produceLead',
  )

  const selected =
    pockets.find((p) => p.id === pocketId && p.left > 0) ?? pockets.find((p) => p.left > 0) ?? pockets[0] ?? null
  const dispatchCheck = selected
    ? can(s, { type: 'dispatchHauler', pocketId: selected.id, class: 'hauler' })
    : { ok: false, reason: 'No pockets yet.' }

  // Stamp is a free daily verb: show it when it can fire, or while the ledger is still filling.
  const showStamp = stampCheck.ok || (s.era >= 6 && stamps > 0 && stamps < DEPTH.rationLedgerNeed)
    || (showEnding && stamps < DEPTH.rationLedgerNeed && s.era >= 6)

  const jumpStrategy = () => setActiveMenu('strategy')

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

  // Tray wraps failReason in a <p>, so the Read jump sits directly under the tray instead.
  const launchNeedsRead = !launchCheck.ok && needsRead(launchCheck.reason)

  const secondaries = [
    ...(showStamp
      ? [
          {
            key: 'stamp',
            label: 'Stamp ledger',
            fact: `${stamps}/${DEPTH.rationLedgerNeed}`,
            coachId: 'fleet-ledger',
            disabled: !stampCheck.ok,
            title: stampCheck.ok ? 'Stamp the ration ledger — free.' : stampCheck.reason,
            onClick: () => dispatch({ type: 'stampLedger' }),
          },
        ]
      : []),
    {
      key: 'charter',
      label: 'Charter',
      fact: `${pool} free`,
      title: 'Points shape every barge.',
      onClick: () => setCharterOpen(true),
    },
    {
      key: 'war',
      label: 'Drift war',
      fact: warStep > 0 ? `${warStep}/3` : f.warOn ? 'on' : 'optional',
      onClick: () => setWarOpen(true),
    },
  ]

  return (
    <section className="ge-panel fv">
      <PlayFrame
        purpose="Send haulers on pocket trips."
        department="Fleet"
        room={<FleetHarborScene />}
        tray={{
          primary: {
            label: `Launch ${cls}`,
            tone: launchCheck.ok ? 'free' : 'primary',
            size: 'lg',
            feedback: true,
            affordable: launchCheck.ok,
            cost: money(cost, numberFormat),
            coachId: 'fleet-launch',
            disabled: !launchCheck.ok,
            title: launchCheck.ok
              ? `Launch ${cls}${repl > 0 ? ` · replication ~${repl.toFixed(repl < 10 ? 1 : 0)}/min` : ''}`
              : launchCheck.reason,
            onClick: () => dispatch({ type: 'launchBarge', class: cls }),
          },
          failReason: launchCheck.ok ? undefined : launchCheck.reason,
          secondaries,
        }}
      >
        <div className="p6-stack">
          {launchNeedsRead ? (
            <Button tone="ghost" size="sm" onClick={jumpStrategy}>
              Open Strategy to bank Read
            </Button>
          ) : null}
          <div className="ge-chip-row" aria-label="Fleet status">
            <StatusChip tone={pocketsCleared >= 4 ? 'ready' : 'idle'} title="Four clears, Orbit on Mid, and Hold open Era 6.">
              Pockets {pocketsCleared}/{pockets.length || 6}
            </StatusChip>
            {pocketsOutrunHauler(s) ? (
              <StatusChip
                tone="waiting"
                title="Open pockets want different rations. One Hauler feeds one ration at a time until Second Berth (Supply) raises concurrent trips."
              >
                {openPocketRations(s).length} rations open · 1 hauler
              </StatusChip>
            ) : pocketConcurrency(s) > 1 && openPocketRations(s).length >= 2 ? (
              <StatusChip tone="ready" title="Second Berth: two Haulers can leave at once — one per ration.">
                Feeding {Math.min(pocketConcurrency(s), openPocketRations(s).length)} rations at once
              </StatusChip>
            ) : null}
            {rationBoardBehind(s) ? (
              <StatusChip
                tone="warn"
                title={`The Ration Board skims ${Math.round((1 - DEPTH.rationBoardDemandMul) * 100)}% of demand while the ledger is unstamped. Stamp it to send them away.`}
              >
                Ration Board · stamp the ledger
              </StatusChip>
            ) : null}
            {harvest > 0 && Number.isFinite(etaSec) ? (
              <StatusChip tone="waiting" title="Estimate from hauler trips on the water.">
                ~{eta(etaSec)} to clear
              </StatusChip>
            ) : null}
            {s.era >= 5 ? (
              <StatusChip title="Berth turnarounds toward the Era 6 gate.">
                Turnarounds {s.depth?.berthTurnarounds ?? 0}/{DEPTH.berthTurnaroundNeed}
              </StatusChip>
            ) : null}
            {s.era >= 6 && rationWeekLeft > 0 ? (
              <StatusChip tone="waiting">Ration week {eta(rationWeekLeft)}</StatusChip>
            ) : null}
          </div>

          <SegmentedControl
            aria-label="Barge class"
            value={cls}
            onChange={(v) => setCls(v as BargeClass)}
            options={BARGE_CLASSES.map((c) => ({
              value: c,
              label: c,
              title: c === 'hauler' ? 'Runs Pocket Ops trips.' : c === 'replicator' ? 'Builds more barges.' : 'Carries the fleet.',
            }))}
          />

          {pockets.length > 0 ? (
            <section className="p6-stack" aria-label="Biomass pockets">
              {openPockets.length >= 2 ? (
                <p className="ge-muted" aria-label="Open pockets">
                  {openPockets
                    .slice(0, 2)
                    .map((p) => `${p.ration} ${Math.ceil((p.left / Math.max(1, p.max)) * 100)}%`)
                    .join(' · ')}
                  {openPockets.length > 2 ? ` · +${openPockets.length - 2} more` : ''} —{' '}
                  {pocketsOutrunHauler(s)
                    ? 'one Hauler feeds one ration at a time; Second Berth sends two.'
                    : 'each Hauler carries its own ration; a wrong load wastes the trip.'}
                </p>
              ) : null}
              <SegmentedControl
                aria-label="Pocket"
                className="gk-seg--wrap"
                value={selected?.id ?? pockets[0]!.id}
                onChange={(v) => setPocketId(v)}
                options={pockets.map((p) => ({
                  value: p.id,
                  label: `${p.ration}${p.left <= 0 ? ' ✓' : ''}`,
                  title: p.left <= 0 ? 'Cleared' : `${p.left}/${p.max} biomass left`,
                }))}
              />
              {selected ? (
                <>
                  <ActionRow
                    label={`Dispatch Hauler · ${selected.ration}`}
                    fact={
                      selected.left <= 0
                        ? 'Pocket cleared'
                        : `${qty(selected.left, numberFormat)}/${qty(selected.max, numberFormat)} biomass · wrong ration wastes the trip`
                    }
                    trail={dispatchCheck.ok ? 'Go' : undefined}
                    data-coach-id="fleet-dispatch"
                    disabled={!dispatchCheck.ok}
                    className={dispatchCheck.ok ? 'is-ready' : undefined}
                    title={dispatchCheck.ok ? `Dispatch Hauler to ${selected.ration}` : dispatchCheck.reason}
                    onClick={() =>
                      dispatch({
                        type: 'dispatchHauler',
                        pocketId: selected.id,
                        class: 'hauler',
                        loadRation: selected.ration,
                      })
                    }
                  />
                  {!dispatchCheck.ok && selected.left > 0 && dispatchCheck.reason ? (
                    <FailReason>{dispatchCheck.reason}</FailReason>
                  ) : null}
                </>
              ) : null}
              {trips.slice(0, 3).map((t) => {
                const span = Math.max(1, t.arriveAt - t.departAt)
                return (
                  <Meter
                    key={`${t.bargeId}-${t.pocketId}`}
                    value={Math.max(0, s.time - t.departAt)}
                    max={span}
                    tone="accent"
                    label={`En route · ${t.ration}`}
                    eta={eta(Math.max(0, t.arriveAt - s.time))}
                  />
                )
              })}
            </section>
          ) : (
            <EmptyState title="No biomass pockets yet" body="Pockets open on the water as the fleet grows." />
          )}

          {showEnding || s.endingChoice ? (
            <section className="p6-stack" aria-label="The ration">
              <p className="ge-muted">
                {s.endingChoice === 'continue'
                  ? 'Continued into the Worlds hub. The counter stays.'
                  : s.endingChoice === 'accept'
                    ? 'Accepted — rebuilt like a Rebrand under a hungry universe.'
                    : s.endingChoice === 'reject'
                      ? 'Rejected. Unseal opens the Worlds hub without wiping the save.'
                      : 'The ration — biomass cleared. Continue keeps the save; Accept rebuilds like a Rebrand; Reject pauses.'}
              </p>
              {s.depth?.stewardId == null
                ? stewardCandidates.slice(0, 3).map((m) => {
                    const check = can(s, { type: 'promoteSteward', staffId: m.id })
                    return (
                      <ActionRow
                        key={m.id}
                        label={`Promote ${m.name}`}
                        fact="Steward of the Counter"
                        disabled={!check.ok}
                        title={check.ok ? 'Steward of the Counter' : check.reason}
                        onClick={() => dispatch({ type: 'promoteSteward', staffId: m.id })}
                      />
                    )
                  })
                : <p className="ge-muted">Steward of the Counter named.</p>}
              <ActionRow
                label="Continue"
                fact="Same save · Era 7 opens"
                trail="Keep"
                data-coach-id="ending-continue"
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
              />
              <ActionRow
                label="Accept"
                fact="Rebuild like a Rebrand · Hungry laws board"
                trail="Reset"
                data-coach-id="ending-accept"
                disabled={!acceptCheck.ok}
                title={!acceptCheck.ok ? acceptCheck.reason : undefined}
                onClick={() => {
                  setCarry(null)
                  setAcceptOpen(true)
                }}
              >
                <span className="pf-row__fact" aria-label="Laws Accept would offer">
                  Laws to turn on (0–2):{' '}
                  {HUNGRY_MUTATORS.map((m) => `${m.name} — ${m.blurb}`).join(' · ')}
                </span>
              </ActionRow>
              <ActionRow
                label="Reject"
                fact="Pause the run · mythic plaque · Unseal later"
                trail="Pause"
                data-coach-id="ending-reject"
                disabled={!rejectCheck.ok}
                title={!rejectCheck.ok ? rejectCheck.reason : undefined}
                onClick={() =>
                  setConfirm({
                    title: 'Reject the ration?',
                    body: 'The run pauses. A mythic plaque. Unseal later opens Era 7 with a stipend.',
                    confirmLabel: 'Reject',
                    tone: 'danger',
                    onConfirm: () => dispatch({ type: 'rejectEnding' }),
                  })
                }
              />
              {s.endingChoice === 'reject' ? (
                <ActionRow
                  label="Unseal"
                  fact="Open the Worlds hub"
                  data-coach-id="ending-unseal"
                  disabled={!unsealCheck.ok}
                  title={!unsealCheck.ok ? unsealCheck.reason : undefined}
                  onClick={() => dispatch({ type: 'unsealHorizon' })}
                />
              ) : null}
            </section>
          ) : null}
        </div>
      </PlayFrame>

      <Sheet
        open={charterOpen}
        onClose={() => setCharterOpen(false)}
        title={`Charter · ${pool} free · ${spent} placed`}
        reducedMotion={reducedMotion}
      >
        <p className="ge-muted">Points shape every barge. Read on hand: {qty(s.read, numberFormat)}.</p>
        {!charterCheck.ok && needsRead(charterCheck.reason) ? (
          <NavFail
            reason={charterCheck.reason}
            jumpLabel="Open Strategy to bank Read"
            onJump={() => {
              setCharterOpen(false)
              jumpStrategy()
            }}
          />
        ) : null}
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
        <p className="ge-muted" data-coach-id="fleet-drift">
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

      <ConfirmModal
        open={acceptOpen}
        reducedMotion={reducedMotion}
        spec={{
          title: 'Accept into a hungry universe?',
          body: 'Store, staff, upgrades, and fleet start over, the same way a Rebrand does.',
          sheet: <PrestigeKeepSheet state={s} mode="accept" carry={carry} onCarry={setCarry} />,
          confirmLabel: 'Accept',
          onConfirm: () => dispatch({ type: 'acceptEnding', carry }),
        }}
        onClose={() => setAcceptOpen(false)}
      />
      <ConfirmModal
        open={!!confirm}
        spec={confirm}
        reducedMotion={reducedMotion}
        onClose={() => setConfirm(null)}
      />
    </section>
  )
}

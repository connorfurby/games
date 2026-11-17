import { LANE_ROUTES } from '../../content/depth'
import type { ManifestStance } from '../../content/depth'
import { DEPTH } from '../../sim/balance'
import { can } from '../../sim/commands'
import { laneLeftOpen, lanePreferMix, laneStance } from '../../sim/systems/fleet'
import { fuelCap as fuelCapOf } from '../../sim/systems/late'
import type { GameState } from '../../sim/state'
import { useGame } from '../GameContext'
import { MENUS } from '../../content/menus'
import { ActionRow, FailReason, PlayFrame } from '../play'
import { Button, Sheet } from '../kit'
import { LaneScene } from '../scenes/live'
import { Beat, useBeat } from '../fx'

/** One manifest stance. The tick pops once when this stance becomes the lane's filing. */
function StanceRow({
  on,
  label,
  fact,
  disabled,
  title,
  coachId,
  onFile,
}: {
  on: boolean
  label: string
  fact: string
  disabled: boolean
  title?: string
  coachId: string
  onFile: () => void
}) {
  const beat = useBeat(on)
  return (
    <ActionRow
      label={label}
      fact={fact}
      trail={
        on ? (
          <Beat on={beat} kind="pop">
            ✓
          </Beat>
        ) : undefined
      }
      data-coach-id={coachId}
      disabled={disabled}
      className={disabled ? undefined : 'is-ready'}
      title={title}
      onClick={onFile}
    />
  )
}

export function LogisticsPanel() {
  const { state: s, dispatch, reducedMotion } = useGame()
  const fuelCap = fuelCapOf(s)
  const lowFuel = s.fuel < fuelCap * 0.25
  const fuelCheck = can(s, { type: 'buyFuel' })
  const franchiseCheck = can(s, { type: 'openFranchise' })
  const planetCheck = can(s, { type: 'openPlanetFranchise' })
  const jumpCheck = can(s, { type: 'jumpLane' })
  const routes = LANE_ROUTES
  const chartered = s.fleet.laneList?.length ?? 0
  const clean = s.depth?.dispatch?.cleanManifests ?? 0
  const defected = (s.fleet.franchiseList ?? []).filter((f) => f.defected).length
  const exam = can(s, { type: 'swearExam' })
  const examFocus = exam.ok || (s.depth?.dispatch?.examsHeld ?? 0) < DEPTH.examHoldNeed

  const STANCES: { id: ManifestStance; label: string; fact: (s: GameState) => string }[] = [
    {
      id: 'clean',
      label: 'Clean',
      fact: () => `Counts as a clean run now · ${clean}/${DEPTH.cleanManifestsNeed} toward the barge berth`,
    },
    {
      id: 'exam',
      label: 'For inspection',
      fact: () =>
        `Starts an inspection; pass it in time · ${s.depth?.dispatch?.examsHeld ?? 0}/${DEPTH.examHoldNeed} · does not count as clean`,
    },
    {
      id: 'fast',
      label: 'Fast',
      fact: () => 'Quick cash, counts as neither, and MegaMart can take the route',
    },
  ]

  const manifestBoard = (
    <div className="p6-stack">
      {(s.fleet.laneList ?? []).map((lane) => {
        const prefer = lanePreferMix(lane) ?? 'cargo'
        const current = laneStance(s, lane.id)
        const open = laneLeftOpen(s, lane)
        return (
          <section key={lane.id} className="p6-stack" aria-label={`${lane.route} manifest`}>
            <p className="p6-copy">
              <strong>{lane.route}</strong> → {prefer}
              {current ? ` · filed ${current}` : ' · not filed'}
              {open && current ? ' · open to MegaMart' : ''}
            </p>
            {STANCES.map((st) => {
              const check = can(s, { type: 'setManifestStance', laneId: lane.id, stance: st.id })
              return (
                <div key={st.id} className="p6-stack" style={{ gap: '0.25rem' }}>
                  <StanceRow
                    on={current === st.id}
                    label={st.label}
                    fact={st.fact(s)}
                    coachId={`logistics-stance-${st.id}`}
                    disabled={!check.ok}
                    title={check.ok ? `File ${prefer} ${st.label.toLowerCase()}` : check.reason}
                    onFile={() => dispatch({ type: 'setManifestStance', laneId: lane.id, stance: st.id })}
                  />
                  {!check.ok && check.reason ? <FailReason>{check.reason}</FailReason> : null}
                </div>
              )
            })}
          </section>
        )
      })}
      {(s.fleet.laneList ?? []).length === 0 ? (
        <p className="ge-muted">Charter a lane first.</p>
      ) : null}
    </div>
  )

  return (
    <section className="ge-panel">
      <PlayFrame
        desks={
          <>
            <Sheet
        open
        onClose={() => {}}
        title={`Routes · ${chartered} open`}
        reducedMotion={reducedMotion}
      >
        <div className="p6-stack">
          {routes.map((r) => {
            const check = can(s, { type: 'openLane', route: r.id })
            return (
              <ActionRow
                key={r.id}
                label={r.name}
                fact={r.blurb}
                trail="Open lane"
                disabled={!check.ok}
                title={check.ok ? r.blurb : check.reason}
                onClick={() => dispatch({ type: 'openLane', route: r.id })}
              />
            )
          })}
          {s.era >= 8 && jumpCheck.ok ? (
            <Button tone="secondary" onClick={() => dispatch({ type: 'jumpLane' })}>
              Jump a lane · burn fuel for freight
            </Button>
          ) : null}
        </div>
      </Sheet>
            <Sheet
        open
        onClose={() => {}}
        title="Dispatch"
        reducedMotion={reducedMotion}
      >
        <div className="p6-stack">
          <p className="p6-copy">
            Clean runs {clean} of {DEPTH.cleanManifestsNeed} · inspections passed {s.depth?.dispatch?.examsHeld ?? 0} of{' '}
            {DEPTH.examHoldNeed}. File each run as clean, for inspection, or fast.
          </p>
          {manifestBoard}
        </div>
      </Sheet>
            <Sheet
        open
        onClose={() => {}}
        title={`Franchises · ${s.fleet.franchises}`}
        reducedMotion={reducedMotion}
      >
        <div className="p6-stack">
          <ActionRow
            label="Open a franchise"
            fact={defected > 0 ? `${defected} left you` : undefined}
            trail="Open"
            disabled={!franchiseCheck.ok}
            title={!franchiseCheck.ok ? franchiseCheck.reason : undefined}
            onClick={() => dispatch({ type: 'openFranchise' })}
          />
          {(s.fleet.franchiseList ?? [])
            .filter((f) => f.defected)
            .map((f) => {
              const check = can(s, { type: 'winBackFranchise', franchiseId: f.id })
              return (
                <ActionRow
                  key={f.id}
                  label={`Win back ${f.name}`}
                  disabled={!check.ok}
                  title={check.ok ? 'Spend Control' : check.reason}
                  onClick={() => dispatch({ type: 'winBackFranchise', franchiseId: f.id })}
                />
              )
            })}
          {s.era >= 7 ? (
            <ActionRow
              label="Open planet franchise"
              disabled={!planetCheck.ok}
              title={!planetCheck.ok ? planetCheck.reason : 'One franchise per stocked world'}
              onClick={() => dispatch({ type: 'openPlanetFranchise' })}
            />
          ) : null}
        </div>
      </Sheet>
          </>
        }
        purpose={MENUS.logistics.purpose}
        department="Logistics"
        room={<LaneScene />}
        tray={{
          primary: examFocus
            ? {
                label: `Pass inspection · ${(s.depth?.dispatch?.examsHeld ?? 0)}/${DEPTH.examHoldNeed}`,
                tone: 'free',
                size: 'lg',
                coachId: 'logistics-exam',
                disabled: !exam.ok,
                title: exam.ok ? 'Pass the waiting inspection. Free.' : exam.reason,
                onClick: () => dispatch({ type: 'swearExam' }),
              }
            : {
                label: 'Buy fuel',
                tone: 'primary',
                size: 'lg',
                disabled: !fuelCheck.ok,
                title: !fuelCheck.ok
                  ? fuelCheck.reason
                  : `Fuel ${Math.floor(s.fuel)} / ${Math.floor(fuelCap)}${lowFuel ? ' · low' : ''}`,
                feedback: true,
                onClick: () => dispatch({ type: 'buyFuel' }),
              },
          failReason: examFocus ? exam.reason : fuelCheck.reason,
        }}
      />

    </section>
  )
}

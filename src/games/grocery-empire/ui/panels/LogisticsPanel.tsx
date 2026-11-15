import { useState } from 'react'
import { LANE_ROUTES } from '../../content/depth'
import { DEPTH } from '../../sim/balance'
import { can } from '../../sim/commands'
import { fuelCap as fuelCapOf } from '../../sim/systems/late'
import { useGame } from '../GameContext'
import { ActionRow, PlayFrame } from '../play'
import { Icon } from '../icons/Icon'
import { Button, Sheet } from '../kit'
import { LaneScene } from '../scenes/live'

export function LogisticsPanel() {
  const { state: s, dispatch, reducedMotion } = useGame()
  const [routesSheet, setRoutesSheet] = useState(false)
  const [dispatchSheet, setDispatchSheet] = useState(false)
  const [franchiseSheet, setFranchiseSheet] = useState(false)
  const fuelCap = fuelCapOf(s)
  const lowFuel = s.fuel < fuelCap * 0.25
  const fuelCheck = can(s, { type: 'buyFuel' })
  const franchiseCheck = can(s, { type: 'openFranchise' })
  const planetCheck = can(s, { type: 'openPlanetFranchise' })
  const jumpCheck = can(s, { type: 'jumpLane' })
  const routes = LANE_ROUTES
  const firstOpen = routes.find((r) => can(s, { type: 'openLane', route: r.id }).ok)
  const chartered = s.fleet.laneList?.length ?? 0
  const clean = s.depth?.dispatch?.cleanManifests ?? 0
  const defected = (s.fleet.franchiseList ?? []).filter((f) => f.defected).length
  const exam = can(s, { type: 'swearExam' })
  const examFocus = exam.ok || (s.depth?.dispatch?.examsHeld ?? 0) < DEPTH.examHoldNeed

  const manifestButtons = (
    <div className="p6-row">
      {(s.fleet.laneList ?? []).map((lane) => {
        const prefer =
          lane.route === 'spice-route'
            ? 'import'
            : lane.route === 'cold-line'
              ? 'frozen'
              : lane.route === 'dry-haul'
                ? 'household'
                : 'bakery'
        const matched = s.depth?.manifests?.[lane.id] === prefer
        const check = can(s, { type: 'setManifest', laneId: lane.id, mix: prefer })
        return (
          <Button
            key={lane.id}
            tone={matched ? 'ghost' : 'primary'}
            disabled={!check.ok}
            title={
              check.ok
                ? matched
                  ? `Rematch ${prefer} when the cycle is ready`
                  : `Match ${prefer}`
                : check.reason
            }
            onClick={() => dispatch({ type: 'setManifest', laneId: lane.id, mix: prefer })}
          >
            {lane.route} → {prefer}
            {matched ? ' ✓' : ''}
          </Button>
        )
      })}
    </div>
  )

  return (
    <section className="ge-panel">
      <PlayFrame
        purpose="Buy stock and move it — trucks, cold chain, ocean lanes."
        department="Logistics"
        room={<LaneScene />}
        tray={{
          primary: examFocus
            ? {
                label: `Swear exam · ${(s.depth?.dispatch?.examsHeld ?? 0)}/${DEPTH.examHoldNeed}`,
                tone: 'free',
                size: 'lg',
                coachId: 'logistics-exam',
                disabled: !exam.ok,
                title: exam.ok ? 'Swear the exam hold — free.' : exam.reason,
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
          secondaries: [
            {
              key: 'routes',
              label: 'Routes',
              fact: String(chartered),
              coachId: 'logistics-lane',
              onClick: () => setRoutesSheet(true),
            },
            {
              key: 'dispatch',
              label: 'Dispatch',
              fact: `${clean}/${DEPTH.cleanManifestsNeed}`,
              onClick: () => setDispatchSheet(true),
            },
            {
              key: 'franchise',
              label: 'Franchises',
              fact: String(s.fleet.franchises),
              coachId: 'logistics-franchise',
              onClick: () => setFranchiseSheet(true),
            },
          ],
        }}
      />

      <Sheet
        open={routesSheet}
        onClose={() => setRoutesSheet(false)}
        title="Routes"
        reducedMotion={reducedMotion}
        footer={
          <Button tone="ghost" onClick={() => setRoutesSheet(false)}>
            Done
          </Button>
        }
      >
        <div className="p6-stack">
          {routes.map((r) => {
            const check = can(s, { type: 'openLane', route: r.id })
            return (
              <ActionRow
                key={r.id}
                label={r.name}
                fact={check.ok ? 'ready' : undefined}
                disabled={!check.ok}
                title={check.ok ? r.blurb : check.reason}
                onClick={() => dispatch({ type: 'openLane', route: r.id })}
              />
            )
          })}
          <Button
            tone="primary"
            icon={<Icon name="lane" size={14} />}
            disabled={!firstOpen}
            title={firstOpen ? `Open ${firstOpen.name}` : 'No route affordable'}
            feedback
            onClick={() => firstOpen && dispatch({ type: 'openLane', route: firstOpen.id })}
          >
            Open lane
          </Button>
          {s.era >= 8 ? (
            <Button
              tone="ghost"
              disabled={!jumpCheck.ok}
              title={!jumpCheck.ok ? jumpCheck.reason : 'Burn fuel for freight'}
              onClick={() => dispatch({ type: 'jumpLane' })}
            >
              Jump lane · fuel → freight
            </Button>
          ) : null}
        </div>
      </Sheet>

      <Sheet
        open={dispatchSheet}
        onClose={() => setDispatchSheet(false)}
        title="Dispatch Board"
        reducedMotion={reducedMotion}
        footer={
          <Button tone="ghost" onClick={() => setDispatchSheet(false)}>
            Done
          </Button>
        }
      >
        <div className="p6-stack">
          <p className="p6-copy">
            {clean} / {DEPTH.cleanManifestsNeed} clean · {s.depth?.dispatch?.examsHeld ?? 0}/
            {DEPTH.examHoldNeed} exams · {s.depth?.manifestsRun ?? 0} filed.
          </p>
          {manifestButtons}
        </div>
      </Sheet>

      <Sheet
        open={franchiseSheet}
        onClose={() => setFranchiseSheet(false)}
        title="Franchises"
        reducedMotion={reducedMotion}
        footer={
          <Button tone="ghost" onClick={() => setFranchiseSheet(false)}>
            Done
          </Button>
        }
      >
        <div className="p6-stack">
          <ActionRow
            label="Open franchise"
            fact={defected > 0 ? `${defected} defected` : undefined}
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
    </section>
  )
}
